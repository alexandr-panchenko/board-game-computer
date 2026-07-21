import type { TraceEvent } from "../runtime/store/types";
import type { VaultSnapshot } from "../sample";

export interface RuntimeChangeSet {
  snapshot: VaultSnapshot;
  changedIds: string[];
}

export interface DragPreview {
  entityId: string;
  destinationIds: string[];
}

export interface Viewport {
  width: number;
  height: number;
  resolution: number;
}

export interface TableRenderer {
  mount(container: HTMLElement): Promise<void>;
  applyCommittedChanges(changeSet: RuntimeChangeSet): void;
  applyInverseChanges(changeSet: RuntimeChangeSet): void;
  previewDrag(preview: DragPreview): void;
  clearPreview(): void;
  focusTrace(trace: TraceEvent[]): void;
  resize(viewport: Viewport): void;
  destroy(): void;
}
