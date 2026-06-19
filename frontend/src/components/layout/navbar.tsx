"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import {
  TrendingUp,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  User,
  Settings,
  Shield,
  BarChart3,
  Newspaper,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notificationsApi } from "@/lib/api";

export function Navbar() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.accessToken) return;
    const fetchUnread = async () => {
      try {
        const data = await notificationsApi.unreadCount(session.accessToken!);
        setUnreadCount(data.unread_count);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, [session?.accessToken]);

  const navLinks = [
    { href: "/leaderboard", label: "Leaderboard", icon: BarChart3 },
    { href: "/news", label: "News", icon: Newspaper },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            TradeTracker
          </Link>
          <div className="hidden md:flex items-center gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {session ? (
            <>
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                </Button>
              </Link>

              <div className="hidden md:flex items-center gap-2">
                {session.isAdmin && (
                  <Link href="/admin">
                    <Button variant="ghost" size="sm">
                      <Shield className="h-4 w-4 mr-1" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Link href="/settings">
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4 mr-1" />
                    Settings
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4 mr-1" />
                  Sign Out
                </Button>
              </div>
            </>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t p-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 p-2 text-sm hover:bg-accent rounded-md"
              onClick={() => setMobileOpen(false)}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
          {session ? (
            <>
              <Link
                href="/notifications"
                className="flex items-center gap-2 p-2 text-sm hover:bg-accent rounded-md"
                onClick={() => setMobileOpen(false)}
              >
                <Bell className="h-4 w-4" />
                Notifications
                {unreadCount > 0 && <Badge variant="secondary">{unreadCount}</Badge>}
              </Link>
              {session.isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 p-2 text-sm hover:bg-accent rounded-md"
                  onClick={() => setMobileOpen(false)}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              )}
              <Link
                href="/settings"
                className="flex items-center gap-2 p-2 text-sm hover:bg-accent rounded-md"
                onClick={() => setMobileOpen(false)}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <button
                className="flex items-center gap-2 p-2 text-sm hover:bg-accent rounded-md w-full text-left"
                onClick={() => { signOut(); setMobileOpen(false); }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="flex items-center gap-2 p-2 text-sm hover:bg-accent rounded-md"
                onClick={() => setMobileOpen(false)}
              >
                <User className="h-4 w-4" />
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="flex items-center gap-2 p-2 text-sm hover:bg-accent rounded-md"
                onClick={() => setMobileOpen(false)}
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
