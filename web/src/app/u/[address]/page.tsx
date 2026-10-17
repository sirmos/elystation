import { notFound } from "next/navigation";
import type { Address } from "viem";
import ProfileView from "@/components/ProfileView";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) notFound();

  return (
    <>
      <div className="band" aria-hidden="true" />
      <div className="wrap narrow lift-up">
        <ProfileView address={address as Address} />
      </div>
    </>
  );
}