const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const ONE = 10n ** 6n;
const DAY = 24 * 60 * 60;

async function setup() {
  const [owner, provider, customer, other] = await ethers.getSigners();
  const usdc = await ethers.deployContract("MockUSDC");
  const market = await ethers.deployContract("ElyMarketV2", [
    await usdc.getAddress(),
    owner.address,
    50,
  ]);
  await usdc.connect(customer).faucet();
  await usdc
    .connect(customer)
    .approve(await market.getAddress(), ethers.MaxUint256);
  return { owner, provider, customer, other, usdc, market };
}

async function openDeal(market, customer, provider, amount) {
  const now = await time.latest();
  await market
    .connect(customer)
    .createDeal(provider.address, amount, "Job", now + 7 * DAY, 600);
}

describe("ElyMarketV2 safety checks", function () {
  it("lets only the owner change settings", async function () {
    const { other, market } = await setup();
    await expect(market.connect(other).setFee(10)).to.be.revertedWithCustomError(
      market,
      "OwnableUnauthorizedAccount"
    );
    await expect(
      market.connect(other).setReferee(other.address)
    ).to.be.revertedWithCustomError(market, "OwnableUnauthorizedAccount");
    await expect(
      market.connect(other).setTreasury(other.address)
    ).to.be.revertedWithCustomError(market, "OwnableUnauthorizedAccount");
  });

  it("cannot release the same deal twice", async function () {
    const { provider, customer, market } = await setup();
    await openDeal(market, customer, provider, 50n * ONE);
    await market.connect(customer).release(1);
    await expect(market.connect(customer).release(1)).to.be.revertedWith("Not open");
  });

  it("cannot refund a deal that was already paid", async function () {
    const { provider, customer, market } = await setup();
    await openDeal(market, customer, provider, 50n * ONE);
    await market.connect(customer).release(1);
    await expect(market.connect(provider).refund(1)).to.be.revertedWith(
      "Refund not allowed"
    );
  });

  it("rejects a zero amount", async function () {
    const { provider, customer, market } = await setup();
    const now = await time.latest();
    await expect(
      market.connect(customer).createDeal(provider.address, 0, "Job", now + DAY, 600)
    ).to.be.revertedWith("Amount is zero");
  });

  it("rejects a deadline in the past", async function () {
    const { provider, customer, market } = await setup();
    const now = await time.latest();
    await expect(
      market.connect(customer).createDeal(provider.address, 50n * ONE, "Job", now - 10, 600)
    ).to.be.revertedWith("Bad deadline");
  });

  it("rejects a deadline more than 90 days away", async function () {
    const { provider, customer, market } = await setup();
    const now = await time.latest();
    await expect(
      market
        .connect(customer)
        .createDeal(provider.address, 50n * ONE, "Job", now + 91 * DAY, 600)
    ).to.be.revertedWith("Bad deadline");
  });

  it("cannot pay out after the review time twice", async function () {
    const { provider, customer, other, market } = await setup();
    await openDeal(market, customer, provider, 50n * ONE);
    await market.connect(provider).markDelivered(1);
    await time.increase(601);
    await market.connect(other).claimAfterReview(1);
    await expect(market.connect(other).claimAfterReview(1)).to.be.revertedWith(
      "Not delivered"
    );
  });

  it("holds exactly the amount of the open deals", async function () {
    const { provider, customer, usdc, market } = await setup();
    await openDeal(market, customer, provider, 50n * ONE);
    await openDeal(market, customer, provider, 30n * ONE);
    expect(await usdc.balanceOf(await market.getAddress())).to.equal(80n * ONE);

    await market.connect(customer).release(1);
    expect(await usdc.balanceOf(await market.getAddress())).to.equal(30n * ONE);
  });

  it("falls back to the normal fee if the discount token is broken", async function () {
    const { owner, provider, customer, usdc, market } = await setup();
    // The market contract has no balanceOf function, so the check fails.
    await market.connect(owner).setDiscount(await market.getAddress(), 1, 20);

    await openDeal(market, customer, provider, 80n * ONE);
    await market.connect(customer).release(1);

    expect(await usdc.balanceOf(provider.address)).to.equal(79_600_000n);
  });

  it("rejects a discount fee above 1%", async function () {
    const { owner, market } = await setup();
    const token = await ethers.deployContract("MockUSDC");
    await expect(
      market.connect(owner).setDiscount(await token.getAddress(), 1, 101)
    ).to.be.revertedWith("Fee too high");
  });

  it("rejects review limits in the wrong order", async function () {
    const { owner, market } = await setup();
    await expect(market.connect(owner).setReviewBounds(600, 60)).to.be.revertedWith(
      "Bad bounds"
    );
  });
});