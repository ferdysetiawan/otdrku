/**
 * Generates an authentic Bellcore/Telcordia SR-4731 binary SOR file.
 * Used for Demo Mode and Unit Testing.
 */
export function generateSyntheticSor(wavelength = 1310): ArrayBuffer {
  // We will construct blocks:
  // 1. Map
  // 2. GenParams
  // 3. SupParams
  // 4. FxdParams
  // 5. DataPts
  // 6. KeyEvents
  // 7. Cksum

  // Helper to append strings with null terminator
  function writeString(view: Uint8Array, offset: number, str: string): number {
    for (let i = 0; i < str.length; i++) {
      view[offset + i] = str.charCodeAt(i);
    }
    view[offset + str.length] = 0; // null terminator
    return offset + str.length + 1;
  }

  // Generate trace curve points:
  // 3000 points representing a 3 km fiber link (1m per sample)
  // Slope: approx 0.35 dB/km for 1310nm, 0.20 dB/km for 1550nm
  // Event 1: Launch connector at 0m (Fresnel peak)
  // Event 2: Splice at 850m (0.08 dB drop)
  // Event 3: Connector at 1800m (reflection peak + 0.25 dB drop)
  // Event 4: End of fiber at 2500m (large reflection peak + drop into noise floor)
  const numPoints = 3000;
  const rawPoints = new Uint16Array(numPoints);
  const fiberSlopePerMeter = wavelength === 1550 ? 0.0002 : 0.00035; // dB/m

  let currentLoss = 3.2; // Initial insertion loss (start around -3.2 dBm)

  for (let i = 0; i < numPoints; i++) {
    const dist = i; // 1 meter per point

    // Event 1: Launch reflection peak at start (0-15m)
    if (dist <= 15) {
      const peak = Math.sin((dist / 15) * Math.PI) * 12.0;
      currentLoss = 3.2 - peak;
    } else if (dist > 15 && dist <= 20) {
      currentLoss = 3.2;
    } else if (dist < 850) {
      currentLoss += fiberSlopePerMeter;
    } else if (dist === 850) {
      currentLoss += 0.08; // Splice drop
    } else if (dist > 850 && dist < 1800) {
      currentLoss += fiberSlopePerMeter;
    } else if (dist >= 1800 && dist <= 1820) {
      // Connector reflection peak
      const peak = Math.sin(((dist - 1800) / 20) * Math.PI) * 9.5;
      currentLoss = 3.2 + (dist - 1800) * fiberSlopePerMeter + 0.08 - peak;
    } else if (dist > 1820 && dist < 2500) {
      currentLoss = 3.2 + 0.08 + 0.25 + (dist * fiberSlopePerMeter);
    } else if (dist >= 2500 && dist <= 2530) {
      // End of fiber reflection peak
      const peak = Math.sin(((dist - 2500) / 30) * Math.PI) * 18.0;
      currentLoss = 3.2 + 0.08 + 0.25 + (2500 * fiberSlopePerMeter) - peak;
    } else {
      // Beyond end of fiber: Rayleigh noise floor around -38 dBm
      const noise = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      currentLoss = 38.0 + noise * 1.5;
    }

    // Add tiny realistic measurement noise
    const jitter = ((i * 37) % 10 - 5) * 0.004;
    const finalDb = Math.max(0.1, currentLoss + jitter);

    // In Bellcore SOR: rawValue = finalDb * 1000
    rawPoints[i] = Math.min(65535, Math.max(0, Math.round(finalDb * 1000)));
  }

  // Build GenParams Block Buffer
  const genBuf = new ArrayBuffer(256);
  const genView = new DataView(genBuf);
  const genBytes = new Uint8Array(genBuf);
  let gOff = 0;
  gOff = writeString(genBytes, gOff, "GenParams");
  genView.setUint16(gOff, 200, true); gOff += 2; // rev
  const genSizeOff = gOff; gOff += 4; // placeholder for size
  genBytes[gOff++] = 0x45; genBytes[gOff++] = 0x4E; // "EN"
  gOff = writeString(genBytes, gOff, "CABLE-OPT-01");
  gOff = writeString(genBytes, gOff, "FIBER-CORE-12");
  gOff = writeString(genBytes, gOff, "G.652.D");
  genView.setUint16(gOff, wavelength, true); gOff += 2;
  gOff = writeString(genBytes, gOff, "Central Office A");
  gOff = writeString(genBytes, gOff, "Distribution Point B");
  gOff = writeString(genBytes, gOff, "Standard SMF");
  genBytes[gOff++] = 0x30; genBytes[gOff++] = 0x30; // "00"
  genView.setInt32(gOff, 0, true); gOff += 4; // user offset
  gOff = writeString(genBytes, gOff, "Field Engineer");
  gOff = writeString(genBytes, gOff, "Periodic routine inspection");
  genView.setUint32(genSizeOff, gOff, true);
  const actualGenBuf = genBuf.slice(0, gOff);

  // Build SupParams Block Buffer
  const supBuf = new ArrayBuffer(256);
  const supView = new DataView(supBuf);
  const supBytes = new Uint8Array(supBuf);
  let sOff = 0;
  sOff = writeString(supBytes, sOff, "SupParams");
  supView.setUint16(sOff, 200, true); sOff += 2;
  const supSizeOff = sOff; sOff += 4;
  sOff = writeString(supBytes, sOff, "EXFO Inc.");
  sOff = writeString(supBytes, sOff, "FTB-720C");
  sOff = writeString(supBytes, sOff, "SN-982410-X");
  sOff = writeString(supBytes, sOff, "MOD-SM1");
  sOff = writeString(supBytes, sOff, "MOD-SN-4412");
  sOff = writeString(supBytes, sOff, "v3.18.2");
  sOff = writeString(supBytes, sOff, "Calibrated 2026");
  supView.setUint32(supSizeOff, sOff, true);
  const actualSupBuf = supBuf.slice(0, sOff);

  // Build FxdParams Block Buffer
  const fxdBuf = new ArrayBuffer(256);
  const fxdView = new DataView(fxdBuf);
  const fxdBytes = new Uint8Array(fxdBuf);
  let fOff = 0;
  fOff = writeString(fxdBytes, fOff, "FxdParams");
  fxdView.setUint16(fOff, 200, true); fOff += 2;
  const fxdSizeOff = fOff; fOff += 4;
  // Date time: Unix timestamp for 2026-09-18
  fxdView.setUint32(fOff, 1789718400, true); fOff += 4;
  fxdBytes[fOff++] = 0x6B; fxdBytes[fOff++] = 0x6D; // "km"
  fxdView.setUint16(fOff, wavelength * 10, true); fOff += 2; // actual wavelength in tenths of nm
  fxdView.setInt32(fOff, 0, true); fOff += 4; // acquisition offset
  fxdView.setInt32(fOff, 0, true); fOff += 4; // acquisition offset distance
  fxdView.setUint16(fOff, 1, true); fOff += 2; // 1 pulse width
  fxdView.setUint16(fOff, 30, true); fOff += 2; // 30 ns
  // Sample spacing in picoseconds: for 1.0m spacing with IOR 1.4682:
  // spacing = 2 * 1.0 * 1.4682 / (c * 1e-12) ~ 9794 ps
  fxdView.setUint32(fOff, 9794, true); fOff += 4;
  fxdView.setUint32(fOff, numPoints, true); fOff += 4; // data points
  fxdView.setUint32(fOff, 146820, true); fOff += 4; // IOR 1.46820 * 100000
  fxdView.setInt16(fOff, -790, true); fOff += 2; // -79.0 dB backscatter
  fxdView.setUint32(fOff, 2000, true); fOff += 4; // averages
  fxdView.setUint16(fOff, 30, true); fOff += 2; // 30 seconds
  fxdView.setUint32(fOff, 3000, true); fOff += 4; // 3000 meters range
  fxdView.setUint32(fxdSizeOff, fOff, true);
  const actualFxdBuf = fxdBuf.slice(0, fOff);

  // Build DataPts Block Buffer
  // "DataPts\0" (8) + rev (2) + size (4) + totalPts(4) + numTraces(2) + ptsInTrace(4) + scale(2) = 26 bytes
  const dataSize = 64 + numPoints * 2;
  const dataBuf = new ArrayBuffer(dataSize);
  const dataView = new DataView(dataBuf);
  const dataBytes = new Uint8Array(dataBuf);
  let dOff = 0;
  dOff = writeString(dataBytes, dOff, "DataPts");
  dataView.setUint16(dOff, 200, true); dOff += 2;
  const dataSizeOff = dOff; dOff += 4;
  dataView.setUint32(dOff, numPoints, true); dOff += 4;
  dataView.setUint16(dOff, 1, true); dOff += 2; // 1 trace
  dataView.setUint32(dOff, numPoints, true); dOff += 4;
  dataView.setUint16(dOff, 1000, true); dOff += 2; // scaling factor 1000

  // Copy raw points
  for (let i = 0; i < numPoints; i++) {
    dataView.setUint16(dOff, rawPoints[i], true);
    dOff += 2;
  }
  dataView.setUint32(dataSizeOff, dOff, true); // actual size
  const actualDataBuf = dataBuf.slice(0, dOff);

  // Build KeyEvents Block Buffer
  // 4 events: Launch (0m), Splice (850m), Connector (1800m), End (2500m)
  const keyEventsBuf = new ArrayBuffer(512);
  const keyView = new DataView(keyEventsBuf);
  const keyBytes = new Uint8Array(keyEventsBuf);
  let kOff = 0;
  kOff = writeString(keyBytes, kOff, "KeyEvents");
  keyView.setUint16(kOff, 200, true); kOff += 2;
  const keySizeOff = kOff; kOff += 4;
  keyView.setUint16(kOff, 4, true); kOff += 2; // 4 events

  // Helper for event:
  // sample index = distance in meters
  const addEvent = (
    num: number,
    sampleIdx: number,
    slope: number,
    spliceLoss: number,
    reflectance: number,
    code: string,
    comment: string
  ) => {
    keyView.setUint16(kOff, num, true); kOff += 2;
    keyView.setUint32(kOff, sampleIdx, true); kOff += 4;
    keyView.setInt16(kOff, slope, true); kOff += 2;
    keyView.setInt16(kOff, spliceLoss, true); kOff += 2;
    keyView.setInt32(kOff, reflectance, true); kOff += 4;
    // 6 chars event code
    for (let c = 0; c < 6; c++) {
      keyBytes[kOff++] = c < code.length ? code.charCodeAt(c) : 0x20;
    }
    // 5 markers (5 * 4 = 20 bytes)
    for (let m = 0; m < 5; m++) {
      keyView.setUint32(kOff, sampleIdx, true); kOff += 4;
    }
    kOff = writeString(keyBytes, kOff, comment);
  };

  addEvent(1, 0, 350, 0, -42500, "0E0E  ", "Launch panel connector");
  addEvent(2, 850, 340, 80, 0, "1F00  ", "Fusion splice 1");
  addEvent(3, 1800, 350, 250, -45200, "0E0E  ", "Distribution connector");
  addEvent(4, 2500, 0, 0, -18200, "9F00  ", "End of optical fiber link");

  keyView.setUint32(keySizeOff, kOff, true);
  const actualKeyBuf = keyEventsBuf.slice(0, kOff);

  // Build Map Block
  // Blocks to register: GenParams, SupParams, FxdParams, DataPts, KeyEvents
  const blockList = [
    { name: "GenParams", rev: 200, size: actualGenBuf.byteLength, buf: actualGenBuf },
    { name: "SupParams", rev: 200, size: actualSupBuf.byteLength, buf: actualSupBuf },
    { name: "FxdParams", rev: 200, size: actualFxdBuf.byteLength, buf: actualFxdBuf },
    { name: "DataPts", rev: 200, size: actualDataBuf.byteLength, buf: actualDataBuf },
    { name: "KeyEvents", rev: 200, size: actualKeyBuf.byteLength, buf: actualKeyBuf },
  ];

  const mapBuf = new ArrayBuffer(256);
  const mapView = new DataView(mapBuf);
  const mapBytes = new Uint8Array(mapBuf);
  let mOff = 0;
  mOff = writeString(mapBytes, mOff, "Map");
  mapView.setUint16(mOff, 200, true); mOff += 2;
  const mapSizeOff = mOff; mOff += 4;
  mapView.setUint16(mOff, blockList.length, true); mOff += 2;

  for (const b of blockList) {
    mOff = writeString(mapBytes, mOff, b.name);
    mapView.setUint16(mOff, b.rev, true); mOff += 2;
    mapView.setUint32(mOff, b.size, true); mOff += 4;
  }
  mapView.setUint32(mapSizeOff, mOff, true);
  const actualMapBuf = mapBuf.slice(0, mOff);

  // Total File Size
  const totalFileSize =
    actualMapBuf.byteLength +
    actualGenBuf.byteLength +
    actualSupBuf.byteLength +
    actualFxdBuf.byteLength +
    actualDataBuf.byteLength +
    actualKeyBuf.byteLength;

  const totalBuffer = new ArrayBuffer(totalFileSize);
  const totalBytes = new Uint8Array(totalBuffer);

  let currentPos = 0;
  const copyBuffer = (src: ArrayBuffer) => {
    totalBytes.set(new Uint8Array(src), currentPos);
    currentPos += src.byteLength;
  };

  copyBuffer(actualMapBuf);
  copyBuffer(actualGenBuf);
  copyBuffer(actualSupBuf);
  copyBuffer(actualFxdBuf);
  copyBuffer(actualDataBuf);
  copyBuffer(actualKeyBuf);

  return totalBuffer;
}
