"use client";

import { useEffect, useState } from "react";

export type Stats = {
  wallets: number;
  links: number;
  payments: number;
  deals: number;
  profiles: number;
  volume: bigint;
};

// Usage numbers for the token page, from our own server.
// These are the kind of numbers Ascend looks at: unique wallets and volume.
export function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/stats");
        if (!res.ok) return;
        const j = await res.json();
        if (cancelled) return;
        setStats({
          wallets: Number(j.wallets),
          links: Number(j.links),
          payments: Number(j.payments),
          deals: Number(j.deals),
          profiles: Number(j.profiles),
          volume: BigInt(j.volume),
        });
      } catch {
        // Keep the last good numbers.
      }
    }

    load();
    const timer = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return stats;
}