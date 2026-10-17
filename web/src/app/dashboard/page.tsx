import Dashboard from "@/components/Dashboard";

export default function DashboardPage() {
  return (
    <>
      <section className="page-band">
        <div className="wrap">
          <h1>Your dashboard.</h1>
          <p>
            Your jobs, your orders and your payment links, all in one place.
          </p>
        </div>
      </section>
      <div className="wrap mid page-lift">
        <Dashboard />
      </div>
    </>
  );
}