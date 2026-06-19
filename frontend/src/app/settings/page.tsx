"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, Mail, Bell, UserMinus, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { followsApi } from "@/lib/api";
import type { Follow } from "@/types";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [follows, setFollows] = useState<Follow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (!session?.accessToken) return;

    followsApi
      .list(session.accessToken)
      .then(setFollows)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session?.accessToken, status, router]);

  const handleUnfollow = async (traderId: number) => {
    if (!session?.accessToken) return;
    await followsApi.unfollow(traderId, session.accessToken);
    setFollows((prev) => prev.filter((f) => f.trader_id !== traderId));
  };

  const handleToggleEmail = async (traderId: number) => {
    if (!session?.accessToken) return;
    const result = await followsApi.toggleEmail(traderId, session.accessToken);
    setFollows((prev) =>
      prev.map((f) =>
        f.trader_id === traderId
          ? { ...f, email_notify: result.email_notify }
          : f
      )
    );
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm">{session?.user?.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm">{session?.user?.name}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Followed Traders
          </CardTitle>
          <CardDescription>
            Manage your followed traders and email notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          {follows.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                You&apos;re not following any traders yet.
              </p>
              <Link href="/leaderboard" className="mt-2 inline-block">
                <Button size="sm" variant="outline">
                  Browse Traders
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {follows.map((follow) => (
                <div
                  key={follow.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <Link
                      href={`/trader/${follow.trader_slug}`}
                      className="font-medium hover:underline"
                    >
                      {follow.trader_name}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleEmail(follow.trader_id)}
                      title={
                        follow.email_notify
                          ? "Email notifications on"
                          : "Email notifications off"
                      }
                    >
                      <Mail
                        className={`h-4 w-4 mr-1 ${follow.email_notify ? "text-primary" : "text-muted-foreground"}`}
                      />
                      {follow.email_notify ? (
                        <ToggleRight className="h-4 w-4 text-primary" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnfollow(follow.trader_id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
