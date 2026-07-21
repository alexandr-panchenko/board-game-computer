import {
  RoomRuntime,
  type CellResult,
  type CellSuccess,
  type LegalActionOption,
} from "../../runtime";
import { PRISM_FOUNDRY_GENESIS } from "./genesis";
import { validateFoundryDesignerCandidate } from "./designer";
import type {
  CrystalColor,
  FoundryCard,
  FoundryHouseRule,
  FoundryPlayer,
  FoundryProgramCell,
  FoundryResult,
  FoundrySnapshot,
  FoundryToken,
} from "./types";

interface RuntimeGame {
  version: string;
  seed: string;
  title: string;
  objective: string;
  activePlayerId: "human" | "ai";
  turnNumber: number;
  result: FoundryResult | null;
}

interface RuntimeOption {
  id: string;
  actionId: "take-crystals" | "buy-card";
  actorId: "human" | "ai";
  label: string;
  first?: string;
  second?: string;
  cardId?: string;
}

export class PrismFoundryRoom {
  readonly runtime = new RoomRuntime();
  private cells: FoundryProgramCell[] = [];
  private cursor = 0;

  constructor() {
    for (const cell of PRISM_FOUNDRY_GENESIS)
      this.commitSource(cell.id, "genesis", cell.label, cell.source, "system");
  }

  snapshot(): FoundrySnapshot {
    const game = this.runtime.binding<RuntimeGame>("game");
    const tokens = this.runtime.binding<FoundryToken[]>("crystalTokens");
    const playerList = this.runtime.binding<FoundryPlayer[]>("players");
    const cards = this.runtime.binding<FoundryCard[]>("cards");
    const legalActions = this.readLegalActions();
    const bank = Object.fromEntries(
      (["ruby", "sapphire", "emerald", "amber", "prism"] as const).map(
        (color) => [
          color,
          tokens.filter(
            (token) =>
              token.containerId === "central-bank" && token.color === color,
          ).length,
        ],
      ),
    ) as Record<CrystalColor, number>;
    return {
      version: game.version,
      seed: game.seed,
      title: game.title,
      objective: game.objective,
      activePlayerId: game.activePlayerId,
      turnNumber: game.turnNumber,
      result: game.result,
      bank,
      tokens,
      cards,
      deck: this.runtime.binding<string[]>("deck"),
      market: this.runtime.binding<string[]>("market"),
      spent: this.runtime.binding<string[]>("spentCards"),
      players: {
        human: required(playerList.find((player) => player.id === "human")),
        ai: required(playerList.find((player) => player.id === "ai")),
      },
      houseRules: this.runtime.binding<FoundryHouseRule[]>("houseRules"),
      legalActions,
      stateHash: this.runtime.hash(),
    };
  }

  legalActions(
    actorId: string = this.snapshot().activePlayerId,
  ): LegalActionOption[] {
    return this.snapshot().legalActions.filter(
      (option) => option.actorId === actorId,
    );
  }

  perform(option: LegalActionOption): CellResult {
    const current = this.readLegalActions().find(
      (candidate) => candidate.id === option.id,
    );
    if (current === undefined)
      return this.runtime.executeCell(
        `assert(false, "Action is no longer legal");`,
        { cellId: `rejected:${option.id}`, recordHistory: false },
      );
    return this.commitSource(
      `action:${String(this.cells.length + 1)}`,
      "action",
      this.runtimeActionLabel(current),
      this.actionSource(current),
      "player",
    );
  }

  actionSource(option: LegalActionOption): string {
    const entries = Object.entries({
      actorId: option.actorId,
      ...option.parameters,
    })
      .sort(([left], [right]) => compare(left, right))
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(", ");
    return `performAction(${JSON.stringify(option.actionId)}, { ${entries} });`;
  }

  chooseFallbackAction(actorId?: string): LegalActionOption {
    const selectedActor =
      actorId ?? this.runtime.binding<RuntimeGame>("game").activePlayerId;
    const cards = this.runtime.binding<FoundryCard[]>("cards");
    const options = this.readLegalActions().filter(
      (option) => option.actorId === selectedActor,
    );
    const buys = options
      .filter((option) => option.actionId === "buy-card")
      .sort((left, right) => {
        const leftCard = required(
          cards.find((card) => card.id === left.parameters.cardId),
        );
        const rightCard = required(
          cards.find((card) => card.id === right.parameters.cardId),
        );
        return (
          rightCard.prestige - leftCard.prestige || compare(left.id, right.id)
        );
      });
    return required(
      buys[0] ?? options.sort((left, right) => compare(left.id, right.id))[0],
    );
  }

