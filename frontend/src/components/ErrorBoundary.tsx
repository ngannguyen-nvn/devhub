import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.href = '/'
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-6 grid-pattern">
          <div className="max-w-2xl w-full glass-card rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[hsla(var(--danger),0.15)] flex items-center justify-center">
                <AlertCircle className="text-[hsl(var(--danger))]" size={28} />
              </div>
              <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Something went wrong</h1>
            </div>

            <div className="mb-6">
              <p className="text-[hsl(var(--foreground-muted))] mb-4">
                The application encountered an unexpected error. This has been logged for investigation.
              </p>

              {this.state.error && (
                <div className="bg-[hsla(var(--danger),0.1)] border border-[hsla(var(--danger),0.3)] rounded-xl p-4 mb-4">
                  <p className="terminal-text text-sm text-[hsl(var(--danger))] break-all">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              {this.state.errorInfo && (
                <details className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl p-4">
                  <summary className="cursor-pointer font-semibold text-[hsl(var(--foreground))] mb-2">
                    Stack Trace
                  </summary>
                  <pre className="text-xs text-[hsl(var(--foreground-muted))] overflow-auto max-h-96 terminal-text">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="px-6 py-2.5 btn-glow text-[hsl(var(--background))] rounded-xl transition-all font-medium"
              >
                Return to Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-[hsl(var(--background-elevated))] text-[hsl(var(--foreground-muted))] rounded-xl hover:bg-[hsl(var(--border))] transition-colors font-medium"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
