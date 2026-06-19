"""APScheduler-based scheduled scraping tasks."""

import logging

from apscheduler.schedulers.background import BackgroundScheduler

from app.config import get_settings
from app.database import SessionLocal

logger = logging.getLogger(__name__)
settings = get_settings()

scheduler = BackgroundScheduler()


def run_all_scrapers():
    """Run all scraping jobs."""
    db = SessionLocal()
    try:
        from app.scrapers.sec_edgar import scrape_all_13f
        from app.scrapers.ark_invest import fetch_ark_trades
        from app.scrapers.congress import fetch_congressional_trades

        logger.info("Running all scrapers...")
        scrape_all_13f(db)
        fetch_ark_trades(db)
        fetch_congressional_trades(db)
        logger.info("All scrapers completed")
    except Exception as e:
        logger.error(f"Scraper error: {e}")
    finally:
        db.close()


def run_news_refresh():
    """Refresh news feeds and generate AI summaries."""
    db = SessionLocal()
    try:
        from app.scrapers.news_scraper import fetch_news_from_rss, fetch_news_from_api, generate_ai_summaries

        logger.info("Refreshing news...")
        fetch_news_from_rss(db)
        fetch_news_from_api(db)
        generate_ai_summaries(db)
        logger.info("News refresh completed")
    except Exception as e:
        logger.error(f"News refresh error: {e}")
    finally:
        db.close()


def start_scheduler():
    """Start the background scheduler with all jobs."""
    scheduler.add_job(
        run_all_scrapers,
        "interval",
        hours=settings.SCRAPE_INTERVAL_HOURS,
        id="scrape_all",
        replace_existing=True,
    )
    scheduler.add_job(
        run_news_refresh,
        "interval",
        minutes=settings.NEWS_REFRESH_MINUTES,
        id="news_refresh",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        f"Scheduler started: scrapers every {settings.SCRAPE_INTERVAL_HOURS}h, "
        f"news every {settings.NEWS_REFRESH_MINUTES}min"
    )


def stop_scheduler():
    """Stop the background scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")
