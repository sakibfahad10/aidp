import { getAuth } from "@clerk/express";
import type { UpdateHealthProfileRequest } from "@disease-prediction/shared";
import type { NextFunction, Request, Response } from "express";
import { HealthProfileService } from "../services/healthProfileService";

const healthProfileService = new HealthProfileService();

export class HealthProfileController {
  static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const profile = await healthProfileService.get(userId);
      res.json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const update = req.body as UpdateHealthProfileRequest;
      const profile = await healthProfileService.update(userId, update);
      res.json({ success: true, data: profile, message: "Health profile updated" });
    } catch (error) {
      next(error);
    }
  }
}
