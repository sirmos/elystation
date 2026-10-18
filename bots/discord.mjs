import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import { handleCommand } from "./core.mjs";

export async function startDiscord({ token, clientId, guildId }) {
  const commands = [
    new SlashCommandBuilder()
      .setName("link")
      .setDescription("Watch a wallet and get alerts for it")
      .addStringOption((o) =>
        o.setName("address").setDescription("Your wallet address").setRequired(true)
      ),
    new SlashCommandBuilder().setName("unlink").setDescription("Stop all alerts"),
    new SlashCommandBuilder().setName("me").setDescription("Show the wallets you watch"),
    new SlashCommandBuilder().setName("jobs").setDescription("Your deals"),
    new SlashCommandBuilder()
      .setName("deal")
      .setDescription("Details of one deal")
      .addIntegerOption((o) =>
        o.setName("id").setDescription("Deal number").setRequired(true)
      ),
    new SlashCommandBuilder().setName("links").setDescription("Your payment links"),
    new SlashCommandBuilder().setName("balance").setDescription("Your USDC and HYPE"),
    new SlashCommandBuilder().setName("help").setDescription("What the bot can do"),
  ].map((c) => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(token);
  await rest.put(
    guildId
      ? Routes.applicationGuildCommands(clientId, guildId)
      : Routes.applicationCommands(clientId),
    { body: commands }
  );

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once(Events.ClientReady, () => console.log("Discord bot is running."));

  client.on(Events.InteractionCreate, async (i) => {
    if (!i.isChatInputCommand()) return;
    await i.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      let arg = "";
      if (i.commandName === "link") arg = i.options.getString("address") || "";
      if (i.commandName === "deal") arg = String(i.options.getInteger("id"));
      const text = await handleCommand("discord", i.user.id, i.commandName, arg);
      await i.editReply(text.slice(0, 1900));
    } catch (e) {
      console.log("Discord command failed:", e.message);
      await i.editReply("Something went wrong. Try again in a moment.");
    }
  });

  await client.login(token);

  return {
    send: async (userId, text) => {
      const user = await client.users.fetch(userId);
      await user.send(text.slice(0, 1900));
    },
  };
}