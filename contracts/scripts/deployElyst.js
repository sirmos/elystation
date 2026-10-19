const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const info = JSON.parse(
    fs.readFileSync(`deployments/${hre.network.name}-marketV2.json`, "utf8")
  );

  console.log("Deploying with:", deployer.address);

  const token = await hre.ethers.deployContract("MockELYST");
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  // The deployer owns ElyMarketV2. Providers who hold at least 100 ELYST
  // pay 0.20% instead of the standard 0.50%.
  const market = await hre.ethers.getContractAt("ElyMarketV2", info.elyMarketV2);
  const tx = await market.setDiscount(tokenAddress, 100n * 10n ** 18n, 20);
  await tx.wait();

  const out = {
    network: hre.network.name,
    chainId: 99801,
    elyst: tokenAddress,
    market: info.elyMarketV2,
    minBalance: "100 ELYST",
    discountFeeBps: 20,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    `deployments/${hre.network.name}-elyst.json`,
    JSON.stringify(out, null, 2)
  );
  console.log(out);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});