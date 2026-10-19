import { after } from "next/server";
import { createPublicKey, verify } from "node:crypto";
import { handleCommand } from "@/lib/bots/core";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

// Discord signs every request. We check the signature before doing anything.
function validSignature(raw: string, signature: string, timestamp: string) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) return false;
  try {
    const key = createPublicKey({
      key: Buffer.concat([SPKI_PREFIX, Buffer.from(publicKey, "hex")]),
      format: "der",
      type: "spki",
    });
    return verify(
      null,
      Buffer.from(timestamp + raw),
      key,
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-signature-ed25519") ?? "";
  const timestamp = req.headers.get("x-signature-timestamp") ?? "";

  if (!validSignature(raw, signature, timestamp)) {
    return new Response("invalid signature", { status: 401 });
  }

  const body = JSON.parse(raw);

  // Discord checks that the address is alive.
  if (body.type === 1) return Response.json({ type: 1 });

  if (body.type === 2) {
    const name: string = body.data?.name;
    const options = body.data?.options ?? [];
    const arg = options[0] ? String(options[0].value) : "";
    const userId: string = body.member?.user?.id ?? body.user?.id;
    const appId: string = body.application_id;
    const token: string = body.token;

    // Reply "thinking" right away, then send the answer when it is ready.
    after(async () => {
      let text = "Something went wrong. Try again in a moment.";
      try {
        text = await handleCommand("discord", userId, name, arg);
      } catch {
        // Keep the default message.
      }
      await fetch(
        `https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content: text.slice(0, 1900) }),
        }
      );
    });

    return Response.json({ type: 5, data: { flags: 64 } });
  }

  return Response.json({ type: 4, data: { content: "Unknown command." } });
}