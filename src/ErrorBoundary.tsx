import React, { type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-[#121214] border border-[#27272a] rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center text-xl font-mono font-bold">
              !
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#f4f4f5]">Something went wrong</h2>
              <p className="text-xs text-[#a1a1aa] mt-1">
                An unexpected error occurred while rendering the application.
              </p>
            </div>
            {this.state.error && (
              <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-3 text-left overflow-x-auto max-h-32">
                <p className="text-[11px] font-mono text-red-400 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-medium tracking-wide transition-colors cursor-pointer shadow-md"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
