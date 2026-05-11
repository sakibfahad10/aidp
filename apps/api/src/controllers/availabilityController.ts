import { getAuth } from "@clerk/express";
import type { ToggleAvailabilitySlotRequest } from "@disease-prediction/shared";
import type { NextFunction, Request, Response } from "express";
import { AvailabilityService } from "../services/availabilityService";

const availabilityService = new AvailabilityService();

export class AvailabilityController {
  /** Doctor-private listing of their own open slots (editor reads on mount). */
  static async listOwn(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const slots = await availabilityService.listOwnOpen(userId);
      res.json({ success: true, data: slots });
    } catch (error) {
      next(error);
    }
  }

  /** Editor toggle — materializes or removes one slot. */
  static async toggle(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const body = req.body as ToggleAvailabilitySlotRequest;
      const result = await availabilityService.toggle(userId, new Date(body.startTime));
      res.json({
        success: true,
        data: result,
        message: result.action === "created" ? "Slot opened" : "Slot removed",
      });
    } catch (error) {
      next(error);
    }
  }
}
