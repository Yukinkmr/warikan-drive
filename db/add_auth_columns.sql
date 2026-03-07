-- users テーブルに認証用の列を追加
-- Supabase の SQL Editor でこのファイルの内容を貼り付けて Run する
-- 既に列がある場合は「column already exists」と出るが、その場合は問題なし（次の文へ進む）

-- 1. email 列（なければ追加）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.users ADD COLUMN email VARCHAR(255);
  END IF;
END $$;

-- 2. password_hash 列（なければ追加）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE public.users ADD COLUMN password_hash VARCHAR(255);
  END IF;
END $$;

-- 3. google_sub 列（なければ追加）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'google_sub'
  ) THEN
    ALTER TABLE public.users ADD COLUMN google_sub VARCHAR(255);
  END IF;
END $$;

-- 4. email のユニーク制約（email 列が存在し、制約がまだない場合のみ追加）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_users_email' AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT uq_users_email UNIQUE (email);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 5. google_sub のユニーク制約（google_sub 列が存在し、制約がまだない場合のみ追加）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'google_sub'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_users_google_sub' AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT uq_users_google_sub UNIQUE (google_sub);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
