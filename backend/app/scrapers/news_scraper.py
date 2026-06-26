"""Financial news scraper using NewsAPI and RSS feeds."""

import logging
from datetime import datetime

import httpx
import feedparser
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.news import NewsArticle

logger = logging.getLogger(__name__)
settings = get_settings()

RSS_FEEDS = [
    {"name": "CNBC", "url": "https://www.cnbc.com/id/100003114/device/rss/rss.html"},
    {"name": "Reuters Business", "url": "https://feeds.reuters.com/reuters/businessNews"},
    {"name": "MarketWatch", "url": "https://feeds.marketwatch.com/marketwatch/topstories/"},
    {"name": "Seeking Alpha", "url": "https://seekingalpha.com/market_currents.xml"},
    {"name": "Benzinga", "url": "https://www.benzinga.com/feeds/"},
    {"name": "Finviz", "url": "https://finviz.com/news.ashx"},
]

COMMON_TICKERS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK.B",
    "JPM", "V", "UNH", "XOM", "JNJ", "PG", "MA", "HD", "COST", "ABBV",
    "MRK", "AVGO", "PEP", "KO", "LLY", "TMO", "ADBE", "CRM", "NFLX",
    "AMD", "INTC", "QCOM", "ORCL", "CSCO", "ACN", "TXN", "PLTR", "SOFI",
]


def _extract_tickers(text: str) -> str:
    """Extract stock ticker symbols from text."""
    found = []
    upper_text = text.upper()
    for ticker in COMMON_TICKERS:
        if ticker in upper_text:
            found.append(ticker)
    return ",".join(found[:5])


def fetch_news_from_rss(db: Session):
    """Fetch news articles from RSS feeds."""
    total_added = 0

    for feed_info in RSS_FEEDS:
        try:
            feed = feedparser.parse(feed_info["url"])
            for entry in feed.entries[:20]:
                url = entry.get("link", "")
                if not url:
                    continue

                existing = db.query(NewsArticle).filter(NewsArticle.url == url).first()
                if existing:
                    continue

                title = entry.get("title", "")
                published = entry.get("published_parsed")
                pub_date = datetime(*published[:6]) if published else datetime.utcnow()
                summary = entry.get("summary", entry.get("description", ""))[:500]

                thumbnail = ""
                if hasattr(entry, "media_content") and entry.media_content:
                    thumbnail = entry.media_content[0].get("url", "")
                elif hasattr(entry, "media_thumbnail") and entry.media_thumbnail:
                    thumbnail = entry.media_thumbnail[0].get("url", "")

                tickers = _extract_tickers(f"{title} {summary}")

                article = NewsArticle(
                    title=title,
                    url=url,
                    source=feed_info["name"],
                    thumbnail_url=thumbnail,
                    published_at=pub_date,
                    content_snippet=summary,
                    related_tickers=tickers,
                    category="market",
                )
                db.add(article)
                total_added += 1

        except Exception as e:
            logger.error(f"Error fetching RSS from {feed_info['name']}: {e}")
            continue

    db.commit()
    logger.info(f"Added {total_added} news articles from RSS")


def fetch_news_from_api(db: Session):
    """Fetch news from NewsAPI."""
    if not settings.NEWS_API_KEY:
        logger.warning("NEWS_API_KEY not set, skipping NewsAPI fetch")
        return

    try:
        resp = httpx.get(
            "https://newsapi.org/v2/top-headlines",
            params={
                "category": "business",
                "language": "en",
                "pageSize": 50,
                "apiKey": settings.NEWS_API_KEY,
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()

        count = 0
        for article in data.get("articles", []):
            url = article.get("url", "")
            if not url:
                continue

            existing = db.query(NewsArticle).filter(NewsArticle.url == url).first()
            if existing:
                continue

            title = article.get("title", "")
            pub_str = article.get("publishedAt", "")
            try:
                pub_date = datetime.fromisoformat(pub_str.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                pub_date = datetime.utcnow()

            tickers = _extract_tickers(f"{title} {article.get('description', '')}")

            news = NewsArticle(
                title=title,
                url=url,
                source=article.get("source", {}).get("name", ""),
                author=article.get("author", ""),
                thumbnail_url=article.get("urlToImage", ""),
                published_at=pub_date,
                content_snippet=article.get("description", "")[:500],
                related_tickers=tickers,
                category="market",
            )
            db.add(news)
            count += 1

        db.commit()
        logger.info(f"Added {count} articles from NewsAPI")

    except Exception as e:
        logger.error(f"Error fetching from NewsAPI: {e}")


def generate_ai_summaries(db: Session):
    """Generate AI summaries for articles that don't have them."""
    if not settings.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not set, skipping AI summaries")
        return

    articles = (
        db.query(NewsArticle)
        .filter(NewsArticle.ai_summary == "")
        .limit(20)
        .all()
    )

    if not articles:
        return

    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        for article in articles:
            try:
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {
                            "role": "system",
                            "content": "Summarize this financial news article in 1-2 sentences. Be concise and factual.",
                        },
                        {
                            "role": "user",
                            "content": f"Title: {article.title}\n\nContent: {article.content_snippet}",
                        },
                    ],
                    max_tokens=100,
                )
                article.ai_summary = response.choices[0].message.content.strip()
            except Exception as e:
                logger.error(f"Error generating summary for article {article.id}: {e}")
                continue

        db.commit()
        logger.info(f"Generated AI summaries for {len(articles)} articles")

    except Exception as e:
        logger.error(f"Error initializing OpenAI client: {e}")
