import { useEffect, useMemo, useRef, useState } from "react";

import type {
  CrystalColor,
  FoundryCard,
  FoundrySnapshot,
  OrdinaryCrystalColor,
} from "../sample";
import { PixiTableRenderer } from "./pixi-table-renderer";

const ordinaryColors: OrdinaryCrystalColor[] = [
  "ruby",
  "sapphire",
  "emerald",
  "amber",
];

const bankPositions: Record<CrystalColor, { x: number; y: number }> = {
  ruby: { x: 25.2, y: 48.3 },
  sapphire: { x: 37, y: 48.3 },
  emerald: { x: 48.8, y: 48.3 },
  amber: { x: 60.5, y: 48.3 },
  prism: { x: 72.3, y: 48.3 },
};

interface Motion {
  id: string;
  kind: "token" | "card";
  color?: CrystalColor;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export function TableCanvas({
  snapshot,
  onTakePair,
  onBuyCard,
  onRulebook,
  onHouseRules,
  focusedIds = [],
  recommendedColors = [],
  recommendedCardId,
  ivoThinking = false,
}: {
  snapshot: FoundrySnapshot;
  onTakePair: (
    first: OrdinaryCrystalColor,
    second: OrdinaryCrystalColor,
  ) => void;
  onBuyCard: (cardId: string) => void;
  onRulebook: () => void;
  onHouseRules: () => void;
  focusedIds?: string[];
  recommendedColors?: OrdinaryCrystalColor[];
  recommendedCardId?: string;
  ivoThinking?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<PixiTableRenderer | null>(null);
  const previous = useRef(snapshot);
  const snapshotRef = useRef(snapshot);
  const focusRef = useRef(focusedIds);
  const [selectedColors, setSelectedColors] = useState<OrdinaryCrystalColor[]>(
    [],
  );
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [motions, setMotions] = useState<Motion[]>([]);

  useEffect(() => {
    if (host.current === null) return;
    const next = new PixiTableRenderer();
    renderer.current = next;
    let active = true;
    void next.mount(host.current).then(() => {
      if (!active) return;
      next.applyCommittedChanges({
        snapshot: snapshotRef.current,
        changedIds: focusRef.current,
      });
    });
    return () => {
      active = false;
      renderer.current = null;
      next.destroy();
    };
  }, []);

  useEffect(() => {
    const before = previous.current;
    snapshotRef.current = snapshot;
    focusRef.current = focusedIds;
    renderer.current?.applyCommittedChanges({
      snapshot,
      changedIds: focusedIds,
    });
    if (before.stateHash !== snapshot.stateHash) {
      setMotions(motionsBetween(before, snapshot));
      setSelectedColors([]);
      setSelectedCardId(null);
      const timer = window.setTimeout(() => setMotions([]), 950);
      previous.current = snapshot;
      return () => window.clearTimeout(timer);
    }
    previous.current = snapshot;
  }, [focusedIds, snapshot]);

  const affordable = useMemo(
    () =>
      new Set(
        snapshot.legalActions
          .filter((option) => option.actionId === "buy-card")
          .map((option) => String(option.parameters.cardId)),
      ),
    [snapshot.legalActions],
  );
  const selectedCard =
    selectedCardId === null
      ? undefined
      : snapshot.cards.find((card) => card.id === selectedCardId);

  const chooseColor = (color: OrdinaryCrystalColor) => {
    if (snapshot.activePlayerId !== "human" || snapshot.result !== null) return;
    setSelectedCardId(null);
    setSelectedColors((current) => {
      if (current.includes(color))
        return current.filter((item) => item !== color);
      if (current.length >= 2) return [color];
      return [...current, color];
    });
  };

  const primaryColor =
    recommendedColors.find((color) => !selectedColors.includes(color)) ?? null;

  return (
    <div className="interactive-table">
      <div
        className="table-canvas-host"
        ref={host}
        role="img"
        aria-label="Prism Foundry tabletop with a central crystal bank, six-card market, Mara and Ivo player mats, Rulebook, House Rules, Prestige, discounts, and turn marker."
      >
        <span className="canvas-fallback">Setting up Prism Foundry…</span>
      </div>

      <div className="table-hotspots" aria-label="Interactive tabletop">
        {ordinaryColors.map((color) => {
          const legal = snapshot.legalActions.some(
            (option) =>
              option.actionId === "take-crystals" &&
              Object.values(option.parameters).includes(color),
          );
          const selected = selectedColors.includes(color);
          const recommended = recommendedColors.includes(color);
          return (
            <button
              key={color}
              type="button"
              className={`token-hotspot ${color} ${selected ? "selected" : ""} ${recommended ? "recommended" : ""}`}
              style={{
                left: `${bankPositions[color].x - 4.2}%`,
                top: `${bankPositions[color].y - 6.5}%`,
              }}
              aria-label={`${selected ? "Deselect" : "Select"} ${title(color)} crystal stack${recommended ? " — recommended" : ""}`}
              aria-pressed={selected}
              disabled={!legal}
              data-primary-action={primaryColor === color ? "true" : undefined}
              onClick={() => chooseColor(color)}
            >
              <span>
                {selected ? "Selected" : recommended ? "Choose" : "Select"}
              </span>
            </button>
          );
        })}

        {snapshot.market.map((cardId, index) => {
          const card = snapshot.cards.find((item) => item.id === cardId);
          if (card === undefined) return null;
          const canBuy = affordable.has(card.id);
          return (
            <button
              key={card.id}
              type="button"
              className={`card-hotspot ${canBuy ? "affordable" : "unavailable"} ${selectedCardId === card.id ? "selected" : ""} ${recommendedCardId === card.id ? "recommended" : ""}`}
              style={{ left: `${24.65 + index * 12.14}%` }}
              aria-label={`${card.name}. ${canBuy ? "Affordable; inspect purchase" : "Not currently affordable; inspect card"}`}
              aria-pressed={selectedCardId === card.id}
              data-primary-action={
                recommendedCardId === card.id && selectedCardId === null
                  ? "true"
                  : undefined
              }
              onClick={() => {
                setSelectedColors([]);
                setSelectedCardId((current) =>
                  current === card.id ? null : card.id,
                );
              }}
            >
              <span>{canBuy ? "Buy" : "View"}</span>
            </button>
          );
        })}

        <button
          type="button"
          className="object-hotspot rulebook-hotspot"
          onClick={onRulebook}
          aria-label="Open the Prism Foundry Rulebook"
        >
          <span>Open</span>
        </button>
        <button
          type="button"
          className={`object-hotspot house-rule-hotspot ${snapshot.houseRules.length > 0 ? "active" : ""}`}
          onClick={onHouseRules}
          aria-label="Open House Rules in the Table Agent"
        >
          <span>{snapshot.houseRules.length > 0 ? "Active" : "Add"}</span>
        </button>

        {selectedColors.length === 2 && (
          <div
            className="take-confirmation"
            role="group"
            aria-label="Confirm crystal action"
          >
            <span>To Mara's mat</span>
            <strong>
              {title(selectedColors[0]!)} + {title(selectedColors[1]!)}
            </strong>
            <button
              type="button"
              className="table-primary"
              onClick={() => {
                onTakePair(selectedColors[0]!, selectedColors[1]!);
                setSelectedColors([]);
              }}
            >
              Take {title(selectedColors[0]!)} + {title(selectedColors[1]!)}
            </button>
          </div>
        )}

        {selectedCard !== undefined && (
          <CardPurchase
            card={selectedCard}
            snapshot={snapshot}
            affordable={affordable.has(selectedCard.id)}
            marketIndex={snapshot.market.indexOf(selectedCard.id)}
            onClose={() => setSelectedCardId(null)}
            onBuy={() => {
              onBuyCard(selectedCard.id);
              setSelectedCardId(null);
            }}
          />
        )}

        {ivoThinking && (
          <div className="ivo-thinking" role="status">
            <span className="thinking-dot" /> Ivo is choosing a move…
          </div>
        )}

        {motions.map((motion, index) => (
          <span
            key={motion.id}
            className={`table-motion ${motion.kind} ${motion.color ?? ""}`}
            style={
              {
                "--from-x": `${motion.from.x}%`,
                "--from-y": `${motion.from.y}%`,
                "--to-x": `${motion.to.x}%`,
                "--to-y": `${motion.to.y}%`,
                "--motion-delay": `${index * 70}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

function CardPurchase({
  card,
  snapshot,
  affordable,
  marketIndex,
  onBuy,
  onClose,
}: {
  card: FoundryCard;
  snapshot: FoundrySnapshot;
  affordable: boolean;
  marketIndex: number;
  onBuy: () => void;
  onClose: () => void;
}) {
  const payment = paymentPreview(card, snapshot);
  return (
    <section
      className="card-purchase"
      style={{ left: `${Math.min(63, Math.max(15, 22 + marketIndex * 9))}%` }}
      aria-label={`${card.name} purchase details`}
    >
      <button
        type="button"
        className="context-close"
        onClick={onClose}
        aria-label="Close card details"
      >
        ×
      </button>
      <p className="context-eyebrow">Market card</p>
      <h3>{card.name}</h3>
      <dl>
        <div>
          <dt>Cost</dt>
          <dd>{costLabel(card.cost)}</dd>
        </div>
        <div>
          <dt>Owned</dt>
          <dd>{payment.owned}</dd>
        </div>
        <div>
          <dt>Discounts</dt>
          <dd>{payment.discounts}</dd>
        </div>
        <div>
          <dt>Final payment</dt>
          <dd>{payment.final}</dd>
        </div>
        <div>
          <dt>Prestige</dt>
          <dd>+{card.prestige}</dd>
        </div>
        <div>
          <dt>Ability</dt>
          <dd>
            {card.abilityText ||
              `Permanent ${title(card.discountColor)} discount`}
          </dd>
        </div>
      </dl>
      <button
        type="button"
        className="table-primary"
        disabled={!affordable}
        onClick={onBuy}
      >
        {affordable ? `Buy ${card.name}` : "Not enough crystals"}
      </button>
    </section>
  );
}

function paymentPreview(card: FoundryCard, snapshot: FoundrySnapshot) {
  const player = snapshot.players.human;
  const owned = Object.fromEntries(
    [...ordinaryColors, "prism"].map((color) => [
      color,
      snapshot.tokens.filter(
        (token) => token.containerId === player.matId && token.color === color,
      ).length,
    ]),
  ) as Record<CrystalColor, number>;
  let prism = 0;
  const paid: string[] = [];
  for (const color of ordinaryColors) {
    const due = Math.max(0, card.cost[color] - player.discounts[color]);
    const colored = Math.min(due, owned[color]);
    if (colored > 0) paid.push(`${colored} ${title(color)}`);
    prism += due - colored;
  }
  if (prism > 0) paid.push(`${prism} Prism`);
  return {
    owned: compactCounts(owned),
    discounts: compactCounts(player.discounts),
    final: paid.length > 0 ? paid.join(" + ") : "Free",
  };
}

function compactCounts(values: Partial<Record<CrystalColor, number>>): string {
  const visible = ([...ordinaryColors, "prism"] as CrystalColor[])
    .filter((color) => (values[color] ?? 0) > 0)
    .map((color) => `${title(color)} ${String(values[color])}`);
  return visible.length > 0 ? visible.join(" · ") : "None";
}

function costLabel(cost: Record<OrdinaryCrystalColor, number>): string {
  return ordinaryColors
    .filter((color) => cost[color] > 0)
    .map((color) => `${cost[color]} ${title(color)}`)
    .join(" + ");
}

function motionsBetween(
  before: FoundrySnapshot,
  after: FoundrySnapshot,
): Motion[] {
  const motions: Motion[] = [];
  for (const token of after.tokens) {
    const old = before.tokens.find((candidate) => candidate.id === token.id);
    if (old === undefined || old.containerId === token.containerId) continue;
    motions.push({
      id: token.id,
      kind: "token",
      color: token.color,
      from: containerPosition(old.containerId, token.color),
      to: containerPosition(token.containerId, token.color),
    });
  }
  for (const card of after.cards) {
    const old = before.cards.find((candidate) => candidate.id === card.id);
    if (old?.location !== "market" || card.location !== "tableau") continue;
    const marketIndex = before.market.indexOf(card.id);
    motions.push({
      id: `card-${card.id}`,
      kind: "card",
      color: card.discountColor,
      from: { x: 30.2 + marketIndex * 12.14, y: 18 },
      to: { x: card.ownerId === "human" ? 40 : 77, y: 77 },
    });
  }
  return motions.slice(0, 6);
}

function containerPosition(containerId: string, color: CrystalColor) {
  if (containerId === "central-bank") return bankPositions[color];
  return {
    x: containerId === "mara-mat" ? 18 : 67,
    y: 77,
  };
}

function title(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
