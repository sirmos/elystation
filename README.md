# Elystation

Payment links and pay-when-done hiring in USDC on Elysium. Create a link with an amount and a note, share it by message or QR code, and get paid straight to your wallet. Or list a service, get hired, and have the customer's payment held by a contract until the job is confirmed.

Built for the **Ascend Builder Competition**. This is a testnet product. Funds on Elysium testnet have no value.

- Live site: https://elystation.vercel.app
- Community: https://discord.gg/ZTQUJGCa4y
- Telegram bot: https://t.me/elystation_bot
- Security notes: [SECURITY.md](SECURITY.md)

## How Elystation connects to Ascend

Ascend launches tokens on Elysium and supports them after launch. Elystation is built to launch through Ascend, and to bring the activity Ascend looks for.

- **One asset: USDC.** Payments, deals and fees are all in USDC, the asset Ascend launch pools trade against.
- **A hiring layer for Ascend builders.** Teams that launch on Ascend need designers, developers, moderators and marketers. They can hire and pay in USDC, with the money held until the work is done.
- **Usage anyone can check.** Every payment and job is public on the chain. The token page on the site shows live numbers such as unique wallets and volume.
- **Built for the lifecycle.** Launch, Ascended, HyperCore spot, then HIP-3. We plan to publish our allocation before launch and to use the creator fee option to set funds aside for a listing.

Token (draft): name Elystation, ticker ELYST, 1,000,000,000 fixed supply, launching through Ascend in a USDC pool. A test version is live on testnet: providers who hold 100 test ELYST pay 0.2% instead of 0.5% on services. This is built into the services contract. The token itself is not launched, and we make no promises about price or returns.

## What works today

Payment links
- Fixed or open amount, a short note, QR code, copy button and WhatsApp message.
- A pay page with a test USDC button, approve and pay, and a receipt.
- Links never hold funds. Money goes from the payer to the receiver.

Services and pay when done
- Profiles with unique @handles, up to 8 services each, and a directory with search and category filter. Categories include roles for Ascend builders.
- Hire someone: the payment goes into the contract and waits. The customer chooses the deadline and the review time from a list, or types a custom time.
- The provider marks the job delivered. The customer releases the payment, or it pays out automatically after the review time. If the provider never delivers, the customer takes the money back after the deadline.
- Disputes: the customer can open one during the review time. Both sides add public notes, and a referee can message either side before ruling. If the referee is late, anyone can split the money in half.
- Private messages and photo or video uploads for each deal, including job details for the provider. They are stored off the chain and access is checked with a wallet signature.
- Public counters per profile: jobs completed, USDC earned, disputes opened and lost.

Other
- Dashboard with jobs, orders and links, and a badge when something needs action.
- Token page with the plan, the live fee benefit and live usage numbers.
- Prices in your local currency (estimates), picked in the footer.
- Policies page: referee policy, terms and privacy.
- Telegram and Discord bots that run on free serverless hosting, so no computer has to stay on. Commands to look up deals, and alerts and reminders.
- A 0.5% fee, set in the contracts (maximum 1%).
- 46 automated contract tests.

## In development

- Signed wallet linking for the bots.
- Reviews and ratings.
- A referee panel instead of one wallet.
- More tests and a closer look at every contract function.

## Planned

- Token launch through Ascend.
- Using part of the fees to support the token, once Ascend shares the pool interface.
- An independent security audit before mainnet.
- A plugin so AI agents can create and pay links, through PayBox.

## Not built yet

- Buying USDC with local money. This needs a licensed partner, and none supports Elysium yet.
- Sign in with email.

## Network and contracts

- Network: Elysium Testnet, chain ID 99801
- RPC: https://testnet-rpc.elysium.kinetiq.xyz
- Explorer: https://elysium.kinetiq.xyz/testnet-explorer
- Faucet for test HYPE: https://elysium.kinetiq.xyz/testnet-faucet
- ElyPay (payment links): `0x68Aa5b7A6A755b2FcfB1a94E253E4Ab92Ad9cBb4`
- ElyMarketV2 (profiles, pay when done, disputes): `0x446d38615086cbD9DF9678B9C298E5181d1D14aC`
- MockUSDC (test token): `0x4CD746962FEFEFfa2fcc5cced7B27BC47FE3890B`
- Test ELYST: see `contracts/deployments/elysiumTestnet-elyst.json`

The contracts have automated tests but have not been audited. Do not use them with money that has value. In pay when done, the contract holds funds for a short time under fixed rules. The owner can change the fee (maximum 1%), the treasury, the referee, the review time limits, the dispute window and the discount token, but cannot move money held in a deal.

## Tech

- Contracts: Solidity 0.8.24, Hardhat, OpenZeppelin
- Web: Next.js, TypeScript, wagmi, viem
- Messages, files and bot data: Supabase (database and storage)
- Bots: serverless routes inside the website. Telegram and Discord call the site, and a free timer calls the scan route about once a minute.
- Hosting: Vercel

## Run it yourself

Contracts:

```bash
cd contracts
npm install
npx hardhat test
npx hardhat coverage
```

Web app:

```bash
cd web
npm install
npm run dev
```

For messages, files and the bots, create `web/.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. Without them, everything else still works and the message panel says it is not set up.

Bot setup: add `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `DISCORD_BOT_TOKEN`, `DISCORD_PUBLIC_KEY`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID` and `CRON_SECRET` in the hosting settings. Set the Telegram webhook to `/api/telegram`, the Discord interactions address to `/api/discord`, and point a free timer at `/api/cron/scan?secret=...`. Never commit these values.

There is also a local version of the bots in `bots/` that runs on your own computer with `npm start`. Stop it if you use the webhook, because Telegram can only send updates to one place.

## Repo layout

```
contracts/   Solidity contracts, tests, deploy scripts
web/         Next.js app, API routes and the serverless bots
bots/        Local version of the Telegram and Discord bots
SECURITY.md  Security notes and known limits
```