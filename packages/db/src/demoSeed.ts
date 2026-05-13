/**
 * Pure data generator for the full demo seed (issue #19).
 *
 * Used by `prisma/seed.ts` to populate verified doctors, data-rich patients,
 * a per-patient prediction history, open availability slots, and
 * pre-booked appointments spanning upcoming and past. Defined here as a
 * pure function so the plan is deterministic and unit-testable: same
 * `anchor` in → byte-identical plan out.
 *
 * Idempotency strategy:
 * - Every User / DoctorProfile / HealthProfile / Prediction carries a stable
 *   string ID. The runner upserts by id (or by the model's `@unique` column),
 *   so re-running on the same day is a clean no-op write.
 * - AvailabilitySlot rows are keyed by `(doctorId, startTime)` (the schema's
 *   compound unique). The runner wipes every slot for the demo doctors
 *   before re-creating, so cross-day reruns don't leave stale slot rows
 *   from yesterday's anchor lying around. Appointments cascade with their
 *   slot, so they reset cleanly too.
 *
 * Anchor: caller passes "today" (the runner passes `new Date()`). Slot
 * times are computed as offsets from `anchor`'s midnight UTC, so any two
 * runs on the same UTC day yield the same `startTime`s.
 */

import type {
  City as PrismaCity,
  DoctorStatus as PrismaDoctorStatus,
  InputType as PrismaInputType,
  RiskLevel as PrismaRiskLevel,
  SlotStatus as PrismaSlotStatus,
  Specialty as PrismaSpecialty,
} from "@prisma/client";

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: "PATIENT" | "DOCTOR";
  patientCapability: boolean;
}

export interface DemoDoctorProfile {
  id: string;
  userId: string;
  phone: string;
  publicEmail: string;
  bmdcNumber: string;
  qualifications: string;
  specialties: PrismaSpecialty[];
  affiliation: string;
  city: PrismaCity;
  experienceYears: number;
  feeBdt: number;
  status: PrismaDoctorStatus;
}

export interface DemoHealthProfile {
  userId: string;
  age: number;
  gender: string;
  bloodType: string;
  conditions: string[];
  medications: string[];
  allergies: string[];
  editedFields: string[];
}

export interface DemoPrediction {
  id: string;
  userId: string;
  inputType: PrismaInputType;
  inputPayload: Record<string, unknown>;
  result: Record<string, unknown>;
  riskLevel: PrismaRiskLevel;
  summary: string;
  /** Hours-before-`anchor` so each patient's history has a real timeline. */
  createdHoursAgo: number;
}

export interface DemoSlot {
  id: string;
  doctorId: string;
  startTime: Date;
  status: PrismaSlotStatus;
}

export interface DemoAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  slotId: string;
  note: string | null;
}

export interface DemoSeedPlan {
  users: DemoUser[];
  doctorProfiles: DemoDoctorProfile[];
  healthProfiles: DemoHealthProfile[];
  predictions: DemoPrediction[];
  slots: DemoSlot[];
  appointments: DemoAppointment[];
}

/** Stable IDs the runner uses for deleteMany() cleanup. */
export const DEMO_DOCTOR_USER_IDS = [
  "demo_doc_user_1",
  "demo_doc_user_2",
  "demo_doc_user_3",
  "demo_doc_user_4",
  "demo_doc_user_5",
] as const;

export const DEMO_DOCTOR_PROFILE_IDS = [
  "demo_doc_profile_1",
  "demo_doc_profile_2",
  "demo_doc_profile_3",
  "demo_doc_profile_4",
  "demo_doc_profile_5",
] as const;

export const DEMO_PATIENT_USER_IDS = [
  "demo_patient_user_1",
  "demo_patient_user_2",
  "demo_patient_user_3",
  "demo_patient_user_4",
  "demo_patient_user_5",
] as const;

/** Anchor → today at 00:00 UTC. Stable across re-runs on the same UTC day. */
function midnightUtc(anchor: Date): Date {
  return new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate(), 0, 0, 0, 0),
  );
}

/** Offset midnight by `dayOffset` days and `hourOfDay` hours (UTC). */
function slotAt(midnight: Date, dayOffset: number, hourOfDay: number): Date {
  return new Date(midnight.getTime() + dayOffset * 86_400_000 + hourOfDay * 3_600_000);
}

