import {
  connectedRoomIds,
  sharedEdges,
  type RoomTopology,
} from "../../geometry";
import {
  FrameworkRuntime,
  Scenario,
  type FrameworkData,
  type FrameworkResult,
  type LegalActionOption,
} from "../../runtime";
import { DEFAULT_VAULT_SEED, SHIFTING_VAULTS_VERSION } from "./types";
import { roomFixtures } from "./fixtures";
import type {
  VaultCard,
  VaultCounter,
  VaultDeck,
  VaultExplorer,
  VaultResult,
  VaultSnapshot,
  VaultToken,
  VaultZone,
} from "./types";

const explorerBySeat = {
  human: "explorer-mara",
  ai: "explorer-ivo",
} as const;

const tacticKinds = ["sprint", "gear", "survey", "ward"] as const;

export class ShiftingVaultsGame {
  readonly runtime: FrameworkRuntime;

  constructor(seed = DEFAULT_VAULT_SEED) {
    this.runtime = new FrameworkRuntime(seed);
    const setup = this.runtime.transact("shifting-vaults:setup", () => {
      this.setup(seed);
      this.registerActions();
      this.registerInvariants();
      this.startTurn("human");
    });
    if (!setup.ok) throw new Error(setup.failure.message);
  }

  snapshot(actorId = this.activeSeatId()): VaultSnapshot {
    const entities = this.runtime.items<FrameworkData>("entities");
    const explorers = Object.fromEntries(
      Object.entries(entities)
        .filter(([, value]) => record(value).kind === "explorer")
        .map(([id, value]) => [id, record(value) as VaultExplorer]),
    );
    const tokens = Object.fromEntries(
      Object.entries(entities)
        .filter(([, value]) => {
          const kind = record(value).kind;
          return kind === "relic" || kind === "hazard";
        })
        .map(([id, value]) => [id, record(value) as VaultToken]),
    );
    return {
      version: SHIFTING_VAULTS_VERSION,
      seed: this.runtime.state<string>("seed"),
      round: this.runtime.state<number>("round"),
      activeSeatId: this.activeSeatId(),
      result: this.result(),
      zones: this.runtime.items<VaultZone>("zones"),
      explorers,
      tokens,
      cards: this.runtime.items<VaultCard>("cards"),
      deck: required(this.runtime.item<VaultDeck>("decks", "tactic-deck")),
      threat: required(this.runtime.item<VaultCounter>("counters", "threat")),
      legalActions: this.legalActions(actorId),
      stateHash: this.runtime.hash(),
    };
  }

  legalActions(actorId = this.activeSeatId()): LegalActionOption[] {
    return this.runtime.legalActions(actorId);
  }

  perform(option: LegalActionOption): FrameworkResult<void> {
    return this.runtime.performAction(option);
  }

  performById(id: string): FrameworkResult<void> {
    const option = this.legalActions().find((candidate) => candidate.id === id);
    if (option === undefined)
      return this.runtime.performAction({
        id,
        actionId: "unavailable",
        actorId: this.activeSeatId(),
        label: "Unavailable",
        parameters: {},
        ui: { gesture: "button" },
      });
    return this.perform(option);
  }

  chooseFallbackAction(actorId = this.activeSeatId()): LegalActionOption {
    const options = this.legalActions(actorId);
    const explorer = this.explorer(actorId);
    if (explorer.relicCount >= 2) {
      const route = this.shortestRoute(explorer.zoneId, "gatehouse");
      const destination = route[1];
      const home = options.find(
        (option) =>
          option.actionId === "move-explorer" &&
          option.parameters.destinationId === destination,
      );
      if (home !== undefined) return home;
    }
    const search = options.find((option) => option.actionId === "search-room");
    if (search !== undefined) return search;
    const sprint = options.find(
      (option) =>
        option.actionId === "play-tactic-card" &&
        this.card(option.parameters.cardId).kind === "sprint",
    );
    if (sprint !== undefined) return sprint;
    const gear = options.find(
      (option) =>
        option.actionId === "play-tactic-card" &&
        this.card(option.parameters.cardId).kind === "gear",
    );
    if (gear !== undefined) return gear;
    const move = this.moveTowardUnresolved(options, explorer.zoneId);
    if (move !== undefined) return move;
    const survey = options.find(
      (option) =>
        option.actionId === "play-tactic-card" &&
        this.card(option.parameters.cardId).kind === "survey",
    );
    if (survey !== undefined) return survey;
    const ward = options.find(
      (option) =>
        option.actionId === "play-tactic-card" &&
        this.card(option.parameters.cardId).kind === "ward" &&
        this.threat().value >= 8,
    );
    if (ward !== undefined) return ward;
    return required(options.find((option) => option.actionId === "end-turn"));
  }