  commitDesigner(
    source: string,
    label = "House Rule · Ruby resonance",
  ): CellResult {
    const validation = validateFoundryDesignerCandidate(source);
    if (!validation.ok)
      return this.runtime.executeCell(
        `assert(false, ${JSON.stringify(validation.diagnostic.message)});`,
        {
          cellId: "designer:rejected",
          recordHistory: false,
        },
      );
    return this.commitSource(
      `designer:${String(this.cells.length + 1)}`,
      "designer",
      label,
      source,
      "designer",
    );
  }

  speculateDesigner(
    source: string,
  ): ReturnType<typeof validateFoundryDesignerCandidate> {
    const validation = validateFoundryDesignerCandidate(source);
    if (!validation.ok) return validation;
    const before = this.runtime.hash();
    const result = this.runtime.executeCell(source, {
      cellId: "designer:speculative",
      capability: "designer",
      recordHistory: false,
    });
    if (!result.ok)
      return {
        ok: false,
        diagnostic: {
          code: result.diagnostic.code,
          phase: result.diagnostic.phase,
          message: result.diagnostic.message,
        },
      };
    this.runtime.applyPatch(result.inverse);
    if (this.runtime.hash() !== before)
      return {
        ok: false,
        diagnostic: {
          code: "TS_STATE_HASH_MISMATCH",
          phase: "execute",
          message: "Speculative House Rule did not roll back exactly.",
        },
      };
    return { ok: true };
  }

  undo(): boolean {
    if (this.cursor <= PRISM_FOUNDRY_GENESIS.length) return false;
    if (!this.runtime.undo()) return false;
    this.cursor -= 1;
    return true;
  }

  redo(): boolean {
    if (this.cursor >= this.cells.length || !this.runtime.redo()) return false;
    this.cursor += 1;
    return true;
  }

  program(): { cells: FoundryProgramCell[]; cursor: number } {
    return { cells: [...this.cells], cursor: this.cursor };
  }

  private readLegalActions(): LegalActionOption[] {
    return this.runtime
      .binding<RuntimeOption[]>("legalOptions")
      .map((option) => ({
        id: option.id,
        actionId: option.actionId,
        actorId: option.actorId,
        label: option.label,
        parameters:
          option.actionId === "take-crystals"
            ? { first: required(option.first), second: required(option.second) }
            : { cardId: required(option.cardId) },
        ui:
          option.actionId === "buy-card"
            ? { gesture: "card", highlight: "cardId" }
            : { gesture: "button", highlight: "first" },
      }));
  }

  private runtimeActionLabel(option: LegalActionOption): string {
    if (option.actionId === "buy-card") {
      const cards = this.runtime.binding<FoundryCard[]>("cards");
      return `Buy ${required(cards.find((card) => card.id === option.parameters.cardId)).name}`;
    }
    return `Take ${title(required(option.parameters.first))} + ${title(required(option.parameters.second))}`;
  }

  private commitSource(
    id: string,
    kind: FoundryProgramCell["kind"],
    label: string,
    source: string,
    capability: "designer" | "player" | "system",
  ): CellSuccess {
    if (this.cursor < this.cells.length) this.cells.splice(this.cursor);
    const result = this.runtime.executeCell(source, { cellId: id, capability });
    if (!result.ok)
      throw new Error(
        `${result.diagnostic.code}: ${result.diagnostic.message} in ${label}`,
      );
    this.cells.push({
      id,
      number: this.cells.length + 1,
      kind,
      label,
      source,
      trace: [...result.forward.trace],
      patchCount: result.forward.mutations.length,
      beforeHash: result.beforeHash,
      afterHash: result.afterHash,
      forward: result.forward,
      inverse: result.inverse,
    });
    this.cursor = this.cells.length;
    return result;
  }
}

export function actionLabel(
  option: LegalActionOption,
  snapshot: FoundrySnapshot,
): string {
  if (option.actionId === "buy-card")
    return `Buy ${cardById(snapshot, option.parameters.cardId).name}`;
  return `Take ${title(required(option.parameters.first))} + ${title(required(option.parameters.second))}`;
}

export function cardById(
  snapshot: FoundrySnapshot,
  id: string | undefined,
): FoundryCard {
  return required(snapshot.cards.find((card) => card.id === id));
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error("Required value missing");
  return value;
}

function title(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
