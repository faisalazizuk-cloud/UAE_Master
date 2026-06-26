import enum
from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, Float
from sqlalchemy.orm import relationship

from app.database import Base


class TraderCategory(str, enum.Enum):
    HEDGE_FUND = "hedge_fund"
    ACTIVE_TRADER = "active_trader"
    ETORO = "etoro"
    CONGRESSIONAL = "congressional"
    CORPORATE_INSIDER = "corporate_insider"
    MANUAL_ENTRY = "manual_entry"


class Trader(Base):
    __tablename__ = "traders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    category = Column(Enum(TraderCategory), nullable=False, index=True)
    tier = Column(Integer, nullable=False, default=1)

    bio = Column(Text, default="")
    fund_name = Column(String(255), default="")
    strategy_style = Column(String(255), default="")
    image_url = Column(String(500), default="")

    # data source identifiers
    sec_cik = Column(String(20), default="")
    etoro_username = Column(String(255), default="")
    external_url = Column(String(500), default="")

    # performance metrics (computed periodically)
    portfolio_roi_qtd = Column(Float, default=0.0)
    portfolio_roi_ytd = Column(Float, default=0.0)
    portfolio_roi_all_time = Column(Float, default=0.0)
    win_rate = Column(Float, default=0.0)
    avg_holding_period_days = Column(Integer, default=0)
    follower_count = Column(Integer, default=0)

    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    trades = relationship("Trade", back_populates="trader", lazy="dynamic")
