import "dotenv/config";
import fs from "node:fs";
import {
  createPublicClient,
  defineChain,
  formatUnits,
  http,
  isAddress,
  parseAbi,
} from "viem";

export const SITE = (process.env.SITE_URL || "https://elystation.vercel.app").replace(/\/$/, "");
const RPC = process.env.RPC_URL || "https://testnet-rpc.elysium.kinetiq.xyz";
const MARKET = process.env.MARKET_ADDRESS;
const PAY = process.env.PAY_ADDRESS || "0x68Aa5b7A6A755b2FcfB1a94E253E4Ab92Ad9cBb4";
const USDC = process.env.USDC_ADDRESS || "0x4CD746962FEFEFfa2fcc5cced7B27BC47FE3890B";

if (!MARKET) {
  console.log("Set MARKET_ADDRESS in bots/.env (your ElyMarketV2 address).");
  process.exit(1);
}

const chain = defineChain({
  id: 99801,
  name: "Elysium Testnet",
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

const client = createPublicClient({ chain, transport: http() });

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

const payAbi = parseAbi([
  "function links(uint256) view returns (address owner, uint256 amount, bool active, uint32 payments, uint256 totalReceived, string memo)",
  "event LinkCreated(uint256 indexed id, address indexed owner, uint256 amount, string memo)",
  "event Paid(uint256 indexed id, address indexed payer, address indexed receiver, uint256 amount, uint256 fee)",
]);

const usdcAbi = parseAbi(["function balanceOf(address) view returns (uint256)"]);

export const STATUS = [
  "Not found",
  "Funded",
  "Delivered",
  "Paid out",
  "Refunded",
  "In dispute",
  "Resolved",
];

// Simple storage in a local file: who watches which wallet, and what was sent.

const FILE = new URL("./data.json", import.meta.url);

function readStore() {
  try {
    const s = JSON.parse(fs.readFileSync(FILE, "utf8"));
    return { links: s.links || [], cursor: s.cursor ?? null, sent: s.sent || {} };
  } catch {
    return { links: [], cursor: null, sent: {} };
  }
}

function writeStore(store) {
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2));
}

export function linkWallet(platform, id, address) {
  const store = readStore();
  const a = address.toLowerCase();
  if (!store.links.some((l) => l.platform === platform && l.id === id && l.address === a)) {
    store.links.push({ platform, id, address: a });
    writeStore(store);
  }
}

export function unlinkAll(platform, id) {
  const store = readStore();
  store.links = store.links.filter((l) => !(l.platform === platform && l.id === id));
  writeStore(store);
}

export function myWallets(platform, id) {
  return readStore()
    .links.filter((l) => l.platform === platform && l.id === id)
    .map((l) => l.address);
}

// Helpers

