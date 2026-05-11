import type { User } from "@disease-prediction/db";
import { type CurrentUserResponse, Role } from "@disease-prediction/shared";
import { AppError } from "../middlewares/errorHandler";
import { UserRepository, type UserRepositoryLike } from "../repositories/userRepository";

function toCurrentUserResponse(user: User): CurrentUserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role | null,
    patientCapability: user.patientCapability,
  };
}

export class UserService {
  constructor(private readonly userRepo: UserRepositoryLike = new UserRepository()) {}

  async getCurrentUser(userId: string): Promise<CurrentUserResponse> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    return toCurrentUserResponse(user);
  }

  async setRole(userId: string, role: Role): Promise<CurrentUserResponse> {
    const existing = await this.userRepo.findById(userId);
    if (!existing) {
      throw new AppError(404, "User not found");
    }
    const updated = await this.userRepo.setRole(userId, role);
    return toCurrentUserResponse(updated);
  }

  /**
   * Enables the additive patient capability for a DOCTOR. Idempotent: if the
   * flag is already true the user is returned unchanged. Refuses on a missing
   * user, an unset role (gate not answered), or a PATIENT primary role
   * (one-directional dual-role: patients use the existing onboarding wizard
   * to become doctors instead).
   */
  async enablePatientCapability(userId: string): Promise<CurrentUserResponse> {
    const existing = await this.userRepo.findById(userId);
    if (!existing) {
      throw new AppError(404, "User not found");
    }
    if (existing.role !== Role.DOCTOR) {
      throw new AppError(
        403,
        "Only a DOCTOR can register as a patient — patients become doctors via onboarding instead.",
      );
    }
    if (existing.patientCapability) {
      return toCurrentUserResponse(existing);
    }
    const updated = await this.userRepo.setPatientCapability(userId, true);
    return toCurrentUserResponse(updated);
  }
}
