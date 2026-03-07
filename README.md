# 割り勘ドライブ

友達と複数人で車に乗る運転手向けに、**運転手への傾斜割り勘**・**ETC/現金の高速料金**・**集金**をまとめて扱うWebアプリです。

---

## アプリの説明

### 解決する課題

- 運転手への傾斜割り勘の計算が難しい
- ETCの高速料金がその場でわからない
- 集金が遅れる

### 主な機能（MVP）

| 機能 | 説明 |
|------|------|
| 時間帯入力 | 出発時刻を入力（ETC割引率に影響） |
| 経路候補 | Google Maps Routes API で複数経路を表示・選択 |
| 高速料金 | ETC/現金の料金を自動取得 |
| 追加費用 | レンタカー・駐車場代の入力 |
| 傾斜割り勘 | 運転手優遇率を設定して自動計算 |
| Google Map連携 | 選択ルートをGoogle Mapナビに連携 |
| ルート修正 | ルートごとに後から経路の選択・修正 |

---

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | Next.js 16 (App Router) + React 18 + TypeScript |
| スタイリング | Tailwind CSS |
| バックエンド | FastAPI (Python 3.11) + Pydantic v2 |
| ORM | SQLAlchemy |
| データベース | PostgreSQL 16 |
| 外部API | Google Maps Routes API |
| 環境 | Docker / docker-compose（開発時は override でホットリロード） |
| フロントデプロイ | Vercel |
| バックデプロイ | Vercel（Serverless Functions + Mangum） |

---

## フォルダ構成

```
warikan-drive/
├── README.md
├── docker-compose.yml
├── docker-compose.override.yml   # 開発用（コードマウント・ホットリロード）
├── .env.example
├── .gitignore
│
├── db/
│   └── init.sql                 # DB初期化（テーブル・ENUM・デフォルトユーザー）
│
├── frontend/                     # Next.js
│   ├── Dockerfile                # 本番ビルド用
│   ├── Dockerfile.dev            # 開発用（npm run dev）
│   ├── package.json
│   ├── package-lock.json         # npm install で生成（再現ビルド用）
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx          # トップ（旅行一覧）
│       │   └── trips/
│       │       ├── new/
│       │       │   └── page.tsx  # 新規旅行作成
│       │       └── [tripId]/
│       │           ├── page.tsx  # 旅行詳細・ルート管理
│       │           └── split/
│       │               └── page.tsx  # 割り勘計算・結果
│       ├── components/
│       │   ├── ui/
│       │   ├── RouteCard.tsx
│       │   ├── DayBlock.tsx
│       │   └── SegmentSelector.tsx
│       ├── lib/
│       │   ├── api.ts            # バックエンドAPIクライアント
│       │   └── utils.ts
│       └── types/
│           └── index.ts
│
└── backend/                      # FastAPI
    ├── Dockerfile
    ├── requirements.txt
    ├── main.py
    ├── database.py
    ├── models/
    ├── schemas/
    ├── routers/
    ├── services/
    │   ├── google_maps.py        # Routes API呼び出し
    │   └── split_calculator.py   # 割り勘計算ロジック
    └── alembic/                  # マイグレーション
```

---

## ローカルで動かす手順（Docker）

### 1. リポジトリをクローン

```bash
git clone https://github.com/Yukinkmr/warikan-drive
cd warikan-drive
```

### 2. 環境変数ファイルを作成

```bash
cp .env.example .env
```

**.env を編集します。**

- **DATABASE_URL（必須）**  
  Supabase でプロジェクトを作成し、ダッシュボードの **Connect** から接続文字列（URI）をコピーして `DATABASE_URL` に貼り付けます。初回のみ Supabase の **SQL Editor** で `db/init.sql` を実行してテーブルを作成してください。
- **Google Maps 経路・料金・地図表示を使う場合**  
  - バックエンド（経路検索）: `.env` の `GOOGLE_MAPS_API_KEY` を設定。未設定時はモックで動作します。
  - フロントエンド（地図・住所オートコンプリート）: `.env` に `NEXT_PUBLIC_GOOGLE_MAPS_KEY` を同じ API キーで設定してください。未設定の場合は地図は「API キー未設定」と表示され、住所は手入力のみになります。[Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/get-api-key) を有効にしたキーが必要です。

