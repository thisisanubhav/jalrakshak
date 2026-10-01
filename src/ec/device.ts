import type { ECDevice } from "./types";

export function hasRecordedCalibration(device: ECDevice) {
  return Boolean(
    device.lastCalibrationDate &&
      device.calibrationStandardUsCm !== undefined &&
      Number.isFinite(device.calibrationStandardUsCm) &&
      device.calibrationStandardUsCm >= 0,
  );
}
