import { type AIPredictionResponse, aiPredictionResponseSchema } from "@disease-prediction/shared";
import { AppError } from "../middlewares/errorHandler";

/**
 * Extracts and validates an AIPredictionResponse from raw model output.
 * Tolerates leading/trailing prose or markdown fences by grabbing the
 * outermost JSON object, then validates against the shared schema.
 */
export function parseAiResponse(text: string): AIPredictionResponse {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new AppError(502, "AI returned an invalid response format");
  }
  const parsed = JSON.parse(jsonMatch[0]);
  return aiPredictionResponseSchema.parse(parsed);
}