### 3. Docker で起動

```bash
docker compose up --build
```

**デフォルトでは DB コンテナは起動しません。** バックエンドとフロントエンドだけが立ち、`.env` の `DATABASE_URL`（Supabase）に接続します。

**開発時**は `docker-compose.override.yml` が自動で使われ、コードをマウントした状態で起動します。

- **バックエンド**: ソースをマウントし `uvicorn --reload` で起動。Python を編集して保存すると自動で再起動します。
- **フロントエンド**: ソースをマウントし `npm run dev` で起動。コードを保存するとブラウザが自動更新（ホットリロード）されます。

コード変更のたびにイメージを再ビルドする必要はありません。初回のみ `--build` でビルドし、2回目以降は `docker compose up` だけでOKです。`package.json` や `requirements.txt` を変更したときだけ再ビルド（`docker compose up --build`）してください。

初回はイメージのビルドに少し時間がかかります。開発時はフロントエンドの初回起動でコンテナ内の `npm install` が走るため、1〜2 分待つことがあります。ログに `Ready in` や `Local: http://localhost:3000` が出れば準備完了です。

### 4. ブラウザで開く

起動が完了したら、次のURLでアクセスします。

| サービス | URL |
|----------|-----|
| **フロントエンド（アプリ）** | **http://localhost:3000** |
| バックエンド API（Swagger） | http://localhost:8001/docs |
| バックエンド API（ReDoc） | http://localhost:8001/redoc |

※ バックエンドはコンテナ内 8000 をホストの **8001** にマッピングしています。

**http://localhost:3000** を開くと「割り勘ドライブ」のトップ（旅行一覧）が表示されます。

### 5. 基本的な操作の流れ

1. トップで **「＋ 新しい旅行を作成」** をクリック
2. 旅行詳細（ルート管理）で **「日付を追加」** で日付を追加
3. 各日の **「＋ ルートを追加」** でルートを追加し、**出発地・目的地・出発時刻** を入力
4. **「🔍 経路を検索」** で経路候補を取得し、**「▼ 経路を選ぶ」** で使う経路を選択
5. 割り勘に含めたいルートで **「割り勘に含む」** をクリック
6. **「💰 割り勘計算」** タブ（または **「○ルートで割り勘計算 →」**）で割り勘ページへ移動
7. 追加費用があれば入力し、**「割り勘を計算する →」** で結果を表示

### 6. 停止

```bash
docker compose down
```

ローカル DB を使っている場合にボリュームごと削除する場合:

```bash
docker compose --profile local-db down -v
```

---

## ローカル PostgreSQL を使う場合

Supabase ではなく、PC 上の PostgreSQL コンテナで動かす場合は、`.env` の `DATABASE_URL` を削除するか `postgresql://postgres:postgres@db:5432/warikan_drive` にし、**`local-db` プロファイル**を付けて起動します。

```bash
docker compose --profile local-db up --build
```

db / backend / frontend の 3 サービスが起動し、データはローカルボリュームに保存されます。

---

## Vercel デプロイ（フル構成）

フロント・バックともに Vercel、DB は Supabase の構成でデプロイできます。**フロントとバックは別々の Vercel プロジェクト**として登録します。

### 前提

- GitHub にリポジトリを push 済み
- Supabase でプロジェクト作成済み・`db/init.sql` 実行済み・接続文字列（**Pooler の URI**）を取得済み

### 1. Vercel でバックエンドをデプロイ

