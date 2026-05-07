import { RiskLevel } from "@disease-prediction/shared";
import { describe, expect, it } from "vitest";
import { AppError } from "../middlewares/errorHandler";
import { parseAiResponse } from "./parseAiResponse";

const validJson = {
  riskLevel: RiskLevel.LOW,
  possibleConditions: [
    {
      name: "Common cold",
      probability: "70%",
      description: "Viral upper respiratory infection.",
    },
  ],
  summary: "Mild viral illness suspected.",
  recommendation: "Rest and stay hydrated; consult a clinician if worse.",
  redFlags: ["Difficulty breathing"],
};

describe("parseAiResponse", () => {
  it("parses a clean JSON response", () => {
    const parsed = parseAiResponse(JSON.stringify(validJson));
    expect(parsed).toEqual(validJson);
  });

  it("parses JSON wrapped in markdown code fences and prose", () => {
    const wrapped = `Sure, here is the analysis:\n\n\`\`\`json\n${JSON.stringify(
      validJson,
    )}\n\`\`\`\n\nLet me know if you need more detail.`;
    expect(parseAiResponse(wrapped)).toEqual(validJson);
  });

  it("throws an AppError(502) when no JSON object is present", () => {
    let caught: unknown;
    try {
      parseAiResponse("no json here, just prose");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).statusCode).toBe(502);
  });

  it("throws when the embedded JSON fails aiPredictionResponseSchema", () => {
    const bad = JSON.stringify({ ...validJson, riskLevel: "not-a-risk-level" });
    expect(() => parseAiResponse(bad)).toThrow();
  });

  it("throws when JSON is structurally valid but missing required fields", () => {
    const bad = JSON.stringify({ riskLevel: RiskLevel.LOW });
    expect(() => parseAiResponse(bad)).toThrow();
  });
});
