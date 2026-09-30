import { describe, expect, it } from "vitest";
import {
  evaluateScreening,
  formatReading,
  InvalidMeasurementError,
} from "./screening";
import { SCREENING_THRESHOLDS as T } from "./screening-config";

describe("screening engine", () => {
  it("classifies normal readings", () =>
    expect(
      evaluateScreening({ ph: 7.1, tds: 250, turbidity: 2, temperature: 26 })
        .status,
    ).toBe("NORMAL_SCREENING"));
  it("requests a retest for borderline readings", () =>
    expect(
      evaluateScreening({ ph: 6.2, tds: 550, turbidity: 2, temperature: 26 })
        .status,
    ).toBe("RETEST"));
  it("prioritizes laboratory referral", () => {
    const result = evaluateScreening({
      ph: 5.1,
      tds: 1300,
      turbidity: 12,
      temperature: 26,
    });
    expect(result.status).toBe("LAB_REFERRAL");
    expect(result.reasonCodes).toContain("PH_REFERRAL_RANGE");
  });

  it.each([
    {
      ph: T.ph.retestMin,
      tds: T.tds.retestMax,
      turbidity: T.turbidity.retestMax,
      temperature: T.temperature.retestMin,
    },
    {
      ph: T.ph.retestMax,
      tds: 0,
      turbidity: 0,
      temperature: T.temperature.retestMax,
    },
  ])(
    "keeps values exactly on normal boundaries in normal screening",
    (readings) => {
      expect(evaluateScreening(readings).status).toBe("NORMAL_SCREENING");
    },
  );

  it("classifies values just outside normal boundaries as retest", () => {
    expect(
      evaluateScreening({
        ph: T.ph.retestMin - 0.01,
        tds: 0,
        turbidity: 0,
        temperature: 25,
      }).status,
    ).toBe("RETEST");
    expect(
      evaluateScreening({
        ph: 7,
        tds: T.tds.retestMax + 0.01,
        turbidity: 0,
        temperature: 25,
      }).status,
    ).toBe("RETEST");
  });

  it("uses referral only beyond the provisional referral boundary", () => {
    expect(
      evaluateScreening({
        ph: T.ph.referralMin,
        tds: T.tds.referralMax,
        turbidity: T.turbidity.referralMax,
        temperature: T.temperature.referralMax,
      }).status,
    ).toBe("RETEST");
    expect(
      evaluateScreening({
        ph: T.ph.referralMin - 0.01,
        tds: 0,
        turbidity: 0,
        temperature: 25,
      }).status,
    ).toBe("LAB_REFERRAL");
  });

  it.each([
    { ph: Number.NaN, tds: 100, turbidity: 1, temperature: 25 },
    { ph: 7, tds: Number.POSITIVE_INFINITY, turbidity: 1, temperature: 25 },
    { ph: 7, tds: -1, turbidity: 1, temperature: 25 },
    { ph: 15, tds: 100, turbidity: 1, temperature: 25 },
    { ph: 7, tds: 100, turbidity: -1, temperature: 25 },
  ])(
    "rejects invalid readings instead of returning a screening status",
    (readings) => {
      expect(() => evaluateScreening(readings)).toThrow(
        InvalidMeasurementError,
      );
    },
  );

  it("rejects missing readings at runtime", () => {
    expect(() =>
      evaluateScreening({ ph: 7, tds: 100, temperature: 25 } as never),
    ).toThrow(InvalidMeasurementError);
  });

  it("formats readings without fake precision", () => {
    expect(formatReading("ph", 7.234)).toBe("7.2");
    expect(formatReading("tds", 284.49)).toBe("284");
    expect(formatReading("turbidity", Number.NaN)).toBe("—");
  });
});
