import Directory from "@/components/Directory";

export default function ExplorePage() {
  return (
    <>
      <section className="page-band">
        <div className="wrap">
          <h1>Find someone to hire.</h1>
          <p>
            Browse people who offer services. Your payment waits in the contract
            and is released when the job is confirmed.
          </p>
        </div>
      </section>
      <div className="wrap page-lift">
        <Directory />
      </div>
    </>
  );
}