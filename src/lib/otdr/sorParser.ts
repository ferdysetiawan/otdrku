import {
  OtdrData,
  OtdrEvent,
  OtdrMetadata,
  OtdrParser,
  OtdrTrace,
  SorBlock,
} from "@/types/otdr";
import { classifyEventType, detectEventsFromTrace } from "./events";
import { calculateSummary } from "./calculations";

/**
 * Robust binary reader with strict bounds checking
 */
class BinaryReader {
  private view: DataView;
  private buffer: ArrayBuffer;
  public offset: number;

  constructor(buffer: ArrayBuffer, offset = 0) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
    this.offset = offset;
  }

  public get length(): number {
    return this.buffer.byteLength;
  }

  public remaining(): number {
    return Math.max(0, this.length - this.offset);
  }

  public seek(offset: number): void {
    if (offset < 0 || offset > this.length) {
      throw new Error(`Seek offset ${offset} out of bounds [0, ${this.length}]`);
    }
    this.offset = offset;
  }

  public readUint8(): number {
    if (this.offset + 1 > this.length) throw new Error("Unexpected EOF reading uint8");
    const val = this.view.getUint8(this.offset);
    this.offset += 1;
    return val;
  }

  public readUint16(): number {
    if (this.offset + 2 > this.length) throw new Error("Unexpected EOF reading uint16");
    const val = this.view.getUint16(this.offset, true); // Little-endian
    this.offset += 2;
    return val;
  }

  public readInt16(): number {
    if (this.offset + 2 > this.length) throw new Error("Unexpected EOF reading int16");
    const val = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return val;
  }

  public readUint32(): number {
    if (this.offset + 4 > this.length) throw new Error("Unexpected EOF reading uint32");
    const val = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return val;
  }

  public readInt32(): number {
    if (this.offset + 4 > this.length) throw new Error("Unexpected EOF reading int32");
    const val = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return val;
  }

  public readFloat32(): number {
    if (this.offset + 4 > this.length) throw new Error("Unexpected EOF reading float32");
    const val = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return val;
  }

  public readNullTerminatedString(maxLen = 256): string {
    const start = this.offset;
    const end = Math.min(this.length, start + maxLen);
    const bytes: number[] = [];

    while (this.offset < end) {
      const b = this.view.getUint8(this.offset);
      this.offset += 1;
      if (b === 0) break;
      bytes.push(b);
    }

    return String.fromCharCode(...bytes).trim();
  }

  public readFixedString(length: number): string {
    if (this.offset + length > this.length) {
      throw new Error(`Unexpected EOF reading fixed string of length ${length}`);
    }
    const bytes: number[] = [];
    for (let i = 0; i < length; i++) {
      const b = this.view.getUint8(this.offset + i);
      if (b !== 0) bytes.push(b);
    }
    this.offset += length;
    return String.fromCharCode(...bytes).trim();
  }

  public peekString(length: number): string {
    const max = Math.min(this.length, this.offset + length);
    const bytes: number[] = [];
    for (let i = this.offset; i < max; i++) {
      const b = this.view.getUint8(i);
      if (b === 0) break;
      bytes.push(b);
    }
    return String.fromCharCode(...bytes);
  }
}

/**
 * Bellcore / Telcordia SOR Parser (SR-4731 / GR-196)
 * Pure TypeScript implementation without external dependencies.
 */
