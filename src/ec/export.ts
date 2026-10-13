import type { WaterSource } from "@/domain/types";
import type { ECDevice, ECMeasurementRecord } from "./types";

const columns = [
  "source_code",
  "source_name",
  "village",
  "visit_id",
  "timestamp",
  "device_record_id",
  "device_id",
  "probe_id",
  "reading_1_raw_ec_us_cm",
  "reading_2_raw_ec_us_cm",
  "reading_3_raw_ec_us_cm",
  "temperature_c",
  "measurement_quality",
  "calibration_recorded",
  "calibration_date",
  "calibration_standard_us_cm",
  "origin",
  "sampling_method",
  "notes",
] as const;

function cell(value: unknown) {
  const raw = value === undefined || value === null ? "" : String(value);
  // Prevent spreadsheet applications from executing user-controlled cells as
  // formulas when the CSV is opened directly.
  const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${text.replaceAll('"', '""')}"`;
}

export function createECCsv(
  records: ECMeasurementRecord[],
  sources: WaterSource[],
  devices: ECDevice[] = [],
) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const deviceById = new Map(devices.map((device) => [device.id, device]));
  const rows = [...records]
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
    .map((record) => {
      const source = sourceById.get(record.sourceId);
      const device = record.deviceRecordId
        ? deviceById.get(record.deviceRecordId)
        : undefined;
      return [
        source?.sourceCode,
        source?.name,
        source?.village,
        record.visitId,
        record.measuredAt,
        record.deviceRecordId,
        record.deviceId,
        record.probeId,
        record.reading1RawEcUsCm,
        record.reading2RawEcUsCm,
        record.reading3RawEcUsCm,
        record.temperatureC,
        record.measurementQuality,
        record.calibrationRecorded,
        device?.lastCalibrationDate,
        device?.calibrationStandardUsCm,
        record.dataOrigin,
        record.samplingMethod,
        record.notes,
      ].map(cell);
    });
  return [columns.map(cell).join(","), ...rows.map((row) => row.join(","))].join(
    "\n",
  );
}
