import type { CurrentUserResponse, Role } from "@disease-prediction/shared";
import { AppError } from "../middlewares/errorHandler";
import { UserRepository } from "../repositories/userRepository";

export class UserService {
  private userRepo: UserRepository;

  constructor() {
    this.userRepo = new UserRepository();
  }

  async getCurrentUser(userId: string): Promise<CurrentUserResponse> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: (user.role ?? null) as Role | null,
    };
  }

  async setRole(userId: string, role: Role): Promise<CurrentUserResponse> {
    const existing = await this.userRepo.findById(userId);
    if (!existing) {
      throw new AppError(404, "User not found");
    }
    const updated = await this.userRepo.setRole(userId, role);
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: (updated.role ?? null) as Role | null,
    };
  }
}
