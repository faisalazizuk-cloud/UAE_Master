from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.trade import Trade
from app.models.trader import Trader
from app.models.user import User
from app.schemas.trade import TradeCreate, TradeResponse, TradeListResponse, TradeWithTrader
from app.services.auth import get_current_admin
from app.services.notification_service import create_trade_notifications

router = APIRouter(prefix="/api/trades", tags=["trades"])


@router.get("", response_model=list[TradeWithTrader])
def list_recent_trades(
    ticker: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(Trade, Trader.name, Trader.slug, Trader.category).join(Trader)
    if ticker:
        q = q.filter(Trade.ticker == ticker.upper())
    q = q.order_by(Trade.trade_date.desc()).limit(limit)
    results = q.all()

    trades = []
    for trade, trader_name, trader_slug, trader_category in results:
        t = TradeWithTrader.model_validate(trade)
        t.trader_name = trader_name
        t.trader_slug = trader_slug
        t.trader_category = trader_category.value if trader_category else ""
        trades.append(t)
    return trades


@router.post("", response_model=TradeResponse, status_code=201)
def create_trade(
    data: TradeCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    trader = db.query(Trader).filter(Trader.id == data.trader_id).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")

    trade = Trade(**data.model_dump())
    db.add(trade)
    db.commit()
    db.refresh(trade)

    create_trade_notifications(db, trade, trader)

    return trade


@router.get("/by-stock/{ticker}")
def get_trades_for_stock(ticker: str, limit: int = 50, db: Session = Depends(get_db)):
    trades = (
        db.query(Trade, Trader.name, Trader.slug)
        .join(Trader)
        .filter(Trade.ticker == ticker.upper())
        .order_by(Trade.trade_date.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": t.id,
            "trader_name": name,
            "trader_slug": slug,
            "ticker": t.ticker,
            "action": t.action.value,
            "shares": t.shares,
            "price": t.price,
            "trade_date": t.trade_date.isoformat(),
            "source": t.source,
        }
        for t, name, slug in trades
    ]
