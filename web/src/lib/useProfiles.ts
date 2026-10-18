"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
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
export function useProfiles() {
  const client = usePublicClient({ chainId: elysiumTestnet.id });
  const [profiles, setProfiles] = useState<ProfileCard[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const c = client;
    if (!c) return;
    let cancelled = false;

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

        const cards = await Promise.all(
          providers.map(async (addr) => {
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

            return {
              address: addr,
              name: p[0],
              handle,
              headline: p[1],
              category: p[2],
              city: p[3],
              jobs: Number(jobs),
              fromPrice,
            };
          })
        );

        cards.sort((a, b) => b.jobs - a.jobs || a.name.localeCompare(b.name));
        if (!cancelled) {
          setProfiles(cards);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    load();
    const timer = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [client]);

  return { profiles, error };
}