import { runScan } from "@/lib/bots/core";
import { sendTo } from "@/lib/bots/send";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// A free timer calls this address about once a minute.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given =
    new URL(req.url).searchParams.get("secret") ??
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!secret || given !== secret) return new Response("forbidden", { status: 403 });

  try {
    return Response.json(await runScan(sendTo));
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "failed" },
      { status: 500 }
    );
  }
}