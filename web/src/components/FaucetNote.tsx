import { LINKS } from "@/lib/links";

export default function FaucetNote() {
  return (
    <div className="callout">
      <span>
        This is a testnet. You need a little free test HYPE for network fees.
      </span>
      <a
        className="btn btn-primary btn-sm"
        href={LINKS.faucet}
        target="_blank"
        rel="noreferrer"
      >
        Get test HYPE
      </a>
    </div>
  );
}