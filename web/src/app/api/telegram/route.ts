import { handleCommand } from "@/lib/bots/core";
import { sendTelegram } from "@/lib/bots/send";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const COMMANDS = ["start", "help", "link", "unlink", "me", "jobs", "deal", "links", "balance"];

// Telegram calls this address every time someone messages the bot.
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  const update = await req.json().catch(() => null);
  const message = update?.message;
  const text: string | undefined = message?.text;
  if (!message || !text || !text.startsWith("/")) return Response.json({ ok: true });

  const [first, ...rest] = text.trim().split(/\s+/);
  const name = first.replace("/", "").split("@")[0].toLowerCase();
  if (!COMMANDS.includes(name)) return Response.json({ ok: true });

  const chatId = String(message.chat.id);
  try {
    const reply = await handleCommand("telegram", chatId, name, rest.join(" ").trim());
    await sendTelegram(chatId, reply);
  } catch {
    await sendTelegram(chatId, "Something went wrong. Try again in a moment.");
  }

  return Response.json({ ok: true });
}