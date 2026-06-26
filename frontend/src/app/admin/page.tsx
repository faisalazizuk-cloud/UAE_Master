"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Users,
  BarChart3,
  Newspaper,
  RefreshCw,
  Plus,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi, tradersApi, tradesApi } from "@/lib/api";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrapeStatus, setScrapeStatus] = useState("");
  const [newsStatus, setNewsStatus] = useState("");

  // Manual trade form
  const [tradeForm, setTradeForm] = useState({
    trader_id: "",
    ticker: "",
    action: "buy",
    shares: "",
    price: "",
    trade_date: new Date().toISOString().split("T")[0],
    source: "",
    source_url: "",
    confidence_level: "confirmed",
  });
  const [tradeSubmitting, setTradeSubmitting] = useState(false);
  const [tradeMessage, setTradeMessage] = useState("");

  // New trader form
  const [traderForm, setTraderForm] = useState({
    name: "",
    category: "manual_entry",
    tier: "6",
    bio: "",
    strategy_style: "",
  });
  const [traderSubmitting, setTraderSubmitting] = useState(false);
  const [traderMessage, setTraderMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (session && !session.isAdmin) {
      router.push("/");
      return;
    }
    if (!session?.accessToken) return;

    adminApi
      .stats(session.accessToken)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session, status, router]);

  const handleTriggerScrape = async () => {
    if (!session?.accessToken) return;
    setScrapeStatus("Running...");
    try {
      const result = await adminApi.triggerScrape(session.accessToken);
      setScrapeStatus(result.status);
    } catch (err) {
      setScrapeStatus("Error triggering scrape");
    }
  };

  const handleRefreshNews = async () => {
    if (!session?.accessToken) return;
    setNewsStatus("Running...");
    try {
      const result = await adminApi.refreshNews(session.accessToken);
      setNewsStatus(result.status);
    } catch (err) {
      setNewsStatus("Error refreshing news");
    }
  };

  const handleSubmitTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.accessToken) return;
    setTradeSubmitting(true);
    setTradeMessage("");
    try {
      await tradesApi.create(
        {
          trader_id: parseInt(tradeForm.trader_id),
          ticker: tradeForm.ticker.toUpperCase(),
          action: tradeForm.action,
          shares: tradeForm.shares ? parseFloat(tradeForm.shares) : null,
          price: tradeForm.price ? parseFloat(tradeForm.price) : null,
          trade_date: new Date(tradeForm.trade_date).toISOString(),
          source: tradeForm.source,
          source_url: tradeForm.source_url,
          confidence_level: tradeForm.confidence_level,
        },
        session.accessToken
      );
      setTradeMessage("Trade created successfully!");
      setTradeForm((prev) => ({ ...prev, ticker: "", shares: "", price: "", source: "", source_url: "" }));
    } catch (err) {
      setTradeMessage(err instanceof Error ? err.message : "Error creating trade");
    } finally {
      setTradeSubmitting(false);
    }
  };

  const handleSubmitTrader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.accessToken) return;
    setTraderSubmitting(true);
    setTraderMessage("");
    try {
      await tradersApi.create(
        {
          name: traderForm.name,
          category: traderForm.category,
          tier: parseInt(traderForm.tier),
          bio: traderForm.bio,
          strategy_style: traderForm.strategy_style,
        },
        session.accessToken
      );
      setTraderMessage("Trader created successfully!");
      setTraderForm({ name: "", category: "manual_entry", tier: "6", bio: "", strategy_style: "" });
    } catch (err) {
      setTraderMessage(err instanceof Error ? err.message : "Error creating trader");
    } finally {
      setTraderSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin Panel</h1>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Traders</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{stats.total_traders}</span>
              <p className="text-xs text-muted-foreground">{stats.active_traders} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{stats.total_trades}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Users</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{stats.total_users}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Articles</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{stats.total_news_articles}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 space-y-2">
              <Button size="sm" className="w-full" onClick={handleTriggerScrape}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run Scrapers
              </Button>
              {scrapeStatus && <p className="text-xs text-muted-foreground">{scrapeStatus}</p>}
              <Button size="sm" variant="outline" className="w-full" onClick={handleRefreshNews}>
                <Newspaper className="h-4 w-4 mr-2" />
                Refresh News
              </Button>
              {newsStatus && <p className="text-xs text-muted-foreground">{newsStatus}</p>}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Manual Trade
            </CardTitle>
            <CardDescription>
              Enter a trade manually (e.g., for Tier 6 manual-entry traders)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitTrade} className="space-y-3">
              {tradeMessage && (
                <div className={`rounded-md p-2 text-sm ${tradeMessage.includes("success") ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
                  {tradeMessage}
                </div>
              )}
              <Input
                placeholder="Trader ID"
                value={tradeForm.trader_id}
                onChange={(e) => setTradeForm({ ...tradeForm, trader_id: e.target.value })}
                required
              />
              <Input
                placeholder="Ticker (e.g., AAPL)"
                value={tradeForm.ticker}
                onChange={(e) => setTradeForm({ ...tradeForm, ticker: e.target.value })}
                required
              />
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={tradeForm.action}
                onChange={(e) => setTradeForm({ ...tradeForm, action: e.target.value })}
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Shares"
                  type="number"
                  value={tradeForm.shares}
                  onChange={(e) => setTradeForm({ ...tradeForm, shares: e.target.value })}
                />
                <Input
                  placeholder="Price"
                  type="number"
                  step="0.01"
                  value={tradeForm.price}
                  onChange={(e) => setTradeForm({ ...tradeForm, price: e.target.value })}
                />
              </div>
              <Input
                type="date"
                value={tradeForm.trade_date}
                onChange={(e) => setTradeForm({ ...tradeForm, trade_date: e.target.value })}
              />
              <Input
                placeholder="Source description"
                value={tradeForm.source}
                onChange={(e) => setTradeForm({ ...tradeForm, source: e.target.value })}
              />
              <Input
                placeholder="Source URL"
                value={tradeForm.source_url}
                onChange={(e) => setTradeForm({ ...tradeForm, source_url: e.target.value })}
              />
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={tradeForm.confidence_level}
                onChange={(e) => setTradeForm({ ...tradeForm, confidence_level: e.target.value })}
              >
                <option value="confirmed">Confirmed</option>
                <option value="rumored">Rumored</option>
              </select>
              <Button type="submit" className="w-full" disabled={tradeSubmitting}>
                {tradeSubmitting ? "Adding..." : "Add Trade"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Add New Trader
            </CardTitle>
            <CardDescription>
              Add a new trader to the curated list
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitTrader} className="space-y-3">
              {traderMessage && (
                <div className={`rounded-md p-2 text-sm ${traderMessage.includes("success") ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
                  {traderMessage}
                </div>
              )}
              <Input
                placeholder="Trader Name"
                value={traderForm.name}
                onChange={(e) => setTraderForm({ ...traderForm, name: e.target.value })}
                required
              />
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={traderForm.category}
                onChange={(e) => setTraderForm({ ...traderForm, category: e.target.value })}
              >
                <option value="hedge_fund">Hedge Fund Manager</option>
                <option value="active_trader">Active Trader</option>
                <option value="etoro">eToro Investor</option>
                <option value="congressional">Congressional</option>
                <option value="corporate_insider">Corporate Insider</option>
                <option value="manual_entry">Manual Entry</option>
              </select>
              <Input
                placeholder="Tier (1-6)"
                type="number"
                min="1"
                max="6"
                value={traderForm.tier}
                onChange={(e) => setTraderForm({ ...traderForm, tier: e.target.value })}
              />
              <Input
                placeholder="Strategy Style"
                value={traderForm.strategy_style}
                onChange={(e) => setTraderForm({ ...traderForm, strategy_style: e.target.value })}
              />
              <textarea
                placeholder="Bio"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[80px]"
                value={traderForm.bio}
                onChange={(e) => setTraderForm({ ...traderForm, bio: e.target.value })}
              />
              <Button type="submit" className="w-full" disabled={traderSubmitting}>
                {traderSubmitting ? "Adding..." : "Add Trader"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
