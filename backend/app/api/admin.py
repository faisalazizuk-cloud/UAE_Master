from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.trade import Trade
from app.models.trader import Trader
from app.models.user import User
from app.models.news import NewsArticle
from app.services.auth import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats")
def admin_stats(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return {
        "total_traders": db.query(Trader).count(),
        "active_traders": db.query(Trader).filter(Trader.is_active == 1).count(),
        "total_trades": db.query(Trade).count(),
        "total_users": db.query(User).count(),
        "total_news_articles": db.query(NewsArticle).count(),
    }


@router.post("/scrape/trigger")
def trigger_scrape(admin: User = Depends(get_current_admin)):
    from app.tasks.scheduler import run_all_scrapers
    try:
        run_all_scrapers()
        return {"status": "Scraping jobs triggered"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@router.post("/news/refresh")
def trigger_news_refresh(admin: User = Depends(get_current_admin)):
    from app.tasks.scheduler import run_news_refresh
    try:
        run_news_refresh()
        return {"status": "News refresh triggered"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
