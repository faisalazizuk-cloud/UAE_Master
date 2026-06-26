from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.trade import Trade
from app.models.trader import Trader
from app.models.user import UserFollow


def create_trade_notifications(db: Session, trade: Trade, trader: Trader):
    followers = db.query(UserFollow).filter(UserFollow.trader_id == trader.id).all()

    action_str = "bought" if trade.action.value == "buy" else "sold"
    shares_str = f"{trade.shares:,.0f} shares of" if trade.shares else ""
    price_str = f" at ${trade.price:,.2f}" if trade.price else ""
    title = f"{trader.name} {action_str} {trade.ticker}"
    message = f"{trader.name} {action_str} {shares_str} {trade.ticker}{price_str}"

    notifications = []
    for follow in followers:
        notif = Notification(
            user_id=follow.user_id,
            trade_id=trade.id,
            title=title,
            message=message.strip(),
        )
        notifications.append(notif)

    if notifications:
        db.add_all(notifications)
        db.commit()
