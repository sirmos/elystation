"use client";

import Link from "next/link";
import { useState } from "react";
import { CATEGORIES, money } from "@/lib/market";
import { useProfiles } from "@/lib/useProfiles";

export default function Directory() {
  const { profiles, error } = useProfiles();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  if (error) {
    return (
      <div className="empty">
        We could not load the directory. Refresh the page to try again.
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

  const q = query.trim().toLowerCase();
  const shown = profiles.filter((p) => {
    const inCategory = category === "All" || p.category === category;
    const text = `${p.name} ${p.headline} ${p.city} ${p.category}`.toLowerCase();
    return inCategory && (!q || text.includes(q));
  });

  return (
    <>
      <div className="filters">
        <input
          className="input search"
          placeholder="Search by name, skill or city"
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
              <h3>{p.name}</h3>
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