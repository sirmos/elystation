import { indexTick } from "@/lib/indexer";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Open this with your secret to catch up faster. Run it again until "behind" is 0.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = new URL(req.url).searchParams.get("secret");
  if (!secret || given !== secret) return new Response("forbidden", { status: 403 });

  try {
    return Response.json(await indexTick(22000));
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "failed" },
      { status: 500 }
    );
  }
}