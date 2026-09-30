import type { SourceType } from "./types";

const PREFIX: Record<SourceType, string> = { HANDPUMP: "HP", WELL: "WL", TAP: "TP", BOREWELL: "BW", OTHER: "OT" };
export function generateSourceCode(type: SourceType, sequence = Math.floor(Math.random() * 9000) + 1000) {
  return `JR-${PREFIX[type]}-${String(sequence).padStart(4, "0")}`;
}

