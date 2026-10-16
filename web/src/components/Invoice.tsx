"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { buildShareMessage } from "@/lib/share";
import { useFeeText } from "@/lib/useFee";

type Props = {
  amount: string;
  memo: string;
  payTo?: string;
  linkId: bigint | null;
  onReset: () => void;
};

function formatAmount(value: string) {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

function short(address?: string) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Your wallet";
}

export default function Invoice({ amount, memo, payTo, linkId, onReset }: Props) {
  const [copied, setCopied] = useState(false);
  const feeText = useFeeText();

  const shown = formatAmount(amount);
  const live = linkId !== null;
  const url = live ? `${window.location.origin}/pay/${linkId.toString()}` : "";
  const message = buildShareMessage({ amount: shown, memo, url });
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(message)}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="invoice">
      <div className="inv-head">
        <span className="inv-title">Payment request</span>
        <span className={live ? "status status-live" : "status"}>
          {live ? "Link live" : "Draft"}
        </span>
      </div>

      <p className="inv-label">Amount due</p>
      <p className={shown ? "amount" : "amount amount-open"}>
        {shown ?? "Payer chooses"}
        {shown && <span className="unit">USDC</span>}
      </p>

      <dl className="inv-rows">
        <div className="row">
          <dt>Description</dt>
          <dd>{memo || "None"}</dd>
        </div>
        <div className="row">
          <dt>Pay to</dt>
          <dd>{short(payTo)}</dd>
        </div>
        <div className="row">
          <dt>Network</dt>
          <dd>Elysium Testnet</dd>
        </div>
        <div className="row">
          <dt>Fee</dt>
          <dd>{feeText}</dd>
        </div>
      </dl>

      {live ? (
        <div className="share">
          <div className="qr">
            <QRCodeSVG
              value={url}
              size={132}
              level="M"
              bgColor="#FFFFFF"
              fgColor="#0F201D"
            />
          </div>
          <div>
            <p className="url">{url}</p>
            <div className="actions">
              <button className="btn btn-primary" onClick={copy}>
                {copied ? "Copied" : "Copy link"}
              </button>
              <a
                className="btn btn-secondary"
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
              >
                Share on WhatsApp
              </a>
              <button className="link-button" onClick={onReset}>
                Make another link
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="slot">
          Your link and QR code appear here after you create it.
        </div>
      )}
    </div>
  );
}