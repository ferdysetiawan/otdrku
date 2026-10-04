export type DistanceUnit = "m" | "km";
export type PowerUnit = "dBm";

export type OtdrEventType =
  | "Launch"
  | "Reflective"
  | "Non-reflective"
  | "Splice"
  | "Connector"
  | "Splitter"
  | "End"
  | "Gainer"
  | "Loss"
  | "Unknown";

export interface OtdrEvent {
  id: number;
  distance: number; // Always stored in meters internally
  type: OtdrEventType;
  loss?: number; // dB
  /** Loss accumulated in the fiber section since the previous event. */
  segmentLoss?: number; // dB
  reflectance?: number; // dB
  attenuation?: number; // dB/km
  cumulativeLoss?: number; // dB
  comment?: string;
}

export interface OtdrMarker {
  id: "A" | "B" | "C" | "D";
  name: string;
  distance: number; // in meters
  power: number; // in dBm
  locked?: boolean;
  color?: string;
}

export interface OtdrMetadata {
  vendor?: string;
  model?: string;
  serialNumber?: string;
  wavelength?: number; // in nm
  pulseWidth?: number; // in ns
  range?: number; // in meters
  averagingTime?: number; // in seconds
  date?: string;
  time?: string;
  fiberLength?: number; // in meters
  refractiveIndex?: number;
  backscatterCoefficient?: number; // in dB
  cableId?: string;
  fiberId?: string;
  fiberType?: string;
  originatingLocation?: string;
  terminatingLocation?: string;
  cableCode?: string;
  operator?: string;
  comments?: string;
  launchCable?: number; // in meters
  receiveCable?: number; // in meters
}

export interface OtdrTrace {
  distance: Float64Array | number[];
  power: Float32Array | number[];
  distanceUnit: DistanceUnit;
  powerUnit: PowerUnit;
  minDistance: number;
  maxDistance: number;
  minPower: number;
  maxPower: number;
  wavelength?: number;
  traceId?: string;
  name?: string;
  color?: string;
  visible?: boolean;
}

export interface OtdrSummary {
  fiberLength: number; // in meters
  totalLoss: number; // in dB
  averageAttenuation: number; // in dB/km
  eventCount: number;
  reflectiveCount: number;
  nonReflectiveCount: number;
  endReflection?: number; // in dB
}

export interface OtdrData {
  fileName: string;
  metadata: OtdrMetadata;
  trace: OtdrTrace;
  events: OtdrEvent[];
  markers?: OtdrMarker[];
  summary?: OtdrSummary;
  availableWavelengths?: number[];
  traces?: OtdrTrace[];
  rawBlocks?: { type: string; offset: number; length: number }[];
}

export interface SorBlock {
  type: string;
  revision: number;
  offset: number;
  length: number;
  data: ArrayBuffer;
}

export interface OtdrParser {
  canParse(fileOrBuffer: File | ArrayBuffer | Uint8Array, fileName?: string): boolean;
  parse(buffer: ArrayBuffer, fileName?: string): Promise<OtdrData>;
}

export interface MeasurementDelta {
  distanceDelta: number; // meters
  loss: number; // dB (Power A - Power B)
  attenuation: number; // dB/km
}