export class SorParser implements OtdrParser {
  /**
   * A SOR map already carries each block's revision and length.  Most files
   * therefore store only `BlockName\0` followed by the payload.  A few older
   * exporters repeat the revision and size in the block itself.  Treating
   * those fields as mandatory shifted every field by six bytes for standard
   * files (and hid metadata/events), so detect that legacy form explicitly.
   */
  private skipBlockPrefix(reader: BinaryReader, block: SorBlock): boolean {
    if (!reader.peekString(block.type.length + 1).startsWith(block.type)) return false;

    reader.readNullTerminatedString(Math.min(64, block.type.length + 1));
    if (reader.remaining() < 6) return false;

    const start = reader.offset;
    const inlineRevision = new DataView(block.data).getUint16(start, true);
    const inlineLength = new DataView(block.data).getUint32(start + 2, true);
    const hasInlineHeader =
      inlineRevision === block.revision &&
      inlineLength >= 8 &&
      inlineLength <= block.length &&
      Math.abs(inlineLength - block.length) <= 4;

    if (hasInlineHeader) {
      reader.seek(start + 6);
    }
    return hasInlineHeader;
  }
  /**
   * Check if file or buffer is an OTDR SOR file
   */
  public canParse(fileOrBuffer: File | ArrayBuffer | Uint8Array, fileName?: string): boolean {
    const name = fileName || (fileOrBuffer instanceof File ? fileOrBuffer.name : "");
    if (name && (name.toLowerCase().endsWith(".sor") || name.toLowerCase().endsWith(".sor.txt"))) {
      return true;
    }

    // Inspect binary header
    let buffer: ArrayBuffer;
    if (fileOrBuffer instanceof ArrayBuffer) {
      buffer = fileOrBuffer;
    } else if (fileOrBuffer instanceof Uint8Array) {
      buffer = fileOrBuffer.buffer as ArrayBuffer;
    } else if (typeof File !== "undefined" && fileOrBuffer instanceof File) {
      return true; // will inspect during parse
    } else {
      return false;
    }

    if (buffer.byteLength < 16) return false;
    const view = new DataView(buffer);
    const first4 = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );

