"""ARK Invest daily trades CSV scraper."""

import csv
import io
import logging
from datetime import datetime

import httpx
from sqlalchemy.orm import Session

from app.models.trade import Trade, TradeAction
from app.models.trader import Trader

logger = logging.getLogger(__name__)

ARK_TRADES_URL = "https://arkfunds.io/api/v2/etf/trades"
ARK_CSV_URL = "https://ark-funds.com/wp-content/uploads/funds-etf-csv/ARK_TRADES.csv"


def fetch_ark_trades(db: Session):
    """Fetch and parse ARK Invest daily trades."""
    cathie = db.query(Trader).filter(Trader.slug == "cathie-wood").first()
    if not cathie:
        logger.warning("Cathie Wood trader not found in DB")
        return

    try:
        resp = httpx.get(ARK_CSV_URL, timeout=30, follow_redirects=True)
        if resp.status_code != 200:
            resp = httpx.get(ARK_TRADES_URL, timeout=30, follow_redirects=True)
            if resp.status_code != 200:
                logger.error(f"Failed to fetch ARK trades: {resp.status_code}")
                return
            _parse_ark_json(db, cathie, resp.json())
            return

        _parse_ark_csv(db, cathie, resp.text)

    except Exception as e:
        logger.error(f"Error fetching ARK trades: {e}")


def _parse_ark_csv(db: Session, trader: Trader, csv_text: str):
    """Parse ARK CSV format trades."""
    reader = csv.DictReader(io.StringIO(csv_text))
    count = 0

    for row in reader:
        ticker = row.get("ticker", row.get("TICKER", "")).strip()
        if not ticker:
            continue

        direction = row.get("direction", row.get("Direction", "")).strip().lower()
        action = TradeAction.BUY if direction == "buy" else TradeAction.SELL

        shares_str = row.get("shares", row.get("Shares", "0")).replace(",", "")
        try:
            shares = float(shares_str) if shares_str else None
        except ValueError:
            shares = None

        date_str = row.get("date", row.get("Date", ""))
        try:
            trade_date = datetime.strptime(date_str.strip(), "%m/%d/%Y")
        except (ValueError, AttributeError):
            trade_date = datetime.utcnow()

        fund = row.get("fund", row.get("Fund", ""))
        company = row.get("company", row.get("Company", ""))

        existing = (
            db.query(Trade)
            .filter(
                Trade.trader_id == trader.id,
                Trade.ticker == ticker,
                Trade.trade_date == trade_date,
                Trade.action == action,
            )
            .first()
        )
        if existing:
            continue

        trade = Trade(
            trader_id=trader.id,
            ticker=ticker,
            company_name=company,
            action=action,
            shares=shares,
            trade_date=trade_date,
            source=f"ARK Invest ({fund})",
            source_url=ARK_CSV_URL,
            filing_type="ARK_CSV",
        )
        db.add(trade)
        count += 1

    db.commit()
    logger.info(f"Added {count} ARK trades")


def _parse_ark_json(db: Session, trader: Trader, data: dict):
    """Parse ARK API JSON format trades."""
    trades = data.get("trades", [])
    count = 0

    for item in trades:
        ticker = item.get("ticker", "")
        if not ticker:
            continue

        direction = item.get("direction", "").lower()
        action = TradeAction.BUY if direction == "buy" else TradeAction.SELL
        shares = item.get("shares")
        trade_date_str = item.get("date", "")

        try:
            trade_date = datetime.strptime(trade_date_str, "%Y-%m-%d")
        except (ValueError, AttributeError):
            trade_date = datetime.utcnow()

        existing = (
            db.query(Trade)
            .filter(
                Trade.trader_id == trader.id,
                Trade.ticker == ticker,
                Trade.trade_date == trade_date,
                Trade.action == action,
            )
            .first()
        )
        if existing:
            continue

        trade = Trade(
            trader_id=trader.id,
            ticker=ticker,
            company_name=item.get("company", ""),
            action=action,
            shares=float(shares) if shares else None,
            trade_date=trade_date,
            source="ARK Invest API",
            source_url=ARK_TRADES_URL,
            filing_type="ARK_API",
        )
        db.add(trade)
        count += 1

    db.commit()
    logger.info(f"Added {count} ARK trades from API")
