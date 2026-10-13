import type { WaterSource } from "@/domain/types";
import type { ECDevice, ECMeasurementRecord } from "@/ec/types";
import type { JudgeDemoScenario, JudgeScenarioId } from "./types";

const CREATED_AT = "2026-10-01T06:00:00.000Z";
const DEVICE: ECDevice = {
  id: "judge-demo-device",
  deviceId: "JR-DEMO-EC-01",
  probeId: "DEMO-P01",
  lastCalibrationDate: "2026-09-30",
  calibrationStandardUsCm: 1413,
  notes: "Synthetic metadata for software demonstration only.",
  createdAt: CREATED_AT,
};

const source = (code: string, name: string): WaterSource => ({
  id: `judge-source-${code.toLowerCase()}`,
  sourceCode: code,
  sourceType: "HANDPUMP",
  village: "Demo Village (fictional)",
  name,
  latitude: 23.61,
  longitude: 85.28,
  createdAt: CREATED_AT,
  syncStatus: "LOCAL_ONLY",
  recordScope: "JUDGE_DEMO",
});

function repeatableRecord(
  scenario: JudgeScenarioId,
  sourceId: string,
  index: number,
  representative: number,
): ECMeasurementRecord {
  const first = representative - 2;
  const second = representative + 2;
  return {
    id: `judge-${scenario}-measurement-${index}`,
    visitId: `JR-DEMO-${scenario.toUpperCase()}-V${index}`,
    sourceId,
    deviceRecordId: DEVICE.id,
    deviceId: DEVICE.deviceId,
    probeId: DEVICE.probeId,
    measuredAt: `2026-10-${String(index).padStart(2, "0")}T06:30:00.000Z`,
    reading1RawEcUsCm: first,
    reading2RawEcUsCm: second,
    temperatureC: 25 + ((index % 3) - 1) * 0.2,
    representativeRawEcUsCm: representative,
    agreementStatus: "REPEATABLE",
    measurementQuality: "REPEATABLE",
    calibrationRecordId: DEVICE.id,
    calibrationRecorded: true,
    dataOrigin: "SYNTHETIC_DEMO",
    providerName: "JalRakshak deterministic judge scenario",
    samplingMethod: "DIRECT_SOURCE",
    notes: "Synthetic demonstration visit; not a field observation.",
    syncStatus: "LOCAL_ONLY",
  };
}

const stableSource = source("JR-DEMO-001", "Stable demonstration handpump");
const stableValues = [610, 615, 608, 612, 618];

const disagreementSource = source(
  "JR-DEMO-002",
  "Disagreement demonstration handpump",
);
const disagreementRecord: ECMeasurementRecord = {
  ...repeatableRecord("disagreement", disagreementSource.id, 1, 720),
  reading1RawEcUsCm: 610,
  reading2RawEcUsCm: 830,
  representativeRawEcUsCm: undefined,
  agreementStatus: "DISAGREEMENT",
  measurementQuality: "DISAGREEMENT",
  notes: "Synthetic readings disagree; a third reading is required.",
};

const insufficientSource = source(
  "JR-DEMO-003",
  "New-source demonstration handpump",
);
const changeSource = source("JR-DEMO-004", "Change demonstration handpump");
const changeValues = [610, 615, 608, 612, 1020];

export const JUDGE_DEMO_SCENARIOS: readonly JudgeDemoScenario[] = [
  {
    id: "stable",
    sequence: 1,
    source: stableSource,
    device: DEVICE,
    measurements: stableValues.map((value, index) =>
      repeatableRecord("stable", stableSource.id, index + 1, value),
    ),
  },
  {
    id: "disagreement",
    sequence: 2,
    source: disagreementSource,
    device: DEVICE,
    measurements: [disagreementRecord],
  },
  {
    id: "insufficient",
    sequence: 3,
    source: insufficientSource,
    device: DEVICE,
    measurements: [repeatableRecord("insufficient", insufficientSource.id, 1, 612)],
  },
  {
    id: "change",
    sequence: 4,
    source: changeSource,
    device: DEVICE,
    measurements: changeValues.map((value, index) =>
      repeatableRecord("change", changeSource.id, index + 1, value),
    ),
  },
] as const;

export function getJudgeScenario(id: JudgeScenarioId) {
  return JUDGE_DEMO_SCENARIOS.find((scenario) => scenario.id === id);
}

export function cloneJudgeScenario(scenario: JudgeDemoScenario) {
  return structuredClone(scenario);
}
