import { OtdrEvent, OtdrEventType, OtdrTrace } from "@/types/otdr";

/**
 * Parses event code from Bellcore/Telcordia standard
 * Format typically like "0E0E", "1E00", "0F00", etc.
 * Or determines event type from optical characteristics: loss, reflectance, position.
 */
export function classifyEventType(
  eventCode: string,
  loss?: number,
  reflectance?: number,
  isFirst?: boolean,
  isLast?: boolean
): OtdrEventType {
  const code = (eventCode || "").trim().toUpperCase();

  if (isFirst) {
    return "Launch";
  }

  if (isLast) {
    return "End";
  }

  // Bellcore event codes:
  // First digit/letter:
  // '0' or '1': non-reflective / reflective
  // '9' or 'E': end of fiber
  if (code.includes("END") || code.startsWith("9") || code.startsWith("E")) {
    return "End";
  }

  if (code.includes("CONN") || (reflectance !== undefined && reflectance < 0 && reflectance > -70)) {
    if (loss !== undefined && loss > 0.01) {
      return "Connector";
    }
    return "Reflective";
  }

  if (code.includes("SPLICE") || (loss !== undefined && loss > 0.01 && (reflectance === undefined || reflectance <= -70))) {
    return "Splice";
  }

  if (code.includes("GAIN")) {
    return "Gainer";
  }

  if (loss !== undefined && loss < -0.01) {
    return "Gainer";
  }

  if (reflectance !== undefined && reflectance < 0) {
    return "Reflective";
  }

  if (loss !== undefined && loss > 0) {
    return "Non-reflective";
  }

  return "Unknown";
}

/**
 * Automatic event detection algorithm (Section 10 of ins.md)
 * Used when KeyEvents block is missing or empty.
 * Analyzes the trace derivative and spikes to detect:
 * - Launch event
 * - Reflective events (reflection peak followed by drop)
 * - Non-reflective splices (downward step in backscatter)
 * - Gainers (upward step)
 * - End of fiber (final major reflection or drop into noise floor)
 */
export function detectEventsFromTrace(trace: OtdrTrace): OtdrEvent[] {
  const distances = trace.distance;
  const powers = trace.power;
  const n = powers.length;

  if (n < 20) {
    return [];
  }

  const events: OtdrEvent[] = [];
  let eventId = 1;

  // 1. Launch Event at origin
  events.push({
    id: eventId++,
    distance: distances[0],
    type: "Launch",
    loss: undefined,
    reflectance: undefined,
    comment: "Launch cable / Front panel connection",
  });

  // Moving average / baseline smoothing to compute local slopes and detect steps
  const windowSize = Math.max(5, Math.floor(n / 200));
  const diffs: number[] = [];

  for (let i = windowSize; i < n - windowSize; i++) {
    const pPrev = powers[i - windowSize];
    const pNext = powers[i + windowSize];
    diffs.push(pPrev - pNext); // positive means drop
  }

  // Find noise floor (average of last 5% of points)
  const lastSegmentCount = Math.max(10, Math.floor(n * 0.05));
  let noiseSum = 0;
  for (let i = n - lastSegmentCount; i < n; i++) {
    noiseSum += powers[i];
  }
  const noiseFloor = noiseSum / lastSegmentCount;

  // Step detection threshold (e.g. 0.05 dB drop in window)
  const stepThreshold = 0.05;
  let inEventZone = false;
  let endDetected = false;

  for (let i = windowSize; i < n - windowSize * 2; i++) {
    const curP = powers[i];
    const prevP = powers[i - windowSize];
    const nextP = powers[i + windowSize];
    const curDist = distances[i];

    // Check for reflection spike: curP significantly higher than prevP and nextP
    const isPeak = curP > prevP + 0.3 && curP > nextP + 0.3;

    // Check for end of fiber: large spike or drop to noise floor
    if (!endDetected && (curP < noiseFloor + 1.5 || (isPeak && curDist > trace.maxDistance * 0.7))) {
      // Look ahead to see if it stays near noise floor
      let remainsInNoise = true;
      const checkEnd = Math.min(n - 1, i + windowSize * 4);
      for (let k = i + windowSize; k < checkEnd; k++) {
        if (powers[k] > noiseFloor + 3) {
          remainsInNoise = false;
          break;
        }
      }

      if (remainsInNoise && curDist > trace.maxDistance * 0.2) {
        endDetected = true;
        const reflectanceVal = isPeak ? curP - prevP - 45 : -25;
        events.push({
          id: eventId++,
          distance: curDist,
          type: "End",
          loss: undefined,
          reflectance: Math.round(reflectanceVal * 10) / 10,
          comment: "End of fiber",
        });
        i += windowSize * 4; // Skip past end
        continue;
      }
    }

    if (endDetected) {
      break;
    }

    // Reflective connector
    if (isPeak) {
      const dropAfter = Math.max(0, prevP - powers[Math.min(n - 1, i + windowSize * 2)]);
      const peakHeight = curP - prevP;
      const reflectanceEst = Math.min(-14, Math.round((-65 + peakHeight * 5) * 10) / 10);
      const lossEst = Math.round(Math.max(0.05, dropAfter) * 100) / 100;

      events.push({
        id: eventId++,
        distance: curDist,
        type: "Connector",
        loss: lossEst,
        reflectance: reflectanceEst,
        comment: "Reflective connector event",
      });
      i += windowSize * 3;
      continue;
    }

    // Non-reflective splice (step drop without peak)
    const drop = prevP - nextP;
    if (drop > stepThreshold && !inEventZone) {
      // Verify it's a permanent level shift, not just noise
      const farNext = powers[Math.min(n - 1, i + windowSize * 3)];
      if (prevP - farNext > stepThreshold * 0.8) {
        const lossVal = Math.round(drop * 100) / 100;
        events.push({
          id: eventId++,
          distance: curDist,
          type: "Splice",
          loss: lossVal,
          reflectance: undefined,
          comment: "Fusion splice event",
        });
        inEventZone = true;
        i += windowSize * 2;
        continue;
      }
    } else if (drop < stepThreshold * 0.5) {
      inEventZone = false;
    }
  }

  // Calculate cumulative loss for all events
  let runningLoss = 0;
  for (const event of events) {
    if (event.loss) {
      runningLoss += event.loss;
    }
    event.cumulativeLoss = Math.round(runningLoss * 100) / 100;
  }

  return events;
}