interface DoctorSpec {
  userId: string;
  profileId: string;
  email: string;
  publicEmail: string;
  name: string;
  phone: string;
  bmdcNumber: string;
  qualifications: string;
  specialties: PrismaSpecialty[];
  affiliation: string;
  city: PrismaCity;
  experienceYears: number;
  feeBdt: number;
}

const DOCTORS: DoctorSpec[] = [
  {
    userId: "demo_doc_user_1",
    profileId: "demo_doc_profile_1",
    email: "demo.doctor.1@medpredict.demo",
    publicEmail: "aminul.karim@square-hospital.demo",
    name: "Dr. Aminul Karim",
    phone: "+8801711111111",
    bmdcNumber: "A-12345",
    qualifications: "MBBS, FCPS (Cardiology)",
    specialties: ["Cardiology"],
    affiliation: "Square Hospital",
    city: "Dhaka",
    experienceYears: 15,
    feeBdt: 1500,
  },
  {
    userId: "demo_doc_user_2",
    profileId: "demo_doc_profile_2",
    email: "demo.doctor.2@medpredict.demo",
    publicEmail: "shabnam.akter@evercare.demo",
    name: "Dr. Shabnam Akter",
    phone: "+8801722222222",
    bmdcNumber: "A-23456",
    qualifications: "MBBS, MD (Endocrinology)",
    specialties: ["Endocrinology", "GeneralMedicine"],
    affiliation: "Evercare Hospital",
    city: "Dhaka",
    experienceYears: 10,
    feeBdt: 1200,
  },
  {
    userId: "demo_doc_user_3",
    profileId: "demo_doc_profile_3",
    email: "demo.doctor.3@medpredict.demo",
    publicEmail: "rafiqul.islam@cmch.demo",
    name: "Dr. Rafiqul Islam",
    phone: "+8801733333333",
    bmdcNumber: "A-34567",
    qualifications: "MBBS, DDV (Dermatology)",
    specialties: ["Dermatology"],
    affiliation: "Chittagong Medical College Hospital",
    city: "Chattogram",
    experienceYears: 8,
    feeBdt: 800,
  },
  {
    userId: "demo_doc_user_4",
    profileId: "demo_doc_profile_4",
    email: "demo.doctor.4@medpredict.demo",
    publicEmail: "tahmina.rahman@nemch.demo",
    name: "Dr. Tahmina Rahman",
    phone: "+8801744444444",
    bmdcNumber: "A-45678",
    qualifications: "MBBS, FCPS (Pediatrics)",
    specialties: ["Pediatrics"],
    affiliation: "North East Medical College Hospital",
    city: "Sylhet",
    experienceYears: 12,
    feeBdt: 1000,
  },
  {
    userId: "demo_doc_user_5",
    profileId: "demo_doc_profile_5",
    email: "demo.doctor.5@medpredict.demo",
    publicEmail: "mahbub.hossain@rmch.demo",
    name: "Dr. Mahbub Hossain",
    phone: "+8801755555555",
    bmdcNumber: "A-56789",
    qualifications: "MBBS, MD (Internal Medicine)",
    specialties: ["GeneralMedicine"],
    affiliation: "Rajshahi Medical College Hospital",
    city: "Rajshahi",
    experienceYears: 20,
    feeBdt: 600,
  },
];

interface PredictionSpec {
  inputType: PrismaInputType;
  riskLevel: PrismaRiskLevel;
  summary: string;
  recommendedSpecialties: PrismaSpecialty[];
  daysAgo: number;
  inputPayload: Record<string, unknown>;
  possibleConditions: Array<{ name: string; probability: string; description: string }>;
  recommendation: string;
  redFlags: string[];
}

interface PatientSpec {
  userId: string;
  email: string;
  name: string;
  health: Omit<DemoHealthProfile, "userId">;
  predictions: PredictionSpec[];
}

