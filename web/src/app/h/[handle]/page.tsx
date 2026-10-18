import { notFound } from "next/navigation";
import HandleRedirect from "@/components/HandleRedirect";

export default async function HandlePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const clean = decodeURIComponent(handle).replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(clean)) notFound();

  return (
    <>
      <div className="band" aria-hidden="true" />
      <div className="wrap narrow lift-up">
        <HandleRedirect handle={clean} />
      </div>
    </>
  );
}