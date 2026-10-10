import { useEffect, useState } from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router"
import { useAuth } from "../auth/AuthContext"
import type { UserRole } from "../auth/demoAuth"

function LoginPage({ role }: { role: UserRole }) {
  const { session, loading: sessionLoading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const isOperator = role === "operator"
  const demoIdentifier = isOperator
    ? "operator@demo.local"
    : "passenger@demo.local"
  const demoPassword = isOperator ? "Operator@123" : "Passenger@123"

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
    }
  }, [])

  if (!sessionLoading && session) {
    return <Navigate to={`/${session.role}`} replace />
  }

  const completeLogin = async (
    loginIdentifier: string,
    loginPassword: string,
  ) => {
    setError("")
    setNotice("")
    setSubmitting(true)
    const result = await login(loginIdentifier, loginPassword, role)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error || "Authentication failed. Please try again.")
      return
    }
    navigate(`/${role}`, { replace: true })
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!identifier.trim()) {
      setError(
        isOperator
          ? "Enter your work email or operator ID."
          : "Enter your email address or mobile number.",
      )
      return
    }
    if (password.length < 8) {
      setError("Enter a password with at least eight characters.")
      return
    }
    await completeLogin(identifier, password)
  }

  const redirected =
    (location.state as { reason?: string } | null)?.reason === "signin"

  return (
    <div className={`login-page ${isOperator ? "operator-login" : ""}`}>
      <header className="login-header">
        <Link to="/" className="passenger-brand">
          <div className="passenger-logo">M</div>
          <div>
            <strong>MetroSaarthi</strong>
            <small>
              {isOperator ? "Operations access" : "Passenger access"}
            </small>
          </div>
        </Link>
        <span className={`login-network ${online ? "" : "offline"}`}>
          <i />
          {online ? "Online" : "Offline"}
        </span>
      </header>
      <main className="login-layout">
        <section className="login-story">
          <Link to="/" className="login-back">
            ← Back to portal selection
          </Link>
          <div className="login-illustration" aria-hidden="true">
            {isOperator ? <ShieldIllustration /> : <PassengerIllustration />}
          </div>
          <span>{isOperator ? "SECURE OPERATIONS" : "PASSENGER SUPPORT"}</span>
          <h1>
            {isOperator
              ? "Sign in to the operations workspace"
              : "Welcome back to MetroSaarthi"}
          </h1>
          <p>
            {isOperator
              ? "Review priorities, coordinate departments, and manage complaint resolution."
              : "Report metro issues and track complaints saved on this device."}
          </p>
          <div className="login-trust">
            <strong>Demo authentication mode</strong>
            <p>
              This hackathon build uses expiring, signed local sessions. A
              trusted backend is required for production security.
            </p>
          </div>
        </section>
        <section className="login-card">
          <div className="login-card-heading">
            <span>{isOperator ? "OPERATOR LOGIN" : "PASSENGER LOGIN"}</span>
            <h2>Sign in</h2>
            <p>
              {isOperator
                ? "Use an authorized operator identity."
                : "Use your demonstration passenger identity."}
            </p>
          </div>
          {redirected && (
            <div className="auth-info" role="status">
              Sign in is required to open this portal.
            </div>
          )}
          {!online && (
            <div className="auth-warning" role="alert">
              New sign-in requires a network connection. Previously verified
              sessions can continue offline until they expire.
            </div>
          )}
          <div className="demo-credentials">
            <div>
              <span>DEMO USERNAME</span>
              <strong>{demoIdentifier}</strong>
            </div>
            <div>
              <span>DEMO PASSWORD</span>
              <strong>{demoPassword}</strong>
            </div>
            <button
              type="button"
              disabled={submitting || !online}
              onClick={() => completeLogin(demoIdentifier, demoPassword)}
            >
              {submitting ? "Opening demo…" : "Enter with demo account"}
            </button>
          </div>
          <div className="auth-divider">
            <span>or sign in manually</span>
          </div>
          <form onSubmit={submit} noValidate>
            <label className="auth-field">
              <span>
                {isOperator
                  ? "Work email or operator ID"
                  : "Email or mobile number"}
              </span>
              <input
                value={identifier}
                onChange={(event) => {
                  setIdentifier(event.target.value)
                  setError("")
                }}
                autoComplete={isOperator ? "username" : "email"}
                placeholder={
                  isOperator
                    ? "Enter authorized operator ID"
                    : "Enter email or mobile"
                }
                autoFocus
              />
            </label>
            <label className="auth-field">
              <span>Password</span>
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setError("")
                  }}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}
            {notice && (
              <div className="auth-info" role="status">
                {notice}
              </div>
            )}
            <div className="auth-options">
              <span>Session expires after eight hours</span>
              <button
                type="button"
                onClick={() =>
                  setNotice(
                    "Password recovery requires a configured identity provider and is unavailable in demo mode.",
                  )
                }
              >
                Forgot password?
              </button>
            </div>
            <button
              className="auth-submit"
              disabled={submitting || !online}
              type="submit"
            >
              {submitting
                ? "Verifying…"
                : isOperator
                  ? "Open Operator Workspace"
                  : "Continue to Passenger Portal"}
            </button>
          </form>
          {!isOperator && (
            <div className="auth-register">
              <span>New to MetroSaarthi?</span>
              <button
                onClick={() =>
                  setNotice(
                    "Account registration requires a trusted backend and is unavailable in demo mode.",
                  )
                }
              >
                Create an account
              </button>
            </div>
          )}
          <small className="auth-footnote">
            Demo access is for prototype evaluation only.
          </small>
        </section>
      </main>
    </div>
  )
}

function PassengerIllustration() {
  return (
    <svg viewBox="0 0 180 120" role="img" aria-label="Metro passenger">
      <rect x="18" y="22" width="144" height="74" rx="18" />
      <path d="M42 96v12m96-12v12M46 42h88v30H46z" />
      <circle cx="53" cy="84" r="6" />
      <circle cx="127" cy="84" r="6" />
      <path d="M76 30h28M28 108h124" />
    </svg>
  )
}

function ShieldIllustration() {
  return (
    <svg viewBox="0 0 180 120" role="img" aria-label="Operations security">
      <path d="M90 12 145 31v35c0 28-20 43-55 51-35-8-55-23-55-51V31l55-19Z" />
      <path d="m65 64 17 17 34-37" />
      <path d="M16 103h38m72 0h38" />
    </svg>
  )
}

export function PassengerLogin() {
  return <LoginPage role="passenger" />
}

export function OperatorLogin() {
  return <LoginPage role="operator" />
}
