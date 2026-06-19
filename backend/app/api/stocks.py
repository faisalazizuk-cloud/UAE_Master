from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.trade import Trade
from app.models.trader import Trader
from app.schemas.news import StockInfo, StockDetailResponse

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


@router.get("/{ticker}", response_model=StockDetailResponse)
def get_stock_detail(ticker: str, db: Session = Depends(get_db)):
    ticker = ticker.upper()

    try:
        import yfinance as yf

        stock = yf.Ticker(ticker)
        info = stock.info

        stock_info = StockInfo(
            ticker=ticker,
            name=info.get("shortName", ticker),
            price=info.get("currentPrice", info.get("regularMarketPrice", 0)),
            change=info.get("regularMarketChange", 0),
            change_percent=info.get("regularMarketChangePercent", 0),
            market_cap=info.get("marketCap"),
            pe_ratio=info.get("trailingPE"),
            volume=info.get("regularMarketVolume"),
            high_52w=info.get("fiftyTwoWeekHigh"),
            low_52w=info.get("fiftyTwoWeekLow"),
            sector=info.get("sector", ""),
            industry=info.get("industry", ""),
        )

        hist = stock.history(period="1y")
        price_history = [
            {"date": idx.strftime("%Y-%m-%d"), "close": row["Close"]}
            for idx, row in hist.iterrows()
        ]
    except Exception:
        stock_info = StockInfo(
            ticker=ticker, name=ticker, price=0, change=0, change_percent=0
        )
        price_history = []

    trades = (
        db.query(Trade, Trader.name, Trader.slug)
        .join(Trader)
        .filter(Trade.ticker == ticker)
        .order_by(Trade.trade_date.desc())
        .limit(20)
        .all()
    )
    recent_trades = [
        {
            "trader_name": name,
            "trader_slug": slug,
            "action": t.action.value,
            "shares": t.shares,
            "price": t.price,
            "trade_date": t.trade_date.isoformat(),
        }
        for t, name, slug in trades
    ]

    from sqlalchemy import func

    holders = (
        db.query(
            Trader.name,
            Trader.slug,
            func.sum(
                func.case((Trade.action == "buy", Trade.shares), else_=-Trade.shares)
            ).label("net_shares"),
        )
        .join(Trade, Trade.trader_id == Trader.id)
        .filter(Trade.ticker == ticker)
        .group_by(Trader.id)
        .having(func.sum(func.case((Trade.action == "buy", Trade.shares), else_=-Trade.shares)) > 0)
        .all()
    )
    traders_holding = [
        {"trader_name": name, "trader_slug": slug, "shares": shares}
        for name, slug, shares in holders
    ]

    return StockDetailResponse(
        info=stock_info,
        traders_holding=traders_holding,
        recent_trades=recent_trades,
        price_history=price_history,
    )
