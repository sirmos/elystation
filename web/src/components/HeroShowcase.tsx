"use client";

import { formatUnits } from "viem";
import { QRCodeSVG } from "qrcode.react";
import { USDC_DECIMALS } from "@/lib/contracts";
import { useActivity } from "@/lib/useActivity";

function money(value: bigint) {
  const n = Number(formatUnits(value, USDC_DECIMALS));
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

export default function HeroShowcase() {
  const activity = useActivity();
  const latest = activity?.latest ?? null;

  const amount = latest ? money(latest.amount) : "50.00";
  const memo = latest ? latest.memo || "No description" : "Logo design";
  const fee = latest ? `${money(latest.fee)} USDC` : "0.25 USDC";

  const note =
    activity && activity.payments > 0
      ? `Live from Elysium testnet: ${activity.links} links, ${activity.payments} payments, ${money(activity.volume)} test USDC`
      : "Example";

  return (
    <div className="showcase">
      <div className="invoice invoice-glass mock mock-back" aria-hidden="true">
        <div className="inv-head">
          <span className="inv-title">Payment receipt</span>
          <span className="status status-live">Paid</span>
        </div>
        <p className="inv-label">Amount paid</p>
        <p className="amount">
          {amount}
          <span className="unit">USDC</span>
        </p>
        <dl className="inv-rows">
          <div className="row">
            <dt>Description</dt>
            <dd>{memo}</dd>
          </div>
          <div className="row">
            <dt>Fee</dt>
            <dd>{fee}</dd>
          </div>
        </dl>
      </div>

      <div className="invoice mock mock-front" aria-hidden="true">
        <div className="inv-head">
          <span className="inv-title">Payment request</span>
          <span className="status">Example</span>
        </div>
        <p className="inv-label">Amount due</p>
        <p className="amount">
          120.00<span className="unit">USDC</span>
        </p>
        <dl className="inv-rows">
          <div className="row">
            <dt>Description</dt>
            <dd>Website design</dd>
          </div>
          <div className="row">
            <dt>Network</dt>
            <dd>Elysium Testnet</dd>
          </div>
        </dl>
        <div className="share">
          <div className="qr">
            <QRCodeSVG
              value="https://elystation.vercel.app"
              size={84}
              level="M"
              bgColor="#FFFFFF"
              fgColor="#0B1F1C"
            />
          </div>
          <p className="url">Scan to pay, or open the link.</p>
        </div>
      </div>

      <p className="showcase-note">{note}</p>
    </div>
  );
}