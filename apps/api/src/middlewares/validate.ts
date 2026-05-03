import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

/**
 * Creates an Express middleware that validates the request body
 * against a Zod schema before passing to the next handler.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}
