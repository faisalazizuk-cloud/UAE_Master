from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.trade import TradeAction, ConfidenceLevel


class TradeBase(BaseModel):
    ticker: str
    company_name: str = ""
    action: TradeAction
    shares: Optional[float] = None
    price: Optional[float] = None
    value: Optional[float] = None
    trade_date: datetime
    source: str = ""
    source_url: str = ""
    confidence_level: ConfidenceLevel = ConfidenceLevel.CONFIRMED


class TradeCreate(TradeBase):
    trader_id: int


class ManualTradeCreate(TradeBase):
    trader_id: int


class TradeResponse(TradeBase):
    id: int
    trader_id: int
    filing_type: str
    filing_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TradeWithTrader(TradeResponse):
    trader_name: str = ""
    trader_slug: str = ""
    trader_category: str = ""


class TradeListResponse(BaseModel):
    trades: list[TradeResponse]
    total: int
