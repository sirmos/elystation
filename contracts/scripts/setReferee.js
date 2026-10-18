const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const referee = process.env.REFEREE;
  if (!referee) {
    throw new Error("Set the REFEREE environment variable to the new referee address.");
  }

  const info = JSON.parse(
    fs.readFileSync(`deployments/${hre.network.name}-marketV2.json`, "utf8")
  );
  const market = await hre.ethers.getContractAt("ElyMarketV2", info.elyMarketV2);

  const tx = await market.setReferee(referee);
  await tx.wait();
  console.log("The referee is now", referee);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});