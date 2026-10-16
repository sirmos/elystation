import Link from "next/link";
import ConnectButton from "./ConnectButton";
import Logo from "./Logo";

export default function Header() {
  return (
    <>
      <div className="banner">
        Testnet only. Funds on this network have no value.
      </div>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <Link href="/" className="brand" aria-label="Home">
            <Logo />
          </Link>
          <ConnectButton />
        </div>
      </header>
    </>
  );
}