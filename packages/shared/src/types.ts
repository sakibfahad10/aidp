import type { ReportFileMetadata } from "./report-file";

/** Supported input types for disease prediction */
export enum InputType {
  SYMPTOM = "symptom",
  STRUCTURED = "structured",
  REPORT = "report",
}

/** Risk level classification for predictions */
export enum RiskLevel {
  LOW = "low",
  MODERATE = "moderate",
  HIGH = "high",
  CRITICAL = "critical",
}

/** Payload for symptom-based input */
export interface SymptomPayload {
  symptoms: string;
  duration?: string;
  severity?: string;
}

/** Payload for structured health data input */
export interface StructuredPayload {
  age: number;
  gender: string;
  symptoms: string[];
  medicalHistory?: string[];
  currentMedications?: string[];
  vitals?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    weight?: number;
    height?: number;
  };
}

/** Payload for medical report text input */
export interface ReportPayload {
  reportText: string;
  reportType?: string;
}

/** Union type for all input payloads */
export type PredictionPayload =
  | SymptomPayload
  | StructuredPayload
  | ReportPayload
  | ReportFileMetadata;

/** Request body sent to the predict endpoint */
export interface PredictRequest {
  inputType: InputType;
  payload: PredictionPayload;
}

/** A single possible condition returned by the AI */
export interface PossibleCondition {
  name: string;
  probability: string;
  description: string;
}

/** Strict JSON response format from Gemini AI */
export interface AIPredictionResponse {
  riskLevel: RiskLevel;
  possibleConditions: PossibleCondition[];
  summary: string;
  recommendation: string;
  redFlags: string[];
}

/** Full prediction record as stored in the database */
export interface Prediction {
  id: string;
  inputType: InputType;
  inputPayload: PredictionPayload;
  result: AIPredictionResponse;
  createdAt: string;
  updatedAt: string;
}

/** API response wrapper for consistent response shape */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Paginated list response */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
