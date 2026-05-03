import { Router } from "express";
import { PredictionController } from "../controllers/predictionController";
import { validateBody } from "../middlewares/validate";
import { requireApiAuth } from "../middlewares/requireAuth";
import { predictRequestSchema } from "@disease-prediction/shared";

const router = Router();

router.post(
  "/predict",
  requireApiAuth,
  validateBody(predictRequestSchema),
  PredictionController.predict
);

router.get("/predictions", requireApiAuth, PredictionController.getAll);

router.get("/predictions/:id", requireApiAuth, PredictionController.getById);

export default router;
