"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { DistanceUnit, OtdrData, OtdrEvent, OtdrMarker } from "@/types/otdr";
import { formatDistance, formatPower } from "@/lib/otdr/calculations";

interface TraceChartProps {
  data: OtdrData;
  unit: DistanceUnit;
  markerA: OtdrMarker | null;
  markerB: OtdrMarker | null;
  onMarkerChange: (marker: OtdrMarker) => void;
  selectedEventId: number | null;
  onSelectEvent: (eventId: number | null) => void;
  activeTool: "pan" | "zoom" | "markerA" | "markerB";
  onCursorMove?: (distance: number | null, power: number | null) => void;
}

export const TraceChart: React.FC<TraceChartProps> = ({
  data,
  unit,
  markerA,
  markerB,
  onMarkerChange,
  selectedEventId,
  onSelectEvent,
  activeTool,
  onCursorMove,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewBounds, setViewBounds] = useState<{
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  }>({
    xMin: 0,
    xMax: 1000,
    yMin: -50,
    yMax: 0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragMarker, setDragMarker] = useState<"A" | "B" | null>(null);
  const [hoverCoord, setHoverCoord] = useState<{
    pixelX: number;
    pixelY: number;
    distance: number;
    power: number;
  } | null>(null);
  const pinchDistanceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!data || !data.trace || data.trace.distance.length === 0) return;
    const { minDistance, maxDistance, minPower, maxPower } = data.trace;
    const paddingX = Math.max(10, (maxDistance - minDistance) * 0.03);
    const paddingY = Math.max(2, (maxPower - minPower) * 0.1);

    setViewBounds({
      xMin: Math.max(0, minDistance - paddingX),
      xMax: maxDistance + paddingX,
      yMin: minPower - paddingY,
      yMax: maxPower + paddingY,
    });
  }, [data]);

  useEffect(() => {
    if (selectedEventId === null || !data.events) return;
    const event = data.events.find((e) => e.id === selectedEventId);
    if (!event) return;

    setViewBounds((prev) => {
      const currentSpan = prev.xMax - prev.xMin;
      const targetSpan = Math.min(currentSpan, Math.max(200, data.trace.maxDistance * 0.25));
      return {
        ...prev,
        xMin: Math.max(0, event.distance - targetSpan / 2),
        xMax: event.distance + targetSpan / 2,
      };
    });
  }, [selectedEventId, data]);

  const toPixelX = useCallback(
    (dist: number, width: number, padding: { left: number; right: number }) => {
      const plotWidth = width - padding.left - padding.right;
      return padding.left + ((dist - viewBounds.xMin) / (viewBounds.xMax - viewBounds.xMin)) * plotWidth;
    },
    [viewBounds.xMin, viewBounds.xMax]
  );

  const toPixelY = useCallback(
    (pwr: number, height: number, padding: { top: number; bottom: number }) => {
      const plotHeight = height - padding.top - padding.bottom;
      // Invert Y: higher power is at the top
      return padding.top + ((viewBounds.yMax - pwr) / (viewBounds.yMax - viewBounds.yMin)) * plotHeight;
    },
    [viewBounds.yMin, viewBounds.yMax]
  );

  const toPhysicalX = useCallback(
    (px: number, width: number, padding: { left: number; right: number }) => {
      const plotWidth = width - padding.left - padding.right;
      const ratio = (px - padding.left) / plotWidth;
      return viewBounds.xMin + ratio * (viewBounds.xMax - viewBounds.xMin);
    },
    [viewBounds.xMin, viewBounds.xMax]
  );

  const toPhysicalY = useCallback(
    (py: number, height: number, padding: { top: number; bottom: number }) => {
      const plotHeight = height - padding.top - padding.bottom;
      const ratio = (py - padding.top) / plotHeight;
      return viewBounds.yMax - ratio * (viewBounds.yMax - viewBounds.yMin);
    },
    [viewBounds.yMin, viewBounds.yMax]
  );

  const getPowerAtDistance = useCallback(
    (distMeters: number): number => {
      const distances = data.trace.distance;
      const powers = data.trace.power;
      const n = distances.length;
      if (n === 0) return 0;
      if (distMeters <= distances[0]) return powers[0];
      if (distMeters >= distances[n - 1]) return powers[n - 1];

      let low = 0;
      let high = n - 1;
      while (low <= high) {
        const mid = (low + high) >> 1;
        if (distances[mid] === distMeters) return powers[mid];
        if (distances[mid] < distMeters) low = mid + 1;
        else high = mid - 1;
      }
      const idx = Math.max(0, Math.min(n - 2, high));
      const t = (distMeters - distances[idx]) / (distances[idx + 1] - distances[idx]);
      return powers[idx] + t * (powers[idx + 1] - powers[idx]);
    },
    [data]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const padding = { top: 35, right: 30, bottom: 45, left: 65 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#FAFCFE";
    ctx.fillRect(padding.left, padding.top, plotWidth, plotHeight);

    ctx.lineWidth = 1;
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    const ySpan = viewBounds.yMax - viewBounds.yMin;
    const yStep = ySpan > 30 ? 10 : ySpan > 15 ? 5 : ySpan > 5 ? 2 : 1;
    const firstY = Math.ceil(viewBounds.yMin / yStep) * yStep;

    ctx.strokeStyle = "#EDF1F5";
    ctx.fillStyle = "#64748B";

    for (let yVal = firstY; yVal <= viewBounds.yMax; yVal += yStep) {
      const py = toPixelY(yVal, height, padding);
      if (py >= padding.top && py <= padding.top + plotHeight) {
        ctx.beginPath();
        ctx.moveTo(padding.left, py);
        ctx.lineTo(padding.left + plotWidth, py);
        ctx.stroke();

        ctx.fillText(`${yVal.toFixed(0)} dBm`, padding.left - 8, py);
      }
    }

    const xSpan = viewBounds.xMax - viewBounds.xMin;
    const xSpanUnit = unit === "km" ? xSpan / 1000 : xSpan;
    const minStepUnit = xSpanUnit / Math.max(2, Math.floor(plotWidth / 76));
    const stepExponent = Math.pow(10, Math.floor(Math.log10(Math.max(minStepUnit, 0.0001))));
    const xStepUnit = [1, 2, 5, 10]
      .map((multiple) => multiple * stepExponent)
      .find((step) => step >= minStepUnit) ?? 10 * stepExponent;
    const xStepMeters = unit === "km" ? xStepUnit * 1000 : xStepUnit;

    const firstX = Math.ceil(viewBounds.xMin / xStepMeters) * xStepMeters;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    for (let xVal = firstX; xVal <= viewBounds.xMax; xVal += xStepMeters) {
      const px = toPixelX(xVal, width, padding);
      if (px >= padding.left && px <= padding.left + plotWidth) {
        ctx.beginPath();
        ctx.moveTo(px, padding.top);
        ctx.lineTo(px, padding.top + plotHeight);
        ctx.stroke();

        const valueInUnit = unit === "km" ? xVal / 1000 : xVal;
        const decimals = xStepUnit < 1 ? 2 : xStepUnit < 10 ? 1 : 0;
        const displayVal = valueInUnit.toFixed(decimals);
        ctx.fillText(`${displayVal} ${unit}`, px, padding.top + plotHeight + 8);
      }
    }

    // 3. Draw Plot Border
    ctx.strokeStyle = "#CBD5E1";
    ctx.strokeRect(padding.left, padding.top, plotWidth, plotHeight);

    // Clip to plot area for trace rendering
    ctx.save();
    ctx.beginPath();
    ctx.rect(padding.left, padding.top, plotWidth, plotHeight);
    ctx.clip();

    // 4. Render Trace Line
    const distances = data.trace.distance;
    const powers = data.trace.power;
    const count = distances.length;

    if (count > 0) {
      ctx.beginPath();
      ctx.strokeStyle = "#7DA9C4"; // Accent trace line (Section 19)
      ctx.lineWidth = 1.75;
      ctx.lineJoin = "round";

      // Optimize rendering: group points per horizontal pixel column
      let started = false;
      let lastPx = -1;
      let minColY = 0;
      let maxColY = 0;

      for (let i = 0; i < count; i++) {
        const d = distances[i];
        if (d < viewBounds.xMin - 100) continue;
        if (d > viewBounds.xMax + 100) break;

        const p = powers[i];
        const px = toPixelX(d, width, padding);
        const py = toPixelY(p, height, padding);
        const col = Math.round(px);

        if (col !== lastPx) {
          if (started && lastPx !== -1) {
            ctx.lineTo(lastPx, minColY);
            if (minColY !== maxColY) {
              ctx.lineTo(lastPx, maxColY);
            }
          }
          lastPx = col;
          minColY = py;
          maxColY = py;
          if (!started) {
            ctx.moveTo(px, py);
            started = true;
          }
        } else {
          minColY = Math.min(minColY, py);
          maxColY = Math.max(maxColY, py);
        }
      }

      if (started && lastPx !== -1) {
        ctx.lineTo(lastPx, minColY);
        if (minColY !== maxColY) ctx.lineTo(lastPx, maxColY);
      }
      ctx.stroke();
    }

    // 5. Draw Event Markers (Section 42)
    if (data.events) {
      for (const event of data.events) {
        if (event.distance < viewBounds.xMin || event.distance > viewBounds.xMax) continue;

        const ex = toPixelX(event.distance, width, padding);
        const isSelected = event.id === selectedEventId;

        // Vertical line
        ctx.save();
        ctx.strokeStyle = isSelected ? "#3B82F6" : "rgba(100, 116, 139, 0.4)";
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.setLineDash(isSelected ? [] : [3, 3]);
        ctx.beginPath();
        ctx.moveTo(ex, padding.top);
        ctx.lineTo(ex, padding.top + plotHeight);
        ctx.stroke();
        ctx.restore();

        // Event Badge on top
        const badgeLabel = `E${event.id}`;
        ctx.font = "bold 10px Inter, sans-serif";
        const badgeWidth = ctx.measureText(badgeLabel).width + 8;
        const badgeX = Math.max(padding.left, Math.min(padding.left + plotWidth - badgeWidth, ex - badgeWidth / 2));
        const badgeY = padding.top + 6;

        ctx.fillStyle = isSelected ? "#3B82F6" : "#64748B";
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeWidth, 16, 3);
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeLabel, badgeX + badgeWidth / 2, badgeY + 8);
      }
    }

    // 6. Draw Markers A and B (Section 9)
    const drawMarker = (marker: OtdrMarker, color: string) => {
      if (marker.distance < viewBounds.xMin || marker.distance > viewBounds.xMax) return;
      const mx = toPixelX(marker.distance, width, padding);
      const my = toPixelY(marker.power, height, padding);

      // Vertical marker line
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(mx, padding.top);
      ctx.lineTo(mx, padding.top + plotHeight);
      ctx.stroke();

      // Marker point on trace
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(mx, my, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Top badge
      const markerLabel = marker.name;
      ctx.font = "bold 10px Inter, sans-serif";
      const mWidth = ctx.measureText(markerLabel).width + 10;
      const badgeX = Math.max(padding.left, Math.min(padding.left + plotWidth - mWidth, mx - mWidth / 2));
      const badgeY = padding.top + 26;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, mWidth, 16, 3);
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(markerLabel, badgeX + mWidth / 2, badgeY + 8);
    };

    if (markerA) drawMarker(markerA, "#2563EB"); // Blue
    if (markerB) drawMarker(markerB, "#DC2626"); // Red

    // 7. Draw Crosshair and Cursor Readout (Section 8)
    if (
      hoverCoord &&
      hoverCoord.pixelX >= padding.left &&
      hoverCoord.pixelX <= padding.left + plotWidth &&
      hoverCoord.pixelY >= padding.top &&
      hoverCoord.pixelY <= padding.top + plotHeight
    ) {
      const cx = hoverCoord.pixelX;
      const cy = hoverCoord.pixelY;

      ctx.save();
      ctx.strokeStyle = "rgba(100, 116, 139, 0.45)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(cx, padding.top);
      ctx.lineTo(cx, padding.top + plotHeight);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(padding.left, cy);
      ctx.lineTo(padding.left + plotWidth, cy);
      ctx.stroke();

      // Trace intersection circle
      const traceY = toPixelY(hoverCoord.power, height, padding);
      ctx.fillStyle = "#5B8CAE";
      ctx.beginPath();
      ctx.arc(cx, traceY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); // Restore clip
  }, [
    data,
    unit,
    viewBounds,
    markerA,
    markerB,
    selectedEventId,
    hoverCoord,
    toPixelX,
    toPixelY,
  ]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = { top: 35, right: 30, bottom: 45, left: 65 };
    const dist = toPhysicalX(x, rect.width, padding);

    if (markerA) {
      const ax = toPixelX(markerA.distance, rect.width, padding);
      if (Math.abs(x - ax) < 10) {
        setDragMarker("A");
        setIsDragging(true);
        return;
      }
    }
    if (markerB) {
      const bx = toPixelX(markerB.distance, rect.width, padding);
      if (Math.abs(x - bx) < 10) {
        setDragMarker("B");
        setIsDragging(true);
        return;
      }
    }

    if (data.events) {
      for (const event of data.events) {
        const ex = toPixelX(event.distance, rect.width, padding);
        if (Math.abs(x - ex) < 8) {
          onSelectEvent(event.id);
          return;
        }
      }
    }

    if (activeTool === "markerA") {
      const power = getPowerAtDistance(dist);
      onMarkerChange({ id: "A", name: "Marker A", distance: dist, power });
      return;
    }
    if (activeTool === "markerB") {
      const power = getPowerAtDistance(dist);
      onMarkerChange({ id: "B", name: "Marker B", distance: dist, power });
      return;
    }

    setIsDragging(true);
    setDragStart({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = { top: 35, right: 30, bottom: 45, left: 65 };
    const dist = Math.max(0, toPhysicalX(x, rect.width, padding));
    const power = getPowerAtDistance(dist);

    setHoverCoord({ pixelX: x, pixelY: y, distance: dist, power });
    if (onCursorMove) onCursorMove(dist, power);

    // Dragging marker
    if (isDragging && dragMarker) {
      const safeDist = Math.max(0, Math.min(data.trace.maxDistance, dist));
      const pwr = getPowerAtDistance(safeDist);
      if (dragMarker === "A") {
        onMarkerChange({ id: "A", name: "Marker A", distance: safeDist, power: pwr });
      } else {
        onMarkerChange({ id: "B", name: "Marker B", distance: safeDist, power: pwr });
      }
      return;
    }

    // Panning chart
    if (isDragging && dragStart && activeTool === "pan") {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      const plotWidth = rect.width - padding.left - padding.right;
      const plotHeight = rect.height - padding.top - padding.bottom;

      const deltaX = -((dx / plotWidth) * (viewBounds.xMax - viewBounds.xMin));
      const deltaY = (dy / plotHeight) * (viewBounds.yMax - viewBounds.yMin);

      setViewBounds((prev) => ({
        xMin: Math.max(0, prev.xMin + deltaX),
        xMax: Math.max(10, prev.xMax + deltaX),
        yMin: prev.yMin + deltaY,
        yMax: prev.yMax + deltaY,
      }));
      setDragStart({ x, y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
    setDragMarker(null);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setDragStart(null);
    setDragMarker(null);
    setHoverCoord(null);
    if (onCursorMove) onCursorMove(null, null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padding = { top: 35, right: 30, bottom: 45, left: 65 };

    const mouseDist = toPhysicalX(x, rect.width, padding);
    // Deliberately gentle: trackpads can emit large, frequent wheel events.
    const zoomFactor = Math.exp(Math.sign(e.deltaY) * 0.08);

    setViewBounds((prev) => {
      const currentSpanX = prev.xMax - prev.xMin;
      const newSpanX = Math.max(20, currentSpanX * zoomFactor);
      const ratio = (mouseDist - prev.xMin) / currentSpanX;

      const newXMin = Math.max(0, mouseDist - ratio * newSpanX);
      const newXMax = newXMin + newSpanX;

      return {
        ...prev,
        xMin: newXMin,
        xMax: newXMax,
      };
    });
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 2) return;
    const [first, second] = [e.touches[0], e.touches[1]];
    pinchDistanceRef.current = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 2 || !pinchDistanceRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const [first, second] = [e.touches[0], e.touches[1]];
    const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
    const previousDistance = pinchDistanceRef.current;
    if (previousDistance <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const centerX = (first.clientX + second.clientX) / 2 - rect.left;
    const padding = { top: 35, right: 30, bottom: 45, left: 65 };
    const centerDistance = toPhysicalX(centerX, rect.width, padding);
    // Apply only a quarter of the pinch delta for controlled touchscreen zoom.
    const zoomFactor = 1 + ((previousDistance - distance) / previousDistance) * 0.25;
    if (zoomFactor <= 0) return;

    setViewBounds((prev) => {
      const span = prev.xMax - prev.xMin;
      const newSpan = Math.max(20, span * zoomFactor);
      const ratio = (centerDistance - prev.xMin) / span;
      const xMin = Math.max(0, centerDistance - ratio * newSpan);
      return { ...prev, xMin, xMax: xMin + newSpan };
    });
    pinchDistanceRef.current = distance;
  };

  const handleTouchEnd = () => {
    pinchDistanceRef.current = null;
  };

  // Reset zoom to fit full trace
  const handleResetZoom = useCallback(() => {
    const { minDistance, maxDistance, minPower, maxPower } = data.trace;
    const paddingX = Math.max(10, (maxDistance - minDistance) * 0.03);
    const paddingY = Math.max(2, (maxPower - minPower) * 0.1);

    setViewBounds({
      xMin: Math.max(0, minDistance - paddingX),
      xMax: maxDistance + paddingX,
      yMin: minPower - paddingY,
      yMax: maxPower + paddingY,
    });
  }, [data]);

  // Expose reset to window / parent if needed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R" || e.key === "f" || e.key === "F") {
        handleResetZoom();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleResetZoom]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[420px] select-none">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`w-full h-full block touch-none rounded-lg border border-otdr-border shadow-sm ${
          dragMarker ? "cursor-ew-resize" : activeTool === "pan" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"
        }`}
      />

      {/* Floating cursor readout overlay (Section 8) */}
      {hoverCoord && (
        <div className="absolute top-2.5 right-3 bg-white/95 backdrop-blur-sm border border-otdr-border px-3 py-1.5 rounded-md shadow-sm text-xs flex items-center gap-3 pointer-events-none">
          <div>
            <span className="text-otdr-muted font-medium">Distance: </span>
            <span className="font-semibold text-otdr-text">
              {formatDistance(hoverCoord.distance, unit)}
            </span>
          </div>
          <div className="h-3 w-px bg-slate-200" />
          <div>
            <span className="text-otdr-muted font-medium">Power: </span>
            <span className="font-semibold text-otdr-text">
              {formatPower(hoverCoord.power)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
