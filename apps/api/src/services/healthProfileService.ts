import type {
  HealthProfile,
  HealthProfileField,
  StructuredPayload,
  UpdateHealthProfileRequest,
} from "@disease-prediction/shared";
import { HEALTH_PROFILE_FIELDS } from "@disease-prediction/shared";
import {
  HealthProfileRepository,
  type HealthProfileWriteable,
} from "../repositories/healthProfileRepository";
import { mergeStructuredIntoHealthProfile } from "./healthProfileMerge";

const EMPTY_PROFILE: HealthProfile = {
  age: null,
  gender: null,
  bloodType: null,
  conditions: [],
  medications: [],
  allergies: [],
  editedFields: [],
};

export class HealthProfileService {
  private repo: HealthProfileRepository;

  constructor() {
    this.repo = new HealthProfileRepository();
  }

  async get(userId: string): Promise<HealthProfile> {
    const existing = await this.repo.findByUserId(userId);
    return existing ?? EMPTY_PROFILE;
  }

  /**
   * Apply the patient editor update. Every key present in `update` (including
   * keys explicitly set to `null` or `[]`) counts as patient-touched and is
   * recorded in `editedFields` so subsequent structured predictions skip it.
   */
  async update(userId: string, update: UpdateHealthProfileRequest): Promise<HealthProfile> {
    const current = await this.repo.getOrEmpty(userId);
    const touched: HealthProfileField[] = [];

    for (const field of HEALTH_PROFILE_FIELDS) {
      if (!Object.hasOwn(update, field)) continue;
      touched.push(field);
      applyEditedField(current, field, update);
    }

    const editedSet = new Set<HealthProfileField>([...current.editedFields, ...touched]);
    current.editedFields = HEALTH_PROFILE_FIELDS.filter((f) => editedSet.has(f));

    return this.repo.upsert(userId, current);
  }

  /**
   * Edited-field-aware auto-fill from a `structured` prediction. Called from
   * `PredictionService.predict` after the prediction row is created.
   */
  async mergeFromStructured(userId: string, payload: StructuredPayload): Promise<void> {
    const current = await this.repo.getOrEmpty(userId);
    const merged = mergeStructuredIntoHealthProfile(current, payload);
    await this.repo.upsert(userId, merged);
  }
}

function applyEditedField(
  target: HealthProfileWriteable,
  field: HealthProfileField,
  update: UpdateHealthProfileRequest,
): void {
  switch (field) {
    case "age":
      target.age = update.age ?? null;
      return;
    case "gender":
      target.gender = update.gender ?? null;
      return;
    case "bloodType":
      target.bloodType = update.bloodType ?? null;
      return;
    case "conditions":
      target.conditions = update.conditions ?? [];
      return;
    case "medications":
      target.medications = update.medications ?? [];
      return;
    case "allergies":
      target.allergies = update.allergies ?? [];
      return;
  }
}
