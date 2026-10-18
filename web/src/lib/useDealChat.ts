"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { createClient } from "@supabase/supabase-js";

export type ChatMessage = {
  id: string;
  role: string;
  kind: string;
  audience: string;
  body: string;
  sender: string;
  fileName: string | null;
  fileType: string | null;
  fileUrl: string | null;
  createdAt: string;
};

type State =
  | "idle"
  | "needs_sign"
  | "ready"
  | "not_configured"
  | "forbidden"
  | "error";

const KEY = "ely-auth";

function loadAuth(address: string) {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const a = JSON.parse(raw);
    if (String(a.address).toLowerCase() !== address.toLowerCase()) return null;
    const m = /Expires: (\d+)$/.exec(String(a.message));
    if (!m || Number(m[1]) < Math.floor(Date.now() / 1000) + 60) return null;
    return a;
  } catch {
    return null;
  }
}

function header(address?: string) {
  if (!address) return null;
  const a = loadAuth(address);
  return a ? btoa(JSON.stringify(a)) : null;
}

// Messages and files for one deal. The wallet signs one short message
// (no gas) and that signature is kept for the browser session.
export function useDealChat(dealId: string, enabled: boolean) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const h = header(address);
    if (!h) {
      setState("needs_sign");
      return;
    }
    try {
      const res = await fetch(`/api/deals/${dealId}/messages`, {
        headers: { "x-ely-auth": h },
        cache: "no-store",
      });
      if (res.status === 503) return setState("not_configured");
      if (res.status === 401) {
        sessionStorage.removeItem(KEY);
        return setState("needs_sign");
      }
      if (res.status === 403) return setState("forbidden");
      if (!res.ok) return setState("error");
      const json = await res.json();
      setMessages(json.messages as ChatMessage[]);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [address, dealId]);

  useEffect(() => {
    if (!enabled || !address) return;
    refresh();
    const timer = setInterval(refresh, 8000);
    return () => clearInterval(timer);
  }, [enabled, address, refresh]);

  const signIn = useCallback(async () => {
    if (!address) return;
    setError("");
    try {
      const expires = Math.floor(Date.now() / 1000) + 24 * 3600;
      const message = `Elystation sign in\nAddress: ${address}\nExpires: ${expires}`;
      const signature = await signMessageAsync({ message });
      sessionStorage.setItem(KEY, JSON.stringify({ address, message, signature }));
      await refresh();
    } catch {
      setError("Signing was cancelled. Try again.");
    }
  }, [address, signMessageAsync, refresh]);

  const send = useCallback(
    async (input: {
      body: string;
      kind?: string;
      audience?: string;
      file?: File | null;
    }) => {
      const h = header(address);
      if (!h) {
        setState("needs_sign");
        return false;
      }
      setError("");

      try {
        let filePath: string | undefined;
        let fileName: string | undefined;
        let fileType: string | undefined;

        if (input.file) {
          const f = input.file;
          const ticketRes = await fetch(`/api/deals/${dealId}/upload`, {
            method: "POST",
            headers: { "x-ely-auth": h, "content-type": "application/json" },
            body: JSON.stringify({ fileName: f.name, fileType: f.type, size: f.size }),
          });
          if (!ticketRes.ok) {
            const j = await ticketRes.json().catch(() => ({}));
            setError(j.message ?? "Could not start the upload.");
            return false;
          }
          const ticket = await ticketRes.json();

          const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          if (!url || !anon) {
            setError("Uploads are not set up yet.");
            return false;
          }

          const sb = createClient(url, anon);
          const up = await sb.storage
            .from("evidence")
            .uploadToSignedUrl(ticket.path, ticket.token, f);
          if (up.error) {
            setError("The upload failed. Try a smaller file.");
            return false;
          }

          filePath = ticket.path;
          fileName = f.name;
          fileType = f.type;
        }

        const res = await fetch(`/api/deals/${dealId}/messages`, {
          method: "POST",
          headers: { "x-ely-auth": h, "content-type": "application/json" },
          body: JSON.stringify({
            body: input.body,
            kind: input.kind,
            audience: input.audience,
            filePath,
            fileName,
            fileType,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(j.message ?? "Could not send. Try again.");
          return false;
        }

        await refresh();
        return true;
      } catch {
        setError("Something went wrong. Try again.");
        return false;
      }
    },
    [address, dealId, refresh]
  );

  return { messages, state, error, signIn, send };
}