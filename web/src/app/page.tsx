import CreateLinkForm from "@/components/CreateLinkForm";
import HeroShowcase from "@/components/HeroShowcase";

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

const next = [
  {
    title: "Services directory",
    text: "Find skilled people by category and city, and hire them in a few taps.",
    status: "In development",
  },
  {
    title: "Pay when done",
    text: "The contract holds your payment and releases it when the job is confirmed.",
    status: "In development",
  },
  {
    title: "Prices in your currency",
    text: "See every amount in your local currency before you pay.",
    status: "In development",
  },
  {
    title: "Elystation token",
    text: "Lower fees for holders. Launching through Ascend.",
    status: "Planned",
  },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="wrap hero-inner">
          <div>
            <h1>Send a link. Get paid in USDC.</h1>
            <p className="lede">
              Elystation turns a payment into a simple link with the amount,
              the reason and a receipt. No sign up. We never hold your money.
            </p>
            <div className="hero-cta">
              <a className="btn btn-mint" href="#create">
                Create a link
              </a>
              <a className="btn btn-ghost" href="#how">
                See how it works
              </a>
            </div>
          </div>
          <HeroShowcase />
        </div>
      </section>

      <div className="wrap">
        <div id="create" className="create">
          <CreateLinkForm />
        </div>

        <section className="facts-section">
          <div className="section-head">
            <h2>Simple for both sides</h2>
            <p>
              The person who gets paid and the person who pays see the same
              clear request.
            </p>
          </div>
          <div className="facts">
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
                Every payment is recorded on chain, so you and your customer
                can both check it.
              </p>
            </div>
          </div>
        </section>

        <section id="how" className="how">
          <div className="section-head">
            <h2>How it works</h2>
          </div>
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

        <section className="next">
          <div className="section-head">
            <h2>What we are building next</h2>
            <p>Payment links are the base. These are in progress.</p>
          </div>
          <ul className="next-list">
            {next.map((item) => (
              <li key={item.title} className="next-row">
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
                <span className="chip">{item.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="cta">
          <div>
            <h2>Create your first payment link.</h2>
            <p>It takes one wallet confirmation.</p>
          </div>
          <a className="btn btn-mint" href="#create">
            Create a link
          </a>
        </section>
      </div>
    </>
  );
}