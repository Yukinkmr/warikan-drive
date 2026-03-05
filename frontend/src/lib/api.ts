const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

async function fetchApi<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string> }
): Promise<T> {
  const { params, ...init } = options ?? {};
  const url = params ? `${BASE}${path}?${new URLSearchParams(params)}` : `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(Array.isArray(err.detail) ? err.detail[0]?.msg : err.detail || res.statusText);
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
    owner_id?: string | null;
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
  create: (dayId: string, body: { origin: string; destination: string; departure_time?: string; label?: string }) =>
    fetchApi<import("@/types").Route>(`/days/${dayId}/routes`, { method: "POST", body: JSON.stringify(body) }),
  update: (dayId: string, routeId: string, body: Partial<{ origin: string; destination: string; departure_time: string; is_include_split: boolean }>) =>
    fetchApi<import("@/types").Route>(`/days/${dayId}/routes/${routeId}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (dayId: string, routeId: string) =>
    fetchApi<void>(`/days/${dayId}/routes/${routeId}`, { method: "DELETE" }),
  listSegments: (routeId: string) =>
    fetchApi<{ segments: import("@/types").RouteSegment[] }>(`/routes/${routeId}/segments`),
  search: (routeId: string, body: { departure_time: string; payment_method: string }) =>
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
  create: (tripId: string, body: { route_ids: string[]; include_extra_cost_ids?: string[] }) =>
    fetchApi<import("@/types").Split>(`/trips/${tripId}/splits`, { method: "POST", body: JSON.stringify(body) }),
  getLatest: (tripId: string) => fetchApi<import("@/types").Split>(`/trips/${tripId}/splits/latest`),
  get: (tripId: string, splitId: string) =>
    fetchApi<import("@/types").Split>(`/trips/${tripId}/splits/${splitId}`),
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
