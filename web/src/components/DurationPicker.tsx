"use client";

import { useState } from "react";
import { formatDuration } from "@/lib/market";

type Option = { label: string; seconds: number };

type Props = {
  id: string;
  label: string;
  hint: string;
  options: Option[];
  value: number;
  onChange: (seconds: number) => void;
  min: number;
  max: number;
};

const UNITS = [
  { label: "minutes", seconds: 60 },
  { label: "hours", seconds: 3600 },
  { label: "days", seconds: 86400 },
];

// A list of common times, plus a Custom option where you type your own.
export default function DurationPicker({
  id,
  label,
  hint,
  options,
  value,
  onChange,
  min,
  max,
}: Props) {
  const [custom, setCustom] = useState(false);
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState(3600);
  const [note, setNote] = useState("");

  function apply(nextAmount: string, nextUnit: number) {
    const n = Number(nextAmount);
    if (!nextAmount.trim() || !Number.isFinite(n) || n <= 0) {
      setNote("Enter a number above 0.");
      return;
    }
    const raw = Math.round(n * nextUnit);
    const clamped = Math.min(max, Math.max(min, raw));
    setNote(
      clamped !== raw
        ? `Adjusted to the allowed range: ${formatDuration(min)} to ${formatDuration(max)}.`
        : ""
    );
    onChange(clamped);
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="input select"
        value={custom ? "custom" : String(value)}
        onChange={(e) => {
          if (e.target.value === "custom") {
            setCustom(true);
            apply(amount, unit);
          } else {
            setCustom(false);
            setNote("");
            onChange(Number(e.target.value));
          }
        }}
      >
        {options.map((o) => (
          <option key={o.seconds} value={o.seconds}>
            {o.label}
          </option>
        ))}
        <option value="custom">Custom</option>
      </select>

      {custom && (
        <div className="two" style={{ marginTop: 6 }}>
          <input
            className="input"
            inputMode="decimal"
            aria-label="Amount of time"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              apply(e.target.value, unit);
            }}
          />
          <select
            className="input select"
            aria-label="Unit"
            value={unit}
            onChange={(e) => {
              const u = Number(e.target.value);
              setUnit(u);
              apply(amount, u);
            }}
          >
            {UNITS.map((u) => (
              <option key={u.seconds} value={u.seconds}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {note && <p className="hint">{note}</p>}
      <p className="hint">{hint}</p>
    </div>
  );
}