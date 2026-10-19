"use client";

import { CURRENCIES, useCurrency } from "@/lib/useRates";

export default function CurrencyPicker() {
  const { code, choose } = useCurrency();

  return (
    <label className="currency-pick">
      <span>Show prices in</span>
      <select value={code} onChange={(e) => choose(e.target.value)} aria-label="Currency">
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code}, {c.label}
          </option>
        ))}
      </select>
    </label>
  );
}