"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { BaseError } from "viem";
import type { Address } from "viem";
import { elysiumTestnet } from "@/lib/chain";
import { ADDRESSES, DEPLOY_BLOCK, elyMarketAbi } from "@/lib/contracts";
import { feeOverrides } from "@/lib/gas";
import { formatDate, money, shortAddress } from "@/lib/market";
import { useDealLog } from "@/lib/useDealLog";

type Open = {
  id: bigint;
  customer: Address;
  provider: Address;
  amount: bigint;
  title: string;
  resolveBy: bigint;
};

function niceError(err: unknown) {
  if (err instanceof BaseError) return err.shortMessage;
  return "Something went wrong. Try again.";
}

function useOpenDisputes(tick: number) {
  const client = usePublicClient({ chainId: elysiumTestnet.id });
  const [items, setItems] = useState<Open[] | null>(null);

  useEffect(() => {
    const c = client;
    if (!c) return;
    let cancelled = false;

    async function load() {
      try {
        const logs = await c!.getContractEvents({
          address: ADDRESSES.elyMarket,
          abi: elyMarketAbi,
          eventName: "DisputeOpened",
          fromBlock: DEPLOY_BLOCK,
          toBlock: "latest",
        });

        const ids = new Map<string, bigint>();
        for (const l of logs) {
          if (l.args.id !== undefined) ids.set(l.args.id.toString(), l.args.id);
        }

        const all = await Promise.all(
          Array.from(ids.values()).map(async (id) => {
            const d = await c!.readContract({
              address: ADDRESSES.elyMarket,
              abi: elyMarketAbi,
              functionName: "deals",
              args: [id],
            });
            return {
              id,
              customer: d[0],
              provider: d[1],
              amount: d[2],
              resolveBy: d[6],
              status: Number(d[7]),
              title: d[8],
            };
          })
        );

        const open = all
          .filter((x) => x.status === 5)
          .map(
            (x): Open => ({
              id: x.id,
              customer: x.customer,
              provider: x.provider,
              amount: x.amount,
              title: x.title,
              resolveBy: x.resolveBy,
            })
          );

        open.sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
        if (!cancelled) setItems(open);
      } catch {
        if (!cancelled) setItems([]);
      }
    }

    load();
    const timer = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [client, tick]);

  return items;
}

function DisputeCard({ item, onDone }: { item: Open; onDone: () => void }) {
  const publicClient = usePublicClient({ chainId: elysiumTestnet.id });
  const log = useDealLog(item.id);

  const [pct, setPct] = useState(50);
  const [ruling, setRuling] = useState("");
  const [localError, setLocalError] = useState("");

  const {
    writeContract,
    data: hash,
    isPending: signing,
    error: writeError,
  } = useWriteContract();

  const {
    data: receipt,
    isLoading: confirming,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });

  const txHash = receipt?.transactionHash;

  useEffect(() => {
    if (receipt?.status === "success") onDone();
    // Run once for each confirmed transaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txHash]);

  const busy = signing || confirming;
  const errorText =
    localError ||
    (writeError ? niceError(writeError) : "") ||
    (receiptError ? niceError(receiptError) : "") ||
    (receipt?.status === "reverted" ? "The transaction failed. Try again." : "");

  async function send() {
    setLocalError("");
    const text = ruling.trim();
    if (!text) {
      setLocalError("Write a short reason for your ruling.");
      return;
    }
    if (!publicClient) {
      setLocalError("The network is not ready. Try again in a moment.");
      return;
    }
    try {
      const fees = await feeOverrides(publicClient);
      writeContract({
        address: ADDRESSES.elyMarket,
        abi: elyMarketAbi,
        functionName: "resolve",
        args: [item.id, pct * 100, text],
        chainId: elysiumTestnet.id,
        ...fees,
      });
    } catch (err) {
      setLocalError(niceError(err));
    }
  }

  return (
    <div className="panel">
      <div className="inv-head">
        <span className="inv-title">Deal {item.id.toString()}</span>
        <span className="status">In dispute</span>
      </div>
      <h1 className="deal-title">{item.title || "Service"}</h1>
      <p className="amount">
        {money(item.amount)}
        <span className="unit">USDC</span>
      </p>

      <dl className="inv-rows">
        <div className="row">
          <dt>Customer</dt>
          <dd>{shortAddress(item.customer)}</dd>
        </div>
        <div className="row">
          <dt>Provider</dt>
          <dd>{shortAddress(item.provider)}</dd>
        </div>
        <div className="row">
          <dt>Decide by</dt>
          <dd>{formatDate(item.resolveBy)}</dd>
        </div>
      </dl>

      <h2 style={{ marginTop: 22 }}>Record</h2>
      <div className="svc-list">
        {log.length === 0 && <p className="panel-note">Loading</p>}
        {log.map((e, i) => (
          <div className="svc" key={i}>
            <div>
              <p className="svc-title">
                {e.kind === "opened"
                  ? "Reason from the customer"
                  : e.by && e.by.toLowerCase() === item.customer.toLowerCase()
                    ? "Evidence from the customer"
                    : "Evidence from the provider"}
              </p>
              <p className="svc-price">{e.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor={`pct-${item.id}`}>
            Provider gets {pct}%, customer gets {100 - pct}%
          </label>
          <input
            id={`pct-${item.id}`}
            type="range"
            min={0}
            max={100}
            step={5}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            style={{ width: "100%", marginTop: 10 }}
          />
          <p className="hint">The fee applies only to the provider part.</p>
        </div>

        <div className="field">
          <label htmlFor={`ruling-${item.id}`}>Reason for your ruling</label>
          <textarea
            id={`ruling-${item.id}`}
            className="input"
            maxLength={300}
            placeholder="A short reason. It is saved on the chain and shown on the deal page."
            value={ruling}
            onChange={(e) => setRuling(e.target.value)}
          />
        </div>

        {errorText && (
          <p className="notice" role="alert">
            {errorText}
          </p>
        )}

        <button className="btn btn-primary" disabled={busy} onClick={send}>
          {signing
            ? "Confirm in your wallet"
            : confirming
              ? "Sending ruling"
              : "Send ruling"}
        </button>

        <Link className="btn btn-secondary btn-sm" href={`/deal/${item.id.toString()}`}>
          Open the deal page
        </Link>
      </div>
    </div>
  );
}

export default function RefereePanel() {
  const { address, isConnected } = useAccount();
  const [tick, setTick] = useState(0);
  const items = useOpenDisputes(tick);

  const refereeQuery = useReadContract({
    address: ADDRESSES.elyMarket,
    abi: elyMarketAbi,
    functionName: "referee",
    chainId: elysiumTestnet.id,
  });

  if (!isConnected) {
    return (
      <div className="panel">
        <h2>Connect your wallet</h2>
        <p className="panel-note">
          Connect the referee wallet to see open disputes.
        </p>
      </div>
    );
  }

  const referee = refereeQuery.data;
  const isReferee =
    !!address && !!referee && address.toLowerCase() === referee.toLowerCase();

  if (!isReferee) {
    return (
      <div className="panel">
        <h2>Only the referee can use this page</h2>
        <p className="panel-note">
          The current referee wallet is {referee ? shortAddress(referee) : "loading"}.
        </p>
      </div>
    );
  }

  if (!items) {
    return (
      <div className="panel">
        <h2>Loading disputes</h2>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="panel">
        <h2>No open disputes</h2>
        <p className="panel-note">When a customer opens one, it shows up here.</p>
      </div>
    );
  }

  return (
    <>
      {items.map((item) => (
        <DisputeCard
          key={item.id.toString()}
          item={item}
          onDone={() => setTick((t) => t + 1)}
        />
      ))}
    </>
  );
}