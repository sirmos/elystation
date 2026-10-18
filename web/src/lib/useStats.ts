"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { elysiumTestnet } from "./chain";
import { ADDRESSES, DEPLOY_BLOCK, elyMarketAbi, elyPayAbi } from "./contracts";

export type Stats = {
  wallets: number;
  links: number;
  payments: number;
  deals: number;
  profiles: number;
  volume: bigint;
};

// Reads usage straight from the chain. These are the kind of numbers
// Ascend looks at: unique wallets and volume.
export function useStats() {
  const client = usePublicClient({ chainId: elysiumTestnet.id });
  const [stats, setStats] = useState<Stats | null>(null);

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

        const wallets = new Set<string>();
        const people = new Set<string>();
        const add = (a?: string) => {
          if (a) wallets.add(a.toLowerCase());
        };
        let volume = BigInt(0);

        for (const l of created) add(l.args.owner);
        for (const p of paid) {
          add(p.args.payer);
          add(p.args.receiver);
          volume += p.args.amount ?? BigInt(0);
        }
        for (const d of deals) {
          add(d.args.customer);
          add(d.args.provider);
          volume += d.args.amount ?? BigInt(0);
        }
        for (const p of profiles) {
          add(p.args.provider);
          if (p.args.provider) people.add(p.args.provider.toLowerCase());
        }

        if (!cancelled) {
          setStats({
            wallets: wallets.size,
            links: created.length,
            payments: paid.length,
            deals: deals.length,
            profiles: people.size,
            volume,
          });
        }
      } catch {
        if (!cancelled) setStats(null);
      }
    }

    load();
    const timer = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [client]);

  return stats;
}