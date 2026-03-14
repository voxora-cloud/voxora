import type { RequestOptions } from "../types/types"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002/api/v1"

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem("token")

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  // Parse response as JSON first (before checking res.ok)
  let data: any;
  try {
    data = await res.json();
  } catch {
    // If response is not JSON, handle error
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    throw new Error("Invalid response format");
  }

  // If response includes success: false, treat as error
  if (data.success === false) {
    throw new Error(data.message || "Request failed");
  }

  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}: ${res.statusText}`);
  }

  return data;
}

export const apiClient = {
  get: <T>(endpoint: string) => request<T>(endpoint),

  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "POST", body }),

  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "PUT", body }),

  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "PATCH", body }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),
}