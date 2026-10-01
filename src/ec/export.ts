import type { WaterSource } from "@/domain/types";
import type { ECMeasurementRecord } from "./types";

const columns = [
  "source_code",
  "source_name",
  "village",
  "visit_id",
  "timestamp",
  "device_id",
  "probe_id",
  "reading_1_raw_ec_us_cm",
  "reading_2_raw_ec_us_cm",
  "reading_3_raw_ec_us_cm",
  "temperature_c",
  "measurement_quality",
  "calibration_recorded",
  "origin",
  "sampling_method",
  "notes",
] as const;

function cell(value: unknown) {
  const text = value === undefined || value === null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function createECCsv(
  records: ECMeasurementRecord[],
  sources: WaterSource[],
) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const rows = records.map((record) => {
    const source = sourceById.get(record.sourceId);
    return [
      source?.sourceCode,
      source?.name,
      source?.village,
      record.visitId,
      record.measuredAt,
      record.deviceId,
      record.probeId,
      record.reading1RawEcUsCm,
      record.reading2RawEcUsCm,
      record.reading3RawEcUsCm,
      record.temperatureC,
      record.measurementQuality,
      record.calibrationRecorded,
      record.dataOrigin,
      record.samplingMethod,
      record.notes,
    ].map(cell);
  });
  return [columns.map(cell).join(","), ...rows.map((row) => row.join(","))].join(
    "\n",
  );
}
