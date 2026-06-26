"""Congressional stock trade scraper using Capitol Trades / Quiver Quantitative."""

import logging
from datetime import datetime

import httpx
from sqlalchemy.orm import Session

from app.models.trade import Trade, TradeAction
from app.models.trader import Trader, TraderCategory

logger = logging.getLogger(__name__)

CAPITOL_TRADES_URL = "https://www.capitoltrades.com/trades"
QUIVER_API_URL = "https://api.quiverquant.com/beta/live/congresstrading"


def fetch_congressional_trades(db: Session):
    """Fetch congressional stock trades."""
    try:
        resp = httpx.get(
            CAPITOL_TRADES_URL,
            headers={"User-Agent": "TradeTracker/1.0"},
            timeout=30,
            follow_redirects=True,
        )
        if resp.status_code == 200:
            _parse_capitol_trades(db, resp.text)
        else:
            logger.warning(f"Capitol Trades returned {resp.status_code}")
    except Exception as e:
        logger.error(f"Error fetching congressional trades: {e}")


def _parse_capitol_trades(db: Session, html: str):
    """Parse congressional trades from Capitol Trades HTML."""
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")
    rows = soup.select("table tbody tr")

    count = 0
    for row in rows[:100]:
        cells = row.find_all("td")
        if len(cells) < 6:
            continue

        try:
            politician = cells[0].get_text(strip=True)
            ticker = cells[2].get_text(strip=True)
            trade_type = cells[3].get_text(strip=True).lower()
            date_str = cells[5].get_text(strip=True)

            if not ticker or not politician:
                continue

            action = TradeAction.BUY if "purchase" in trade_type or "buy" in trade_type else TradeAction.SELL

            try:
                trade_date = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                trade_date = datetime.utcnow()

            trader = (
                db.query(Trader)
                .filter(Trader.name == politician, Trader.category == TraderCategory.CONGRESSIONAL)
                .first()
            )
            if not trader:
                continue

            existing = (
                db.query(Trade)
                .filter(
                    Trade.trader_id == trader.id,
                    Trade.ticker == ticker.upper(),
                    Trade.trade_date == trade_date,
                    Trade.action == action,
                )
                .first()
            )
            if existing:
                continue

            trade = Trade(
                trader_id=trader.id,
                ticker=ticker.upper(),
                action=action,
                trade_date=trade_date,
                source="Capitol Trades",
                source_url=CAPITOL_TRADES_URL,
                filing_type="Congressional",
            )
            db.add(trade)
            count += 1

        except Exception as e:
            logger.error(f"Error parsing congressional trade row: {e}")
            continue

    db.commit()
    logger.info(f"Added {count} congressional trades")
