import type { WaterSource } from "@/domain/types";
import type { ECDevice, ECMeasurementRecord } from "@/ec/types";

export type JudgeScenarioId =
  | "stable"
  | "disagreement"
  | "insufficient"
  | "change";

export interface JudgeDemoScenario {
  id: JudgeScenarioId;
  sequence: number;
  source: WaterSource;
  device: ECDevice;
  measurements: ECMeasurementRecord[];
  loadedAt?: string;
}
