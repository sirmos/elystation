"use client";

import { useRef, useState } from "react";
import { useAccount } from "wagmi";
import { useDealChat } from "@/lib/useDealChat";
import type { ChatMessage } from "@/lib/useDealChat";

type Role = "customer" | "provider" | "referee";

type Props = {
  dealId: string;
  role: Role;
  status: number;
};

const LABEL: Record<string, string> = {
  customer: "Customer",
  provider: "Provider",
  referee: "Referee",
};

const AUDIENCE: Record<string, string> = {
  all: "to both sides",
  customer: "to the customer only",
  provider: "to the provider only",
};

function when(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Attachment({ m }: { m: ChatMessage }) {
  if (!m.fileUrl) {
    return m.fileName ? <p className="hint">File: {m.fileName}</p> : null;
  }
  if (m.fileType?.startsWith("image/")) {
    return (
      <a href={m.fileUrl} target="_blank" rel="noreferrer">
        <img className="msg-img" src={m.fileUrl} alt={m.fileName ?? "Attached photo"} />
      </a>
    );
  }
  if (m.fileType?.startsWith("video/")) {
    return <video className="msg-video" src={m.fileUrl} controls preload="metadata" />;
  }
  return (
    <a className="msg-file" href={m.fileUrl} target="_blank" rel="noreferrer">
      {m.fileName ?? "Open file"}
    </a>
  );
}

export default function DealChat({ dealId, role, status }: Props) {
  const chat = useDealChat(dealId, true);
  const { address } = useAccount();

  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [kind, setKind] = useState("message");
  const [audience, setAudience] = useState("all");
  const [sending, setSending] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const me = (address ?? "").toLowerCase();
  const details = [...chat.messages].reverse().find((m) => m.kind === "details");

  function pickFile(f: File | null) {
    setFileError("");
    if (!f) {
      setFile(null);
      return;
    }
    if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) {
      setFileError("Attach a photo or a video.");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setFileError("Files can be up to 25 MB.");
      return;
    }
    setFile(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !file) return;
    setSending(true);

    let sendKind: string | undefined;
    if (role !== "referee") {
      if (kind === "details") sendKind = "details";
      else if (status === 5) sendKind = "evidence";
      else sendKind = "message";
    }

    const ok = await chat.send({
      body: text,
      kind: sendKind,
      audience: role === "referee" ? audience : undefined,
      file,
    });

    setSending(false);
    if (ok) {
      setText("");
      setFile(null);
      setKind("message");
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="panel">
      <h2>Messages and files</h2>
      <p className="panel-note">
        {role === "referee"
          ? "Write to one side or to both before you rule. You can see everything the two sides sent."
          : "Only the customer, the provider and, if there is a dispute, the referee can read this. Messages and files are stored off the chain."}
      </p>

      {chat.state === "needs_sign" && (
        <div className="form-grid">
          <p className="hint">
            Sign one short message with your wallet to open the conversation. It
            costs no gas and does not send any money.
          </p>
          <button className="btn btn-primary" onClick={chat.signIn}>
            Sign in to see messages
          </button>
          {chat.error && <p className="notice">{chat.error}</p>}
        </div>
      )}

      {chat.state === "not_configured" && (
        <p className="notice">Messages are not set up yet.</p>
      )}

      {chat.state === "forbidden" && (
        <p className="notice">This wallet cannot read the messages for this deal.</p>
      )}

      {chat.state === "error" && (
        <p className="notice">We could not load the messages. Try again in a moment.</p>
      )}

      {chat.state === "ready" && (
        <>
          {details ? (
            <div className="details-box">
              <h3>Job details from the customer</h3>
              <p>{details.body}</p>
            </div>
          ) : role === "provider" && status === 1 ? (
            <p className="hint" style={{ marginTop: 14 }}>
              The customer has not sent job details yet. Ask for the address and
              any notes here.
            </p>
          ) : role === "customer" && (status === 1 || status === 2) ? (
            <div className="callout" style={{ marginTop: 16, marginBottom: 0 }}>
              <span>Send the provider the job details: where to go, a phone number and notes.</span>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setKind("details")}
              >
                Write details
              </button>
            </div>
          ) : null}

          <div className="chat-list">
            {chat.messages.length === 0 && (
              <p className="hint">No messages yet.</p>
            )}
            {chat.messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "referee"
                    ? "msg msg-ref"
                    : m.sender === me
                      ? "msg msg-mine"
                      : "msg"
                }
              >
                <div className="msg-head">
                  <strong>
                    {LABEL[m.role] ?? m.role}
                    {m.kind === "details" ? ", job details" : ""}
                    {m.kind === "evidence" ? ", evidence" : ""}
                    {m.role === "referee" ? `, ${AUDIENCE[m.audience] ?? ""}` : ""}
                  </strong>
                  <span>{when(m.createdAt)}</span>
                </div>
                {m.body && <p className="msg-body">{m.body}</p>}
                <Attachment m={m} />
              </div>
            ))}
          </div>

          <form className="composer" onSubmit={submit}>
            <textarea
              className="input"
              maxLength={1000}
              placeholder={
                role === "referee"
                  ? "Write a message. For example: please send your evidence in the next day."
                  : kind === "details"
                    ? "The address, a phone number and any notes for the provider."
                    : "Write a message"
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <div className="composer-row">
              {role === "customer" && (
                <select
                  className="input select"
                  aria-label="Type"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                >
                  <option value="message">Message</option>
                  <option value="details">Job details</option>
                </select>
              )}

              {role === "referee" && (
                <select
                  className="input select"
                  aria-label="Send to"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                >
                  <option value="all">Send to both sides</option>
                  <option value="customer">Send to the customer only</option>
                  <option value="provider">Send to the provider only</option>
                </select>
              )}

              {role !== "referee" && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => input.current?.click()}
                  >
                    Attach photo or video
                  </button>
                  <input
                    ref={input}
                    type="file"
                    accept="image/*,video/*"
                    className="sr-only"
                    onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                  />
                </>
              )}

              {file && (
                <span className="file-chip">
                  {file.name}
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => {
                      setFile(null);
                      if (input.current) input.current.value = "";
                    }}
                  >
                    Remove
                  </button>
                </span>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={sending || (!text.trim() && !file)}
              >
                {sending ? "Sending" : "Send"}
              </button>
            </div>

            {(fileError || chat.error) && (
              <p className="notice" role="alert">
                {fileError || chat.error}
              </p>
            )}
          </form>
        </>
      )}
    </div>
  );
}