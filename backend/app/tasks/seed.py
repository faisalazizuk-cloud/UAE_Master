"""Seed script to populate initial trader list and sample data."""

import re
import logging
from datetime import datetime, timedelta
import random

from sqlalchemy.orm import Session

from app.database import SessionLocal, init_db
from app.models.trader import Trader, TraderCategory
from app.models.trade import Trade, TradeAction, ConfidenceLevel
from app.models.user import User
from app.services.auth import hash_password
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    return text


TIER_1_HEDGE_FUND = [
    {"name": "Warren Buffett", "fund_name": "Berkshire Hathaway", "sec_cik": "1067983", "strategy_style": "Value Investing", "bio": "The Oracle of Omaha. Chairman and CEO of Berkshire Hathaway, one of the most successful investors of all time."},
    {"name": "Ray Dalio", "fund_name": "Bridgewater Associates", "sec_cik": "1350694", "strategy_style": "Global Macro", "bio": "Founder of Bridgewater Associates, the world's largest hedge fund. Known for his 'Principles' philosophy."},
    {"name": "Bill Ackman", "fund_name": "Pershing Square Capital", "sec_cik": "1336528", "strategy_style": "Activist Investing", "bio": "Founder of Pershing Square Capital Management. Known for concentrated, high-conviction activist positions."},
    {"name": "Carl Icahn", "fund_name": "Icahn Enterprises", "sec_cik": "49588", "strategy_style": "Activist Investing", "bio": "Legendary corporate raider and activist investor. Chairman of Icahn Enterprises."},
    {"name": "George Soros", "fund_name": "Soros Fund Management", "sec_cik": "1029160", "strategy_style": "Global Macro", "bio": "Founder of Soros Fund Management. Famous for 'breaking the Bank of England' in 1992."},
    {"name": "Stanley Druckenmiller", "fund_name": "Duquesne Family Office", "sec_cik": "1536411", "strategy_style": "Global Macro", "bio": "Former lead portfolio manager for George Soros. Runs Duquesne Family Office with legendary returns."},
    {"name": "David Tepper", "fund_name": "Appaloosa Management", "sec_cik": "1656456", "strategy_style": "Distressed Debt", "bio": "Founder of Appaloosa Management. One of the highest-earning hedge fund managers in history."},
    {"name": "Seth Klarman", "fund_name": "Baupost Group", "sec_cik": "1061768", "strategy_style": "Value Investing", "bio": "Founder of The Baupost Group. Author of 'Margin of Safety', one of the most sought-after investing books."},
    {"name": "Howard Marks", "fund_name": "Oaktree Capital", "sec_cik": "1403256", "strategy_style": "Distressed Debt", "bio": "Co-founder of Oaktree Capital Management. Known for his insightful investor memos."},
    {"name": "Ken Griffin", "fund_name": "Citadel", "sec_cik": "1423053", "strategy_style": "Multi-Strategy", "bio": "Founder and CEO of Citadel LLC, one of the most successful hedge funds in the world."},
    {"name": "Steve Cohen", "fund_name": "Point72 Asset Management", "sec_cik": "1603466", "strategy_style": "Multi-Strategy", "bio": "Founder of Point72 Asset Management (formerly SAC Capital). Owner of the New York Mets."},
    {"name": "Dan Loeb", "fund_name": "Third Point", "sec_cik": "1040273", "strategy_style": "Activist/Event-Driven", "bio": "Founder of Third Point LLC. Known for his activist campaigns and sharply worded letters to management."},
    {"name": "David Einhorn", "fund_name": "Greenlight Capital", "sec_cik": "1079114", "strategy_style": "Value Investing", "bio": "Founder of Greenlight Capital. Famous for his short of Lehman Brothers before the 2008 crash."},
    {"name": "Michael Burry", "fund_name": "Scion Asset Management", "sec_cik": "1649339", "strategy_style": "Contrarian Value", "bio": "Founder of Scion Asset Management. Made famous by 'The Big Short' for predicting the 2008 housing crisis."},
    {"name": "Philippe Laffont", "fund_name": "Coatue Management", "sec_cik": "1535392", "strategy_style": "Technology Growth", "bio": "Founder of Coatue Management, a technology-focused hedge fund with a strong track record."},
    {"name": "Brad Gerstner", "fund_name": "Altimeter Capital", "sec_cik": "1694230", "strategy_style": "Technology Growth", "bio": "Founder of Altimeter Capital. Known for tech investments and advocacy for corporate governance reform."},
    {"name": "Joel Greenblatt", "fund_name": "Gotham Asset Management", "sec_cik": "1510387", "strategy_style": "Value/Quantitative", "bio": "Founder of Gotham Asset Management. Author of 'The Little Book That Beats the Market'."},
    {"name": "Li Lu", "fund_name": "Himalaya Capital", "sec_cik": "1709190", "strategy_style": "Value Investing", "bio": "Founder of Himalaya Capital. Charlie Munger's chosen successor for managing part of Berkshire's portfolio."},
    {"name": "Chase Coleman", "fund_name": "Tiger Global Management", "sec_cik": "1167483", "strategy_style": "Technology Growth", "bio": "Founder of Tiger Global Management. One of the most successful 'Tiger Cub' hedge fund managers."},
    {"name": "Terry Smith", "fund_name": "Fundsmith", "sec_cik": "", "strategy_style": "Quality Growth", "bio": "Founder of Fundsmith. Known for his 'buy good companies, don't overpay, do nothing' approach."},
]

