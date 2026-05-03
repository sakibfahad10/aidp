import { Router } from "express";
import { PredictionController } from "../controllers/predictionController";
import { validateBody } from "../middlewares/validate";
import { predictRequestSchema } from "@disease-prediction/shared";

const router = Router();

// POST /api/v1/predict — Create a new prediction
router.post(
  "/predict",
  validateBody(predictRequestSchema),
  PredictionController.predict
);

// GET /api/v1/predictions — List all predictions
router.get("/predictions", PredictionController.getAll);

// GET /api/v1/predictions/:id — Get prediction by ID
router.get("/predictions/:id", PredictionController.getById);

export default router;
