import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <div className="band" aria-hidden="true" />
      <div className="pay-wrap">
        <div className="invoice">
          <h1 className="panel-title">Page not found</h1>
          <p className="panel-sub" style={{ marginTop: 8 }}>
            This address does not lead anywhere. Check the link and try again.
          </p>
          <div className="actions">
            <Link className="btn btn-primary" href="/">
              Go to home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}