"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReadContract } from "wagmi";
import { elysiumTestnet } from "@/lib/chain";
import { ADDRESSES, elyMarketAbi } from "@/lib/contracts";
import { handleKey } from "@/lib/market";

const ZERO = "0x0000000000000000000000000000000000000000";

export default function HandleRedirect({ handle }: { handle: string }) {
  const router = useRouter();

  const query = useReadContract({
    address: ADDRESSES.elyMarket,
    abi: elyMarketAbi,
    functionName: "handleOwner",
    args: [handleKey(handle)],
    chainId: elysiumTestnet.id,
  });

  const owner = query.data;
  const found = !!owner && owner !== ZERO;

  useEffect(() => {
    if (found && owner) router.replace(`/u/${owner}`);
  }, [found, owner, router]);

  if (query.isLoading || found) {
    return (
      <div className="panel">
        <h2>Opening profile</h2>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>No one has @{handle}</h2>
      <p className="panel-note">
        This handle is free. Create a profile to claim it.
      </p>
      <div className="actions">
        <Link className="btn btn-secondary" href="/explore">
          Browse the directory
        </Link>
      </div>
    </div>
  );
}