import Link from "next/link";
import ConnectButton from "./ConnectButton";
import Logo from "./Logo";
import Nav from "./Nav";
import { LINKS } from "@/lib/links";

export default function Header() {
  return (
    <>
      <div className="banner">
        Testnet only. Funds on this network have no value.{" "}
        <a href={LINKS.faucet} target="_blank" rel="noreferrer">
          Get free test HYPE for network fees
        </a>
      </div>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <Link href="/" className="brand" aria-label="Home">
            <Logo />
          </Link>
          <Nav />
          <ConnectButton />
        </div>
      </header>
    </>
  );
}