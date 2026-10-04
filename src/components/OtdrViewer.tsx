"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { DistanceUnit, OtdrData, OtdrMarker } from "@/types/otdr";
import { Toolbar } from "./Toolbar";
import { TraceChart } from "./TraceChart";
import { MeasurementInfo } from "./MeasurementInfo";
import { MarkerPanel } from "./MarkerPanel";
import { EventTable } from "./EventTable";
import { SummaryPanel } from "./SummaryPanel";
import { StatusBar } from "./StatusBar";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { exportTraceCsv, downloadCsvFile } from "@/lib/utils/exportCsv";
import { otdrParser } from "@/lib/otdr/parser";

export const OtdrViewer: React.FC = () => {
  const [otdrData, setOtdrData] = useState<OtdrData | null>(null);
  const [unit, setUnit] = useState<DistanceUnit>("km");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [markerA, setMarkerA] = useState<OtdrMarker | null>(null);
  const [markerB, setMarkerB] = useState<OtdrMarker | null>(null);
  const [activeTool, setActiveTool] = useState<"pan" | "zoom" | "markerA" | "markerB">("pan");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Loading OTDR file...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [cursorCoord, setCursorCoord] = useState<{ distance: number | null; power: number | null }>({
    distance: null,
    power: null,
  });

  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  const handleDataLoaded = (data: OtdrData) => {
    setOtdrData(data);
    setErrorMessage(null);
    setSelectedEventId(null);

    if (data.trace && data.trace.distance.length > 0) {
      const p1Dist = data.trace.distance[0];
      const p1Power = data.trace.power[0];

      const midDist = data.trace.maxDistance * 0.7;
      const midIdx = Math.floor(data.trace.distance.length * 0.7);
      const p2Dist = data.trace.distance[midIdx] || midDist;
      const p2Power = data.trace.power[midIdx] || p1Power;

      setMarkerA({
        id: "A",
        name: "Marker A",
        distance: p1Dist,
        power: p1Power,
        locked: false,
      });

      setMarkerB({
        id: "B",
        name: "Marker B",
        distance: p2Dist,
        power: p2Power,
        locked: false,
      });
    }
  };

  const handleToggleUnit = () => {
    setUnit((prev) => (prev === "km" ? "m" : "km"));
  };

  const handleExportCsv = () => {
    if (!otdrData) return;
    const csv = exportTraceCsv(otdrData, unit);
    downloadCsvFile(csv, otdrData.fileName);
  };

  const handleOpenFileClick = () => {
    hiddenFileInputRef.current?.click();
  };

  const handleHiddenFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      try {
        setIsLoading(true);
        setLoadingMsg(`Reading ${file.name}...`);
        const buf = await file.arrayBuffer();
        setLoadingMsg("Parsing Bellcore .SOR binary data...");
        const data = await otdrParser.parse(buf, file.name);
        handleDataLoaded(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to parse OTDR file.";
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "o" || e.key === "O") {
        e.preventDefault();
        handleOpenFileClick();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setActiveTool((prev) => (prev === "markerA" ? "markerB" : prev === "markerB" ? "pan" : "markerA"));
      } else if (e.key === "Escape") {
        setSelectedEventId(null);
        setActiveTool("pan");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-otdr-subtle text-otdr-text">
      <input
        ref={hiddenFileInputRef}
        type="file"
        accept=".sor"
        onChange={handleHiddenFileInput}
        className="hidden"
      />

      <header className="bg-white border-b border-otdr-border sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center">
          <div className="flex items-center gap-3">
            <Image
              src="/media/icondark.png"
              alt="Logo OTDRKU"
              width={40}
              height={40}
              priority
              className="h-10 w-10 rounded-lg object-cover"
            />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-otdr-text leading-none">
              OTDRKU
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4">
        {isLoading && <LoadingState message={loadingMsg} />}

        {!isLoading && errorMessage && (
          <ErrorState
            error={errorMessage}
            onRetry={handleOpenFileClick}
          />
        )}

        {!isLoading && !errorMessage && !otdrData && (
          <EmptyState
            onDataLoaded={handleDataLoaded}
            onError={(err) => setErrorMessage(err)}
            onLoading={(loading, msg) => {
              setIsLoading(loading);
              if (msg) setLoadingMsg(msg);
            }}
          />
        )}

        {!isLoading && !errorMessage && otdrData && (
          <div className="flex flex-col gap-4">
            <Toolbar
              onOpenFile={handleOpenFileClick}
              onZoomIn={() => {}}
              onZoomOut={() => {}}
              onResetZoom={() => {
                const e = new KeyboardEvent("keydown", { key: "r" });
                window.dispatchEvent(e);
              }}
              onFitTrace={() => {
                const e = new KeyboardEvent("keydown", { key: "f" });
                window.dispatchEvent(e);
              }}
              activeTool={activeTool}
              onSelectTool={(tool) => setActiveTool(tool)}
              unit={unit}
              onToggleUnit={handleToggleUnit}
              onExportCsv={handleExportCsv}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-9 order-1 flex flex-col gap-2">
                <div className="h-[480px] rounded-xl border border-otdr-border bg-white p-2 shadow-sm sm:p-3">
                  <TraceChart
                    data={otdrData}
                    unit={unit}
                    markerA={markerA}
                    markerB={markerB}
                    onMarkerChange={(m) => (m.id === "A" ? setMarkerA(m) : setMarkerB(m))}
                    selectedEventId={selectedEventId}
                    onSelectEvent={(id) => setSelectedEventId(id)}
                    activeTool={activeTool}
                    onCursorMove={(d, p) => setCursorCoord({ distance: d, power: p })}
                  />
                </div>

                <EventTable
                  events={otdrData.events}
                  selectedEventId={selectedEventId}
                  onSelectEvent={(id) => setSelectedEventId(id)}
                  unit={unit}
                />
              </div>

              {/* Right rail: measurement settings, summary, then marker analysis. */}
              <aside className="lg:col-span-3 flex flex-col gap-4 order-2">
                <MeasurementInfo metadata={otdrData.metadata} unit={unit} />
                <SummaryPanel summary={otdrData.summary} unit={unit} />
                <MarkerPanel
                  markerA={markerA}
                  markerB={markerB}
                  unit={unit}
                  onUpdateMarker={(m) => (m.id === "A" ? setMarkerA(m) : setMarkerB(m))}
                />
              </aside>
            </div>
          </div>
        )}
      </main>

      {otdrData && (
        <StatusBar
          fileName={otdrData.fileName}
          wavelength={otdrData.metadata.wavelength}
          dataPointsCount={otdrData.trace.distance.length}
          cursorDistance={cursorCoord.distance}
          cursorPower={cursorCoord.power}
          unit={unit}
        />
      )}
    </div>
  );
};
