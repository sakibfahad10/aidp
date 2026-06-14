# Doctor-side QA — quick smoke test

Happy-path manual checklist for the MedPredict AI doctor side (epic #9). One pass should take ~20–30 min. Check each box as you confirm the **Expected** result.

## Prerequisites

**Env vars** (`apps/api/.env` and `apps/web/.env`): valid `CLERK_*` keys, a real `GEMINI_API_KEY` (predictions call Gemini), and `DATABASE_URL`. The API refuses to start if any are missing.

**Run (from repo root):**
```bash
pnpm install
pnpm db:generate && pnpm db:push   # create schema
pnpm db:seed                       # demo doctors/patients/appointments
pnpm dev:api                       # API on :4000 (builds packages first)
pnpm dev:web                       # web on :3000
```
Open http://localhost:3000.

> **You cannot log in as a seeded doctor/patient** — seeded users are DB-only. They appear in the public directory and are bookable, but for the dashboard/briefing you must create your own accounts below.

**Test accounts (create fresh via Clerk sign-up):**
- **DOC** — your doctor account.
- **PAT** — your patient account.

Use two browsers (or one normal + one incognito) so DOC and PAT stay signed in at once. Suggested order: set up DOC first (so it has open slots), then PAT books DOC, then view the briefing as DOC.

---

## A. Doctor setup

### 1. Doctor sign-up + role gate
- [ ] As **DOC**, sign up at `/sign-up`. You're routed to `/role-gate`.
- [ ] Click **Continue as Doctor**.
- **Expected:** redirected to `/doctor/onboarding`.

### 2. Doctor onboarding wizard → verified
- [ ] Step **Contact**: phone (e.g. `+8801712345678`) + public email → **Save & continue**.
- [ ] Step **Credentials**: BMDC `A-12345` + qualifications (e.g. `MBBS, FCPS (Cardiology)`) → **Save & continue**.
- [ ] Step **Practice**: toggle ≥1 specialty (e.g. Cardiology), affiliation, pick a city → **Save & continue**.
- [ ] Step **Experience & fee**: experience years + fee in BDT → **Save & continue**.
- [ ] Step **Review & submit**: confirm summary → **Submit & verify**.
- **Expected:** submit succeeds and redirects to `/predict`; the doctor is now verified/visible.

### 3. Availability editor (open slots)
- [ ] As **DOC**, go to **Dashboard → Availability** (`/doctor/availability`).
- [ ] Click a few **Free** cells to turn them **Open** (green).
- **Expected:** clicked cells flip to **Open** and persist after **Refresh**.

---

## B. Patient activity

### 4. Patient sign-up + role gate
- [ ] As **PAT**, sign up at `/sign-up` → `/role-gate` → **Continue as Patient**.
- **Expected:** redirected to `/predict`; navbar shows Predict, History, Appointments, Profile.

### 5. Run a prediction + AI doctor suggestion
- [ ] On `/predict`, use the **Structured** tab; fill age/gender/symptoms (+ optional history/meds) → submit (**Analyze Health Data**).
- **Expected:** result card shows risk level, possible conditions, recommendation, and a **Suggested Doctors** section with a **View {specialty} →** deep-link.
- [ ] Click a **View {specialty} →** link.
- **Expected:** lands on `/doctors` pre-filtered to that specialty.

### 6. Health profile auto-fill + edit
- [ ] Go to **Profile** (`/profile`).
- **Expected:** age/gender/conditions/medications are **auto-filled** from the structured prediction in step 5.
- [ ] Edit a field (e.g. add an **allergy**, set **blood type**) → **Save changes**.
- **Expected:** "Profile saved."; edited fields show an **EDITED** badge.

---

## C. Booking link

### 7. Browse directory + filters
- [ ] Go to **Doctors** (`/doctors`).
- [ ] Apply a **specialty** / **city** / **affiliation** filter.
- **Expected:** list narrows to matching verified doctors (seeded doctors + your **DOC** appear).

### 8. Public profile + book a slot
- [ ] Open your **DOC** profile from the directory.
- **Expected:** shows specialties, qualifications, experience, affiliation, city, fee, and **open slots** (from step 3).
- [ ] Pick an open slot, add a **note** (e.g. "Chest tightness on exertion") → **Book selected slot**.
- **Expected:** "Appointment booked" banner; the slot disappears from the list.

### 9. Patient appointments view
- [ ] Go to **Appointments** (`/appointments`).
- **Expected:** the booking appears under **Upcoming** with DOC's name, time, and your note.

---

## D. The briefing (centerpiece)

### 10. Doctor dashboard + patient-context briefing
- [ ] Switch to **DOC**, go to **Dashboard → Appointments** (`/doctor/appointments`).
- **Expected:** the **Upcoming** appointment from PAT shows a **briefing card** containing:
  - PAT's standing facts (age, gender, blood type, conditions, medications, the **allergy** you added),
  - PAT's **recent predictions** (incl. the one from step 5),
  - the **booking note** from step 8,
  - a short narrative **summary** at the top.
- **This is the continuity money-shot:** the exact profile + predictions PAT entered are what DOC sees.

---

## E. Dual-role

### 11. Doctor "register as a patient" + context switch
- [ ] As **DOC**, click **Register as patient** in the navbar.
- **Expected:** patient nav (Predict/History/Profile) appears and context switches to patient.
- [ ] Use the **Switch to Doctor / Switch to Patient** toggle.
- **Expected:** nav and landing switch between the doctor dashboard and the patient area; selection persists across reloads.

---

### Sign-off
- [ ] All 11 cases pass on a clean seed + fresh DOC/PAT accounts.
