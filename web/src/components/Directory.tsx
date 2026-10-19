"use client";

import Link from "next/link";
import { useState } from "react";
import { CATEGORIES, money, shortAddress } from "@/lib/market";
import { useProfiles } from "@/lib/useProfiles";
import Avatar from "./Avatar";

export default function Directory() {
  const { profiles, error, retry } = useProfiles();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  if (!profiles && error) {
    return (
      <div className="empty">
        <p>We could not load the directory.</p>
        <p className="hint">{error}</p>
        <button className="btn btn-secondary" onClick={retry}>
          Try again
        </button>
      </div>
    );
  }

  if (!profiles) {
    return <div className="empty">Loading profiles</div>;
  }

  if (profiles.length === 0) {
    return (
      <div className="empty">
        <p>No one has listed a service yet. Be the first.</p>
        <Link className="btn btn-primary" href="/profile">
          Offer a service
        </Link>
      </div>
    );
  }

  const q = query.trim().toLowerCase().replace(/^@/, "");
  const shown = profiles.filter((p) => {
    const inCategory = category === "All" || p.category === category;
    const text =
      `${p.name} ${p.handle} ${p.headline} ${p.city} ${p.category} ${p.address}`.toLowerCase();
    return inCategory && (!q || text.includes(q));
  });

  return (
    <>
      <div className="filters">
        <input
          className="input search"
          placeholder="Search by name, @handle, skill or city"
          aria-label="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="input select"
          aria-label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="All">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {shown.length === 0 ? (
        <div className="empty">No matches. Try another word or category.</div>
      ) : (
        <div className="dir-grid">
          {shown.map((p) => (
            <Link key={p.address} href={`/u/${p.address}`} className="pcard">
              <div className="pcard-top">
                <Avatar address={p.address} name={p.name} />
                <div>
                  <h3>{p.name}</h3>
                  <span className="addr" title={p.address}>
                    {p.handle ? `@${p.handle}` : shortAddress(p.address)}
                  </span>
                </div>
              </div>
              <p className="headline">{p.headline || "No headline yet"}</p>
              <div className="pmeta">
                <span className="tag tag-mint">{p.category}</span>
                {p.city && <span className="tag">{p.city}</span>}
              </div>
              <div className="pfoot">
                <span>
                  {p.fromPrice !== null ? (
                    <>
                      From <strong>{money(p.fromPrice)} USDC</strong>
                    </>
                  ) : (
                    "No services listed"
                  )}
                </span>
                <span>
                  {p.jobs} {p.jobs === 1 ? "job" : "jobs"} done
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}