  playFallbackTurn(actorId = this.activeSeatId()): FrameworkResult<void>[] {
    const results: FrameworkResult<void>[] = [];
    for (let step = 0; step < 12 && this.result() === null; step += 1) {
      if (this.activeSeatId() !== actorId) break;
      const option = this.chooseFallbackAction(actorId);
      const result = this.perform(option);
      results.push(result);
      if (!result.ok || option.actionId === "end-turn") break;
    }
    return results;
  }

  registerBlueGateScenario(): FrameworkResult<void> {
    return this.runtime.transact("designer:blue-gate-scenario", () => {
      Scenario(
        this.runtime,
        {
          id: "blue-gate-rotates-linked-room",
          name: "Blue gate rotates its linked room",
        },
        ({ Given, When, Then }) => {
          Given((runtime, event) => {
            if (event.type !== "entity-entered-zone") return false;
            const zoneId = text(event.payload.zoneId);
            const entityId = text(event.payload.entityId);
            const zone = runtime.item<VaultZone>("zones", zoneId);
            const entity = runtime.item<VaultExplorer>("entities", entityId);
            return (
              zone !== null &&
              entity !== null &&
              zone.tags.includes("blue-gate") &&
              entity.tags.includes("explorer")
            );
          });
          When("after");
          Then((runtime, event) => {
            const zone = required(
              runtime.item<VaultZone>("zones", text(event.payload.zoneId)),
            );
            const linkedRoomId = requiredText(zone.linkedRoomId);
            const occupied = Object.values(
              runtime.items<VaultExplorer>("entities"),
            ).some(
              (entity) =>
                entity.kind === "explorer" && entity.zoneId === linkedRoomId,
            );
            if (occupied) {
              runtime.trace("scenario-skipped", {
                reason: "room-occupied",
                roomId: linkedRoomId,
              });
              return;
            }
            const linked = required(
              runtime.item<VaultZone>("zones", linkedRoomId),
            );
            runtime.patchItem("zones", linkedRoomId, {
              rotation: rotate(linked.rotation),
            });
            runtime.emit("room-rotated", {
              roomId: linkedRoomId,
              cause: "blue-gate-scenario",
            });
          });
        },
      );
    });
  }

  private setup(seed: string): void {
    this.runtime.setState("version", SHIFTING_VAULTS_VERSION);
    this.runtime.setState("seed", seed);
    this.runtime.setState("round", 1);
    this.runtime.setState("activeSeatId", "human");
    this.runtime.setState("mode", "two-seat");
    this.runtime.setState("result", null);
    for (const room of roomFixtures)
      this.runtime.setItem("zones", room.id, clone(room));
    this.runtime.setItem("players", "human", {
      id: "human",
      role: "explorer",
      explorerId: "explorer-mara",
    });
    this.runtime.setItem("players", "ai", {
      id: "ai",
      role: "explorer",
      explorerId: "explorer-ivo",
    });
    for (const [seatId, explorerId] of Object.entries(explorerBySeat))
      this.runtime.setItem("entities", explorerId, {
        id: explorerId,
        kind: "explorer",
        ownerId: seatId,
        zoneId: "gatehouse",
        tags: ["explorer"],
        relicCount: 0,
        actionPoints: 0,
        hand: [],
        tacticPlayedThisTurn: false,
      });
    const roomIds = roomFixtures
      .filter((room) => room.id !== "gatehouse")
      .map((room) => room.id);
    const tokenKinds = this.runtime.shuffle([
      "relic",
      "relic",
      "relic",
      "relic",
      "hazard",
      "hazard",
    ] as const);
    roomIds.forEach((roomId, index) => {
      const kind = tokenKinds[index]!;
      const tokenId = `${kind}-${String(index + 1)}`;
      this.runtime.setItem("entities", tokenId, {
        id: tokenId,
        kind,
        roomId,
        location: "room",
        ownerId: null,
        revealed: false,
      });
      this.runtime.patchItem("zones", roomId, { tokenId });
    });
    const cardIds: string[] = [];
    for (const kind of tacticKinds)
      for (let copy = 1; copy <= 2; copy += 1) {
        const cardId = `${kind}-${String(copy)}`;
        cardIds.push(cardId);
        this.runtime.setItem("cards", cardId, {
          id: cardId,
          kind,
          label: title(kind),
          location: "draw",
        });
      }
    this.runtime.setItem("decks", "tactic-deck", {
      id: "tactic-deck",
      draw: this.runtime.shuffle(cardIds),
      discard: [],
    });
    this.runtime.setItem("counters", "threat", {
      id: "threat",
      value: 2,
      minimum: 0,
      maximum: 10,
    });
    this.drawTo("human", 2);
    this.drawTo("ai", 2);
  }

