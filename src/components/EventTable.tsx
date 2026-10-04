"use client";

import React from "react";
import { DistanceUnit, OtdrEvent, OtdrEventType } from "@/types/otdr";
import {
  formatAttenuation,
  formatDistance,
  formatLoss,
  formatReflectance,
} from "@/lib/otdr/calculations";
import { ListFilter, MapPin } from "lucide-react";

interface EventTableProps {
  events: OtdrEvent[];
  selectedEventId: number | null;
  onSelectEvent: (eventId: number | null) => void;
  unit: DistanceUnit;
}

export const EventTable: React.FC<EventTableProps> = ({
  events,
  selectedEventId,
  onSelectEvent,
  unit,
}) => {
  const getBadgeStyle = (type: OtdrEventType) => {
    switch (type) {
      case "Launch":
        return "bg-slate-100 text-slate-700 border-slate-300";
      case "Connector":
      case "Reflective":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Splice":
      case "Non-reflective":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "End":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "Gainer":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Loss":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  if (!events || events.length === 0) {
    return (
      <div className="bg-white border border-otdr-border rounded-xl p-4 shadow-sm text-center">
        <p className="text-xs text-otdr-muted italic">No event table found in this OTDR trace.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-otdr-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-otdr-border">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-slate-100 text-slate-600">
            <ListFilter className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-otdr-text">
            Event Table ({events.length})
          </h3>
        </div>
        <span className="text-[11px] text-otdr-muted">Click row to inspect</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-otdr-muted font-semibold z-10">
            <tr>
              <th className="py-2 px-2 text-center w-8">#</th>
              <th className="py-2 px-2">Distance</th>
              <th className="py-2 px-2">Type</th>
              <th className="py-2 px-2 text-right">Loss</th>
              <th className="py-2 px-2 text-right">Cumulative Loss</th>
              <th className="py-2 px-2 text-right">Reflectance</th>
              <th className="py-2 px-2 text-right">Attenuation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.map((e, index) => {
              const isSelected = e.id === selectedEventId;
              // Older SOR writers often omit discrete event loss. In that
              // case show the measured link loss for this event segment.
              const displayLoss = e.loss ?? e.segmentLoss;
              return (
                <tr
                  key={`${e.id}-${e.distance}-${index}`}
                  onClick={() => onSelectEvent(isSelected ? null : e.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-blue-50/80 font-medium text-blue-900 border-l-4 border-l-blue-600"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <td className="py-2 px-2 text-center font-mono font-semibold text-slate-500">
                    {e.id}
                  </td>
                  <td className="py-2 px-2 font-mono whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      {isSelected && <MapPin className="w-3 h-3 text-blue-600" />}
                      {formatDistance(e.distance, unit)}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getBadgeStyle(
                        e.type
                      )}`}
                    >
                      {e.type}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right font-mono whitespace-nowrap">
                    {formatLoss(displayLoss)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono whitespace-nowrap font-semibold text-slate-700">
                    {formatLoss(e.cumulativeLoss)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono whitespace-nowrap">
                    {formatReflectance(e.reflectance)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono whitespace-nowrap text-slate-500">
                    {formatAttenuation(e.attenuation)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
