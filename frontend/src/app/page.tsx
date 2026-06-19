"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  TrendingUp,
  Users,
  Bell,
  BarChart3,
  ArrowRight,
  Newspaper,
  Shield,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardApi } from "@/lib/api";
import { formatCurrency, formatRelativeTime, getCategoryLabel, getCategoryColor, formatPercent } from "@/lib/utils";
import type { DashboardData } from "@/types";

function LandingPage() {
  const features = [
    {
      icon: Users,
      title: "Track Elite Traders",
      description:
        "Follow Warren Buffett, Nancy Pelosi, Cathie Wood, and 50+ hedge fund managers, congressional traders, and popular investors.",
    },
    {
      icon: Bell,
      title: "Real-Time Notifications",
      description:
        "Get instant alerts when tracked traders buy or sell stocks. Never miss a move from the world's best investors.",
    },
    {
      icon: BarChart3,
      title: "Leaderboard & Analytics",
      description:
        "Compare trader performance with ROI rankings, win rates, and portfolio analytics. See who's beating the market.",
    },
    {
      icon: Newspaper,
      title: "Smart News Feed",
      description:
        "AI-powered personalized financial news feed with trader connection badges. Know what matters for your portfolio.",
    },
    {
      icon: Shield,
      title: "Multi-Source Data",
      description:
        "Data from SEC EDGAR 13F filings, Form 4 insider trades, Capitol Trades, ARK Invest, and more.",
    },
    {
      icon: BookOpen,
      title: "Beginner Friendly",
      description:
        "Tooltips for every metric, clean design, and educational resources. Perfect for investors at any level.",
    },
  ];

  return (
    <div className="space-y-16 py-8">
      <section className="text-center space-y-6 py-12">
        <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4 text-primary" />
          Track the smartest money on Wall Street
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Follow the Trades of
          <br />
          <span className="text-primary">Elite Investors</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          TradeTracker monitors SEC filings, congressional disclosures, and public portfolios
          to notify you when billionaire traders, hedge fund managers, and members of Congress
          make stock trades.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/auth/register">
            <Button size="lg">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/leaderboard">
            <Button variant="outline" size="lg">
              View Leaderboard
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title} className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Tracked Trader Categories</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            "Hedge Fund Legends",
            "Active Public Traders",
            "eToro Popular Investors",
            "Congressional Traders",
            "Corporate Insiders",
          ].map((cat) => (
            <Badge key={cat} variant="secondary" className="text-sm px-3 py-1">
              {cat}
            </Badge>
          ))}
        </div>
      </section>
    </div>
  );
}

function DashboardPage() {
  const { data: session } = useSession();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.accessToken) return;
    dashboardApi
      .get(session.accessToken)
      .then(setDashboard)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/leaderboard">
          <Button variant="outline" size="sm">
            Explore Traders
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Following
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dashboard?.followed_traders_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">traders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Trades Tracked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dashboard?.total_trades_tracked || 0}
            </div>
            <p className="text-xs text-muted-foreground">total trades</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard?.top_performers?.[0] ? (
              <>
                <div className="text-lg font-bold">
                  {dashboard.top_performers[0].name}
                </div>
                <p className="text-sm text-green-500">
                  {formatPercent(dashboard.top_performers[0].roi_ytd)} YTD
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Follow traders to see</p>
            )}
          </CardContent>
        </Card>
      </div>

      {dashboard?.latest_trades && dashboard.latest_trades.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Latest Trades from Your Traders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.latest_trades.slice(0, 10).map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={trade.action === "buy" ? "success" : "destructive"}
                      className="w-12 justify-center"
                    >
                      {trade.action.toUpperCase()}
                    </Badge>
                    <div>
                      <Link
                        href={`/trader/${trade.trader_slug}`}
                        className="font-medium hover:underline"
                      >
                        {trade.trader_name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        <Link
                          href={`/stock/${trade.ticker}`}
                          className="hover:underline"
                        >
                          {trade.ticker}
                        </Link>
                        {trade.shares && ` - ${trade.shares.toLocaleString()} shares`}
                        {trade.price && ` at ${formatCurrency(trade.price)}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(trade.trade_date)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No trades yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Follow some traders to see their latest trades here.
            </p>
            <Link href="/leaderboard" className="mt-4 inline-block">
              <Button>Browse Traders</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {dashboard?.top_performers && dashboard.top_performers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Top Performers (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboard.top_performers.map((t, i) => (
                <div key={t.slug} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-6">#{i + 1}</span>
                    <Link href={`/trader/${t.slug}`} className="font-medium hover:underline">
                      {t.name}
                    </Link>
                    <Badge variant="secondary" className={getCategoryColor(t.category)}>
                      {getCategoryLabel(t.category)}
                    </Badge>
                  </div>
                  <span className={t.roi_ytd >= 0 ? "text-green-500" : "text-red-500"}>
                    {formatPercent(t.roi_ytd)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <BookOpen className="h-8 w-8 text-primary mt-1" />
            <div>
              <h3 className="font-semibold">New to Investing?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Start by following some of the top hedge fund managers on the leaderboard.
                TradeTracker will notify you when they make trades, so you can learn from
                the best investors in the world.
              </p>
              <div className="flex gap-2 mt-3">
                <a
                  href="https://www.investopedia.com/articles/basics/11/3-s-simple-investing.asp"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    Investing Basics
                  </Button>
                </a>
                <a
                  href="https://www.investopedia.com/terms/1/13f.asp"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    What is a 13F Filing?
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function HomePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="space-y-6 py-8">
        <Skeleton className="h-16 w-64 mx-auto" />
        <Skeleton className="h-8 w-96 mx-auto" />
      </div>
    );
  }

  return session ? <DashboardPage /> : <LandingPage />;
}
