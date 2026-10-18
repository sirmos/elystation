import { adminClient, roleFor, verifyRequest } from "@/lib/server";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  deal_id: number;
  sender: string;
  role: string;
  kind: string;
  audience: string;
  body: string;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
};

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const db = adminClient();
  if (!db) return Response.json({ error: "not_configured" }, { status: 503 });

  const address = await verifyRequest(req);
  if (!address) return Response.json({ error: "auth" }, { status: 401 });

  const { id } = await ctx.params;
  if (!/^\d{1,18}$/.test(id)) {
    return Response.json({ error: "bad_id" }, { status: 400 });
  }

  const { role } = await roleFor(BigInt(id), address);
  if (!role) return Response.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await db
    .from("messages")
    .select("*")
    .eq("deal_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return Response.json({ error: "db", message: error.message }, { status: 500 });
  }

  const me = address.toLowerCase();
  const rows = (data as Row[]).filter(
    (m) => m.audience === "all" || m.audience === role || m.sender === me
  );

  const messages = await Promise.all(
    rows.map(async (m) => {
      let fileUrl: string | null = null;
      if (m.file_path) {
        const signed = await db.storage
          .from("evidence")
          .createSignedUrl(m.file_path, 3600);
        fileUrl = signed.data?.signedUrl ?? null;
      }
      return {
        id: m.id,
        role: m.role,
        kind: m.kind,
        audience: m.audience,
        body: m.body,
        sender: m.sender,
        fileName: m.file_name,
        fileType: m.file_type,
        fileUrl,
        createdAt: m.created_at,
      };
    })
  );

  return Response.json({ role, messages });
}

export async function POST(req: Request, ctx: Ctx) {
  const db = adminClient();
  if (!db) return Response.json({ error: "not_configured" }, { status: 503 });

  const address = await verifyRequest(req);
  if (!address) return Response.json({ error: "auth" }, { status: 401 });

  const { id } = await ctx.params;
  if (!/^\d{1,18}$/.test(id)) {
    return Response.json({ error: "bad_id" }, { status: 400 });
  }

  const { role, status } = await roleFor(BigInt(id), address);
  if (!role) return Response.json({ error: "forbidden" }, { status: 403 });

  const input = await req.json().catch(() => null);
  if (!input) return Response.json({ error: "bad_body" }, { status: 400 });

  const text = String(input.body ?? "").trim().slice(0, 1000);
  const me = address.toLowerCase();

  let kind = "message";
  let audience = "all";

  if (role === "referee") {
    if (status !== 5) {
      return Response.json(
        { error: "closed", message: "The referee can write only while a dispute is open." },
        { status: 400 }
      );
    }
    kind = "referee_notice";
    if (input.audience === "customer" || input.audience === "provider") {
      audience = input.audience;
    }
  } else if (input.kind === "details" && role === "customer") {
    kind = "details";
  } else if (input.kind === "evidence" && status === 5) {
    kind = "evidence";
  }

  let filePath: string | null = null;
  if (input.filePath) {
    const prefix = `deal-${id}/${me}/`;
    if (typeof input.filePath !== "string" || !input.filePath.startsWith(prefix)) {
      return Response.json({ error: "bad_file" }, { status: 400 });
    }
    filePath = input.filePath;
  }

  if (!text && !filePath) {
    return Response.json(
      { error: "empty", message: "Write a message or attach a file." },
      { status: 400 }
    );
  }

  const { error } = await db.from("messages").insert({
    deal_id: Number(id),
    sender: me,
    role,
    kind,
    audience,
    body: text,
    file_path: filePath,
    file_name: filePath ? String(input.fileName ?? "").slice(0, 120) : null,
    file_type: filePath ? String(input.fileType ?? "").slice(0, 80) : null,
  });

  if (error) {
    return Response.json({ error: "db", message: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}