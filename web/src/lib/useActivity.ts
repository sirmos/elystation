"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { elysiumTestnet } from "./chain";
import { ADDRESSES, DEPLOY_BLOCK, elyPayAbi } from "./contracts";

export type Activity = {
  links: number;
  payments: number;
  volume: bigint;
  latest: { amount: bigint; fee: bigint; memo: string } | null;
};

// Reads link and payment events from the ElyPay contract.
// Returns null when nothing can be read, so the page can show an example.
// It refreshes every 10 seconds and when the tab becomes visible again.
export function useActivity() {
  const client = usePublicClient({ chainId: elysiumTestnet.id });
  const [data, setData] = useState<Activity | null>(null);

  useEffect(() => {
    const c = client;
    if (!c) return;
    let cancelled = false;

    async function load() {
      try {
        const created = await c!.getContractEvents({
          address: ADDRESSES.elyPay,
          abi: elyPayAbi,
          eventName: "LinkCreated",
          fromBlock: DEPLOY_BLOCK,
          toBlock: "latest",
        });
        const paid = await c!.getContractEvents({
          address: ADDRESSES.elyPay,
          abi: elyPayAbi,
          eventName: "Paid",
          fromBlock: DEPLOY_BLOCK,
          toBlock: "latest",
        });

        let volume = BigInt(0);
        for (const p of paid) volume += p.args.amount ?? BigInt(0);

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
          setData({ links: created.length, payments: paid.length, volume, latest });
        }
      } catch {
        if (!cancelled) setData(null);
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") load();
    }

    load();
    const timer = setInterval(load, 10000);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [client]);

  return data;
}