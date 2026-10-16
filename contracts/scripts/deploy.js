const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const usdc = await hre.ethers.deployContract("MockUSDC");
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();

  // Fee is 50 bps (0.5%). Treasury is the deployer for now.
  const pay = await hre.ethers.deployContract("ElyPay", [
    usdcAddress,
    deployer.address,
    50,
  ]);
  await pay.waitForDeployment();
  const payAddress = await pay.getAddress();

  const out = {
    network: hre.network.name,
    chainId: 99801,
    usdc: usdcAddress,
    elyPay: payAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  fs.mkdirSync("deployments", { recursive: true });
  fs.writeFileSync(`deployments/${hre.network.name}.json`, JSON.stringify(out, null, 2));
  console.log(out);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});