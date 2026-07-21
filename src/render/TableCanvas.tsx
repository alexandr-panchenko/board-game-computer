import { useEffect, useRef } from "react";

import type { VaultSnapshot } from "../sample";
import { PixiTableRenderer } from "./pixi-table-renderer";

export function TableCanvas({
  snapshot,
  onDrop,
  focusedRoomId,
}: {
  snapshot: VaultSnapshot;
  onDrop: (entityId: string, zoneId: string) => void;
  focusedRoomId?: string | null;
}) {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<PixiTableRenderer | null>(null);
  const snapshotRef = useRef(snapshot);
  const focusedRoomRef = useRef(focusedRoomId);

  useEffect(() => {
    if (host.current === null) return;
    const next = new PixiTableRenderer({ onDrop });
    renderer.current = next;
    let active = true;
    void next.mount(host.current).then(() => {
      if (!active) return;
      next.applyCommittedChanges({
        snapshot: snapshotRef.current,
        changedIds:
          focusedRoomRef.current === null ||
          focusedRoomRef.current === undefined
            ? []
            : [focusedRoomRef.current],
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
    focusedRoomRef.current = focusedRoomId;
    renderer.current?.applyCommittedChanges({
      snapshot,
      changedIds:
        focusedRoomId === null || focusedRoomId === undefined
          ? []
          : [focusedRoomId],
    });
  }, [focusedRoomId, snapshot]);

  return (
    <div
      className="table-canvas-host"
      ref={host}
      role="img"
      aria-label="Top-down Shifting Vaults table. Select the active explorer, then select a glowing connected room to move."
    >
      <span className="canvas-fallback">Loading deterministic table…</span>
    </div>
  );
}
