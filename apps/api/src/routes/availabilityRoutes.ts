import {
  bulkAvailabilityRequestSchema,
  Role,
  toggleAvailabilitySlotRequestSchema,
} from "@disease-prediction/shared";
import { Router } from "express";
import { AvailabilityController } from "../controllers/availabilityController";
import { requireApiAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { validateBody } from "../middlewares/validate";

const router = Router();

const doctorOnly = requireRole(Role.DOCTOR);

router.get("/doctors/me/availability", requireApiAuth, doctorOnly, AvailabilityController.listOwn);

router.post(
  "/doctors/me/availability/toggle",
  requireApiAuth,
  doctorOnly,
  validateBody(toggleAvailabilitySlotRequestSchema),
  AvailabilityController.toggle,
);

router.post(
  "/doctors/me/availability/bulk",
  requireApiAuth,
  doctorOnly,
  validateBody(bulkAvailabilityRequestSchema),
  AvailabilityController.bulkSet,
);

export default router;
