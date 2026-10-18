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

async function openDeal(
  market,
  customer,
  provider,
  amount,
  seconds = 7 * DAY,
  review = 600
) {
  const now = await time.latest();
  await market
    .connect(customer)
    .createDeal(provider.address, amount, "Roadside repair", now + seconds, review);
}

async function openDispute(market, customer, provider) {
  await openDeal(market, customer, provider, 100n * ONE);
  await market.connect(provider).markDelivered(1);
  await market.connect(customer).openDispute(1, "The car still does not start");
}

describe("ElyMarketV2", function () {
  it("saves a profile and services", async function () {
    const { market, provider } = await setup();
    await market.connect(provider).setProfile(profile);
    await market.connect(provider).addService("Roadside repair", 80n * ONE);

    const stored = await market.profiles(provider.address);
    expect(stored.name).to.equal("Sam Rivera");

    const services = await market.getServices(provider.address);
    expect(services.length).to.equal(1);
    expect(services[0].price).to.equal(80n * ONE);
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
  });

  it("lets the customer choose the review time within the bounds", async function () {
    const { provider, customer, market } = await setup();
    const now = await time.latest();

    await expect(
      market
        .connect(customer)
        .createDeal(provider.address, 80n * ONE, "Too short", now + DAY, 30)
    ).to.be.revertedWith("Bad review time");

    await expect(
      market
        .connect(customer)
        .createDeal(provider.address, 80n * ONE, "Too long", now + DAY, 15 * DAY)
    ).to.be.revertedWith("Bad review time");
  });

  it("pays out automatically after the review time if nobody objects", async function () {
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

  it("lets the customer open a dispute inside the review time", async function () {
    const { provider, customer, market } = await setup();
    await openDispute(market, customer, provider);

    const deal = await market.deals(1);
    expect(deal.status).to.equal(5n);
    expect(await market.disputesOpened(customer.address)).to.equal(1n);
  });

  it("does not allow a dispute after the review time is over", async function () {
    const { provider, customer, market } = await setup();
    await openDeal(market, customer, provider, 100n * ONE);
    await market.connect(provider).markDelivered(1);
    await time.increase(601);

    await expect(
      market.connect(customer).openDispute(1, "Too late")
    ).to.be.revertedWith("Review window is over");
  });

  it("pauses the automatic payout during a dispute", async function () {
    const { provider, customer, other, market } = await setup();
    await openDispute(market, customer, provider);
    await time.increase(601);

    await expect(market.connect(other).claimAfterReview(1)).to.be.revertedWith(
      "Not delivered"
    );
  });

  it("lets only the parties add evidence", async function () {
    const { provider, customer, other, market } = await setup();
    await openDispute(market, customer, provider);

    await expect(market.connect(customer).addEvidence(1, "Photo link"))
      .to.emit(market, "EvidenceAdded")
      .withArgs(1, customer.address, "Photo link");

    await expect(market.connect(other).addEvidence(1, "Hello")).to.be.revertedWith(
      "Not in this deal"
    );
  });

  it("lets the referee split the money and updates the counters", async function () {
    const { owner, provider, customer, usdc, market } = await setup();
    await openDispute(market, customer, provider);

    await market.connect(owner).resolve(1, 7000, "Work was mostly done");

    expect(await usdc.balanceOf(provider.address)).to.equal(69_650_000n);
    expect(await usdc.balanceOf(customer.address)).to.equal(930n * ONE);
    expect(await usdc.balanceOf(owner.address)).to.equal(350_000n);
    expect(await usdc.balanceOf(await market.getAddress())).to.equal(0n);

    const deal = await market.deals(1);
    expect(deal.status).to.equal(6n);
    expect(await market.disputesLost(customer.address)).to.equal(1n);
    expect(await market.disputesLost(provider.address)).to.equal(0n);
    expect(await market.jobsCompleted(provider.address)).to.equal(1n);
  });

  it("blocks anyone but the referee from ruling", async function () {
    const { provider, customer, other, market } = await setup();
    await openDispute(market, customer, provider);
    await expect(market.connect(other).resolve(1, 5000, "x")).to.be.revertedWith(
      "Not the referee"
    );
  });

  it("blocks a referee who is part of the deal", async function () {
    const { owner, provider, customer, market } = await setup();
    await openDispute(market, customer, provider);
    await market.connect(owner).setReferee(customer.address);

    await expect(
      market.connect(customer).resolve(1, 5000, "x")
    ).to.be.revertedWith("Referee has a conflict");
  });

  it("splits in half if the referee does not answer in time", async function () {
    const { owner, provider, customer, usdc, market } = await setup();
    await market.connect(owner).setResolveWindow(900);
    await openDispute(market, customer, provider);

    await expect(market.resolveAfterTimeout(1)).to.be.revertedWith(
      "Referee still has time"
    );

    await time.increase(901);
    await market.resolveAfterTimeout(1);

    expect(await usdc.balanceOf(provider.address)).to.equal(49_750_000n);
    expect(await usdc.balanceOf(customer.address)).to.equal(950n * ONE);
    expect(await market.disputesLost(customer.address)).to.equal(0n);
    expect(await market.disputesLost(provider.address)).to.equal(0n);
  });

  it("lets the customer settle a dispute by releasing", async function () {
    const { provider, customer, usdc, market } = await setup();
    await openDispute(market, customer, provider);

    await market.connect(customer).release(1);
    expect(await usdc.balanceOf(provider.address)).to.equal(99_500_000n);
  });

  it("lets the provider concede a dispute with a refund", async function () {
    const { provider, customer, usdc, market } = await setup();
    await openDispute(market, customer, provider);

    await market.connect(provider).refund(1);
    expect(await usdc.balanceOf(customer.address)).to.equal(1000n * ONE);
  });

  it("gives out unique handles", async function () {
    const { provider, other, market } = await setup();

    await expect(
      market.connect(provider).claimHandle("adetukunbo")
    ).to.be.revertedWith("Create a profile first");

    await market.connect(provider).setProfile(profile);
    await market.connect(other).setProfile(profile);

    await market.connect(provider).claimHandle("adetukunbo");
    expect(await market.handleOf(provider.address)).to.equal("adetukunbo");

    await expect(
      market.connect(other).claimHandle("adetukunbo")
    ).to.be.revertedWith("Handle taken");

    await expect(
      market.connect(other).claimHandle("Adetukunbo")
    ).to.be.revertedWith("Bad handle");

    await expect(market.connect(other).claimHandle("ab")).to.be.revertedWith(
      "Bad handle"
    );
  });

  it("frees the old handle when a wallet picks a new one", async function () {
    const { provider, other, market } = await setup();
    await market.connect(provider).setProfile(profile);
    await market.connect(other).setProfile(profile);

    await market.connect(provider).claimHandle("adetukunbo");
    await market.connect(provider).claimHandle("sam_r");
    await market.connect(other).claimHandle("adetukunbo");

    expect(await market.handleOf(other.address)).to.equal("adetukunbo");
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