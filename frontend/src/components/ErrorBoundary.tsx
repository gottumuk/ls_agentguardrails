/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in child components and displays a fallback UI
 * without crashing the entire application.
 * 
 * Requirements: 12.7
 */

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  demoName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details to console
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // Log to external error tracking service if configured
    if (window.location.hostname !== 'localhost') {
      // In production, you might send this to an error tracking service
      console.log('Error would be sent to error tracking service:', {
        error: error.toString(),
        componentStack: errorInfo.componentStack
      });
    }
  }

  handleReset = (): void => {
    // Clear error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Call custom reset handler if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { demoName } = this.props;
      const { error, errorInfo } = this.state;

      return (
        <div
          style={{
            padding: '20px',
            border: '2px solid #dc2626',
            borderRadius: '8px',
            backgroundColor: '#fef2f2'
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ 
              margin: '0 0 8px 0', 
              color: '#991b1b',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '24px' }}>⚠️</span>
              {demoName ? `${demoName} Error` : 'Component Error'}
            </h2>
            <p style={{ 
              margin: 0, 
              color: '#7f1d1d',
              fontSize: '14px'
            }}>
              Something went wrong in this demo. Other demos should continue to work normally.
            </p>
          </div>

          <div
            style={{
              padding: '12px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '4px',
              marginBottom: '16px'
            }}
          >
            <div style={{ 
              fontWeight: 'bold', 
              color: '#991b1b',
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              Error Details:
            </div>
            <div style={{ 
              fontFamily: 'monospace', 
              fontSize: '13px',
              color: '#7f1d1d',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {error?.toString()}
            </div>
          </div>

          {process.env.NODE_ENV === 'development' && errorInfo && (
            <details style={{ marginBottom: '16px' }}>
              <summary style={{ 
                cursor: 'pointer',
                color: '#991b1b',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px'
              }}>
                Component Stack Trace
              </summary>
              <pre
                style={{
                  padding: '12px',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#7f1d1d',
                  overflow: 'auto',
                  maxHeight: '200px'
                }}
              >
                {errorInfo.componentStack}
              </pre>
            </details>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Reset Demo
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Reload Page
            </button>
          </div>

          <div style={{ 
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#fef3c7',
            border: '1px solid #fde047',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#78350f'
          }}>
            <strong>💡 Tip:</strong> Try resetting this demo first. If the error persists, 
            reload the page. Other demos should continue to work normally.
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
