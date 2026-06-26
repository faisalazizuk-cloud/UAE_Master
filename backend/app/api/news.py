from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.news import NewsArticle
from app.models.trade import Trade
from app.models.trader import Trader
from app.models.user import User, UserFollow
from app.schemas.news import NewsArticleResponse, NewsListResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/news", tags=["news"])


def _add_trader_badges(articles: list, db: Session) -> list[NewsArticleResponse]:
    results = []
    for article in articles:
        resp = NewsArticleResponse.model_validate(article)
        if article.related_tickers:
            tickers = [t.strip() for t in article.related_tickers.split(",") if t.strip()]
            badges = []
            for ticker in tickers[:3]:
                trader_trades = (
                    db.query(Trade, Trader.name)
                    .join(Trader)
                    .filter(Trade.ticker == ticker)
                    .order_by(Trade.trade_date.desc())
                    .limit(2)
                    .all()
                )
                for trade, trader_name in trader_trades:
                    action = "holds" if trade.action.value == "buy" else "recently traded"
                    badges.append(f"{trader_name} {action} {ticker}")
            resp.trader_badges = badges[:5]
        results.append(resp)
    return results


@router.get("/feed", response_model=NewsListResponse)
def get_news_feed(
    ticker: Optional[str] = None,
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(30, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(NewsArticle)
    if ticker:
        q = q.filter(NewsArticle.related_tickers.contains(ticker.upper()))
    if category:
        q = q.filter(NewsArticle.category == category)

    total = q.count()
    articles = q.order_by(NewsArticle.published_at.desc()).offset(skip).limit(limit).all()
    enriched = _add_trader_badges(articles, db)
    return NewsListResponse(articles=enriched, total=total)


@router.get("/personalized", response_model=NewsListResponse)
def get_personalized_news(
    skip: int = 0,
    limit: int = Query(20, le=50),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    followed_trader_ids = [
        f.trader_id for f in db.query(UserFollow).filter(UserFollow.user_id == user.id).all()
    ]
    if not followed_trader_ids:
        return NewsListResponse(articles=[], total=0)

    tickers = (
        db.query(Trade.ticker)
        .filter(Trade.trader_id.in_(followed_trader_ids))
        .distinct()
        .all()
    )
    ticker_set = {t[0] for t in tickers}

    q = db.query(NewsArticle)
    if ticker_set:
        conditions = [NewsArticle.related_tickers.contains(t) for t in list(ticker_set)[:20]]
        from sqlalchemy import or_
        q = q.filter(or_(*conditions))

    total = q.count()
    articles = q.order_by(NewsArticle.published_at.desc()).offset(skip).limit(limit).all()
    enriched = _add_trader_badges(articles, db)
    return NewsListResponse(articles=enriched, total=total)


@router.get("/trending")
def get_trending_tickers(db: Session = Depends(get_db)):
    from sqlalchemy import func
    from datetime import datetime, timedelta

    cutoff = datetime.utcnow() - timedelta(days=1)
    articles = (
        db.query(NewsArticle)
        .filter(NewsArticle.published_at >= cutoff)
        .all()
    )

    ticker_counts: dict[str, int] = {}
    for article in articles:
        if article.related_tickers:
            for t in article.related_tickers.split(","):
                t = t.strip()
                if t:
                    ticker_counts[t] = ticker_counts.get(t, 0) + 1

    sorted_tickers = sorted(ticker_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    return [{"ticker": t, "count": c} for t, c in sorted_tickers]
