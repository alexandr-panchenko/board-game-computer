import { Component, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./styles.css";

interface BoundaryState {
  failed: boolean;
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  BoundaryState
> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="fatal-recovery" role="alert">
        <p className="eyebrow">Board Game Computer recovery</p>
        <h1>The table stopped before committing a partial change.</h1>
        <p>
          Reload the current room to recover its canonical tail, or return to
          the immutable judge checkpoint.
        </p>
        <div>
          <button type="button" onClick={() => location.reload()}>
            Reload room
          </button>
          <a href="/judge">Return to judge checkpoint</a>
        </div>
      </main>
    );
  }
}

const root = document.getElementById("root");

if (root === null) {
  throw new Error("Missing #root application mount");
}

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
