import { useEffect, useMemo, useRef, useState } from "react"
import { Link, NavLink, useNavigate, useParams } from "react-router"
import { useAuth } from "../auth/AuthContext"
import { loadData, saveComplaint } from "../db"
import { makeComplaint, type Category, type Complaint } from "../model"

type UiLanguage = "English" | "हिन्दी" | "ગુજરાતી"

const copy = {
  English: {
    home: "Home",
    report: "Report issue",
    history: "My complaints",
    help: "Help",
    greeting: "How can we help today?",
    intro:
      "Report a metro issue in a few simple steps. Your complaint stays available on this device, even when you are offline.",
    start: "Register a Complaint",
    track: "Track my complaints",
  },
  हिन्दी: {
    home: "होम",
    report: "शिकायत करें",
    history: "मेरी शिकायतें",
    help: "सहायता",
    greeting: "आज हम आपकी कैसे मदद कर सकते हैं?",
    intro:
      "कुछ आसान चरणों में मेट्रो की समस्या बताएं। ऑफ़लाइन होने पर भी शिकायत इस डिवाइस पर सुरक्षित रहती है।",
    start: "शिकायत दर्ज करें",
    track: "मेरी शिकायतें देखें",
  },
  ગુજરાતી: {
    home: "હોમ",
    report: "ફરિયાદ કરો",
    history: "મારી ફરિયાદો",
    help: "મદદ",
    greeting: "આજે અમે તમને કેવી રીતે મદદ કરી શકીએ?",
    intro:
      "થોડાં સરળ પગલાંમાં મેટ્રોની સમસ્યા જણાવો. ઑફલાઇન હો ત્યારે પણ ફરિયાદ આ ઉપકરણ પર સુરક્ષિત રહે છે.",
    start: "ફરિયાદ નોંધાવો",
    track: "મારી ફરિયાદો જુઓ",
  },
}

const stations = [
  "Vastral Gam",
  "Apparel Park",
  "Old High Court",
  "Kalupur",
  "Shahpur",
  "Gheekanta",
  "Thaltej",
]

const categories: Array<{
  value: Exclude<Category, "Needs Review">
  label: string
  symbol: string
}> = [
  { value: "Safety", label: "Safety concern", symbol: "!" },
  { value: "Cleanliness", label: "Cleanliness", symbol: "✦" },
  { value: "Fare", label: "Fare or ticket", symbol: "₹" },
  { value: "Lifts & Escalators", label: "Lift or escalator", symbol: "↕" },
  { value: "Staff Behaviour", label: "Staff behaviour", symbol: "◎" },
]

function PassengerIcon({ children }: { children: React.ReactNode }) {
  return <span className="passenger-icon">{children}</span>
}

