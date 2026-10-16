import { parseAbi } from "viem";

export const ADDRESSES = {
  usdc: "0x4CD746962FEFEFfa2fcc5cced7B27BC47FE3890B",
  elyPay: "0x68Aa5b7A6A755b2FcfB1a94E253E4Ab92Ad9cBb4",
} as const;

export const USDC_DECIMALS = 6;

// Block where ElyPay was created. Open the contract on the explorer,
// click the creation transaction, and copy its block number here.
// Zero works, but the network may reject a search that wide.
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

export const usdcAbi = parseAbi([
  "function faucet()",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
]);