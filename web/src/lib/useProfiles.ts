"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { BaseError } from "viem";
import type { Address } from "viem";
import { elysiumTestnet } from "./chain";
import { ADDRESSES, DEPLOY_BLOCK, elyMarketAbi } from "./contracts";

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

// Builds the directory from ProfileSet events, then reads each profile.
// If a refresh fails it keeps the last good list and retries by itself.
export function useProfiles() {
  const client = usePublicClient({ chainId: elysiumTestnet.id });
  const [profiles, setProfiles] = useState<ProfileCard[] | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const c = client;
    if (!c) return;
    let cancelled = false;
    let retries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      try {
        const logs = await c!.getContractEvents({
          address: ADDRESSES.elyMarket,
          abi: elyMarketAbi,
          eventName: "ProfileSet",
          fromBlock: DEPLOY_BLOCK,
          toBlock: "latest",
        });

        const seen = new Set<string>();
        const providers: Address[] = [];
        for (const log of logs) {
          const a = log.args.provider;
          if (a && !seen.has(a.toLowerCase())) {
            seen.add(a.toLowerCase());
            providers.push(a);
          }
        }

        const cards: ProfileCard[] = [];
        for (const addr of providers) {
          const [p, services, jobs, handle] = await Promise.all([
            c!.readContract({
              address: ADDRESSES.elyMarket,
              abi: elyMarketAbi,
              functionName: "profiles",
              args: [addr],
            }),
            c!.readContract({
              address: ADDRESSES.elyMarket,
              abi: elyMarketAbi,
              functionName: "getServices",
              args: [addr],
            }),
            c!.readContract({
              address: ADDRESSES.elyMarket,
              abi: elyMarketAbi,
              functionName: "jobsCompleted",
              args: [addr],
            }),
            c!.readContract({
              address: ADDRESSES.elyMarket,
              abi: elyMarketAbi,
              functionName: "handleOf",
              args: [addr],
            }),
          ]);

          let fromPrice: bigint | null = null;
          for (const s of services) {
            if (s.active && (fromPrice === null || s.price < fromPrice)) {
              fromPrice = s.price;
            }
          }

          cards.push({
            address: addr,
            name: p[0],
            handle,
            headline: p[1],
            category: p[2],
            city: p[3],
            jobs: Number(jobs),
            fromPrice,
          });
        }

        cards.sort((a, b) => b.jobs - a.jobs || a.name.localeCompare(b.name));
        if (!cancelled) {
          setProfiles(cards);
          setError("");
          retries = 0;
        }
      } catch (e) {
        console.error("Directory load failed:", e);
        if (cancelled) return;
        setError(
          e instanceof BaseError
            ? e.shortMessage
            : e instanceof Error
              ? e.message.slice(0, 200)
              : "Unknown error"
        );
        if (retries < 3) {
          retries += 1;
          retryTimer = setTimeout(load, 3000);
        }
      }
    }

    load();
    const timer = setInterval(() => {
      retries = 0;
      load();
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(timer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [client, tick]);

  return { profiles, error, retry: () => setTick((t) => t + 1) };
}