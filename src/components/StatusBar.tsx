"use client";

import React from "react";
import { DistanceUnit } from "@/types/otdr";
import { formatDistance, formatPower } from "@/lib/otdr/calculations";
import { FileText, ShieldCheck, Zap, Layers } from "lucide-react";

interface StatusBarProps {
  fileName: string;
  wavelength?: number;
  dataPointsCount: number;
  cursorDistance: number | null;
  cursorPower: number | null;
  unit: DistanceUnit;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  fileName,
  wavelength,
  dataPointsCount,
  cursorDistance,
  cursorPower,
  unit,
}) => {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-white border-t border-otdr-border text-xs text-otdr-muted shadow-xs">
      {/* Left file info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-medium text-otdr-text">
          <FileText className="w-3.5 h-3.5 text-otdr-accentHover" />
          <span className="truncate max-w-[200px] sm:max-w-xs">{fileName}</span>
        </div>

        {wavelength && (
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded text-[11px] border border-blue-100">
            {wavelength} nm
          </span>
        )}


        <div className="hidden sm:flex items-center gap-1 text-slate-400">
          <Layers className="w-3.5 h-3.5" />
          <span>{dataPointsCount.toLocaleString()} points</span>
        </div>
      </div>

      {/* Center live cursor */}
      {cursorDistance !== null && cursorPower !== null && (
        <div className="hidden md:flex items-center gap-2 font-mono text-slate-700 bg-slate-100/80 px-2.5 py-0.5 rounded border border-slate-200">
          <span>X: {formatDistance(cursorDistance, unit)}</span>
          <span className="text-slate-300">|</span>
          <span>Y: {formatPower(cursorPower)}</span>
        </div>
      )}

      {/* Right privacy reminder (Section 25 & 44) */}
      <div className="flex items-center gap-1.5 text-slate-500">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span className="hidden sm:inline">Local processing — no data uploaded</span>
      </div>
    </footer>
  );
};
