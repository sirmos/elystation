import CreateLinkForm from "@/components/CreateLinkForm";

const icon = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export default function Home() {
  return (
    <div className="wrap">
      <section className="hero">
        <h1>Payment links for USDC.</h1>
        <p className="lede">
          Create a link, share it anywhere, and get paid straight to your
          wallet. No sign up. No middleman holding your money.
        </p>
      </section>

      <CreateLinkForm />

      <section className="facts">
        <div className="fact">
          <span className="fact-icon">
            <svg {...icon}>
              <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </span>
          <h3>Non-custodial</h3>
          <p>
            Payments go from the payer wallet to yours. We never hold your
            funds.
          </p>
        </div>
        <div className="fact">
          <span className="fact-icon">
            <svg {...icon}>
              <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
            </svg>
          </span>
          <h3>Built on Elysium</h3>
          <p>Made for speed on Elysium, a chain that settles to HyperEVM.</p>
        </div>
        <div className="fact">
          <span className="fact-icon">
            <svg {...icon}>
              <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
              <path d="M9 8h6M9 12h6" />
            </svg>
          </span>
          <h3>Public receipts</h3>
          <p>
            Every payment is recorded on chain, so you and your customer can
            both check it.
          </p>
        </div>
      </section>

      <section className="how">
        <h2>How it works</h2>
        <div className="steps">
          <div className="step">
            <span className="step-num">1</span>
            <h3>Create a link</h3>
            <p>
              Enter an amount and a short description. Confirm once in your
              wallet.
            </p>
          </div>
          <div className="step">
            <span className="step-num">2</span>
            <h3>Share it</h3>
            <p>Send the link or the QR code by message, email or chat.</p>
          </div>
          <div className="step">
            <span className="step-num">3</span>
            <h3>Get paid</h3>
            <p>
              The payer sends USDC. It lands in your wallet, and both of you
              get a receipt.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}