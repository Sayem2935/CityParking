import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
  variant?: "inline" | "card" | "page";
  title?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onRetry,
  className = "",
  variant = "inline",
  title,
}) => {
  if (variant === "page") {
    return (
      <div className={`flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in ${className}`}>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-zinc-200 mb-1">
          {title || "Something went wrong"}
        </h3>
        <p className="text-sm text-zinc-500 max-w-sm mb-6">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn-primary"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={`rounded-2xl border border-red-500/20 bg-red-500/5 p-5 animate-fade-in ${className}`}
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            {title && (
              <p className="text-sm font-semibold text-red-300 mb-1">{title}</p>
            )}
            <p className="text-sm text-red-400/80">{message}</p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="shrink-0 text-sm font-medium text-red-400 hover:text-red-300 transition-colors px-3 py-1 rounded-lg hover:bg-red-500/10"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // Inline variant (default)
  return (
    <div
      className={`rounded-xl border border-red-500/20 bg-red-500/10 p-4 animate-fade-in ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
        <p className="flex-1 text-sm text-red-400">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="shrink-0 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;