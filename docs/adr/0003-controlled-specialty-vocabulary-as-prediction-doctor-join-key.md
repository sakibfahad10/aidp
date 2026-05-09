# A controlled Specialty vocabulary is the join key between predictions and doctors

To suggest doctors from an AI prediction, we introduce a fixed `Specialty` vocabulary in `packages/shared` and use it as the single join key: `DoctorProfile.specialties` is constrained to it, and `aiPredictionResponseSchema` gains a `recommendedSpecialties: Specialty[]` field that Gemini is prompted to populate **only** from that vocabulary. Doctor suggestion is then an exact set-overlap between a prediction's `recommendedSpecialties` and a verified doctor's `specialties` — no fuzzy text matching, no hand-maintained condition→specialty lookup.

The trade-off: this extends the existing AI prediction contract (the `aiPredictionResponseSchema` that `parseAiResponse` validates and the prompt in `GeminiService`), which a future reader might not expect a "doctor directory" feature to touch. We accept it because the controlled vocabulary is what makes matching reliable and keeps the directory filters, the doctor-side data entry, and the AI output speaking the same language — the alternatives were a brittle hand-maintained `condition → specialty` map, or free-text specialties matched by string similarity (typos/synonyms make both the suggestion and the directory filter unreliable). The cost is that the vocabulary must be maintained by hand and the Gemini prompt is coupled to it; `recommendedSpecialties` is therefore kept **tolerant** (optional, defaults to `[]`) so existing `Prediction` rows and any malformed model output never break parsing.

## Consequences

- Changing the vocabulary later is a coordinated change across the shared enum, the Gemini prompt, and existing `DoctorProfile.specialties` data.
- The same vocabulary backs three surfaces — the directory specialty filter, doctor onboarding, and the AI suggestion — so they cannot drift.
