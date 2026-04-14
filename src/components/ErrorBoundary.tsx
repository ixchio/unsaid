'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary-fallback">
          <div className="error-boundary-icon">×</div>
          <p>something broke.</p>
          <button
            className="btn-ghost"
            onClick={() => this.setState({ hasError: false })}
          >
            try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
