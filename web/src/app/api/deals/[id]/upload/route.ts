import { adminClient, roleFor, verifyRequest } from "@/lib/server";

export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024;

type Ctx = { params: Promise<{ id: string }> };

// Gives the browser a one-time ticket to upload one file straight to storage.
export async function POST(req: Request, ctx: Ctx) {
  const db = adminClient();
  if (!db) return Response.json({ error: "not_configured" }, { status: 503 });

  const address = await verifyRequest(req);
  if (!address) return Response.json({ error: "auth" }, { status: 401 });

  const { id } = await ctx.params;
  if (!/^\d{1,18}$/.test(id)) {
    return Response.json({ error: "bad_id" }, { status: 400 });
  }

  const { role } = await roleFor(BigInt(id), address);
  if (role !== "customer" && role !== "provider") {
    return Response.json(
      { error: "forbidden", message: "Only the customer and the provider can upload files." },
      { status: 403 }
    );
  }

  const input = await req.json().catch(() => null);
  const fileName = String(input?.fileName ?? "");
  const fileType = String(input?.fileType ?? "");
  const size = Number(input?.size ?? 0);

  if (!fileType.startsWith("image/") && !fileType.startsWith("video/")) {
    return Response.json(
      { error: "type", message: "Attach a photo or a video." },
      { status: 400 }
    );
  }
  if (!size || size > MAX_BYTES) {
    return Response.json(
      { error: "size", message: "Files can be up to 25 MB." },
      { status: 400 }
    );
  }

  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "file";
  const path = `deal-${id}/${address.toLowerCase()}/${Date.now()}-${safe}`;

  const { data, error } = await db.storage
    .from("evidence")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return Response.json(
      { error: "storage", message: "Could not start the upload." },
      { status: 500 }
    );
  }

  return Response.json({ path, token: data.token });
}