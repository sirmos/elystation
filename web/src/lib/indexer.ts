/* eslint-disable @typescript-eslint/no-explicit-any */
import { parseAbi } from "viem";
import { adminClient, chainClient } from "@/lib/server";
import { ADDRESSES, elyMarketAbi } from "@/lib/contracts";
import { getState, setState } from "@/lib/bots/store";

// Server only. Reads the contract events in small chunks and saves them in
// Supabase, so pages never have to search the whole chain.

const marketEventsAbi = parseAbi([
  "event ProfileSet(address indexed provider, string name, string headline, string category, string city)",
  "event HandleSet(address indexed owner, string handle)",
  "event ServiceAdded(address indexed provider, uint256 index, string title, uint256 price)",
  "event ServiceStatus(address indexed provider, uint256 index, bool active)",
  "event DealCreated(uint256 indexed id, address indexed customer, address indexed provider, uint256 amount, uint64 deadline, string title)",
  "event DealDelivered(uint256 indexed id, uint64 reviewEnds)",
  "event DealReleased(uint256 indexed id, address indexed provider, uint256 net, uint256 fee)",
  "event DealRefunded(uint256 indexed id, address indexed customer, uint256 amount)",
  "event DisputeOpened(uint256 indexed id, address indexed customer, string reason)",
  "event EvidenceAdded(uint256 indexed id, address indexed by, string note)",
  "event DisputeResolved(uint256 indexed id, uint16 providerShareBps, uint256 providerNet, uint256 customerAmount, string ruling)",
]);

const payEventsAbi = parseAbi([
  "event LinkCreated(uint256 indexed id, address indexed owner, uint256 amount, string memo)",
  "event Paid(uint256 indexed id, address indexed payer, address indexed receiver, uint256 amount, uint256 fee)",
]);

// The first block to read is the first block at or after this time.
// It is a little before the first contract was deployed (Oct 16, 2026).
const START_TIME = Math.floor(
  new Date(process.env.INDEX_START_TIME || "2026-10-16T01:00:00Z").getTime() / 1000
);

function plain(args: Record<string, unknown>) {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(args)) {
    if (typeof v === "bigint") out[k] = v.toString();
    else if (typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v)) out[k] = v.toLowerCase();
    else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[k] = v;
  }
  return out;
}

async function findStartBlock(): Promise<number> {
  const saved = await getState("index_start");
  if (saved) return Number(saved);

  let lo = 0;
  let hi = Number(await chainClient.getBlockNumber());
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const block = await chainClient.getBlock({ blockNumber: BigInt(mid) });
    if (Number(block.timestamp) >= START_TIME) hi = mid;
    else lo = mid + 1;
  }
  await setState("index_start", String(lo));
  return lo;
}

async function fetchRows(from: number, to: number, dirty: Set<string>) {
  const fromBlock = BigInt(from);
  const toBlock = BigInt(to);

  const [market, pay] = await Promise.all([
    chainClient.getContractEvents({
      address: ADDRESSES.elyMarket,
      abi: marketEventsAbi,
      fromBlock,
      toBlock,
    }),
    chainClient.getContractEvents({
      address: ADDRESSES.elyPay,
      abi: payEventsAbi,
      fromBlock,
      toBlock,
    }),
  ]);

  const rows: any[] = [];
  const resolved: bigint[] = [];

  const groups: [string, any[]][] = [
    ["market", market as any[]],
    ["pay", pay as any[]],
  ];

  for (const [contract, logs] of groups) {
    for (const log of logs) {
      const args = plain(log.args ?? {});
      const name = String(log.eventName);

      rows.push({
        id: `${contract}:${log.blockNumber}:${log.logIndex}`,
        contract,
        event: name,
        block_number: Number(log.blockNumber),
        log_index: Number(log.logIndex),
        tx_hash: String(log.transactionHash),
        args,
      });

      if (contract === "market") {
        if (
          name === "ProfileSet" ||
          name === "ServiceAdded" ||
          name === "ServiceStatus" ||
          name === "DealReleased"
        ) {
          dirty.add(String(args.provider));
        }
        if (name === "HandleSet") dirty.add(String(args.owner));
        if (name === "DisputeResolved") resolved.push(BigInt(String(args.id)));
      }
    }
  }

  for (const id of resolved) {
    const d = await chainClient.readContract({
      address: ADDRESSES.elyMarket,
      abi: elyMarketAbi,
      functionName: "deals",
      args: [id],
    });
    dirty.add(String(d[1]).toLowerCase());
  }

  return rows;
}

