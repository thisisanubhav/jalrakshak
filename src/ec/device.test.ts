import { describe, expect, it } from "vitest";
import { hasRecordedCalibration } from "./device";
import type { ECDevice } from "./types";

const base: ECDevice = {
  id: "d1",
  deviceId: "JR-EC-001",
  probeId: "EC-P01",
  createdAt: "2026-09-30T00:00:00.000Z",
};

describe("experimental device calibration metadata", () => {
  it("does not call incomplete metadata a recorded calibration", () => {
    expect(hasRecordedCalibration(base)).toBe(false);
    expect(
      hasRecordedCalibration({ ...base, calibrationStandardUsCm: 1413 }),
    ).toBe(false);
  });
  it("recognizes a date and finite standard as recorded metadata", () => {
    expect(
      hasRecordedCalibration({
        ...base,
        lastCalibrationDate: "2026-09-30",
        calibrationStandardUsCm: 1413,
      }, "2026-10-13"),
    ).toBe(true);
  });
  it("rejects future dates, invalid dates, and zero-value standards", () => {
    expect(
      hasRecordedCalibration({
        ...base,
        lastCalibrationDate: "2099-01-01",
        calibrationStandardUsCm: 1413,
      }, "2026-10-13"),
    ).toBe(false);
    expect(
      hasRecordedCalibration({
        ...base,
        lastCalibrationDate: "2026-02-31",
        calibrationStandardUsCm: 1413,
      }, "2026-10-13"),
    ).toBe(false);
    expect(
      hasRecordedCalibration({
        ...base,
        lastCalibrationDate: "2026-09-30",
        calibrationStandardUsCm: 0,
      }, "2026-10-13"),
    ).toBe(false);
  });
});
