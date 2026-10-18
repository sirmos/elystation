import RefereePanel from "@/components/RefereePanel";

export default function RefereePage() {
  return (
    <>
      <section className="page-band">
        <div className="wrap">
          <h1>Referee desk.</h1>
          <p>
            Open disputes, the evidence from both sides, and the ruling. Only
            the referee wallet can send a ruling.
          </p>
        </div>
      </section>
      <div className="wrap mid page-lift">
        <RefereePanel />
      </div>
    </>
  );
}