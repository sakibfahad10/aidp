import { getAuth } from "@clerk/express";
import type { SetRoleRequest } from "@disease-prediction/shared";
import type { NextFunction, Request, Response } from "express";
import { UserService } from "../services/userService";

const userService = new UserService();

export class UserController {
  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const user = await userService.getCurrentUser(userId);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  static async setRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const { role } = req.body as SetRoleRequest;
      const user = await userService.setRole(userId, role);
      res.json({ success: true, data: user, message: "Role updated" });
    } catch (error) {
      next(error);
    }
  }
}
