import { OtdrData } from "@/types/otdr";
import { SorParser } from "./sorParser";

export class UnifiedOtdrParser {
  private sorParser = new SorParser();

  /**
   * Determine if file can be parsed
   */
  public canParse(fileOrBuffer: File | ArrayBuffer | Uint8Array, fileName?: string): boolean {
    return this.sorParser.canParse(fileOrBuffer, fileName);
  }

  /**
   * Parse OTDR file from ArrayBuffer
   */
  public async parse(buffer: ArrayBuffer, fileName = "trace.sor"): Promise<OtdrData> {
    if (this.sorParser.canParse(buffer, fileName)) {
      return await this.sorParser.parse(buffer, fileName);
    }
    throw new Error("Unsupported OTDR file format. Please upload a standard Bellcore/Telcordia .SOR file.");
  }
}

export const otdrParser = new UnifiedOtdrParser();
