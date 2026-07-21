import { Application, Container, Graphics, Text } from "pixi.js";

import { rotateEdge, type RoomEdge } from "../geometry";
import type { VaultExplorer, VaultSnapshot, VaultZone } from "../sample";
import type {
  DragPreview,
  RuntimeChangeSet,
  TableRenderer,
  Viewport,
} from "./types";

const ROOM_WIDTH = 190;
const ROOM_HEIGHT = 124;
const ROOM_GAP = 14;
const OFFSET_X = 48;
const OFFSET_Y = 34;

export class PixiTableRenderer implements TableRenderer {
  private readonly app = new Application();
  private readonly zoneNodes = new Map<string, Container>();
  private readonly entityNodes = new Map<string, Graphics>();
  private readonly animationFrames = new Map<string, number>();
  private readonly highlighted = new Set<string>();
  private readonly onDrop:
    ((entityId: string, zoneId: string) => void) | undefined;
  private snapshot: VaultSnapshot | null = null;
  private draggingEntityId: string | null = null;
  private mounted = false;
  private destroyRequested = false;

  constructor(
    options: {
      onDrop?: (entityId: string, zoneId: string) => void;
    } = {},
  ) {
    this.onDrop = options.onDrop;
  }

  async mount(container: HTMLElement): Promise<void> {
    await this.app.init({
      width: 720,
      height: 500,
      antialias: true,
      autoDensity: true,
      backgroundColor: 0x08131e,
      resolution: Math.min(window.devicePixelRatio, 2),
    });
    if (this.destroyRequested) {
      this.app.destroy({ removeView: true }, { children: true });
      return;
    }
    this.app.canvas.className = "table-canvas";
    this.app.canvas.style.width = "100%";
    this.app.canvas.style.height = "100%";
    this.app.canvas.setAttribute("aria-hidden", "true");
    container.replaceChildren(this.app.canvas);
    this.mounted = true;
    if (this.snapshot !== null) this.project(this.snapshot);
  }

  applyCommittedChanges(changeSet: RuntimeChangeSet): void {
    this.snapshot = changeSet.snapshot;
    if (this.mounted) this.project(changeSet.snapshot);
  }

  applyInverseChanges(changeSet: RuntimeChangeSet): void {
    this.applyCommittedChanges(changeSet);
  }

  previewDrag(preview: DragPreview): void {
    this.highlighted.clear();
    for (const id of preview.destinationIds) this.highlighted.add(id);
    this.draggingEntityId = preview.entityId;
    if (this.snapshot !== null && this.mounted) this.project(this.snapshot);
  }

  clearPreview(): void {
    this.highlighted.clear();
    this.draggingEntityId = null;
    if (this.snapshot !== null && this.mounted) this.project(this.snapshot);
  }

  focusTrace(): void {
    // Trace focus is represented by changed-ID highlights supplied by React.
  }

  resize(viewport: Viewport): void {
    if (!this.mounted) return;
    this.app.renderer.resize(viewport.width, viewport.height);
  }

  destroy(): void {
    this.destroyRequested = true;
    for (const frame of this.animationFrames.values())
      window.cancelAnimationFrame(frame);
    this.animationFrames.clear();
    if (!this.mounted) return;
    this.mounted = false;
    this.app.destroy({ removeView: true }, { children: true });
  }

  private project(snapshot: VaultSnapshot): void {
    const zoneIds = new Set(Object.keys(snapshot.zones));
    for (const [id, node] of this.zoneNodes) {
      if (zoneIds.has(id)) continue;
      node.destroy({ children: true });
      this.zoneNodes.delete(id);
    }
    for (const zone of Object.values(snapshot.zones)) this.projectZone(zone);

    const entityIds = new Set(Object.keys(snapshot.explorers));
    for (const [id, node] of this.entityNodes) {
      if (entityIds.has(id)) continue;
      node.destroy();
      this.entityNodes.delete(id);
    }
    for (const explorer of Object.values(snapshot.explorers))
      this.projectExplorer(explorer, snapshot);
  }

