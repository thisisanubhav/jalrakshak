import { describe, expect, it } from "vitest";
import { compareECWithHistory } from "@/ec/history";
import { evaluateECRepeatability } from "@/ec/measurement-quality";
import { cloneJudgeScenario, JUDGE_DEMO_SCENARIOS } from "./scenarios";

describe("deterministic judge scenarios", () => {
  it("uses stable deterministic identities and synthetic provenance", () => {
    expect(JUDGE_DEMO_SCENARIOS.map((item) => item.source.sourceCode)).toEqual([
      "JR-DEMO-001",
      "JR-DEMO-002",
      "JR-DEMO-003",
      "JR-DEMO-004",
    ]);
    for (const scenario of JUDGE_DEMO_SCENARIOS) {
      expect(scenario.measurements.every((item) => item.dataOrigin === "SYNTHETIC_DEMO")).toBe(true);
      expect(scenario.measurements.every((item) => item.sourceId === scenario.source.id)).toBe(true);
    }
  });

  it("produces the intended comparison outcomes through domain rules", () => {
    const outcomes = Object.fromEntries(
      JUDGE_DEMO_SCENARIOS.map((scenario) => {
        const current = scenario.measurements.at(-1)!;
        return [scenario.id, compareECWithHistory(current, scenario.measurements).status];
      }),
    );
    expect(outcomes).toEqual({
      stable: "NO_UNUSUAL_EC_CHANGE_OBSERVED",
      disagreement: "MEASUREMENT_QUALITY_FAILURE",
      insufficient: "INSUFFICIENT_HISTORY",
      change: "CHANGE_OBSERVED",
    });
  });

  it("does not bypass repeatability to create demonstration outcomes", () => {
    for (const scenario of JUDGE_DEMO_SCENARIOS.filter((item) => item.id !== "disagreement")) {
      for (const record of scenario.measurements) {
        expect(evaluateECRepeatability([record.reading1RawEcUsCm, record.reading2RawEcUsCm]).status).toBe("REPEATABLE");
      }
    }
    const disagreement = JUDGE_DEMO_SCENARIOS.find((item) => item.id === "disagreement")!.measurements[0];
    expect(evaluateECRepeatability([disagreement.reading1RawEcUsCm, disagreement.reading2RawEcUsCm])).toMatchObject({
      status: "DISAGREEMENT",
      requiresThirdReading: true,
    });
  });

  it("returns isolated clones", () => {
    const original = JUDGE_DEMO_SCENARIOS[0];
    const clone = cloneJudgeScenario(original);
    clone.measurements[0].notes = "changed";
    expect(original.measurements[0].notes).not.toBe("changed");
  });
});
