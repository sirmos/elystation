const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const existing = JSON.parse(
    fs.readFileSync(`deployments/${hre.network.name}.json`, "utf8")
  );

  console.log("Deploying with:", deployer.address);
  console.log("Using USDC at:", existing.usdc);

  // Fee is 50 bps (0.5%). The deployer is the owner, the treasury and the
  // referee for the beta.
  const market = await hre.ethers.deployContract("ElyMarketV2", [
    existing.usdc,
    deployer.address,
    50,
  ]);
  await market.waitForDeployment();

  // Testnet settings so you can show every step in a demo.
  // The dispute window is 15 minutes. Use 14 days before any use with money
  // that has value, and raise the minimum review time to 1 day.
  const tx = await market.setResolveWindow(900);
  await tx.wait();

  const address = await market.getAddress();
  const out = {
    network: hre.network.name,
    chainId: 99801,
    usdc: existing.usdc,
    elyMarketV2: address,
    deployer: deployer.address,
    referee: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    `deployments/${hre.network.name}-marketV2.json`,
    JSON.stringify(out, null, 2)
  );
  console.log(out);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});