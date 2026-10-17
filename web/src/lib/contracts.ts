import { parseAbi } from "viem";
import type { Address } from "viem";

export const ADDRESSES = {
  usdc: "0x4CD746962FEFEFfa2fcc5cced7B27BC47FE3890B" as Address,
  elyPay: "0x68Aa5b7A6A755b2FcfB1a94E253E4Ab92Ad9cBb4" as Address,
  // Paste the ElyMarket address from the deploy here.
  elyMarket: "0x89A9300104aeeDaD36FFd82E8E6defD3fa622011" as Address,
};

export const USDC_DECIMALS = 6;

// Block where the contracts were created. Zero works on this network.
export const DEPLOY_BLOCK = BigInt(0);

export const elyPayAbi = parseAbi([
  "function createLink(uint256 amount, string memo) returns (uint256 id)",
  "function pay(uint256 id, uint256 amount)",
  "function setActive(uint256 id, bool active)",
  "function feeBps() view returns (uint16)",
  "function links(uint256) view returns (address owner, uint256 amount, bool active, uint32 payments, uint256 totalReceived, string memo)",
  "event LinkCreated(uint256 indexed id, address indexed owner, uint256 amount, string memo)",
  "event Paid(uint256 indexed id, address indexed payer, address indexed receiver, uint256 amount, uint256 fee)",
]);

export const elyMarketAbi = parseAbi([
  "function setProfile((string name, string headline, string category, string city, string bio, string contact) p)",
  "function addService(string title, uint256 price)",
  "function setServiceActive(uint256 index, bool active)",
  "function getServices(address provider) view returns ((string title, uint256 price, bool active)[])",
  "function profiles(address) view returns (string name, string headline, string category, string city, string bio, string contact, uint64 updatedAt)",
  "function jobsCompleted(address) view returns (uint32)",
  "function totalEarned(address) view returns (uint256)",
  "function createDeal(address provider, uint256 amount, string title, uint64 deadline) returns (uint256 id)",
  "function markDelivered(uint256 id)",
  "function release(uint256 id)",
  "function claimAfterReview(uint256 id)",
  "function refund(uint256 id)",
  "function deals(uint256) view returns (address customer, address provider, uint256 amount, uint64 deadline, uint64 reviewEnds, uint8 status, string title)",
  "function feeBps() view returns (uint16)",
  "function reviewWindow() view returns (uint64)",
  "event ProfileSet(address indexed provider, string name, string headline, string category, string city)",
  "event DealCreated(uint256 indexed id, address indexed customer, address indexed provider, uint256 amount, uint64 deadline, string title)",
]);

export const usdcAbi = parseAbi([
  "function faucet()",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
]);