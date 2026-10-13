import type { ECDevice } from "./types";

export function hasRecordedCalibration(
  device: ECDevice,
  today = new Date().toISOString().slice(0, 10),
) {
  const date = device.lastCalibrationDate;
  const parsed = date ? new Date(`${date}T00:00:00.000Z`) : undefined;
  const validDate = Boolean(
    date &&
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      parsed &&
      !Number.isNaN(parsed.valueOf()) &&
      parsed.toISOString().slice(0, 10) === date,
  );
  return Boolean(
    validDate &&
      date &&
      date <= today &&
      device.calibrationStandardUsCm !== undefined &&
      Number.isFinite(device.calibrationStandardUsCm) &&
      device.calibrationStandardUsCm > 0,
  );
}
