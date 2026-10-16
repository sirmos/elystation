const { expect } = require("chai");
const { ethers } = require("hardhat");

async function setup() {
  const [owner, alice, bob] = await ethers.getSigners();
  const usdc = await ethers.deployContract("MockUSDC");
  const pay = await ethers.deployContract("ElyPay", [
    await usdc.getAddress(),
    owner.address,
    50,
  ]);
  return { owner, alice, bob, usdc, pay };
}

describe("ElyPay", function () {
  it("pays a fixed link and splits the fee", async function () {
    const { owner, alice, bob, usdc, pay } = await setup();
    const amount = 10n * 10n ** 6n;

    await pay.connect(alice).createLink(amount, "Logo design");
    await usdc.connect(bob).faucet();
    await usdc.connect(bob).approve(await pay.getAddress(), amount);
    await pay.connect(bob).pay(1, 0);

    expect(await usdc.balanceOf(alice.address)).to.equal(9_950_000n);
    expect(await usdc.balanceOf(owner.address)).to.equal(50_000n);
  });

  it("lets the payer pick the amount on an open link", async function () {
    const { alice, bob, usdc, pay } = await setup();
    const amount = 20n * 10n ** 6n;

    await pay.connect(alice).createLink(0, "Tip jar");
    await usdc.connect(bob).faucet();
    await usdc.connect(bob).approve(await pay.getAddress(), amount);
    await pay.connect(bob).pay(1, amount);

    expect(await usdc.balanceOf(alice.address)).to.equal(19_900_000n);
  });

  it("blocks payment when the link is off", async function () {
    const { alice, bob, usdc, pay } = await setup();
    const amount = 5n * 10n ** 6n;

    await pay.connect(alice).createLink(amount, "Old invoice");
    await pay.connect(alice).setActive(1, false);
    await usdc.connect(bob).faucet();
    await usdc.connect(bob).approve(await pay.getAddress(), amount);

    await expect(pay.connect(bob).pay(1, 0)).to.be.revertedWith("Link is off");
  });

  it("only the owner can turn a link off", async function () {
    const { alice, bob, pay } = await setup();
    await pay.connect(alice).createLink(0, "Mine");
    await expect(pay.connect(bob).setActive(1, false)).to.be.revertedWith("Not your link");
  });

  it("rejects a fee above 1%", async function () {
    const { pay } = await setup();
    await expect(pay.setFee(101)).to.be.revertedWith("Fee too high");
  });
});