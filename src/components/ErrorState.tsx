"use client";

import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="w-full max-w-xl mx-auto my-8 p-6 bg-white border border-rose-200 rounded-xl shadow-sm text-center">
      <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-3 text-rose-500">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <h3 className="text-base font-bold text-slate-900 mb-1">
        Unable to read OTDR file
      </h3>
      <p className="text-xs text-otdr-muted mb-4 max-w-md mx-auto">
        The file may be corrupted or in an unsupported format. Try exporting the trace as a standard Bellcore/Telcordia .SOR file.
      </p>

      {/* Expandable error detail (Section 22 & 23) */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium"
        >
          <span>Error details</span>
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showDetails && (
          <div className="mt-2 p-3 bg-slate-50 rounded-lg text-left text-xs font-mono text-rose-700 border border-slate-200 break-words">
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Try Another File</span>
        </button>
      </div>
    </div>
  );
};
