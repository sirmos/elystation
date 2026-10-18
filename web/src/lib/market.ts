import { formatUnits, keccak256, toBytes } from "viem";
import { USDC_DECIMALS } from "./contracts";

export const CATEGORIES = [
  "Auto repair",
  "Home repair",
  "Design",
  "Writing",
  "Tutoring",
  "Development",
  "Smart contracts and security",
  "Community and moderation",
  "Marketing",
  "Photography",
  "Translation",
  "Cleaning",
  "Other",
];

// How long the provider has to deliver.
export const DEADLINE_OPTIONS = [
  { label: "30 minutes", seconds: 1800 },
  { label: "1 hour", seconds: 3600 },
  { label: "3 hours", seconds: 10800 },
  { label: "6 hours", seconds: 21600 },
  { label: "12 hours", seconds: 43200 },
  { label: "1 day", seconds: 86400 },
  { label: "3 days", seconds: 259200 },
  { label: "7 days", seconds: 604800 },
  { label: "14 days", seconds: 1209600 },
  { label: "30 days", seconds: 2592000 },
];

// How long the customer has to check the work after delivery.
export const REVIEW_CHOICES = [
  { label: "10 minutes", seconds: 600 },
  { label: "30 minutes", seconds: 1800 },
  { label: "1 hour", seconds: 3600 },
  { label: "6 hours", seconds: 21600 },
  { label: "1 day", seconds: 86400 },
  { label: "3 days", seconds: 259200 },
  { label: "7 days", seconds: 604800 },
];

// Index matches the status number in the contract.
export const STATUS_TEXT = [
  "Not found",
  "Funded",
  "Delivered",
  "Paid out",
  "Refunded",
  "In dispute",
  "Resolved",
];

export const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;

export function handleKey(handle: string) {
  return keccak256(toBytes(handle));
}

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