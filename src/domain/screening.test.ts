import { describe, expect, it } from "vitest";
import { evaluateScreening } from "./screening";

describe("screening engine", () => {
  it("classifies normal readings", () => expect(evaluateScreening({ ph: 7.1, tds: 250, turbidity: 2, temperature: 26 }).status).toBe("NORMAL_SCREENING"));
  it("requests a retest for borderline readings", () => expect(evaluateScreening({ ph: 6.2, tds: 550, turbidity: 2, temperature: 26 }).status).toBe("RETEST"));
  it("prioritizes laboratory referral", () => {
    const result = evaluateScreening({ ph: 5.1, tds: 1300, turbidity: 12, temperature: 26 });
    expect(result.status).toBe("LAB_REFERRAL");
    expect(result.reasonCodes).toContain("PH_REFERRAL_RANGE");
  });
});

