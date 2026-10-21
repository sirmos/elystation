import { after } from "next/server";
import { adminClient } from "@/lib/server";
import { ensureFresh } from "@/lib/indexer";
import { getState } from "@/lib/bots/store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  const db = adminClient();
  if (!db) return Response.json({ error: "not_configured" }, { status: 503 });

  const url = new URL(req.url);
  const contract = url.searchParams.get("contract");
  const event = url.searchParams.get("event");

  if ((contract !== "market" && contract !== "pay") || !event || !/^[A-Za-z]+$/.test(event)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  // Any other short parameter is a filter on an event field.
  const where: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (key === "contract" || key === "event" || key === "limit") continue;
    if (!/^[A-Za-z]{1,30}$/.test(key)) continue;
    where[key] = /^0x[0-9a-fA-F]{40}$/.test(value) ? value.toLowerCase() : value.slice(0, 100);
  }

  const limit = Math.min(Number(url.searchParams.get("limit") ?? 2000) || 2000, 5000);

  let query = db
    .from("chain_events")
    .select("block_number, log_index, tx_hash, args")
    .eq("contract", contract)
    .eq("event", event)
    .order("block_number", { ascending: true })
    .order("log_index", { ascending: true })
    .limit(limit);

  if (Object.keys(where).length > 0) query = query.contains("args", where);

  const { data, error } = await query;
  if (error) {
    return Response.json({ error: "db", message: error.message }, { status: 500 });
  }

  const indexedTo = Number((await getState("index_cursor")) ?? 0);
  after(() => ensureFresh());

  return Response.json(
    {
      events: (data ?? []).map((r) => ({
        block: Number(r.block_number),
        logIndex: Number(r.log_index),
        tx: r.tx_hash,
        args: r.args,
      })),
      indexedTo,
    },
    { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30" } }
  );
}