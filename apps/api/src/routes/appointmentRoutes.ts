import { bookSlotRequestSchema, Role } from "@disease-prediction/shared";
import { Router } from "express";
import { AppointmentController } from "../controllers/appointmentController";
import { BriefingController } from "../controllers/briefingController";
import { requireApiAuth } from "../middlewares/requireAuth";
import { requirePatientCapability } from "../middlewares/requirePatientCapability";
import { requireRole } from "../middlewares/requireRole";
import { validateBody } from "../middlewares/validate";

const router = Router();

const doctorOnly = requireRole(Role.DOCTOR);

// Booking + patient view are patient-capability gated — a DOCTOR without
// the additive flag has no business booking through the patient surface.
router.post(
  "/appointments",
  requireApiAuth,
  requirePatientCapability,
  validateBody(bookSlotRequestSchema),
  AppointmentController.book,
);

router.get(
  "/appointments",
  requireApiAuth,
  requirePatientCapability,
  AppointmentController.listOwn,
);

// Doctor dashboard view is role-gated, not capability-gated: a DOCTOR who
// has not opted into patient capability still sees their own dashboard.
router.get(
  "/doctors/me/appointments",
  requireApiAuth,
  doctorOnly,
  AppointmentController.listForDoctor,
);

// Patient-context briefing — read-time projection of the booked patient's
// HealthProfile + most recent predictions + appointment note. Scoped to
// the calling doctor's userId in the service so a doctor can only see
// briefings for their own appointments.
router.get(
  "/doctors/me/appointments/:appointmentId/briefing",
  requireApiAuth,
  doctorOnly,
  BriefingController.forDoctor,
);

export default router;