  private registerActions(): void {
    this.runtime.registerAction({
      id: "move-explorer",
      label: "Move",
      actorRole: "explorer",
      ui: { gesture: "drag", highlight: "destinationId" },
      materialize: (_runtime, actorId) => {
        if (!this.actorCanAct(actorId)) return [];
        const explorer = this.explorer(actorId);
        if (explorer.actionPoints < 1) return [];
        return this.connected(explorer.zoneId).map((destinationId) => ({
          parameters: { destinationId },
        }));
      },
      perform: (_runtime, actorId, parameters) =>
        this.moveExplorer(
          actorId,
          requiredText(parameters.destinationId),
          true,
        ),
    });
    this.runtime.registerAction({
      id: "rotate-adjacent-room",
      label: "Rotate room",
      actorRole: "explorer",
      ui: { gesture: "button", highlight: "roomId" },
      materialize: (_runtime, actorId) => {
        if (!this.actorCanAct(actorId)) return [];
        const explorer = this.explorer(actorId);
        if (explorer.actionPoints < 1) return [];
        return this.rotatableRooms(explorer.zoneId).map((roomId) => ({
          parameters: { roomId },
        }));
      },
      perform: (_runtime, actorId, parameters) => {
        this.spendActionPoints(actorId, 1);
        this.rotateRoom(requiredText(parameters.roomId), "standard-action");
      },
    });
    this.runtime.registerAction({
      id: "search-room",
      label: "Search",
      actorRole: "explorer",
      ui: { gesture: "button", highlight: "roomId" },
      materialize: (_runtime, actorId) => {
        if (!this.actorCanAct(actorId)) return [];
        const explorer = this.explorer(actorId);
        const zone = this.zone(explorer.zoneId);
        return explorer.actionPoints >= 1 &&
          zone.id !== "gatehouse" &&
          !zone.searched
          ? [{ parameters: { roomId: zone.id } }]
          : [];
      },
      perform: (_runtime, actorId) => this.search(actorId),
    });
    this.runtime.registerAction({
      id: "play-tactic-card",
      label: "Play tactic",
      actorRole: "explorer",
      ui: { gesture: "card", highlight: "targetId" },
      materialize: (_runtime, actorId) => this.tacticOptions(actorId),
      perform: (_runtime, actorId, parameters) =>
        this.playTactic(
          actorId,
          requiredText(parameters.cardId),
          parameters.targetId ?? null,
        ),
    });
    this.runtime.registerAction({
      id: "end-turn",
      label: "End turn",
      actorRole: "explorer",
      ui: { gesture: "button" },
      materialize: (_runtime, actorId) =>
        this.actorCanAct(actorId) ? [{ parameters: {} }] : [],
      perform: (_runtime, actorId) => this.endTurn(actorId),
    });
  }

  private registerInvariants(): void {
    this.runtime.registerInvariant({
      id: "threat-bounds",
      name: "Threat remains an integer between 0 and 10",
      check: () => {
        const threat = this.threat().value;
        return Number.isInteger(threat) && threat >= 0 && threat <= 10;
      },
    });
    this.runtime.registerInvariant({
      id: "explorer-occupancy",
      name: "Every explorer occupies one existing room",
      check: () =>
        Object.values(this.explorers()).every(
          (explorer) =>
            this.runtime.item("zones", explorer.zoneId) !== null &&
            Number.isInteger(explorer.actionPoints) &&
            explorer.actionPoints >= 0 &&
            explorer.actionPoints <= 2,
        ),
    });
    this.runtime.registerInvariant({
      id: "room-rotations",
      name: "Room rotations use right angles",
      check: () =>
        Object.values(this.zones()).every((zone) =>
          [0, 90, 180, 270].includes(zone.rotation),
        ),
    });
    this.runtime.registerInvariant({
      id: "component-conservation",
      name: "Tokens and cards each have one location",
      check: () => this.componentConservation(),
    });
    this.runtime.registerInvariant({
      id: "active-seat",
      name: "The active seat exists while the game is active",
      check: () =>
        this.result() !== null || ["human", "ai"].includes(this.activeSeatId()),
    });
  }

