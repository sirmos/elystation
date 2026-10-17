"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { dealHint, useMyDeals } from "@/lib/useMyDeals";
import type { MyDeal } from "@/lib/useMyDeals";
import { useMyLinks } from "@/lib/useMyLinks";
import { STATUS_TEXT, money, shortAddress } from "@/lib/market";

function DealRows({
  list,
  now,
  emptyText,
}: {
  list: MyDeal[];
  now: number;
  emptyText: string;
}) {
  if (list.length === 0) {
    return <p className="panel-note">{emptyText}</p>;
  }

  return (
    <div className="svc-list">
      {list.map((d) => {
        const hint = dealHint(d, now);
        const other = d.role === "provider" ? d.customer : d.provider;
        return (
          <Link
            key={d.id.toString()}
            href={`/deal/${d.id.toString()}`}
            className="deal-row"
          >
            <div>
              <p className="deal-name">{d.title || "Service"}</p>
              <p className="deal-meta">
                {money(d.amount)} USDC, {d.role === "provider" ? "from" : "with"}{" "}
                {shortAddress(other)}
              </p>
              <p className="deal-hint">{hint.text}</p>
            </div>
            <div className="deal-side">
              {hint.urgent && <span className="tag tag-mint">Action needed</span>}
              <span className="tag">{STATUS_TEXT[d.status]}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { deals, error } = useMyDeals(address);
  const { links } = useMyLinks(address);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 15000);
    return () => clearInterval(timer);
  }, []);

  if (!isConnected) {
    return (
      <div className="panel">
        <h2>Connect your wallet</h2>
        <p className="panel-note">
          Your wallet is your login. Connect it to see your jobs, your orders and
          your payment links.
        </p>
      </div>
    );
  }

  const asProvider = deals ? deals.filter((d) => d.role === "provider") : [];
  const asCustomer = deals ? deals.filter((d) => d.role === "customer") : [];
  const urgent = deals ? deals.filter((d) => dealHint(d, now).urgent).length : 0;
  const open = deals
    ? deals.filter((d) => d.status === 1 || d.status === 2).length
    : 0;

  return (
    <>
      {urgent > 0 && (
        <div className="callout">
          <span>
            {urgent} {urgent === 1 ? "item needs" : "items need"} your action.
          </span>
        </div>
      )}

      <div className="panel">
        <h2>Overview</h2>
        <div className="stats">
          <div className="stat">
            <strong>{urgent}</strong>
            <span>need your action</span>
          </div>
          <div className="stat">
            <strong>{open}</strong>
            <span>open deals</span>
          </div>
        </div>
        <p className="hint">
          Everything here is read from the chain by your wallet address, so it
          follows your wallet on any device.
        </p>
      </div>

      <div className="panel">
        <h2>Jobs for you</h2>
        <p className="panel-note">People who hired you.</p>
        {error && !deals ? (
          <p className="panel-note">We could not load your jobs. Refresh to try again.</p>
        ) : !deals ? (
          <p className="panel-note">Loading</p>
        ) : (
          <DealRows
            list={asProvider}
            now={now}
            emptyText="No one has hired you yet. Share your profile link to get started."
          />
        )}
        <div className="actions">
          <Link className="btn btn-secondary btn-sm" href="/profile">
            Edit profile and services
          </Link>
        </div>
      </div>

      <div className="panel">
        <h2>Your orders</h2>
        <p className="panel-note">People you hired.</p>
        {!deals ? (
          <p className="panel-note">Loading</p>
        ) : (
          <DealRows
            list={asCustomer}
            now={now}
            emptyText="You have not hired anyone yet."
          />
        )}
        <div className="actions">
          <Link className="btn btn-secondary btn-sm" href="/explore">
            Find someone to hire
          </Link>
        </div>
      </div>

      <div className="panel">
        <h2>Your payment links</h2>
        <p className="panel-note">Links you created to get paid.</p>
        {!links ? (
          <p className="panel-note">Loading</p>
        ) : links.length === 0 ? (
          <p className="panel-note">You have not created a payment link yet.</p>
        ) : (
          <div className="svc-list">
            {links.map((l) => (
              <Link
                key={l.id.toString()}
                href={`/pay/${l.id.toString()}`}
                className="deal-row"
              >
                <div>
                  <p className="deal-name">{l.memo || "No description"}</p>
                  <p className="deal-meta">
                    {l.amount > BigInt(0)
                      ? `${money(l.amount)} USDC`
                      : "Payer chooses the amount"}
                  </p>
                </div>
                <div className="deal-side">
                  <span className="tag tag-mint">
                    {l.payments} {l.payments === 1 ? "payment" : "payments"}
                  </span>
                  <span className="deal-meta">{money(l.received)} USDC received</span>
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="actions">
          <Link className="btn btn-secondary btn-sm" href="/#create">
            Create a link
          </Link>
        </div>
      </div>
    </>
  );
}