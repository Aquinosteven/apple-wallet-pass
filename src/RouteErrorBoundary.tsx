import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export default class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Route render error:', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isDev = import.meta.env.DEV;

    return (
      <div style={{ minHeight: '100vh', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <div
          style={{
            maxWidth: '960px',
            margin: '0 auto',
            background: '#fff',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
          }}
        >
          <h1 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.25rem' }}>
            Something went wrong while rendering this page.
          </h1>
          <p style={{ marginTop: 0, color: '#475569' }}>
            Try refreshing the page. If this keeps happening, check console logs.
          </p>
          {isDev && this.state.error ? (
            <pre
              style={{
                overflowX: 'auto',
                background: '#0f172a',
                color: '#e2e8f0',
                borderRadius: '8px',
                padding: '0.75rem',
              }}
            >
              {this.state.error.stack || this.state.error.message}
            </pre>
          ) : null}
        </div>
      </div>
    );
  }
}