TIER_2_ACTIVE = [
    {"name": "Cathie Wood", "fund_name": "ARK Invest", "strategy_style": "Disruptive Innovation", "bio": "Founder and CEO of ARK Invest. Known for high-conviction bets on disruptive innovation."},
    {"name": "Mark Minervini", "fund_name": "", "strategy_style": "Momentum/Growth", "bio": "US Investing Champion. Author and expert in the SEPA methodology for stock selection."},
    {"name": "Ross Cameron", "fund_name": "Warrior Trading", "strategy_style": "Day Trading", "bio": "Founder of Warrior Trading. Popular day trading educator and verified profitable trader."},
    {"name": "David Ryan", "fund_name": "", "strategy_style": "CAN SLIM Growth", "bio": "Three-time US Investing Championship winner. Protege of William O'Neil."},
    {"name": "Tim Sykes", "fund_name": "", "strategy_style": "Penny Stocks", "bio": "Penny stock trader and educator. Known for turning his Bar Mitzvah gift money into millions."},
]

TIER_3_ETORO = [
    {"name": "Jay Edward Smith", "etoro_username": "jaynemesis", "bio": "Top eToro Popular Investor with focus on tech and crypto."},
    {"name": "Heloise Greeff", "etoro_username": "heloisegreeff", "bio": "eToro Popular Investor specializing in emerging market equities."},
    {"name": "Jeppe Kirk Bonde", "etoro_username": "jeppekirkbonde", "bio": "Danish eToro Popular Investor with a diversified global strategy."},
    {"name": "Olivier Danvel", "etoro_username": "olivierdanvel", "bio": "French eToro Popular Investor focused on European and US equities."},
    {"name": "Alvin De Cruz", "etoro_username": "alvindcruz", "bio": "eToro Popular Investor with consistent long-term returns."},
]

TIER_4_CONGRESS = [
    {"name": "Nancy Pelosi", "bio": "Former Speaker of the House. Among the most actively trading members of Congress."},
    {"name": "Tommy Tuberville", "bio": "US Senator from Alabama. Former college football coach with notable trading activity."},
    {"name": "Dan Crenshaw", "bio": "US Representative from Texas. Known for active stock trading disclosures."},
    {"name": "Marjorie Taylor Greene", "bio": "US Representative from Georgia. Frequent stock trader among Congressional members."},
    {"name": "Josh Gottheimer", "bio": "US Representative from New Jersey. Active trader with diverse portfolio."},
]

