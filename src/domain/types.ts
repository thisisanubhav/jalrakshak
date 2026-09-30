export type SourceType = "HANDPUMP" | "WELL" | "TAP" | "BOREWELL" | "OTHER";
export type ScreeningStatus = "NORMAL_SCREENING" | "RETEST" | "LAB_REFERRAL";
export type SyncStatus = "LOCAL_ONLY" | "SYNCING" | "SYNCED" | "SYNC_FAILED";
export type ReferralStatus =
  "CREATED" | "SAMPLE_COLLECTED" | "SENT_TO_LAB" | "RESULT_RECEIVED" | "CLOSED";
export type DataOrigin = "SIMULATED" | "SENSOR" | "LAB_CONFIRMED";

export interface Coordinates {
  latitude: number;
  longitude: number;
}
export interface SensorReadings {
  ph: number;
  tds: number;
  turbidity: number;
  temperature: number;
}

export interface WaterSource extends Coordinates {
  id: string;
  sourceCode: string;
  sourceType: SourceType;
  village: string;
  name: string;
  photoUrl?: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface WaterTest extends SensorReadings {
  id: string;
  sourceId: string;
  screeningStatus: ScreeningStatus;
  reasonCodes: string[];
  explanation: string;
  dataOrigin: DataOrigin;
  providerName: string;
  testedAt: string;
  syncStatus: SyncStatus;
}

export interface LabReferral {
  id: string;
  testId: string;
  sourceId: string;
  referralStatus: ReferralStatus;
  notes: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface ScreeningResult {
  status: ScreeningStatus;
  reasonCodes: string[];
  explanation: string;
  attentionMeasurements: (keyof SensorReadings)[];
}

export interface AppData {
  sources: WaterSource[];
  tests: WaterTest[];
  referrals: LabReferral[];
}
