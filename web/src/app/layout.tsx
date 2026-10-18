import type { Metadata } from "next";
import Link from "next/link";
import { Newsreader, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import "./market.css";
import "./chat.css";
import "./ascend.css";
import Providers from "./providers";
import Header from "@/components/Header";
import { ADDRESSES } from "@/lib/contracts";
import { BRAND } from "@/lib/brand";
import { LINKS } from "@/lib/links";

const display = Newsreader({
  subsets: ["latin"],
  variable: "--ff-display",
});

const body = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--ff-body",
});

export const metadata: Metadata = {
  title: `${BRAND.name}: ${BRAND.tagline}`,
  description:
    "Payment links and pay-when-done hiring in USDC on Elysium. Built for the Ascend Builder Competition.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <Providers>
          <Header />
          <main>{children}</main>
          <footer className="footer">
            <div className="wrap footer-inner">
              <span>
                {BRAND.name} on Elysium testnet. Built for the Ascend Builder
                Competition.
              </span>
              <span className="footer-links">
                <Link href="/token">Token plan</Link>
                <Link href="/#roadmap">Roadmap</Link>
                <a href={LINKS.discord} target="_blank" rel="noreferrer">
                  Discord
                </a>
                <a href={LINKS.telegramBot} target="_blank" rel="noreferrer">
                  Telegram bot
                </a>
                <a href={LINKS.github} target="_blank" rel="noreferrer">
                  GitHub
                </a>
                <a
                  href={`${LINKS.explorer}/address/${ADDRESSES.elyMarket}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Contract
                </a>
                <a href={LINKS.explorer} target="_blank" rel="noreferrer">
                  Explorer
                </a>
              </span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}