import { useEffect, useRef } from "react";

import type { VaultSnapshot } from "../sample";
import { PixiTableRenderer } from "./pixi-table-renderer";

export function TableCanvas({
  snapshot,
  onDrop,
}: {
  snapshot: VaultSnapshot;
  onDrop: (entityId: string, zoneId: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<PixiTableRenderer | null>(null);
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    if (host.current === null) return;
    const next = new PixiTableRenderer({ onDrop });
    renderer.current = next;
    let active = true;
    void next.mount(host.current).then(() => {
      if (!active) return;
      next.applyCommittedChanges({
        snapshot: snapshotRef.current,
        changedIds: [],
      });
    });
    return () => {
      active = false;
      renderer.current = null;
      next.destroy();
    };
  }, [onDrop]);

  useEffect(() => {
    snapshotRef.current = snapshot;
    renderer.current?.applyCommittedChanges({ snapshot, changedIds: [] });
  }, [snapshot]);

  return (
    <div
      className="table-canvas-host"
      ref={host}
      role="img"
      aria-label="Top-down Shifting Vaults table with seven rotating rooms and two explorer pieces"
    >
      <span className="canvas-fallback">Loading deterministic table…</span>
    </div>
  );
}
