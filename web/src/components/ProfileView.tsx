"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import type { Address } from "viem";
import { elysiumTestnet } from "@/lib/chain";
import { ADDRESSES, elyMarketAbi } from "@/lib/contracts";
import { money, shortAddress } from "@/lib/market";
import HirePanel from "./HirePanel";

export default function ProfileView({ address }: { address: Address }) {
  const { address: me } = useAccount();
  const [hireIndex, setHireIndex] = useState<number | null>(null);

  const profileQuery = useReadContract({
    address: ADDRESSES.elyMarket,
    abi: elyMarketAbi,
    functionName: "profiles",
    args: [address],
    chainId: elysiumTestnet.id,
  });

  const servicesQuery = useReadContract({
    address: ADDRESSES.elyMarket,
    abi: elyMarketAbi,
    functionName: "getServices",
    args: [address],
    chainId: elysiumTestnet.id,
  });

  const jobsQuery = useReadContract({
    address: ADDRESSES.elyMarket,
    abi: elyMarketAbi,
    functionName: "jobsCompleted",
    args: [address],
    chainId: elysiumTestnet.id,
  });

  const earnedQuery = useReadContract({
    address: ADDRESSES.elyMarket,
    abi: elyMarketAbi,
    functionName: "totalEarned",
    args: [address],
    chainId: elysiumTestnet.id,
  });

  if (profileQuery.isLoading) {
    return (
      <div className="panel">
        <h2>Loading profile</h2>
      </div>
    );
  }

  const profile = profileQuery.data;

  if (profileQuery.error || !profile) {
    return (
      <div className="panel">
        <h2>We could not load this profile</h2>
        <p className="panel-note">Check your connection and refresh the page.</p>
      </div>
    );
  }

  if (profile[6] === BigInt(0)) {
    return (
      <div className="panel">
        <h2>No profile here</h2>
        <p className="panel-note">
          The address {shortAddress(address)} has not created a profile.
        </p>
        <div className="actions">
          <Link className="btn btn-secondary" href="/explore">
            Browse the directory
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = !!me && me.toLowerCase() === address.toLowerCase();
  const services = (servicesQuery.data ?? []).filter((s) => s.active);
  const jobs = jobsQuery.data ?? 0;
  const earned = earnedQuery.data ?? BigInt(0);
  const selected = hireIndex !== null ? services[hireIndex] : undefined;

  return (
    <>
      <div className="panel">
        <div className="pv-head">
          <div className="pmeta" style={{ marginBottom: 14 }}>
            <span className="tag tag-mint">{profile[2]}</span>
            {profile[3] && <span className="tag">{profile[3]}</span>}
          </div>
          <h1>{profile[0]}</h1>
          {profile[1] && <p className="headline">{profile[1]}</p>}
        </div>

        {profile[4] && <p className="pv-bio">{profile[4]}</p>}

        <div className="stats">
          <div className="stat">
            <strong>{jobs}</strong>
            <span>{jobs === 1 ? "job completed" : "jobs completed"}</span>
          </div>
          <div className="stat">
            <strong>{money(earned)}</strong>
            <span>USDC earned through Elystation</span>
          </div>
        </div>
        <p className="hint">These numbers come straight from the chain.</p>

        <dl className="inv-rows">
          <div className="row">
            <dt>Wallet</dt>
            <dd>{shortAddress(address)}</dd>
          </div>
          {profile[5] && (
            <div className="row">
              <dt>Contact</dt>
              <dd>{profile[5]}</dd>
            </div>
          )}
        </dl>

        {isOwner && (
          <div className="actions">
            <Link className="btn btn-secondary btn-sm" href="/profile">
              Edit profile and services
            </Link>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Services</h2>
        {services.length === 0 ? (
          <p className="panel-note">No services are listed right now.</p>
        ) : (
          <div className="svc-list">
            {services.map((s, i) => (
              <div className="svc" key={`${s.title}-${i}`}>
                <div>
                  <p className="svc-title">{s.title}</p>
                  <p className="svc-price">{money(s.price)} USDC</p>
                </div>
                {!isOwner && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setHireIndex(hireIndex === i ? null : i)}
                  >
                    {hireIndex === i ? "Close" : "Hire"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {selected && (
          <HirePanel
            key={hireIndex}
            provider={address}
            title={selected.title}
            price={selected.price}
            onClose={() => setHireIndex(null)}
          />
        )}
      </div>
    </>
  );
}