  private moveExplorer(
    actorId: string,
    destinationId: string,
    spend: boolean,
  ): void {
    const explorer = this.explorer(actorId);
    if (!this.connected(explorer.zoneId).includes(destinationId))
      throw new Error(`Room ${destinationId} is not connected`);
    if (spend) this.spendActionPoints(actorId, 1);
    const fromZoneId = explorer.zoneId;
    this.runtime.patchItem("entities", explorer.id, { zoneId: destinationId });
    this.runtime.emit("entity-left-zone", {
      entityId: explorer.id,
      zoneId: fromZoneId,
    });
    this.runtime.emit("entity-entered-zone", {
      entityId: explorer.id,
      zoneId: destinationId,
      actorId,
    });
    this.checkExplorerVictory(actorId);
  }

  private rotateRoom(roomId: string, cause: string): void {
    const room = this.zone(roomId);
    if (room.id === "gatehouse" || this.roomOccupied(room.id))
      throw new Error(`Room ${roomId} cannot rotate`);
    this.runtime.patchItem("zones", roomId, {
      rotation: rotate(room.rotation),
    });
    this.runtime.emit("room-rotated", { roomId, cause });
  }

  private search(actorId: string): void {
    const explorer = this.explorer(actorId);
    const zone = this.zone(explorer.zoneId);
    if (zone.searched || zone.tokenId === null)
      throw new Error(`Room ${zone.id} cannot be searched`);
    this.spendActionPoints(actorId, 1);
    const token = this.token(zone.tokenId);
    this.runtime.patchItem("zones", zone.id, { searched: true });
    if (token.kind === "relic") {
      this.runtime.patchItem("entities", token.id, {
        revealed: true,
        roomId: null,
        location: "relic-area",
        ownerId: actorId,
      });
      this.runtime.patchItem("entities", explorer.id, {
        relicCount: explorer.relicCount + 1,
      });
      this.runtime.emit("relic-collected", { tokenId: token.id, actorId });
    } else {
      this.runtime.patchItem("entities", token.id, {
        revealed: true,
        roomId: null,
        location: "hazard-discard",
      });
      this.changeThreat(1);
      this.runtime.emit("hazard-triggered", { tokenId: token.id, actorId });
    }
    this.runtime.emit("room-searched", { roomId: zone.id, actorId });
  }

  private tacticOptions(
    actorId: string,
  ): Array<{ parameters: Record<string, string> }> {
    if (!this.actorCanAct(actorId)) return [];
    const explorer = this.explorer(actorId);
    if (explorer.tacticPlayedThisTurn) return [];
    const options: Array<{ parameters: Record<string, string> }> = [];
    for (const cardId of [...explorer.hand].sort()) {
      const card = this.card(cardId);
      if (card.kind === "sprint")
        for (const destinationId of this.connected(explorer.zoneId))
          options.push({ parameters: { cardId, targetId: destinationId } });
      else if (card.kind === "gear")
        for (const roomId of this.rotatableRooms(explorer.zoneId))
          options.push({ parameters: { cardId, targetId: roomId } });
      else if (card.kind === "survey")
        for (const roomId of this.surveyableRooms(explorer.zoneId))
          options.push({ parameters: { cardId, targetId: roomId } });
      else if (this.threat().value > 0)
        options.push({ parameters: { cardId } });
    }
    return options;
  }

  private playTactic(
    actorId: string,
    cardId: string,
    targetId: string | null,
  ): void {
    const explorer = this.explorer(actorId);
    if (!explorer.hand.includes(cardId) || explorer.tacticPlayedThisTurn)
      throw new Error(`Card ${cardId} is unavailable`);
    const card = this.card(cardId);
    this.runtime.patchItem("entities", explorer.id, {
      hand: explorer.hand.filter((id) => id !== cardId),
      tacticPlayedThisTurn: true,
    });
    const deck = this.deck();
    this.runtime.patchItem("decks", deck.id, {
      discard: [...deck.discard, cardId],
    });
    this.runtime.patchItem("cards", cardId, { location: "discard" });
    if (card.kind === "sprint")
      this.moveExplorer(actorId, requiredText(targetId), false);
    else if (card.kind === "gear")
      this.rotateRoom(requiredText(targetId), "gear-card");
    else if (card.kind === "survey") this.survey(requiredText(targetId));
    else this.changeThreat(-1);
    this.runtime.emit("tactic-played", { actorId, cardId, kind: card.kind });
  }

