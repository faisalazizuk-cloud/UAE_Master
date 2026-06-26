"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Newspaper, Search, TrendingUp, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { newsApi } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import type { NewsArticle } from "@/types";

export default function NewsPage() {
  const { data: session } = useSession();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [personalizedArticles, setPersonalizedArticles] = useState<NewsArticle[]>([]);
  const [trending, setTrending] = useState<{ ticker: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tickerFilter, setTickerFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const params: Record<string, string> = {};
    if (tickerFilter) params.ticker = tickerFilter;

    Promise.all([
      newsApi.feed(params),
      newsApi.trending(),
      session?.accessToken ? newsApi.personalized(session.accessToken) : Promise.resolve({ articles: [], total: 0 }),
    ])
      .then(([feedData, trendingData, personalizedData]) => {
        setArticles(feedData.articles);
        setTrending(trendingData);
        setPersonalizedArticles(personalizedData.articles);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tickerFilter, session?.accessToken]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setTickerFilter(searchInput.toUpperCase());
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Financial News</h1>
        </div>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <Input
            placeholder="Filter by ticker..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-40"
          />
          <Button type="submit" size="sm" variant="outline">
            <Search className="h-4 w-4" />
          </Button>
          {tickerFilter && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setTickerFilter("");
                setSearchInput("");
              }}
            >
              Clear
            </Button>
          )}
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-6">
          {session && personalizedArticles.length > 0 && !tickerFilter && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                For You
              </h2>
              {personalizedArticles.slice(0, 5).map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              {tickerFilter ? `News for ${tickerFilter}` : "Market News"}
            </h2>
            {articles.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No articles found{tickerFilter ? ` for ${tickerFilter}` : ""}.
                </CardContent>
              </Card>
            ) : (
              articles.map((article) => <NewsCard key={article.id} article={article} />)
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Trending Stocks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trending.length === 0 ? (
                <p className="text-sm text-muted-foreground">No trending data yet</p>
              ) : (
                <div className="space-y-2">
                  {trending.map((item) => (
                    <Link
                      key={item.ticker}
                      href={`/stock/${item.ticker}`}
                      className="flex items-center justify-between p-2 rounded hover:bg-accent transition-colors"
                    >
                      <span className="font-medium text-sm">{item.ticker}</span>
                      <Badge variant="secondary" className="text-xs">
                        {item.count} articles
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {article.thumbnail_url && (
            <img
              src={article.thumbnail_url}
              alt=""
              className="w-24 h-24 rounded-lg object-cover hidden sm:block"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>{article.source}</span>
              {article.published_at && (
                <>
                  <span>·</span>
                  <span>{formatRelativeTime(article.published_at)}</span>
                </>
              )}
            </div>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline line-clamp-2 inline-flex items-start gap-1"
            >
              {article.title}
              <ExternalLink className="h-3 w-3 mt-1 flex-shrink-0" />
            </a>
            {article.ai_summary && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {article.ai_summary}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {article.related_tickers &&
                article.related_tickers.split(",").filter(Boolean).map((ticker) => (
                  <Link key={ticker} href={`/stock/${ticker.trim()}`}>
                    <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80">
                      ${ticker.trim()}
                    </Badge>
                  </Link>
                ))}
              {article.trader_badges?.map((badge, i) => (
                <Badge key={i} variant="outline" className="text-xs text-primary border-primary/30">
                  {badge}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
