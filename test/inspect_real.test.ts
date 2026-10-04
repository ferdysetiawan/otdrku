import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { SorParser } from "../src/lib/otdr/sorParser";

describe("Inspect Real SOR File", () => {
  it("parses contohsor file", async () => {
    const filePath = path.resolve(__dirname, "../contohsor/6_12 A-B.1550.500nS.50Km (2).sor");
    const buffer = fs.readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

    const parser = new SorParser();
    const result = await parser.parse(arrayBuffer, "6_12 A-B.1550.500nS.50Km (2).sor");

    expect(result.metadata.vendor).toBe("VanGuard Data");
    expect(result.trace.distance).toHaveLength(200000);
    expect(result.trace.power).toHaveLength(200000);
    expect(result.events).toHaveLength(12);
    expect(result.summary?.fiberLength).toBeCloseTo(12754.996, 2);
  });
});
