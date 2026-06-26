from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.trader import Trader
from app.models.user import User, UserFollow
from app.schemas.user import FollowRequest, FollowResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/follows", tags=["follows"])


@router.get("", response_model=list[FollowResponse])
def list_follows(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    follows = (
        db.query(UserFollow, Trader.name, Trader.slug)
        .join(Trader, UserFollow.trader_id == Trader.id)
        .filter(UserFollow.user_id == user.id)
        .all()
    )
    result = []
    for follow, trader_name, trader_slug in follows:
        f = FollowResponse.model_validate(follow)
        f.trader_name = trader_name
        f.trader_slug = trader_slug
        result.append(f)
    return result


@router.post("", response_model=FollowResponse, status_code=201)
def follow_trader(data: FollowRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trader = db.query(Trader).filter(Trader.id == data.trader_id).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")

    existing = (
        db.query(UserFollow)
        .filter(UserFollow.user_id == user.id, UserFollow.trader_id == data.trader_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already following this trader")

    follow = UserFollow(user_id=user.id, trader_id=data.trader_id, email_notify=data.email_notify)
    db.add(follow)

    trader.follower_count = (trader.follower_count or 0) + 1
    db.commit()
    db.refresh(follow)

    resp = FollowResponse.model_validate(follow)
    resp.trader_name = trader.name
    resp.trader_slug = trader.slug
    return resp


@router.delete("/{trader_id}", status_code=204)
def unfollow_trader(trader_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    follow = (
        db.query(UserFollow)
        .filter(UserFollow.user_id == user.id, UserFollow.trader_id == trader_id)
        .first()
    )
    if not follow:
        raise HTTPException(status_code=404, detail="Not following this trader")

    trader = db.query(Trader).filter(Trader.id == trader_id).first()
    if trader and trader.follower_count and trader.follower_count > 0:
        trader.follower_count -= 1

    db.delete(follow)
    db.commit()


@router.put("/{trader_id}/email", status_code=200)
def toggle_email_notify(trader_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    follow = (
        db.query(UserFollow)
        .filter(UserFollow.user_id == user.id, UserFollow.trader_id == trader_id)
        .first()
    )
    if not follow:
        raise HTTPException(status_code=404, detail="Not following this trader")

    follow.email_notify = 0 if follow.email_notify else 1
    db.commit()
    return {"email_notify": follow.email_notify}
