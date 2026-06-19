"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, ArrowUpDown, Info } from "lucide-react";
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

export default function LeaderboardPage() {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState("portfolio_roi_ytd");
  const [order, setOrder] = useState("desc");

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
                  </tr>
                </thead>
                <tbody>
                  {traders.map((trader, index) => (
                    <tr
                      key={trader.id}
                      className="border-b last:border-0 hover:bg-accent/50 transition-colors"
                    >
                      <td className="p-4 text-muted-foreground">{index + 1}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/trader/${trader.slug}`}
                            className="font-medium hover:underline"
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
                    </tr>
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
