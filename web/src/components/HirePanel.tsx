"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAccount,
  useConnect,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { BaseError, parseEventLogs } from "viem";
import type { Address } from "viem";
import { elysiumTestnet } from "@/lib/chain";
import { ADDRESSES, elyMarketAbi, usdcAbi } from "@/lib/contracts";
import { feeOverrides } from "@/lib/gas";
import { DEADLINE_OPTIONS, formatDuration, money } from "@/lib/market";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

type Action = "faucet" | "approve" | "create";

type Props = {
  provider: Address;
  title: string;
  price: bigint;
  onClose: () => void;
};

function niceError(err: unknown) {
  if (err instanceof BaseError) return err.shortMessage;
  return "Something went wrong. Try again.";
}

export default function HirePanel({ provider, title, price, onClose }: Props) {
  const router = useRouter();
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: elysiumTestnet.id });

  const [days, setDays] = useState(7);
  const [lastAction, setLastAction] = useState<Action | null>(null);
  const [localError, setLocalError] = useState("");

  const balanceQuery = useReadContract({
    address: ADDRESSES.usdc,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: [address ?? ZERO],
    chainId: elysiumTestnet.id,
    query: { enabled: !!address },
  });

  const allowanceQuery = useReadContract({
    address: ADDRESSES.usdc,
    abi: usdcAbi,
    functionName: "allowance",
    args: [address ?? ZERO, ADDRESSES.elyMarket],
    chainId: elysiumTestnet.id,
    query: { enabled: !!address },
  });

  const feeQuery = useReadContract({
    address: ADDRESSES.elyMarket,
    abi: elyMarketAbi,
    functionName: "feeBps",
    chainId: elysiumTestnet.id,
  });

  const windowQuery = useReadContract({
    address: ADDRESSES.elyMarket,
    abi: elyMarketAbi,
    functionName: "reviewWindow",
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
    if (!receipt) return;
    if (lastAction === "faucet") balanceQuery.refetch();
    if (lastAction === "approve") allowanceQuery.refetch();
    if (lastAction === "create") {
      const logs = parseEventLogs({
        abi: elyMarketAbi,
        eventName: "DealCreated",
        logs: receipt.logs,
      });
      const id = logs[0]?.args.id;
      if (id !== undefined) router.push(`/deal/${id.toString()}`);
    }
    // Run once for each confirmed transaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txHash]);

  const balance = balanceQuery.data ?? BigInt(0);
  const allowance = allowanceQuery.data ?? BigInt(0);
  const wrongChain = isConnected && chainId !== elysiumTestnet.id;
  const busy = signing || confirming;
  const busyLabel = signing ? "Confirm in your wallet" : "Waiting for confirmation";
  const feeText =
    feeQuery.data !== undefined ? `${Number(feeQuery.data) / 100}%` : "-";
  const windowText =
    windowQuery.data !== undefined
      ? formatDuration(Number(windowQuery.data))
      : "-";

  const errorText =
    localError ||
    (writeError ? niceError(writeError) : "") ||
    (receiptError ? niceError(receiptError) : "") ||
    (receipt?.status === "reverted" ? "The transaction failed. Try again." : "");

  async function send(next: Action) {
    setLocalError("");
    if (!publicClient) {
      setLocalError("The network is not ready. Try again in a moment.");
      return;
    }
    setLastAction(next);
    try {
      const fees = await feeOverrides(publicClient);
      if (next === "faucet") {
        writeContract({
          address: ADDRESSES.usdc,
          abi: usdcAbi,
          functionName: "faucet",
          chainId: elysiumTestnet.id,
          ...fees,
        });
      }
      if (next === "approve") {
        writeContract({
          address: ADDRESSES.usdc,
          abi: usdcAbi,
          functionName: "approve",
          args: [ADDRESSES.elyMarket, price],
          chainId: elysiumTestnet.id,
          ...fees,
        });
      }
      if (next === "create") {
        const block = await publicClient.getBlock();
        const deadline = block.timestamp + BigInt(days * 86400);
        writeContract({
          address: ADDRESSES.elyMarket,
          abi: elyMarketAbi,
          functionName: "createDeal",
          args: [provider, price, title, deadline],
          chainId: elysiumTestnet.id,
          ...fees,
        });
      }
    } catch (err) {
      setLocalError(niceError(err));
    }
  }

  let main: React.ReactNode;

  if (!isConnected) {
    main = (
      <button
        className="btn btn-primary btn-block"
        disabled={connecting}
        onClick={() => connect({ connector: connectors[0] })}
      >
        {connecting ? "Check your wallet" : "Connect wallet to hire"}
      </button>
    );
  } else if (wrongChain) {
    main = (
      <button
        className="btn btn-primary btn-block"
        disabled={switching}
        onClick={() => switchChain({ chainId: elysiumTestnet.id })}
      >
        Switch to Elysium
      </button>
    );
  } else if (balance < price) {
    main = (
      <>
        <p className="notice">
          Your balance is {money(balance)} USDC. This job needs {money(price)}{" "}
          USDC.
        </p>
        <button
          className="btn btn-primary btn-block"
          disabled={busy}
          onClick={() => send("faucet")}
        >
          {busy ? busyLabel : "Get 1,000 test USDC"}
        </button>
        <p className="hint">
          Test USDC is free on this testnet. You also need a little HYPE for
          network fees.
        </p>
      </>
    );
  } else if (allowance < price) {
    main = (
      <>
        <button
          className="btn btn-primary btn-block"
          disabled={busy}
          onClick={() => send("approve")}
        >
          {busy ? busyLabel : `Approve ${money(price)} USDC`}
        </button>
        <p className="hint">
          First, approve USDC for this job. Then you can pay into the contract.
        </p>
      </>
    );
  } else {
    main = (
      <>
        <button
          className="btn btn-primary btn-block"
          disabled={busy}
          onClick={() => send("create")}
        >
          {busy ? busyLabel : `Pay ${money(price)} USDC and hold it`}
        </button>
        <p className="hint">
          The money waits in the contract. It is not sent to the provider yet.
        </p>
      </>
    );
  }

  return (
    <div className="hire">
      <div className="hire-head">
        <h3>Hire for {money(price)} USDC</h3>
        <button className="link-button" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="hint">{title}</p>

      <div className="field">
        <label htmlFor="days">Deadline for the provider to deliver</label>
        <select
          id="days"
          className="input select"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          {DEADLINE_OPTIONS.map((o) => (
            <option key={o.days} value={o.days}>
              {o.label}
            </option>
          ))}
        </select>
        <p className="hint">
          If the job is not delivered by then, you can take your money back.
        </p>
      </div>

      <dl className="inv-rows">
        <div className="row">
          <dt>Held by the contract</dt>
          <dd>{money(price)} USDC</dd>
        </div>
        <div className="row">
          <dt>Fee when paid out</dt>
          <dd>{feeText}</dd>
        </div>
        <div className="row">
          <dt>Review time after delivery</dt>
          <dd>{windowText}</dd>
        </div>
      </dl>

      <div className="pay-actions">
        {errorText && (
          <p className="notice" role="alert">
            {errorText}
          </p>
        )}
        {main}
      </div>
    </div>
  );
}