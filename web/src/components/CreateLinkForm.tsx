"use client";

import { useMemo, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { BaseError, parseEventLogs, parseUnits } from "viem";
import { elysiumTestnet } from "@/lib/chain";
import { ADDRESSES, USDC_DECIMALS, elyPayAbi } from "@/lib/contracts";
import { feeOverrides } from "@/lib/gas";
import Invoice from "./Invoice";

function niceError(err: unknown) {
  if (err instanceof BaseError) return err.shortMessage;
  return "Something went wrong. Try again.";
}

export default function CreateLinkForm() {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: elysiumTestnet.id });

  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [formError, setFormError] = useState("");

  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
    reset,
  } = useWriteContract();

  const {
    data: receipt,
    isLoading: confirming,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });

  const linkId = useMemo(() => {
    if (!receipt) return null;
    const logs = parseEventLogs({
      abi: elyPayAbi,
      eventName: "LinkCreated",
      logs: receipt.logs,
    });
    return logs[0]?.args.id ?? null;
  }, [receipt]);

  const created = linkId !== null;
  const wrongChain = isConnected && chainId !== elysiumTestnet.id;
  const busy = isPending || confirming;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    let units = BigInt(0);
    const clean = amount.trim();

    if (clean !== "") {
      const n = Number(clean);
      if (!Number.isFinite(n) || n <= 0) {
        setFormError("Enter an amount above 0, or leave it empty.");
        return;
      }
      try {
        units = parseUnits(clean, USDC_DECIMALS);
      } catch {
        setFormError("Use up to 6 decimal places.");
        return;
      }
    }

    if (!publicClient) {
      setFormError("The network is not ready. Wait a moment and try again.");
      return;
    }

    try {
      const fees = await feeOverrides(publicClient);
      writeContract({
        address: ADDRESSES.elyPay,
        abi: elyPayAbi,
        functionName: "createLink",
        args: [units, memo.trim()],
        chainId: elysiumTestnet.id,
        ...fees,
      });
    } catch (err) {
      setFormError(niceError(err));
    }
  }

  function startOver() {
    reset();
    setAmount("");
    setMemo("");
    setFormError("");
  }

  const errorText = formError
    ? formError
    : writeError
      ? niceError(writeError)
      : receiptError
        ? niceError(receiptError)
        : "";

  return (
    <div className="bench">
      <form className="form" onSubmit={submit}>
        <div>
          <h2 className="panel-title">Create a payment link</h2>
          <p className="panel-sub">Set an amount, or let the payer choose.</p>
        </div>

        <div className="field">
          <label htmlFor="amount">Amount</label>
          <div className="amount-wrap">
            <input
              id="amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={amount}
              readOnly={created}
              onChange={(e) => setAmount(e.target.value)}
            />
            <span>USDC</span>
          </div>
          <p className="hint">Leave it empty to let the payer pick the amount.</p>
        </div>

        <div className="field">
          <label htmlFor="memo">Description</label>
          <input
            id="memo"
            className="input"
            maxLength={140}
            autoComplete="off"
            placeholder="Invoice 014, logo design"
            value={memo}
            readOnly={created}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>

        {errorText && (
          <p className="notice" role="alert">
            {errorText}
          </p>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={!isConnected || wrongChain || busy || created}
        >
          {created
            ? "Link created"
            : isPending
              ? "Confirm in your wallet"
              : confirming
                ? "Creating link"
                : "Create link"}
        </button>

        {!isConnected && <p className="hint">Connect your wallet to continue.</p>}
        {wrongChain && (
          <p className="hint">Switch your wallet to Elysium Testnet.</p>
        )}
      </form>

      <div className="preview">
        <Invoice
          amount={amount.trim()}
          memo={memo.trim()}
          payTo={address}
          linkId={linkId}
          onReset={startOver}
        />
      </div>
    </div>
  );
}