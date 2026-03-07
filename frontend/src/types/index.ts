export type PaymentMethod = "ETC" | "CASH";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface Trip {
  id: string;
  name: string;
  owner_id: string;
  payment_method: PaymentMethod;
  fuel_efficiency: number;
  gas_price: number;
  driver_weight: number;
  created_at: string;
  updated_at: string;
}

export interface Day {
  id: string;
  trip_id: string;
  date: string;
  created_at: string;
}

export interface RouteSegment {
  id: string;
  polyline: string | null;
  summary: string | null;
  distance_km: number;
  duration_min: number;
  toll_etc_yen: number;
  toll_cash_yen: number;
}

export interface Route {
  id: string;
  day_id: string;
  label: string | null;
  origin: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination: string;
  dest_lat: number | null;
  dest_lng: number | null;
  departure_time: string | null;
  selected_segment_id: string | null;
  distance_km: number | null;
  toll_yen: number;
  fuel_yen: number;
  is_include_split: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExtraCost {
  id: string;
  trip_id: string;
  day_id: string | null;
  type: "rental" | "parking" | "other";
  label: string;
  amount_yen: number;
  distance_km: number | null;
  created_at: string;
}

export interface Split {
  id: string;
  trip_id: string;
  total_yen: number;
  toll_yen: number;
  fuel_yen: number;
  extra_yen: number;
  distance_km: number;
  driver_yen: number;
  passenger_yen: number;
  calculated_at: string;
}

export interface Payment {
  id: string;
  split_id: string;
  member_id: string;
  amount_yen: number;
  status: "pending" | "paid";
  paypay_request_id: string | null;
  paid_at: string | null;
}

export interface Member {
  id: string;
  trip_id: string;
  user_id: string;
  role: "driver" | "passenger";
  joined_at: string;
}
