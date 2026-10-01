import { EXPERIMENTAL_EC_VALIDITY } from "./config";
import type {
  ECDataOrigin,
  ECProviderInput,
  ECProviderMeasurement,
} from "./types";

export interface ECMeasurementProvider {
  readonly name: string;
  readonly dataOrigin: ECDataOrigin;
  capture(input: ECProviderInput): Promise<ECProviderMeasurement>;
}

function assertFiniteRange(
  value: number | undefined,
  label: string,
  range: { min: number; max: number },
  required: boolean,
) {
  if (value === undefined && !required) return;
  if (
    value === undefined ||
    !Number.isFinite(value) ||
    value < range.min ||
    value > range.max
  ) {
    throw new Error(`${label} is outside the experimental input envelope.`);
  }
}

export function assertValidECProviderInput(input: ECProviderInput) {
  assertFiniteRange(
    input.reading1RawEcUsCm,
    "Reading 1",
    EXPERIMENTAL_EC_VALIDITY.rawEcUsCm,
    true,
  );
  assertFiniteRange(
    input.reading2RawEcUsCm,
    "Reading 2",
    EXPERIMENTAL_EC_VALIDITY.rawEcUsCm,
    false,
  );
  assertFiniteRange(
    input.reading3RawEcUsCm,
    "Reading 3",
    EXPERIMENTAL_EC_VALIDITY.rawEcUsCm,
    false,
  );
  assertFiniteRange(
    input.temperatureC,
    "Temperature",
    EXPERIMENTAL_EC_VALIDITY.temperatureC,
    true,
  );
}

export class ManualECMeasurementProvider implements ECMeasurementProvider {
  readonly name = "Manual experimental entry";
  readonly dataOrigin = "MANUAL_EXPERIMENT" as const;

  async capture(input: ECProviderInput): Promise<ECProviderMeasurement> {
    assertValidECProviderInput(input);
    return {
      ...input,
      dataOrigin: this.dataOrigin,
      providerName: this.name,
      capturedAt: new Date().toISOString(),
    };
  }
}

// Contract placeholder only. No transport, hardware, or fabricated readings.
export interface ESP32ECMeasurementProvider extends ECMeasurementProvider {
  readonly dataOrigin: "REAL_SENSOR";
}