export default function PassengerPortal() {
  const { section = "home" } = useParams()
  const { session, logout } = useAuth()
  const [language, setLanguage] = useState<UiLanguage>("English")
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [online, setOnline] = useState(navigator.onLine)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const t = copy[language]

  useEffect(() => {
    loadData()
      .then((data) => setComplaints(data.complaints))
      .finally(() => setLoading(false))
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
    }
  }, [])

  const own = useMemo(
    () =>
      complaints
        .filter((item) => item.passengerSession === "demo-device")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [complaints],
  )

  const content = loading ? (
    <PassengerSkeleton />
  ) : section === "report" ? (
    <ReportForm
      onSaved={(complaint) => setComplaints((items) => [complaint, ...items])}
    />
  ) : section === "history" ? (
    <PassengerHistory complaints={own} />
  ) : section === "help" ? (
    <PassengerHelp />
  ) : (
    <PassengerHome t={t} complaints={own} online={online} />
  )

  return (
    <div className="passenger-portal">
      <header className="passenger-header">
        <Link to="/" className="passenger-brand">
          <div className="passenger-logo">M</div>
          <div>
            <strong>MetroSaarthi</strong>
            <small>Passenger help</small>
          </div>
        </Link>
        <nav className={menuOpen ? "open" : ""}>
          <NavLink to="/passenger" end onClick={() => setMenuOpen(false)}>
            {t.home}
          </NavLink>
          <NavLink to="/passenger/report" onClick={() => setMenuOpen(false)}>
            {t.report}
          </NavLink>
          <NavLink to="/passenger/history" onClick={() => setMenuOpen(false)}>
            {t.history}
          </NavLink>
          <NavLink to="/passenger/help" onClick={() => setMenuOpen(false)}>
            {t.help}
          </NavLink>
        </nav>
        <div className="passenger-tools">
          <label>
            <span className="sr-only">Language</span>
            <select
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value as UiLanguage)
              }
            >
              <option>English</option>
              <option>हिन्दी</option>
              <option>ગુજરાતી</option>
            </select>
          </label>
          <span className={`passenger-network ${online ? "" : "offline"}`}>
            <i />
            {online ? "Online" : "Offline"}
          </span>
          <button
            className="passenger-logout"
            title={`Signed in as ${session?.displayName || "Passenger"}`}
            onClick={() => {
              logout()
              window.location.replace("/")
            }}
          >
            Log out
          </button>
          <button
            className="passenger-menu"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label="Toggle navigation"
          >
            {menuOpen ? "×" : "☰"}
          </button>
        </div>
      </header>
      {!online && (
        <div className="passenger-offline">
          You are offline. New complaints will stay safely on this device.
        </div>
      )}
      <main className="passenger-main">{content}</main>
      <footer className="passenger-footer">
        <div>
          <strong>MetroSaarthi</strong>
          <span>Demonstration passenger portal</span>
        </div>
        <p>
          Local demonstration only. Records are not sent to metro staff because
          no synchronization backend is connected.
        </p>
      </footer>
    </div>
  )
}

function PassengerSkeleton() {
  return (
    <div className="passenger-skeleton" aria-label="Loading local complaints">
      <div />
      <div />
      <div />
      <section>
        <i />
        <i />
        <i />
      </section>
    </div>
  )
}

function PassengerHome({
  t,
  complaints,
  online,
}: {
  t: typeof copy[UiLanguage]
  complaints: Complaint[]
  online: boolean
}) {
  const latest = complaints[0]
  return (
    <>
      <section className="passenger-hero">
        <div>
          <span className="passenger-eyebrow">METRO PASSENGER SUPPORT</span>
          <h1>{t.greeting}</h1>
          <p>{t.intro}</p>
          <div className="passenger-hero-actions">
            <Link className="passenger-primary" to="/passenger/report">
              {t.start} <span>→</span>
            </Link>
            <Link className="passenger-secondary" to="/passenger/history">
              {t.track}
            </Link>
          </div>
        </div>
        <aside className="passenger-promise">
          <PassengerIcon>✓</PassengerIcon>
          <strong>Works without a network</strong>
          <p>
            Classification, reference creation, and saving happen privately on
            your device.
          </p>
          <div>
            <span>Device status</span>
            <b>{online ? "Ready" : "Offline ready"}</b>
          </div>
        </aside>
      </section>
      <section className="passenger-steps">
        <div>
          <span>01</span>
          <strong>Tell us what happened</strong>
          <p>Use English, Hindi, Gujarati, or everyday mixed language.</p>
        </div>
        <div>
          <span>02</span>
          <strong>Save your reference</strong>
          <p>A unique local reference is created as soon as you submit.</p>
        </div>
        <div>
          <span>03</span>
          <strong>Check local updates</strong>
          <p>Track status changes recorded in this demonstration workspace.</p>
        </div>
      </section>
      {latest && (
        <section className="passenger-latest">
          <div>
            <span>YOUR LATEST COMPLAINT</span>
            <h2>{latest.id}</h2>
            <p>{latest.complaintText}</p>
          </div>
          <div>
            <StatusChip status={latest.status} syncStatus={latest.syncStatus} />
            <Link to="/passenger/history">View details →</Link>
          </div>
        </section>
      )}
      <div className="passenger-demo-note">
        <strong>Synthetic demonstration</strong>
        <p>
          Example complaint history is fictional and does not represent actual
          metro operations or passengers.
        </p>
      </div>
    </>
  )
}

