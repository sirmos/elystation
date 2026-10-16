"use client";

import { QRCodeSVG } from "qrcode.react";

export default function HeroShowcase() {
  return (
    <div className="showcase" aria-hidden="true">
      <div className="invoice invoice-glass mock mock-back">
        <div className="inv-head">
          <span className="inv-title">Payment receipt</span>
          <span className="status status-live">Paid</span>
        </div>
        <p className="inv-label">Amount paid</p>
        <p className="amount">
          50.00<span className="unit">USDC</span>
        </p>
        <dl className="inv-rows">
          <div className="row">
            <dt>Description</dt>
            <dd>Logo design</dd>
          </div>
          <div className="row">
            <dt>Fee</dt>
            <dd>0.25 USDC</dd>
          </div>
        </dl>
      </div>

      <div className="invoice mock mock-front">
        <div className="inv-head">
          <span className="inv-title">Payment request</span>
          <span className="status">Awaiting payment</span>
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

      <p className="showcase-note">Example</p>
    </div>
  );
}