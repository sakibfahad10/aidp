import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import { BriefingService } from "../services/briefingService";

const briefingService = new BriefingService();

export class BriefingController {
  /**
   * GET /api/v1/doctors/me/appointments/:appointmentId/briefing
   *
   * Returns the patient-context briefing for the given appointment.
   * Computed fresh on every request — no stored snapshot — so the
   * briefing always reflects the patient's latest HealthProfile and
   * Prediction history.
   */
  static async forDoctor(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const rawId = req.params.appointmentId;
      const appointmentId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!appointmentId) {
        res.status(400).json({ success: false, error: "appointmentId is required" });
        return;
      }
      const data = await briefingService.getForDoctor(userId, appointmentId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