TIER_1_EXPLOSIVE_GROWTH = [
    {"name": "Chamath Palihapitiya", "fund_name": "Social Capital", "sec_cik": "", "strategy_style": "Explosive Growth / SPACs", "bio": "Founder of Social Capital. Former Facebook VP turned venture capitalist. Known for aggressive growth bets via SPACs and early-stage tech (Slack, Box, Virgin Galactic)."},
    {"name": "Peter Thiel", "fund_name": "Founders Fund", "sec_cik": "", "strategy_style": "Contrarian Growth", "bio": "PayPal co-founder and Founders Fund partner. First outside investor in Facebook. Bets big on contrarian, world-changing companies (Palantir, SpaceX, Anduril)."},
    {"name": "Masayoshi Son", "fund_name": "SoftBank Vision Fund", "sec_cik": "", "strategy_style": "Mega-Bet Growth", "bio": "Founder of SoftBank Group. Runs the $100B Vision Fund making massive bets on transformative tech. Early investor in Alibaba, ARM, Uber, WeWork, DoorDash."},
    {"name": "Gavin Baker", "fund_name": "Atreides Management", "sec_cik": "1819410", "strategy_style": "Concentrated Tech Growth", "bio": "Founder of Atreides Management. Former Fidelity star who runs concentrated positions in high-growth tech. Known for deep research and explosive conviction bets."},
    {"name": "Dan Sundheim", "fund_name": "D1 Capital Partners", "sec_cik": "1785526", "strategy_style": "Tech/Growth Crossover", "bio": "Founder of D1 Capital Partners. Former Viking Global CIO. Combines public and private market growth investing with positions in the fastest-growing tech companies."},
    {"name": "Nancy Zevenbergen", "fund_name": "Zevenbergen Capital", "sec_cik": "1029708", "strategy_style": "Aggressive Growth", "bio": "Founder of Zevenbergen Capital Investments. Pure aggressive growth investor. Early and big in Tesla, Shopify, Roku, and other hypergrowth names."},
    {"name": "Ron Baron", "fund_name": "Baron Capital", "sec_cik": "1077275", "strategy_style": "Long-Term Growth Compounder", "bio": "Founder of Baron Capital Group. Made billions holding explosive growth companies for decades. Famous early Tesla investor who turned $380M into $6B+."},
    {"name": "James Anderson", "fund_name": "Baillie Gifford / Lingotto", "sec_cik": "", "strategy_style": "Exponential Growth", "bio": "Former head of Baillie Gifford's flagship fund, now at Lingotto. Pioneer of 'growth investing at scale'. Early backer of Tesla, Amazon, Moderna, Illumina."},
    {"name": "Keith Gill", "fund_name": "", "strategy_style": "Deep Value → Explosive Growth", "bio": "Known as 'Roaring Kitty' and 'DeepF***ingValue'. Turned $53K into $48M+ on GameStop. Embodies the explosive retail growth investor who does deep research and holds through volatility."},
    {"name": "Steve Mandel", "fund_name": "Lone Pine Capital", "sec_cik": "1061165", "strategy_style": "Quality Growth", "bio": "Founder of Lone Pine Capital, a Tiger Cub hedge fund. Focuses on high-quality growth companies with strong competitive moats and rapid earnings growth."},
]

TIER_6_MANUAL = [
    {
        "name": "Leopold Aschenbrenner",
        "bio": "Former OpenAI researcher and author of 'Situational Awareness'. Known for his views on AI and technology investments.",
        "strategy_style": "AI/Technology Focus",
    },
]