  private survey(roomId: string): void {
    const zone = this.zone(roomId);
    if (zone.tokenId === null || zone.searched)
      throw new Error(`Room ${roomId} cannot be surveyed`);
    this.runtime.patchItem("entities", zone.tokenId, { revealed: true });
    this.runtime.emit("room-surveyed", { roomId, tokenId: zone.tokenId });
  }

  private endTurn(actorId: string): void {
    if (actorId !== this.activeSeatId()) throw new Error("Actor is not active");
    this.runtime.emit("turn-ended", { actorId });
    if (actorId === "ai") {
      this.runtime.setState("round", this.runtime.state<number>("round") + 1);
      this.changeThreat(1);
      if (this.result() !== null) return;
      this.runtime.setState("activeSeatId", "human");
      this.startTurn("human");
    } else {
      this.runtime.setState("activeSeatId", "ai");
      this.startTurn("ai");
    }
  }

  private startTurn(actorId: string): void {
    const explorer = this.explorer(actorId);
    this.runtime.patchItem("entities", explorer.id, {
      actionPoints: 2,
      tacticPlayedThisTurn: false,
    });
    this.drawTo(actorId, 3);
    this.runtime.emit("turn-started", { actorId });
  }

  private drawTo(actorId: string, targetSize: number): void {
    let explorer = this.explorer(actorId);
    while (explorer.hand.length < targetSize) {
      let deck = this.deck();
      if (deck.draw.length === 0 && deck.discard.length > 0) {
        const draw = this.runtime.shuffle(deck.discard);
        this.runtime.patchItem("decks", deck.id, { draw, discard: [] });
        for (const cardId of draw)
          this.runtime.patchItem("cards", cardId, { location: "draw" });
        this.runtime.emit("deck-refilled", { deckId: deck.id });
        deck = this.deck();
      }
      const cardId = deck.draw[0];
      if (cardId === undefined) break;
      this.runtime.patchItem("decks", deck.id, { draw: deck.draw.slice(1) });
      this.runtime.patchItem("entities", explorer.id, {
        hand: [...explorer.hand, cardId],
      });
      this.runtime.patchItem("cards", cardId, {
        location: actorId === "human" ? "human-hand" : "ai-hand",
      });
      explorer = this.explorer(actorId);
    }
  }

  private spendActionPoints(actorId: string, amount: number): void {
    const explorer = this.explorer(actorId);
    if (explorer.actionPoints < amount)
      throw new Error("Not enough action points");
    this.runtime.patchItem("entities", explorer.id, {
      actionPoints: explorer.actionPoints - amount,
    });
  }

  private changeThreat(delta: number): void {
    const threat = this.threat();
    const value = Math.max(0, Math.min(10, threat.value + delta));
    this.runtime.patchItem("counters", threat.id, { value });
    if (value >= 10 && this.result() === null)
      this.finish({
        type: "vault-collapse",
        winnerSeatId: null,
        round: this.runtime.state<number>("round"),
      });
  }

  private checkExplorerVictory(actorId: string): void {
    const explorer = this.explorer(actorId);
    if (
      explorer.zoneId === "gatehouse" &&
      explorer.relicCount >= 2 &&
      this.result() === null
    )
      this.finish({
        type: "explorer-escaped",
        winnerSeatId: actorId,
        round: this.runtime.state<number>("round"),
      });
  }

  private finish(result: VaultResult): void {
    if (this.result() !== null) return;
    this.runtime.setState("result", result);
    this.runtime.trace(`game-ended: ${result.type}`);
  }

  private componentConservation(): boolean {
    const tokens = Object.values(this.tokens());
    if (tokens.length !== 6) return false;
    if (tokens.filter((token) => token.kind === "relic").length !== 4)
      return false;
    if (tokens.filter((token) => token.kind === "hazard").length !== 2)
      return false;
    const deck = this.deck();
    const hands = Object.values(this.explorers()).flatMap(
      (explorer) => explorer.hand,
    );
    const allCards = [...deck.draw, ...deck.discard, ...hands];
    return allCards.length === 8 && new Set(allCards).size === 8;
  }

  private actorCanAct(actorId: string): boolean {
    return this.result() === null && actorId === this.activeSeatId();
  }

  private activeSeatId(): string {
    return this.runtime.state<string>("activeSeatId");
  }

  private result(): VaultResult | null {
    return this.runtime.state<VaultResult | null>("result");
  }

