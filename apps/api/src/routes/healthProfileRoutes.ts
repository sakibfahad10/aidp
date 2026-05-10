import { updateHealthProfileRequestSchema } from "@disease-prediction/shared";
import { Router } from "express";
import { HealthProfileController } from "../controllers/healthProfileController";
import { requireApiAuth } from "../middlewares/requireAuth";
import { validateBody } from "../middlewares/validate";

const router = Router();

router.get("/health-profile", requireApiAuth, HealthProfileController.get);

router.patch(
  "/health-profile",
  requireApiAuth,
  validateBody(updateHealthProfileRequestSchema),
  HealthProfileController.update,
);

export default router;
