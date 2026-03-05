from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routers import trips, days, routes, extra_costs, splits, payments, members


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 起動時: 必要ならテーブル作成（Alembic 使用時は通常不要）
    # Base.metadata.create_all(bind=engine)
    yield
    # シャットダウン時
    pass


app = FastAPI(
    title="割り勘ドライブ API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trips.router, prefix="/api/v1")
app.include_router(days.router, prefix="/api/v1")
app.include_router(routes.router, prefix="/api/v1")
app.include_router(extra_costs.router, prefix="/api/v1")
app.include_router(splits.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(members.router, prefix="/api/v1")


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}
