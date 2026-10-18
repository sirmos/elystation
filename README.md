# Elystation

Payment links and pay-when-done services in USDC on Elysium. Create a link with an amount and a note, share it by message or QR code, and get paid straight to your wallet. Or list a service, get hired, and have the customer's payment held by a contract until the job is confirmed.

Live site: https://elystation.vercel.app

Built for the Ascend Builder Competition. This is a testnet product. Funds on Elysium testnet have no value.

## What works today

Payment links
- Create a link with a fixed or open amount and a short note.
- Share it with a copy button, a QR code, or a WhatsApp message.
- A pay page where the payer gets free test USDC, approves, and pays.
- A receipt with a Paid status, the fee, and a link to the transaction.
- Links never hold funds. Money goes from the payer to the receiver.

Services and pay when done
- Create a profile and list up to 8 services with fixed prices.
- A directory with search and category filter.
- Hire someone: the payment goes into the contract and waits.
- The provider marks the job delivered. The customer releases the payment, or it pays out automatically after a review time.
- If the provider never delivers, the customer can take the money back after the deadline.
- Jobs completed and USDC earned are counted on the chain for each provider.

Dashboard
- Jobs for you, your orders, and your payment links, read from the chain by wallet.
- A badge in the menu when something needs your action.

Other
- A live hero section that reads the latest payment and testnet totals.
- A 0.5% fee, set in the contracts (maximum 1%).

## In development

- Dispute help for pay when done. Today the provider is protected by the review time, but a customer who is unhappy has no way to open a dispute.
- Unique handles for profiles.
- Prices in your local currency (estimates).
- Telegram alerts for new jobs.

## Planned

- Elystation token, launching through Ascend, with lower fees for holders.
- Reviews and ratings.
- Discord bot.

## Not built yet

- Buying USDC with local money. This needs a licensed partner.
- Sign in with email.

## Network and contracts

- Network: Elysium Testnet, chain ID 99801
- RPC: https://testnet-rpc.elysium.kinetiq.xyz
- Explorer: https://elysium.kinetiq.xyz/testnet-explorer
- ElyPay (payment links): `0x68Aa5b7A6A755b2FcfB1a94E253E4Ab92Ad9cBb4`
- ElyMarket (profiles and pay when done): `0x89A9300104aeeDaD36FFd82E8E6defD3fa622011`
- MockUSDC (test token): `0x4CD746962FEFEFfa2fcc5cced7B27BC47FE3890B`

The contracts have tests but have not been audited. Do not use them with money that has value. In pay when done, the contract holds funds for a short time under fixed rules. The owner can change the fee (maximum 1%), the treasury, and the review time, but cannot move money held in a deal.

## Tech

- Contracts: Solidity 0.8.24, Hardhat, OpenZeppelin
- Web: Next.js, TypeScript, wagmi, viem
- Hosting: Vercel

## Run it yourself

Contracts:

```bash
cd contracts
npm install
npx hardhat test
```

To deploy, create `contracts/.env` with `DEPLOYER_PRIVATE_KEY` (a fresh test wallet) and run:

```bash
npx hardhat run scripts/deploy.js --network elysiumTestnet
npx hardhat run scripts/deployMarket.js --network elysiumTestnet
```

Web app:

```bash
cd web
npm install
npm run dev
```

Then open http://localhost:3000.

## Repo layout

```
contracts/   Solidity contracts, tests, deploy scripts
web/         Next.js app
bots/        Telegram and Discord bots (planned)
```