// Sends a message to Telegram or Discord. Errors are ignored on purpose:
// one person blocking the bot must not stop alerts for everyone else.

export async function sendTelegram(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 4000),
      disable_web_page_preview: true,
    }),
  });
}

export async function sendDiscordDm(userId: string, text: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return;
  const headers = {
    Authorization: `Bot ${token}`,
    "content-type": "application/json",
  };

  const channel = await fetch("https://discord.com/api/v10/users/@me/channels", {
    method: "POST",
    headers,
    body: JSON.stringify({ recipient_id: userId }),
  });
  if (!channel.ok) return;
  const { id } = await channel.json();

  await fetch(`https://discord.com/api/v10/channels/${id}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ content: text.slice(0, 1900) }),
  });
}

export async function sendTo(platform: string, id: string, text: string) {
  if (platform === "telegram") return sendTelegram(id, text);
  if (platform === "discord") return sendDiscordDm(id, text);
}