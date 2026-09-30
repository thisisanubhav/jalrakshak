import { describe, expect, it } from "vitest";
import { SIMULATION_PRESETS, SimulatedSensorProvider } from "./provider";
describe("sensor simulator", () => {
  it("has three distinct presets", () => expect(Object.keys(SIMULATION_PRESETS)).toEqual(["normal", "retest", "referral"]));
  it("streams progress and returns the selected preset", async () => {
    const events: number[] = [];
    const value = await new SimulatedSensorProvider("referral", 0).measure(event => events.push(event.progress));
    expect(value.readings).toEqual(SIMULATION_PRESETS.referral);
    expect(value.dataOrigin).toBe("SIMULATED");
    expect(value.providerName).toBe("JalRakshak Simulator");
    expect(events).toEqual([8, 28, 52, 76, 100]);
  });
});
