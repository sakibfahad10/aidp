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

## HealthProfile

A **HealthProfile** is a durable, patient-owned record of a patient's standing health facts — demographics (date of birth, gender, blood type) plus chronic conditions, current medications, and allergies. It is a first-class entity (one per [[Patient]], `userId @unique`), **not** derived from any single Prediction and **not** the same as the per-request `structuredPayload` buried in `Prediction.inputPayload`.

The HealthProfile is the literal subject of the platform's "continuity of health data" pitch: the same standing record that informs the patient's own predictions is what a [[Doctor]] sees in the appointment [[Briefing]]. The briefing is `HealthProfile` (standing facts) + recent `Prediction` history (point-in-time risk assessments) — two distinct halves.

> Resolved 2026-06-14: chosen over "profile = prediction history only" and "derived read-model snapshot." The persistent, independently-editable entity is what makes the continuity claim true rather than rhetorical.

### Fields & auto-fill

Standing fields: `age` (Int — stored directly, **not** `dateOfBirth`, so auto-fill from a prediction's `age` is lossless), `gender`, `bloodType`, `conditions[]`, `medications[]`, `allergies[]`. Plus `editedFields` — the set of field names the patient has manually edited.

A HealthProfile is populated two ways, reconciled by **edited-field tracking**:

1. **Auto-fill on structured prediction** — submitting a `structured` Prediction upserts the profile: `age → age`, `medicalHistory[] → conditions[]`, `currentMedications[] → medications[]`. Auto-fill **never overwrites a field listed in `editedFields`**; it writes all others. Transient/point-in-time data — `symptoms[]` and `vitals{}` — is **not** profile data and stays only on the Prediction.
2. **Patient editor** (`/profile`) — manual edits; every edited field is added to `editedFields` so future auto-fills skip it. `allergies` and `bloodType` have no prediction source and are editor-only.

## Patient / Doctor (roles)

Every `User` has a **primary role**: `PATIENT` (default) or `DOCTOR`, chosen at a **post-sign-in gate** (Clerk hosts sign-up and cannot capture the choice; the first authenticated visit asks "patient or doctor?" when role is unset) and mirrored on the Postgres `User` row. The primary role drives the default landing area and nav.

Roles are **not strictly exclusive**: a **Doctor may later add the Patient capability** ("register as a patient"), which provisions their own [[HealthProfile]] + Predictions + booking under the same `User` — without removing their doctor side. Patient data hangs off `userId`, so it coexists with the separate [[DoctorProfile]]. For users holding both, nav offers a context switch (doctor dashboard ↔ patient area). **One-directional for MVP**: doctor → also patient; a patient becoming a doctor uses the existing onboarding path only.

- **Patient** — a `User` who owns a [[HealthProfile]], runs Predictions, and books [[Appointment]]s. Primary-role PATIENT users, plus DOCTOR users who added the patient capability.
- **Doctor** — a `User` with primary role `DOCTOR`; owns exactly one [[DoctorProfile]] (1:1 via `userId`).

> Resolved 2026-06-14: supersedes the earlier "mutually exclusive roles" decision — a doctor must be able to register as a patient later, so `role` is now the *primary* role plus additive patient capability.

## DoctorProfile

A **DoctorProfile** holds a doctor's professional identity and practice data:

- **Contact** — `phone` and a `publicEmail` (separate from the private Clerk login email). Both are shown on the public profile; the Clerk email stays private.
- `bmdcNumber` — the BMDC registration number, the anchoring credential. `@unique`, normalized to uppercase, and **format-validated** in the shared Zod schema with `^[ABab]?-?\d{3,7}$` (optional `A`=MBBS / `B`=BDS register prefix + optional dash + 3–7 digits; e.g. `A-12345`). BMDC publishes no strict spec — this is a deliberately lenient, real-world-shaped pattern so a valid doctor is never rejected on stage; the prefix is accepted but not required (platform is MBBS-focused, dental not modeled separately).
- `qualifications`, `specialties: Specialty[]` (controlled — see [[Specialty]]), hospital `affiliation` (free-text), `city` (small fixed dropdown — the "location" filter, no geocoding), years of `experience`.
- `fee` — a **flat per-visit consultation fee** in **BDT**, stored as a whole-taka integer.

Onboarding is a **multi-step wizard** persisted as `status = draft` (resumable across steps); submit auto-verifies (see lifecycle). The DoctorProfile is the source for both the public profile (directory) and the private doctor dashboard.

### Directory & filters

Verified DoctorProfiles populate the public directory. Filters: **specialty** (controlled, multi-select), **city** (dropdown), **affiliation** (text contains). Listing/suggestion ordering: **specialty-match → has-open-slot → fee ascending**.

### Status lifecycle

A DoctorProfile has a **status**: `draft → pending → verified`.

- **draft** — being filled in during onboarding (resumable).
- **pending** — *reserved.* Defined in the enum for a future admin-review flow, but **never entered in this MVP**.
- **verified** — approved; **only verified DoctorProfiles are visible in the directory and bookable.**

For this MVP there is **no real admin review and no license-document upload**. Submitting onboarding transitions `draft → verified` directly (**auto-verify on submit**), so a freshly-onboarded doctor is immediately bookable on stage. A seed script also creates a couple of verified doctors for initial directory data.

> Resolved 2026-06-14: auto-verify chosen over a dev verify-script and over a seed-only dead-end, to keep the live signup loop complete. Trade-off: the "verification" step is not part of the demo narrative.

## AvailabilitySlot

A **AvailabilitySlot** is one concrete bookable time owned by a [[Doctor]]: `{ doctorId, startTime, status: open | booked }`. Slots are **concrete rows**, never computed from recurring rules — enumerable rows the UI lists directly, no recurrence/timezone machinery.

A doctor creates slots through an **availability editor** (on the dashboard, also surfaced as the final onboarding step): the doctor toggles concrete time slots on a date/time grid (~next 1–2 weeks) and **each toggle materializes one `open` AvailabilitySlot row**. (Seeded doctors get their slots from the seed script.) This is the "doctor defines availability" choice — more control than auto-generation, while still producing the same concrete rows the simple slot model requires.

## Appointment

An **Appointment** links a [[Patient]] and a [[Doctor]] through one slot: `{ patientId, doctorId, slotId @unique, note?, createdAt }`. The optional `note` is a free-text message the patient may add at booking (reason for visit); it surfaces on the doctor's dashboard alongside the [[Briefing]]. Booking is a transaction: flip the chosen AvailabilitySlot `open → booked` and insert the Appointment. The `slotId @unique` constraint is what prevents double-booking — no custom locking. **Upcoming vs past** is derived by comparing the slot's `startTime` to now; there is no cancellation flow in this MVP. An Appointment appears on both the patient's view and the doctor's dashboard, with a [[Briefing]] attached.

> Resolved 2026-06-14: pre-generated slots chosen over recurring availability rules and over free-form datetimes — the UX needs enumerable, uniquely-bookable slots and "slot handling can stay simple."

## Briefing

A **Briefing** is the patient-context summary shown to a [[Doctor]] for each [[Appointment]] on their dashboard — the dashboard centerpiece and the most visible proof of the "continuity of health data" pitch. It is a **read-time projection**, not a stored entity:

`Briefing = the booked Patient's real HealthProfile + their recent Prediction history + a templated narrative summary`

- **Real data.** The profile (standing facts: age, blood type, conditions, medications, allergies) and the prediction list — the **5 most recent** [[Prediction]]s — are the *actual* booked [[Patient]]'s rows, the same data the patient entered. This is what makes continuity genuine rather than theater. The patient's booking note (if any) is also surfaced.
- **Stubbed prose.** Only the AI-*written* narrative paragraph is faked — a template, **not a Gemini call**. ("Populated from sample data" refers to skipping the AI call, **not** faking the patient data.)
- **Computed on the fly** at dashboard render — always reflects the patient's latest profile; no `Briefing` table and no booking-time snapshot (so no staleness).

> Demo dependency: the briefing only renders if the booked patient has a real `HealthProfile` **and** `Prediction` history.

> Seeding (resolved 2026-06-14): **full seed**. The seed creates: (1) a few verified [[DoctorProfile]]s (varied specialty/city/affiliation, each with open [[AvailabilitySlot]]s); (2) several demo [[Patient]]s each with a real [[HealthProfile]] **and** [[Prediction]] history; (3) a handful of pre-booked [[Appointment]]s spanning **upcoming and past** across doctors. So every screen — directory, doctor dashboard, [[Briefing]], patient appointments — is populated on first load, and live booking still works on top. Chosen over doctors-only (briefing fragile, empty "past appointments", heavy live setup).

> Resolved 2026-06-14: real-data/stubbed-prose chosen over a stored snapshot (staleness + extra entity) and over an entirely-canned briefing (continuity becomes theater).

## Specialty (controlled vocabulary)

A **Specialty** is a value from a **fixed, shared vocabulary** defined in `packages/shared`. It is the single join key linking AI predictions to doctors.

**Starter set** (proposed — refine before building): `GeneralMedicine`, `Cardiology`, `Endocrinology`, `Dermatology`, `Gastroenterology`, `Neurology`, `Pulmonology`, `Nephrology`, `Orthopedics`, `Rheumatology`, `Pediatrics`, `Psychiatry`, `Gynecology`, `ENT`, `Ophthalmology`, `Urology`, `InfectiousDisease`, `GeneralSurgery`. `GeneralMedicine` is the **fallback** so every prediction can map to at least one specialty.

It is the single join key linking AI predictions to doctors:

- `DoctorProfile.specialties: Specialty[]` — what a doctor practices (controlled, not free text).
- `aiPredictionResponseSchema.recommendedSpecialties: Specialty[]` — emitted by Gemini, which is instructed to pick **only** from the vocabulary. Tolerant: optional / defaults to `[]` so existing `Prediction` rows and malformed model output don't break parsing.

### Doctor suggestion

After a [[Patient]]'s prediction, the platform suggests doctors whose `specialties` **overlap** the prediction's `recommendedSpecialties`, restricted to `verified` [[DoctorProfile]]s. Surfaced on the prediction result card as a deep-link into the directory pre-filtered by that specialty. "Other factors" stay minimal for MVP (see directory filters / ordering).

> Resolved 2026-06-14: controlled vocab + Gemini-emitted specialty chosen over a hand-maintained condition→specialty map (brittle) and free-text fuzzy matching (unreliable). This is a cross-cutting change to the existing prediction contract.
