import { notFound } from "next/navigation";
import PayView from "@/components/PayView";

export default async function PayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d{1,18}$/.test(id)) notFound();

  return (
    <div className="pay-wrap">
      <PayView id={id} />
    </div>
  );
}
