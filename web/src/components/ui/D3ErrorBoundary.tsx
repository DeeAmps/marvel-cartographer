"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class D3ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            className="rounded-lg border p-6 text-center"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
          >
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              Visualization failed to load. Please refresh the page.
            </p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
