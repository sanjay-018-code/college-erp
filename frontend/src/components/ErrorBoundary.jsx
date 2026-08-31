import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // In production this is where you'd forward to an error-tracking service
    // (Sentry, etc.) — CHANGE_ME once you have one wired up.
    console.error("Unhandled UI error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="crash-screen">
          <div className="crash-card">
            <h1>Something went wrong</h1>
            <p>
              The app hit an unexpected error. Reloading usually fixes it — if it
              keeps happening, please let an administrator know what you were doing.
            </p>
            <details>
              <summary>Technical details</summary>
              <pre>{String(this.state.error?.message || this.state.error)}</pre>
            </details>
            <button className="btn btn-accent" onClick={() => window.location.reload()}>
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
