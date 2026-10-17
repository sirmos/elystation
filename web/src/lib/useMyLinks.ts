"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import type { Address } from "viem";
import { elysiumTestnet } from "./chain";
import { ADDRESSES, DEPLOY_BLOCK, elyPayAbi } from "./contracts";

export type MyLink = {
  id: bigint;
  amount: bigint;
  active: boolean;
  payments: number;
  received: bigint;
  memo: string;
};

// Finds every payment link created by this wallet.
export function useMyLinks(address?: Address) {
  const client = usePublicClient({ chainId: elysiumTestnet.id });
  const [links, setLinks] = useState<MyLink[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const c = client;
    if (!c || !address) return;
    const me = address;
    let cancelled = false;

    async function load() {
      try {
        const logs = await c!.getContractEvents({
          address: ADDRESSES.elyPay,
          abi: elyPayAbi,
          eventName: "LinkCreated",
          args: { owner: me },
          fromBlock: DEPLOY_BLOCK,
          toBlock: "latest",
        });

        const list = await Promise.all(
          logs.map(async (log) => {
            const id = log.args.id as bigint;
            const l = await c!.readContract({
              address: ADDRESSES.elyPay,
              abi: elyPayAbi,
              functionName: "links",
              args: [id],
            });
            const item: MyLink = {
              id,
              amount: l[1],
              active: l[2],
              payments: l[3],
              received: l[4],
              memo: l[5],
            };
            return item;
          })
        );

        list.sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
        if (!cancelled) {
          setLinks(list);
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

  return { links: address ? links : null, error };
}