async function refreshProfile(address: string) {
  const db = adminClient();
  if (!db) return;
  const addr = address as `0x${string}`;

  const p = await chainClient.readContract({
    address: ADDRESSES.elyMarket,
    abi: elyMarketAbi,
    functionName: "profiles",
    args: [addr],
  });
  if (p[6] === BigInt(0)) return;

  const [services, jobs, handle] = await Promise.all([
    chainClient.readContract({
      address: ADDRESSES.elyMarket,
      abi: elyMarketAbi,
      functionName: "getServices",
      args: [addr],
    }),
    chainClient.readContract({
      address: ADDRESSES.elyMarket,
      abi: elyMarketAbi,
      functionName: "jobsCompleted",
      args: [addr],
    }),
    chainClient.readContract({
      address: ADDRESSES.elyMarket,
      abi: elyMarketAbi,
      functionName: "handleOf",
      args: [addr],
    }),
  ]);

  let fromPrice: bigint | null = null;
  for (const s of services) {
    if (s.active && (fromPrice === null || s.price < fromPrice)) fromPrice = s.price;
  }

  await db.from("profiles_index").upsert({
    address: address.toLowerCase(),
    name: p[0],
    handle,
    headline: p[1],
    category: p[2],
    city: p[3],
    from_price: fromPrice === null ? null : fromPrice.toString(),
    jobs: Number(jobs),
    updated_at: new Date().toISOString(),
  });
}

// Reads as many new blocks as the time budget allows.
export async function indexTick(budgetMs: number) {
  const db = adminClient();
  if (!db) return { ok: false, error: "not_configured" };

  const started = Date.now();
  const latest = Number(await chainClient.getBlockNumber());

  const savedCursor = await getState("index_cursor");
  let cursor = savedCursor !== null ? Number(savedCursor) : (await findStartBlock()) - 1;
  let size = Number((await getState("index_chunk")) ?? 2000);
  if (!Number.isFinite(size) || size < 200) size = 2000;

  const dirty = new Set<string>();
  let inserted = 0;
  let lastError = "";

  while (cursor < latest && Date.now() - started < budgetMs) {
    const from = cursor + 1;
    const to = Math.min(latest, cursor + size);

    try {
      const rows = await fetchRows(from, to, dirty);
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await db
          .from("chain_events")
          .upsert(rows.slice(i, i + 500), { onConflict: "id", ignoreDuplicates: true });
        if (error) throw new Error(error.message);
      }
      cursor = to;
      inserted += rows.length;
      if (size < 5000) size = Math.min(5000, Math.floor(size * 1.5));
    } catch (e) {
      lastError = e instanceof Error ? e.message.slice(0, 200) : "failed";
      if (size > 200) {
        // The node refused this size. Try a smaller one.
        size = Math.max(200, Math.floor(size / 2));
        continue;
      }
      break;
    }
  }

  await setState("index_cursor", String(cursor));
  await setState("index_chunk", String(size));

  for (const addr of dirty) {
    if (Date.now() - started > budgetMs + 6000) break;
    try {
      await refreshProfile(addr);
    } catch {
      // Try again on the next run.
    }
  }

  return {
    ok: lastError === "" || cursor >= latest,
    cursor,
    latest,
    behind: latest - cursor,
    inserted,
    chunk: size,
    error: lastError || undefined,
  };
}

// Called in the background by the pages. At most once every 15 seconds.
export async function ensureFresh() {
  try {
    const now = Math.floor(Date.now() / 1000);
    const last = Number((await getState("index_run")) ?? 0);
    if (now - last < 15) return;
    await setState("index_run", String(now));
    await indexTick(5000);
  } catch {
    // Ignore. The next call tries again.
  }
}