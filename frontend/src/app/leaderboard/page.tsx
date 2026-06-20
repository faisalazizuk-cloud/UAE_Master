"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Trophy, ArrowUpDown, Info, ChevronDown, ChevronUp, TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { tradersApi } from "@/lib/api";
import { formatPercent, getCategoryLabel, getCategoryColor } from "@/lib/utils";
import type { Trader } from "@/types";

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "hedge_fund", label: "Hedge Fund Managers" },
  { value: "active_trader", label: "Active Traders" },
  { value: "congressional", label: "Congressional" },
  { value: "etoro", label: "eToro Investors" },
  { value: "corporate_insider", label: "Corporate Insiders" },
  { value: "manual_entry", label: "Manual Entry" },
];

const SORT_OPTIONS = [
  { value: "portfolio_roi_ytd", label: "YTD ROI" },
  { value: "portfolio_roi_all_time", label: "All-Time ROI" },
  { value: "win_rate", label: "Win Rate" },
  { value: "follower_count", label: "Most Followed" },
  { value: "name", label: "Name" },
];

const TIME_PERIODS = ["1D", "1W", "1M", "3M", "YTD", "1Y", "ALL"];

interface PerformanceData {
  trader_slug: string;
  trader_name: string;
  period: string;
  data: { date: string; value: number }[];
  summary: {
    start_value: number;
    end_value: number;
    min_value: number;
    max_value: number;
    total_return: number;
  };
}

function TraderPerformancePanel({ trader }: { trader: Trader }) {
  const [period, setPeriod] = useState("1Y");
  const [perfData, setPerfData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    tradersApi
      .getPerformance(trader.slug, period)
      .then(setPerfData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [trader.slug, period]);

  useEffect(() => {
    if (!perfData?.data?.length || !chartRef.current) return;

    let cleanup: (() => void) | undefined;

    import("lightweight-charts").then(({ createChart }) => {
      const container = chartRef.current;
      if (!container) return;

      container.innerHTML = "";
      const chart = createChart(container, {
        width: container.clientWidth,
        height: 250,
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
    <div className="p-4 border-t bg-accent/20">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Profit Performance (%)</span>
            </div>
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
          {loading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : (
            <div ref={chartRef} className="w-full" />
          )}
        </div>

        <div className="lg:w-64 space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Period Summary</h4>
          {perfData && (
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total Return</p>
                <p className={`text-lg font-bold ${perfData.summary.total_return >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {perfData.summary.total_return >= 0 ? "+" : ""}
                  {perfData.summary.total_return.toFixed(2)}%
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Peak</p>
                <p className="text-lg font-bold text-green-500">
                  +{perfData.summary.max_value.toFixed(2)}%
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Trough</p>
                <p className="text-lg font-bold text-red-500">
                  {perfData.summary.min_value.toFixed(2)}%
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="text-lg font-bold">{trader.win_rate.toFixed(1)}%</p>
              </div>
            </div>
          )}
          <Link href={`/trader/${trader.slug}`}>
            <Button variant="outline" size="sm" className="w-full mt-2">
              View Full Profile →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState("portfolio_roi_ytd");
  const [order, setOrder] = useState("desc");
  const [expandedTrader, setExpandedTrader] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {
      sort_by: sortBy,
      order,
      limit: "50",
    };
    if (category) params.category = category;

    tradersApi
      .list(params)
      .then((data) => setTraders(data.traders))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category, sortBy, order]);

  const getTopBadge = (index: number) => {
    if (index < 5) {
      return (
        <Badge variant="warning" className="text-[10px]">
          Top 5
        </Badge>
      );
    }
    return null;
  };

  const toggleExpanded = (slug: string) => {
    setExpandedTrader(expandedTrader === slug ? null : slug);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Trader Leaderboard</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            variant={category === cat.value ? "default" : "outline"}
            size="sm"
            onClick={() => setCategory(cat.value)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        {SORT_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={sortBy === opt.value ? "secondary" : "ghost"}
            size="sm"
            onClick={() => {
              if (sortBy === opt.value) {
                setOrder(order === "desc" ? "asc" : "desc");
              } else {
                setSortBy(opt.value);
                setOrder("desc");
              }
            }}
          >
            {opt.label}
            {sortBy === opt.value && (
              <ArrowUpDown className="ml-1 h-3 w-3" />
            )}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-sm text-muted-foreground">
                    <th className="p-4 text-left w-12">#</th>
                    <th className="p-4 text-left">Trader</th>
                    <th className="p-4 text-left hidden md:table-cell">Category</th>
                    <th className="p-4 text-right">
                      <Tooltip>
                        <TooltipTrigger className="inline-flex items-center gap-1">
                          YTD ROI <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>Year-to-date return on investment</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="p-4 text-right hidden lg:table-cell">
                      <Tooltip>
                        <TooltipTrigger className="inline-flex items-center gap-1">
                          All-Time <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>Total return since tracking began</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="p-4 text-right hidden md:table-cell">
                      <Tooltip>
                        <TooltipTrigger className="inline-flex items-center gap-1">
                          Win Rate <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>Percentage of profitable trades</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="p-4 text-right hidden lg:table-cell">
                      <Tooltip>
                        <TooltipTrigger className="inline-flex items-center gap-1">
                          Avg Hold <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>Average number of days a position is held</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="p-4 text-right">Followers</th>
                    <th className="p-4 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {traders.map((trader, index) => (
                    <>
                      <tr
                        key={trader.id}
                        className={`border-b hover:bg-accent/50 transition-colors cursor-pointer ${expandedTrader === trader.slug ? "bg-accent/30" : ""}`}
                        onClick={() => toggleExpanded(trader.slug)}
                      >
                        <td className="p-4 text-muted-foreground">{index + 1}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/trader/${trader.slug}`}
                              className="font-medium hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {trader.name}
                            </Link>
                            {getTopBadge(index)}
                            {trader.follower_count > 3000 && (
                              <Badge variant="secondary" className="text-[10px]">
                                Most Followed
                              </Badge>
                            )}
                          </div>
                          {trader.fund_name && (
                            <p className="text-xs text-muted-foreground">{trader.fund_name}</p>
                          )}
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <Badge variant="outline" className={getCategoryColor(trader.category)}>
                            {getCategoryLabel(trader.category)}
                          </Badge>
                        </td>
                        <td className={`p-4 text-right font-medium ${trader.portfolio_roi_ytd >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {formatPercent(trader.portfolio_roi_ytd)}
                        </td>
                        <td className={`p-4 text-right hidden lg:table-cell ${trader.portfolio_roi_all_time >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {formatPercent(trader.portfolio_roi_all_time)}
                        </td>
                        <td className="p-4 text-right hidden md:table-cell">
                          {trader.win_rate.toFixed(1)}%
                        </td>
                        <td className="p-4 text-right hidden lg:table-cell text-muted-foreground">
                          {trader.avg_holding_period_days}d
                        </td>
                        <td className="p-4 text-right text-muted-foreground">
                          {trader.follower_count.toLocaleString()}
                        </td>
                        <td className="p-4">
                          {expandedTrader === trader.slug ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </td>
                      </tr>
                      {expandedTrader === trader.slug && (
                        <tr key={`${trader.id}-expanded`}>
                          <td colSpan={9}>
                            <TraderPerformancePanel trader={trader} />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
