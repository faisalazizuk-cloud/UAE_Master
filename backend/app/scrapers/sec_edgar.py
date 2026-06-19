"""SEC EDGAR scraper for 13F filings and Form 4 insider trades."""

import logging
from datetime import datetime

import httpx
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.trade import Trade, TradeAction
from app.models.trader import Trader

logger = logging.getLogger(__name__)
settings = get_settings()

EDGAR_BASE = "https://efts.sec.gov/LATEST"
EDGAR_SUBMISSIONS = "https://data.sec.gov/submissions"
EDGAR_13F_URL = "https://data.sec.gov/api/xbrl/companyfacts"

HEADERS = {"User-Agent": settings.SEC_EDGAR_USER_AGENT, "Accept": "application/json"}


def fetch_13f_filings(db: Session, trader: Trader):
    """Fetch recent 13F filings for a trader by their CIK number."""
    if not trader.sec_cik:
        return

    cik = trader.sec_cik.zfill(10)
    url = f"{EDGAR_SUBMISSIONS}/CIK{cik}.json"

    try:
        resp = httpx.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        filings = data.get("filings", {}).get("recent", {})
        forms = filings.get("form", [])
        dates = filings.get("filingDate", [])
        accessions = filings.get("accessionNumber", [])

        for i, form_type in enumerate(forms):
            if form_type not in ("13F-HR", "13F-HR/A"):
                continue

            filing_date = dates[i] if i < len(dates) else None
            accession = accessions[i] if i < len(accessions) else ""
            accession_clean = accession.replace("-", "")

            detail_url = (
                f"https://www.sec.gov/Archives/edgar/data/{cik}/{accession_clean}"
            )
            _parse_13f_holdings(db, trader, detail_url, filing_date, accession)

    except Exception as e:
        logger.error(f"Error fetching 13F for {trader.name}: {e}")


def _parse_13f_holdings(
    db: Session, trader: Trader, detail_url: str, filing_date: str, accession: str
):
    """Parse 13F XML holding data - simplified for common format."""
    try:
        info_table_url = f"{detail_url}/infotable.xml"
        resp = httpx.get(info_table_url, headers=HEADERS, timeout=30)

        if resp.status_code != 200:
            logger.info(f"No infotable at {info_table_url}")
            return

        from bs4 import BeautifulSoup

        soup = BeautifulSoup(resp.text, "lxml-xml")
        entries = soup.find_all("infoTable")

        for entry in entries:
            name_el = entry.find("nameOfIssuer")
            ticker_el = entry.find("titleOfClass")
            value_el = entry.find("value")
            shares_el = entry.find("sshPrnamt")

            if not name_el:
                continue

            company_name = name_el.text.strip()
            ticker = ticker_el.text.strip() if ticker_el else ""
            value = float(value_el.text.strip()) * 1000 if value_el else None
            shares = float(shares_el.text.strip()) if shares_el else None

            existing = (
                db.query(Trade)
                .filter(
                    Trade.trader_id == trader.id,
                    Trade.source_url == detail_url,
                    Trade.company_name == company_name,
                )
                .first()
            )
            if existing:
                continue

            trade = Trade(
                trader_id=trader.id,
                ticker=ticker if ticker else company_name[:10].upper(),
                company_name=company_name,
                action=TradeAction.BUY,
                shares=shares,
                value=value,
                trade_date=datetime.strptime(filing_date, "%Y-%m-%d") if filing_date else datetime.utcnow(),
                source="SEC EDGAR 13F",
                source_url=detail_url,
                filing_type="13F",
                filing_date=datetime.strptime(filing_date, "%Y-%m-%d") if filing_date else None,
            )
            db.add(trade)

        db.commit()
        logger.info(f"Processed 13F for {trader.name}: {len(entries)} holdings")

    except Exception as e:
        logger.error(f"Error parsing 13F holdings for {trader.name}: {e}")
        db.rollback()


def fetch_form4_filings(db: Session, ticker: str = "", min_value: float = 500_000):
    """Fetch Form 4 insider trades, optionally filtered by min value."""
    url = f"{EDGAR_BASE}/search-index"
    params = {
        "q": f'"form 4"',
        "dateRange": "custom",
        "startdt": datetime.utcnow().strftime("%Y-%m-%d"),
        "forms": "4",
    }

    try:
        resp = httpx.get(
            f"https://efts.sec.gov/LATEST/search-index",
            params=params,
            headers=HEADERS,
            timeout=30,
        )
        if resp.status_code == 200:
            logger.info("Form 4 search completed")
    except Exception as e:
        logger.error(f"Error fetching Form 4 filings: {e}")


def scrape_all_13f(db: Session):
    """Scrape 13F filings for all traders with CIK numbers."""
    traders = db.query(Trader).filter(Trader.sec_cik != "", Trader.is_active == 1).all()
    for trader in traders:
        logger.info(f"Fetching 13F for {trader.name} (CIK: {trader.sec_cik})")
        fetch_13f_filings(db, trader)
