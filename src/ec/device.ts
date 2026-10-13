import type { ECDevice } from "./types";

export function hasRecordedCalibration(
  device: ECDevice,
  today = new Date().toISOString().slice(0, 10),
) {
  const date = device.lastCalibrationDate;
  return Boolean(
    date &&
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      !Number.isNaN(Date.parse(`${date}T00:00:00.000Z`)) &&
      date <= today &&
      device.calibrationStandardUsCm !== undefined &&
      Number.isFinite(device.calibrationStandardUsCm) &&
      device.calibrationStandardUsCm > 0,
  );
}
