import "dotenv/config";
import { startWatchers } from "./core.mjs";
import { startTelegram } from "./telegram.mjs";
import { startDiscord } from "./discord.mjs";

const senders = {};

if (process.env.TELEGRAM_BOT_TOKEN) {
  senders.telegram = startTelegram(process.env.TELEGRAM_BOT_TOKEN).send;
}

if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_CLIENT_ID) {
  const discord = await startDiscord({
    token: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID || undefined,
  });
  senders.discord = discord.send;
}

if (Object.keys(senders).length === 0) {
  console.log("Add a bot token to bots/.env first.");
  process.exit(1);
}

startWatchers(async (platform, id, text) => {
  const send = senders[platform];
  if (send) await send(id, text);
});

console.log("Watching Elysium testnet. Press Ctrl+C to stop.");