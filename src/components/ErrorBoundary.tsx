import React, { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught React error:", error, errorInfo);
  }

  handleReset = () => {
    localStorage.removeItem("technova_sessions");
    localStorage.removeItem("technova_active_id");
    window.location.reload();
  };

  render() {
    if ((this.state as State)?.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-800">
          <div className="max-w-md rounded-2xl bg-white p-8 shadow-lg border border-slate-200 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold font-display text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-600 mb-6">
              An unhandled application error occurred. Click below to reset state and reload.
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Reset & Reload
            </button>
          </div>
        </div>
      );
    }

    return (this.props as Props).children;
  }
}