  private explorer(actorId: string): VaultExplorer {
    const id = explorerBySeat[actorId as keyof typeof explorerBySeat];
    if (id === undefined) throw new Error(`Unknown actor ${actorId}`);
    return required(this.runtime.item<VaultExplorer>("entities", id));
  }

  private explorers(): Record<string, VaultExplorer> {
    return Object.fromEntries(
      Object.entries(this.runtime.items<VaultExplorer>("entities")).filter(
        ([, entity]) => entity.kind === "explorer",
      ),
    );
  }

  private tokens(): Record<string, VaultToken> {
    return Object.fromEntries(
      Object.entries(this.runtime.items<VaultToken>("entities")).filter(
        ([, entity]) => entity.kind === "relic" || entity.kind === "hazard",
      ),
    );
  }

  private zone(id: string): VaultZone {
    return required(this.runtime.item<VaultZone>("zones", id));
  }

  private zones(): Record<string, VaultZone> {
    return this.runtime.items<VaultZone>("zones");
  }

  private token(id: string): VaultToken {
    return required(this.runtime.item<VaultToken>("entities", id));
  }

  private card(id: string | undefined): VaultCard {
    return required(this.runtime.item<VaultCard>("cards", requiredText(id)));
  }

  private deck(): VaultDeck {
    return required(this.runtime.item<VaultDeck>("decks", "tactic-deck"));
  }

  private threat(): VaultCounter {
    return required(this.runtime.item<VaultCounter>("counters", "threat"));
  }

  private roomTopology(): RoomTopology[] {
    return Object.values(this.zones()).map((zone) => ({
      id: zone.id,
      row: zone.row,
      column: zone.column,
      rotation: zone.rotation,
      doors: zone.doors,
    }));
  }

  private connected(roomId: string): string[] {
    return connectedRoomIds(roomId, this.roomTopology());
  }

  private adjacent(roomId: string): string[] {
    const room = this.zone(roomId);
    return Object.values(this.zones())
      .filter(
        (candidate) =>
          candidate.id !== room.id && sharedEdges(room, candidate) !== null,
      )
      .map((candidate) => candidate.id)
      .sort();
  }

  private rotatableRooms(roomId: string): string[] {
    return this.adjacent(roomId).filter(
      (id) => id !== "gatehouse" && !this.roomOccupied(id),
    );
  }

  private surveyableRooms(roomId: string): string[] {
    return [roomId, ...this.adjacent(roomId)]
      .filter((id) => {
        const zone = this.zone(id);
        return !zone.searched && zone.tokenId !== null;
      })
      .sort();
  }

  private roomOccupied(roomId: string): boolean {
    return Object.values(this.explorers()).some(
      (explorer) => explorer.zoneId === roomId,
    );
  }

  private shortestRoute(from: string, to: string): string[] {
    const queue: string[][] = [[from]];
    const visited = new Set([from]);
    while (queue.length > 0) {
      const route = queue.shift()!;
      const current = route.at(-1)!;
      if (current === to) return route;
      for (const next of this.connected(current)) {
        if (visited.has(next)) continue;
        visited.add(next);
        queue.push([...route, next]);
      }
    }
    return [];
  }

  private moveTowardUnresolved(
    options: LegalActionOption[],
    from: string,
  ): LegalActionOption | undefined {
    const targets = Object.values(this.zones())
      .filter((zone) => !zone.searched)
      .map((zone) => ({ zone, route: this.shortestRoute(from, zone.id) }))
      .filter((candidate) => candidate.route.length > 1)
      .sort((left, right) =>
        left.route.length === right.route.length
          ? left.zone.id < right.zone.id
            ? -1
            : left.zone.id > right.zone.id
              ? 1
              : 0
          : left.route.length - right.route.length,
      );
    const next = targets[0]?.route[1];
    return options.find(
      (option) =>
        option.actionId === "move-explorer" &&
        option.parameters.destinationId === next,
    );
  }
}

function record(value: FrameworkData): Record<string, FrameworkData> {
  if (value === null || Array.isArray(value) || typeof value !== "object")
    throw new Error("Expected record");
  return value;
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error("Required value missing");
  return value;
}

function requiredText(value: string | null | undefined): string {
  if (value === null || value === undefined || value.length === 0)
    throw new Error("Required text missing");
  return value;
}

function text(value: FrameworkData | undefined): string {
  if (typeof value !== "string") throw new Error("Expected text event field");
  return value;
}

function rotate(value: number): 0 | 90 | 180 | 270 {
  return ((value + 90) % 360) as 0 | 90 | 180 | 270;
}

function title(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
