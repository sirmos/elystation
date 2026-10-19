const { expect } = require("chai");
const { ethers } = require("hardhat");

const ONE = 10n ** 6n;
const UNIT = 10n ** 18n;

describe("MockELYST and the fee discount", function () {
  it("gives 1,000 test tokens from the faucet", async function () {
    const [, user] = await ethers.getSigners();
    const token = await ethers.deployContract("MockELYST");
    await token.connect(user).faucet();
    expect(await token.balanceOf(user.address)).to.equal(1000n * UNIT);
  });

  it("lowers the fee for a provider who holds 100 ELYST", async function () {
    const [owner, provider, customer] = await ethers.getSigners();
    const usdc = await ethers.deployContract("MockUSDC");
    const market = await ethers.deployContract("ElyMarketV2", [
      await usdc.getAddress(),
      owner.address,
      50,
    ]);
    const token = await ethers.deployContract("MockELYST");

    await market.setDiscount(await token.getAddress(), 100n * UNIT, 20);
    await token.connect(provider).faucet();

    await usdc.connect(customer).faucet();
    await usdc
      .connect(customer)
      .approve(await market.getAddress(), ethers.MaxUint256);

    const block = await ethers.provider.getBlock("latest");
    await market
      .connect(customer)
      .createDeal(provider.address, 80n * ONE, "Job", block.timestamp + 86400, 600);
    await market.connect(customer).release(1);

    expect(await usdc.balanceOf(provider.address)).to.equal(79_840_000n);
    expect(await usdc.balanceOf(owner.address)).to.equal(160_000n);
  });
});