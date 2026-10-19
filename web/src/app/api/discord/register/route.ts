export const dynamic = "force-dynamic";

// Open this address once, with your secret, to add the slash commands.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = new URL(req.url).searchParams.get("secret");
  if (!secret || given !== secret) return new Response("forbidden", { status: 403 });

  const token = process.env.DISCORD_BOT_TOKEN;
  const appId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!token || !appId) {
    return Response.json({ ok: false, error: "Set DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID" });
  }

  const commands = [
    {
      name: "link",
      description: "Watch a wallet and get alerts for it",
      options: [
        { type: 3, name: "address", description: "Your wallet address", required: true },
      ],
    },
    { name: "unlink", description: "Stop all alerts" },
    { name: "me", description: "Show the wallets you watch" },
    { name: "jobs", description: "Your deals" },
    {
      name: "deal",
      description: "Details of one deal",
      options: [{ type: 4, name: "id", description: "Deal number", required: true }],
    },
    { name: "links", description: "Your payment links" },
    { name: "balance", description: "Your USDC and HYPE" },
    { name: "help", description: "What the bot can do" },
  ];

  const url = guildId
    ? `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`
    : `https://discord.com/api/v10/applications/${appId}/commands`;

  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bot ${token}`, "content-type": "application/json" },
    body: JSON.stringify(commands),
  });

  return Response.json({ ok: res.ok, status: res.status, body: (await res.text()).slice(0, 300) });
}