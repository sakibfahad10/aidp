import { setRoleRequestSchema } from "@disease-prediction/shared";
import { Router } from "express";
import { UserController } from "../controllers/userController";
import { requireApiAuth } from "../middlewares/requireAuth";
import { validateBody } from "../middlewares/validate";

const router = Router();

router.get("/users/me", requireApiAuth, UserController.getMe);

router.post(
  "/users/role",
  requireApiAuth,
  validateBody(setRoleRequestSchema),
  UserController.setRole,
);

export default router;
