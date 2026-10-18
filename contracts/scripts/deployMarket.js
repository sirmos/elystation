const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const existing = JSON.parse(
    fs.readFileSync(`deployments/${hre.network.name}.json`, "utf8")
  );

  console.log("Deploying with:", deployer.address);
  console.log("Using USDC at:", existing.usdc);

  // Fee is 50 bps (0.5%). The review window is 600 seconds so you can
  // show auto release in a demo. Use a longer window, for example 3 days,
  // before any use with money that has value.
  const market = await hre.ethers.deployContract("ElyMarket", [
    existing.usdc,
    deployer.address,
    50,
    600,
  ]);
  await market.waitForDeployment();
  const address = await market.getAddress();

  const out = {
    network: hre.network.name,
    chainId: 99801,
    usdc: existing.usdc,
    elyMarket: address,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    `deployments/${hre.network.name}-market.json`,
    JSON.stringify(out, null, 2)
  );
  console.log(out);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});