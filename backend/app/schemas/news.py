from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NewsArticleResponse(BaseModel):
    id: int
    title: str
    url: str
    source: str
    author: str
    thumbnail_url: str
    published_at: Optional[datetime] = None
    content_snippet: str
    ai_summary: str
    related_tickers: str
    category: str
    created_at: datetime
    trader_badges: list[str] = []

    class Config:
        from_attributes = True


class NewsListResponse(BaseModel):
    articles: list[NewsArticleResponse]
    total: int


class StockInfo(BaseModel):
    ticker: str
    name: str
    price: float
    change: float
    change_percent: float
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    volume: Optional[int] = None
    high_52w: Optional[float] = None
    low_52w: Optional[float] = None
    sector: str = ""
    industry: str = ""


class StockDetailResponse(BaseModel):
    info: StockInfo
    traders_holding: list[dict] = []
    recent_trades: list[dict] = []
    price_history: list[dict] = []
