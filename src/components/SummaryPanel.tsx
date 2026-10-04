"use client";

import React from "react";
import { DistanceUnit, OtdrSummary } from "@/types/otdr";
import {
  formatAttenuation,
  formatDistance,
  formatLoss,
  formatReflectance,
} from "@/lib/otdr/calculations";
import { BarChart2, CheckCircle2 } from "lucide-react";

interface SummaryPanelProps {
  summary: OtdrSummary | undefined;
  unit: DistanceUnit;
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({ summary, unit }) => {
  if (!summary) return null;

  return (
    <div className="bg-white border border-otdr-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 pb-3 mb-2 border-b border-otdr-border">
        <div className="p-1 rounded bg-emerald-50 text-emerald-600">
          <BarChart2 className="w-4 h-4" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-otdr-text">
          Link Summary
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-otdr-muted block">Fiber Length</span>
          <span className="font-bold text-slate-800 font-mono">
            {formatDistance(summary.fiberLength, unit)}
          </span>
        </div>

        <div className="p-2 rounded bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-otdr-muted block">Total Optical Loss</span>
          <span className="font-bold text-slate-800 font-mono">
            {formatLoss(summary.totalLoss)}
          </span>
        </div>

        <div className="p-2 rounded bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-otdr-muted block">Average Attenuation</span>
          <span className="font-bold text-slate-800 font-mono">
            {formatAttenuation(summary.averageAttenuation)}
          </span>
        </div>

        <div className="p-2 rounded bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-otdr-muted block">End Reflection</span>
          <span className="font-bold text-slate-800 font-mono">
            {formatReflectance(summary.endReflection)}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-otdr-muted">
        <span>Total Events: <strong className="text-slate-800">{summary.eventCount}</strong></span>
        <span>Reflective: <strong className="text-blue-700">{summary.reflectiveCount}</strong></span>
        <span>Non-Reflective: <strong className="text-emerald-700">{summary.nonReflectiveCount}</strong></span>
      </div>
    </div>
  );
};
