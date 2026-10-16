import type { Metadata } from "next";
import { Newsreader, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Header from "@/components/Header";
import { ADDRESSES } from "@/lib/contracts";
import { BRAND } from "@/lib/brand";

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
    "Create a payment link, share it anywhere, and get paid in USDC straight to your wallet.",
};

const explorer = "https://elysium.kinetiq.xyz/testnet-explorer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <div className="backdrop" aria-hidden="true" />
        <Providers>
          <Header />
          <main>{children}</main>
          <footer className="footer">
            <div className="wrap footer-inner">
              <span>{BRAND.name} on Elysium testnet</span>
              <span className="footer-links">
                <a
                  href={`${explorer}/address/${ADDRESSES.elyPay}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Contract
                </a>
                <a href={explorer} target="_blank" rel="noreferrer">
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