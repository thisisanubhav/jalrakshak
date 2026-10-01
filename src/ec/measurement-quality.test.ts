import { describe, expect, it } from "vitest";
import { evaluateECRepeatability } from "./measurement-quality";

const rule = { absoluteToleranceUsCm: 10, relativeTolerancePercent: 0 };

describe("EC repeatability", () => {
  it("requires two readings", () => {
    expect(evaluateECRepeatability([612], rule).status).toBe(
      "INSUFFICIENT_DATA",
    );
  });
  it("accepts an agreeing pair under an injected experimental rule", () => {
    const result = evaluateECRepeatability([612, 618], rule);
    expect(result.status).toBe("REPEATABLE");
    expect(result.representativeRawEcUsCm).toBe(615);
  });
  it("requests a third reading after disagreement", () => {
    const result = evaluateECRepeatability([612, 700], rule);
    expect(result.status).toBe("DISAGREEMENT");
    expect(result.requiresThirdReading).toBe(true);
  });
  it("uses only the agreeing pair rather than averaging an outlier", () => {
    const result = evaluateECRepeatability([612, 700, 616], rule);
    expect(result.status).toBe("REPEATABLE");
    expect(result.representativeRawEcUsCm).toBe(614);
    expect(result.agreeingReadings).toEqual([612, 616]);
  });
  it("fails closed when all three disagree", () => {
    expect(evaluateECRepeatability([500, 600, 700], rule).status).toBe(
      "DISAGREEMENT",
    );
  });
});
