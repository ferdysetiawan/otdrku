"use client";

import React from "react";
import { FileUploader } from "./FileUploader";
import { OtdrData } from "@/types/otdr";

interface EmptyStateProps {
  onDataLoaded: (data: OtdrData) => void;
  onError: (error: string) => void;
  onLoading: (isLoading: boolean, message?: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onDataLoaded,
  onError,
  onLoading,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4">
      {/* Title & subtitle */}
      <div className="text-center max-w-xl mx-auto mb-6">
        <h1 className="text-3xl font-extrabold text-otdr-text tracking-tight sm:text-4xl">
          OTDRKU
        </h1>
        <p className="mt-2 text-sm text-otdr-muted">
          Open, visualize, and analyze Bellcore/Telcordia .SOR trace files directly in your web browser. Local-first, fast, and secure.
        </p>
      </div>

      {/* Upload Zone */}
      <FileUploader
        onDataLoaded={onDataLoaded}
        onError={onError}
        onLoading={onLoading}
      />

    </div>
  );
};
