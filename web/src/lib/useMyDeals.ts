"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import type { Address } from "viem";
import { elysiumTestnet } from "./chain";
import { ADDRESSES, elyMarketAbi } from "./contracts";
import { fetchEvents } from "./events";

export type MyDeal = {
  id: bigint;
  customer: Address;
  provider: Address;
  amount: bigint;
  deadline: bigint;
  reviewSeconds: bigint;
  reviewEnds: bigint;
  resolveBy: bigint;
  status: number;
  title: string;
  role: "provider" | "customer";
};

export type Hint = { text: string; urgent: boolean };

// Plain words for what each side should do next.
export function dealHint(d: MyDeal, now: number): Hint {
  const pastDeadline = now > Number(d.deadline);
  const reviewOver = now >= Number(d.reviewEnds);

  if (d.status === 1) {
    if (d.role === "provider") {
      return { text: "Booked. Do the job, then mark it delivered.", urgent: true };
    }
    return pastDeadline
      ? { text: "The deadline passed. You can take your money back.", urgent: true }
      : { text: "Waiting for the provider to deliver.", urgent: false };
  }

  if (d.status === 2) {
    if (d.role === "customer") {
      return {
        text: "Delivered. Check the work, then release the payment or open a dispute.",
        urgent: true,
      };
    }
    return reviewOver
      ? { text: "Review time ended. You can claim your payment.", urgent: true }
      : { text: "Delivered. Waiting for the customer.", urgent: false };
  }

  if (d.status === 3) return { text: "Paid out.", urgent: false };
  if (d.status === 4) return { text: "Refunded.", urgent: false };

  if (d.status === 5) {
    return now >= Number(d.resolveBy)
      ? {
          text: "The referee did not answer in time. Anyone can split the money in half.",
          urgent: true,
        }
      : { text: "In dispute. Add evidence. The referee will decide.", urgent: true };
  }

  if (d.status === 6) return { text: "Resolved by the referee.", urgent: false };
  return { text: "", urgent: false };
}

// Finds every deal where this wallet is the provider or the customer.
export function useMyDeals(address?: Address) {
  const client = usePublicClient({ chainId: elysiumTestnet.id });
  const [deals, setDeals] = useState<MyDeal[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const c = client;
    if (!c || !address) return;
    const me = address;
    let cancelled = false;

    async function load() {
      try {
        const [asProvider, asCustomer] = await Promise.all([
          fetchEvents("market", "DealCreated", { provider: me.toLowerCase() }),
          fetchEvents("market", "DealCreated", { customer: me.toLowerCase() }),
        ]);

        const ids = new Map<string, bigint>();
        for (const e of [...asProvider, ...asCustomer]) {
          if (e.args.id !== undefined) ids.set(e.args.id, BigInt(e.args.id));
        }

        const list = await Promise.all(
          Array.from(ids.values()).map(async (id) => {
            const d = await c!.readContract({
              address: ADDRESSES.elyMarket,
              abi: elyMarketAbi,
              functionName: "deals",
              args: [id],
            });
            const item: MyDeal = {
              id,
              customer: d[0],
              provider: d[1],
              amount: d[2],
              deadline: d[3],
              reviewSeconds: d[4],
              reviewEnds: d[5],
              resolveBy: d[6],
              status: Number(d[7]),
              title: d[8],
              role: d[1].toLowerCase() === me.toLowerCase() ? "provider" : "customer",
            };
            return item;
          })
        );

        list.sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
        if (!cancelled) {
          setDeals(list);
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
  }, [client, address]);

  return { deals: address ? deals : null, error };
}