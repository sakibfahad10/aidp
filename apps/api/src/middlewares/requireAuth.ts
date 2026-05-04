import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

export function requireApiAuth(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);

  if (!userId) {
    res.status(401).json({
      success: false,
      error: "Authentication required",
    });
    return;
  }

  next();
}
