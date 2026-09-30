import { describe, expect, it } from "vitest";
import { translations } from "./translations";

describe("translations", () => {
  it("keeps Hindi and English translation keys in sync", () => {
    expect(Object.keys(translations.hi).sort()).toEqual(
      Object.keys(translations.en).sort(),
    );
  });

  it("includes the preliminary-screening disclaimer in both languages", () => {
    expect(translations.en.disclaimer).toContain(
      "not a laboratory certification",
    );
    expect(translations.hi.disclaimer).toContain("प्रयोगशाला प्रमाणन नहीं");
  });

  it("identifies simulated readings without suggesting laboratory provenance", () => {
    expect(translations.en.simulated).toContain("SIMULATED");
    expect(translations.en.demoDisclosure).toContain("software simulations");
    expect(translations.en.demoDisclosure).toContain("No physical sensor");
  });
});
