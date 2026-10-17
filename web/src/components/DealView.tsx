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
import { elysiumTestnet } from "@/lib/chain";
import { ADDRESSES, elyMarketAbi } from "@/lib/contracts";
import { feeOverrides } from "@/lib/gas";
import { STATUS_TEXT, formatDate, money, shortAddress } from "@/lib/market";

const ZERO = "0x0000000000000000000000000000000000000000";

type Fn = "release" | "refund" | "markDelivered" | "claimAfterReview";

function niceError(err: unknown) {
  if (err instanceof BaseError) return err.shortMessage;
  return "Something went wrong. Try again.";
}

export default function DealView({ id }: { id: string }) {
  const dealId = BigInt(id);
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: elysiumTestnet.id });

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 15000);
    return () => clearInterval(timer);
  }, []);

  const dealQuery = useReadContract({
    address: ADDRESSES.elyMarket,
    abi: elyMarketAbi,
    functionName: "deals",
    args: [dealId],
    chainId: elysiumTestnet.id,
  });

  const feeQuery = useReadContract({
    address: ADDRESSES.elyMarket,
    abi: elyMarketAbi,
    functionName: "feeBps",
    chainId: elysiumTestnet.id,
  });

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
    if (receipt) dealQuery.refetch();
    // Run once for each confirmed transaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txHash]);

  if (dealQuery.isLoading) {
    return (
      <div className="panel">
        <h2>Loading deal</h2>
      </div>
    );
  }

  const deal = dealQuery.data;

  if (dealQuery.error || !deal) {
    return (
      <div className="panel">
        <h2>We could not load this deal</h2>
        <p className="panel-note">Check your connection and refresh the page.</p>
      </div>
    );
  }

  if (deal[0] === ZERO) {
    return (
      <div className="panel">
        <h2>This deal does not exist</h2>
        <p className="panel-note">Check the link with the person who sent it.</p>
        <div className="actions">
          <Link className="btn btn-secondary" href="/explore">
            Browse the directory
          </Link>
        </div>
      </div>
    );
  }

  const customer = deal[0];
  const provider = deal[1];
  const amount = deal[2];
  const deadline = deal[3];
  const reviewEnds = deal[4];
  const status = Number(deal[5]);
  const title = deal[6];

  const isCustomer = !!address && address.toLowerCase() === customer.toLowerCase();
  const isProvider = !!address && address.toLowerCase() === provider.toLowerCase();
  const busy = signing || confirming;
  const feeText =
    feeQuery.data !== undefined ? `${Number(feeQuery.data) / 100}%` : "-";

  const errorText =
    localError ||
    (writeError ? niceError(writeError) : "") ||
    (receiptError ? niceError(receiptError) : "") ||
    (receipt?.status === "reverted" ? "The transaction failed. Try again." : "");

  async function run(fn: Fn) {
    setLocalError("");
    if (!publicClient) {
      setLocalError("The network is not ready. Try again in a moment.");
      return;
    }
    try {
      const fees = await feeOverrides(publicClient);
      if (fn === "release") {
        writeContract({
          address: ADDRESSES.elyMarket,
          abi: elyMarketAbi,
          functionName: "release",
          args: [dealId],
          chainId: elysiumTestnet.id,
          ...fees,
        });
      }
      if (fn === "refund") {
        writeContract({
          address: ADDRESSES.elyMarket,
          abi: elyMarketAbi,
          functionName: "refund",
          args: [dealId],
          chainId: elysiumTestnet.id,
          ...fees,
        });
      }
      if (fn === "markDelivered") {
        writeContract({
          address: ADDRESSES.elyMarket,
          abi: elyMarketAbi,
          functionName: "markDelivered",
          args: [dealId],
          chainId: elysiumTestnet.id,
          ...fees,
        });
      }
      if (fn === "claimAfterReview") {
        writeContract({
          address: ADDRESSES.elyMarket,
          abi: elyMarketAbi,
          functionName: "claimAfterReview",
          args: [dealId],
          chainId: elysiumTestnet.id,
          ...fees,
        });
      }
    } catch (err) {
      setLocalError(niceError(err));
    }
  }

  const actions: { fn: Fn; label: string }[] = [];
  if (status === 1 || status === 2) {
    if (isCustomer) actions.push({ fn: "release", label: "Release the payment" });
    if (isProvider && status === 1) {
      actions.push({ fn: "markDelivered", label: "Mark as delivered" });
    }
    if (isCustomer && status === 1 && now > Number(deadline)) {
      actions.push({ fn: "refund", label: "Take my money back" });
    }
    if (isProvider) actions.push({ fn: "refund", label: "Refund the customer" });
  }
  if (status === 2 && now >= Number(reviewEnds)) {
    actions.push({ fn: "claimAfterReview", label: "Pay out to the provider" });
  }

  let help = "Connect the wallet used in this deal to see your options.";
  if (status === 1 && isCustomer) {
    help =
      "Your money is held by the contract. Release it when the job is done. If the provider does not deliver by the deadline, you can take it back.";
  } else if (status === 1 && isProvider) {
    help = "The money is held by the contract. When the job is done, mark it as delivered.";
  } else if (status === 2 && isCustomer) {
    help =
      "The provider says the job is done. Release the payment, or wait. After the review time, the provider can be paid out.";
  } else if (status === 2 && isProvider) {
    help =
      "You marked this as delivered. You get paid when the customer releases, or after the review time ends.";
  } else if (status === 3) {
    help = "The provider has been paid.";
  } else if (status === 4) {
    help = "The money went back to the customer.";
  }

  const steps = [
    { name: "Funded", note: "Money is held" },
    { name: "Delivered", note: "Job is done" },
    { name: "Paid out", note: "Provider is paid" },
  ];

  return (
    <div className="panel">
      <div className="inv-head">
        <span className="inv-title">Deal {id}</span>
        <span className={status === 3 ? "status status-live" : "status"}>
          {STATUS_TEXT[status]}
        </span>
      </div>

      <h1 className="deal-title">{title || "Service"}</h1>

      <p className="inv-label">Amount</p>
      <p className="amount">
        {money(amount)}
        <span className="unit">USDC</span>
      </p>

      {status === 4 ? (
        <p className="outcome outcome-refunded">Refunded to the customer</p>
      ) : (
        <div className="dsteps">
          {steps.map((s, i) => {
            const done = status > i + 1 || (status === 3 && i === 2);
            const current = status === i + 1;
            return (
              <div
                key={s.name}
                className={done ? "dstep done" : current ? "dstep now" : "dstep"}
              >
                <strong>{s.name}</strong>
                {s.note}
              </div>
            );
          })}
        </div>
      )}

      <dl className="inv-rows">
        <div className="row">
          <dt>Customer</dt>
          <dd>{shortAddress(customer)}</dd>
        </div>
        <div className="row">
          <dt>Provider</dt>
          <dd>
            <Link href={`/u/${provider}`}>{shortAddress(provider)}</Link>
          </dd>
        </div>
        {status === 1 && (
          <div className="row">
            <dt>Deliver by</dt>
            <dd>{formatDate(deadline)}</dd>
          </div>
        )}
        {status === 2 && (
          <div className="row">
            <dt>Review ends</dt>
            <dd>{formatDate(reviewEnds)}</dd>
          </div>
        )}
        <div className="row">
          <dt>Fee when paid out</dt>
          <dd>{feeText}</dd>
        </div>
      </dl>

      <p className="hint" style={{ marginTop: 16 }}>
        {help}
      </p>

      {actions.length > 0 && (
        <div className="pay-actions">
          {errorText && (
            <p className="notice" role="alert">
              {errorText}
            </p>
          )}
          {actions.map((a, i) => (
            <button
              key={a.label}
              className={i === 0 ? "btn btn-primary btn-block" : "btn btn-secondary btn-block"}
              disabled={busy}
              onClick={() => run(a.fn)}
            >
              {busy ? (signing ? "Confirm in your wallet" : "Waiting for confirmation") : a.label}
            </button>
          ))}
        </div>
      )}

      {actions.length === 0 && errorText && (
        <p className="notice" role="alert" style={{ marginTop: 16 }}>
          {errorText}
        </p>
      )}
    </div>
  );
}