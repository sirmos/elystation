import { Bot } from "grammy";
import { handleCommand } from "./core.mjs";

const COMMANDS = ["start", "help", "link", "unlink", "me", "jobs", "deal", "links", "balance"];

export function startTelegram(token) {
  const bot = new Bot(token);
  const options = { link_preview_options: { is_disabled: true } };

  bot.command(COMMANDS, async (ctx) => {
    const name = ctx.msg.text.split(/\s+/)[0].replace("/", "").split("@")[0];
    try {
      const text = await handleCommand("telegram", String(ctx.chat.id), name, (ctx.match || "").trim());
      await ctx.reply(text.slice(0, 4000), options);
    } catch (e) {
      console.log("Telegram command failed:", e.message);
      await ctx.reply("Something went wrong. Try again in a moment.");
    }
  });

  bot.catch((err) => console.log("Telegram error:", err.message));
  bot.start({ onStart: () => console.log("Telegram bot is running.") });

  return { send: (id, text) => bot.api.sendMessage(id, text.slice(0, 4000), options) };
}