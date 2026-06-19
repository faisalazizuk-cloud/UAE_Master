from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.trader import TraderCategory


class TraderBase(BaseModel):
    name: str
    category: TraderCategory
    tier: int = 1
    bio: str = ""
    fund_name: str = ""
    strategy_style: str = ""
    image_url: str = ""
    sec_cik: str = ""
    etoro_username: str = ""
    external_url: str = ""


class TraderCreate(TraderBase):
    pass


class TraderUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[TraderCategory] = None
    tier: Optional[int] = None
    bio: Optional[str] = None
    fund_name: Optional[str] = None
    strategy_style: Optional[str] = None
    image_url: Optional[str] = None
    sec_cik: Optional[str] = None
    etoro_username: Optional[str] = None
    external_url: Optional[str] = None
    is_active: Optional[int] = None


class TraderResponse(TraderBase):
    id: int
    slug: str
    portfolio_roi_qtd: float
    portfolio_roi_ytd: float
    portfolio_roi_all_time: float
    win_rate: float
    avg_holding_period_days: int
    follower_count: int
    is_active: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TraderListResponse(BaseModel):
    traders: list[TraderResponse]
    total: int
