"use client";

import React, { useRef, useState } from "react";
import { Upload, FileCode, ShieldCheck } from "lucide-react";
import { otdrParser } from "@/lib/otdr/parser";
import { OtdrData } from "@/types/otdr";

interface FileUploaderProps {
  onDataLoaded: (data: OtdrData) => void;
  onError: (error: string) => void;
  onLoading: (isLoading: boolean, message?: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onDataLoaded,
  onError,
  onLoading,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    // Section 22: File Validation
    if (!file.name.toLowerCase().endsWith(".sor") && !file.name.toLowerCase().endsWith(".sor.txt")) {
      onError("Please select a valid Bellcore/Telcordia standard OTDR file (.sor).");
      return;
    }

    if (file.size < 64) {
      onError("Unable to read OTDR file: file is too small or corrupted.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      onError("File size exceeds 50MB limit.");
      return;
    }

    try {
      onLoading(true, `Reading ${file.name}...`);
      const buffer = await file.arrayBuffer();
      onLoading(true, "Parsing Bellcore/Telcordia SOR data...");
      const parsedData = await otdrParser.parse(buffer, file.name);
      onDataLoaded(parsedData);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to parse OTDR file.";
      onError(`Could not parse this OTDR file: ${errMsg}`);
    } finally {
      onLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto my-6">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 bg-white ${
          isDragging
            ? "border-otdr-accent bg-otdr-accentLight/30 scale-[1.01]"
            : "border-otdr-border hover:border-otdr-accent hover:bg-slate-50/70 shadow-sm"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".sor"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-otdr-accentLight flex items-center justify-center text-otdr-accentHover">
            <Upload className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-otdr-text">
              Drop OTDR File Here
            </h3>
            <p className="text-sm text-otdr-muted mt-1">
              or click to browse from your computer
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-otdr-muted">
            <FileCode className="w-3.5 h-3.5 text-otdr-accentHover" />
            Supported: Bellcore / Telcordia standard .SOR
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-1 px-2 text-xs text-otdr-muted">
        <div className="flex items-center gap-1 text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Local processing — no files uploaded to any server</span>
        </div>
      </div>
    </div>
  );
};