SAMPLE_TRADES = [
    {"ticker": "AAPL", "company_name": "Apple Inc.", "action": "buy", "shares": 50000, "price": 195.50},
    {"ticker": "MSFT", "company_name": "Microsoft Corporation", "action": "buy", "shares": 30000, "price": 420.00},
    {"ticker": "NVDA", "company_name": "NVIDIA Corporation", "action": "buy", "shares": 25000, "price": 135.00},
    {"ticker": "GOOGL", "company_name": "Alphabet Inc.", "action": "buy", "shares": 20000, "price": 175.00},
    {"ticker": "AMZN", "company_name": "Amazon.com Inc.", "action": "buy", "shares": 15000, "price": 188.00},
    {"ticker": "META", "company_name": "Meta Platforms Inc.", "action": "buy", "shares": 10000, "price": 505.00},
    {"ticker": "TSLA", "company_name": "Tesla Inc.", "action": "sell", "shares": 8000, "price": 250.00},
    {"ticker": "JPM", "company_name": "JPMorgan Chase & Co.", "action": "buy", "shares": 40000, "price": 210.00},
    {"ticker": "BRK.B", "company_name": "Berkshire Hathaway", "action": "buy", "shares": 5000, "price": 430.00},
    {"ticker": "V", "company_name": "Visa Inc.", "action": "buy", "shares": 12000, "price": 280.00},
    {"ticker": "LLY", "company_name": "Eli Lilly and Company", "action": "buy", "shares": 6000, "price": 800.00},
    {"ticker": "PLTR", "company_name": "Palantir Technologies", "action": "buy", "shares": 100000, "price": 25.00},
    {"ticker": "SOFI", "company_name": "SoFi Technologies", "action": "buy", "shares": 200000, "price": 10.00},
    {"ticker": "AMD", "company_name": "Advanced Micro Devices", "action": "buy", "shares": 15000, "price": 165.00},
    {"ticker": "NFLX", "company_name": "Netflix Inc.", "action": "sell", "shares": 5000, "price": 680.00},
    {"ticker": "SHOP", "company_name": "Shopify Inc.", "action": "buy", "shares": 20000, "price": 85.00},
    {"ticker": "ROKU", "company_name": "Roku Inc.", "action": "buy", "shares": 30000, "price": 70.00},
    {"ticker": "COIN", "company_name": "Coinbase Global", "action": "buy", "shares": 15000, "price": 260.00},
    {"ticker": "CRWD", "company_name": "CrowdStrike Holdings", "action": "buy", "shares": 12000, "price": 350.00},
    {"ticker": "SNOW", "company_name": "Snowflake Inc.", "action": "buy", "shares": 18000, "price": 170.00},
    {"ticker": "DDOG", "company_name": "Datadog Inc.", "action": "buy", "shares": 25000, "price": 130.00},
    {"ticker": "NET", "company_name": "Cloudflare Inc.", "action": "buy", "shares": 35000, "price": 95.00},
    {"ticker": "GME", "company_name": "GameStop Corp.", "action": "buy", "shares": 100000, "price": 25.00},
    {"ticker": "MSTR", "company_name": "MicroStrategy Inc.", "action": "buy", "shares": 5000, "price": 1800.00},
    {"ticker": "ARM", "company_name": "ARM Holdings", "action": "buy", "shares": 10000, "price": 150.00},
    {"ticker": "SMCI", "company_name": "Super Micro Computer", "action": "buy", "shares": 8000, "price": 40.00},
]


