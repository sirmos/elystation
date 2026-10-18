import TokenView from "@/components/TokenView";

export default function TokenPage() {
  return (
    <>
      <section className="page-band">
        <div className="wrap">
          <h1>Elystation token plan.</h1>
          <p>
            Planned to launch through Ascend on Elysium. What the token is for,
            how it follows the Ascend lifecycle, and the usage we can already
            show.
          </p>
        </div>
      </section>
      <div className="wrap mid page-lift">
        <TokenView />
      </div>
    </>
  );
}