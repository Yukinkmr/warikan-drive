-- routes に time_type 列を追加（Supabase SQL エディターで実行）
-- 既に列がある場合はスキップ

-- 1. time_type 列（なければ追加）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'routes' AND column_name = 'time_type'
  ) THEN
    ALTER TABLE public.routes ADD COLUMN time_type VARCHAR(20);
  END IF;
END $$;

-- 2. 制約（なければ追加）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_routes_time_type'
  ) THEN
    ALTER TABLE public.routes
    ADD CONSTRAINT chk_routes_time_type
    CHECK (time_type IS NULL OR time_type IN ('DEPARTURE', 'ARRIVAL'));
  END IF;
END $$;
