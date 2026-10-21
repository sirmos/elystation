import { after } from "next/server";
import { adminClient, chainClient } from "@/lib/server";
import { ensureFresh } from "@/lib/indexer";
import { getState } from "@/lib/bots/store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// The whole directory in one fast request.
export async function GET() {
  const db = adminClient();
  if (!db) return Response.json({ error: "not_configured" }, { status: 503 });

  const { data, error } = await db
    .from("profiles_index")
    .select("*")
    .order("jobs", { ascending: false })
    .order("name", { ascending: true })
    .limit(2000);

  if (error) {
    return Response.json({ error: "db", message: error.message }, { status: 500 });
  }

  const indexedTo = Number((await getState("index_cursor")) ?? 0);
  let latest = 0;
  try {
    latest = Number(await chainClient.getBlockNumber());
  } catch {
    // Leave it at zero.
  }

  after(() => ensureFresh());

  return Response.json(
    { profiles: data ?? [], indexedTo, latest },
    { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=60" } }
  );
}