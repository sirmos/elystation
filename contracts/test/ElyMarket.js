const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const ONE = 10n ** 6n;
const DAY = 24 * 60 * 60;

const profile = {
  name: "Sam Rivera",
  headline: "Mobile mechanic",
  category: "Auto repair",
  city: "Lisbon, Portugal",
  bio: "Roadside repairs and engine checks.",
  contact: "",
};

async function setup() {
  const [owner, provider, customer, other] = await ethers.getSigners();
  const usdc = await ethers.deployContract("MockUSDC");
  const market = await ethers.deployContract("ElyMarket", [
    await usdc.getAddress(),
    owner.address,
    50,
    600,
  ]);
  await usdc.connect(customer).faucet();
  await usdc
    .connect(customer)
    .approve(await market.getAddress(), ethers.MaxUint256);
  return { owner, provider, customer, other, usdc, market };
}

async function openDeal(market, customer, provider, amount, seconds = 7 * DAY) {
  const now = await time.latest();
  await market
    .connect(customer)
    .createDeal(provider.address, amount, "Roadside repair", now + seconds);
}

describe("ElyMarket", function () {
  it("saves a profile and services", async function () {
    const { market, provider } = await setup();
    await market.connect(provider).setProfile(profile);
    await market.connect(provider).addService("Roadside repair", 80n * ONE);

    const stored = await market.profiles(provider.address);
    expect(stored.name).to.equal("Sam Rivera");

    const services = await market.getServices(provider.address);
    expect(services.length).to.equal(1);
    expect(services[0].title).to.equal("Roadside repair");
    expect(services[0].price).to.equal(80n * ONE);
  });

  it("needs a profile before adding a service", async function () {
    const { market, other } = await setup();
    await expect(
      market.connect(other).addService("Tutoring", 20n * ONE)
    ).to.be.revertedWith("Create a profile first");
  });

  it("holds the money, then pays the provider on release", async function () {
    const { owner, provider, customer, usdc, market } = await setup();
    await openDeal(market, customer, provider, 80n * ONE);

    expect(await usdc.balanceOf(await market.getAddress())).to.equal(80n * ONE);

    await market.connect(provider).markDelivered(1);
    await market.connect(customer).release(1);

    expect(await usdc.balanceOf(provider.address)).to.equal(79_600_000n);
    expect(await usdc.balanceOf(owner.address)).to.equal(400_000n);
    expect(await usdc.balanceOf(await market.getAddress())).to.equal(0n);
    expect(await market.jobsCompleted(provider.address)).to.equal(1n);
    expect(await market.totalEarned(provider.address)).to.equal(79_600_000n);
  });

  it("lets anyone release after the review window", async function () {
    const { provider, customer, other, usdc, market } = await setup();
    await openDeal(market, customer, provider, 80n * ONE);
    await market.connect(provider).markDelivered(1);

    await expect(market.connect(other).claimAfterReview(1)).to.be.revertedWith(
      "Review window is open"
    );

    await time.increase(601);
    await market.connect(other).claimAfterReview(1);
    expect(await usdc.balanceOf(provider.address)).to.equal(79_600_000n);
  });

  it("refunds the customer after the deadline if nothing was delivered", async function () {
    const { provider, customer, usdc, market } = await setup();
    await openDeal(market, customer, provider, 80n * ONE, 1000);

    await expect(market.connect(customer).refund(1)).to.be.revertedWith(
      "Refund not allowed"
    );

    await time.increase(1001);
    await market.connect(customer).refund(1);
    expect(await usdc.balanceOf(customer.address)).to.equal(1000n * ONE);
  });

  it("does not let the customer refund a delivered job", async function () {
    const { provider, customer, market } = await setup();
    await openDeal(market, customer, provider, 80n * ONE, 1000);
    await market.connect(provider).markDelivered(1);

    await time.increase(1001);
    await expect(market.connect(customer).refund(1)).to.be.revertedWith(
      "Refund not allowed"
    );
  });

  it("lets the provider refund any open deal", async function () {
    const { provider, customer, usdc, market } = await setup();
    await openDeal(market, customer, provider, 80n * ONE);
    await market.connect(provider).refund(1);
    expect(await usdc.balanceOf(customer.address)).to.equal(1000n * ONE);
  });

  it("blocks release from anyone but the customer", async function () {
    const { provider, customer, other, market } = await setup();
    await openDeal(market, customer, provider, 80n * ONE);
    await expect(market.connect(other).release(1)).to.be.revertedWith(
      "Not the customer"
    );
  });

  it("blocks hiring yourself", async function () {
    const { provider, usdc, market } = await setup();
    const now = await time.latest();
    await usdc.connect(provider).faucet();
    await usdc
      .connect(provider)
      .approve(await market.getAddress(), ethers.MaxUint256);
    await expect(
      market
        .connect(provider)
        .createDeal(provider.address, 80n * ONE, "Mine", now + DAY)
    ).to.be.revertedWith("Bad provider");
  });

  it("charges a lower fee to providers who hold the discount token", async function () {
    const { owner, provider, customer, usdc, market } = await setup();
    const token = await ethers.deployContract("MockUSDC");
    await market.connect(owner).setDiscount(await token.getAddress(), 100n * ONE, 20);
    await token.connect(provider).faucet();

    await openDeal(market, customer, provider, 80n * ONE);
    await market.connect(customer).release(1);

    expect(await usdc.balanceOf(provider.address)).to.equal(79_840_000n);
    expect(await usdc.balanceOf(owner.address)).to.equal(160_000n);
  });
});