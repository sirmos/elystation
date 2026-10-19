"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { elysiumTestnet } from "./chain";
import { ADDRESSES, DEPLOY_BLOCK, elyMarketAbi, elyPayAbi } from "./contracts";

export type Activity = {
  links: number;
  payments: number;
  deals: number;
  profiles: number;
  volume: bigint;
  latest: { amount: bigint; fee: bigint; memo: string } | null;
};

// Reads link, payment, deal and profile events from the contracts.
// If one refresh fails, it keeps the last good numbers.
// Returns null only if nothing has ever loaded, so the page can show an example.
export function useActivity() {
  const client = usePublicClient({ chainId: elysiumTestnet.id });
  const [data, setData] = useState<Activity | null>(null);

  useEffect(() => {
    const c = client;
    if (!c) return;
    let cancelled = false;

    async function load() {
      try {
        const [created, paid, deals, profiles] = await Promise.all([
          c!.getContractEvents({
            address: ADDRESSES.elyPay,
            abi: elyPayAbi,
            eventName: "LinkCreated",
            fromBlock: DEPLOY_BLOCK,
            toBlock: "latest",
          }),
          c!.getContractEvents({
            address: ADDRESSES.elyPay,
            abi: elyPayAbi,
            eventName: "Paid",
            fromBlock: DEPLOY_BLOCK,
            toBlock: "latest",
          }),
          c!.getContractEvents({
            address: ADDRESSES.elyMarket,
            abi: elyMarketAbi,
            eventName: "DealCreated",
            fromBlock: DEPLOY_BLOCK,
            toBlock: "latest",
          }),
          c!.getContractEvents({
            address: ADDRESSES.elyMarket,
            abi: elyMarketAbi,
            eventName: "ProfileSet",
            fromBlock: DEPLOY_BLOCK,
            toBlock: "latest",
          }),
        ]);

        let volume = BigInt(0);
        for (const p of paid) volume += p.args.amount ?? BigInt(0);
        for (const d of deals) volume += d.args.amount ?? BigInt(0);

        const people = new Set<string>();
        for (const p of profiles) {
          if (p.args.provider) people.add(p.args.provider.toLowerCase());
        }

        let latest: Activity["latest"] = null;
        const last = paid[paid.length - 1];
        if (last && last.args.id !== undefined) {
          const link = await c!.readContract({
            address: ADDRESSES.elyPay,
            abi: elyPayAbi,
            functionName: "links",
            args: [last.args.id],
          });
          latest = {
            amount: last.args.amount ?? BigInt(0),
            fee: last.args.fee ?? BigInt(0),
            memo: link[5],
          };
        }

        if (!cancelled) {
          setData({
            links: created.length,
            payments: paid.length,
            deals: deals.length,
            profiles: people.size,
            volume,
            latest,
          });
        }
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
  }, [client]);

  return data;
}