function ReportForm({ onSaved }: { onSaved: (complaint: Complaint) => void }) {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(1)
  const [text, setText] = useState("")
  const [station, setStation] = useState("")
  const [locationDetail, setLocationDetail] = useState("")
  const [category, setCategory] = useState<Category | "">("")
  const [attachmentName, setAttachmentName] = useState("")
  const [attachmentData, setAttachmentData] = useState("")
  const [error, setError] = useState("")
  const [saved, setSaved] = useState<Complaint | null>(null)

  const next = () => {
    if (step === 1 && !category) {
      setError("Select the type of complaint to continue.")
      return
    }
    if (step === 2 && !station) {
      setError("Select the metro station where this happened.")
      return
    }
    if (step === 3 && text.trim().length < 10) {
      setError("Please describe the issue in at least 10 characters.")
      return
    }
    setError("")
    setStep((value) => value + 1)
  }

  const readFile = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be smaller than 5 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setAttachmentName(file.name)
      setAttachmentData(String(reader.result))
      setError("")
    }
    reader.readAsDataURL(file)
  }

  const submit = async () => {
    const complaint = makeComplaint(text.trim(), station, {
      category: category || "Needs Review",
      assignedDepartment: category || "Needs Review",
      source: "passenger",
      passengerSession: "demo-device",
      locationDetail,
      attachmentName,
      attachmentData,
    })
    await saveComplaint(complaint)
    onSaved(complaint)
    setSaved(complaint)
  }

  if (saved) {
    return (
      <section className="passenger-confirmation">
        <PassengerIcon>✓</PassengerIcon>
        <span>SAVED ON THIS DEVICE</span>
        <h1>Thank you for reporting this issue</h1>
        <p>Keep this local reference to find your complaint on this device.</p>
        <div className="reference-box">
          <small>COMPLAINT REFERENCE</small>
          <strong>{saved.id}</strong>
          <button
            onClick={() => navigator.clipboard.writeText(saved.id)}
            className="passenger-secondary"
          >
            Copy reference
          </button>
        </div>
        <div className="confirmation-warning">
          <strong>Pending synchronization</strong>
          <p>
            No metro backend is connected. This complaint is stored locally and
            has not been transmitted to metro staff.
          </p>
        </div>
        <button
          className="passenger-primary"
          onClick={() => navigate("/passenger/history")}
        >
          View my complaints
        </button>
      </section>
    )
  }

  return (
    <section className="passenger-form-page">
      <div className="passenger-form-head">
        <span>REPORT A COMPLAINT</span>
        <h1>Tell us what happened</h1>
        <p>
          Your report is saved locally first. Required fields are marked with an
          asterisk.
        </p>
      </div>
      <div className="form-progress">
        {[1, 2, 3, 4, 5].map((item) => (
          <div className={item <= step ? "active" : ""} key={item}>
            <i>{item < step ? "✓" : item}</i>
            <span>
              {["Type", "Location", "Details", "Photo", "Review"][item - 1]}
            </span>
          </div>
        ))}
      </div>
      <div className="passenger-form-card">
        {step === 1 && (
          <fieldset className="category-picker category-picker-large">
            <legend>Select complaint type *</legend>
            <p>Choose the option that best matches your issue.</p>
            <div>
              {categories.map((item) => (
                <label
                  className={category === item.value ? "selected" : ""}
                  key={item.value}
                >
                  <input
                    type="radio"
                    name="category"
                    checked={category === item.value}
                    onChange={() => {
                      setCategory(item.value)
                      setError("")
                    }}
                  />
                  <PassengerIcon>{item.symbol}</PassengerIcon>
                  <span>{item.label}</span>
                  <b>›</b>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {step === 2 && (
          <>
            <label className="passenger-field">
              <span>Metro station *</span>
              <select
                value={station}
                onChange={(event) => {
                  setStation(event.target.value)
                  setError("")
                }}
              >
                <option value="">Choose a station</option>
                {stations.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="passenger-field location-field">
              <span>Location within station</span>
              <input
                value={locationDetail}
                onChange={(event) => setLocationDetail(event.target.value)}
                placeholder="For example: Platform 2, near Gate A"
              />
              <small>Optional, but helps staff understand the report.</small>
            </label>
          </>
        )}
        {step === 3 && (
          <label className="passenger-field">
            <span>Describe what happened *</span>
            <textarea
              rows={7}
              value={text}
              onChange={(event) => {
                setText(event.target.value)
                setError("")
              }}
              placeholder="For example: Lift bandh che near gate 2"
              autoFocus
            />
            <small>
              Write in English, हिन्दी, ગુજરાતી, or mixed language. Do not include
              personal payment information.
            </small>
          </label>
        )}
        {step === 4 && (
          <div className="photo-step">
            <div className="passenger-upload">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(event) => readFile(event.target.files?.[0])}
              />
              <PassengerIcon>+</PassengerIcon>
              <div>
                <strong>{attachmentName || "Add a photo (optional)"}</strong>
                <span>JPG, PNG, or WebP · maximum 5 MB · stored locally</span>
              </div>
              <button onClick={() => fileRef.current?.click()}>
                {attachmentName ? "Change" : "Choose photo"}
              </button>
            </div>
            {attachmentData && (
              <div className="photo-preview">
                <img src={attachmentData} alt="Selected complaint attachment" />
                <button
                  onClick={() => {
                    setAttachmentData("")
                    setAttachmentName("")
                  }}
                >
                  Remove photo
                </button>
              </div>
            )}
            <p className="photo-privacy">
              Photos remain on this device while synchronization is unavailable.
            </p>
          </div>
        )}
        {step === 5 && (
          <div className="passenger-review">
            <div>
              <span>COMPLAINT</span>
              <p>{text}</p>
            </div>
            <dl>
              <div>
                <dt>Station</dt>
                <dd>
                  {station}
                  {locationDetail ? ` · ${locationDetail}` : ""}
                </dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{category}</dd>
              </div>
              <div>
                <dt>Photo</dt>
                <dd>{attachmentName || "Not attached"}</dd>
              </div>
              <div>
                <dt>Saving</dt>
                <dd>Local device queue</dd>
              </div>
            </dl>
            <div className="passenger-review-note">
              Submitting creates a local reference. It does not claim delivery
              to metro staff.
            </div>
          </div>
        )}
        {error && <div className="passenger-error">{error}</div>}
        <div className="passenger-form-actions">
          {step > 1 && (
            <button
              className="passenger-secondary"
              onClick={() => setStep((value) => value - 1)}
            >
              Back
            </button>
          )}
          {step < 5 ? (
            <button className="passenger-primary" onClick={next}>
              Continue <span>→</span>
            </button>
          ) : (
            <button className="passenger-primary" onClick={submit}>
              Save complaint locally
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function PassengerHistory({ complaints }: { complaints: Complaint[] }) {
  const [expanded, setExpanded] = useState<string | null>(complaints[0]?.id)
  const [query, setQuery] = useState("")
  const filtered = complaints.filter((item) =>
    `${item.id} ${item.complaintText} ${item.station}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  )
  return (
    <section className="passenger-history">
      <div className="passenger-form-head">
        <span>LOCAL COMPLAINT HISTORY</span>
        <h1>My complaints</h1>
        <p>
          These records are available on this browser. Updates reflect the
          shared local demonstration workspace only.
        </p>
      </div>
      <div className="history-summary">
        <div>
          <strong>{complaints.length}</strong>
          <span>Total complaints</span>
        </div>
        <div>
          <strong>
            {complaints.filter((item) => item.status !== "Resolved").length}
          </strong>
          <span>Open locally</span>
        </div>
        <div>
          <strong>
            {complaints.filter((item) => item.syncStatus !== "synced").length}
          </strong>
          <span>Pending sync</span>
        </div>
      </div>
      <label className="passenger-history-search">
        <span className="sr-only">Search my complaints</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by reference, station, or complaint"
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear search">
            ×
          </button>
        )}
      </label>
      <div className="history-list">
        {filtered.map((item) => (
          <article
            className={expanded === item.id ? "expanded" : ""}
            key={item.id}
          >
            <button
              className="history-row"
              onClick={() => setExpanded(expanded === item.id ? null : item.id)}
            >
              <div>
                <small>{item.id}</small>
                <strong>{item.complaintText}</strong>
                <span>
                  {item.station} ·{" "}
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <StatusChip status={item.status} syncStatus={item.syncStatus} />
                <b>{expanded === item.id ? "−" : "+"}</b>
              </div>
            </button>
            {expanded === item.id && (
              <div className="history-detail">
                <StatusTrack status={item.status} />
                <dl>
                  <div>
                    <dt>Category</dt>
                    <dd>{item.assignedDepartment}</dd>
                  </div>
                  <div>
                    <dt>Language detected</dt>
                    <dd>{item.language}</dd>
                  </div>
                  <div>
                    <dt>Synchronization</dt>
                    <dd>
                      {item.syncStatus === "synced"
                        ? "Demo record previously synced"
                        : "Pending on this device"}
                    </dd>
                  </div>
                  <div>
                    <dt>Photo</dt>
                    <dd>{item.attachmentName || "No photo"}</dd>
                  </div>
                </dl>
                {item.responseDraft && (
                  <div className="passenger-response">
                    <span>LOCAL RESPONSE DRAFT</span>
                    <p>{item.responseDraft}</p>
                    <small>
                      Draft only. It has not been delivered as a message.
                    </small>
                  </div>
                )}
              </div>
            )}
          </article>
        ))}
        {!filtered.length && (
          <div className="passenger-empty">
            <PassengerIcon>?</PassengerIcon>
            <h2>
              {query ? "No matching complaints" : "No complaints saved yet"}
            </h2>
            <p>
              {query
                ? "Try another reference, station, or keyword."
                : "Your locally saved reports will appear here."}
            </p>
            {!query && (
              <Link className="passenger-primary" to="/passenger/report">
                Report an issue
              </Link>
            )}
          </div>
        )}
      </div>
      <div className="passenger-demo-note">
        <strong>Privacy note</strong>
        <p>
          Complaint history is scoped to this demonstration browser profile, not
          a passenger account.
        </p>
      </div>
    </section>
  )
}

function StatusTrack({ status }: { status: Complaint["status"] }) {
  const statuses = ["New", "Triaged", "Assigned", "In Progress", "Resolved"]
  const labels = [
    "Submitted",
    "Received",
    "Assigned",
    "In Progress",
    "Resolved",
  ]
  const current = statuses.indexOf(status)
  return (
    <div className="status-track">
      {statuses.map((item, index) => (
        <div className={index <= current ? "complete" : ""} key={item}>
          <i>{index < current ? "✓" : index + 1}</i>
          <span>{labels[index]}</span>
        </div>
      ))}
    </div>
  )
}

function StatusChip({
  status,
  syncStatus,
}: {
  status: Complaint["status"]
  syncStatus: Complaint["syncStatus"]
}) {
  const label =
    status === "Resolved"
      ? "Resolved"
      : status === "In Progress"
        ? "In Progress"
        : syncStatus !== "synced"
          ? status === "New"
            ? "Submitted on Device"
            : "Pending Sync"
          : "Received by System"
  return (
    <span
      className={`passenger-status ${status.toLowerCase().replace(" ", "-")}`}
    >
      {label}
    </span>
  )
}

function PassengerHelp() {
  return (
    <section className="passenger-help">
      <div className="passenger-form-head">
        <span>HELP & INFORMATION</span>
        <h1>Using this demonstration</h1>
        <p>
          MetroSaarthi remains useful without a network and is transparent about
          what happens to your report.
        </p>
      </div>
      <div className="help-grid">
        {[
          [
            "Can I report offline?",
            "Yes. The complaint, optional photo, and reference are stored in IndexedDB on this device.",
          ],
          [
            "Has my report been sent?",
            "No backend is connected. Pending means saved locally, not delivered to metro staff.",
          ],
          [
            "What languages can I use?",
            "Use English, Hindi, Gujarati, or everyday mixed Gujlish in complaint text.",
          ],
          [
            "Is this emergency support?",
            "No. For immediate danger, move to safety and contact station staff or emergency services directly.",
          ],
        ].map(([title, body], index) => (
          <article key={title}>
            <PassengerIcon>{index + 1}</PassengerIcon>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </div>
      <Link to="/passenger/report" className="passenger-primary">
        Report a complaint
      </Link>
    </section>
  )
}
