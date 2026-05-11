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

router.get("/doctors/:id", DoctorController.publicProfile);

export default router;
