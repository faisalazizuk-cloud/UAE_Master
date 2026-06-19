from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime

from app.database import Base


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    url = Column(String(500), unique=True, nullable=False)
    source = Column(String(100), default="")
    author = Column(String(255), default="")
    thumbnail_url = Column(String(500), default="")
    published_at = Column(DateTime, nullable=True, index=True)
    content_snippet = Column(Text, default="")
    ai_summary = Column(Text, default="")
    related_tickers = Column(String(500), default="")  # comma-separated
    category = Column(String(50), default="market")  # market, macro, earnings, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
