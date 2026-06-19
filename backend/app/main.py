import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.tasks.seed import seed_database
from app.tasks.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting TradeTracker API...")
    init_db()
    seed_database()
    start_scheduler()
    yield
    stop_scheduler()
    logger.info("TradeTracker API shutting down")


app = FastAPI(
    title="TradeTracker API",
    description="Track millionaire traders, hedge fund managers, and congressional stock trades",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.auth import router as auth_router
from app.api.traders import router as traders_router
from app.api.trades import router as trades_router
from app.api.notifications import router as notifications_router
from app.api.follows import router as follows_router
from app.api.news import router as news_router
from app.api.stocks import router as stocks_router
from app.api.dashboard import router as dashboard_router
from app.api.admin import router as admin_router

app.include_router(auth_router)
app.include_router(traders_router)
app.include_router(trades_router)
app.include_router(notifications_router)
app.include_router(follows_router)
app.include_router(news_router)
app.include_router(stocks_router)
app.include_router(dashboard_router)
app.include_router(admin_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "TradeTracker API"}
