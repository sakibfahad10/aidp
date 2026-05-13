/**
 * Demo seed runner (issue #19). Populates verified doctors with varied
 * specialty/city/affiliation and open slots; demo patients with rich
 * HealthProfile + a few predictions each; and a mix of pre-booked
 * appointments spanning past and upcoming.
 *
 * Idempotent — re-running on the same UTC day is a no-op. The pure plan
 * lives in `../src/demoSeed.ts`; this file applies it to Postgres.
 *
 * Run with:
 *   pnpm --filter @disease-prediction/db seed
 */

import { PrismaClient } from "@prisma/client";
import {
  buildDemoSeedPlan,
  DEMO_DOCTOR_PROFILE_IDS,
  DEMO_DOCTOR_USER_IDS,
  DEMO_PATIENT_USER_IDS,
} from "../src/demoSeed";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const anchor = new Date();
  const plan = buildDemoSeedPlan(anchor);

  // Phase 1 — wipe the slot+appointment fan-out for demo doctors so cross-day
  // reruns don't leave yesterday's `startTime`s behind. Cascading FKs mean
  // dropping a slot drops its appointment.
  await prisma.appointment.deleteMany({
    where: { patientId: { in: [...DEMO_PATIENT_USER_IDS] } },
  });
  await prisma.availabilitySlot.deleteMany({
    where: { doctorId: { in: [...DEMO_DOCTOR_PROFILE_IDS] } },
  });

  // Phase 2 — upsert users, doctor profiles, patient health profiles. Stable
  // ids mean reruns hit `update` and are no-ops in terms of effect.
  for (const u of plan.users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {
        email: u.email,
        name: u.name,
        role: u.role,
        patientCapability: u.patientCapability,
      },
      create: {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        patientCapability: u.patientCapability,
      },
    });
  }

  for (const d of plan.doctorProfiles) {
    await prisma.doctorProfile.upsert({
      where: { userId: d.userId },
      update: {
        phone: d.phone,
        publicEmail: d.publicEmail,
        bmdcNumber: d.bmdcNumber,
        qualifications: d.qualifications,
        specialties: { set: d.specialties },
        affiliation: d.affiliation,
        city: d.city,
        experienceYears: d.experienceYears,
        feeBdt: d.feeBdt,
        status: d.status,
      },
      create: {
        id: d.id,
        userId: d.userId,
        phone: d.phone,
        publicEmail: d.publicEmail,
        bmdcNumber: d.bmdcNumber,
        qualifications: d.qualifications,
        specialties: d.specialties,
        affiliation: d.affiliation,
        city: d.city,
        experienceYears: d.experienceYears,
        feeBdt: d.feeBdt,
        status: d.status,
      },
    });
  }

  for (const h of plan.healthProfiles) {
    await prisma.healthProfile.upsert({
      where: { userId: h.userId },
      update: {
        age: h.age,
        gender: h.gender,
        bloodType: h.bloodType,
        conditions: { set: h.conditions },
        medications: { set: h.medications },
        allergies: { set: h.allergies },
        editedFields: { set: h.editedFields },
      },
      create: {
        userId: h.userId,
        age: h.age,
        gender: h.gender,
        bloodType: h.bloodType,
        conditions: h.conditions,
        medications: h.medications,
        allergies: h.allergies,
        editedFields: h.editedFields,
      },
    });
  }

  // Phase 3 — predictions. Stable ids, so reruns are no-op updates that keep
  // the `createdAt` we anchored on first insert. Skipping `createdAt` in the
  // update keeps the original timeline; we only set it on create.
  for (const p of plan.predictions) {
    const createdAt = new Date(anchor.getTime() - p.createdHoursAgo * 3_600_000);
    await prisma.prediction.upsert({
      where: { id: p.id },
      update: {
        inputType: p.inputType,
        inputPayload: p.inputPayload as object,
        result: p.result as object,
        riskLevel: p.riskLevel,
        summary: p.summary,
      },
      create: {
        id: p.id,
        inputType: p.inputType,
        inputPayload: p.inputPayload as object,
        result: p.result as object,
        riskLevel: p.riskLevel,
        summary: p.summary,
        userId: p.userId,
        createdAt,
      },
    });
  }

  // Phase 4 — re-create slots and appointments. Phase 1 already cleared the
  // demo set, so plain `create` is the right primitive here.
  for (const s of plan.slots) {
    await prisma.availabilitySlot.create({
      data: {
        id: s.id,
        doctorId: s.doctorId,
        startTime: s.startTime,
        status: s.status,
      },
    });
  }

  for (const a of plan.appointments) {
    await prisma.appointment.create({
      data: {
        id: a.id,
        patientId: a.patientId,
        doctorId: a.doctorId,
        slotId: a.slotId,
        note: a.note,
      },
    });
  }

  console.log(
    `Seeded ${plan.users.length} users (${DEMO_DOCTOR_USER_IDS.length} doctors, ` +
      `${DEMO_PATIENT_USER_IDS.length} patients), ` +
      `${plan.predictions.length} predictions, ${plan.slots.length} slots, ` +
      `${plan.appointments.length} appointments.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
