const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FetchOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOpts } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOpts.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOpts,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

// Auth
export const authApi = {
  register: (data: { email: string; name: string; password: string }) =>
    apiFetch<{ access_token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    apiFetch<{ access_token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  me: (token: string) =>
    apiFetch<import("@/types").User>("/api/auth/me", { token }),
};

// Traders
export const tradersApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{ traders: import("@/types").Trader[]; total: number }>(
      `/api/traders${qs}`
    );
  },
  get: (slug: string) =>
    apiFetch<import("@/types").Trader>(`/api/traders/${slug}`),
  getTrades: (slug: string, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{ trades: import("@/types").Trade[]; total: number }>(
      `/api/traders/${slug}/trades${qs}`
    );
  },
  getHoldings: (slug: string) =>
    apiFetch<{ ticker: string; company_name: string; shares: number }[]>(
      `/api/traders/${slug}/holdings`
    ),
  getPerformance: (slug: string, period: string = "1Y") =>
    apiFetch<{
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
    }>(`/api/traders/${slug}/performance?period=${period}`),
  create: (data: Record<string, unknown>, token: string) =>
    apiFetch<import("@/types").Trader>("/api/traders", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),
  update: (id: number, data: Record<string, unknown>, token: string) =>
    apiFetch<import("@/types").Trader>(`/api/traders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),
  delete: (id: number, token: string) =>
    apiFetch<void>(`/api/traders/${id}`, { method: "DELETE", token }),
};

// Trades
export const tradesApi = {
  recent: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<import("@/types").Trade[]>(`/api/trades${qs}`);
  },
  create: (data: Record<string, unknown>, token: string) =>
    apiFetch<import("@/types").Trade>("/api/trades", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),
  byStock: (ticker: string) =>
    apiFetch<import("@/types").Trade[]>(`/api/trades/by-stock/${ticker}`),
};

// Follows
export const followsApi = {
  list: (token: string) =>
    apiFetch<import("@/types").Follow[]>("/api/follows", { token }),
  follow: (traderId: number, token: string) =>
    apiFetch<import("@/types").Follow>("/api/follows", {
      method: "POST",
      body: JSON.stringify({ trader_id: traderId }),
      token,
    }),
  unfollow: (traderId: number, token: string) =>
    apiFetch<void>(`/api/follows/${traderId}`, { method: "DELETE", token }),
  toggleEmail: (traderId: number, token: string) =>
    apiFetch<{ email_notify: number }>(`/api/follows/${traderId}/email`, {
      method: "PUT",
      token,
    }),
};

// Notifications
export const notificationsApi = {
  list: (token: string, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{
      notifications: import("@/types").Notification[];
      total: number;
      unread_count: number;
    }>(`/api/notifications${qs}`, { token });
  },
  unreadCount: (token: string) =>
    apiFetch<{ unread_count: number }>("/api/notifications/unread-count", {
      token,
    }),
  markRead: (id: number, token: string) =>
    apiFetch<void>(`/api/notifications/${id}/read`, {
      method: "POST",
      token,
    }),
  markAllRead: (token: string) =>
    apiFetch<void>("/api/notifications/read-all", { method: "POST", token }),
};

// News
export const newsApi = {
  feed: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{
      articles: import("@/types").NewsArticle[];
      total: number;
    }>(`/api/news/feed${qs}`);
  },
  personalized: (token: string) =>
    apiFetch<{
      articles: import("@/types").NewsArticle[];
      total: number;
    }>("/api/news/personalized", { token }),
  trending: () =>
    apiFetch<{ ticker: string; count: number }[]>("/api/news/trending"),
};

// Stocks
export const stocksApi = {
  detail: (ticker: string) =>
    apiFetch<import("@/types").StockDetail>(`/api/stocks/${ticker}`),
};

// Dashboard
export const dashboardApi = {
  get: (token: string) =>
    apiFetch<import("@/types").DashboardData>("/api/dashboard", { token }),
};

// Admin
export const adminApi = {
  stats: (token: string) =>
    apiFetch<Record<string, number>>("/api/admin/stats", { token }),
  triggerScrape: (token: string) =>
    apiFetch<{ status: string }>("/api/admin/scrape/trigger", {
      method: "POST",
      token,
    }),
  refreshNews: (token: string) =>
    apiFetch<{ status: string }>("/api/admin/news/refresh", {
      method: "POST",
      token,
    }),
};
