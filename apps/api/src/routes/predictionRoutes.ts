import { predictRequestSchema } from "@disease-prediction/shared";
import { Router } from "express";
import { PredictionController } from "../controllers/predictionController";
import { uploadReportFile } from "../middlewares/reportFileUpload";
import { requireApiAuth } from "../middlewares/requireAuth";
import { validateBody } from "../middlewares/validate";

const router = Router();

router.post(
  "/predict",
  requireApiAuth,
  validateBody(predictRequestSchema),
  PredictionController.predict,
);

router.post(
  "/predict/report-file",
  requireApiAuth,
  uploadReportFile,
  PredictionController.predictReportFile,
);

router.get("/predictions", requireApiAuth, PredictionController.getAll);

router.get("/predictions/:id", requireApiAuth, PredictionController.getById);

export default router;