export function short(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function usd(value) {
  return Number(formatUnits(value, 6)).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

function when(seconds) {
  return new Date(Number(seconds) * 1000).toUTCString();
}

async function getDeal(id) {
  const d = await client.readContract({
    address: MARKET,
    abi: marketAbi,
    functionName: "deals",
    args: [BigInt(id)],
  });
  return {
    id: BigInt(id),
    customer: d[0],
    provider: d[1],
    amount: d[2],
    deadline: d[3],
    reviewSeconds: d[4],
    reviewEnds: d[5],
    resolveBy: d[6],
    status: Number(d[7]),
    title: d[8],
  };
}

async function nextDealId() {
  return Number(
    await client.readContract({ address: MARKET, abi: marketAbi, functionName: "nextDealId" })
  );
}

async function jobsFor(address) {
  const next = await nextDealId();
  const ids = [];
  for (let i = 1; i < next; i++) ids.push(i);
  const all = await Promise.all(ids.map((i) => getDeal(i)));
  const me = address.toLowerCase();
  return all
    .filter((d) => d.customer.toLowerCase() === me || d.provider.toLowerCase() === me)
    .reverse();
}

async function linksFor(address) {
  const logs = await client.getContractEvents({
    address: PAY,
    abi: payAbi,
    eventName: "LinkCreated",
    args: { owner: address },
    fromBlock: 0n,
    toBlock: "latest",
  });
  const out = [];
  for (const l of logs) {
    const r = await client.readContract({
      address: PAY,
      abi: payAbi,
      functionName: "links",
      args: [l.args.id],
    });
    out.push({ id: l.args.id, amount: r[1], payments: r[3], received: r[4], memo: r[5] });
  }
  return out.reverse();
}

function dealLine(d, me) {
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

export async function handleCommand(platform, id, name, arg) {
  if (name === "help" || name === "start") return HELP;

  if (name === "link") {
    if (!isAddress(arg || "")) return "Send a wallet address, like: /link 0x1234...";
    linkWallet(platform, id, arg);
    return `Watching ${short(arg)}. You will get alerts here.`;
  }

  if (name === "unlink") {
    unlinkAll(platform, id);
    return "Done. You will not get alerts any more.";
  }

  const wallets = myWallets(platform, id);
  if (wallets.length === 0) return "Link a wallet first. Send: /link 0xYourWallet";

  if (name === "me") return `You watch:\n${wallets.join("\n")}`;

  if (name === "jobs") {
    const lines = [];
    for (const w of wallets) {
      for (const d of (await jobsFor(w)).slice(0, 8)) lines.push(dealLine(d, w));
    }
    return lines.length ? lines.join("\n\n") : "No deals yet.";
  }

  if (name === "deal") {
    const n = Number(arg);
    if (!Number.isInteger(n) || n < 1 || n >= (await nextDealId())) return "That deal does not exist.";
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
    const lines = [];
    for (const w of wallets) {
      for (const l of (await linksFor(w)).slice(0, 8)) {
        lines.push(
          `#${l.id} ${l.memo || "No description"}, ${l.amount > 0n ? usd(l.amount) + " USDC" : "payer chooses"}, ${l.payments} payments, ${usd(l.received)} USDC received\n${SITE}/pay/${l.id}`
        );
      }
    }
    return lines.length ? lines.join("\n\n") : "No payment links yet.";
  }

  if (name === "balance") {
    const lines = [];
    for (const w of wallets) {
      const usdc = await client.readContract({ address: USDC, abi: usdcAbi, functionName: "balanceOf", args: [w] });
      const hype = await client.getBalance({ address: w });
      lines.push(`${short(w)}: ${usd(usdc)} USDC, ${Number(formatUnits(hype, 18)).toFixed(4)} HYPE`);
    }
    return lines.join("\n");
  }

  return HELP;
}

// Alerts and reminders

export function startWatchers(send) {
  async function notify(address, text) {
    const me = String(address).toLowerCase();
    for (const l of readStore().links) {
      if (l.address !== me) continue;
      try {
        await send(l.platform, l.id, text);
      } catch (e) {
        console.log("Could not send to", l.platform, l.id, "-", e.message);
      }
    }
  }

  async function scanEvents() {
    const latest = Number(await client.getBlockNumber());
    const store = readStore();

    // First run: start from now so old events are not sent again.
    if (store.cursor === null) {
      store.cursor = latest;
      writeStore(store);
      return;
    }
    if (latest <= store.cursor) return;

    const fromBlock = BigInt(store.cursor + 1);
    const toBlock = BigInt(latest);
    const referee = await client.readContract({ address: MARKET, abi: marketAbi, functionName: "referee" });

    const paid = await client.getContractEvents({ address: PAY, abi: payAbi, eventName: "Paid", fromBlock, toBlock });
    for (const log of paid) {
      const a = log.args;
      await notify(a.receiver, `You got paid ${usd(a.amount)} USDC (fee ${usd(a.fee)}). Payment link #${a.id}.\n${SITE}/pay/${a.id}`);
    }

    const logs = await client.getContractEvents({ address: MARKET, abi: marketAbi, fromBlock, toBlock });
    for (const log of logs) {
      const a = log.args;
      const url = `${SITE}/deal/${a.id}`;
      const d = await getDeal(a.id);
      const title = d.title || "Service";

      if (log.eventName === "DealCreated") {
        await notify(d.provider, `New job: "${title}" for ${usd(d.amount)} USDC. The money is held by the contract. Check the job details in the messages.\n${url}`);
        await notify(d.customer, `Your payment of ${usd(d.amount)} USDC for "${title}" is held by the contract. Send the provider the job details.\n${url}`);
      }
      if (log.eventName === "DealDelivered") {
        await notify(d.customer, `The provider marked "${title}" as delivered. You have until ${when(a.reviewEnds)} to check the work. Release the payment or open a dispute.\n${url}`);
        await notify(d.provider, `You marked "${title}" as delivered. You are paid when the customer releases, or after the review time.\n${url}`);
      }
      if (log.eventName === "DealReleased") {
        await notify(d.provider, `You were paid ${usd(a.net)} USDC for "${title}".\n${url}`);
        await notify(d.customer, `The payment for "${title}" was released.\n${url}`);
      }
      if (log.eventName === "DealRefunded") {
        await notify(d.customer, `Your ${usd(a.amount)} USDC for "${title}" was refunded.\n${url}`);
        await notify(d.provider, `The deal "${title}" was refunded to the customer.\n${url}`);
      }
      if (log.eventName === "DisputeOpened") {
        await notify(d.provider, `The customer opened a dispute on "${title}": ${a.reason}\nAdd your side in the messages.\n${url}`);
        await notify(referee, `New dispute on deal #${a.id}. Open the referee desk.\n${SITE}/referee`);
      }
      if (log.eventName === "EvidenceAdded") {
        const byCustomer = String(a.by).toLowerCase() === d.customer.toLowerCase();
        await notify(byCustomer ? d.provider : d.customer, `New public note on the dispute for "${title}".\n${url}`);
        await notify(referee, `New public note on dispute #${a.id}.\n${SITE}/referee`);
      }
      if (log.eventName === "DisputeResolved") {
        const text = `The referee ruled on "${title}": provider ${a.providerShareBps / 100}%, customer ${100 - a.providerShareBps / 100}%.\nReason: ${a.ruling}\n${url}`;
        await notify(d.provider, text);
        await notify(d.customer, text);
      }
    }

    const after = readStore();
    after.cursor = latest;
    writeStore(after);
  }

  async function scanReminders() {
    const now = Math.floor(Date.now() / 1000);
    const next = await nextDealId();

    for (let i = 1; i < next; i++) {
      const d = await getDeal(i);
      const url = `${SITE}/deal/${i}`;
      const title = d.title || "Service";

      async function once(kind, fn) {
        const key = `${i}:${kind}`;
        if (readStore().sent[key]) return;
        await fn();
        const s = readStore();
        s.sent[key] = true;
        writeStore(s);
      }

      if (d.status === 1 && now > Number(d.deadline)) {
        await once("deadline", () =>
          notify(d.customer, `The deadline passed for "${title}" and it was not delivered. You can take your money back.\n${url}`)
        );
      }

      if (d.status === 2) {
        const left = Number(d.reviewEnds) - now;
        if (left > 0 && left <= 3600) {
          await once("review-soon", () =>
            notify(d.customer, `Your review time for "${title}" ends in under an hour. Release the payment or open a dispute now. If you do nothing, the provider is paid.\n${url}`)
          );
        }
        if (left <= 0) {
          await once("review-over", () =>
            notify(d.provider, `The review time for "${title}" is over. You can claim your payment.\n${url}`)
          );
        }
      }

      if (d.status === 5 && now >= Number(d.resolveBy)) {
        await once("timeout", async () => {
          const text = `The referee did not decide in time on "${title}". Anyone can now split the money in half.\n${url}`;
          await notify(d.customer, text);
          await notify(d.provider, text);
        });
      }
    }
  }

  const safe = (fn, name) => async () => {
    try {
      await fn();
    } catch (e) {
      console.log(`${name} failed:`, e.message);
    }
  };

  safe(scanEvents, "Events")();
  setInterval(safe(scanEvents, "Events"), 15000);
  setInterval(safe(scanReminders, "Reminders"), 60000);
}