import { Application, Container, Graphics, Text } from "pixi.js";

import { connectedRoomIds, type RoomEdge } from "../geometry";
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
  private readonly entityNodes = new Map<string, Container>();
  private readonly animationFrames = new Map<string, number>();
  private readonly rotationFrames = new Map<string, number>();
  private readonly zoneRotations = new Map<string, number>();
  private readonly highlighted = new Set<string>();
  private readonly changed = new Set<string>();
  private readonly connectionLayer = new Graphics();
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
    this.app.stage.addChild(this.connectionLayer);
    this.mounted = true;
    if (this.snapshot !== null) this.project(this.snapshot);
  }

  applyCommittedChanges(changeSet: RuntimeChangeSet): void {
    this.snapshot = changeSet.snapshot;
    this.changed.clear();
    for (const id of changeSet.changedIds) this.changed.add(id);
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
    for (const frame of this.rotationFrames.values())
      window.cancelAnimationFrame(frame);
    this.animationFrames.clear();
    this.rotationFrames.clear();
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
    this.projectConnections(snapshot);
    for (const zone of Object.values(snapshot.zones))
      this.projectZone(zone, snapshot);

    const entityIds = new Set(Object.keys(snapshot.explorers));
    for (const [id, node] of this.entityNodes) {
      if (entityIds.has(id)) continue;
      node.destroy();
      this.entityNodes.delete(id);
    }
    for (const explorer of Object.values(snapshot.explorers))
      this.projectExplorer(explorer, snapshot);
  }

  private projectZone(zone: VaultZone, snapshot: VaultSnapshot): void {
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
    const changed = this.changed.has(zone.id);
    const palette = roomPalette(zone.id);
    const shadow = new Graphics()
      .roundRect(4, 8, ROOM_WIDTH, ROOM_HEIGHT, 18)
      .fill({ color: 0x02060b, alpha: 0.58 });
    const room = new Graphics()
      .roundRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT, 16)
      .fill({ color: blue ? 0x123e70 : palette.fill, alpha: 1 })
      .stroke({
        color: highlighted
          ? 0xffdc73
          : changed
            ? 0xf7f0c8
            : blue
              ? 0x53bbff
              : palette.edge,
        width: highlighted ? 6 : changed ? 4 : 2,
      });
    container.addChild(shadow, room);
    container.addChild(
      new Graphics()
        .roundRect(7, 7, ROOM_WIDTH - 14, ROOM_HEIGHT - 14, 12)
        .stroke({ color: palette.detail, alpha: 0.35, width: 1 }),
    );
    for (let line = 0; line < 4; line += 1)
      container.addChild(
        new Graphics()
          .moveTo(12, 58 + line * 13)
          .lineTo(ROOM_WIDTH - 12, 58 + line * 13)
          .stroke({ color: palette.detail, alpha: 0.075, width: 1 }),
      );
    container.addChild(
      new Text({
        text: zone.label,
        style: {
          fill: blue ? 0xaedbff : 0xe9f3ec,
          fontFamily: "system-ui, sans-serif",
          fontSize: 16,
          fontWeight: "700",
        },
        x: 14,
        y: 12,
      }),
    );
    container.addChild(
      new Text({
        text: zone.searched
          ? `✓ SEARCHED  ·  ${String(zone.rotation)}°`
          : `UNSEARCHED  ·  ${String(zone.rotation)}°`,
        style: {
          fill: zone.searched ? 0x8fd4bd : 0xd9bd7a,
          fontFamily: "system-ui",
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.5,
        },
        x: 14,
        y: 36,
      }),
    );
    const doorLayer = new Container();
    doorLayer.pivot.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2);
    doorLayer.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2);
    for (const edge of zone.doors) doorLayer.addChild(this.door(edge));
    container.addChild(doorLayer);
    this.animateRotation(zone.id, doorLayer, zone.rotation);
    if (!zone.searched && zone.tokenId !== null) {
      const tokenState = snapshot.tokens[zone.tokenId];
      const revealed = tokenState?.revealed === true;
      const relic = tokenState?.kind === "relic";
      const token = new Graphics();
      if (revealed && relic)
        token
          .poly([
            ROOM_WIDTH - 27,
            ROOM_HEIGHT - 38,
            ROOM_WIDTH - 15,
            ROOM_HEIGHT - 25,
            ROOM_WIDTH - 27,
            ROOM_HEIGHT - 12,
            ROOM_WIDTH - 39,
            ROOM_HEIGHT - 25,
          ])
          .fill({ color: 0x72e4ff })
          .stroke({ color: 0xe8fbff, width: 2 });
      else if (revealed)
        token
          .poly([
            ROOM_WIDTH - 27,
            ROOM_HEIGHT - 40,
            ROOM_WIDTH - 13,
            ROOM_HEIGHT - 14,
            ROOM_WIDTH - 41,
            ROOM_HEIGHT - 14,
          ])
          .fill({ color: 0xf06a61 })
          .stroke({ color: 0xffd0b6, width: 2 });
      else
        token
          .circle(ROOM_WIDTH - 27, ROOM_HEIGHT - 25, 13)
          .fill({ color: 0xba7f32 })
          .stroke({ color: 0xffe3a3, width: 2 });
      container.addChild(token);
      container.addChild(
        new Text({
          text: revealed ? (relic ? "◆" : "!") : "?",
          style: {
            fill: revealed ? 0xffffff : 0x25180a,
            fontSize: 13,
            fontWeight: "800",
          },
          x: ROOM_WIDTH - (revealed && relic ? 32 : 31),
          y: ROOM_HEIGHT - 34,
        }),
      );
    }
    if (blue) {
      container.addChild(
        new Text({
          text: "AZURE GATE",
          style: {
            fill: 0x90d7ff,
            fontSize: 9,
            fontWeight: "800",
            letterSpacing: 1.3,
          },
          x: 14,
          y: ROOM_HEIGHT - 24,
        }),
      );
      container.addChild(
        new Graphics()
          .circle(ROOM_WIDTH - 25, 25, 9)
          .stroke({ color: 0x70caff, width: 3 })
          .circle(ROOM_WIDTH - 25, 25, 4)
          .fill({ color: 0xa9e5ff }),
      );
    }
    if (changed) {
      const badge = new Graphics()
        .roundRect(112, 47, 68, 18, 9)
        .fill({ color: 0xf7f0c8 });
      container.addChild(
        badge,
        new Text({
          text: "CELL →",
          style: {
            fill: 0x182017,
            fontSize: 9,
            fontWeight: "800",
            letterSpacing: 0.7,
          },
          x: 126,
          y: 50,
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
      token = new Container();
      token.label = explorer.id;
      token.eventMode = "static";
      token.cursor = "pointer";
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
    token.removeChildren().forEach((child) => child.destroy());
    const active = snapshot.activeSeatId === explorer.ownerId;
    const selected = this.draggingEntityId === explorer.id;
    if (active)
      token.addChild(
        new Graphics().circle(0, 0, selected ? 29 : 25).stroke({
          color: selected ? 0xffe27f : 0x8ff4dc,
          alpha: 0.9,
          width: selected ? 5 : 3,
        }),
      );
    const piece = new Graphics();
    if (explorer.ownerId === "human")
      piece
        .circle(0, 0, 18)
        .fill({ color: 0xf0b94e })
        .stroke({ color: 0x2c1d08, width: 3 });
    else
      piece
        .poly([0, -20, 19, -9, 15, 15, 0, 21, -15, 15, -19, -9])
        .fill({ color: 0x68d2c1 })
        .stroke({ color: 0x062824, width: 3 });
    token.addChild(
      piece,
      new Text({
        text: explorer.ownerId === "human" ? "M" : "I",
        style: { fill: 0x101513, fontSize: 16, fontWeight: "900" },
        anchor: 0.5,
        y: -1,
      }),
    );
    token.addChild(
      new Graphics()
        .roundRect(-25, 23, 50, 16, 8)
        .fill({ color: 0x071018, alpha: 0.9 }),
      new Text({
        text: `${String(explorer.actionPoints)} AP · ${String(explorer.relicCount)} ◆`,
        style: { fill: 0xf7f3df, fontSize: 8, fontWeight: "700" },
        anchor: { x: 0.5, y: 0 },
        y: 26,
      }),
    );
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
    node: Container,
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
    return marker
      .fill({ color: 0xffe2a3 })
      .stroke({ color: 0x5b451f, width: 1 });
  }

  private animateRotation(
    id: string,
    layer: Container,
    targetDegrees: number,
  ): void {
    const previous = this.zoneRotations.get(id);
    this.zoneRotations.set(id, targetDegrees);
    const target = (targetDegrees * Math.PI) / 180;
    if (previous === undefined || previous === targetDegrees) {
      layer.rotation = target;
      return;
    }
    const priorFrame = this.rotationFrames.get(id);
    if (priorFrame !== undefined) window.cancelAnimationFrame(priorFrame);
    const start = (previous * Math.PI) / 180;
    const started = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / 520);
      const eased = 1 - (1 - progress) ** 3;
      layer.rotation = start + (target - start) * eased;
      layer.alpha = 0.72 + 0.28 * progress;
      if (progress < 1)
        this.rotationFrames.set(id, window.requestAnimationFrame(step));
      else this.rotationFrames.delete(id);
    };
    this.rotationFrames.set(id, window.requestAnimationFrame(step));
  }

  private projectConnections(snapshot: VaultSnapshot): void {
    this.connectionLayer.clear();
    const topology = Object.values(snapshot.zones).map((zone) => ({
      id: zone.id,
      row: zone.row,
      column: zone.column,
      rotation: zone.rotation,
      doors: zone.doors,
    }));
    const drawn = new Set<string>();
    for (const zone of Object.values(snapshot.zones)) {
      for (const nextId of connectedRoomIds(zone.id, topology)) {
        const key = [zone.id, nextId].sort().join(":");
        if (drawn.has(key)) continue;
        drawn.add(key);
        const next = snapshot.zones[nextId];
        if (next === undefined) continue;
        const fromX =
          OFFSET_X + zone.column * (ROOM_WIDTH + ROOM_GAP) + ROOM_WIDTH / 2;
        const fromY =
          OFFSET_Y + zone.row * (ROOM_HEIGHT + ROOM_GAP) + ROOM_HEIGHT / 2;
        const toX =
          OFFSET_X + next.column * (ROOM_WIDTH + ROOM_GAP) + ROOM_WIDTH / 2;
        const toY =
          OFFSET_Y + next.row * (ROOM_HEIGHT + ROOM_GAP) + ROOM_HEIGHT / 2;
        this.connectionLayer
          .moveTo(fromX, fromY)
          .lineTo(toX, toY)
          .stroke({ color: 0xffd77d, alpha: 0.33, width: 11 });
        this.connectionLayer
          .moveTo(fromX, fromY)
          .lineTo(toX, toY)
          .stroke({ color: 0xffefbd, alpha: 0.7, width: 2 });
      }
    }
  }
}

function roomPalette(id: string): {
  fill: number;
  edge: number;
  detail: number;
} {
  const palettes: Record<
    string,
    { fill: number; edge: number; detail: number }
  > = {
    "glass-gallery": { fill: 0x18323b, edge: 0x6596a4, detail: 0x8fd6e6 },
    "mirror-gallery": { fill: 0x292d45, edge: 0x8d8fc4, detail: 0xc6c7f2 },
    "echo-hall": { fill: 0x173a35, edge: 0x5b9a8b, detail: 0x95dfca },
    "clockwork-archive": { fill: 0x3b3021, edge: 0xba8d4e, detail: 0xe6bd71 },
    reliquary: { fill: 0x3b2638, edge: 0xad6e9c, detail: 0xe8a8d4 },
    gatehouse: { fill: 0x293328, edge: 0x839b65, detail: 0xc2db99 },
  };
  return palettes[id] ?? { fill: 0x1b2c34, edge: 0x56747d, detail: 0x91b2ba };
}
