export default function PoliciesPage() {
  return (
    <>
      <section className="page-band">
        <div className="wrap">
          <h1>Policies.</h1>
          <p>
            How disputes work, the terms for this testnet, and what we store.
            Plain words. These will be reviewed by a lawyer before any mainnet
            launch.
          </p>
        </div>
      </section>

      <div className="wrap narrow page-lift legal">
        <div className="panel" id="disputes">
          <h2>Referee policy</h2>
          <p>
            Pay when done holds a customer payment in a contract. If the work is
            not right, the customer can open a dispute during the review time.
          </p>
          <h3>How a dispute runs</h3>
          <ul>
            <li>The customer opens a dispute with a short reason. The automatic payout stops.</li>
            <li>Both sides can add public notes, saved on the chain, and send private messages, photos and videos.</li>
            <li>The referee can write to both sides or to one side first, for example to ask for evidence by a set time.</li>
            <li>The referee then picks a split, in steps of 5%, and writes a short reason. The ruling and reason are saved on the chain.</li>
            <li>The fee applies only to the provider part. The customer part has no fee.</li>
          </ul>
          <h3>What the referee looks at</h3>
          <ul>
            <li>The job description and the agreed price.</li>
            <li>The messages, photos, videos and public notes from both sides.</li>
            <li>Whether each side answered when asked.</li>
          </ul>
          <h3>Time and fairness</h3>
          <ul>
            <li>The referee has until the dispute window ends. On mainnet that is planned as 14 days. On this testnet it is 15 minutes so you can try it.</li>
            <li>If the referee does not rule in time, anyone can split the money in half.</li>
            <li>A referee cannot rule on a deal where they are the customer or the provider. The contract blocks it.</li>
            <li>During the beta the referee is the project owner wallet. We plan to move to a panel and later an independent service.</li>
            <li>Either side can settle early. The customer can release the payment. The provider can refund.</li>
          </ul>
        </div>

        <div className="panel" id="terms">
          <h2>Terms of use (testnet beta)</h2>
          <ul>
            <li>Elystation runs on Elysium testnet. Test tokens have no value. Do not send money that has value.</li>
            <li>The contracts are tested but not audited. Use them at your own risk.</li>
            <li>You control your own wallet. We cannot recover keys or reverse transactions.</li>
            <li>Payment links never hold funds. Pay when done holds funds in a contract under fixed rules. The owner cannot move money held in a deal.</li>
            <li>The owner can change settings such as the fee (maximum 1%), the review time limits and the referee. Changes are visible on the chain.</li>
            <li>Do not offer or order anything illegal. Do not post private details of other people. We may hide profiles from the directory view on this site, but we cannot remove data from the chain.</li>
            <li>Prices in other currencies are estimates only.</li>
            <li>This is not legal, tax or financial advice. Features and rules may change before launch.</li>
          </ul>
        </div>

        <div className="panel" id="privacy">
          <h2>Privacy: what is stored</h2>
          <h3>Public, on the chain, and it cannot be erased</h3>
          <ul>
            <li>Profiles, handles, services and prices.</li>
            <li>Deals, amounts, deadlines, public dispute notes, rulings and the counters on each profile.</li>
          </ul>
          <p>
            Do not put a phone number, a home address or anything private in a
            profile or a public note.
          </p>
          <h3>Private, stored off the chain</h3>
          <ul>
            <li>Messages, job details, photos and videos for a deal. They are in a database and file storage.</li>
            <li>Who can read them: the customer, the provider and, during a dispute, the referee. The project admin can also access the database. They are not end to end encrypted.</li>
            <li>Access is checked with a wallet signature, which costs no gas.</li>
            <li>You can ask us to delete the messages and files of a deal.</li>
          </ul>
          <h3>Bots</h3>
          <ul>
            <li>If you link a wallet in the Telegram or Discord bot, we store your chat ID and the wallet address so we can send alerts. Use /unlink to remove them.</li>
            <li>Linking is not verified yet, so anyone can watch any public wallet. The data is public anyway.</li>
          </ul>
          <h3>What we do not collect</h3>
          <ul>
            <li>No email, no password and no ID documents.</li>
            <li>Your browser saves your chosen currency and a short sign in signature for messages, on your own device.</li>
          </ul>
          <p>Questions or deletion requests: message us in the Discord server.</p>
        </div>
      </div>
    </>
  );
}