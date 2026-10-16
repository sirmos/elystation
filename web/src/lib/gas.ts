type BlockReader = {
  getBlock: () => Promise<{ baseFeePerGas: bigint | null }>;
};

// The wallet estimate can land just under the current base fee.
// We set the max fee to double the base fee so the transaction goes through.
export async function feeOverrides(client: BlockReader) {
  const block = await client.getBlock();
  const base = block.baseFeePerGas ?? BigInt(100000000);
  return {
    maxFeePerGas: base * BigInt(2),
    maxPriorityFeePerGas: BigInt(0),
  };
}