1. [Vercel](https://vercel.com) にログイン → **Add New** → **Project**
2. 対象リポジトリを選択
3. **Root Directory** を **`backend`** に設定（Edit）
4. **Environment Variables** に追加:
   - `DATABASE_URL` … Supabase の接続文字列（Session または Transaction の URI）
   - `GOOGLE_MAPS_API_KEY` … 任意
5. **Deploy** する
6. デプロイ後の URL を控える（例: `https://warikan-backend-xxx.vercel.app`）

### 2. Vercel でフロントエンドをデプロイ

1. **Add New** → **Project** で同じリポジトリを再度選択（2つ目のプロジェクト）
2. **Root Directory** を **`frontend`** に設定
3. **Environment Variables** に追加:
   - `NEXT_PUBLIC_API_BASE_URL` … バックエンドの URL + `/api/v1`（例: `https://warikan-backend-xxx.vercel.app/api/v1`）
   - `NEXT_PUBLIC_GOOGLE_MAPS_KEY` … 地図表示・住所サジェスト用の Google Maps API キー（任意。未設定なら地図は「API キー未設定」、住所は手入力のみ。[Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/get-api-key) を有効にしたキーを設定）
4. **Deploy** する（環境変数を追加・変更した場合は **Redeploy** で再ビルドが必要です）

### 3. 動作確認

フロントの Vercel URL を開き、旅行作成や割り勘計算ができることを確認します。Supabase の Table Editor でデータが入っているかも確認できます。

### 環境変数一覧

| 変数 | 設定する場所 | 説明 |
|------|--------------|------|
| `DATABASE_URL` | Vercel バックエンド | Supabase の接続文字列（Pooler 推奨） |
| `GOOGLE_MAPS_API_KEY` | Vercel バックエンド | 経路検索用（任意） |
| `NEXT_PUBLIC_API_BASE_URL` | Vercel フロント | バックエンドの URL + `/api/v1` |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Vercel フロント | 地図・住所サジェスト用（任意。Maps JavaScript API を有効にしたキー） |

### 注意点

- **Vercel Hobby**: 非商用利用。Serverless のコールドスタートで初回 1〜3 秒遅くなることがあります。
- **Supabase 無料枠**: 7 日間アクセスがないと DB がスリープします。デモ前に Supabase ダッシュボードや API にアクセスして起こしておくと安全です。
- push を main にマージすると、Vercel が自動で再デプロイします。CI（Lint 等）は `.github/workflows/ci.yml` で実行されます。
- **DB の自動マイグレーション**: main への push 時に、GitHub Actions の **DB Migrate** ジョブで `alembic upgrade head` が実行されます。**GitHub リポジトリの Settings → Secrets and variables → Actions** に **`DATABASE_URL`**（Supabase の接続文字列）を登録しておくと、本番 DB へマイグレーションが自動適用されます。未登録の場合はマイグレーションジョブが失敗するため、手動で `cd backend && DATABASE_URL=... alembic upgrade head` を実行してください。

---

## 補足

- **API キー**  
  Google Maps Routes API のキーは [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成し、Routes API を有効化して取得します。
- **開発用と本番用の Docker**  
  - **開発時**: `docker-compose.override.yml` が自動でマージされ、フロントは `Dockerfile.dev` で起動します。イメージビルドでは `npm install` は行わず、コンテナ起動時に `npm install && npm run dev` を実行するため、イメージビルドは短時間で完了します。`node_modules` は名前付きボリュームで永続化されます。
  - **本番ビルド**: `docker-compose.yml` のみで起動する場合は `frontend/Dockerfile` が使われ、マルチステージビルドで `npm run build` した結果を配信します。`package.json` や `requirements.txt` を変更したあとは `docker compose up --build` で再ビルドしてください。
- **Node.js バージョン**  
  フロントエンド（Next.js 16）は Node.js 20 以上を想定しています。Docker では node:20-alpine を使用しています。
- **バックエンド単体**  
  ローカル DB を Docker で動かし、バックエンドだけ手元で実行する場合は、`.env` の `DATABASE_URL` を `postgresql://postgres:postgres@localhost:5432/warikan_drive` にし、`docker compose --profile local-db up db -d` のあと `cd backend && uvicorn main:app --reload` で起動できます。API は http://localhost:8000 でアクセスできます（compose では 8001 にマッピング）。
- **フロントエンド単体**  
  `cd frontend && npm install && npm run dev` で http://localhost:3000 で起動できます。バックエンドは別途起動し、`NEXT_PUBLIC_API_BASE_URL` をバックエンドの URL（例: `http://localhost:8001/api/v1`）に合わせてください。
