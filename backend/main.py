from contextlib import asynccontextmanager
import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import engine, Base
from routers import auth, trips, days, routes, extra_costs, splits, payments, members


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
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.exception_handler(Exception)
def unhandled_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    print(f"[500] {request.url}\n{tb}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
    )


app.include_router(auth.router, prefix="/api/v1")
app.include_router(trips.router, prefix="/api/v1")
app.include_router(days.router, prefix="/api/v1")
app.include_router(routes.router, prefix="/api/v1")
app.include_router(extra_costs.router, prefix="/api/v1")
app.include_router(splits.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(members.router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "name": "割り勘ドライブ API",
        "version": "0.1.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/api/v1/health",
    }


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}
