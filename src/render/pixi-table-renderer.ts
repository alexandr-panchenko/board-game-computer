import { Application, Container, Graphics, Text } from "pixi.js";

import type {
  CrystalColor,
  FoundryCard,
  FoundryPlayer,
  FoundrySnapshot,
  OrdinaryCrystalColor,
} from "../sample";
import type { RuntimeChangeSet, TableRenderer, Viewport } from "./types";

const WIDTH = 1120;
const HEIGHT = 700;
const ordinaryColors: OrdinaryCrystalColor[] = [
  "ruby",
  "sapphire",
  "emerald",
  "amber",
];

const palette: Record<CrystalColor, number> = {
  ruby: 0xe94b64,
  sapphire: 0x4295ee,
  emerald: 0x43c58b,
  amber: 0xf1b84b,
  prism: 0xe7d9ff,
};

export class PixiTableRenderer implements TableRenderer {
  private readonly app = new Application();
  private readonly onTakePair:
    | ((first: OrdinaryCrystalColor, second: OrdinaryCrystalColor) => void)
    | undefined;
  private readonly onBuyCard: ((cardId: string) => void) | undefined;
  private snapshot: FoundrySnapshot | null = null;
  private changedIds = new Set<string>();
  private selectedColor: OrdinaryCrystalColor | null = null;
  private mounted = false;
  private destroyRequested = false;

  constructor(
    options: {
      onTakePair?: (
        first: OrdinaryCrystalColor,
        second: OrdinaryCrystalColor,
      ) => void;
      onBuyCard?: (cardId: string) => void;
    } = {},
  ) {
    this.onTakePair = options.onTakePair;
    this.onBuyCard = options.onBuyCard;
  }

