/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatUnits, isAddress, parseAbi } from "viem";
import { adminClient, chainClient } from "@/lib/server";
import { ADDRESSES, elyPayAbi, usdcAbi } from "@/lib/contracts";
import {
  getState,
  linkWallet,
  linksFor,
  markSent,
  myWallets,
  setState,
  unlinkAll,
  wasSent,
} from "./store";

const SITE = (process.env.SITE_URL || "https://elystation.vercel.app").replace(/\/$/, "");
const MARKET = ADDRESSES.elyMarket;

const marketAbi = parseAbi([
  "function deals(uint256) view returns (address customer, address provider, uint256 amount, uint64 deadline, uint64 reviewSeconds, uint64 reviewEnds, uint64 resolveBy, uint8 status, string title)",
  "function nextDealId() view returns (uint256)",
  "function referee() view returns (address)",
  "event DealCreated(uint256 indexed id, address indexed customer, address indexed provider, uint256 amount, uint64 deadline, string title)",
  "event DealDelivered(uint256 indexed id, uint64 reviewEnds)",
  "event DealReleased(uint256 indexed id, address indexed provider, uint256 net, uint256 fee)",
  "event DealRefunded(uint256 indexed id, address indexed customer, uint256 amount)",
  "event DisputeOpened(uint256 indexed id, address indexed customer, string reason)",
  "event EvidenceAdded(uint256 indexed id, address indexed by, string note)",
  "event DisputeResolved(uint256 indexed id, uint16 providerShareBps, uint256 providerNet, uint256 customerAmount, string ruling)",
]);

export type Send = (platform: string, id: string, text: string) => Promise<void>;

const STATUS = [
  "Not found",
  "Funded",
  "Delivered",
  "Paid out",
  "Refunded",
  "In dispute",
  "Resolved",
];

