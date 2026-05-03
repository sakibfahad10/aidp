import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  InputType,
  AIPredictionResponse,
  PredictionPayload,
  aiPredictionResponseSchema,
} from "@disease-prediction/shared";
import { config } from "../config";
import { AppError } from "../middlewares/errorHandler";

const SYSTEM_PROMPT = `You are an AI medical assistant. Analyze the provided health information and return a JSON prediction.

IMPORTANT: You must respond with ONLY valid JSON in this exact format, no markdown, no extra text:
{
  "riskLevel": "low" | "moderate" | "high" | "critical",
  "possibleConditions": [
    {
      "name": "Condition Name",
      "probability": "percentage like 75%",
      "description": "Brief description of the condition"
    }
  ],
  "summary": "A concise summary of the analysis",
  "recommendation": "What the patient should do next",
  "redFlags": ["List of any urgent warning signs to watch for"]
}

Guidelines:
- Always provide at least 1 and at most 5 possible conditions
- Be conservative with risk levels
- Always include at least one recommendation
- If symptoms are vague, mention that in the summary
- Include relevant red flags even if risk is low
- NEVER provide a definitive diagnosis, always frame as "possible conditions"
- Always recommend consulting a healthcare professional

DISCLAIMER: This is an AI-based analysis for informational purposes only and should not replace professional medical advice.`;

/**
 * Builds a human-readable prompt from the input type and payload
 */
function buildUserPrompt(inputType: InputType, payload: PredictionPayload): string {
  switch (inputType) {
    case InputType.SYMPTOM: {
      const p = payload as { symptoms: string; duration?: string; severity?: string };
      let prompt = `Patient describes the following symptoms:\n${p.symptoms}`;
      if (p.duration) prompt += `\nDuration: ${p.duration}`;
      if (p.severity) prompt += `\nSeverity: ${p.severity}`;
      return prompt;
    }
    case InputType.STRUCTURED: {
      const p = payload as {
        age: number;
        gender: string;
        symptoms: string[];
        medicalHistory?: string[];
        currentMedications?: string[];
        vitals?: Record<string, unknown>;
      };
      let prompt = `Patient Profile:\n- Age: ${p.age}\n- Gender: ${p.gender}`;
      prompt += `\n- Symptoms: ${p.symptoms.join(", ")}`;
      if (p.medicalHistory?.length) {
        prompt += `\n- Medical History: ${p.medicalHistory.join(", ")}`;
      }
      if (p.currentMedications?.length) {
        prompt += `\n- Current Medications: ${p.currentMedications.join(", ")}`;
      }
      if (p.vitals) {
        const vitals = Object.entries(p.vitals)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        if (vitals) prompt += `\n- Vitals: ${vitals}`;
      }
      return prompt;
    }
    case InputType.REPORT: {
      const p = payload as { reportText: string; reportType?: string };
      let prompt = "Medical Report Analysis:\n";
      if (p.reportType) prompt += `Report Type: ${p.reportType}\n`;
      prompt += `\n${p.reportText}`;
      return prompt;
    }
    default:
      throw new AppError(400, `Unsupported input type: ${inputType}`);
  }
}

/**
 * GeminiService handles all interactions with the Google Gemini API.
 * It builds prompts from user input and parses the structured JSON response.
 */
export class GeminiService {
  private model;

  constructor() {
    if (!config.geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }

  /**
   * Sends a prediction request to Gemini and returns a validated response
   */
  async predict(
    inputType: InputType,
    payload: PredictionPayload
  ): Promise<AIPredictionResponse> {
    const userPrompt = buildUserPrompt(inputType, payload);

    try {
      const result = await this.model.generateContent([
        SYSTEM_PROMPT,
        userPrompt,
      ]);

      const responseText = result.response.text();

      // Extract JSON from the response (handles possible markdown wrapping)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new AppError(502, "AI returned an invalid response format");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate against our expected schema
      const validated = aiPredictionResponseSchema.parse(parsed);
      return validated;
    } catch (error) {
      if (error instanceof AppError) throw error;

      console.error("Gemini API error:", error);
      throw new AppError(502, "Failed to get prediction from AI service");
    }
  }
}
