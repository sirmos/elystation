"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { elysiumTestnet } from "@/lib/chain";

function short(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();

  if (!isConnected) {
    return (
      <button
        className="btn btn-primary"
        disabled={isPending}
        onClick={() => connect({ connector: connectors[0] })}
      >
        {isPending ? "Check your wallet" : "Connect wallet"}
      </button>
    );
  }

  if (chainId !== elysiumTestnet.id) {
    return (
      <button
        className="btn btn-primary"
        disabled={switching}
        onClick={() => switchChain({ chainId: elysiumTestnet.id })}
      >
        Switch to Elysium
      </button>
    );
  }

  return (
    <button
      className="btn btn-secondary"
      title="Disconnect"
      onClick={() => disconnect()}
    >
      <span className="dot" aria-hidden="true" />
      {short(address as string)}
    </button>
  );
}