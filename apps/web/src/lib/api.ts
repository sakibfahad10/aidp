import type {
  ApiResponse,
  Appointment,
  AppointmentListResponse,
  AvailabilitySlot,
  BookSlotRequest,
  CurrentUserResponse,
  DirectoryDoctor,
  DirectoryQuery,
  DoctorOnboardingDraft,
  DoctorOnboardingSubmit,
  DoctorProfileResponse,
  DoctorSuggestion,
  HealthProfile,
  PaginatedResponse,
  Prediction,
  PredictRequest,
  PublicDoctorProfile,
  Role,
  Specialty,
  ToggleAvailabilitySlotResult,
  UpdateHealthProfileRequest,
} from "@disease-prediction/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit & { token?: string | null },
): Promise<T> {
  const { token, ...fetchOptions } = options || {};
  const url = `${API_URL}${endpoint}`;

  const headers: Record<string, string> = {};

  if (!(fetchOptions.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    headers,
    ...fetchOptions,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || "Something went wrong");
  }

  return data;
}

export async function createPrediction(
  request: PredictRequest,
  token: string | null,
): Promise<ApiResponse<Prediction>> {
  return fetchApi<ApiResponse<Prediction>>("/api/v1/predict", {
    method: "POST",
    body: JSON.stringify(request),
    token,
  });
}

export async function createReportFilePrediction(
  file: File,
  reportType: string | undefined,
  token: string | null,
): Promise<ApiResponse<Prediction>> {
  const formData = new FormData();
  formData.append("file", file);
  if (reportType) {
    formData.append("reportType", reportType);
  }
  return fetchApi<ApiResponse<Prediction>>("/api/v1/predict/report-file", {
    method: "POST",
    body: formData,
    token,
  });
}

export async function getPredictions(
  page = 1,
  limit = 20,
  token?: string | null,
): Promise<ApiResponse<PaginatedResponse<Prediction>>> {
  return fetchApi<ApiResponse<PaginatedResponse<Prediction>>>(
    `/api/v1/predictions?page=${page}&limit=${limit}`,
    { token },
  );
}

export async function getPredictionById(
  id: string,
  token?: string | null,
): Promise<ApiResponse<Prediction>> {
  return fetchApi<ApiResponse<Prediction>>(`/api/v1/predictions/${id}`, { token });
}

export async function getCurrentUser(
  token: string | null,
): Promise<ApiResponse<CurrentUserResponse>> {
  return fetchApi<ApiResponse<CurrentUserResponse>>("/api/v1/users/me", { token });
}

export async function setUserRole(
  role: Role,
  token: string | null,
): Promise<ApiResponse<CurrentUserResponse>> {
  return fetchApi<ApiResponse<CurrentUserResponse>>("/api/v1/users/role", {
    method: "POST",
    body: JSON.stringify({ role }),
    token,
  });
}

export async function enablePatientCapability(
  token: string | null,
): Promise<ApiResponse<CurrentUserResponse>> {
  return fetchApi<ApiResponse<CurrentUserResponse>>("/api/v1/users/enable-patient-capability", {
    method: "POST",
    token,
  });
}

export async function getDoctorProfile(
  token: string | null,
): Promise<ApiResponse<DoctorProfileResponse | null>> {
  return fetchApi<ApiResponse<DoctorProfileResponse | null>>("/api/v1/doctors/me", { token });
}

export async function saveDoctorDraft(
  patch: DoctorOnboardingDraft,
  token: string | null,
): Promise<ApiResponse<DoctorProfileResponse>> {
  return fetchApi<ApiResponse<DoctorProfileResponse>>("/api/v1/doctors/me/draft", {
    method: "PUT",
    body: JSON.stringify(patch),
    token,
  });
}

export async function submitDoctorOnboarding(
  body: DoctorOnboardingSubmit,
  token: string | null,
): Promise<ApiResponse<DoctorProfileResponse>> {
  return fetchApi<ApiResponse<DoctorProfileResponse>>("/api/v1/doctors/me/submit", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

export async function listDoctors(
  query: DirectoryQuery = {},
): Promise<ApiResponse<DirectoryDoctor[]>> {
  const params = new URLSearchParams();
  if (query.specialty) params.set("specialty", query.specialty);
  if (query.city) params.set("city", query.city);
  if (query.affiliation) params.set("affiliation", query.affiliation);
  const qs = params.toString();
  return fetchApi<ApiResponse<DirectoryDoctor[]>>(`/api/v1/doctors${qs ? `?${qs}` : ""}`);
}

export async function getPublicDoctorProfile(
  id: string,
): Promise<ApiResponse<PublicDoctorProfile>> {
  return fetchApi<ApiResponse<PublicDoctorProfile>>(`/api/v1/doctors/${encodeURIComponent(id)}`);
}

export async function getDoctorSuggestions(
  specialties: Specialty[],
): Promise<ApiResponse<DoctorSuggestion[]>> {
  const params = new URLSearchParams();
  for (const s of specialties) params.append("specialty", s);
  const qs = params.toString();
  return fetchApi<ApiResponse<DoctorSuggestion[]>>(
    `/api/v1/doctor-suggestions${qs ? `?${qs}` : ""}`,
  );
}

export async function getOwnAvailability(
  token: string | null,
): Promise<ApiResponse<AvailabilitySlot[]>> {
  return fetchApi<ApiResponse<AvailabilitySlot[]>>("/api/v1/doctors/me/availability", { token });
}

export async function toggleAvailabilitySlot(
  startTime: string,
  token: string | null,
): Promise<ApiResponse<ToggleAvailabilitySlotResult>> {
  return fetchApi<ApiResponse<ToggleAvailabilitySlotResult>>(
    "/api/v1/doctors/me/availability/toggle",
    {
      method: "POST",
      body: JSON.stringify({ startTime }),
      token,
    },
  );
}

export async function getHealthProfile(token: string | null): Promise<ApiResponse<HealthProfile>> {
  return fetchApi<ApiResponse<HealthProfile>>("/api/v1/health-profile", { token });
}

export async function updateHealthProfile(
  update: UpdateHealthProfileRequest,
  token: string | null,
): Promise<ApiResponse<HealthProfile>> {
  return fetchApi<ApiResponse<HealthProfile>>("/api/v1/health-profile", {
    method: "PATCH",
    body: JSON.stringify(update),
    token,
  });
}

export async function bookAppointment(
  body: BookSlotRequest,
  token: string | null,
): Promise<ApiResponse<Appointment>> {
  return fetchApi<ApiResponse<Appointment>>("/api/v1/appointments", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

export async function getMyAppointments(
  token: string | null,
): Promise<ApiResponse<AppointmentListResponse>> {
  return fetchApi<ApiResponse<AppointmentListResponse>>("/api/v1/appointments", { token });
}

export async function getDoctorAppointments(
  token: string | null,
): Promise<ApiResponse<AppointmentListResponse>> {
  return fetchApi<ApiResponse<AppointmentListResponse>>("/api/v1/doctors/me/appointments", {
    token,
  });
}

export async function checkHealth(): Promise<ApiResponse<{ status: string }>> {
  return fetchApi<ApiResponse<{ status: string }>>("/health");
}
