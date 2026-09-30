import { describe, expect, it } from "vitest";
import { generateSourceCode } from "./source-code";
describe("source code", () => {
  it("uses stable source prefix and padding", () =>
    expect(generateSourceCode("HANDPUMP", 12)).toBe("JR-HP-0012"));
});
