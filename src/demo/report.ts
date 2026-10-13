import {
  compareECWithHistory,
  getECComparisonEligibility,
  type ECComparisonExclusionReason,
} from "@/ec/history";
import type { ECMeasurementRecord } from "@/ec/types";
import type { JudgeDemoScenario } from "./types";

export interface InvestigationReportVisit {
  record: ECMeasurementRecord;
  includedInComparison: boolean;
  exclusionReason?: ECComparisonExclusionReason;
}

export interface InvestigationReportData {
  reportId: string;
  generatedAt: string;
  scenario: JudgeDemoScenario;
  visits: InvestigationReportVisit[];
  comparison: ReturnType<typeof compareECWithHistory>;
}

export function buildInvestigationReport(
  scenario: JudgeDemoScenario,
  generatedAt = new Date().toISOString(),
): InvestigationReportData {
  const records = [...scenario.measurements].sort((a, b) =>
    a.measuredAt.localeCompare(b.measuredAt),
  );
  const current = records.at(-1);
  if (!current) throw new Error("A report requires at least one measurement.");
  const comparison = compareECWithHistory(current, records);
  return {
    reportId: `JR-INV-${scenario.source.sourceCode.replaceAll("-", "")}-${current.visitId.split("-").at(-1)}`,
    generatedAt,
    scenario: { ...scenario, measurements: records },
    visits: records.map((record) => {
      const eligibility = getECComparisonEligibility(current, record);
      return {
        record,
        includedInComparison: eligibility.comparable,
        exclusionReason: eligibility.reason,
      };
    }),
    comparison,
  };
}

export const SCIENTIFIC_REPORT_LIMITATION =
  "Electrical conductivity does not identify specific contaminants or establish drinking-water safety. Any concerning change requires appropriate measurement verification and, where relevant, laboratory confirmation.";
