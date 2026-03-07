-- 割り勘ドライブ DB 初期化
-- PostgreSQL 16

CREATE TYPE payment_method_enum AS ENUM ('ETC', 'CASH');
CREATE TYPE member_role_enum AS ENUM ('driver', 'passenger');
CREATE TYPE extra_cost_type_enum AS ENUM ('rental', 'parking', 'other');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'paid');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  paypay_id VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_method payment_method_enum NOT NULL DEFAULT 'ETC',
  fuel_efficiency DECIMAL(5,2) NOT NULL,
  gas_price INT NOT NULL,
  driver_weight DECIMAL(3,2) NOT NULL CHECK (driver_weight >= 0.0 AND driver_weight <= 1.0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role member_role_enum NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(trip_id, user_id)
);

CREATE TABLE days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID NOT NULL REFERENCES days(id) ON DELETE CASCADE,
  label VARCHAR(50),
  origin VARCHAR(200) NOT NULL,
  origin_lat DECIMAL(9,6),
  origin_lng DECIMAL(9,6),
  destination VARCHAR(200) NOT NULL,
  dest_lat DECIMAL(9,6),
  dest_lng DECIMAL(9,6),
  departure_time TIMESTAMP WITH TIME ZONE,
  selected_segment_id UUID,
  distance_km DECIMAL(7,2),
  toll_yen INT DEFAULT 0,
  fuel_yen INT DEFAULT 0,
  is_include_split BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE route_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  polyline TEXT,
  distance_km DECIMAL(7,2) NOT NULL,
  duration_min INT NOT NULL,
  toll_etc_yen INT NOT NULL DEFAULT 0,
  toll_cash_yen INT NOT NULL DEFAULT 0,
  summary VARCHAR(200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE routes
  ADD CONSTRAINT fk_routes_segment
  FOREIGN KEY (selected_segment_id) REFERENCES route_segments(id) ON DELETE SET NULL;

CREATE TABLE extra_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_id UUID REFERENCES days(id) ON DELETE SET NULL,
  type extra_cost_type_enum NOT NULL,
  label VARCHAR(100) NOT NULL,
  amount_yen INT NOT NULL,
  distance_km DECIMAL(7,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  total_yen INT NOT NULL,
  toll_yen INT NOT NULL,
  fuel_yen INT NOT NULL,
  extra_yen INT NOT NULL,
  distance_km DECIMAL(7,2) NOT NULL,
  driver_yen INT NOT NULL,
  passenger_yen INT NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID NOT NULL REFERENCES splits(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount_yen INT NOT NULL,
  status payment_status_enum NOT NULL DEFAULT 'pending',
  paypay_request_id VARCHAR(100),
  paid_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(split_id, member_id)
);

CREATE INDEX idx_trips_owner ON trips(owner_id);
CREATE INDEX idx_members_trip ON members(trip_id);
CREATE INDEX idx_days_trip ON days(trip_id);
CREATE INDEX idx_routes_day ON routes(day_id);
CREATE INDEX idx_route_segments_route ON route_segments(route_id);
CREATE INDEX idx_extra_costs_trip ON extra_costs(trip_id);
CREATE INDEX idx_splits_trip ON splits(trip_id);
CREATE INDEX idx_payments_split ON payments(split_id);

-- 開発用デフォルトユーザー（MVPで owner_id に使用）
INSERT INTO users (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'デフォルト')
ON CONFLICT (id) DO NOTHING;
