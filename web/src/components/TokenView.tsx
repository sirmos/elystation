"use client";

import { formatUnits } from "viem";
import { USDC_DECIMALS } from "@/lib/contracts";
import { LINKS, TOKEN } from "@/lib/links";
import { useStats } from "@/lib/useStats";

function usd(value: bigint) {
  return Number(formatUnits(value, USDC_DECIMALS)).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
              services. This is built into the services contract and tested
              with a test token.
            </dd>
          </div>
        </dl>
        <p className="hint">We make no promises about price or returns.</p>
      </div>

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
          interface, so it is not built. Token benefits on mainnet need
          Elysium mainnet. We will not claim either until they work.
        </p>
      </div>
    </>
  );
}