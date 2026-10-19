"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { BaseError, formatUnits } from "viem";
import { elysiumTestnet } from "@/lib/chain";
import {
  ADDRESSES,
  ELYST_DECIMALS,
  USDC_DECIMALS,
  elystAbi,
} from "@/lib/contracts";
import { feeOverrides } from "@/lib/gas";
import { LINKS, TOKEN } from "@/lib/links";
import { bpsText, useFeeFor } from "@/lib/useDiscount";
import { useStats } from "@/lib/useStats";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

function usd(value: bigint) {
  return Number(formatUnits(value, USDC_DECIMALS)).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function tokens(value: bigint) {
  return Number(formatUnits(value, ELYST_DECIMALS)).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function FeeBenefit() {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: elysiumTestnet.id });
  const queryClient = useQueryClient();
  const fee = useFeeFor(address);
  const [localError, setLocalError] = useState("");

  const deployed = ADDRESSES.elyst !== ZERO;

  const balanceQuery = useReadContract({
    address: ADDRESSES.elyst,
    abi: elystAbi,
    functionName: "balanceOf",
    args: [address ?? ZERO],
    chainId: elysiumTestnet.id,
    query: { enabled: !!address && deployed },
  });

  const {
    writeContract,
    data: hash,
    isPending: signing,
    error: writeError,
  } = useWriteContract();

  const { data: receipt, isLoading: confirming } = useWaitForTransactionReceipt({
    hash,
  });

  const txHash = receipt?.transactionHash;

  useEffect(() => {
    if (receipt) queryClient.invalidateQueries();
    // Run once for each confirmed transaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txHash]);

  const busy = signing || confirming;
  const wrongChain = isConnected && chainId !== elysiumTestnet.id;
  const errorText =
    localError ||
    (writeError instanceof BaseError ? writeError.shortMessage : "");

  async function getTokens() {
    setLocalError("");
    if (!publicClient) {
      setLocalError("The network is not ready. Try again in a moment.");
      return;
    }
    try {
      const fees = await feeOverrides(publicClient);
      writeContract({
        address: ADDRESSES.elyst,
        abi: elystAbi,
        functionName: "faucet",
        chainId: elysiumTestnet.id,
        ...fees,
      });
    } catch (err) {
      setLocalError(
        err instanceof BaseError ? err.shortMessage : "Something went wrong. Try again."
      );
    }
  }

  return (
    <div className="panel">
      <h2>Fee benefit, live on testnet</h2>
      <p className="panel-note">
        Providers who hold enough test ELYST pay a lower fee on services. It
        applies to services, not to payment links. Test ELYST has no value.
      </p>

      {!deployed || !fee.active ? (
        <p className="panel-note">The fee benefit is not turned on yet.</p>
      ) : (
        <>
          <dl className="inv-rows">
            <div className="row">
              <dt>Standard fee</dt>
              <dd>{bpsText(fee.baseBps)}</dd>
            </div>
            <div className="row">
              <dt>Fee for holders</dt>
              <dd>{bpsText(fee.discountBps)}</dd>
            </div>
            <div className="row">
              <dt>Holding needed</dt>
              <dd>{tokens(fee.minBalance)} test ELYST</dd>
            </div>
            {isConnected && (
              <>
                <div className="row">
                  <dt>Your test ELYST</dt>
                  <dd>{tokens(balanceQuery.data ?? BigInt(0))}</dd>
                </div>
                <div className="row">
                  <dt>Your fee as a provider</dt>
                  <dd>{bpsText(fee.effectiveBps)}</dd>
                </div>
              </>
            )}
          </dl>

          {errorText && (
            <p className="notice" role="alert" style={{ marginTop: 14 }}>
              {errorText}
            </p>
          )}

          <div className="actions">
            {!isConnected ? (
              <p className="hint">Connect your wallet to try it.</p>
            ) : wrongChain ? (
              <p className="hint">Switch your wallet to Elysium Testnet.</p>
            ) : (
              <button className="btn btn-primary" disabled={busy} onClick={getTokens}>
                {signing
                  ? "Confirm in your wallet"
                  : confirming
                    ? "Waiting for confirmation"
                    : "Get 1,000 test ELYST"}
              </button>
            )}
          </div>
          <p className="hint">
            Get test ELYST, then check a service profile in the Hire panel. The
            deal page shows the standard fee. Holders pay the lower fee when
            paid out.
          </p>
        </>
      )}
    </div>
  );
}

export default function TokenView() {
  const stats = useStats();

  return (
    <>
      <div className="panel">
        <h2>Token plan (draft)</h2>
        <p className="panel-note">
          The token is not launched. This is the plan we will confirm with
          Ascend.
        </p>
        <dl className="inv-rows">
          <div className="row">
            <dt>Name and ticker</dt>
            <dd>
              {TOKEN.name}, {TOKEN.ticker}
            </dd>
          </div>
          <div className="row">
            <dt>Launch</dt>
            <dd>Through Ascend, in a USDC pool</dd>
          </div>
          <div className="row">
            <dt>Status</dt>
            <dd>Not launched. Waiting for Ascend to confirm the path.</dd>
          </div>
          <div className="row">
            <dt>Supply (draft)</dt>
            <dd>1,000,000,000, fixed. No way to mint more.</dd>
          </div>
          <div className="row">
            <dt>Split (draft)</dt>
            <dd>
              About 80% public launch pool, 10% treasury in a public wallet
              with a time lock, 10% team with a published lock and vesting.
              The final split follows Ascend pool rules.
            </dd>
          </div>
          <div className="row">
            <dt>Job</dt>
            <dd>
              Providers who hold at least a set amount pay a lower fee on
              services. You can try it below with a test token.
            </dd>
          </div>
        </dl>
        <p className="hint">We make no promises about price or returns.</p>
      </div>

      <FeeBenefit />

      <div className="panel">
        <h2>How it fits the Ascend lifecycle</h2>
        <p className="panel-note">
          Ascend launches a token, supports it after launch, and moves it
          toward HyperCore spot and HIP-3 markets. This is what we plan at each
          step.
        </p>
        <ol className="life">
          <li className="life-step">
            <strong>Launch</strong>
            A standard USDC pool. We publish the allocation first, lock the
            team share, and avoid any sniping.
          </li>
          <li className="life-step">
            <strong>Ascended</strong>
            Ascend looks at holders, volume and clean distribution. Lower fees
            give people who use the app a reason to hold the token.
          </li>
          <li className="life-step">
            <strong>HyperCore spot</strong>
            Ascend lets creators set part of their fee share aside for a
            listing. We plan to use that option.
          </li>
          <li className="life-step">
            <strong>HIP-3 perps</strong>
            Later, once there is enough spot liquidity.
          </li>
        </ol>
        <div className="asc-actions">
          <a
            className="btn btn-secondary btn-sm"
            href={LINKS.ascend}
            target="_blank"
            rel="noreferrer"
          >
            About Ascend
          </a>
          <a
            className="btn btn-secondary btn-sm"
            href={LINKS.ascendDocs}
            target="_blank"
            rel="noreferrer"
          >
            Ascend litepaper
          </a>
        </div>
      </div>

      <div className="panel">
        <h2>Live usage on testnet</h2>
        <p className="panel-note">
          Read from the chain. Testnet USDC has no value. These are the kind of
          numbers Ascend looks at.
        </p>
        {stats ? (
          <div className="stats">
            <div className="stat">
              <strong>{stats.wallets}</strong>
              <span>unique wallets</span>
            </div>
            <div className="stat">
              <strong>{usd(stats.volume)}</strong>
              <span>test USDC moved or held</span>
            </div>
            <div className="stat">
              <strong>{stats.payments}</strong>
              <span>link payments</span>
            </div>
            <div className="stat">
              <strong>{stats.deals}</strong>
              <span>service deals</span>
            </div>
            <div className="stat">
              <strong>{stats.links}</strong>
              <span>payment links created</span>
            </div>
            <div className="stat">
              <strong>{stats.profiles}</strong>
              <span>service profiles</span>
            </div>
          </div>
        ) : (
          <p className="panel-note">Loading</p>
        )}
      </div>

      <div className="panel">
        <h2>Not built yet</h2>
        <p className="panel-note">
          Using part of the fees to support the token needs the Ascend pool
          interface, so it is not built. The real token needs Elysium mainnet
          and the Ascend launch. We will not claim either until they work.
        </p>
      </div>
    </>
  );
}