import type { SyncStatus } from "@/domain/types";

export type ECDataOrigin =
  | "MANUAL_EXPERIMENT"
  | "SYNTHETIC_DEMO"
  | "REAL_SENSOR"
  | "SIMULATED"
  | "LAB_CONFIRMED";
export type ECAgreementStatus =
  | "REPEATABLE"
  | "DISAGREEMENT"
  | "INSUFFICIENT_DATA"
  | "INVALID";
export type ECMeasurementQuality = ECAgreementStatus;
export type ECSamplingMethod = "DIRECT_SOURCE" | "SAMPLE_CONTAINER";
export type ECChangeStatus =
  | "INSUFFICIENT_HISTORY"
  | "NO_UNUSUAL_EC_CHANGE_OBSERVED"
  | "CHANGE_OBSERVED"
  | "MEASUREMENT_QUALITY_FAILURE";

export interface ECDevice {
  id: string;
  deviceId: string;
  probeId: string;
  lastCalibrationDate?: string;
  calibrationStandardUsCm?: number;
  notes?: string;
  createdAt: string;
}

export interface ECProviderInput {
  reading1RawEcUsCm: number;
  reading2RawEcUsCm?: number;
  reading3RawEcUsCm?: number;
  temperatureC: number;
}

export interface ECProviderMeasurement extends ECProviderInput {
  dataOrigin: ECDataOrigin;
  providerName: string;
  capturedAt: string;
}

export interface ECMeasurementRecord {
  id: string;
  visitId: string;
  sourceId: string;
  deviceRecordId?: string;
  deviceId: string;
  probeId: string;
  measuredAt: string;
  reading1RawEcUsCm: number;
  reading2RawEcUsCm?: number;
  reading3RawEcUsCm?: number;
  temperatureC: number;
  compensatedEc25UsCm?: number;
  representativeRawEcUsCm?: number;
  agreementStatus: ECAgreementStatus;
  measurementQuality: ECMeasurementQuality;
  calibrationRecordId?: string;
  calibrationRecorded: boolean;
  dataOrigin: ECDataOrigin;
  providerName: string;
  samplingMethod: ECSamplingMethod;
  notes?: string;
  createdOfflineAt?: string;
  syncStatus: SyncStatus;
}

export interface ECData {
  devices: ECDevice[];
  measurements: ECMeasurementRecord[];
}

export interface ECRepeatabilityResult {
  status: ECAgreementStatus;
  differenceUsCm?: number;
  allowedDifferenceUsCm?: number;
  representativeRawEcUsCm?: number;
  agreeingReadings?: [number, number];
  requiresThirdReading: boolean;
  reason: string;
}

export interface ECChangeResult {
  status: ECChangeStatus;
  historicalCount: number;
  historicalMedianUsCm?: number;
  currentUsCm?: number;
  absoluteDifferenceUsCm?: number;
  percentageDifference?: number;
}
