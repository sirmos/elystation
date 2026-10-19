# Security notes

Elystation is a testnet beta. The contracts have automated tests but have **not been audited**. Do not use them with money that has value.

## What the contracts protect

- **Payment links (ElyPay):** money goes from the payer to the receiver in one transaction. The contract never holds funds.
- **Pay when done (ElyMarketV2):** the contract holds a customer payment under fixed rules. The owner has no function that can move money held in a deal.
- **Fee limit:** the fee and the discount fee cannot be set above 1%.
- **Re-entry protection:** all functions that move money use a re-entrancy guard, set the final state before sending money, and use safe token transfers.
- **Referee conflict:** a referee cannot rule on a deal where they are the customer or the provider.
- **No stuck money:** a deal always has a way out: release, refund after the deadline, payout after the review time, a referee ruling, or an automatic 50/50 split if the referee is late.
- **Broken discount token:** if the discount token fails, payouts continue at the normal fee. The owner can only set a discount token that is a contract.

## What the owner can change

Fee (maximum 1%), treasury address, referee address, review time limits, dispute window, and the discount token. None of these can take money from open deals. Every change is an event on the chain.

## Known limits (be honest about these)

- **Trust in the referee.** During the beta the referee is one wallet. If that key is lost or stolen, disputes can be decided wrongly or not at all (after the dispute window, anyone can split the money in half). Plan: a panel with a shared wallet, then an independent service.
- **No audit yet.** An independent review is needed before mainnet.
- **Off-chain messages.** Messages and files are in a database, not on the chain. The project admin can read them. They are not end to end encrypted. Access is checked by a wallet signature that is valid for 24 hours.
- **Bots.** Wallet linking is not verified. Bots only read public data and never hold keys.
- **Public test faucets.** MockUSDC and the test ELYST token can be minted by anyone. They are for testnet only and must not be deployed to mainnet.
- **Owner key.** One key controls the settings and is also the referee and treasury. Before mainnet use a multi-signature wallet and a time lock on settings.
- **Counters can be inflated.** Someone can deal with their own second wallet to raise "jobs completed". It costs them the fee.

## Tests

```bash
cd contracts
npx hardhat test
npx hardhat coverage
```

The test files are in `contracts/test`: `ElyPay.js`, `ElyMarket.js`, `ElyMarketV2.js`, `ElyMarketV2Safety.js`, `MockELYST.js`.

## Before mainnet

1. Independent security audit of ElyPay and ElyMarketV2.
2. Move owner, treasury and referee to a multi-signature wallet, and add a time lock for settings.
3. Production settings: minimum review time 1 hour, dispute window 14 days.
4. Legal advice on holding customer funds for a short time, and on the token.
5. A bug bounty and a clear contact for reports.
6. Hosting plan and monitoring for the alert bots.

## Reporting a problem

Message the project in the Discord server: https://discord.gg/ZTQUJGCa4y. Please do not post details of a live problem in public channels.