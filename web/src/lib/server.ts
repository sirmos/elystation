import { createClient } from "@supabase/supabase-js";
import { createPublicClient, http, verifyMessage } from "viem";
import type { Address } from "viem";
import { elysiumTestnet } from "./chain";
import { ADDRESSES, elyMarketAbi } from "./contracts";

const ZERO = "0x0000000000000000000000000000000000000000";

// Server only. Returns null when the Supabase keys are not set.
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export const chainClient = createPublicClient({
  chain: elysiumTestnet,
  transport: http(),
});

// The browser signs a short message once. We check the signature and expiry.
export async function verifyRequest(req: Request): Promise<Address | null> {
  const raw = req.headers.get("x-ely-auth");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    const address = String(parsed.address);
    const message = String(parsed.message);
    const signature = String(parsed.signature);

    const m =
      /^Elystation sign in\nAddress: (0x[a-fA-F0-9]{40})\nExpires: (\d+)$/.exec(
        message
      );
    if (!m) return null;
    if (m[1].toLowerCase() !== address.toLowerCase()) return null;
    if (Number(m[2]) < Math.floor(Date.now() / 1000)) return null;

    const ok = await verifyMessage({
      address: address as Address,
      message,
      signature: signature as `0x${string}`,
    });
    return ok ? (address as Address) : null;
  } catch {
    return null;
  }
}

export type Role = "customer" | "provider" | "referee";

// Works out who this wallet is in a deal, using the chain as the source of truth.
// The referee only gets access while a dispute is open or after it is resolved.
export async function roleFor(
  id: bigint,
  address: Address
): Promise<{ role: Role | null; status: number }> {
  const d = await chainClient.readContract({
    address: ADDRESSES.elyMarket,
    abi: elyMarketAbi,
    functionName: "deals",
    args: [id],
  });

  const customer = d[0];
  const provider = d[1];
  const status = Number(d[7]);

  if (customer === ZERO) return { role: null, status: 0 };

  const me = address.toLowerCase();
  if (me === customer.toLowerCase()) return { role: "customer", status };
  if (me === provider.toLowerCase()) return { role: "provider", status };

  if (status === 5 || status === 6) {
    const referee = await chainClient.readContract({
      address: ADDRESSES.elyMarket,
      abi: elyMarketAbi,
      functionName: "referee",
    });
    if (referee.toLowerCase() === me) return { role: "referee", status };
  }

  return { role: null, status };
}