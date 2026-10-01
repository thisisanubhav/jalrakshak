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
      }),
    ).toBe(true);
  });
});
