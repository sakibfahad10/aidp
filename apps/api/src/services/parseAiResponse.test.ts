import { RiskLevel, Specialty } from "@disease-prediction/shared";
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
    expect(parsed).toEqual({ ...validJson, recommendedSpecialties: [] });
  });

  it("parses JSON wrapped in markdown code fences and prose", () => {
    const wrapped = `Sure, here is the analysis:\n\n\`\`\`json\n${JSON.stringify(
      validJson,
    )}\n\`\`\`\n\nLet me know if you need more detail.`;
    expect(parseAiResponse(wrapped)).toEqual({ ...validJson, recommendedSpecialties: [] });
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

  describe("recommendedSpecialties tolerance (per ADR 0003)", () => {
    it("defaults to [] when the field is missing", () => {
      const parsed = parseAiResponse(JSON.stringify(validJson));
      expect(parsed.recommendedSpecialties).toEqual([]);
    });

    it("preserves valid specialty values", () => {
      const withValid = {
        ...validJson,
        recommendedSpecialties: [Specialty.Cardiology, Specialty.GeneralMedicine],
      };
      const parsed = parseAiResponse(JSON.stringify(withValid));
      expect(parsed.recommendedSpecialties).toEqual([
        Specialty.Cardiology,
        Specialty.GeneralMedicine,
      ]);
    });

    it("drops invalid specialty values without throwing, keeping valid ones", () => {
      const mixed = {
        ...validJson,
        recommendedSpecialties: [
          Specialty.Cardiology,
          "NotARealSpecialty",
          42,
          null,
          Specialty.Neurology,
        ],
      };
      const parsed = parseAiResponse(JSON.stringify(mixed));
      expect(parsed.recommendedSpecialties).toEqual([Specialty.Cardiology, Specialty.Neurology]);
    });

    it("defaults to [] when the field is not an array", () => {
      const bad = { ...validJson, recommendedSpecialties: "Cardiology" };
      const parsed = parseAiResponse(JSON.stringify(bad));
      expect(parsed.recommendedSpecialties).toEqual([]);
    });

    it("returns [] when every value in the array is invalid", () => {
      const allBad = {
        ...validJson,
        recommendedSpecialties: ["foo", "bar", 123],
      };
      const parsed = parseAiResponse(JSON.stringify(allBad));
      expect(parsed.recommendedSpecialties).toEqual([]);
    });
  });
});
