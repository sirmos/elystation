import { notFound } from "next/navigation";
import DealView from "@/components/DealView";

export default async function DealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d{1,18}$/.test(id)) notFound();

  return (
    <>
      <div className="band" aria-hidden="true" />
      <div className="wrap narrow lift-up">
        <DealView id={id} />
      </div>
    </>
  );
}