"use client";

import { useEffect, useState } from "react";
import type { Address } from "viem";

export type ProfileCard = {
  address: Address;
  name: string;
  handle: string;
  headline: string;
  category: string;
  city: string;
  jobs: number;
  fromPrice: bigint | null;
};

// The directory comes ready-made from our own server, in one request.
// If a refresh fails it keeps the last good list.
export function useProfiles() {
  const [profiles, setProfiles] = useState<ProfileCard[] | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/profiles");
        if (!res.ok) throw new Error(`The directory service answered ${res.status}`);
        const json = await res.json();
        if (cancelled) return;

        const list: ProfileCard[] = (json.profiles ?? []).map(
          (p: Record<string, string | number | null>) => ({
            address: String(p.address) as Address,
            name: String(p.name),
            handle: String(p.handle ?? ""),
            headline: String(p.headline ?? ""),
            category: String(p.category ?? ""),
            city: String(p.city ?? ""),
            jobs: Number(p.jobs ?? 0),
            fromPrice: p.from_price ? BigInt(String(p.from_price)) : null,
          })
        );

        const behind = Number(json.latest) - Number(json.indexedTo);
        if (list.length === 0 && behind > 5000) {
          setError("The directory is catching up with the chain. Try again in a minute.");
          return;
        }

        setProfiles(list);
        setError("");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message.slice(0, 200) : "Unknown error");
      }
    }

    load();
    const timer = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tick]);

  return { profiles, error, retry: () => setTick((t) => t + 1) };
}