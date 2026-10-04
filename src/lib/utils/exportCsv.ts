import { OtdrData, DistanceUnit } from "@/types/otdr";

/**
 * Export trace points and events to CSV format (Section 26 of ins.md)
 */
export function exportTraceCsv(data: OtdrData, unit: DistanceUnit = "km"): string {
  const lines: string[] = [];

  // Metadata headers
  lines.push(`# OTDR Viewer Trace Export`);
  lines.push(`# File: ${data.fileName}`);
  lines.push(`# Wavelength: ${data.metadata.wavelength || "N/A"} nm`);
  lines.push(`# Date: ${data.metadata.date || "N/A"} ${data.metadata.time || ""}`);
  lines.push(`# Vendor: ${data.metadata.vendor || "N/A"}`);
  lines.push(``);

  // Events section
  if (data.events && data.events.length > 0) {
    lines.push(`# Event Table`);
    lines.push(`event,distance_${unit},type,loss_dB,reflectance_dB,attenuation_dB_per_km,comment`);
    for (const e of data.events) {
      const dist = unit === "km" ? (e.distance / 1000).toFixed(4) : e.distance.toFixed(1);
      const loss = e.loss !== undefined ? e.loss.toFixed(3) : "";
      const refl = e.reflectance !== undefined ? e.reflectance.toFixed(2) : "";
      const att = e.attenuation !== undefined ? e.attenuation.toFixed(3) : "";
      const comment = e.comment ? `"${e.comment.replace(/"/g, '""')}"` : "";
      lines.push(`${e.id},${dist},${e.type},${loss},${refl},${att},${comment}`);
    }
    lines.push(``);
  }

  // Trace data section
  lines.push(`# Trace Data Points`);
  lines.push(`distance_${unit},power_dBm`);
  const distances = data.trace.distance;
  const powers = data.trace.power;
  const n = powers.length;

  for (let i = 0; i < n; i++) {
    const d = unit === "km" ? (distances[i] / 1000).toFixed(4) : distances[i].toFixed(2);
    const p = powers[i].toFixed(3);
    lines.push(`${d},${p}`);
  }

  return lines.join("\n");
}

/**
 * Trigger download of CSV text file in browser
 */
export function downloadCsvFile(csvContent: string, fileName: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName.replace(/\.[^/.]+$/, "") + ".csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
