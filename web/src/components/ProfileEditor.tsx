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
import { BaseError, parseUnits } from "viem";
import { elysiumTestnet } from "@/lib/chain";
import { ADDRESSES, USDC_DECIMALS, elyMarketAbi } from "@/lib/contracts";
import { feeOverrides } from "@/lib/gas";
import { CATEGORIES, money } from "@/lib/market";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

type Fees = Awaited<ReturnType<typeof feeOverrides>>;

type Form = {
  name: string;
  headline: string;
  category: string;
  city: string;
  bio: string;
  contact: string;
};

const empty: Form = {
  name: "",
  headline: "",
  category: CATEGORIES[0],
  city: "",
  bio: "",
  contact: "",
};

function niceError(err: unknown) {
  if (err instanceof BaseError) return err.shortMessage;
  return "Something went wrong. Try again.";
}

export default function ProfileEditor() {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: elysiumTestnet.id });

  const [form, setForm] = useState<Form>(empty);
  const [svcTitle, setSvcTitle] = useState("");
  const [svcPrice, setSvcPrice] = useState("");
  const [localError, setLocalError] = useState("");

  const profileQuery = useReadContract({
    address: ADDRESSES.elyMarket,
    abi: elyMarketAbi,
    functionName: "profiles",
    args: [address ?? ZERO],
    chainId: elysiumTestnet.id,
    query: { enabled: !!address },
  });

  const servicesQuery = useReadContract({
    address: ADDRESSES.elyMarket,
    abi: elyMarketAbi,
    functionName: "getServices",
    args: [address ?? ZERO],
    chainId: elysiumTestnet.id,
    query: { enabled: !!address },
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

  const stored = profileQuery.data;
  const hasProfile = !!stored && stored[6] > BigInt(0);
  const updatedAt = stored ? stored[6] : undefined;
  const services = servicesQuery.data ?? [];

  useEffect(() => {
    if (stored && stored[6] > BigInt(0)) {
      setForm({
        name: stored[0],
        headline: stored[1],
        category: stored[2],
        city: stored[3],
        bio: stored[4],
        contact: stored[5],
      });
    }
    // Fill the form when the saved profile loads or changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updatedAt]);

  const txHash = receipt?.transactionHash;

  useEffect(() => {
    if (!receipt) return;
    profileQuery.refetch();
    servicesQuery.refetch();
    setSvcTitle("");
    setSvcPrice("");
    // Run once for each confirmed transaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txHash]);

  const busy = signing || confirming;
  const wrongChain = isConnected && chainId !== elysiumTestnet.id;
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

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setLocalError("Add your name.");
      return;
    }
    send((fees) =>
      writeContract({
        address: ADDRESSES.elyMarket,
        abi: elyMarketAbi,
        functionName: "setProfile",
        args: [
          {
            name,
            headline: form.headline.trim(),
            category: form.category,
            city: form.city.trim(),
            bio: form.bio.trim(),
            contact: form.contact.trim(),
          },
        ],
        chainId: elysiumTestnet.id,
        ...fees,
      })
    );
  }

  function addService(e: React.FormEvent) {
    e.preventDefault();
    const title = svcTitle.trim();
    if (!title) {
      setLocalError("Add a title for the service.");
      return;
    }
    let price = BigInt(0);
    try {
      price = parseUnits(svcPrice.trim() || "0", USDC_DECIMALS);
    } catch {
      setLocalError("Use up to 6 decimal places in the price.");
      return;
    }
    if (price <= BigInt(0)) {
      setLocalError("Enter a price above 0.");
      return;
    }
    send((fees) =>
      writeContract({
        address: ADDRESSES.elyMarket,
        abi: elyMarketAbi,
        functionName: "addService",
        args: [title, price],
        chainId: elysiumTestnet.id,
        ...fees,
      })
    );
  }

  function toggleService(index: number, active: boolean) {
    send((fees) =>
      writeContract({
        address: ADDRESSES.elyMarket,
        abi: elyMarketAbi,
        functionName: "setServiceActive",
        args: [BigInt(index), !active],
        chainId: elysiumTestnet.id,
        ...fees,
      })
    );
  }

  if (!isConnected) {
    return (
      <div className="panel">
        <h2>Connect your wallet</h2>
        <p className="panel-note">
          Use the Connect wallet button at the top to create or edit your
          profile.
        </p>
      </div>
    );
  }

  if (wrongChain) {
    return (
      <div className="panel">
        <h2>Switch network</h2>
        <p className="panel-note">
          Use the button at the top to switch your wallet to Elysium Testnet.
        </p>
      </div>
    );
  }

  return (
    <>
      <form className="panel" onSubmit={saveProfile}>
        <h2>{hasProfile ? "Edit your profile" : "Create your profile"}</h2>
        <p className="panel-note">
          Everything here is public on the chain and cannot be fully erased. Do
          not enter a phone number or a home address.
        </p>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              className="input"
              maxLength={60}
              autoComplete="off"
              placeholder="Sam Rivera"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="headline">Headline</label>
            <input
              id="headline"
              className="input"
              maxLength={100}
              autoComplete="off"
              placeholder="Mobile mechanic, roadside and home visits"
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
            />
          </div>

          <div className="two">
            <div className="field">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                className="input select"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="city">City and country</label>
              <input
                id="city"
                className="input"
                maxLength={60}
                autoComplete="off"
                placeholder="Lisbon, Portugal"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="bio">About you</label>
            <textarea
              id="bio"
              className="input"
              maxLength={400}
              placeholder="What you do, how long you have done it, and how you work."
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="contact">Contact (optional, public)</label>
            <input
              id="contact"
              className="input"
              maxLength={80}
              autoComplete="off"
              placeholder="Telegram handle or work email"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
            />
          </div>
        </div>

        <div className="pay-actions">
          {errorText && (
            <p className="notice" role="alert">
              {errorText}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {signing
              ? "Confirm in your wallet"
              : confirming
                ? "Saving"
                : hasProfile
                  ? "Save changes"
                  : "Save profile"}
          </button>
          {hasProfile && address && (
            <Link className="btn btn-secondary btn-block" href={`/u/${address}`}>
              View your public profile
            </Link>
          )}
        </div>
      </form>

      {hasProfile && (
        <section className="panel">
          <h2>Your services</h2>
          <p className="panel-note">
            Add up to 8 services with a fixed price in USDC. Customers pick one
            and pay into the contract.
          </p>

          {services.length > 0 && (
            <div className="svc-list">
              {services.map((s, i) => (
                <div className="svc" key={`${s.title}-${i}`}>
                  <div>
                    <p className="svc-title">{s.title}</p>
                    <p className="svc-price">{money(s.price)} USDC</p>
                  </div>
                  <div className="svc-actions">
                    <span className={s.active ? "tag tag-mint" : "tag"}>
                      {s.active ? "Listed" : "Hidden"}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={busy}
                      onClick={() => toggleService(i, s.active)}
                    >
                      {s.active ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {services.length < 8 && (
            <form onSubmit={addService} className="form-grid">
              <div className="two">
                <div className="field">
                  <label htmlFor="svc-title">Service</label>
                  <input
                    id="svc-title"
                    className="input"
                    maxLength={80}
                    autoComplete="off"
                    placeholder="Roadside repair"
                    value={svcTitle}
                    onChange={(e) => setSvcTitle(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="svc-price">Price</label>
                  <div className="amount-wrap">
                    <input
                      id="svc-price"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="80.00"
                      value={svcPrice}
                      onChange={(e) => setSvcPrice(e.target.value)}
                    />
                    <span>USDC</span>
                  </div>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "Working" : "Add service"}
              </button>
            </form>
          )}
        </section>
      )}
    </>
  );
}