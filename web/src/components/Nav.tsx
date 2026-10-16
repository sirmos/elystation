"use client";

import Link from "next/link";
import { useState } from "react";

const items = [
  { href: "/#create", label: "Create a link" },
  { href: "/#how", label: "How it works" },
  { href: "/#roadmap", label: "Roadmap" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="nav-desktop" aria-label="Main">
        {items.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
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
            </Link>
          ))}
        </div>
      )}
    </>
  );
}