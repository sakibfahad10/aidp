import { ApiResponse, PaginatedResponse, Prediction, PredictRequest } from "@disease-prediction/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/** Generic fetch wrapper with error handling */
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || "Something went wrong");
  }

  return data;
}

/** Create a new prediction */
export async function createPrediction(
  request: PredictRequest
): Promise<ApiResponse<Prediction>> {
  return fetchApi<ApiResponse<Prediction>>("/api/v1/predict", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/** Get all predictions */
export async function getPredictions(
  page = 1,
  limit = 20
): Promise<ApiResponse<PaginatedResponse<Prediction>>> {
  return fetchApi<ApiResponse<PaginatedResponse<Prediction>>>(
    `/api/v1/predictions?page=${page}&limit=${limit}`
  );
}

/** Get a single prediction by ID */
export async function getPredictionById(
  id: string
): Promise<ApiResponse<Prediction>> {
  return fetchApi<ApiResponse<Prediction>>(`/api/v1/predictions/${id}`);
}

/** Check API health */
export async function checkHealth(): Promise<ApiResponse<{ status: string }>> {
  return fetchApi<ApiResponse<{ status: string }>>("/health");
}
