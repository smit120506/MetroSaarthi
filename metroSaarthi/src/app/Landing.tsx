import { Link } from "react-router"

export default function Landing() {
  return (
    <main className="portal-landing">
      <header className="landing-brand">
        <div className="brand-mark">M</div>
        <div>
          <strong>MetroSaarthi</strong>
          <span>Every Complaint Heard. Every Priority Clear.</span>
        </div>
      </header>
      <section className="landing-intro">
        <span>EVERY COMPLAINT HEARD</span>
        <h1>Welcome to MetroSaarthi</h1>
        <p>Choose your workspace to continue.</p>
      </section>
      <section className="portal-choices">
        <Link to="/passenger/login" className="portal-choice passenger-choice">
          <div className="portal-card-icon passenger-card-icon">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <rect x="8" y="7" width="32" height="31" rx="9" />
              <path d="M14 16h20v11H14zM16 38l-4 5m20-5 4 5" />
              <circle cx="16" cy="32" r="2" />
              <circle cx="32" cy="32" r="2" />
            </svg>
          </div>
          <div>
            <small>FOR PASSENGERS</small>
            <h2>Passenger Portal</h2>
            <p>Report issues, track complaints, and stay informed.</p>
          </div>
          <strong className="portal-card-action">
            Continue as Passenger <span>→</span>
          </strong>
        </Link>
        <Link to="/operator/login" className="portal-choice operator-choice">
          <div className="portal-card-icon operator-card-icon">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <path d="M24 4 40 10v11c0 11-6 18-16 23C14 39 8 32 8 21V10l16-6Z" />
              <path d="m17 24 5 5 10-12" />
            </svg>
          </div>
          <div>
            <small>AUTHORIZED STAFF</small>
            <h2>Operator Portal</h2>
            <p>
              Manage complaints, review priorities, and coordinate resolutions.
            </p>
          </div>
          <strong className="portal-card-action">
            Operator Login <span>→</span>
          </strong>
        </Link>
      </section>
      <footer className="landing-footer">
        <span>Local demonstration only</span>
        <p>
          No complaint is transmitted to metro staff without a connected
          synchronization backend.
        </p>
      </footer>
    </main>
  )
}
