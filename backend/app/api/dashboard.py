from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.trade import Trade
from app.models.trader import Trader
from app.models.user import User, UserFollow
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
def get_dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    followed_ids = [
        f.trader_id
        for f in db.query(UserFollow).filter(UserFollow.user_id == user.id).all()
    ]

    if not followed_ids:
        return {
            "latest_trades": [],
            "followed_traders_count": 0,
            "total_trades_tracked": 0,
            "top_performers": [],
        }

    latest_trades = (
        db.query(Trade, Trader.name, Trader.slug)
        .join(Trader)
        .filter(Trade.trader_id.in_(followed_ids))
        .order_by(Trade.trade_date.desc())
        .limit(20)
        .all()
    )

    trades_list = [
        {
            "id": t.id,
            "trader_name": name,
            "trader_slug": slug,
            "ticker": t.ticker,
            "action": t.action.value,
            "shares": t.shares,
            "price": t.price,
            "trade_date": t.trade_date.isoformat(),
        }
        for t, name, slug in latest_trades
    ]

    top_performers = (
        db.query(Trader)
        .filter(Trader.id.in_(followed_ids))
        .order_by(Trader.portfolio_roi_ytd.desc())
        .limit(5)
        .all()
    )

    return {
        "latest_trades": trades_list,
        "followed_traders_count": len(followed_ids),
        "total_trades_tracked": db.query(Trade).filter(Trade.trader_id.in_(followed_ids)).count(),
        "top_performers": [
            {
                "name": t.name,
                "slug": t.slug,
                "roi_ytd": t.portfolio_roi_ytd,
                "category": t.category.value,
            }
            for t in top_performers
        ],
    }
