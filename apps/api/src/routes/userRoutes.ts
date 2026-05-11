import { setRoleRequestSchema } from "@disease-prediction/shared";
import { Router } from "express";
import { UserController } from "../controllers/userController";
import { requireApiAuth } from "../middlewares/requireAuth";
import { validateBody } from "../middlewares/validate";

const router = Router();

router.get("/users/me", requireApiAuth, UserController.getMe);

router.post(
  "/users/role",
  requireApiAuth,
  validateBody(setRoleRequestSchema),
  UserController.setRole,
);

// "Register as a patient" — additive opt-in for DOCTOR users. PATIENT users
// already have the capability; service layer surfaces a 403 if they call
// this. Empty body so no schema validation is needed.
router.post(
  "/users/enable-patient-capability",
  requireApiAuth,
  UserController.enablePatientCapability,
);

export default router;
