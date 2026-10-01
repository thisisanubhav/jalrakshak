import { describe, expect, it } from "vitest";
import {
  assertValidECProviderInput,
  ManualECMeasurementProvider,
} from "./provider";

describe("ManualECMeasurementProvider", () => {
  it("marks every manual capture as experimental manual data", async () => {
    const result = await new ManualECMeasurementProvider().capture({
      reading1RawEcUsCm: 612,
      reading2RawEcUsCm: 618,
      temperatureC: 25.2,
    });
    expect(result.dataOrigin).toBe("MANUAL_EXPERIMENT");
    expect(result.providerName).toBe("Manual experimental entry");
  });

  it.each([
    { reading1RawEcUsCm: Number.NaN, temperatureC: 25 },
    { reading1RawEcUsCm: Number.POSITIVE_INFINITY, temperatureC: 25 },
    { reading1RawEcUsCm: -1, temperatureC: 25 },
    { reading1RawEcUsCm: 100, temperatureC: 100 },
  ])("rejects invalid inputs before classification", (input) => {
    expect(() => assertValidECProviderInput(input)).toThrow();
  });
});
