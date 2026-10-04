import { describe, it, expect } from "vitest";
import {
  calculateAttenuation,
  calculateDistanceDiff,
  calculateLoss,
  calculateMarkerDelta,
  calculateSummary,
} from "../src/lib/otdr/calculations";
import { SorParser } from "../src/lib/otdr/sorParser";
import { generateSyntheticSor } from "../src/lib/otdr/sorGenerator";
import { classifyEventType, detectEventsFromTrace } from "../src/lib/otdr/events";
import { OtdrMarker, OtdrTrace } from "../src/types/otdr";

describe("OTDR Calculations (Section 34)", () => {
  it("calculates two-point attenuation matching ins.md specification", () => {
    // Section 34 specification: expect(calculateAttenuation(1.5, 0.5, 2)).toBeCloseTo(0.5);
    expect(calculateAttenuation(1.5, 0.5, 2)).toBeCloseTo(0.5);
  });

  it("calculates attenuation from loss and distance", () => {
    // 0.7 dB loss over 2.0 km = 0.35 dB/km
    expect(calculateAttenuation(0.7, 2.0)).toBeCloseTo(0.35);
  });

  it("handles division by zero distance gracefully", () => {
    expect(calculateAttenuation(1.5, 0.5, 0)).toBe(0);
    expect(calculateAttenuation(0.5, 0)).toBe(0);
  });

  it("calculates distance difference accurately", () => {
    expect(calculateDistanceDiff(1200, 2500)).toBe(1300);
    expect(calculateDistanceDiff(3000, 1000)).toBe(2000);
  });

  it("calculates optical loss correctly", () => {
    expect(calculateLoss(-5.0, -8.5)).toBeCloseTo(3.5);
  });

  it("calculates marker delta between Marker A and Marker B", () => {
    const markerA: OtdrMarker = {
      id: "A",
      name: "Marker A",
      distance: 1000, // 1 km
      power: -5.0,
    };
    const markerB: OtdrMarker = {
      id: "B",
      name: "Marker B",
      distance: 3000, // 3 km
      power: -5.7,
    };

    const delta = calculateMarkerDelta(markerA, markerB);
    expect(delta.distanceDelta).toBe(2000); // 2 km
    expect(delta.loss).toBeCloseTo(0.7); // -5.0 - (-5.7) = 0.7 dB
    expect(delta.attenuation).toBeCloseTo(0.35); // 0.7 / 2 = 0.35 dB/km
  });
});

describe("SOR Binary Parser (Section 33 & 46)", () => {
  const parser = new SorParser();

  it("parses authentic Bellcore/Telcordia SR-4731 binary file", async () => {
    const buffer = generateSyntheticSor(1310);
    expect(buffer.byteLength).toBeGreaterThan(1000);

    const data = await parser.parse(buffer, "test_1310.sor");

    expect(data.fileName).toBe("test_1310.sor");
    expect(data.metadata.vendor).toBe("EXFO Inc.");
    expect(data.metadata.model).toBe("FTB-720C");
    expect(data.metadata.serialNumber).toBe("SN-982410-X");
    expect(data.metadata.wavelength).toBe(1310);
    expect(data.metadata.pulseWidth).toBe(30);
    expect(data.metadata.refractiveIndex).toBeCloseTo(1.4682);
    expect(data.metadata.backscatterCoefficient).toBe(-79.0);
    expect(data.metadata.cableId).toBe("CABLE-OPT-01");
    expect(data.metadata.fiberId).toBe("FIBER-CORE-12");

    // Trace checks
    expect(data.trace.distance.length).toBe(3000);
    expect(data.trace.power.length).toBe(3000);
    expect(data.trace.maxDistance).toBeGreaterThanOrEqual(2500);
    expect(data.trace.powerUnit).toBe("dBm");

    // Events check
    expect(data.events.length).toBe(4);
    expect(data.events[0].type).toBe("Launch");
    expect(data.events[1].type).toBe("Splice");
    expect(data.events[2].type).toBe("Connector");
    expect(data.events[3].type).toBe("End");

    // Summary checks
    expect(data.summary).toBeDefined();
    expect(data.summary?.eventCount).toBe(4);
    expect(data.summary?.reflectiveCount).toBeGreaterThanOrEqual(2);
    expect(data.summary?.totalLoss).toBeGreaterThan(0);
  });

  it("rejects corrupted and too-small files gracefully", async () => {
    const emptyBuffer = new ArrayBuffer(10);
    await expect(parser.parse(emptyBuffer)).rejects.toThrow();

    const randomBuffer = new ArrayBuffer(100);
    await expect(parser.parse(randomBuffer)).rejects.toThrow();
  });
});

describe("Event Detection & Classification", () => {
  it("classifies event codes properly", () => {
    expect(classifyEventType("0E0E", 0.25, -45, false, false)).toBe("Connector");
    expect(classifyEventType("1F00", 0.08, undefined, false, false)).toBe("Splice");
    expect(classifyEventType("9F00", 0, -18, false, true)).toBe("End");
    expect(classifyEventType("0000", undefined, undefined, true, false)).toBe("Launch");
  });

  it("automatically detects events from trace curve when KeyEvents missing", () => {
    const numPoints = 1000;
    const distance = new Float64Array(numPoints);
    const power = new Float32Array(numPoints);

    for (let i = 0; i < numPoints; i++) {
      distance[i] = i * 2;
      let p = -5.0 - (i * 0.001);
      if (i > 300) p -= 0.15; // Splice at index 300
      if (i === 600) p += 5.0; // Peak
      if (i > 600) p -= 0.25; // Connector drop
      if (i > 800) p = -45.0; // Noise floor
      power[i] = p;
    }

    const mockTrace: OtdrTrace = {
      distance,
      power,
      distanceUnit: "m",
      powerUnit: "dBm",
      minDistance: 0,
      maxDistance: 1998,
      minPower: -45,
      maxPower: 0,
    };

    const detectedEvents = detectEventsFromTrace(mockTrace);
    expect(detectedEvents.length).toBeGreaterThanOrEqual(2);
    expect(detectedEvents[0].type).toBe("Launch");
  });
});
