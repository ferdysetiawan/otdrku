"use client";

import React from "react";
import {
  FolderOpen,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Bookmark,
  Download,
  Activity,
  Move,
} from "lucide-react";
import { DistanceUnit } from "@/types/otdr";

interface ToolbarProps {
  onOpenFile: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitTrace: () => void;
  activeTool: "pan" | "zoom" | "markerA" | "markerB";
  onSelectTool: (tool: "pan" | "zoom" | "markerA" | "markerB") => void;
  unit: DistanceUnit;
  onToggleUnit: () => void;
  onExportCsv: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onOpenFile,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitTrace,
  activeTool,
  onSelectTool,
  unit,
  onToggleUnit,
  onExportCsv,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white border border-otdr-border rounded-lg shadow-sm">
      {/* Left tool group: File & View controls */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenFile}
          title="Open OTDR file (O)"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-otdr-text bg-white hover:bg-slate-50 border border-otdr-border rounded-md transition-colors"
        >
          <FolderOpen className="w-4 h-4 text-otdr-accentHover" />
          <span>Open</span>
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Pan & Zoom Tools */}
        <button
          type="button"
          onClick={() => onSelectTool("pan")}
          title="Pan Trace"
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors border ${
            activeTool === "pan"
              ? "bg-blue-50 text-blue-800 border-blue-200 shadow-xs"
              : "text-otdr-muted hover:bg-slate-50 border-transparent"
          }`}
        >
          <Move className="w-3.5 h-3.5" />
          <span>Pan</span>
        </button>

        <button
          type="button"
          onClick={onZoomIn}
          title="Zoom In"
          className="p-1.5 text-otdr-muted hover:text-otdr-text hover:bg-slate-100 rounded-md transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onZoomOut}
          title="Zoom Out"
          className="p-1.5 text-otdr-muted hover:text-otdr-text hover:bg-slate-100 rounded-md transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onResetZoom}
          title="Reset Zoom (R)"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-otdr-muted hover:text-otdr-text hover:bg-slate-50 rounded-md transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>

        <button
          type="button"
          onClick={onFitTrace}
          title="Fit Trace (F)"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-otdr-muted hover:text-otdr-text hover:bg-slate-50 rounded-md transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Fit</span>
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Marker Placement Tools */}
        <button
          type="button"
          onClick={() => onSelectTool(activeTool === "markerA" ? "pan" : "markerA")}
          title="Set Marker A on trace"
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors border ${
            activeTool === "markerA"
              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
              : "text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 border-blue-200"
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Marker A</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTool(activeTool === "markerB" ? "pan" : "markerB")}
          title="Set Marker B on trace"
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors border ${
            activeTool === "markerB"
              ? "bg-red-600 text-white border-red-600 shadow-xs"
              : "text-red-700 bg-red-50/70 hover:bg-red-100/70 border-red-200"
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Marker B</span>
        </button>
      </div>

      {/* Right tool group: Units and export */}
      <div className="flex items-center gap-2">
        {/* Unit Toggle m <-> km */}
        <button
          type="button"
          onClick={onToggleUnit}
          title="Toggle distance unit (m / km)"
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors border border-slate-300"
        >
          <Activity className="w-3 h-3 text-slate-500" />
          <span>Unit: {unit.toUpperCase()}</span>
        </button>

        {/* Export CSV */}
        <button
          type="button"
          onClick={onExportCsv}
          title="Export trace data & events to CSV"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-otdr-border rounded-md transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export CSV</span>
        </button>

      </div>
    </div>
  );
};