const PATIENTS: PatientSpec[] = [
  {
    userId: "demo_patient_user_1",
    email: "demo.patient.1@medpredict.demo",
    name: "Anika Rahman",
    health: {
      age: 42,
      gender: "female",
      bloodType: "A+",
      conditions: ["Type 2 diabetes", "Hypertension"],
      medications: ["Metformin 500mg", "Amlodipine 5mg"],
      allergies: ["Penicillin"],
      editedFields: ["bloodType", "allergies"],
    },
    predictions: [
      {
        inputType: "structured",
        riskLevel: "moderate",
        summary: "Elevated fasting glucose with controlled blood pressure on current regimen.",
        recommendedSpecialties: ["Endocrinology"],
        daysAgo: 21,
        inputPayload: {
          age: 42,
          gender: "female",
          symptoms: ["frequent urination", "fatigue"],
          medicalHistory: ["Type 2 diabetes", "Hypertension"],
          currentMedications: ["Metformin 500mg", "Amlodipine 5mg"],
          vitals: { bloodPressure: "138/86", heartRate: 78 },
        },
        possibleConditions: [
          {
            name: "Suboptimally controlled type 2 diabetes",
            probability: "moderate",
            description: "Symptoms and history are consistent with rising HbA1c.",
          },
        ],
        recommendation: "Book an endocrinologist; bring last HbA1c reading.",
        redFlags: [],
      },
      {
        inputType: "symptom",
        riskLevel: "high",
        summary: "Episodic chest tightness on exertion in a patient with hypertension.",
        recommendedSpecialties: ["Cardiology"],
        daysAgo: 6,
        inputPayload: {
          symptoms:
            "Tight squeezing chest pain when climbing stairs, lasts 5 minutes, eases with rest.",
          duration: "Two weeks",
          severity: "Moderate",
        },
        possibleConditions: [
          {
            name: "Stable angina",
            probability: "high",
            description: "Exertional pattern is classic for ischemic chest pain.",
          },
        ],
        recommendation: "See a cardiologist within 1–2 weeks for an ECG and risk stratification.",
        redFlags: ["Chest pain at rest", "Pain radiating to jaw or arm"],
      },
      {
        inputType: "structured",
        riskLevel: "low",
        summary: "General check on a stable patient — no acute findings.",
        recommendedSpecialties: ["GeneralMedicine"],
        daysAgo: 1,
        inputPayload: {
          age: 42,
          gender: "female",
          symptoms: ["mild headache"],
          medicalHistory: ["Type 2 diabetes", "Hypertension"],
          currentMedications: ["Metformin 500mg", "Amlodipine 5mg"],
          vitals: { bloodPressure: "128/82", heartRate: 74 },
        },
        possibleConditions: [
          {
            name: "Tension headache",
            probability: "high",
            description: "Most likely a benign tension-type headache.",
          },
        ],
        recommendation: "Hydration, rest, and follow up if symptoms worsen.",
        redFlags: [],
      },
    ],
  },
  {
    userId: "demo_patient_user_2",
    email: "demo.patient.2@medpredict.demo",
    name: "Tanvir Hasan",
    health: {
      age: 34,
      gender: "male",
      bloodType: "O+",
      conditions: ["Asthma"],
      medications: ["Salbutamol inhaler"],
      allergies: ["Dust mites", "Pollen"],
      editedFields: ["allergies"],
    },
    predictions: [
      {
        inputType: "symptom",
        riskLevel: "moderate",
        summary: "Persistent dry cough and wheeze in an asthmatic.",
        recommendedSpecialties: ["Pulmonology"],
        daysAgo: 12,
        inputPayload: {
          symptoms:
            "Dry cough at night, mild wheeze, no fever, has been ongoing for about ten days.",
          duration: "Ten days",
          severity: "Moderate",
        },
        possibleConditions: [
          {
            name: "Asthma exacerbation",
            probability: "high",
            description: "Pattern matches a viral-triggered exacerbation in a known asthmatic.",
          },
        ],
        recommendation: "See a pulmonologist; consider a short course of inhaled corticosteroids.",
        redFlags: ["Severe shortness of breath", "Lips turning blue"],
      },
      {
        inputType: "report",
        riskLevel: "low",
        summary: "Lung function test shows mild reversible obstruction — well-controlled asthma.",
        recommendedSpecialties: ["Pulmonology"],
        daysAgo: 2,
        inputPayload: {
          reportText:
            "Spirometry shows mild obstructive pattern with 14% post-bronchodilator reversibility. " +
            "No restrictive features. Patient asymptomatic at rest.",
          reportType: "Spirometry",
        },
        possibleConditions: [
          {
            name: "Well-controlled asthma",
            probability: "high",
            description: "Reversible obstruction with no acute features.",
          },
        ],
        recommendation: "Continue current inhaler regimen; review with pulmonologist in 6 months.",
        redFlags: [],
      },
    ],
  },
  {
    userId: "demo_patient_user_3",
    email: "demo.patient.3@medpredict.demo",
    name: "Sumaiya Chowdhury",
    health: {
      age: 29,
      gender: "female",
      bloodType: "B+",
      conditions: [],
      medications: [],
      allergies: ["Shellfish"],
      editedFields: ["allergies", "bloodType"],
    },
    predictions: [
      {
        inputType: "symptom",
        riskLevel: "low",
        summary: "Intermittent skin rash, likely contact-related.",
        recommendedSpecialties: ["Dermatology"],
        daysAgo: 8,
        inputPayload: {
          symptoms:
            "Red itchy rash on forearms after gardening, fades in a day or two without treatment.",
          duration: "Recurring over the past month",
          severity: "Mild",
        },
        possibleConditions: [
          {
            name: "Contact dermatitis",
            probability: "high",
            description: "Pattern and timing strongly suggest plant-contact dermatitis.",
          },
        ],
        recommendation: "Avoid bare-skin contact with plants; topical antihistamine if needed.",
        redFlags: [],
      },
      {
        inputType: "structured",
        riskLevel: "low",
        summary: "Routine check — no concerning findings.",
        recommendedSpecialties: ["GeneralMedicine"],
        daysAgo: 3,
        inputPayload: {
          age: 29,
          gender: "female",
          symptoms: ["occasional fatigue"],
          vitals: { bloodPressure: "118/76", heartRate: 70 },
        },
        possibleConditions: [
          {
            name: "Mild fatigue, lifestyle-related",
            probability: "moderate",
            description: "No vitals concerns; lifestyle review recommended.",
          },
        ],
        recommendation: "Sleep hygiene, hydration, and a balanced diet.",
        redFlags: [],
      },
    ],
  },
  {
    userId: "demo_patient_user_4",
    email: "demo.patient.4@medpredict.demo",
    name: "Rashedul Karim",
    health: {
      age: 58,
      gender: "male",
      bloodType: "AB+",
      conditions: ["Coronary artery disease", "Hyperlipidemia"],
      medications: ["Atorvastatin 20mg", "Aspirin 75mg"],
      allergies: [],
      editedFields: ["bloodType"],
    },
    predictions: [
      {
        inputType: "structured",
        riskLevel: "high",
        summary: "Known CAD patient with rising LDL despite statin therapy.",
        recommendedSpecialties: ["Cardiology"],
        daysAgo: 30,
        inputPayload: {
          age: 58,
          gender: "male",
          symptoms: ["mild exertional fatigue"],
          medicalHistory: ["Coronary artery disease", "Hyperlipidemia"],
          currentMedications: ["Atorvastatin 20mg", "Aspirin 75mg"],
          vitals: { bloodPressure: "144/90", heartRate: 82 },
        },
        possibleConditions: [
          {
            name: "Sub-optimally controlled hyperlipidemia",
            probability: "high",
            description: "LDL likely above target on current dose.",
          },
        ],
        recommendation: "Cardiology review; consider statin dose escalation.",
        redFlags: ["Resting chest pain", "Worsening shortness of breath"],
      },
      {
        inputType: "report",
        riskLevel: "moderate",
        summary: "Lipid panel shows partial response to higher statin dose.",
        recommendedSpecialties: ["Cardiology"],
        daysAgo: 10,
        inputPayload: {
          reportText:
            "Total cholesterol 5.8 mmol/L, LDL 3.6 mmol/L, HDL 1.0 mmol/L, triglycerides 1.9 mmol/L. " +
            "Improvement from prior panel but still above target for secondary-prevention.",
          reportType: "Lipid panel",
        },
        possibleConditions: [
          {
            name: "Hyperlipidemia, partially controlled",
            probability: "high",
            description: "Persistent elevation despite therapy.",
          },
        ],
        recommendation: "Continue titration; cardiology follow-up in 4 weeks.",
        redFlags: [],
      },
      {
        inputType: "symptom",
        riskLevel: "critical",
        summary: "New-onset resting chest tightness with diaphoresis — possible ACS.",
        recommendedSpecialties: ["Cardiology"],
        daysAgo: 1,
        inputPayload: {
          symptoms:
            "Sudden tight chest pain at rest, lasted twenty minutes, with sweating and nausea, " +
            "now resolved.",
          duration: "Single episode this morning",
          severity: "Severe",
        },
        possibleConditions: [
          {
            name: "Acute coronary syndrome",
            probability: "high",
            description: "Resting ischemic chest pain with autonomic features.",
          },
        ],
        recommendation: "Seek emergency assessment now — do not wait.",
        redFlags: ["Pain returning at rest", "Loss of consciousness", "Severe breathlessness"],
      },
    ],
  },
  {
    userId: "demo_patient_user_5",
    email: "demo.patient.5@medpredict.demo",
    name: "Nusrat Jahan",
    health: {
      age: 31,
      gender: "female",
      bloodType: "O-",
      conditions: ["Migraine"],
      medications: ["Sumatriptan PRN"],
      allergies: [],
      editedFields: ["bloodType"],
    },
    predictions: [
      {
        inputType: "symptom",
        riskLevel: "moderate",
        summary: "Recurrent migraines with aura — pattern unchanged.",
        recommendedSpecialties: ["Neurology"],
        daysAgo: 14,
        inputPayload: {
          symptoms:
            "Throbbing one-sided headache preceded by visual zig-zags, lasting 4 to 6 hours, " +
            "responsive to sumatriptan.",
          duration: "Two episodes this month",
          severity: "Moderate",
        },
        possibleConditions: [
          {
            name: "Migraine with aura",
            probability: "high",
            description: "Classic presentation with reliable abortive response.",
          },
        ],
        recommendation: "Neurology review; consider prophylactic therapy.",
        redFlags: ["First-ever severe headache", "Sudden thunderclap onset"],
      },
      {
        inputType: "structured",
        riskLevel: "low",
        summary: "Routine wellness check — vitals within normal range.",
        recommendedSpecialties: ["GeneralMedicine"],
        daysAgo: 4,
        inputPayload: {
          age: 31,
          gender: "female",
          symptoms: ["headache", "mild fatigue"],
          medicalHistory: ["Migraine"],
          vitals: { bloodPressure: "116/74", heartRate: 68 },
        },
        possibleConditions: [
          {
            name: "Tension headache overlapping with migraine pattern",
            probability: "moderate",
            description: "Different headache character on this visit.",
          },
        ],
        recommendation: "Hydration, sleep hygiene; review if frequency rises.",
        redFlags: [],
      },
    ],
  },
];

