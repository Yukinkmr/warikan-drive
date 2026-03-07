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
| フロントデプロイ | Vercel（想定） |
| バックデプロイ | Render（想定） |

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

必要に応じて `.env` を編集します。

- **Google Maps 経路・料金を使う場合**  
  `GOOGLE_MAPS_API_KEY` に API キーを設定してください。  
  未設定の場合はモックの経路・料金で動作します。
- その他の項目はそのままで Docker 利用時は問題ありません。

### 3. Docker で起動

```bash
docker compose up --build
```

**開発時**は `docker-compose.override.yml` が自動で使われ、コードをマウントした状態で起動します。

- **バックエンド**: ソースをマウントし `uvicorn --reload` で起動。Python を編集して保存すると自動で再起動します。
- **フロントエンド**: ソースをマウントし `npm run dev` で起動。コードを保存するとブラウザが自動更新（ホットリロード）されます。

コード変更のたびにイメージを再ビルドする必要はありません。初回のみ `--build` でビルドし、2回目以降は `docker compose up` だけでOKです。`package.json` や `requirements.txt` を変更したときだけ再ビルド（`docker compose up --build`）してください。

初回はイメージのビルドと DB 初期化に少し時間がかかります。開発時はフロントエンドの初回起動でコンテナ内の `npm install` が走るため、1〜2 分待つことがあります。ログに `Ready in` や `Local: http://localhost:3000` が出れば準備完了です。

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

DB データを消す場合（ボリュームごと削除）:

```bash
docker compose down -v
```

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
  DB だけ Docker で動かし、バックエンドを手元で実行する場合は、`.env` の `DATABASE_URL` を `postgresql://postgres:postgres@localhost:5432/warikan_drive` にし、`docker compose up db -d` のあと `cd backend && uvicorn main:app --reload` で起動できます。API は http://localhost:8000 でアクセスできます（compose では 8001 にマッピング）。
- **フロントエンド単体**  
  `cd frontend && npm install && npm run dev` で http://localhost:3000 で起動できます。バックエンドは別途起動し、`NEXT_PUBLIC_API_BASE_URL` をバックエンドの URL（例: `http://localhost:8001/api/v1`）に合わせてください。
