import { getAuth } from "@clerk/express";
import type { BookSlotRequest } from "@disease-prediction/shared";
import type { NextFunction, Request, Response } from "express";
import { AppointmentService } from "../services/appointmentService";

const appointmentService = new AppointmentService();

export class AppointmentController {
  /** Patient books a slot. Body validated upstream by `bookSlotRequestSchema`. */
  static async book(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const body = req.body as BookSlotRequest;
      const appointment = await appointmentService.bookSlot(userId, body.slotId, body.note);
      res.status(201).json({ success: true, data: appointment, message: "Appointment booked" });
    } catch (error) {
      next(error);
    }
  }

  /** Patient's own appointments, split upcoming/past. */
  static async listOwn(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const data = await appointmentService.listForPatient(userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /** Doctor's dashboard appointments, split upcoming/past. */
  static async listForDoctor(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const data = await appointmentService.listForDoctor(userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