/**
 * Open future slots created for every doctor. Appointment-driven slots are
 * created separately from APPOINTMENTS below. The runner re-creates all
 * slots from scratch on every run so cross-day reruns stay clean — only
 * the slots in this plan exist in DB after seeding.
 */
const OPEN_SLOT_OFFSETS: Array<{ dayOffset: number; hour: number }> = [
  { dayOffset: 1, hour: 10 },
  { dayOffset: 1, hour: 14 },
  { dayOffset: 2, hour: 11 },
  { dayOffset: 3, hour: 16 },
];

interface AppointmentSpec {
  patientIndex: number;
  doctorIndex: number;
  /** Negative for past, positive for upcoming. */
  dayOffset: number;
  hour: number;
  note: string | null;
}

const APPOINTMENTS: AppointmentSpec[] = [
  // Past: Anika saw the cardiologist three weeks back.
  {
    patientIndex: 0,
    doctorIndex: 0,
    dayOffset: -22,
    hour: 15,
    note: "Follow-up on exertional chest tightness — bringing recent ECG.",
  },
  // Past: Tanvir saw the pulmonologist last week.
  {
    patientIndex: 1,
    doctorIndex: 4,
    dayOffset: -7,
    hour: 11,
    note: null,
  },
  // Past: Rashedul saw the cardiologist two weeks back.
  {
    patientIndex: 3,
    doctorIndex: 0,
    dayOffset: -14,
    hour: 9,
    note: "Routine review for hyperlipidemia.",
  },
  // Upcoming: Anika books endocrinology in two days.
  {
    patientIndex: 0,
    doctorIndex: 1,
    dayOffset: 2,
    hour: 9,
    note: "Diabetes review — bringing fasting glucose log.",
  },
  // Upcoming: Sumaiya books dermatology in three days.
  {
    patientIndex: 2,
    doctorIndex: 2,
    dayOffset: 3,
    hour: 10,
    note: "Recurring rash on forearms after gardening.",
  },
  // Upcoming: Rashedul re-books cardiology urgently tomorrow.
  {
    patientIndex: 3,
    doctorIndex: 0,
    dayOffset: 1,
    hour: 8,
    note: "Same-day urgent review following resting chest tightness.",
  },
  // Upcoming: Nusrat books pediatrics for her child (uses Dr. Tahmina).
  {
    patientIndex: 4,
    doctorIndex: 3,
    dayOffset: 4,
    hour: 12,
    note: "Bringing 6-year-old for recurrent ear infections.",
  },
];

