import type {
  ApiResponse,
  CurrentUserResponse,
  HealthProfile,
  PaginatedResponse,
  Prediction,
  PredictRequest,
  Role,
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

export async function checkHealth(): Promise<ApiResponse<{ status: string }>> {
  return fetchApi<ApiResponse<{ status: string }>>("/health");
}
