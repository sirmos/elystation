export const dynamic = "force-dynamic";

// Exchange rates for price estimates. Cached for an hour.
export async function GET() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("bad response");
    const json = await res.json();
    return Response.json(
      { rates: json.rates, updated: json.time_last_update_utc ?? null },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}