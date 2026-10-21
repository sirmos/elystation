"use client";

import { useEffect, useState } from "react";

export type Activity = {
  links: number;
  payments: number;
  deals: number;
  profiles: number;
  volume: bigint;
  latest: { amount: bigint; fee: bigint; memo: string } | null;
};

// Usage numbers for the home page, from our own server.
// If one refresh fails, it keeps the last good numbers.
export function useActivity() {
  const [data, setData] = useState<Activity | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/stats");
        if (!res.ok) return;
        const j = await res.json();
        if (cancelled) return;
        setData({
          links: Number(j.links),
          payments: Number(j.payments),
          deals: Number(j.deals),
          profiles: Number(j.profiles),
          volume: BigInt(j.volume),
          latest: j.latest
            ? {
                amount: BigInt(j.latest.amount),
                fee: BigInt(j.latest.fee),
                memo: String(j.latest.memo ?? ""),
              }
            : null,
        });
      } catch {
        // Keep showing the last good numbers.
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") load();
    }

    load();
    const timer = setInterval(load, 15000);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return data;
}