  private projectZone(zone: VaultZone): void {
    let container = this.zoneNodes.get(zone.id);
    if (container === undefined) {
      container = new Container();
      container.label = zone.id;
      container.eventMode = "static";
      container.cursor = "pointer";
      container.on("pointerup", () => {
        if (this.draggingEntityId !== null)
          this.onDrop?.(this.draggingEntityId, zone.id);
        this.clearPreview();
      });
      this.zoneNodes.set(zone.id, container);
      this.app.stage.addChild(container);
    }
    container.removeChildren().forEach((child) => child.destroy());
    const x = OFFSET_X + zone.column * (ROOM_WIDTH + ROOM_GAP);
    const y = OFFSET_Y + zone.row * (ROOM_HEIGHT + ROOM_GAP);
    container.position.set(x, y);

    const blue = zone.tags.includes("blue-gate");
    const highlighted = this.highlighted.has(zone.id);
    const room = new Graphics()
      .roundRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT, 16)
      .fill({ color: blue ? 0x123f6a : 0x172b34, alpha: 1 })
      .stroke({
        color: highlighted ? 0xf8ce67 : blue ? 0x42a5ff : 0x51717a,
        width: highlighted ? 5 : 2,
      });
    container.addChild(room);
    container.addChild(
      new Text({
        text: zone.label,
        style: {
          fill: blue ? 0xaedbff : 0xe9f3ec,
          fontFamily: "system-ui, sans-serif",
          fontSize: 15,
          fontWeight: "600",
        },
        x: 14,
        y: 12,
      }),
    );
    container.addChild(
      new Text({
        text: `${String(zone.rotation)}°${zone.searched ? " · searched" : ""}`,
        style: { fill: 0x8facaa, fontFamily: "system-ui", fontSize: 11 },
        x: 14,
        y: 36,
      }),
    );
    for (const edge of zone.doors.map((door) =>
      rotateEdge(door, zone.rotation),
    ))
      container.addChild(this.door(edge));
    if (!zone.searched && zone.tokenId !== null) {
      const token = new Graphics()
        .circle(ROOM_WIDTH - 26, ROOM_HEIGHT - 24, 10)
        .fill({ color: 0xc89b50 })
        .stroke({ color: 0xffe3a3, width: 2 });
      container.addChild(token);
      container.addChild(
        new Text({
          text: "?",
          style: { fill: 0x25180a, fontSize: 12, fontWeight: "700" },
          x: ROOM_WIDTH - 29.5,
          y: ROOM_HEIGHT - 32,
        }),
      );
    }
  }

  private projectExplorer(
    explorer: VaultExplorer,
    snapshot: VaultSnapshot,
  ): void {
    let token = this.entityNodes.get(explorer.id);
    if (token === undefined) {
      token = new Graphics();
      token.label = explorer.id;
      token.eventMode = "static";
      token.cursor = "grab";
      token.on("pointerdown", () => {
        const destinations = (this.snapshot ?? snapshot).legalActions
          .filter((option) => option.actionId === "move-explorer")
          .map((option) => option.parameters.destinationId)
          .filter((id): id is string => id !== undefined);
        if (destinations.length > 0)
          this.previewDrag({
            entityId: explorer.id,
            destinationIds: destinations,
          });
      });
      this.entityNodes.set(explorer.id, token);
      this.app.stage.addChild(token);
    }
    token.clear();
    token
      .circle(0, 0, 17)
      .fill({ color: explorer.ownerId === "human" ? 0xf2c45d : 0x66c7b4 })
      .stroke({ color: 0x071018, width: 3 });
    const zone = snapshot.zones[explorer.zoneId];
    if (zone === undefined) return;
    const baseX = OFFSET_X + zone.column * (ROOM_WIDTH + ROOM_GAP);
    const baseY = OFFSET_Y + zone.row * (ROOM_HEIGHT + ROOM_GAP);
    this.animatePosition(
      explorer.id,
      token,
      baseX + ROOM_WIDTH / 2 + (explorer.ownerId === "human" ? -24 : 24),
      baseY + ROOM_HEIGHT / 2 + 18,
    );
  }

  private animatePosition(
    id: string,
    node: Graphics,
    targetX: number,
    targetY: number,
  ): void {
    const previousFrame = this.animationFrames.get(id);
    if (previousFrame !== undefined) window.cancelAnimationFrame(previousFrame);
    if (node.position.x === 0 && node.position.y === 0) {
      node.position.set(targetX, targetY);
      return;
    }
    const startX = node.position.x;
    const startY = node.position.y;
    if (startX === targetX && startY === targetY) return;
    const started = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / 180);
      const eased = 1 - (1 - progress) ** 3;
      node.position.set(
        startX + (targetX - startX) * eased,
        startY + (targetY - startY) * eased,
      );
      if (progress < 1)
        this.animationFrames.set(id, window.requestAnimationFrame(step));
      else this.animationFrames.delete(id);
    };
    this.animationFrames.set(id, window.requestAnimationFrame(step));
  }

  private door(edge: RoomEdge): Graphics {
    const marker = new Graphics();
    const width = 34;
    const depth = 7;
    if (edge === "north")
      marker.rect((ROOM_WIDTH - width) / 2, -2, width, depth);
    else if (edge === "south")
      marker.rect(
        (ROOM_WIDTH - width) / 2,
        ROOM_HEIGHT - depth + 2,
        width,
        depth,
      );
    else if (edge === "west")
      marker.rect(-2, (ROOM_HEIGHT - width) / 2, depth, width);
    else
      marker.rect(
        ROOM_WIDTH - depth + 2,
        (ROOM_HEIGHT - width) / 2,
        depth,
        width,
      );
    return marker.fill({ color: 0xe7d7aa });
  }
}
