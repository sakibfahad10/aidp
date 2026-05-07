import {
  ALLOWED_REPORT_FILE_MIME_TYPES,
  MAX_REPORT_FILE_SIZE_BYTES,
} from "@disease-prediction/shared";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { AppError } from "./errorHandler";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_REPORT_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if ((ALLOWED_REPORT_FILE_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new AppError(415, "Unsupported file type"));
  },
});

const singleFile = upload.single("file");

/**
 * Wraps multer.single("file") and translates its errors into AppError
 * with the correct HTTP status code (413 oversize, 415 unsupported type).
 */
export function uploadReportFile(req: Request, res: Response, next: NextFunction): void {
  singleFile(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        next(new AppError(413, "File exceeds the 10 MB size limit"));
        return;
      }
      next(new AppError(400, err.message));
      return;
    }
    next(err);
  });
}
