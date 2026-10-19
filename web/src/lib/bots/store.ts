import { adminClient } from "@/lib/server";

function db() {
  const client = adminClient();
  if (!client) throw new Error("Supabase is not set up");
  return client;
}

export async function linkWallet(platform: string, chatId: string, address: string) {
  const { error } = await db()
    .from("bot_links")
    .upsert(
      { platform, chat_id: chatId, address: address.toLowerCase() },
      { onConflict: "platform,chat_id,address" }
    );
  if (error) throw new Error(error.message);
}

export async function unlinkAll(platform: string, chatId: string) {
  const { error } = await db()
    .from("bot_links")
    .delete()
    .eq("platform", platform)
    .eq("chat_id", chatId);
  if (error) throw new Error(error.message);
}

export async function myWallets(platform: string, chatId: string): Promise<string[]> {
  const { data, error } = await db()
    .from("bot_links")
    .select("address")
    .eq("platform", platform)
    .eq("chat_id", chatId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { address: string }) => r.address);
}

export async function linksFor(
  address: string
): Promise<{ platform: string; chat_id: string }[]> {
  const { data, error } = await db()
    .from("bot_links")
    .select("platform, chat_id")
    .eq("address", address.toLowerCase());
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getState(key: string): Promise<string | null> {
  const { data } = await db()
    .from("bot_state")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data ? (data.value as string) : null;
}

export async function setState(key: string, value: string) {
  await db()
    .from("bot_state")
    .upsert({ key, value, updated_at: new Date().toISOString() });
}

export async function wasSent(key: string): Promise<boolean> {
  const { data } = await db()
    .from("bot_sent")
    .select("key")
    .eq("key", key)
    .maybeSingle();
  return !!data;
}

export async function markSent(key: string) {
  await db().from("bot_sent").upsert({ key });
}