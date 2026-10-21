export type ChainEvent = {
  block: number;
  logIndex: number;
  tx: string;
  args: Record<string, string>;
};

// Asks our own server for saved events. Fast, and the same for 3 or 3,000 users.
// `where` filters on event fields, for example { provider: "0x..." } or { id: "3" }.
export async function fetchEvents(
  contract: "market" | "pay",
  event: string,
  where: Record<string, string> = {}
): Promise<ChainEvent[]> {
  const params = new URLSearchParams({ contract, event, ...where });
  const res = await fetch(`/api/events?${params.toString()}`);
  if (!res.ok) throw new Error(`Events request failed (${res.status})`);
  const json = await res.json();
  return json.events as ChainEvent[];
}