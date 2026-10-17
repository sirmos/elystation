import ProfileEditor from "@/components/ProfileEditor";

export default function ProfilePage() {
  return (
    <>
      <section className="page-band">
        <div className="wrap">
          <h1>Offer your services.</h1>
          <p>
            Create a profile, list what you do with fixed prices, and get hired
            with payment held until the job is done.
          </p>
        </div>
      </section>
      <div className="wrap narrow page-lift">
        <ProfileEditor />
      </div>
    </>
  );
}