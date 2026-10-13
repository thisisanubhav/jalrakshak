import { describe, expect, it } from "vitest";
import { demoTranslations } from "@/i18n/demo-translations";
import { createECCsv } from "@/ec/export";
import { buildInvestigationReport } from "./report";
import { JUDGE_DEMO_SCENARIOS } from "./scenarios";
import { getMeasurementQualityCopy } from "./quality-copy";

describe("judge evidence outputs", () => {
  it("builds a chronological report from stored scenario records", () => {
    const scenario = JUDGE_DEMO_SCENARIOS.find((item) => item.id === "change")!;
    const report = buildInvestigationReport(scenario, "2026-10-13T12:00:00.000Z");
    expect(report.generatedAt).toBe("2026-10-13T12:00:00.000Z");
    expect(report.comparison.status).toBe("CHANGE_OBSERVED");
    expect(report.visits).toHaveLength(5);
    expect(report.visits.map((item) => item.record.measuredAt)).toEqual(
      [...report.visits.map((item) => item.record.measuredAt)].sort(),
    );
    expect(report.visits.every((item) => item.record.dataOrigin === "SYNTHETIC_DEMO")).toBe(true);
  });

  it("exports stable columns, calibration metadata, chronology, and provenance", () => {
    const scenario = JUDGE_DEMO_SCENARIOS[0];
    const reversed = [...scenario.measurements].reverse();
    const csv = createECCsv(reversed, [scenario.source], [scenario.device]);
    expect(csv).toContain('"calibration_date"');
    expect(csv).toContain('"calibration_standard_us_cm"');
    expect(csv).toContain('"SYNTHETIC_DEMO"');
    expect(csv.indexOf('"JR-DEMO-STABLE-V1"')).toBeLessThan(csv.indexOf('"JR-DEMO-STABLE-V5"'));
  });

  it("keeps Hindi judge-demo translation keys in parity", () => {
    expect(Object.keys(demoTranslations.hi).sort()).toEqual(Object.keys(demoTranslations.en).sort());
    for (const status of ["REPEATABLE", "DISAGREEMENT", "INSUFFICIENT_DATA", "INVALID"] as const) {
      expect(getMeasurementQualityCopy("en", status).body).toBeTruthy();
      expect(getMeasurementQualityCopy("hi", status).body).toBeTruthy();
    }
  });
});
