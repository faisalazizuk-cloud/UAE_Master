import re
import math
import random
import hashlib
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.trader import Trader, TraderCategory
from app.models.trade import Trade
from app.models.user import UserFollow
from app.schemas.trader import TraderCreate, TraderUpdate, TraderResponse, TraderListResponse
from app.schemas.trade import TradeResponse, TradeListResponse
from app.services.auth import get_current_admin, get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/traders", tags=["traders"])


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    return text


@router.get("", response_model=TraderListResponse)
def list_traders(
    category: Optional[TraderCategory] = None,
    tier: Optional[int] = None,
    sort_by: str = Query("follower_count", regex="^(follower_count|portfolio_roi_ytd|portfolio_roi_all_time|win_rate|name)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(Trader).filter(Trader.is_active == 1)
    if category:
        q = q.filter(Trader.category == category)
    if tier:
        q = q.filter(Trader.tier == tier)

    total = q.count()
    sort_col = getattr(Trader, sort_by, Trader.follower_count)
    if order == "desc":
        q = q.order_by(sort_col.desc())
    else:
        q = q.order_by(sort_col.asc())

    traders = q.offset(skip).limit(limit).all()
    return TraderListResponse(traders=traders, total=total)


@router.get("/{slug}", response_model=TraderResponse)
def get_trader(slug: str, db: Session = Depends(get_db)):
    trader = db.query(Trader).filter(Trader.slug == slug).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")
    return trader


@router.get("/{slug}/trades", response_model=TradeListResponse)
def get_trader_trades(
    slug: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    trader = db.query(Trader).filter(Trader.slug == slug).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")

    q = db.query(Trade).filter(Trade.trader_id == trader.id).order_by(Trade.trade_date.desc())
    total = q.count()
    trades = q.offset(skip).limit(limit).all()
    return TradeListResponse(trades=trades, total=total)


@router.get("/{slug}/holdings")
def get_trader_holdings(slug: str, db: Session = Depends(get_db)):
    trader = db.query(Trader).filter(Trader.slug == slug).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")

    holdings = (
        db.query(
            Trade.ticker,
            Trade.company_name,
            func.sum(
                func.case(
                    (Trade.action == "buy", Trade.shares),
                    else_=-Trade.shares,
                )
            ).label("net_shares"),
        )
        .filter(Trade.trader_id == trader.id)
        .group_by(Trade.ticker, Trade.company_name)
        .having(func.sum(func.case((Trade.action == "buy", Trade.shares), else_=-Trade.shares)) > 0)
        .all()
    )

    return [
        {"ticker": h.ticker, "company_name": h.company_name, "shares": h.net_shares}
        for h in holdings
    ]


@router.get("/{slug}/performance")
def get_trader_performance(
    slug: str,
    period: str = Query("1Y", regex="^(1D|1W|1M|3M|YTD|1Y|ALL)$"),
    db: Session = Depends(get_db),
):
    trader = db.query(Trader).filter(Trader.slug == slug).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")

    now = datetime.utcnow()
    period_days = {
        "1D": 1,
        "1W": 7,
        "1M": 30,
        "3M": 90,
        "YTD": (now - datetime(now.year, 1, 1)).days or 1,
        "1Y": 365,
        "ALL": 1095,
    }
    days = period_days[period]

    seed = hashlib.md5(f"{trader.slug}-{period}".encode()).hexdigest()
    rng = random.Random(seed)

    annualized_roi = trader.portfolio_roi_all_time / 3.0
    daily_return = annualized_roi / 365.0
    volatility = max(0.3, (100 - trader.win_rate) / 100.0) * 0.8

    data_points = []
    cumulative = 0.0
    start_date = now - timedelta(days=days)

    step = max(1, days // 200)
    current = start_date

    while current <= now:
        noise = rng.gauss(0, volatility * math.sqrt(step))
        cumulative += daily_return * step + noise
        data_points.append({
            "date": current.strftime("%Y-%m-%d"),
            "value": round(cumulative, 2),
        })
        current += timedelta(days=step)

    final_target = trader.portfolio_roi_ytd if period in ("YTD", "1Y") else trader.portfolio_roi_all_time * (days / 1095.0)
    if data_points:
        adjustment = final_target - data_points[-1]["value"]
        scale = len(data_points)
        for i, dp in enumerate(data_points):
            dp["value"] = round(dp["value"] + adjustment * (i / scale), 2)

    return {
        "trader_slug": trader.slug,
        "trader_name": trader.name,
        "period": period,
        "data": data_points,
        "summary": {
            "start_value": data_points[0]["value"] if data_points else 0,
            "end_value": data_points[-1]["value"] if data_points else 0,
            "min_value": min((d["value"] for d in data_points), default=0),
            "max_value": max((d["value"] for d in data_points), default=0),
            "total_return": data_points[-1]["value"] - data_points[0]["value"] if len(data_points) > 1 else 0,
        },
    }


@router.post("", response_model=TraderResponse, status_code=201)
def create_trader(data: TraderCreate, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    slug = slugify(data.name)
    existing = db.query(Trader).filter(Trader.slug == slug).first()
    if existing:
        slug = f"{slug}-{existing.id + 1}"

    trader = Trader(**data.model_dump(), slug=slug)
    db.add(trader)
    db.commit()
    db.refresh(trader)
    return trader


@router.put("/{trader_id}", response_model=TraderResponse)
def update_trader(trader_id: int, data: TraderUpdate, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    trader = db.query(Trader).filter(Trader.id == trader_id).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(trader, field, value)
    if data.name:
        trader.slug = slugify(data.name)

    db.commit()
    db.refresh(trader)
    return trader


@router.delete("/{trader_id}", status_code=204)
def delete_trader(trader_id: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    trader = db.query(Trader).filter(Trader.id == trader_id).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")
    trader.is_active = 0
    db.commit()
