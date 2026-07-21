import type { TraceEvent } from "../runtime/store/types";
import type { FoundrySnapshot } from "../sample";

export interface RuntimeChangeSet {
  snapshot: FoundrySnapshot;
  changedIds: string[];
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
  focusTrace(trace: TraceEvent[]): void;
  resize(viewport: Viewport): void;
  destroy(): void;
}
