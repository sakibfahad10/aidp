/** Format a date to a human-readable string */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Safely parse JSON with a fallback value */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/** Create a standardized API response */
export function apiResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message,
  };
}

/** Create a standardized error response */
export function apiError(error: string, statusCode = 500) {
  return {
    success: false,
    error,
    statusCode,
  };
}
