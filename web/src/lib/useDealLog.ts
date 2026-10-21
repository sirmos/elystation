"use client";

import { useEffect, useState } from "react";
import type { Address } from "viem";
import { fetchEvents } from "./events";

export type LogEntry = {
  kind: "opened" | "evidence" | "ruling";
  by?: Address;
  text: string;
  shareBps?: number;
  order: number;
};

// Reads the dispute record of one deal: the reason, the notes and the ruling.
export function useDealLog(id: bigint) {
  const [entries, setEntries] = useState<LogEntry[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const where = { id: id.toString() };
        const [opened, evidence, rulings] = await Promise.all([
          fetchEvents("market", "DisputeOpened", where),
          fetchEvents("market", "EvidenceAdded", where),
          fetchEvents("market", "DisputeResolved", where),
        ]);

        const list: LogEntry[] = [];

        for (const e of opened) {
          list.push({
            kind: "opened",
            by: e.args.customer as Address,
            text: String(e.args.reason ?? ""),
            order: e.block * 1000 + e.logIndex,
          });
        }
        for (const e of evidence) {
          list.push({
            kind: "evidence",
            by: e.args.by as Address,
            text: String(e.args.note ?? ""),
            order: e.block * 1000 + e.logIndex,
          });
        }
        for (const e of rulings) {
          list.push({
            kind: "ruling",
            text: String(e.args.ruling ?? ""),
            shareBps: Number(e.args.providerShareBps ?? 0),
            order: e.block * 1000 + e.logIndex,
          });
        }

        list.sort((a, b) => a.order - b.order);
        if (!cancelled) setEntries(list);
      } catch {
        // Leave the record as it is if it cannot be read.
      }
    }

    load();
    const timer = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id]);

  return entries;
}