function short(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function usd(value: bigint) {
  return Number(formatUnits(value, 6)).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

function when(seconds: bigint | number) {
  return new Date(Number(seconds) * 1000).toUTCString();
}

async function getDeal(id: number | bigint) {
  const d = await chainClient.readContract({
    address: MARKET,
    abi: marketAbi,
    functionName: "deals",
    args: [BigInt(id)],
  });
  return {
    id: BigInt(id),
    customer: d[0] as string,
    provider: d[1] as string,
    amount: d[2],
    deadline: d[3],
    reviewEnds: d[5],
    resolveBy: d[6],
    status: Number(d[7]),
    title: d[8],
  };
}

async function nextDealId() {
  return Number(
    await chainClient.readContract({
      address: MARKET,
      abi: marketAbi,
      functionName: "nextDealId",
    })
  );
}

async function jobsFor(address: string) {
  const next = await nextDealId();
  const ids: number[] = [];
  for (let i = 1; i < next; i++) ids.push(i);
  const all = await Promise.all(ids.map((i) => getDeal(i)));
  const me = address.toLowerCase();
  return all
    .filter((d) => d.customer.toLowerCase() === me || d.provider.toLowerCase() === me)
    .reverse();
}

// Payment links come from our own index, not from a search of the whole chain.
async function payLinksFor(address: string) {
  const db = adminClient();
  if (!db) return [];

  const { data } = await db
    .from("chain_events")
    .select("args")
    .eq("contract", "pay")
    .eq("event", "LinkCreated")
    .contains("args", { owner: address.toLowerCase() })
    .order("block_number", { ascending: false })
    .limit(8);

  const out: any[] = [];
  for (const row of data ?? []) {
    const id = BigInt(row.args.id);
    const r = await chainClient.readContract({
      address: ADDRESSES.elyPay,
      abi: elyPayAbi,
      functionName: "links",
      args: [id],
    });
    out.push({ id, amount: r[1], payments: r[3], received: r[4], memo: r[5] });
  }
  return out;
}

function dealLine(d: Awaited<ReturnType<typeof getDeal>>, me: string) {
  const role = d.provider.toLowerCase() === me.toLowerCase() ? "provider" : "customer";
  return `#${d.id} ${d.title || "Service"}, ${usd(d.amount)} USDC, ${STATUS[d.status]} (you are the ${role})\n${SITE}/deal/${d.id}`;
}

export const HELP = `Elystation alerts (testnet)

/link 0xYourWallet  Watch a wallet and get alerts for it
/unlink  Stop all alerts
/me  Show the wallets you watch
/jobs  Your deals
/deal 3  Details of one deal
/links  Your payment links
/balance  Your USDC and HYPE
/help  This message

Watching a wallet only reads public chain data. Never send private keys or seed phrases here.`;

// One function that answers every command, for both Telegram and Discord.
export async function handleCommand(
  platform: string,
  id: string,
  name: string,
  arg: string
): Promise<string> {
  if (name === "help" || name === "start") return HELP;

  if (name === "link") {
    if (!isAddress(arg || "")) return "Send a wallet address, like: /link 0x1234...";
    await linkWallet(platform, id, arg);
    return `Watching ${short(arg)}. You will get alerts here.`;
  }

  if (name === "unlink") {
    await unlinkAll(platform, id);
    return "Done. You will not get alerts any more.";
  }

  const wallets = await myWallets(platform, id);
  if (wallets.length === 0) return "Link a wallet first. Send: /link 0xYourWallet";

  if (name === "me") return `You watch:\n${wallets.join("\n")}`;

  if (name === "jobs") {
    const lines: string[] = [];
    for (const w of wallets) {
      for (const d of (await jobsFor(w)).slice(0, 8)) lines.push(dealLine(d, w));
    }
    return lines.length ? lines.join("\n\n") : "No deals yet.";
  }

  if (name === "deal") {
    const n = Number(arg);
    if (!Number.isInteger(n) || n < 1 || n >= (await nextDealId())) {
      return "That deal does not exist.";
    }
    const d = await getDeal(n);
    const lines = [
      `Deal #${d.id}: ${d.title || "Service"}`,
      `${usd(d.amount)} USDC, ${STATUS[d.status]}`,
      `Customer ${short(d.customer)}, provider ${short(d.provider)}`,
    ];
    if (d.status === 1) lines.push(`Deliver by ${when(d.deadline)}`);
    if (d.status === 2) lines.push(`Review ends ${when(d.reviewEnds)}`);
    if (d.status === 5) lines.push(`Referee should decide by ${when(d.resolveBy)}`);
    lines.push(`${SITE}/deal/${d.id}`);
    return lines.join("\n");
  }

  if (name === "links") {
    const lines: string[] = [];
    for (const w of wallets) {
      for (const l of await payLinksFor(w)) {
        lines.push(
          `#${l.id} ${l.memo || "No description"}, ${l.amount > BigInt(0) ? usd(l.amount) + " USDC" : "payer chooses"}, ${l.payments} payments, ${usd(l.received)} USDC received\n${SITE}/pay/${l.id}`
        );
      }
    }
    return lines.length ? lines.join("\n\n") : "No payment links yet.";
  }

  if (name === "balance") {
    const lines: string[] = [];
    for (const w of wallets) {
      const usdc = await chainClient.readContract({
        address: ADDRESSES.usdc,
        abi: usdcAbi,
        functionName: "balanceOf",
        args: [w as `0x${string}`],
      });
      const hype = await chainClient.getBalance({ address: w as `0x${string}` });
      lines.push(
        `${short(w)}: ${usd(usdc)} USDC, ${Number(formatUnits(hype, 18)).toFixed(4)} HYPE`
      );
    }
    return lines.join("\n");
  }

  return HELP;
}

// Alerts and reminders. A free timer calls runScan about once a minute.

async function notify(send: Send, address: string, text: string) {
  const targets = await linksFor(String(address));
  for (const t of targets) {
    try {
      await send(t.platform, t.chat_id, text);
    } catch {
      // Ignore. One blocked chat must not stop the others.
    }
  }
}

async function scanEvents(send: Send): Promise<number> {
  const latest = Number(await chainClient.getBlockNumber());
  const saved = await getState("cursor");

  // First run: start from now, so old events are not sent again.
  if (saved === null) {
    await setState("cursor", String(latest));
    return 0;
  }

  const cursor = Number(saved);
  if (latest <= cursor) return 0;

  const to = Math.min(latest, cursor + 5000);
  const fromBlock = BigInt(cursor + 1);
  const toBlock = BigInt(to);
  let count = 0;

  const referee = (await chainClient.readContract({
    address: MARKET,
    abi: marketAbi,
    functionName: "referee",
  })) as string;

  const paid = await chainClient.getContractEvents({
    address: ADDRESSES.elyPay,
    abi: elyPayAbi,
    eventName: "Paid",
    fromBlock,
    toBlock,
  });
  for (const log of paid) {
    const a = log.args as any;
    await notify(
      send,
      a.receiver,
      `You got paid ${usd(a.amount)} USDC (fee ${usd(a.fee)}). Payment link #${a.id}.\n${SITE}/pay/${a.id}`
    );
    count += 1;
  }

  const logs = await chainClient.getContractEvents({
    address: MARKET,
    abi: marketAbi,
    fromBlock,
    toBlock,
  });

  for (const log of logs) {
    const a = (log as any).args as any;
    const name = (log as any).eventName as string;
    const d = await getDeal(a.id);
    const title = d.title || "Service";
    const url = `${SITE}/deal/${a.id}`;

    if (name === "DealCreated") {
      await notify(send, d.provider, `New job: "${title}" for ${usd(d.amount)} USDC. The money is held by the contract. Check the job details in the messages.\n${url}`);
      await notify(send, d.customer, `Your payment of ${usd(d.amount)} USDC for "${title}" is held by the contract. Send the provider the job details.\n${url}`);
    }
    if (name === "DealDelivered") {
      await notify(send, d.customer, `The provider marked "${title}" as delivered. You have until ${when(a.reviewEnds)} to check the work. Release the payment or open a dispute.\n${url}`);
      await notify(send, d.provider, `You marked "${title}" as delivered. You are paid when the customer releases, or after the review time.\n${url}`);
    }
    if (name === "DealReleased") {
      await notify(send, d.provider, `You were paid ${usd(a.net)} USDC for "${title}".\n${url}`);
      await notify(send, d.customer, `The payment for "${title}" was released.\n${url}`);
    }
    if (name === "DealRefunded") {
      await notify(send, d.customer, `Your ${usd(a.amount)} USDC for "${title}" was refunded.\n${url}`);
      await notify(send, d.provider, `The deal "${title}" was refunded to the customer.\n${url}`);
    }
    if (name === "DisputeOpened") {
      await notify(send, d.provider, `The customer opened a dispute on "${title}": ${a.reason}\nAdd your side in the messages.\n${url}`);
      await notify(send, referee, `New dispute on deal #${a.id}. Open the referee desk.\n${SITE}/referee`);
    }
    if (name === "EvidenceAdded") {
      const byCustomer = String(a.by).toLowerCase() === d.customer.toLowerCase();
      await notify(send, byCustomer ? d.provider : d.customer, `New public note on the dispute for "${title}".\n${url}`);
      await notify(send, referee, `New public note on dispute #${a.id}.\n${SITE}/referee`);
    }
    if (name === "DisputeResolved") {
      const text = `The referee ruled on "${title}": provider ${a.providerShareBps / 100}%, customer ${100 - a.providerShareBps / 100}%.\nReason: ${a.ruling}\n${url}`;
      await notify(send, d.provider, text);
      await notify(send, d.customer, text);
    }
    count += 1;
  }

  await setState("cursor", String(to));
  return count;
}

async function scanReminders(send: Send): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  const next = await nextDealId();
  const start = Math.max(1, next - 200);
  let count = 0;

  for (let i = start; i < next; i++) {
    const d = await getDeal(i);
    const url = `${SITE}/deal/${i}`;
    const title = d.title || "Service";

    async function once(kind: string, fn: () => Promise<void>) {
      const key = `${i}:${kind}`;
      if (await wasSent(key)) return;
      await fn();
      await markSent(key);
      count += 1;
    }

    if (d.status === 1 && now > Number(d.deadline)) {
      await once("deadline", () =>
        notify(send, d.customer, `The deadline passed for "${title}" and it was not delivered. You can take your money back.\n${url}`)
      );
    }

    if (d.status === 2) {
      const left = Number(d.reviewEnds) - now;
      if (left > 0 && left <= 3600) {
        await once("review-soon", () =>
          notify(send, d.customer, `Your review time for "${title}" ends in under an hour. Release the payment or open a dispute now. If you do nothing, the provider is paid.\n${url}`)
        );
      }
      if (left <= 0) {
        await once("review-over", () =>
          notify(send, d.provider, `The review time for "${title}" is over. You can claim your payment.\n${url}`)
        );
      }
    }

    if (d.status === 5 && now >= Number(d.resolveBy)) {
      await once("timeout", async () => {
        const text = `The referee did not decide in time on "${title}". Anyone can now split the money in half.\n${url}`;
        await notify(send, d.customer, text);
        await notify(send, d.provider, text);
      });
    }
  }

  return count;
}

export async function runScan(send: Send) {
  const now = Math.floor(Date.now() / 1000);
  const lock = await getState("lock");
  if (lock && now - Number(lock) < 50) return { ok: true, skipped: true };

  await setState("lock", String(now));
  try {
    const events = await scanEvents(send);
    const reminders = await scanReminders(send);
    return { ok: true, events, reminders };
  } finally {
    await setState("lock", "0");
  }
}