"use client";

import React from "react";
import { DistanceUnit, OtdrEvent } from "@/types/otdr";
import {
  formatAttenuation,
  formatDistance,
  formatLoss,
  formatReflectance,
} from "@/lib/otdr/calculations";
import { Target, X, Bookmark } from "lucide-react";

interface EventDetailsProps {
  event: OtdrEvent | null;
  unit: DistanceUnit;
  onClose: () => void;
  onSetMarkerA: (distance: number) => void;
  onSetMarkerB: (distance: number) => void;
}

export const EventDetails: React.FC<EventDetailsProps> = ({
  event,
  unit,
  onClose,
  onSetMarkerA,
  onSetMarkerB,
}) => {
  if (!event) return null;

  return (
    <div className="bg-white border border-blue-200 rounded-xl p-3.5 shadow-sm bg-gradient-to-br from-white to-blue-50/20">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-blue-100">
        <div className="flex items-center gap-1.5">
          <Target className="w-4 h-4 text-blue-600" />
          <h4 className="text-xs font-bold text-slate-800">
            Event #{event.id} Details: {event.type}
          </h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-0.5"
          title="Close details"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
        <div className="p-2 rounded bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-otdr-muted block">Distance</span>
          <span className="font-bold text-slate-800 font-mono">
            {formatDistance(event.distance, unit)}
          </span>
        </div>
        <div className="p-2 rounded bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-otdr-muted block">Event Loss</span>
            <span className="font-bold text-slate-800 font-mono">
            {formatLoss(event.loss ?? event.segmentLoss)}
          </span>
        </div>
        <div className="p-2 rounded bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-otdr-muted block">Reflectance</span>
          <span className="font-bold text-slate-800 font-mono">
            {formatReflectance(event.reflectance)}
          </span>
        </div>
        <div className="p-2 rounded bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-otdr-muted block">Cumulative Loss</span>
          <span className="font-bold text-slate-800 font-mono">
            {formatLoss(event.cumulativeLoss)}
          </span>
        </div>
      </div>

      {event.comment && (
        <p className="text-xs text-slate-600 bg-blue-50/50 p-2 rounded border border-blue-100/50 mb-2">
          <span className="font-semibold text-blue-900">Note: </span>
          {event.comment}
        </p>
      )}

      {/* Quick Marker Placement Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSetMarkerA(event.distance)}
          className="flex-1 inline-flex items-center justify-center gap-1 py-1 px-2 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
        >
          <Bookmark className="w-3 h-3 text-blue-600" />
          Set Marker A Here
        </button>
        <button
          type="button"
          onClick={() => onSetMarkerB(event.distance)}
          className="flex-1 inline-flex items-center justify-center gap-1 py-1 px-2 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors"
        >
          <Bookmark className="w-3 h-3 text-red-600" />
          Set Marker B Here
        </button>
      </div>
    </div>
  );
};
