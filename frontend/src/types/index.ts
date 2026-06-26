export interface Trader {
  id: number;
  name: string;
  slug: string;
  category: string;
  tier: number;
  bio: string;
  fund_name: string;
  strategy_style: string;
  image_url: string;
  sec_cik: string;
  etoro_username: string;
  external_url: string;
  portfolio_roi_qtd: number;
  portfolio_roi_ytd: number;
  portfolio_roi_all_time: number;
  win_rate: number;
  avg_holding_period_days: number;
  follower_count: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: number;
  trader_id: number;
  ticker: string;
  company_name: string;
  action: "buy" | "sell";
  shares: number | null;
  price: number | null;
  value: number | null;
  trade_date: string;
  source: string;
  source_url: string;
  confidence_level: "confirmed" | "rumored";
  filing_type: string;
  filing_date: string | null;
  created_at: string;
  trader_name?: string;
  trader_slug?: string;
  trader_category?: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: number;
  trade_id: number | null;
  created_at: string;
}

export interface NewsArticle {
  id: number;
  title: string;
  url: string;
  source: string;
  author: string;
  thumbnail_url: string;
  published_at: string | null;
  content_snippet: string;
  ai_summary: string;
  related_tickers: string;
  category: string;
  created_at: string;
  trader_badges: string[];
}

export interface StockInfo {
  ticker: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  market_cap: number | null;
  pe_ratio: number | null;
  volume: number | null;
  high_52w: number | null;
  low_52w: number | null;
  sector: string;
  industry: string;
}

export interface StockDetail {
  info: StockInfo;
  traders_holding: { trader_name: string; trader_slug: string; shares: number }[];
  recent_trades: {
    trader_name: string;
    trader_slug: string;
    action: string;
    shares: number;
    price: number;
    trade_date: string;
  }[];
  price_history: { date: string; close: number }[];
}

export interface DashboardData {
  latest_trades: Trade[];
  followed_traders_count: number;
  total_trades_tracked: number;
  top_performers: {
    name: string;
    slug: string;
    roi_ytd: number;
    category: string;
  }[];
}

export interface Follow {
  id: number;
  user_id: number;
  trader_id: number;
  email_notify: number;
  created_at: string;
  trader_name: string;
  trader_slug: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  is_admin: number;
  email_notifications_enabled: number;
  created_at: string;
}
