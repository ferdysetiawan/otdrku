"use client";

import React from "react";
import { DistanceUnit, OtdrMarker } from "@/types/otdr";
import {
  calculateMarkerDelta,
  formatAttenuation,
  formatDistance,
  formatLoss,
  formatPower,
} from "@/lib/otdr/calculations";
import { Bookmark, ArrowRightLeft, Lock, Unlock, Zap } from "lucide-react";

interface MarkerPanelProps {
  markerA: OtdrMarker | null;
  markerB: OtdrMarker | null;
  unit: DistanceUnit;
  onUpdateMarker: (marker: OtdrMarker) => void;
  onSetMarkerAtCenter?: (markerId: "A" | "B") => void;
}

export const MarkerPanel: React.FC<MarkerPanelProps> = ({
  markerA,
  markerB,
  unit,
  onUpdateMarker,
}) => {
  const delta = markerA && markerB ? calculateMarkerDelta(markerA, markerB) : null;

  return (
    <div className="bg-white border border-otdr-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 pb-3 mb-2 border-b border-otdr-border">
        <div className="p-1 rounded bg-blue-50 text-blue-600">
          <Bookmark className="w-4 h-4" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-otdr-text">
          Marker Analysis
        </h3>
      </div>

      <div className="space-y-3">
        {/* Marker A */}
        <div className="p-2.5 rounded-lg border border-blue-100 bg-blue-50/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              Marker A
            </span>
            {markerA && (
              <button
                type="button"
                onClick={() => onUpdateMarker({ ...markerA, locked: !markerA.locked })}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                title={markerA.locked ? "Unlock Marker A" : "Lock Marker A"}
              >
                {markerA.locked ? <Lock className="w-3 h-3 text-blue-600" /> : <Unlock className="w-3 h-3" />}
              </button>
            )}
          </div>
          {markerA ? (
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-[10px] text-otdr-muted uppercase block font-sans">Distance</span>
                <span className="font-semibold text-slate-800">{formatDistance(markerA.distance, unit)}</span>
              </div>
              <div>
                <span className="text-[10px] text-otdr-muted uppercase block font-sans">Power</span>
                <span className="font-semibold text-slate-800">{formatPower(markerA.power)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-otdr-muted italic">Click trace with Marker A tool to place</p>
          )}
        </div>

        {/* Marker B */}
        <div className="p-2.5 rounded-lg border border-red-100 bg-red-50/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              Marker B
            </span>
            {markerB && (
              <button
                type="button"
                onClick={() => onUpdateMarker({ ...markerB, locked: !markerB.locked })}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                title={markerB.locked ? "Unlock Marker B" : "Lock Marker B"}
              >
                {markerB.locked ? <Lock className="w-3 h-3 text-red-600" /> : <Unlock className="w-3 h-3" />}
              </button>
            )}
          </div>
          {markerB ? (
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-[10px] text-otdr-muted uppercase block font-sans">Distance</span>
                <span className="font-semibold text-slate-800">{formatDistance(markerB.distance, unit)}</span>
              </div>
              <div>
                <span className="text-[10px] text-otdr-muted uppercase block font-sans">Power</span>
                <span className="font-semibold text-slate-800">{formatPower(markerB.power)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-otdr-muted italic">Click trace with Marker B tool to place</p>
          )}
        </div>

        {/* Delta Calculations (Section 8 & 9) */}
        {delta ? (
          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-otdr-text border-b border-slate-200 pb-1">
              <ArrowRightLeft className="w-3.5 h-3.5 text-otdr-accentHover" />
              <span>Delta (A ↔ B)</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
              <div className="p-1.5 bg-white rounded border border-slate-200">
                <span className="text-[10px] text-otdr-muted block">Δ Distance</span>
                <span className="font-bold text-slate-800 font-mono">
                  {formatDistance(delta.distanceDelta, unit)}
                </span>
              </div>
              <div className="p-1.5 bg-white rounded border border-slate-200">
                <span className="text-[10px] text-otdr-muted block">Loss (A-B)</span>
                <span className="font-bold text-slate-800 font-mono">
                  {formatLoss(delta.loss)}
                </span>
              </div>
              <div className="p-1.5 bg-white rounded border border-slate-200">
                <span className="text-[10px] text-otdr-muted block">Attenuation</span>
                <span className="font-bold text-slate-800 font-mono">
                  {formatAttenuation(delta.attenuation)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-center py-2 text-otdr-muted bg-slate-50 rounded-lg border border-dashed border-slate-200">
            Place both Marker A & B to calculate 2-point attenuation & loss.
          </div>
        )}
      </div>
    </div>
  );
};
