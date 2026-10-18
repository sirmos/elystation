import "dotenv/config";
import { startWatchers } from "./core.mjs";
import { startTelegram } from "./telegram.mjs";
import { startDiscord } from "./discord.mjs";

const senders = {};

if (process.env.TELEGRAM_BOT_TOKEN) {
  try {
    senders.telegram = startTelegram(process.env.TELEGRAM_BOT_TOKEN).send;
  } catch (e) {
    console.log("Telegram did not start:", e.message);
  }
}

if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_CLIENT_ID) {
  try {
    const discord = await startDiscord({
      token: process.env.DISCORD_BOT_TOKEN,
      clientId: process.env.DISCORD_CLIENT_ID,
      guildId: process.env.DISCORD_GUILD_ID || undefined,
    });
    senders.discord = discord.send;
  } catch (e) {
    console.log("Discord did not start:", e.message);
    console.log(
      "Check DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID in bots/.env. The token comes from the Bot page, not the OAuth2 page."
    );
  }
}

if (Object.keys(senders).length === 0) {
  console.log("No bot started. Add a working token to bots/.env first.");
  process.exit(1);
}

process.on("unhandledRejection", (e) => {
  console.log("Warning:", e && e.message ? e.message : e);
});

startWatchers(async (platform, id, text) => {
  const send = senders[platform];
  if (send) await send(id, text);
});

console.log("Watching Elysium testnet. Press Ctrl+C to stop.");