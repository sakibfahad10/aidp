import { getAuth } from "@clerk/express";
import {
  citySchema,
  type DoctorOnboardingDraft,
  type DoctorOnboardingSubmit,
  specialtySchema,
} from "@disease-prediction/shared";
import type { NextFunction, Request, Response } from "express";
import type { DirectoryFilters } from "../repositories/doctorRepository";
import { DoctorService } from "../services/doctorService";

const doctorService = new DoctorService();

function parseDirectoryFilters(query: Request["query"]): DirectoryFilters {
  const specialty =
    typeof query.specialty === "string" ? specialtySchema.safeParse(query.specialty) : undefined;
  const city = typeof query.city === "string" ? citySchema.safeParse(query.city) : undefined;
  const affiliation = typeof query.affiliation === "string" ? query.affiliation.trim() : "";
  return {
    specialty: specialty?.success ? specialty.data : undefined,
    city: city?.success ? city.data : undefined,
    affiliation: affiliation || undefined,
  };
}

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

  /** Public directory listing. */
  static async listDirectory(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = parseDirectoryFilters(req.query);
      const doctors = await doctorService.listDirectory(filters);
      res.json({ success: true, data: doctors });
    } catch (error) {
      next(error);
    }
  }

  /** Public profile by id — verified-only. */
  static async publicProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
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
