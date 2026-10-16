require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const key = process.env.DEPLOYER_PRIVATE_KEY;

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "paris",
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    elysiumTestnet: {
      url: process.env.ELYSIUM_RPC || "https://testnet-rpc.elysium.kinetiq.xyz",
      chainId: 99801,
      accounts: key ? [key] : [],
    },
  },
};