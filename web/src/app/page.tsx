import Link from "next/link";
import CreateLinkForm from "@/components/CreateLinkForm";
import HeroShowcase from "@/components/HeroShowcase";
import { LINKS } from "@/lib/links";

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

const roadmap = [
  {
    key: "live",
    phase: "Live on testnet",
    status: "Done",
    items: [
      "Payment links, QR code and WhatsApp sharing",
      "Services directory with profiles and unique handles",
      "Pay when done, with disputes and a referee",
      "Private messages, photos and videos for each deal",
      "Test ELYST token with a live fee benefit",
      "Prices in your local currency (estimates)",
      "Telegram and Discord alerts (beta)",
      "Token page with live usage, and a policies page",
    ],
  },
  {
    key: "dev",
    phase: "In development",
    status: "Building now",
    items: [
      "Free always-on hosting for the bots",
      "Signed wallet linking for the bots",
      "Reviews and ratings",
      "A referee panel instead of one wallet",
    ],
  },
  {
    key: "plan",
    phase: "Planned",
    status: "After the build",
    items: [
      "Elystation token (ELYST), launching through Ascend",
      "Part of the fees to support the token",
      "Security review before mainnet",
      "A plugin for AI agents, through PayBox",
    ],
  },
  {
    key: "later",
    phase: "Later",
    status: "Exploring",
    items: [
      "Local currency to USDC through a licensed partner",
      "Sign in with email",
      "Community panel for disputes",
      "Mobile app",
    ],
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
              the reason and a receipt. Hire people with your money held until
              the job is done. Built on Elysium for the Ascend ecosystem.
            </p>
            <div className="hero-cta">
              <a className="btn btn-mint" href="#create">
                Create a link
              </a>
              <Link className="btn btn-ghost" href="/explore">
                Find someone to hire
              </Link>
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
              <h3>Non-custodial links</h3>
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

        <section id="ascend" className="ascend">
          <div className="section-head">
            <h2>Built for Ascend on Elysium</h2>
            <p>
              Ascend launches tokens on Elysium and supports them after launch.
              Elystation is built to launch through Ascend, and to bring the
              kind of activity Ascend looks for.
            </p>
          </div>
          <div className="asc-grid">
            <div className="asc-item">
              <h3>One asset: USDC</h3>
              <p>
                Payments, deals and fees are all in USDC, the asset Ascend
                launch pools trade against. People who earn it here already
                hold what they need to buy tokens launched through Ascend.
              </p>
            </div>
            <div className="asc-item">
              <h3>A hiring layer for builders</h3>
              <p>
                Teams that launch on Ascend need designers, developers,
                moderators and marketers. Hire them here and pay in USDC, with
                the money held until the work is done.
              </p>
            </div>
            <div className="asc-item">
              <h3>Usage anyone can check</h3>
              <p>
                Every payment and job is public on the chain. Ascend looks at
                holders, volume and clean distribution. Our token page shows
                our live numbers.
              </p>
            </div>
          </div>
          <ol className="life">
            <li className="life-step">
              <strong>Launch</strong>
              Planned. A USDC pool, with the allocation published first.
            </li>
            <li className="life-step">
              <strong>Ascended</strong>
              Holders, volume and clean distribution.
            </li>
            <li className="life-step">
              <strong>HyperCore spot</strong>
              Part of our creator fee set aside for the listing.
            </li>
            <li className="life-step">
              <strong>HIP-3 perps</strong>
              Later, once spot liquidity exists.
            </li>
          </ol>
          <div className="asc-actions">
            <Link className="btn btn-primary" href="/token">
              See our token plan
            </Link>
            <a
              className="btn btn-secondary"
              href={LINKS.ascend}
              target="_blank"
              rel="noreferrer"
            >
              About Ascend
            </a>
          </div>
        </section>

        <section id="roadmap" className="roadmap">
          <div className="section-head">
            <h2>Roadmap</h2>
            <p>
              Payment links are the base. Here is what is live, what we are
              building, and what comes after.
            </p>
          </div>
          <div className="rm-track">
            {roadmap.map((stop) => (
              <div key={stop.key} className={`rm-col rm-${stop.key}`}>
                <span className="rm-node">
                  {stop.key === "live" && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#04201C"
                      strokeWidth="3.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  )}
                </span>
                <div className="rm-card">
                  <h3>{stop.phase}</h3>
                  <p className="rm-status">{stop.status}</p>
                  <ul className="rm-items">
                    {stop.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
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