/**
 * Build the full demo seed plan. Pure: same anchor in → identical plan out.
 * The runner is responsible for applying the plan to Postgres.
 */
export function buildDemoSeedPlan(anchor: Date): DemoSeedPlan {
  const midnight = midnightUtc(anchor);

  const users: DemoUser[] = [];
  const doctorProfiles: DemoDoctorProfile[] = [];
  const slots: DemoSlot[] = [];
  const healthProfiles: DemoHealthProfile[] = [];
  const predictions: DemoPrediction[] = [];
  const appointments: DemoAppointment[] = [];

  for (const [docIndex, doc] of DOCTORS.entries()) {
    users.push({
      id: doc.userId,
      email: doc.email,
      name: doc.name,
      role: "DOCTOR",
      patientCapability: false,
    });
    doctorProfiles.push({
      id: doc.profileId,
      userId: doc.userId,
      phone: doc.phone,
      publicEmail: doc.publicEmail,
      bmdcNumber: doc.bmdcNumber,
      qualifications: doc.qualifications,
      specialties: doc.specialties,
      affiliation: doc.affiliation,
      city: doc.city,
      experienceYears: doc.experienceYears,
      feeBdt: doc.feeBdt,
      status: "verified",
    });
    for (const [slotIndex, offset] of OPEN_SLOT_OFFSETS.entries()) {
      slots.push({
        id: `demo_slot_open_${docIndex + 1}_${slotIndex + 1}`,
        doctorId: doc.profileId,
        startTime: slotAt(midnight, offset.dayOffset, offset.hour),
        status: "open",
      });
    }
  }

  for (const [patientIndex, patient] of PATIENTS.entries()) {
    users.push({
      id: patient.userId,
      email: patient.email,
      name: patient.name,
      role: "PATIENT",
      patientCapability: true,
    });
    healthProfiles.push({ userId: patient.userId, ...patient.health });
    for (const [predIndex, pred] of patient.predictions.entries()) {
      predictions.push({
        id: `demo_pred_${patientIndex + 1}_${predIndex + 1}`,
        userId: patient.userId,
        inputType: pred.inputType,
        inputPayload: pred.inputPayload,
        result: {
          riskLevel: pred.riskLevel,
          possibleConditions: pred.possibleConditions,
          summary: pred.summary,
          recommendation: pred.recommendation,
          redFlags: pred.redFlags,
          recommendedSpecialties: pred.recommendedSpecialties,
        },
        riskLevel: pred.riskLevel,
        summary: pred.summary,
        createdHoursAgo: pred.daysAgo * 24,
      });
    }
  }

  for (const [apptIndex, appt] of APPOINTMENTS.entries()) {
    const patient = PATIENTS[appt.patientIndex];
    const doctor = DOCTORS[appt.doctorIndex];
    if (!patient || !doctor) continue;
    const slotId = `demo_slot_appt_${apptIndex + 1}`;
    slots.push({
      id: slotId,
      doctorId: doctor.profileId,
      startTime: slotAt(midnight, appt.dayOffset, appt.hour),
      status: "booked",
    });
    appointments.push({
      id: `demo_appt_${apptIndex + 1}`,
      patientId: patient.userId,
      doctorId: doctor.profileId,
      slotId,
      note: appt.note,
    });
  }

  return { users, doctorProfiles, healthProfiles, predictions, slots, appointments };
}
