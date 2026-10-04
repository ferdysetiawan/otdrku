"use client";

import React from "react";
import { DistanceUnit, OtdrMetadata } from "@/types/otdr";
import { formatDistance } from "@/lib/otdr/calculations";
import { Info, Cpu, Radio, Clock, Shield } from "lucide-react";

interface MeasurementInfoProps {
  metadata: OtdrMetadata;
  unit: DistanceUnit;
}

export const MeasurementInfo: React.FC<MeasurementInfoProps> = ({ metadata, unit }) => {
  const renderRow = (label: string, value: string | number | undefined, suffix = "") => {
    const displayValue = value !== undefined && value !== null && value !== "" ? `${value}${suffix}` : "N/A";
    return (
      <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0 text-xs">
        <span className="text-otdr-muted font-medium">{label}</span>
        <span className="font-semibold text-otdr-text font-mono text-right">{displayValue}</span>
      </div>
    );
  };

  return (
    <div className="bg-white border border-otdr-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 pb-3 mb-2 border-b border-otdr-border">
        <div className="p-1 rounded bg-slate-100 text-slate-600">
          <Info className="w-4 h-4" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-otdr-text">
          Measurement Info
        </h3>
      </div>

      <div className="space-y-0.5">
        {renderRow("Vendor", metadata.vendor)}
        {renderRow("Model", metadata.model)}
        {renderRow("Serial Number", metadata.serialNumber)}
        {renderRow("Wavelength", metadata.wavelength, " nm")}
        {renderRow("Pulse Width", metadata.pulseWidth, " ns")}
        {renderRow(
          "Range",
          metadata.range !== undefined ? formatDistance(metadata.range, unit) : undefined
        )}
        {renderRow("Averaging", metadata.averagingTime, " s")}
        {renderRow("IOR (Index)", metadata.refractiveIndex?.toFixed(5))}
        {renderRow("Backscatter", metadata.backscatterCoefficient?.toFixed(1), " dB")}
        {renderRow(
          "Fiber Length",
          metadata.fiberLength !== undefined ? formatDistance(metadata.fiberLength, unit) : undefined
        )}
        {renderRow(
          "Measurement Date",
          metadata.date ? `${metadata.date}${metadata.time ? ` ${metadata.time}` : ""}` : undefined
        )}
        {renderRow("Cable ID", metadata.cableId)}
        {renderRow("Fiber ID", metadata.fiberId)}
        {renderRow("Fiber Type", metadata.fiberType)}
        {renderRow("Origin", metadata.originatingLocation)}
        {renderRow("Termination", metadata.terminatingLocation)}
        {renderRow("Cable Code", metadata.cableCode)}
        {renderRow("Operator", metadata.operator)}
        {renderRow("Notes", metadata.comments)}
      </div>
    </div>
  );
};