  async mount(container: HTMLElement): Promise<void> {
    await this.app.init({
      width: WIDTH,
      height: HEIGHT,
      antialias: true,
      autoDensity: true,
      backgroundColor: 0x07151a,
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
    if (this.snapshot !== null) this.project();
  }

  applyCommittedChanges(changeSet: RuntimeChangeSet): void {
    this.snapshot = changeSet.snapshot;
    this.changedIds = new Set(changeSet.changedIds);
    this.selectedColor = null;
    if (this.mounted) this.project();
  }

  applyInverseChanges(changeSet: RuntimeChangeSet): void {
    this.applyCommittedChanges(changeSet);
  }

  focusTrace(): void {
    // Changed component IDs are highlighted during projection.
  }

  resize(viewport: Viewport): void {
    if (this.mounted) this.app.renderer.resize(viewport.width, viewport.height);
  }

  destroy(): void {
    this.destroyRequested = true;
    if (!this.mounted) return;
    this.mounted = false;
    this.app.destroy({ removeView: true }, { children: true });
  }

  private project(): void {
    const snapshot = this.snapshot;
    if (snapshot === null) return;
    this.app.stage
      .removeChildren()
      .forEach((child) => child.destroy({ children: true }));
    this.app.stage.addChild(this.tableBackground());
    this.app.stage.addChild(this.titlePlaque(snapshot));
    this.app.stage.addChild(this.market(snapshot));
    this.app.stage.addChild(this.bank(snapshot));
    this.app.stage.addChild(
      this.playerMat(snapshot.players.human, snapshot, 30, 462, 510),
    );
    this.app.stage.addChild(
      this.playerMat(snapshot.players.ai, snapshot, 580, 462, 510),
    );
    this.app.stage.addChild(this.rulebook(snapshot));
    this.app.stage.addChild(this.houseRules(snapshot));
    if (snapshot.result !== null)
      this.app.stage.addChild(this.winnerOverlay(snapshot));
  }

  private tableBackground(): Container {
    const layer = new Container();
    layer.addChild(
      new Graphics()
        .roundRect(8, 8, WIDTH - 16, HEIGHT - 16, 34)
        .fill({ color: 0x0d2c31 })
        .stroke({ color: 0xc69a4a, width: 5 }),
      new Graphics()
        .roundRect(20, 20, WIDTH - 40, HEIGHT - 40, 27)
        .stroke({ color: 0x5c8b7c, alpha: 0.55, width: 2 }),
    );
    for (let row = 0; row < 8; row += 1)
      layer.addChild(
        new Graphics()
          .moveTo(40, 80 + row * 76)
          .bezierCurveTo(
            300,
            58 + row * 79,
            780,
            104 + row * 71,
            1080,
            78 + row * 77,
          )
          .stroke({ color: 0x9ad5c4, alpha: 0.035, width: 2 }),
      );
    return layer;
  }

  private titlePlaque(snapshot: FoundrySnapshot): Container {
    const layer = new Container();
    layer.addChild(
      new Text({
        text: "PRISM FOUNDRY",
        style: {
          fill: 0xf8e7b2,
          fontSize: 25,
          fontWeight: "800",
          letterSpacing: 4,
        },
        x: 42,
        y: 31,
      }),
      new Text({
        text: `TURN ${String(snapshot.turnNumber)}  ·  ${snapshot.activePlayerId === "human" ? "MARA" : "IVO"} TO ACT`,
        style: {
          fill: 0x9ed8cb,
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 1.2,
        },
        x: 45,
        y: 64,
      }),
    );
    const markerX = snapshot.activePlayerId === "human" ? 68 : 1035;
    layer.addChild(
      new Graphics()
        .poly([
          markerX,
          445,
          markerX + 12,
          455,
          markerX,
          465,
          markerX - 12,
          455,
        ])
        .fill({ color: 0xffdf78 })
        .stroke({ color: 0x5a3e13, width: 2 }),
    );
    return layer;
  }

  private market(snapshot: FoundrySnapshot): Container {
    const layer = new Container();
    layer.addChild(label("FACE-UP MARKET · BUY ONE CARD", 310, 31));
    snapshot.market.forEach((cardId, index) => {
      const card = snapshot.cards.find((item) => item.id === cardId);
      if (card === undefined) return;
      const legal = snapshot.legalActions.some(
        (option) =>
          option.actionId === "buy-card" &&
          option.parameters.cardId === card.id,
      );
      layer.addChild(this.card(card, 276 + index * 136, 56, legal));
    });
    layer.addChild(this.deckStack(snapshot, 42, 110));
    return layer;
  }

  private card(
    card: FoundryCard,
    x: number,
    y: number,
    legal: boolean,
  ): Container {
    const layer = new Container({ x, y });
    layer.eventMode = legal ? "static" : "none";
    layer.cursor = legal ? "pointer" : "default";
    if (legal) layer.on("pointertap", () => this.onBuyCard?.(card.id));
    const color = palette[card.discountColor];
    layer.addChild(
      new Graphics()
        .roundRect(3, 6, 124, 184, 12)
        .fill({ color: 0x03080a, alpha: 0.55 }),
      new Graphics()
        .roundRect(0, 0, 124, 184, 12)
        .fill({ color: 0xf4efdf })
        .stroke({ color: legal ? 0xffdf78 : color, width: legal ? 5 : 3 }),
      new Graphics().roundRect(7, 7, 110, 65, 8).fill({ color, alpha: 0.92 }),
    );
    this.abstractArt(layer, card, color);
    layer.addChild(
      new Text({
        text: card.name,
        style: {
          fill: 0x172123,
          fontSize: 12,
          fontWeight: "800",
          wordWrap: true,
          wordWrapWidth: 105,
        },
        x: 10,
        y: 79,
      }),
      new Text({
        text: `${String(card.prestige)} PRESTIGE`,
        style: { fill: 0x734b16, fontSize: 10, fontWeight: "800" },
        x: 10,
        y: 112,
      }),
      new Text({
        text: costText(card),
        style: { fill: 0x263536, fontSize: 9, fontWeight: "700" },
        x: 10,
        y: 131,
      }),
      new Text({
        text:
          card.abilityText.length > 0
            ? card.abilityText
            : `Permanent ${title(card.discountColor)} discount`,
        style: {
          fill: 0x435052,
          fontSize: 8,
          wordWrap: true,
          wordWrapWidth: 105,
        },
        x: 10,
        y: 149,
      }),
    );
    return layer;
  }

  private abstractArt(
    layer: Container,
    card: FoundryCard,
    color: number,
  ): void {
    const art = new Graphics();
    if (card.art.pattern === "waves") {
      for (let line = 0; line < 3; line += 1)
        art
          .moveTo(16, 30 + line * 10)
          .bezierCurveTo(
            34,
            14 + line * 10,
            58,
            48 + line * 8,
            96,
            24 + line * 9,
          );
    } else if (card.art.pattern === "vines") {
      art
        .moveTo(25, 62)
        .bezierCurveTo(30, 15, 83, 58, 98, 16)
        .circle(52, 34, 10);
    } else if (card.art.pattern === "lattice") {
      art.poly([22, 52, 52, 14, 96, 48, 66, 66, 22, 52]).circle(58, 40, 14);
    } else if (card.art.pattern === "rings") {
      art.circle(60, 38, 24).circle(60, 38, 15).circle(60, 38, 6);
    } else {
      art.poly([18, 55, 42, 14, 62, 50, 92, 18, 104, 60]);
    }
    art.stroke({ color: 0xffffff, alpha: 0.68, width: 3 });
    layer.addChild(
      art,
      new Text({
        text: card.art.symbol,
        style: { fill: 0xffffff, fontSize: 24, fontWeight: "800" },
        anchor: 0.5,
        x: 62,
        y: 40,
      }),
    );
    void color;
  }

  private deckStack(
    snapshot: FoundrySnapshot,
    x: number,
    y: number,
  ): Container {
    const layer = new Container({ x, y });
    for (let offset = 8; offset >= 0; offset -= 2)
      layer.addChild(
        new Graphics()
          .roundRect(offset, offset, 112, 158, 12)
          .fill({ color: 0x182b4d })
          .stroke({ color: 0xa994d8, width: 2 }),
      );
    layer.addChild(
      new Text({
        text: "SEEDED\nDECK",
        style: {
          fill: 0xe9dcff,
          fontSize: 16,
          fontWeight: "800",
          align: "center",
        },
        anchor: 0.5,
        x: 62,
        y: 73,
      }),
      new Text({
        text: `${String(snapshot.deck.length)} cards`,
        style: { fill: 0xb7c8d0, fontSize: 10 },
        anchor: 0.5,
        x: 62,
        y: 127,
      }),
      label(`SPENT ${String(snapshot.spent.length)}`, -2, 177),
    );
    return layer;
  }

  private bank(snapshot: FoundrySnapshot): Container {
    const layer = new Container();
    layer.addChild(
      new Graphics()
        .roundRect(205, 266, 710, 170, 22)
        .fill({ color: 0x102329, alpha: 0.96 })
        .stroke({ color: 0x6ea698, width: 2 }),
      label("CENTRAL CRYSTAL BANK · SELECT TWO DIFFERENT COLORS", 233, 280),
    );
    const positions: Array<[CrystalColor, number]> = [
      ["ruby", 282],
      ["sapphire", 414],
      ["emerald", 546],
      ["amber", 678],
      ["prism", 810],
    ];
    for (const [color, x] of positions)
      layer.addChild(this.tokenWell(snapshot, color, x, 338));
    return layer;
  }

  private tokenWell(
    snapshot: FoundrySnapshot,
    color: CrystalColor,
    x: number,
    y: number,
  ): Container {
    const layer = new Container({ x, y });
    const isOrdinary = color !== "prism";
    const legal =
      isOrdinary &&
      snapshot.legalActions.some(
        (option) =>
          option.actionId === "take-crystals" &&
          Object.values(option.parameters).includes(color),
      );
    const selected = this.selectedColor === color;
    layer.eventMode = legal ? "static" : "none";
    layer.cursor = legal ? "pointer" : "default";
    if (legal && isOrdinary)
      layer.on("pointertap", () => this.selectCrystal(color, snapshot));
    layer.addChild(
      new Graphics()
        .circle(0, 0, 46)
        .fill({ color: 0x071317 })
        .stroke({
          color: selected ? 0xffe28a : 0x45666a,
          width: selected ? 5 : 2,
        }),
    );
    const count = snapshot.bank[color];
    for (let index = Math.min(count, 5) - 1; index >= 0; index -= 1)
      layer.addChild(
        new Graphics()
          .poly([
            0,
            -27 - index * 3,
            24,
            -12 - index * 3,
            18,
            17 - index * 3,
            0,
            27 - index * 3,
            -18,
            17 - index * 3,
            -24,
            -12 - index * 3,
          ])
          .fill({ color: palette[color], alpha: color === "prism" ? 0.92 : 1 })
          .stroke({ color: 0xffffff, alpha: 0.55, width: 1 }),
      );
    layer.addChild(
      new Text({
        text: String(count),
        style: { fill: 0x091214, fontSize: 14, fontWeight: "900" },
        anchor: 0.5,
        y: -1,
      }),
      new Text({
        text: title(color),
        style: { fill: 0xe7f0eb, fontSize: 10, fontWeight: "700" },
        anchor: 0.5,
        y: 55,
      }),
    );
    return layer;
  }

  private selectCrystal(
    color: OrdinaryCrystalColor,
    snapshot: FoundrySnapshot,
  ): void {
    if (this.selectedColor === null) {
      this.selectedColor = color;
      this.project();
      return;
    }
    if (this.selectedColor === color) {
      this.selectedColor = null;
      this.project();
      return;
    }
    const first = this.selectedColor;
    const legal = snapshot.legalActions.some(
      (option) =>
        option.actionId === "take-crystals" &&
        [option.parameters.first, option.parameters.second].includes(first) &&
        [option.parameters.first, option.parameters.second].includes(color),
    );
    this.selectedColor = null;
    if (legal) this.onTakePair?.(first, color);
    else this.project();
  }

  private playerMat(
    player: FoundryPlayer,
    snapshot: FoundrySnapshot,
    x: number,
    y: number,
    width: number,
  ): Container {
    const layer = new Container({ x, y });
    const active = snapshot.activePlayerId === player.id;
    const accent = player.id === "human" ? 0xf2c45f : 0x6fd8c7;
    layer.addChild(
      new Graphics()
        .roundRect(0, 0, width, 205, 22)
        .fill({ color: 0x10252a })
        .stroke({ color: active ? 0xffe28a : accent, width: active ? 5 : 2 }),
      new Text({
        text: `${player.name.toUpperCase()}'S FOUNDRY`,
        style: {
          fill: accent,
          fontSize: 17,
          fontWeight: "800",
          letterSpacing: 1.5,
        },
        x: 18,
        y: 14,
      }),
      new Text({
        text: `${String(player.prestige)} PRESTIGE`,
        style: { fill: 0xffe6a5, fontSize: 22, fontWeight: "900" },
        x: width - 150,
        y: 12,
      }),
      label(active ? "TURN MARKER" : "WAITING", 19, 44),
    );
    const tokenCounts = ([...ordinaryColors, "prism"] as CrystalColor[]).map(
      (color) =>
        [
          color,
          snapshot.tokens.filter(
            (token) =>
              token.containerId === player.matId && token.color === color,
          ).length,
        ] as const,
    );
    tokenCounts.forEach(([color, count], index) => {
      const tx = 28 + index * 55;
      layer.addChild(
        new Graphics()
          .circle(tx, 91, 18)
          .fill({ color: palette[color] })
          .stroke({ color: 0xffffff, alpha: 0.5, width: 1 }),
        new Text({
          text: String(count),
          style: { fill: 0x101718, fontSize: 12, fontWeight: "900" },
          anchor: 0.5,
          x: tx,
          y: 91,
        }),
      );
    });
    layer.addChild(label("PERMANENT DISCOUNTS", 18, 119));
    ordinaryColors.forEach((color, index) => {
      const dx = 28 + index * 55;
      layer.addChild(
        new Graphics()
          .roundRect(dx - 18, 143, 36, 32, 8)
          .fill({ color: palette[color], alpha: 0.82 }),
        new Text({
          text: String(player.discounts[color]),
          style: { fill: 0x101718, fontSize: 13, fontWeight: "900" },
          anchor: 0.5,
          x: dx,
          y: 159,
        }),
      );
    });
    const tableau = snapshot.cards.filter((card) => card.ownerId === player.id);
    layer.addChild(
      new Text({
        text:
          tableau.length === 0
            ? "Purchased cards appear here"
            : tableau.map((card) => card.name).join(" · "),
        style: {
          fill: 0xa9c3bd,
          fontSize: 9,
          wordWrap: true,
          wordWrapWidth: 200,
        },
        x: 275,
        y: 80,
      }),
    );
    return layer;
  }

  private rulebook(snapshot: FoundrySnapshot): Container {
    const layer = new Container({ x: 924, y: 268 });
    layer.addChild(
      new Graphics()
        .roundRect(0, 0, 166, 80, 12)
        .fill({ color: 0xf2ead4 })
        .stroke({ color: 0xb79350, width: 3 }),
      new Text({
        text: "RULEBOOK",
        style: { fill: 0x4b381d, fontSize: 13, fontWeight: "900" },
        x: 12,
        y: 10,
      }),
      new Text({
        text: "Take 2 different\nOR buy 1 card\nFirst to 8 Prestige",
        style: { fill: 0x334144, fontSize: 10, lineHeight: 15 },
        x: 12,
        y: 30,
      }),
    );
    void snapshot;
    return layer;
  }

  private houseRules(snapshot: FoundrySnapshot): Container {
    const layer = new Container({ x: 924, y: 362 });
    const active = snapshot.houseRules.length > 0;
    layer.addChild(
      new Graphics()
        .roundRect(0, 0, 166, 75, 12)
        .fill({ color: active ? 0x4f2c58 : 0x17272c })
        .stroke({ color: active ? 0xeb9cff : 0x557078, width: 3 }),
      new Text({
        text: "HOUSE RULES",
        style: {
          fill: active ? 0xf3c6ff : 0xa4b7ba,
          fontSize: 12,
          fontWeight: "900",
        },
        x: 12,
        y: 10,
      }),
      new Text({
        text: active
          ? snapshot.houseRules.map((rule) => rule.name).join("\n")
          : "No added rules yet",
        style: {
          fill: 0xe9eff0,
          fontSize: 10,
          wordWrap: true,
          wordWrapWidth: 140,
        },
        x: 12,
        y: 34,
      }),
    );
    return layer;
  }

  private winnerOverlay(snapshot: FoundrySnapshot): Container {
    const winner = snapshot.result!;
    const layer = new Container();
    layer.addChild(
      new Graphics()
        .roundRect(280, 245, 560, 200, 28)
        .fill({ color: 0x071217, alpha: 0.96 })
        .stroke({ color: 0xffdd7a, width: 6 }),
      new Text({
        text: `${winner.winnerName.toUpperCase()} WINS`,
        style: {
          fill: 0xffdf7d,
          fontSize: 42,
          fontWeight: "900",
          letterSpacing: 3,
        },
        anchor: 0.5,
        x: 560,
        y: 303,
      }),
      new Text({
        text: `${String(winner.prestige)} Prestige · ordinary actions are now closed`,
        style: { fill: 0xd8ece7, fontSize: 16 },
        anchor: 0.5,
        x: 560,
        y: 365,
      }),
    );
    return layer;
  }
}

function label(text: string, x: number, y: number): Text {
  return new Text({
    text,
    style: {
      fill: 0x9db7b3,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.8,
    },
    x,
    y,
  });
}

function costText(card: FoundryCard): string {
  return ordinaryColors
    .filter((color) => card.cost[color] > 0)
    .map((color) => `${title(color).slice(0, 1)}${String(card.cost[color])}`)
    .join("  ");
}

function title(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
