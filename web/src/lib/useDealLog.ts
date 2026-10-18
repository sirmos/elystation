"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import type { Address } from "viem";
import { elysiumTestnet } from "./chain";
import { ADDRESSES, DEPLOY_BLOCK, elyMarketAbi } from "./contracts";

export type LogEntry = {
  kind: "opened" | "evidence" | "ruling";
  by?: Address;
  text: string;
  shareBps?: number;
  order: number;
};

// Reads the dispute record of one deal: the reason, the evidence and the ruling.
export function useDealLog(id: bigint) {
  const client = usePublicClient({ chainId: elysiumTestnet.id });
  const [entries, setEntries] = useState<LogEntry[]>([]);

  useEffect(() => {
    const c = client;
    if (!c) return;
    let cancelled = false;

    async function load() {
      try {
        const [opened, evidence, rulings] = await Promise.all([
          c!.getContractEvents({
            address: ADDRESSES.elyMarket,
            abi: elyMarketAbi,
            eventName: "DisputeOpened",
            args: { id },
            fromBlock: DEPLOY_BLOCK,
            toBlock: "latest",
          }),
          c!.getContractEvents({
            address: ADDRESSES.elyMarket,
            abi: elyMarketAbi,
            eventName: "EvidenceAdded",
            args: { id },
            fromBlock: DEPLOY_BLOCK,
            toBlock: "latest",
          }),
          c!.getContractEvents({
            address: ADDRESSES.elyMarket,
            abi: elyMarketAbi,
            eventName: "DisputeResolved",
            args: { id },
            fromBlock: DEPLOY_BLOCK,
            toBlock: "latest",
          }),
        ]);

        const list: LogEntry[] = [];

        for (const l of opened) {
          list.push({
            kind: "opened",
            by: l.args.customer,
            text: l.args.reason ?? "",
            order: Number(l.blockNumber) * 1000 + Number(l.logIndex),
          });
        }
        for (const l of evidence) {
          list.push({
            kind: "evidence",
            by: l.args.by,
            text: l.args.note ?? "",
            order: Number(l.blockNumber) * 1000 + Number(l.logIndex),
          });
        }
        for (const l of rulings) {
          list.push({
            kind: "ruling",
            text: l.args.ruling ?? "",
            shareBps: Number(l.args.providerShareBps ?? 0),
            order: Number(l.blockNumber) * 1000 + Number(l.logIndex),
          });
        }

        list.sort((a, b) => a.order - b.order);
        if (!cancelled) setEntries(list);
      } catch {
        // Leave the record empty if it cannot be read.
      }
    }

    load();
    const timer = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [client, id]);

  return entries;
}