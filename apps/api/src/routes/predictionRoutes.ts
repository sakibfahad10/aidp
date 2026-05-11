import { predictRequestSchema } from "@disease-prediction/shared";
import { Router } from "express";
import { PredictionController } from "../controllers/predictionController";
import { uploadReportFile } from "../middlewares/reportFileUpload";
import { requireApiAuth } from "../middlewares/requireAuth";
import { requirePatientCapability } from "../middlewares/requirePatientCapability";
import { validateBody } from "../middlewares/validate";

const router = Router();

router.post(
  "/predict",
  requireApiAuth,
  requirePatientCapability,
  validateBody(predictRequestSchema),
  PredictionController.predict,
);

router.post(
  "/predict/report-file",
  requireApiAuth,
  requirePatientCapability,
  uploadReportFile,
  PredictionController.predictReportFile,
);

router.get("/predictions", requireApiAuth, requirePatientCapability, PredictionController.getAll);

router.get(
  "/predictions/:id",
  requireApiAuth,
  requirePatientCapability,
  PredictionController.getById,
);

export default router;