def seed_database():
    """Seed the database with initial data."""
    init_db()
    db = SessionLocal()

    try:
        if db.query(Trader).count() > 0:
            logger.info("Database already seeded, skipping")
            return

        logger.info("Seeding database...")

        # Create admin user
        admin = User(
            email=settings.ADMIN_EMAIL,
            name="Admin",
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            is_admin=1,
        )
        db.add(admin)

        # Seed Tier 1: Hedge Fund Legends
        all_traders = []
        for data in TIER_1_HEDGE_FUND:
            trader = Trader(
                name=data["name"],
                slug=slugify(data["name"]),
                category=TraderCategory.HEDGE_FUND,
                tier=1,
                bio=data.get("bio", ""),
                fund_name=data.get("fund_name", ""),
                strategy_style=data.get("strategy_style", ""),
                sec_cik=data.get("sec_cik", ""),
                portfolio_roi_ytd=round(random.uniform(-5, 35), 2),
                portfolio_roi_all_time=round(random.uniform(50, 500), 2),
                win_rate=round(random.uniform(55, 80), 1),
                avg_holding_period_days=random.randint(90, 1800),
                follower_count=random.randint(100, 5000),
            )
            db.add(trader)
            all_traders.append(trader)

        # Seed Tier 2: Active Public Traders
        for data in TIER_2_ACTIVE:
            trader = Trader(
                name=data["name"],
                slug=slugify(data["name"]),
                category=TraderCategory.ACTIVE_TRADER,
                tier=2,
                bio=data.get("bio", ""),
                fund_name=data.get("fund_name", ""),
                strategy_style=data.get("strategy_style", ""),
                portfolio_roi_ytd=round(random.uniform(-10, 50), 2),
                portfolio_roi_all_time=round(random.uniform(20, 300), 2),
                win_rate=round(random.uniform(45, 75), 1),
                avg_holding_period_days=random.randint(1, 365),
                follower_count=random.randint(500, 10000),
            )
            db.add(trader)
            all_traders.append(trader)

        # Seed Tier 3: eToro Popular Investors
        for data in TIER_3_ETORO:
            trader = Trader(
                name=data["name"],
                slug=slugify(data["name"]),
                category=TraderCategory.ETORO,
                tier=3,
                bio=data.get("bio", ""),
                etoro_username=data.get("etoro_username", ""),
                strategy_style="Copy Trading",
                portfolio_roi_ytd=round(random.uniform(-5, 40), 2),
                portfolio_roi_all_time=round(random.uniform(10, 200), 2),
                win_rate=round(random.uniform(50, 70), 1),
                follower_count=random.randint(1000, 50000),
            )
            db.add(trader)
            all_traders.append(trader)

        # Seed Tier 4: Congressional Traders
        for data in TIER_4_CONGRESS:
            trader = Trader(
                name=data["name"],
                slug=slugify(data["name"]),
                category=TraderCategory.CONGRESSIONAL,
                tier=4,
                bio=data.get("bio", ""),
                strategy_style="Congressional Trading",
                portfolio_roi_ytd=round(random.uniform(-5, 45), 2),
                portfolio_roi_all_time=round(random.uniform(30, 300), 2),
                win_rate=round(random.uniform(55, 85), 1),
                follower_count=random.randint(200, 8000),
            )
            db.add(trader)
            all_traders.append(trader)

        # Seed Explosive Growth Investors
        for data in TIER_1_EXPLOSIVE_GROWTH:
            trader = Trader(
                name=data["name"],
                slug=slugify(data["name"]),
                category=TraderCategory.HEDGE_FUND,
                tier=1,
                bio=data.get("bio", ""),
                fund_name=data.get("fund_name", ""),
                strategy_style=data.get("strategy_style", ""),
                sec_cik=data.get("sec_cik", ""),
                portfolio_roi_ytd=round(random.uniform(15, 80), 2),
                portfolio_roi_all_time=round(random.uniform(200, 1500), 2),
                win_rate=round(random.uniform(40, 70), 1),
                avg_holding_period_days=random.randint(30, 730),
                follower_count=random.randint(2000, 15000),
            )
            db.add(trader)
            all_traders.append(trader)

        # Seed Tier 6: Manual Entry
        for data in TIER_6_MANUAL:
            trader = Trader(
                name=data["name"],
                slug=slugify(data["name"]),
                category=TraderCategory.MANUAL_ENTRY,
                tier=6,
                bio=data.get("bio", ""),
                strategy_style=data.get("strategy_style", ""),
                follower_count=random.randint(50, 1000),
            )
            db.add(trader)
            all_traders.append(trader)

        db.flush()

        # Seed sample trades for each trader
        for trader in all_traders:
            num_trades = random.randint(3, 8)
            selected_trades = random.sample(SAMPLE_TRADES, min(num_trades, len(SAMPLE_TRADES)))

            for i, trade_data in enumerate(selected_trades):
                days_ago = random.randint(1, 365)
                trade = Trade(
                    trader_id=trader.id,
                    ticker=trade_data["ticker"],
                    company_name=trade_data["company_name"],
                    action=TradeAction.BUY if trade_data["action"] == "buy" else TradeAction.SELL,
                    shares=trade_data["shares"] * random.uniform(0.5, 2.0),
                    price=trade_data["price"] * random.uniform(0.9, 1.1),
                    value=trade_data["shares"] * trade_data["price"] * random.uniform(0.5, 2.0),
                    trade_date=datetime.utcnow() - timedelta(days=days_ago),
                    source="Historical Data",
                    source_url="",
                    confidence_level=ConfidenceLevel.CONFIRMED,
                    filing_type="13F" if trader.category == TraderCategory.HEDGE_FUND else "",
                )
                db.add(trade)

        db.commit()
        logger.info(f"Seeded {len(all_traders)} traders with sample trades")

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed_database()
