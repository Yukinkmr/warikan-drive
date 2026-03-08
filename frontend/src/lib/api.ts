export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8001/api/v1";
const BASE = API_BASE;
export const AUTH_TOKEN_STORAGE_KEY = "warikan-drive-auth-token";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function clearStoredAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

async function fetchApi<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string> }
): Promise<T> {
  const { params, ...init } = options ?? {};
  const url = params ? `${BASE}${path}?${new URLSearchParams(params)}` : `${BASE}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
  };
  if (init.headers && typeof init.headers === "object" && !Array.isArray(init.headers) && !(init.headers instanceof Headers)) {
    Object.assign(headers, init.headers);
  }
  const res = await fetch(url, {
    ...init,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const msg =
      typeof err.detail === "string"
        ? err.detail
        : Array.isArray(err.detail)
          ? err.detail[0]?.msg ?? res.statusText
          : err.detail ?? res.statusText;
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Trips
export const tripsApi = {
  list: () => fetchApi<{ trips: import("@/types").Trip[] }>("/trips"),
  get: (tripId: string) => fetchApi<import("@/types").Trip>(`/trips/${tripId}`),
  create: (body: {
    name: string;
    payment_method?: string;
    fuel_efficiency: number;
    gas_price: number;
    driver_weight: number;
  }) => fetchApi<import("@/types").Trip>("/trips", { method: "POST", body: JSON.stringify(body) }),
  update: (tripId: string, body: Partial<import("@/types").Trip>) =>
    fetchApi<import("@/types").Trip>(`/trips/${tripId}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (tripId: string) => fetchApi<void>(`/trips/${tripId}`, { method: "DELETE" }),
};

// Days
export const daysApi = {
  list: (tripId: string) => fetchApi<import("@/types").Day[]>(`/trips/${tripId}/days`),
  create: (tripId: string, body: { date: string }) =>
    fetchApi<import("@/types").Day>(`/trips/${tripId}/days`, { method: "POST", body: JSON.stringify(body) }),
  update: (tripId: string, dayId: string, body: { date?: string }) =>
    fetchApi<import("@/types").Day>(`/trips/${tripId}/days/${dayId}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (tripId: string, dayId: string) =>
    fetchApi<void>(`/trips/${tripId}/days/${dayId}`, { method: "DELETE" }),
};

// Routes (under day)
export const routesApi = {
  list: (dayId: string) => fetchApi<import("@/types").Route[]>(`/days/${dayId}/routes`),
  create: (dayId: string, body: { origin: string; destination: string; departure_time?: string; time_type?: import("@/types").RouteTimeType; label?: string }) =>
    fetchApi<import("@/types").Route>(`/days/${dayId}/routes`, { method: "POST", body: JSON.stringify(body) }),
  update: (dayId: string, routeId: string, body: Partial<{ origin: string; destination: string; departure_time: string; time_type: import("@/types").RouteTimeType; use_highways: boolean; use_tolls: boolean; is_include_split: boolean }>) =>
    fetchApi<import("@/types").Route>(`/days/${dayId}/routes/${routeId}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (dayId: string, routeId: string) =>
    fetchApi<void>(`/days/${dayId}/routes/${routeId}`, { method: "DELETE" }),
  listSegments: (routeId: string) =>
    fetchApi<{ segments: import("@/types").RouteSegment[] }>(`/routes/${routeId}/segments`),
  search: (routeId: string, body: { departure_time: string; payment_method: string; time_type: import("@/types").RouteTimeType }) =>
    fetchApi<{ segments: import("@/types").RouteSegment[] }>(`/routes/${routeId}/search`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  selectSegment: (routeId: string, segmentId: string) =>
    fetchApi<import("@/types").Route>(`/routes/${routeId}/select`, {
      method: "PATCH",
      body: JSON.stringify({ segment_id: segmentId }),
    }),
};

// Extra costs
export const extraCostsApi = {
  list: (tripId: string) => fetchApi<import("@/types").ExtraCost[]>(`/trips/${tripId}/extra-costs`),
  create: (tripId: string, body: { type: string; label: string; amount_yen: number; day_id?: string | null }) =>
    fetchApi<import("@/types").ExtraCost>(`/trips/${tripId}/extra-costs`, { method: "POST", body: JSON.stringify(body) }),
  update: (tripId: string, costId: string, body: Partial<{ type: string; label: string; amount_yen: number }>) =>
    fetchApi<import("@/types").ExtraCost>(`/trips/${tripId}/extra-costs/${costId}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (tripId: string, costId: string) =>
    fetchApi<void>(`/trips/${tripId}/extra-costs/${costId}`, { method: "DELETE" }),
};

// Splits
export const splitsApi = {
  create: (
    tripId: string,
    body: {
      route_ids: string[];
      include_extra_cost_ids?: string[];
      fuel_efficiency?: number;
      gas_price?: number;
      driver_weight?: number;
      people?: number;
    }
  ) =>
    fetchApi<import("@/types").Split>(`/trips/${tripId}/splits`, { method: "POST", body: JSON.stringify(body) }),
  getLatest: (tripId: string) => fetchApi<import("@/types").Split>(`/trips/${tripId}/splits/latest`),
  get: (tripId: string, splitId: string) =>
    fetchApi<import("@/types").Split>(`/trips/${tripId}/splits/${splitId}`),
};

// Members
export const membersApi = {
  list: (tripId: string) => fetchApi<import("@/types").Member[]>(`/trips/${tripId}/members`),
  create: (tripId: string, body: { display_name: string; role?: "driver" | "passenger"; user_id?: string | null }) =>
    fetchApi<import("@/types").Member>(`/trips/${tripId}/members`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (
    tripId: string,
    memberId: string,
    body: Partial<{ display_name: string; role: "driver" | "passenger" }>
  ) =>
    fetchApi<import("@/types").Member>(`/trips/${tripId}/members/${memberId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (tripId: string, memberId: string) =>
    fetchApi<void>(`/trips/${tripId}/members/${memberId}`, { method: "DELETE" }),
};

// Payments
export const paymentsApi = {
  list: (splitId: string) => fetchApi<import("@/types").Payment[]>(`/splits/${splitId}/payments`),
  update: (splitId: string, paymentId: string, body: { status: string }) =>
    fetchApi<import("@/types").Payment>(`/splits/${splitId}/payments/${paymentId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    fetchApi<import("@/types").AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    fetchApi<import("@/types").AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  googleLogin: (body: { code: string; redirect_uri: string }) =>
    fetchApi<import("@/types").AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => fetchApi<import("@/types").AuthUser>("/auth/me"),
  updateMe: (body: { name: string }) =>
    fetchApi<import("@/types").AuthUser>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};
