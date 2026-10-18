# Elystation

Payment links and pay-when-done hiring in USDC on Elysium. Create a link with an amount and a note, share it by message or QR code, and get paid straight to your wallet. Or list a service, get hired, and have the customer's payment held by a contract until the job is confirmed.

Built for the **Ascend Builder Competition**. This is a testnet product. Funds on Elysium testnet have no value.

- Live site: https://elystation.vercel.app
- Community: https://discord.gg/ZTQUJGCa4y
- Telegram bot: https://t.me/elystation_bot

## How Elystation connects to Ascend

Ascend launches tokens on Elysium and supports them after launch. Elystation is built to launch through Ascend, and to bring the activity Ascend looks for.

- **One asset: USDC.** Payments, deals and fees are all in USDC, the asset Ascend launch pools trade against.
- **A hiring layer for Ascend builders.** Teams that launch on Ascend need designers, developers, moderators and marketers. They can hire and pay in USDC, with the money held until the work is done.
- **Usage anyone can check.** Every payment and job is public on the chain. The token page on the site shows live numbers such as unique wallets and volume.
- **Built for the lifecycle.** Launch, Ascended, HyperCore spot, then HIP-3. We plan to publish our allocation before launch and to use the creator fee option to set funds aside for a listing.

Token (draft): name Elystation, ticker ELYST, 1,000,000,000 fixed supply, launching through Ascend in a USDC pool. Providers who hold enough of the token pay a lower fee. This is built into the services contract and tested with a test token. The token is not launched, and we make no promises about price or returns.

## What works today

Payment links
- Fixed or open amount, a short note, QR code, copy button and WhatsApp message.
- A pay page with a test USDC button, approve and pay, and a receipt.
- Links never hold funds. Money goes from the payer to the receiver.

Services and pay when done
- Profiles with unique @handles, up to 8 services each, and a directory with search and category filter.
- Hire someone: the payment goes into the contract and waits. The customer chooses the deadline and the review time, or types a custom time.
- The provider marks the job delivered. The customer releases the payment, or it pays out automatically after the review time. If the provider never delivers, the customer takes the money back after the deadline.
- Disputes: the customer can open one during the review time. Both sides add notes, and a referee can message either side before ruling. If the referee is late, anyone can split the money in half.
- Private messages and photo or video uploads for each deal, including job details for the provider. They are stored off the chain and access is checked with a wallet signature.
- Public counters per profile: jobs completed, USDC earned, disputes opened and lost.

Other
- Dashboard with jobs, orders and links, and a badge when something needs action.
- Token page with the plan and live usage numbers.
- Telegram and Discord alert bots (beta).
- A 0.5% fee, set in the contracts (maximum 1%).

## In development

- Hosting the bots all day, and signed wallet linking.
- Prices in your local currency (estimates).
- Reviews and ratings.
- A referee panel instead of one wallet.

## Planned

- Token launch through Ascend, with lower fees for holders.
- Using part of the fees to support the token, once Ascend shares the pool interface.
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

The contracts have automated tests but have not been audited. Do not use them with money that has value. In pay when done, the contract holds funds for a short time under fixed rules. The owner can change the fee (maximum 1%), the treasury, the referee, the review time limits and the dispute window, but cannot move money held in a deal.

## Tech

- Contracts: Solidity 0.8.24, Hardhat, OpenZeppelin
- Web: Next.js, TypeScript, wagmi, viem
- Messages and files: Supabase (database and storage)
- Bots: Node.js, grammY, discord.js
- Hosting: Vercel

## Run it yourself

Contracts:

```bash
cd contracts
npm install
npx hardhat test
```

Web app:

```bash
cd web
npm install
npm run dev
```

For messages and files, create `web/.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. Without them, everything else still works and the message panel says it is not set up.

Bots:

```bash
cd bots
npm install
copy .env.example .env
npm start
```

Fill `bots/.env` first. The bots only read public chain data. Linking a wallet is not verified yet.

## Repo layout

```
contracts/   Solidity contracts, tests, deploy scripts
web/         Next.js app
bots/        Telegram and Discord bots
```