"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "viem";

const KEY = "ely-currency";

export const CURRENCIES = [
  { code: "USD", label: "US dollar" },
  { code: "NGN", label: "Nigerian naira" },
  { code: "GHS", label: "Ghanaian cedi" },
  { code: "KES", label: "Kenyan shilling" },
  { code: "ZAR", label: "South African rand" },
  { code: "EGP", label: "Egyptian pound" },
  { code: "GBP", label: "British pound" },
  { code: "EUR", label: "Euro" },
  { code: "CAD", label: "Canadian dollar" },
  { code: "AUD", label: "Australian dollar" },
  { code: "INR", label: "Indian rupee" },
  { code: "BRL", label: "Brazilian real" },
  { code: "MXN", label: "Mexican peso" },
  { code: "PHP", label: "Philippine peso" },
  { code: "IDR", label: "Indonesian rupiah" },
  { code: "TRY", label: "Turkish lira" },
  { code: "AED", label: "UAE dirham" },
];

let cache: { rates: Record<string, number> | null; at: number } = {
  rates: null,
  at: 0,
};

// The chosen currency is saved in this browser. Rates come from /api/rates.
export function useCurrency() {
  const [code, setCode] = useState("USD");
  const [rates, setRates] = useState<Record<string, number> | null>(cache.rates);

  useEffect(() => {
    const read = () => {
      const saved = localStorage.getItem(KEY);
      if (saved) setCode(saved);
    };
    read();
    window.addEventListener("ely-currency", read);
    return () => window.removeEventListener("ely-currency", read);
  }, []);

  useEffect(() => {
    if (cache.rates && Date.now() - cache.at < 3600_000) {
      setRates(cache.rates);
      return;
    }
    fetch("/api/rates")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && j.rates) {
          cache = { rates: j.rates, at: Date.now() };
          setRates(j.rates);
        }
      })
      .catch(() => {});
  }, []);

  function choose(next: string) {
    localStorage.setItem(KEY, next);
    setCode(next);
    window.dispatchEvent(new Event("ely-currency"));
  }

  return { code, rates, choose };
}

// USDC is treated as one dollar. This is an estimate, not a quote.
export function toLocal(
  usdc: bigint,
  code: string,
  rates: Record<string, number> | null
): string | null {
  if (!rates || code === "USD") return null;
  const rate = rates[code];
  if (!rate) return null;
  const value = Number(formatUnits(usdc, 6)) * rate;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: value >= 100 ? 0 : 2,
    }).format(value);
  } catch {
    return null;
  }
}