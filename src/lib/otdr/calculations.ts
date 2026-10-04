import { MeasurementDelta, OtdrEvent, OtdrMarker, OtdrSummary, OtdrTrace } from "@/types/otdr";

/**
 * Calculates attenuation (in dB/km) given either:
 * - (powerA, powerB, distanceKm): loss = powerA - powerB; att = loss / distanceKm
 * - (lossDb, distanceKm): att = lossDb / distanceKm
 */
export function calculateAttenuation(
  arg1: number,
  arg2: number,
  arg3?: number
): number {
  if (typeof arg3 === "number") {
    // calculateAttenuation(powerA, powerB, distanceKm)
    const powerA = arg1;
    const powerB = arg2;
    const distanceKm = arg3;
    if (Math.abs(distanceKm) < 1e-9) {
      return 0;
    }
    const loss = powerA - powerB;
    return loss / distanceKm;
  } else {
    // calculateAttenuation(lossDb, distanceKm)
    const lossDb = arg1;
    const distanceKm = arg2;
    if (Math.abs(distanceKm) < 1e-9) {
      return 0;
    }
    return lossDb / distanceKm;
  }
}

/**
 * Calculate distance difference between two points in meters
 */
export function calculateDistanceDiff(d1: number, d2: number): number {
  return Math.abs(d2 - d1);
}

/**
 * Calculate optical loss between two power points: Loss = Power A - Power B (in dB)
 */
export function calculateLoss(powerA: number, powerB: number): number {
  return powerA - powerB;
}

/**
 * Calculates measurement delta between Marker A and Marker B
 * Note: distance is in meters, attenuation is in dB/km
 */
export function calculateMarkerDelta(
  markerA: OtdrMarker,
  markerB: OtdrMarker
): MeasurementDelta {
  const distanceDelta = Math.abs(markerB.distance - markerA.distance);
  const loss = markerA.power - markerB.power;
  const distanceKm = distanceDelta / 1000;
  const attenuation = distanceKm > 1e-9 ? loss / distanceKm : 0;

  return {
    distanceDelta,
    loss,
    attenuation,
  };
}

/**
 * Calculates total summary of OTDR trace and events
 */
export function calculateSummary(
  trace: OtdrTrace,
  events: OtdrEvent[]
): OtdrSummary {
  // The acquisition range can extend well beyond the actual link. When the
  // file has an End event, it is the authoritative measured fiber length.
  const endEvent = events.find(e => e.type === "End");
  const fiberLength = endEvent?.distance ?? trace.maxDistance;
  const distanceKm = fiberLength / 1000;

  let totalLoss = 0;
  if (trace.power.length > 1) {
    // Power drop from start to end (ignoring end reflection spike)
    const startPower = trace.power[0];
    // Find representative end power before noise or end reflection
    const lastEvent = events.length > 0 ? events[events.length - 1] : null;
    const endEventIndex = events.findIndex(e => e.type === "End");
    
    if (endEventIndex !== -1) {
      // Calculate cumulative loss up to end event
      const endEvent = events[endEventIndex];
      totalLoss = endEvent.cumulativeLoss ?? (events.reduce((acc, e) => acc + (e.loss ?? 0), 0));
    } else {
      const endPower = trace.power[trace.power.length - 1];
      totalLoss = Math.max(0, startPower - endPower);
    }
  }

  const averageAttenuation = distanceKm > 0 ? totalLoss / distanceKm : 0;

  const reflectiveCount = events.filter(
    e => e.type === "Reflective" || e.type === "Connector" || (e.reflectance !== undefined && e.reflectance < 0)
  ).length;

  const nonReflectiveCount = events.filter(
    e => e.type === "Splice" || e.type === "Non-reflective" || e.type === "Loss"
  ).length;

  const endReflection = endEvent?.reflectance;

  return {
    fiberLength,
    totalLoss: Math.round(totalLoss * 1000) / 1000,
    averageAttenuation: Math.round(averageAttenuation * 1000) / 1000,
    eventCount: events.length,
    reflectiveCount,
    nonReflectiveCount,
    endReflection,
  };
}

/**
 * Format distance according to selected unit
 */
export function formatDistance(meters: number, unit: "m" | "km"): string {
  if (unit === "km") {
    return `${(meters / 1000).toFixed(3)} km`;
  }
  return `${meters.toFixed(1)} m`;
}

/**
 * Format power value in dBm
 */
export function formatPower(dBm: number): string {
  return `${dBm.toFixed(2)} dBm`;
}

/**
 * Format loss value in dB
 */
export function formatLoss(dB: number | undefined): string {
  if (dB === undefined || isNaN(dB)) return "—";
  return `${dB.toFixed(2)} dB`;
}

/**
 * Format reflectance value in dB
 */
export function formatReflectance(dB: number | undefined): string {
  if (dB === undefined || isNaN(dB)) return "—";
  return `${dB.toFixed(1)} dB`;
}

/**
 * Format attenuation in dB/km
 */
export function formatAttenuation(dBPerKm: number | undefined): string {
  if (dBPerKm === undefined || isNaN(dBPerKm)) return "—";
  return `${dBPerKm.toFixed(2)} dB/km`;
}
