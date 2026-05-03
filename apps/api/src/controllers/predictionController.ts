import { Request, Response, NextFunction } from "express";
import { PredictionService } from "../services/predictionService";

const predictionService = new PredictionService();

/**
 * Handles prediction-related HTTP requests.
 * Delegates business logic to PredictionService.
 */
export class PredictionController {
  /** POST /api/v1/predict — Run a new prediction */
  static async predict(req: Request, res: Response, next: NextFunction) {
    try {
      const { inputType, payload } = req.body;
      const prediction = await predictionService.predict(inputType, payload);

      res.status(201).json({
        success: true,
        data: prediction,
        message: "Prediction created successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/v1/predictions — List all predictions */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(String(req.query.page || "1"), 10);
      const limit = parseInt(String(req.query.limit || "20"), 10);
      const result = await predictionService.getAll(page, limit);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/v1/predictions/:id — Get a single prediction */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const prediction = await predictionService.getById(String(req.params.id));

      res.json({
        success: true,
        data: prediction,
      });
    } catch (error) {
      next(error);
    }
  }
}
