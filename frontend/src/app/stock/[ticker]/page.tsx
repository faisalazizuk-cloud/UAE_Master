"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TrendingUp, TrendingDown, BarChart2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { stocksApi } from "@/lib/api";
import { formatCurrency, formatCompactNumber, formatDate } from "@/lib/utils";
import type { StockDetail } from "@/types";

export default function StockDetailPage() {
  const params = useParams();
  const ticker = (params.ticker as string).toUpperCase();
  const [stock, setStock] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    stocksApi
      .detail(ticker)
      .then(setStock)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ticker]);

  useEffect(() => {
    if (!stock?.price_history?.length || !chartRef.current) return;

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

      const areaSeries = chart.addAreaSeries({
        topColor: "rgba(34, 197, 94, 0.4)",
        bottomColor: "rgba(34, 197, 94, 0.0)",
        lineColor: "rgb(34, 197, 94)",
        lineWidth: 2,
      });

      areaSeries.setData(
        stock.price_history.map((p) => ({
          time: p.date as string,
          value: p.close,
        }))
      );

      chart.timeScale().fitContent();

      const handleResize = () => {
        if (container) chart.applyOptions({ width: container.clientWidth });
      };
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
        chart.remove();
      };
    });
  }, [stock]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-32" />
        <Skeleton className="h-[300px]" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!stock) {
    return <div className="text-center py-12 text-muted-foreground">Stock not found</div>;
  }

  const { info } = stock;
  const isPositive = info.change >= 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{info.ticker}</h1>
            <Badge variant="outline">{info.sector || "N/A"}</Badge>
          </div>
          <p className="text-muted-foreground">{info.name}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{formatCurrency(info.price)}</div>
          <div className={`flex items-center justify-end gap-1 ${isPositive ? "text-green-500" : "text-red-500"}`}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{formatCurrency(Math.abs(info.change))}</span>
            <span>({(info.change_percent || 0).toFixed(2)}%)</span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            Price Chart (1Y)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={chartRef} className="w-full" />
          {stock.price_history.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              No price data available
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              Market Cap
              <Tooltip>
                <TooltipTrigger><Info className="h-3 w-3" /></TooltipTrigger>
                <TooltipContent>Total market value of outstanding shares</TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-xl font-bold">
              {info.market_cap ? formatCompactNumber(info.market_cap) : "N/A"}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              P/E Ratio
              <Tooltip>
                <TooltipTrigger><Info className="h-3 w-3" /></TooltipTrigger>
                <TooltipContent>Price-to-earnings ratio. Lower may indicate undervaluation.</TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-xl font-bold">
              {info.pe_ratio?.toFixed(2) || "N/A"}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">52W High</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-xl font-bold">{formatCurrency(info.high_52w)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">52W Low</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-xl font-bold">{formatCurrency(info.low_52w)}</span>
          </CardContent>
        </Card>
      </div>

      {stock.traders_holding.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tracked Traders Holding {ticker}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stock.traders_holding.map((holder) => (
                <Link
                  key={holder.trader_slug}
                  href={`/trader/${holder.trader_slug}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <span className="font-medium">{holder.trader_name}</span>
                  <span className="text-sm text-muted-foreground">
                    {holder.shares?.toLocaleString()} shares
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {stock.recent_trades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="p-3 text-left">Trader</th>
                    <th className="p-3 text-left">Action</th>
                    <th className="p-3 text-right">Shares</th>
                    <th className="p-3 text-right">Price</th>
                    <th className="p-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.recent_trades.map((trade, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-3">
                        <Link href={`/trader/${trade.trader_slug}`} className="hover:underline">
                          {trade.trader_name}
                        </Link>
                      </td>
                      <td className="p-3">
                        <Badge variant={trade.action === "buy" ? "success" : "destructive"}>
                          {trade.action.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">{trade.shares?.toLocaleString() || "N/A"}</td>
                      <td className="p-3 text-right">{formatCurrency(trade.price)}</td>
                      <td className="p-3">{formatDate(trade.trade_date)}</td>
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
