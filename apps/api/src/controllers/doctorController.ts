import { getAuth } from "@clerk/express";
import {
  type DoctorOnboardingDraft,
  type DoctorOnboardingSubmit,
  directoryQuerySchema,
} from "@disease-prediction/shared";
import type { NextFunction, Request, Response } from "express";
import { DoctorService } from "../services/doctorService";

const doctorService = new DoctorService();

export class DoctorController {
  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const profile = await doctorService.getByUserId(userId);
      res.json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  }

  static async saveDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const patch = req.body as DoctorOnboardingDraft;
      const profile = await doctorService.saveDraft(userId, patch);
      res.json({ success: true, data: profile, message: "Draft saved" });
    } catch (error) {
      next(error);
    }
  }

  static async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const body = req.body as DoctorOnboardingSubmit;
      const profile = await doctorService.submit(userId, body);
      res.status(201).json({
        success: true,
        data: profile,
        message: "Doctor profile verified",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Public directory list — no auth required. Query is parsed through
   * `directoryQuerySchema`; unknown / invalid filter values are rejected
   * with a 400 by the global Zod handler.
   */
  static async listDirectory(req: Request, res: Response, next: NextFunction) {
    try {
      const query = directoryQuerySchema.parse(req.query);
      const doctors = await doctorService.listDirectory(query);
      res.json({ success: true, data: doctors });
    } catch (error) {
      next(error);
    }
  }

  /** Public profile by `DoctorProfile.id` — no auth required. */
  static async getPublicProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (typeof id !== "string" || !id) {
        res.status(400).json({ success: false, error: "Missing doctor id" });
        return;
      }
      const profile = await doctorService.getPublicProfile(id);
      if (!profile) {
        res.status(404).json({ success: false, error: "Doctor not found" });
        return;
      }
      res.json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  }
}
