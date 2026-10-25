import React from 'react';
import { AlertCircle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/sales/orders';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-50/50">
          <div className="max-w-xl w-full bg-white rounded-2xl border border-rose-200 shadow-lg p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto text-rose-600 shadow-xs ring-4 ring-rose-50">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Something went wrong on this page
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                An unexpected error occurred while rendering this module. You can reload the page or navigate back to the main dashboard.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-slate-50 rounded-xl p-3 border border-slate-200">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="w-full flex items-center justify-between text-xs font-mono font-bold text-rose-800"
                >
                  <span className="truncate">{this.state.error.toString()}</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="w-4 h-4 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />
                  )}
                </button>

                {this.state.showDetails && this.state.errorInfo && (
                  <pre className="mt-2 text-[11px] font-mono text-slate-600 overflow-x-auto p-2 bg-white rounded border border-slate-200 max-h-48 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-brand text-white hover:bg-brand-600 shadow-xs transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Go to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
