"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  User,
  UserPlus,
  UserMinus,
  TrendingUp,
  TrendingDown,
  Info,
  ExternalLink,
  Award,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { tradersApi, followsApi } from "@/lib/api";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  formatNumber,
  getCategoryLabel,
  getCategoryColor,
} from "@/lib/utils";
import type { Trader, Trade } from "@/types";

const TIME_PERIODS = ["1D", "1W", "1M", "3M", "YTD", "1Y", "ALL"];

function PerformanceChart({ slug }: { slug: string }) {
  const [period, setPeriod] = useState("1Y");
  const [perfData, setPerfData] = useState<{
    data: { date: string; value: number }[];
    summary: { start_value: number; end_value: number; min_value: number; max_value: number; total_return: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    tradersApi
      .getPerformance(slug, period)
      .then(setPerfData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, period]);

  useEffect(() => {
    if (!perfData?.data?.length || !chartRef.current) return;

    let cleanup: (() => void) | undefined;

    import("lightweight-charts").then(({ createChart }) => {
      const container = chartRef.current;
      if (!container) return;

      container.innerHTML = "";
      const chart = createChart(container, {
        width: container.clientWidth,
        height: 300,
        layout: {
          background: { color: "transparent" },
          textColor: "#9ca3af",
        },
        grid: {
          vertLines: { color: "rgba(156, 163, 175, 0.1)" },
          horzLines: { color: "rgba(156, 163, 175, 0.1)" },
        },
        crosshair: { mode: 0 },
        rightPriceScale: { borderColor: "rgba(156, 163, 175, 0.2)" },
        timeScale: { borderColor: "rgba(156, 163, 175, 0.2)" },
      });

      const isPositive = perfData.summary.total_return >= 0;
      const color = isPositive ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)";
      const topColor = isPositive ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)";
      const bottomColor = isPositive ? "rgba(34, 197, 94, 0.0)" : "rgba(239, 68, 68, 0.0)";

      const areaSeries = chart.addAreaSeries({
        topColor,
        bottomColor,
        lineColor: color,
        lineWidth: 2,
      });

      areaSeries.setData(
        perfData.data.map((p) => ({
          time: p.date as string,
          value: p.value,
        }))
      );

      chart.timeScale().fitContent();

      const handleResize = () => {
        if (container) chart.applyOptions({ width: container.clientWidth });
      };
      window.addEventListener("resize", handleResize);
      cleanup = () => {
        window.removeEventListener("resize", handleResize);
        chart.remove();
      };
    });

    return () => { if (cleanup) cleanup(); };
  }, [perfData]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            Profit Performance (%)
          </CardTitle>
          <div className="flex gap-1">
            {TIME_PERIODS.map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setPeriod(p)}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <>
            <div ref={chartRef} className="w-full" />
            {perfData && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Total Return</p>
                  <p className={`text-lg font-bold ${perfData.summary.total_return >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {perfData.summary.total_return >= 0 ? "+" : ""}{perfData.summary.total_return.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Peak</p>
                  <p className="text-lg font-bold text-green-500">+{perfData.summary.max_value.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Trough</p>
                  <p className="text-lg font-bold text-red-500">{perfData.summary.min_value.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Period Range</p>
                  <p className="text-lg font-bold">
                    {(perfData.summary.max_value - perfData.summary.min_value).toFixed(2)}%
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function TraderProfilePage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: session } = useSession();

  const [trader, setTrader] = useState<Trader | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [holdings, setHoldings] = useState<{ ticker: string; company_name: string; shares: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      tradersApi.get(slug),
      tradersApi.getTrades(slug, { limit: "50" }),
      tradersApi.getHoldings(slug),
    ])
      .then(([traderData, tradesData, holdingsData]) => {
        setTrader(traderData);
        setTrades(tradesData.trades);
        setHoldings(holdingsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!session?.accessToken || !trader) return;
    followsApi
      .list(session.accessToken)
      .then((follows) => {
        setIsFollowing(follows.some((f) => f.trader_id === trader.id));
      })
      .catch(console.error);
  }, [session?.accessToken, trader]);

  const handleFollow = async () => {
    if (!session?.accessToken || !trader) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await followsApi.unfollow(trader.id, session.accessToken);
        setIsFollowing(false);
      } else {
        await followsApi.follow(trader.id, session.accessToken);
        setIsFollowing(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!trader) {
    return <div className="text-center py-12 text-muted-foreground">Trader not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{trader.name}</h1>
            <Badge variant="outline" className={getCategoryColor(trader.category)}>
              {getCategoryLabel(trader.category)}
            </Badge>
            {trader.category === "manual_entry" && (
              <Badge variant="secondary">Source: Public Statements</Badge>
            )}
          </div>
          {trader.fund_name && (
            <p className="text-muted-foreground mt-1">{trader.fund_name}</p>
          )}
          {trader.strategy_style && (
            <p className="text-sm text-muted-foreground">
              Strategy: {trader.strategy_style}
            </p>
          )}
        </div>
        {session && (
          <Button
            onClick={handleFollow}
            disabled={followLoading}
            variant={isFollowing ? "outline" : "default"}
          >
            {isFollowing ? (
              <>
                <UserMinus className="h-4 w-4 mr-2" />
                Unfollow
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Follow
              </>
            )}
          </Button>
        )}
      </div>

      {trader.bio && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm">{trader.bio}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              YTD ROI
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>Year-to-date return on investment</TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-2xl font-bold ${trader.portfolio_roi_ytd >= 0 ? "text-green-500" : "text-red-500"}`}>
              {formatPercent(trader.portfolio_roi_ytd)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              All-Time ROI
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>Total return since tracking began</TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-2xl font-bold ${trader.portfolio_roi_all_time >= 0 ? "text-green-500" : "text-red-500"}`}>
              {formatPercent(trader.portfolio_roi_all_time)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              Win Rate
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>Percentage of trades that were profitable</TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{trader.win_rate.toFixed(1)}%</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              Avg Holding Period
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>Average days a position is held</TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{trader.avg_holding_period_days}d</span>
          </CardContent>
        </Card>
      </div>

      <PerformanceChart slug={slug} />

      {holdings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Known Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {holdings.map((h) => (
                <Link
                  key={h.ticker}
                  href={`/stock/${h.ticker}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div>
                    <span className="font-medium">{h.ticker}</span>
                    <p className="text-xs text-muted-foreground">{h.company_name}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatNumber(h.shares)} shares
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Action</th>
                  <th className="p-3 text-left">Ticker</th>
                  <th className="p-3 text-right">Shares</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-left hidden md:table-cell">Source</th>
                  {trader.category === "manual_entry" && (
                    <th className="p-3 text-left">Confidence</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-b last:border-0 hover:bg-accent/50">
                    <td className="p-3">{formatDate(trade.trade_date)}</td>
                    <td className="p-3">
                      <Badge variant={trade.action === "buy" ? "success" : "destructive"}>
                        {trade.action === "buy" ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {trade.action.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Link href={`/stock/${trade.ticker}`} className="font-medium hover:underline">
                        {trade.ticker}
                      </Link>
                      {trade.company_name && (
                        <p className="text-xs text-muted-foreground">{trade.company_name}</p>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {trade.shares ? formatNumber(trade.shares) : "N/A"}
                    </td>
                    <td className="p-3 text-right">
                      {trade.price ? formatCurrency(trade.price) : "N/A"}
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      {trade.source_url ? (
                        <a
                          href={trade.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {trade.source || "Source"}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        trade.source || "—"
                      )}
                    </td>
                    {trader.category === "manual_entry" && (
                      <td className="p-3">
                        <Badge variant={trade.confidence_level === "confirmed" ? "success" : "warning"}>
                          {trade.confidence_level}
                        </Badge>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {trades.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No trades recorded yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
