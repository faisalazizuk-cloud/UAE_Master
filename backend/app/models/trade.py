import enum
from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.database import Base


class TradeAction(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"


class ConfidenceLevel(str, enum.Enum):
    CONFIRMED = "confirmed"
    RUMORED = "rumored"


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    trader_id = Column(Integer, ForeignKey("traders.id"), nullable=False, index=True)
    ticker = Column(String(20), nullable=False, index=True)
    company_name = Column(String(255), default="")
    action = Column(Enum(TradeAction), nullable=False)
    shares = Column(Float, nullable=True)
    price = Column(Float, nullable=True)
    value = Column(Float, nullable=True)
    trade_date = Column(DateTime, nullable=False, index=True)

    source = Column(String(100), default="")
    source_url = Column(String(500), default="")
    confidence_level = Column(Enum(ConfidenceLevel), default=ConfidenceLevel.CONFIRMED)

    filing_type = Column(String(20), default="")  # 13F, Form4, etc.
    filing_date = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    trader = relationship("Trader", back_populates="trades")
