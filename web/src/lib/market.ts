import { formatUnits } from "viem";
import { USDC_DECIMALS } from "./contracts";

export const CATEGORIES = [
  "Auto repair",
  "Home repair",
  "Design",
  "Writing",
  "Tutoring",
  "Development",
  "Photography",
  "Translation",
  "Cleaning",
  "Other",
];

export const DEADLINE_OPTIONS = [
  { label: "1 day", days: 1 },
  { label: "3 days", days: 3 },
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
];

// Index matches the status number in the contract.
export const STATUS_TEXT = ["Not found", "Funded", "Delivered", "Paid out", "Refunded"];

export function money(value: bigint) {
  const n = Number(formatUnits(value, USDC_DECIMALS));
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatDate(seconds: bigint | number) {
  return new Date(Number(seconds) * 1000).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDuration(seconds: number) {
  if (seconds < 3600) {
    const m = Math.max(1, Math.round(seconds / 60));
    return `${m} ${m === 1 ? "minute" : "minutes"}`;
  }
  if (seconds < 86400) {
    const h = Math.round(seconds / 3600);
    return `${h} ${h === 1 ? "hour" : "hours"}`;
  }
  const d = Math.round(seconds / 86400);
  return `${d} ${d === 1 ? "day" : "days"}`;
}