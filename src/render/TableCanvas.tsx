import { useEffect, useRef } from "react";

import type { FoundrySnapshot, OrdinaryCrystalColor } from "../sample";
import { PixiTableRenderer } from "./pixi-table-renderer";

export function TableCanvas({
  snapshot,
  onTakePair,
  onBuyCard,
  focusedIds = [],
}: {
  snapshot: FoundrySnapshot;
  onTakePair: (
    first: OrdinaryCrystalColor,
    second: OrdinaryCrystalColor,
  ) => void;
  onBuyCard: (cardId: string) => void;
  focusedIds?: string[];
}) {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<PixiTableRenderer | null>(null);
  const snapshotRef = useRef(snapshot);
  const focusRef = useRef(focusedIds);

  useEffect(() => {
    if (host.current === null) return;
    const next = new PixiTableRenderer({ onTakePair, onBuyCard });
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
  }, [onBuyCard, onTakePair]);

  useEffect(() => {
    snapshotRef.current = snapshot;
    focusRef.current = focusedIds;
    renderer.current?.applyCommittedChanges({
      snapshot,
      changedIds: focusedIds,
    });
  }, [focusedIds, snapshot]);

  return (
    <div
      className="table-canvas-host"
      ref={host}
      role="img"
      aria-label="Prism Foundry tabletop with a central crystal bank, six-card market, Mara and Ivo player mats, Rulebook, House Rules, Prestige, discounts, and turn marker. Select two crystal stacks or an affordable card."
    >
      <span className="canvas-fallback">Building the table from Cell 1…</span>
    </div>
  );
}
