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
import {
  STATUS_TEXT,
  formatDate,
  formatDuration,
  money,
  shortAddress,
} from "@/lib/market";
import { useDealLog } from "@/lib/useDealLog";

const ZERO = "0x0000000000000000000000000000000000000000";

type Fees = Awaited<ReturnType<typeof feeOverrides>>;
type Fn =
  | "release"
  | "refund"
  | "markDelivered"
  | "claimAfterReview"
  | "resolveAfterTimeout";

function niceError(err: unknown) {
  if (err instanceof BaseError) return err.shortMessage;
  return "Something went wrong. Try again.";
}

export default function DealView({ id }: { id: string }) {
  const dealId = BigInt(id);
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: elysiumTestnet.id });
  const log = useDealLog(dealId);

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
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
    if (receipt) {
      dealQuery.refetch();
      setReason("");
      setNote("");
    }
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
  const reviewSeconds = deal[4];
  const reviewEnds = deal[5];
  const resolveBy = deal[6];
  const status = Number(deal[7]);
  const title = deal[8];

  const isCustomer = !!address && address.toLowerCase() === customer.toLowerCase();
  const isProvider = !!address && address.toLowerCase() === provider.toLowerCase();
  const busy = signing || confirming;
  const open = status === 1 || status === 2 || status === 5;
  const feeText =
    feeQuery.data !== undefined ? `${Number(feeQuery.data) / 100}%` : "-";

  const errorText =
    localError ||
    (writeError ? niceError(writeError) : "") ||
    (receiptError ? niceError(receiptError) : "") ||
    (receipt?.status === "reverted" ? "The transaction failed. Try again." : "");

  async function send(run: (fees: Fees) => void) {
    setLocalError("");
    if (!publicClient) {
      setLocalError("The network is not ready. Try again in a moment.");
      return;
    }
    try {
      const fees = await feeOverrides(publicClient);
      run(fees);
    } catch (err) {
      setLocalError(niceError(err));
    }
  }

  function simple(fn: Fn) {
    send((fees) => {
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
      if (fn === "resolveAfterTimeout") {
        writeContract({
          address: ADDRESSES.elyMarket,
          abi: elyMarketAbi,
          functionName: "resolveAfterTimeout",
          args: [dealId],
          chainId: elysiumTestnet.id,
          ...fees,
        });
      }
    });
  }

  function openDispute() {
    const text = reason.trim();
    if (!text) {
      setLocalError("Say what is wrong, in a few words.");
      return;
    }
    send((fees) =>
      writeContract({
        address: ADDRESSES.elyMarket,
        abi: elyMarketAbi,
        functionName: "openDispute",
        args: [dealId, text],
        chainId: elysiumTestnet.id,
        ...fees,
      })
    );
  }

  function addEvidence() {
    const text = note.trim();
    if (!text) {
      setLocalError("Write a short note or paste a link.");
      return;
    }
    send((fees) =>
      writeContract({
        address: ADDRESSES.elyMarket,
        abi: elyMarketAbi,
        functionName: "addEvidence",
        args: [dealId, text],
        chainId: elysiumTestnet.id,
        ...fees,
      })
    );
  }

  const actions: { fn: Fn; label: string }[] = [];
  if (open && isCustomer) actions.push({ fn: "release", label: "Release the payment" });
  if (status === 1 && isProvider) {
    actions.push({ fn: "markDelivered", label: "Mark as delivered" });
  }
  if (status === 1 && isCustomer && now > Number(deadline)) {
    actions.push({ fn: "refund", label: "Take my money back" });
  }
  if (open && isProvider) actions.push({ fn: "refund", label: "Refund the customer" });
  if (status === 2 && now >= Number(reviewEnds)) {
    actions.push({ fn: "claimAfterReview", label: "Pay out to the provider" });
  }
  if (status === 5 && now >= Number(resolveBy)) {
    actions.push({ fn: "resolveAfterTimeout", label: "Split the money in half" });
  }

  const canDispute = isCustomer && status === 2 && now < Number(reviewEnds);
  const canAddEvidence = status === 5 && (isCustomer || isProvider);
  const ruling = log.find((e) => e.kind === "ruling");

  let help = "Connect the wallet used in this deal to see your options.";
  if (status === 1 && isCustomer) {
    help =
      "Your money is held by the contract. Release it when the job is done. If the provider does not deliver by the deadline, you can take it back.";
  } else if (status === 1 && isProvider) {
    help = "The money is held by the contract. When the job is done, mark it as delivered.";
  } else if (status === 2 && isCustomer) {
    help =
      "The provider says the job is done. Check the work. Release the payment, or open a dispute before the review time ends. If you do nothing, the provider is paid when it ends.";
  } else if (status === 2 && isProvider) {
    help =
      "You marked this as delivered. You get paid when the customer releases, or when the review time ends.";
  } else if (status === 5) {
    help =
      "A dispute is open. Both sides can add evidence. The referee decides how the money is split. If the referee does not decide in time, anyone can split it in half.";
  } else if (status === 6) {
    help = "The referee decided and the money has been sent.";
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
    <>
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
        ) : status === 5 ? (
          <p className="outcome outcome-refunded">
            In dispute. The referee will decide.
          </p>
        ) : status === 6 ? (
          <p className="outcome">
            Resolved.{" "}
            {ruling && ruling.shareBps !== undefined
              ? `The provider received ${ruling.shareBps / 100}% before the fee.`
              : ""}
          </p>
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
          <div className="row">
            <dt>Review time</dt>
            <dd>{formatDuration(Number(reviewSeconds))}</dd>
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
          {status === 5 && (
            <div className="row">
              <dt>Referee should decide by</dt>
              <dd>{formatDate(resolveBy)}</dd>
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

        {(actions.length > 0 || canDispute || canAddEvidence) && errorText && (
          <p className="notice" role="alert" style={{ marginTop: 16 }}>
            {errorText}
          </p>
        )}

        {actions.length > 0 && (
          <div className="pay-actions">
            {actions.map((a, i) => (
              <button
                key={a.label}
                className={
                  i === 0 ? "btn btn-primary btn-block" : "btn btn-secondary btn-block"
                }
                disabled={busy}
                onClick={() => simple(a.fn)}
              >
                {busy
                  ? signing
                    ? "Confirm in your wallet"
                    : "Waiting for confirmation"
                  : a.label}
              </button>
            ))}
          </div>
        )}

        {actions.length === 0 && !canDispute && !canAddEvidence && errorText && (
          <p className="notice" role="alert" style={{ marginTop: 16 }}>
            {errorText}
          </p>
        )}

        <div className="actions">
          <Link className="btn btn-secondary btn-sm" href="/dashboard">
            Back to your dashboard
          </Link>
        </div>
      </div>

      {canDispute && (
        <div className="panel">
          <h2>Something wrong with the work?</h2>
          <p className="panel-note">
            Open a dispute before the review time ends. This pauses the
            automatic payout. A referee will decide how the money is split. Use
            it only if the work was not done properly.
          </p>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="reason">What is wrong</label>
              <textarea
                id="reason"
                className="input"
                maxLength={300}
                placeholder="For example: the car still does not start."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <button
              className="btn btn-secondary"
              disabled={busy}
              onClick={openDispute}
            >
              {busy ? "Working" : "Open a dispute"}
            </button>
          </div>
        </div>
      )}

      {(status === 5 || status === 6 || log.length > 0) && (
        <div className="panel">
          <h2>Dispute record</h2>
          <div className="svc-list">
            {log.map((e, i) => (
              <div className="svc" key={i}>
                <div>
                  <p className="svc-title">
                    {e.kind === "opened"
                      ? "Dispute opened by the customer"
                      : e.kind === "ruling"
                        ? "Ruling by the referee"
                        : e.by && e.by.toLowerCase() === customer.toLowerCase()
                          ? "Evidence from the customer"
                          : "Evidence from the provider"}
                  </p>
                  <p className="svc-price">{e.text}</p>
                  {e.kind === "ruling" && e.shareBps !== undefined && (
                    <p className="svc-price">
                      Provider {e.shareBps / 100}%, customer {100 - e.shareBps / 100}%
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {canAddEvidence && (
            <div className="form-grid">
              <div className="field">
                <label htmlFor="note">Add evidence</label>
                <textarea
                  id="note"
                  className="input"
                  maxLength={300}
                  placeholder="A short note, or a link to a photo or a message."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <button
                className="btn btn-secondary"
                disabled={busy}
                onClick={addEvidence}
              >
                {busy ? "Working" : "Add evidence"}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}