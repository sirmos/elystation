type Input = {
  amount: string | null;
  memo: string;
  url: string;
};

export function buildShareMessage({ amount, memo, url }: Input) {
  const lines = [
    "Hello, here is your payment request.",
    "",
    `Amount: ${amount ? `${amount} USDC` : "You choose the amount"}`,
  ];

  if (memo) lines.push(`For: ${memo}`);

  lines.push("", "You can pay from your wallet at this link:", url, "", "Thank you.");

  return lines.join("\n");
}