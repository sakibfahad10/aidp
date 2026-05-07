# Domain Context

This document defines domain terms used across MedPredict AI. Terms here are the source of truth for naming and behavior; the schemas in `packages/shared` and the prompts in `apps/api` implement them.

## Report

A **Report** is one of the three `InputType` submissions on `/predict`, alongside **Symptom** and **Structured**. A Report represents a medical document the patient already has — a lab result, an X-ray summary, a discharge note, a scanned PDF, a phone photo of a printout — that the platform analyzes directly to produce the same risk-card output as the other input types.

### Submission shapes

A single Report submission is **text XOR file** — never both, never multiple files:

- **Pasted text** — free-form report text (20 – 10 000 characters), with an optional `reportType` tag (e.g. "Blood Test", "X-Ray"). Submitted as JSON to `POST /api/v1/predict` under the `report` branch of the `predictRequestSchema` discriminated union.
- **Uploaded document** — a single file: `application/pdf`, `image/jpeg`, or `image/png`, ≤ **10 MB**, with the same optional `reportType` tag. Submitted as `multipart/form-data` to the dedicated `POST /api/v1/predict/report-file` endpoint (see [ADR 0002](docs/adr/0002-multipart-upload-for-report-files.md)).

The `InputType` enum value is `report` for both shapes; no schema or Prisma migration distinguishes them. The UI chooses between them with a per-submission mode toggle (Upload default, Paste text).

### Processing

The document — text or file — is handed to the multimodal Gemini model (`gemini-2.5-flash`) in a single `generateContent` call. Files are passed as `inlineData` (base64 + `mimeType`) inside the request; **no OCR library and no separate text-extraction step** sits between the upload and the model. Gemini reads PDFs and images natively. Both paths share the same response handling: `parseAiResponse(text)` (extracted from `GeminiService`) regex-matches the JSON, parses it, and validates it against `aiPredictionResponseSchema`, so the returned `Prediction` shape is identical regardless of which Report shape was submitted.

### Persistence (PII handling)

A Report file is treated as medical PII and is **never persisted at rest**. multer's `memoryStorage` keeps the buffer in memory only long enough to forward it to Gemini, then drops it — no disk write, no database row, no external object storage.

What *is* persisted in the `Prediction.inputPayload` for a file Report is **metadata only**:

```ts
{ reportType?, fileName, mimeType, fileSizeBytes }
```

The AI result (`riskLevel`, `possibleConditions`, `summary`, `recommendation`, `redFlags`) is persisted as for any other prediction. For a pasted-text Report, the persisted payload is the full `reportText` plus optional `reportType` — same as today.

### Related terms

- **InputType** — the enum (`symptom | structured | report`) that drives polymorphism end-to-end: the Zod discriminated union in `packages/shared`, the prompt switch in `GeminiService.buildUserPrompt()`, and three separate frontend forms.
- **Prediction** — the persisted record: `inputType`, `inputPayload`, `result`, plus timestamps. A Report submission produces a Prediction whose `inputType` is `report` and whose `inputPayload` is either the text payload or the file-metadata payload described above.
