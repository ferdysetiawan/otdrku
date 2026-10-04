"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Reading OTDR file...",
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-otdr-border shadow-sm text-center">
      <div className="w-12 h-12 rounded-full bg-otdr-accentLight flex items-center justify-center mb-4 text-otdr-accentHover animate-pulse">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
      <h3 className="text-base font-semibold text-otdr-text mb-1">
        {message}
      </h3>
      <p className="text-xs text-otdr-muted max-w-sm">
        Parsing binary Bellcore/Telcordia structures and generating trace waveform...
      </p>

      <div className="w-48 h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
        <div className="h-full bg-otdr-accent rounded-full animate-indeterminate" />
      </div>
    </div>
  );
};
