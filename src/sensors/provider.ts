import type {
  DataOrigin,
  MeasurementProvenanceMap,
  SensorReadings,
} from "@/domain/types";

export type SimulationScenario = "normal" | "retest" | "referral";
export interface SensorProgress {
  stage: "connecting" | "stabilizing" | "reading" | "complete";
  progress: number;
  readings?: Partial<SensorReadings>;
}
export interface SensorMeasurement {
  readings: Partial<SensorReadings>;
  dataOrigin: DataOrigin;
  providerName: string;
  measurementProvenance: MeasurementProvenanceMap;
}
export interface SensorProvider {
  readonly name: string;
  readonly dataOrigin: DataOrigin;
  readonly capabilities: Record<keyof SensorReadings, boolean>;
  measure(
    onProgress: (value: SensorProgress) => void,
  ): Promise<SensorMeasurement>;
}

export const SIMULATION_PRESETS: Record<SimulationScenario, SensorReadings> = {
  normal: { ph: 7.2, tds: 284, turbidity: 1.8, temperature: 25.4 },
  retest: { ph: 6.2, tds: 610, turbidity: 6.4, temperature: 28.1 },
  referral: { ph: 5.2, tds: 1380, turbidity: 13.6, temperature: 29.2 },
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export class SimulatedSensorProvider implements SensorProvider {
  readonly name = "JalRakshak Simulator";
  readonly dataOrigin = "SIMULATED" as const;
  readonly capabilities = {
    ph: true,
    tds: true,
    turbidity: true,
    temperature: true,
  } as const;
  constructor(
    private scenario: SimulationScenario,
    private delay = 420,
  ) {}
  async measure(onProgress: (value: SensorProgress) => void) {
    const final = SIMULATION_PRESETS[this.scenario];
    onProgress({ stage: "connecting", progress: 8 });
    await wait(this.delay);
    onProgress({
      stage: "stabilizing",
      progress: 28,
      readings: { temperature: final.temperature },
    });
    await wait(this.delay);
    onProgress({
      stage: "reading",
      progress: 52,
      readings: { temperature: final.temperature, ph: final.ph },
    });
    await wait(this.delay);
    onProgress({
      stage: "reading",
      progress: 76,
      readings: {
        temperature: final.temperature,
        ph: final.ph,
        tds: final.tds,
      },
    });
    await wait(this.delay);
    onProgress({ stage: "complete", progress: 100, readings: final });
    return {
      readings: final,
      dataOrigin: this.dataOrigin,
      providerName: this.name,
      measurementProvenance: Object.fromEntries(
        (Object.keys(final) as (keyof SensorReadings)[]).map((key) => [
          key,
          {
            availability: "AVAILABLE",
            dataOrigin: this.dataOrigin,
            providerName: this.name,
          },
        ]),
      ) as MeasurementProvenanceMap,
    };
  }
}

export class BluetoothSensorProvider implements SensorProvider {
  readonly name = "Bluetooth sensor";
  readonly dataOrigin = "SENSOR" as const;
  readonly capabilities = {
    ph: false,
    tds: true,
    turbidity: false,
    temperature: true,
  } as const;
  async measure(): Promise<SensorMeasurement> {
    throw new Error(
      "Bluetooth provider is reserved for the ESP32 integration phase.",
    );
  }
}
