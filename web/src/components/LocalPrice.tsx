"use client";

import { toLocal, useCurrency } from "@/lib/useRates";

// Shows "(about N)" next to a USDC amount, in the currency picked in the footer.
export default function LocalPrice({ value }: { value: bigint }) {
  const { code, rates } = useCurrency();
  const text = toLocal(value, code, rates);
  if (!text) return null;

  return (
    <span style={{ color: "var(--muted)", fontSize: "0.875em" }}> (about {text})</span>
  );
}