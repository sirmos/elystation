import { after } from "next/server";
import { adminClient } from "@/lib/server";
import { ensureFresh } from "@/lib/indexer";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Row = { block_number: number; log_index: number; args: Record<string, string> };

async function rows(
  db: NonNullable<ReturnType<typeof adminClient>>,
  contract: string,
  event: string
): Promise<Row[]> {
  const { data } = await db
    .from("chain_events")
    .select("block_number, log_index, args")
    .eq("contract", contract)
    .eq("event", event)
    .order("block_number", { ascending: true })
    .order("log_index", { ascending: true })
    .limit(20000);
  return (data ?? []) as Row[];
}

// Usage numbers for the home page and the token page.
export async function GET() {
  const db = adminClient();
  if (!db) return Response.json({ error: "not_configured" }, { status: 503 });

  const [created, paid, deals, profiles] = await Promise.all([
    rows(db, "pay", "LinkCreated"),
    rows(db, "pay", "Paid"),
    rows(db, "market", "DealCreated"),
    rows(db, "market", "ProfileSet"),
  ]);

  const wallets = new Set<string>();
  const people = new Set<string>();
  const add = (a?: string) => {
    if (a) wallets.add(a.toLowerCase());
  };

  let volume = BigInt(0);
  for (const l of created) add(l.args.owner);
  for (const p of paid) {
    add(p.args.payer);
    add(p.args.receiver);
    volume += BigInt(p.args.amount ?? "0");
  }
  for (const d of deals) {
    add(d.args.customer);
    add(d.args.provider);
    volume += BigInt(d.args.amount ?? "0");
  }
  for (const p of profiles) {
    add(p.args.provider);
    if (p.args.provider) people.add(p.args.provider.toLowerCase());
  }

  let latest: { amount: string; fee: string; memo: string } | null = null;
  const last = paid[paid.length - 1];
  if (last) {
    const link = created.find((c) => c.args.id === last.args.id);
    latest = {
      amount: last.args.amount ?? "0",
      fee: last.args.fee ?? "0",
      memo: link ? String(link.args.memo ?? "") : "",
    };
  }

  after(() => ensureFresh());

  return Response.json(
    {
      links: created.length,
      payments: paid.length,
      deals: deals.length,
      profiles: people.size,
      wallets: wallets.size,
      volume: volume.toString(),
      latest,
    },
    { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=60" } }
  );
}