import {
  doctorOnboardingDraftSchema,
  doctorOnboardingSubmitSchema,
  Role,
} from "@disease-prediction/shared";
import { Router } from "express";
import { DoctorController } from "../controllers/doctorController";
import { requireApiAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { validateBody } from "../middlewares/validate";

const router = Router();

const doctorOnly = requireRole(Role.DOCTOR);

// Public directory + public profile. Both are intentionally unauthenticated
// — patients browsing the directory may not yet be signed in, and a deep-link
// from a prediction result should land without an auth wall.
router.get("/doctors", DoctorController.listDirectory);

router.get("/doctors/me", requireApiAuth, doctorOnly, DoctorController.getMe);

router.put(
  "/doctors/me/draft",
  requireApiAuth,
  doctorOnly,
  validateBody(doctorOnboardingDraftSchema),
  DoctorController.saveDraft,
);

router.post(
  "/doctors/me/submit",
  requireApiAuth,
  doctorOnly,
  validateBody(doctorOnboardingSubmitSchema),
  DoctorController.submit,
);

router.get("/doctors/:id", DoctorController.getPublicProfile);

export default router;
