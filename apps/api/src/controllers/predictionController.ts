import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import { PredictionService } from "../services/predictionService";

const predictionService = new PredictionService();

export class PredictionController {
  static async predict(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const { inputType, payload } = req.body;
      const prediction = await predictionService.predict(inputType, payload, userId);

      res.status(201).json({
        success: true,
        data: prediction,
        message: "Prediction created successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const page = parseInt(String(req.query.page || "1"), 10);
      const limit = parseInt(String(req.query.limit || "20"), 10);
      const result = await predictionService.getAll(page, limit, userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const prediction = await predictionService.getById(String(req.params.id), userId);

      res.json({
        success: true,
        data: prediction,
      });
    } catch (error) {
      next(error);
    }
  }
}