    return (
      first4.startsWith("Map") ||
      first4.startsWith("Gen") ||
      this.findBlockOffset(buffer, "Map") !== -1 ||
      this.findBlockOffset(buffer, "GenParams") !== -1 ||
      this.findBlockOffset(buffer, "FxdParams") !== -1
    );
  }

  /**
   * Parse SOR ArrayBuffer into structured OtdrData
   */
  public async parse(buffer: ArrayBuffer, fileName = "measurement.sor"): Promise<OtdrData> {
    if (buffer.byteLength < 32) {
      throw new Error("File too small to be a valid Bellcore/Telcordia SOR file (minimum 32 bytes).");
    }

    // 1. Scan and index all blocks
    const blocks = this.indexBlocks(buffer);
    if (blocks.length === 0) {
      throw new Error("No valid SOR data blocks found in file.");
    }

    // 2. Parse metadata from GenParams / GenSpecs & SupParams & FxdParams
    const metadata: OtdrMetadata = {};
    let rangeMeters: number | undefined;
    let sampleSpacingPs: number | undefined;
    let indexRefraction: number = 1.4682;
    let actualWavelength: number | undefined;
    let pulseWidthNs: number | undefined;

    // GenParams
    const genBlock = blocks.find((b) => b.type === "GenParams" || b.type === "GenSpecs");
    if (genBlock) {
      this.parseGenParams(genBlock, metadata);
    }

    // SupParams
    const supBlock = blocks.find((b) => b.type === "SupParams");
    if (supBlock) {
      this.parseSupParams(supBlock, metadata);
    }

    // FxdParams
    const fxdBlock = blocks.find((b) => b.type === "FxdParams");
    if (fxdBlock) {
      const fxdInfo = this.parseFxdParams(fxdBlock, metadata);
      rangeMeters = fxdInfo.range;
      sampleSpacingPs = fxdInfo.sampleSpacing;
      if (fxdInfo.indexRefraction) indexRefraction = fxdInfo.indexRefraction;
      if (fxdInfo.wavelength) actualWavelength = fxdInfo.wavelength;
      if (fxdInfo.pulseWidth) pulseWidthNs = fxdInfo.pulseWidth;
    }

    if (actualWavelength && !metadata.wavelength) {
      metadata.wavelength = actualWavelength;
    }
    if (pulseWidthNs && !metadata.pulseWidth) {
      metadata.pulseWidth = pulseWidthNs;
    }
    if (rangeMeters && !metadata.range) {
      metadata.range = rangeMeters;
    }

    // 3. Parse Trace Data from DataPts
    const dataBlock = blocks.find((b) => b.type === "DataPts");
    if (!dataBlock) {
      throw new Error("Missing required DataPts block: trace data not found in SOR file.");
    }

    const trace = this.parseDataPts(
      dataBlock,
      rangeMeters,
      sampleSpacingPs,
      indexRefraction,
      metadata.wavelength
    );

    // 4. Parse Events from KeyEvents
    let events: OtdrEvent[] = [];
    const keyEventsBlock = blocks.find((b) => b.type === "KeyEvents");
    if (keyEventsBlock) {
      events = this.parseKeyEvents(keyEventsBlock, indexRefraction, sampleSpacingPs, trace.maxDistance);
    }

    // Fallback: If no events found in KeyEvents block, detect automatically from trace
    if (events.length === 0) {
      events = detectEventsFromTrace(trace);
    } else {
      // Some standards-compliant writers leave the optional event-loss field
      // empty. In that case derive it from stable trace samples on both sides
      // of the event, rather than showing a misleading zero loss.
      this.populateMissingEventLosses(events, trace);
    }

    this.calculateCumulativeLoss(events);

    // Calculate Summary
    const summary = calculateSummary(trace, events);
    metadata.fiberLength = summary.fiberLength;

    return {
      fileName,
      metadata,
      trace,
      events,
      summary,
      availableWavelengths: metadata.wavelength ? [metadata.wavelength] : [1310],
      rawBlocks: blocks.map((b) => ({
        type: b.type,
        offset: b.offset,
        length: b.length,
      })),
    };
  }

  /**
   * Search for an ASCII block marker in the buffer starting from an offset
   */
  private findBlockOffset(buffer: ArrayBuffer, blockName: string, fromOffset = 0): number {
    const bytes = new Uint8Array(buffer);
    const target = new TextEncoder().encode(blockName);
    const limit = bytes.length - target.length;

    for (let i = Math.max(0, fromOffset); i <= limit; i++) {
      let match = true;
      for (let j = 0; j < target.length; j++) {
        if (bytes[i + j] !== target[j]) {
          match = false;
          break;
        }
      }
      if (match) return i;
    }
    return -1;
  }

  /**
   * Discovers and indexes all SOR blocks in the file
   */
  private indexBlocks(buffer: ArrayBuffer): SorBlock[] {
    const blocks: SorBlock[] = [];
    const reader = new BinaryReader(buffer);

    // Standard known block names in Telcordia SR-4731 & Bellcore GR-196
    const standardBlocks = [
      "Map",
      "GenParams",
      "GenSpecs",
      "SupParams",
      "FxdParams",
      "DataPts",
      "KeyEvents",
      "Cksum",
      "LnkParams",
      "Special",
    ];

    // Try reading Map block at offset 0
    try {
      const firstStr = reader.peekString(4);
      if (firstStr.startsWith("Map")) {
        reader.readNullTerminatedString(8); // Map\0
        const mapRev = reader.readUint16();
        const mapSize = reader.readUint32();
        const numBlocks = reader.readUint16();

        let currentOffset = mapSize; // blocks usually follow Map block sequentially

        blocks.push({
          type: "Map",
          revision: mapRev,
          offset: 0,
          length: mapSize,
          data: buffer.slice(0, mapSize),
        });

        for (let i = 0; i < numBlocks && reader.offset < mapSize; i++) {
          if (reader.remaining() < 6) break;
          const blockName = reader.readNullTerminatedString(32);
          const blockRev = reader.readUint16();
          const blockSize = reader.readUint32();

          // The Map block defines physical block order. Do not search the
          // entire file: a block name may occur in a comment or payload.
          const blockOffset = currentOffset;

          const blockEnd = Math.min(buffer.byteLength, blockOffset + blockSize);
          blocks.push({
            type: blockName,
            revision: blockRev,
            offset: blockOffset,
            length: blockSize,
            data: buffer.slice(blockOffset, blockEnd),
          });

          currentOffset = blockOffset + blockSize;
        }
      }
    } catch {
      // Map block reading threw, fall back to signature scanning
    }

    // If Map reading failed or found fewer than 3 blocks, scan for standard blocks directly
    if (blocks.length <= 2) {
      blocks.length = 0; // reset
      for (const name of standardBlocks) {
        const offset = this.findBlockOffset(buffer, name);
        if (offset !== -1) {
          try {
            const bReader = new BinaryReader(buffer, offset);
            bReader.readNullTerminatedString(32); // skip name
            const rev = bReader.remaining() >= 2 ? bReader.readUint16() : 100;
            const size = bReader.remaining() >= 4 ? bReader.readUint32() : buffer.byteLength - offset;
            const safeSize = Math.max(8, Math.min(size, buffer.byteLength - offset));

            blocks.push({
              type: name,
              revision: rev,
              offset,
              length: safeSize,
              data: buffer.slice(offset, offset + safeSize),
            });
          } catch {
            // Ignore block parsing errors during scan
          }
        }
      }
    }

    return blocks;
  }

  /**
   * Parse GenParams block for cable & fiber identification
   */
  private parseGenParams(block: SorBlock, metadata: OtdrMetadata): void {
    try {
      const reader = new BinaryReader(block.data);
      // Skip block header if present (name, rev, size)
      const hasInlineHeader = this.skipBlockPrefix(reader, block);

      if (reader.remaining() >= 2) reader.readFixedString(2); // language e.g. "EN"
      if (reader.remaining() > 0) metadata.cableId = reader.readNullTerminatedString() || undefined;
      if (reader.remaining() > 0) metadata.fiberId = reader.readNullTerminatedString() || undefined;
      if (hasInlineHeader && reader.remaining() > 0) {
        // Non-standard legacy exporters stored this as a text field.
        metadata.fiberType = reader.readNullTerminatedString() || undefined;
      } else if (reader.remaining() >= 2) {
        // SR-4731 stores the fiber type as a numeric ITU-T family, e.g. 652.
        const fiberType = reader.readUint16();
        if (fiberType >= 100 && fiberType <= 999) metadata.fiberType = `G.${fiberType}`;
      }
      if (reader.remaining() >= 2) {
        const wl = reader.readUint16();
        if (wl >= 800 && wl <= 2000) metadata.wavelength = wl;
      }
      if (reader.remaining() > 0) metadata.originatingLocation = reader.readNullTerminatedString() || undefined;
      if (reader.remaining() > 0) metadata.terminatingLocation = reader.readNullTerminatedString() || undefined;
      if (reader.remaining() > 0) metadata.cableCode = reader.readNullTerminatedString().trim() || undefined;
      if (reader.remaining() >= 2) reader.readFixedString(2); // current data flag
      if (reader.remaining() >= 4) reader.readInt32(); // user offset
      if (reader.remaining() > 0) metadata.operator = reader.readNullTerminatedString() || undefined;
      if (reader.remaining() > 0) metadata.comments = reader.readNullTerminatedString() || undefined;
    } catch {
      // Gracefully handle partial GenParams
    }
  }

  /**
   * Parse SupParams block for OTDR vendor, model, and serial number
   */
  private parseSupParams(block: SorBlock, metadata: OtdrMetadata): void {
    try {
      const reader = new BinaryReader(block.data);
      this.skipBlockPrefix(reader, block);

      if (reader.remaining() > 0) metadata.vendor = reader.readNullTerminatedString() || undefined;
      if (reader.remaining() > 0) metadata.model = reader.readNullTerminatedString() || undefined;
      if (reader.remaining() > 0) metadata.serialNumber = reader.readNullTerminatedString() || undefined;
    } catch {
      // Gracefully handle partial SupParams
    }
  }

  /**
   * Parse FxdParams block for measurement settings (wavelength, pulse width, IOR, range)
   */
  private parseFxdParams(
    block: SorBlock,
    metadata: OtdrMetadata
  ): {
    range?: number;
    sampleSpacing?: number;
    indexRefraction?: number;
    wavelength?: number;
    pulseWidth?: number;
  } {
    const result: {
      range?: number;
      sampleSpacing?: number;
      indexRefraction?: number;
      wavelength?: number;
      pulseWidth?: number;
    } = {};

    try {
      const reader = new BinaryReader(block.data);
      this.skipBlockPrefix(reader, block);

      // Date / Time (uint32 Unix timestamp)
      if (reader.remaining() >= 4) {
        const timestamp = reader.readUint32();
        if (timestamp > 315532800 && timestamp < 2524608000) {
          // between 1980 and 2050
          const dateObj = new Date(timestamp * 1000);
          metadata.date = dateObj.toISOString().split("T")[0];
          metadata.time = dateObj.toISOString().split("T")[1]?.slice(0, 8);
        }
      }

      // Distance unit (2 chars)
      if (reader.remaining() >= 2) {
        reader.readFixedString(2);
      }

      // Actual Wavelength (uint16 in tenths of nm or nm)
      if (reader.remaining() >= 2) {
        let wl = reader.readUint16();
        if (wl > 2000) wl = Math.round(wl / 10);
        if (wl >= 800 && wl <= 2000) {
          result.wavelength = wl;
        }
      }

      // Acquisition offset & distance offset
      if (reader.remaining() >= 4) reader.readInt32();
      if (reader.remaining() >= 4) reader.readInt32();

      // Number of pulse widths
      let numPulseWidths = 1;
      if (reader.remaining() >= 2) {
        numPulseWidths = Math.max(1, Math.min(10, reader.readUint16()));
      }

      // Pulse width (in ns)
      if (reader.remaining() >= 2) {
        result.pulseWidth = reader.readUint16();
        // Skip remaining pulse widths if any
        for (let i = 1; i < numPulseWidths && reader.remaining() >= 2; i++) {
          reader.readUint16();
        }
      }

      // Sample spacing (in picoseconds 1e-12 s or scaled)
      if (reader.remaining() >= 4) {
        result.sampleSpacing = reader.readUint32();
      }

      // Number of data points in acquisition
      if (reader.remaining() >= 4) {
        reader.readUint32();
      }

      // Index of Refraction (Group Index, scaled by 10^5, e.g. 146820 -> 1.46820)
      if (reader.remaining() >= 4) {
        const rawIor = reader.readUint32();
        if (rawIor > 100000) {
          result.indexRefraction = rawIor / 100000;
        } else if (rawIor > 1000) {
          result.indexRefraction = rawIor / 1000;
        } else if (rawIor > 1) {
          result.indexRefraction = rawIor;
        }
        metadata.refractiveIndex = result.indexRefraction;
      }

      // Backscatter coefficient (int16, scaled by 10, e.g. -790 -> -79.0 dB)
      if (reader.remaining() >= 2) {
        const rawBc = reader.readInt16();
        const bc = rawBc < 0 && rawBc > -1500 ? rawBc / 10 : -79.0;
        metadata.backscatterCoefficient = bc;
      }

      // Number of averages
      if (reader.remaining() >= 4) {
        reader.readUint32();
      }

      // Averaging time (uint16, in tenths of seconds or seconds)
      if (reader.remaining() >= 2) {
        const avgTime = reader.readUint16();
        metadata.averagingTime = avgTime > 600 ? Math.round(avgTime / 10) : avgTime;
      }

      // Range (uint32, meters)
      if (reader.remaining() >= 4) {
        const rawRange = reader.readUint32();
        if (rawRange > 0 && rawRange < 5000000) {
          result.range = rawRange > 1000000 ? Math.round(rawRange / 1000) : rawRange;

          // Certain VGR/VanGuard writers retain an internal acquisition
          // value here and store the displayed range in the following field.
          // Prefer that explicit, plausible range (e.g. 50,000 m) instead of
          // rendering a file named/tested as 50 km as 2.452 km.
          if (rawRange > 1000000 && reader.remaining() >= 4) {
            const displayedRange = reader.readUint32();
            if (displayedRange >= 100 && displayedRange <= 5000000) {
              result.range = displayedRange;
            }
          }
        }
      }
    } catch {
      // Gracefully handle partial FxdParams
    }

    return result;
  }

  /**
   * Parse DataPts block: extracts Float64Array distance and Float32Array power values
   */
  private parseDataPts(
    block: SorBlock,
    rangeMeters?: number,
    sampleSpacingPs?: number,
    indexRefraction = 1.4682,
    wavelength = 1310
  ): OtdrTrace {
    const reader = new BinaryReader(block.data);
    this.skipBlockPrefix(reader, block);

    if (reader.remaining() < 12) {
      throw new Error("Invalid DataPts block: insufficient data for trace points header.");
    }

    const totalPoints = reader.readUint32();
    reader.readUint16(); // numTraces (1)
    const pointsInTrace = reader.readUint32();
    const scalingFactor = reader.readUint16() || 1000;

    const count = Math.min(pointsInTrace || totalPoints, Math.floor(reader.remaining() / 2));
    if (count <= 0) {
      throw new Error("DataPts block contains 0 trace points.");
    }

    // Allocate TypedArrays for memory efficiency & performance (Section 24)
    const distance = new Float64Array(count);
    const power = new Float32Array(count);

    // Calculate distance step:
    // Speed of light in vacuum: c = 299,792,458 m/s
    // v = c / IOR
    // Round-trip distance per second = v / 2
    const c = 299792458;
    let stepMeters = 1.0;

    // Range / point count is the reliable display spacing.  Some vendors put
    // an acquisition-clock value in the spacing field, which otherwise makes
    // a 50 km trace appear thousands of kilometres long.
    if (rangeMeters && rangeMeters > 0 && count > 1) {
      stepMeters = rangeMeters / (count - 1);
    } else if (sampleSpacingPs && sampleSpacingPs > 0) {
      // Sample spacing in picoseconds (1e-12 s)
      const stepFromPs = (c * (sampleSpacingPs * 1e-12)) / (2 * indexRefraction);
      if (stepFromPs > 0.001 && stepFromPs < 500) {
        stepMeters = stepFromPs;
      }
    } else {
      // Default: typical 0.5m - 1m per point
      stepMeters = 0.5;
    }

    let minP = Infinity;
    let maxP = -Infinity;

    for (let i = 0; i < count; i++) {
      const rawVal = reader.readUint16();

      // Convert raw value to dBm:
      // In Bellcore SR-4731, power is -rawVal * scalingFactor * 1e-6 (in dB)
      let pDb = -(rawVal * scalingFactor * 1e-6);

      // Sanity check: optical backscatter typically falls between 0 and -60 dBm
      if (pDb < -80 || pDb > 20) {
        // Fallback for non-standard scaled integer
        pDb = -(rawVal * 0.001);
      }

      distance[i] = i * stepMeters;
      power[i] = pDb;

      if (pDb < minP) minP = pDb;
      if (pDb > maxP) maxP = pDb;
    }

    const minDistance = distance[0];
    const maxDistance = distance[count - 1];

    return {
      distance,
      power,
      distanceUnit: "m",
      powerUnit: "dBm",
      minDistance,
      maxDistance,
      minPower: Math.round(minP * 100) / 100,
      maxPower: Math.round(maxP * 100) / 100,
      wavelength,
    };
  }

  /**
   * Parse KeyEvents block: extracts event list (splices, connectors, end of fiber)
   */
  private parseKeyEvents(
    block: SorBlock,
    indexRefraction: number,
    sampleSpacingPs?: number,
    maxDistanceMeters = 1000
  ): OtdrEvent[] {
    const events: OtdrEvent[] = [];
    try {
      const reader = new BinaryReader(block.data);
      const hasInlineHeader = this.skipBlockPrefix(reader, block);

      if (reader.remaining() < 2) return [];
      const numEvents = reader.readUint16();

      const bytes = new Uint8Array(block.data);
      const findNextEvent = (from: number, expectedId: number): number => {
        // The tail of an event varies between SOR revisions (marker fields
        // may be omitted). Locate the next numbered record instead of using
        // one fixed skip length, which was the reason later events vanished.
        for (let offset = from; offset + 20 <= bytes.length; offset++) {
          const candidate = bytes[offset] | (bytes[offset + 1] << 8);
          if (candidate !== expectedId) continue;
          let codeLooksTextual = true;
          for (let j = 14; j < 20; j++) {
            const value = bytes[offset + j];
            if (value !== 0 && (value < 0x20 || value > 0x7e)) {
              codeLooksTextual = false;
              break;
            }
          }
          if (codeLooksTextual) return offset;
        }
        return bytes.length;
      };

      const commentFrom = (from: number, to: number): string | undefined => {
        let best = "";
        let current = "";
        for (let offset = from; offset < to; offset++) {
          const value = bytes[offset];
          if (value >= 0x20 && value <= 0x7e) current += String.fromCharCode(value);
          else {
            if (current.trim().length > best.length) best = current.trim();
            current = "";
          }
        }
        if (current.trim().length > best.length) best = current.trim();
        return best || undefined;
      };

      for (let i = 0; i < numEvents; i++) {
        if (reader.remaining() < 20) break;

        const eventNum = reader.readUint16();
        const rawTimeOrDist = reader.readUint32(); // propagation time or sample count or distance
        const slope = reader.readInt16(); // 1e-3 dB/km
        const spliceLoss = reader.readInt16(); // 1e-3 dB
        const reflectance = reader.readInt32(); // 1e-3 dB
        const eventCode = reader.readFixedString(6);

        const tailStart = reader.offset;
        let comment: string | undefined;
        if (hasInlineHeader) {
          // Legacy inline-header writers consistently use five markers.
          reader.seek(Math.min(bytes.length, tailStart + 20));
          comment = reader.remaining() > 0
            ? reader.readNullTerminatedString(256) || undefined
            : undefined;
        } else {
          const nextOffset = i === numEvents - 1
            ? bytes.length
            : findNextEvent(tailStart, eventNum + 1);
          comment = commentFrom(tailStart, nextOffset);
          reader.seek(nextOffset);
        }

        // Calculate distance in meters
        let eventDistanceMeters = 0;
        const c = 299792458;
        if (hasInlineHeader && sampleSpacingPs && sampleSpacingPs > 0) {
          const stepM = (c * (sampleSpacingPs * 1e-12)) / (2 * indexRefraction);
          eventDistanceMeters = rawTimeOrDist * stepM;
        } else {
          // Standard KeyEvents locations are one-way propagation times in
          // 100 ps units, not data-point indexes.
          eventDistanceMeters = (c * (rawTimeOrDist * 1e-10)) / (2 * indexRefraction);
        }

        // Validate distance bounds
        if (eventDistanceMeters > maxDistanceMeters * 1.5 || eventDistanceMeters < 0) {
          // rawTimeOrDist was likely direct distance in mm or cm
          eventDistanceMeters = rawTimeOrDist / 1000;
        }

        const lossDb = spliceLoss !== 0 ? spliceLoss / 1000 : undefined;
        // Standard files commonly encode reflectance as a positive magnitude
        // (40000 means -40.0 dB); legacy files use a signed value.
        const reflDb = reflectance !== 0
          ? (reflectance > 0 ? -reflectance / 1000 : reflectance / 1000)
          : undefined;
        const attenDb = slope !== 0 ? slope / 1000 : undefined;

        const isFirst = i === 0;
        const isLast = i === numEvents - 1;
        const eventType = classifyEventType(
          `${eventCode} ${comment || ""}`,
          lossDb,
          reflDb,
          isFirst,
          isLast
        );

        events.push({
          // Some SOR writers repeat or omit the event number. Use the record
          // position as the application ID so selections and React keys are
          // always unique within one trace.
          id: i + 1,
          distance: Math.max(0, eventDistanceMeters),
          type: eventType,
          loss: lossDb !== undefined ? Math.round(lossDb * 100) / 100 : undefined,
          reflectance: reflDb !== undefined ? Math.round(reflDb * 10) / 10 : undefined,
          attenuation: attenDb !== undefined ? Math.round(attenDb * 100) / 100 : undefined,
          comment,
        });
      }

    } catch {
      // Gracefully handle partial KeyEvents block
    }

    return events;
  }

  /** Estimate only missing event losses from the measured trace. */
  private populateMissingEventLosses(events: OtdrEvent[], trace: OtdrTrace): void {
    const distances = trace.distance;
    const powers = trace.power;
    if (distances.length < 20) return;

    const pointStep = Math.max(0.001, (trace.maxDistance - trace.minDistance) / (distances.length - 1));
    const window = Math.max(3, Math.min(500, Math.round(15 / pointStep)));
    const median = (values: number[]): number | undefined => {
      if (values.length === 0) return undefined;
      values.sort((a, b) => a - b);
      const middle = Math.floor(values.length / 2);
      return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
    };

    for (const event of events) {
      if (event.loss !== undefined || event.type === "Launch" || event.type === "End") continue;

      let low = 0;
      let high = distances.length - 1;
      while (low < high) {
        const mid = (low + high) >> 1;
        if (distances[mid] < event.distance) low = mid + 1;
        else high = mid;
      }
      const index = low;
      const before = Array.from<number>(
        powers.slice(Math.max(0, index - window * 3), Math.max(0, index - window))
      );
      const after = Array.from<number>(
        powers.slice(Math.min(powers.length, index + window), Math.min(powers.length, index + window * 3))
      );
      const beforePower = median(before);
      const afterPower = median(after);
      if (beforePower === undefined || afterPower === undefined) continue;

      // Remove the normal fiber slope between the centers of both windows.
      const spanKm = (window * 4 * pointStep) / 1000;
      const slopeCorrection = (event.attenuation ?? 0) * spanKm;
      const loss = beforePower - afterPower - slopeCorrection;
      if (Math.abs(loss) >= 0.005 && Math.abs(loss) <= 20) {
        event.loss = Math.round(loss * 100) / 100;
      }
    }
  }

  /**
   * Cumulative loss is link loss, not merely a sum of discrete splice loss.
   * Include attenuation over each event-to-event fiber segment and then add
   * the measured event loss when the writer provides (or trace yields) one.
   */
  private calculateCumulativeLoss(events: OtdrEvent[]): void {
    let cumulativeLoss = 0;
    let previousDistance = 0;
    let previousAttenuation: number | undefined;

    for (const event of events) {
      const cumulativeBeforeSegment = cumulativeLoss;
      const segmentMeters = Math.max(0, event.distance - previousDistance);
      const attenuation = event.attenuation ?? previousAttenuation ?? 0;
      cumulativeLoss += attenuation * (segmentMeters / 1000);
      if (event.loss !== undefined) cumulativeLoss += event.loss;
      event.segmentLoss = Math.round((cumulativeLoss - cumulativeBeforeSegment) * 100) / 100;
      event.cumulativeLoss = Math.round(cumulativeLoss * 100) / 100;
      previousDistance = Math.max(previousDistance, event.distance);
      if (event.attenuation !== undefined) previousAttenuation = event.attenuation;
    }
  }
}
