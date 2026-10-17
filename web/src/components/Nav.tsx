"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { dealHint, useMyDeals } from "@/lib/useMyDeals";

const items = [
  { href: "/#create", label: "Create a link" },
  { href: "/explore", label: "Explore" },
  { href: "/profile", label: "Offer a service" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/#how", label: "How it works" },
  { href: "/#roadmap", label: "Roadmap" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const { address } = useAccount();
  const { deals } = useMyDeals(address);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 15000);
    return () => clearInterval(timer);
  }, []);

  const urgent = deals ? deals.filter((d) => dealHint(d, now).urgent).length : 0;

  return (
    <>
      <nav className="nav-desktop" aria-label="Main">
        {items.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
            {item.href === "/dashboard" && urgent > 0 && (
              <span className="nav-badge" aria-label={`${urgent} need action`}>
                {urgent}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <button
        className="nav-toggle"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      {open && (
        <div className="nav-sheet">
          {items.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
              {item.href === "/dashboard" && urgent > 0 && (
                <span className="nav-badge">{urgent}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}