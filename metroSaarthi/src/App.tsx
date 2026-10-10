import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import { useAuth } from "./auth/AuthContext"
import { loadData, resetDatabase, saveComplaint, saveIncident } from "./db"
import {
  classify,
  detectLanguage,
  makeComplaint,
  normalizeText,
  replyTemplates,
  scoreComplaint,
  type Category,
  type Complaint,
  type Incident,
  type Language,
  type Priority,
  type Status,
} from "./model"

type View = "overview" | "inbox" | "queues" | "reply" | "incidents" | "sync" | "settings"
type InboxPreset = {
  priority?: string
  status?: string
  sync?: string
}
type IconName = "grid" | "inbox" | "layers" | "message" | "link" | "sync" | "settings" | "search" | "plus" | "menu" | "x" | "arrow" | "download" | "wifi" | "check" | "alert"

function Icon({ name, size = 18 }: { name: IconName size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </>
    ),
    inbox: (
      <>
        <path d="M4 5h16v14H4z" />
        <path d="M4 14h5l2 2h2l2-2h5" />
      </>
    ),
    layers: (
      <>
        <path d="m12 3-9 5 9 5 9-5-9-5Z" />
        <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
      </>
    ),
    message: (
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1" />
        <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" />
      </>
    ),
    sync: (
      <>
        <path d="M20 7h-6V1" />
        <path d="M20 7a9 9 0 0 0-15-2M4 17h6v6" />
        <path d="M4 17a9 9 0 0 0 15 2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    x: <path d="m6 6 12 12M18 6 6 18" />,
    arrow: <path d="m9 18 6-6-6-6" />,
    download: (
      <>
        <path d="M12 3v13m-5-5 5 5 5-5" />
        <path d="M4 20h16" />
      </>
    ),
    wifi: (
      <>
        <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" />
        <circle cx="12" cy="20" r=".5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    alert: (
      <>
        <path d="M12 3 2 21h20L12 3Z" />
        <path d="M12 9v5m0 3v.1" />
      </>
    ),
  }
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

const nav: Array<{ id: View label: string icon: IconName }> = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "inbox", label: "Complaint Inbox", icon: "inbox" },
  { id: "queues", label: "Department Queues", icon: "layers" },
  { id: "reply", label: "Reply Assistant", icon: "message" },
  { id: "incidents", label: "Incident Groups", icon: "link" },
  { id: "sync", label: "Offline & Sync", icon: "sync" },
  { id: "settings", label: "Settings", icon: "settings" },
]
const departments: Category[] = [
  "Safety",
  "Cleanliness",
  "Fare",
  "Lifts & Escalators",
  "Staff Behaviour",
  "Needs Review",
]
const statuses: Status[] = [
  "New",
  "Triaged",
  "Assigned",
  "In Progress",
  "Resolved",
]
const priorities: Priority[] = ["Critical", "High", "Medium", "Low"]

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode
  tone?: string
}) {
  return <span className={`badge ${tone}`}>{children}</span>
}

function priorityTone(p: Priority) {
  return p.toLowerCase()
}
function fmt(iso: string) {
  return new Date(iso).toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function OperatorPortal() {
  const { session, logout } = useAuth()
  const [view, setView] = useState<View>("overview")
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selected, setSelected] = useState<Complaint | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState("")
  const [undoRecord, setUndoRecord] = useState<Complaint | null>(null)
  const [inboxPreset, setInboxPreset] = useState<InboxPreset>({})
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    loadData()
      .then((d) => {
        setComplaints(d.complaints)
        setIncidents(d.incidents)
      })
      .finally(() => setLoading(false))
    const on = () => setOnline(true),
      off = () => setOnline(false)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    const timer = window.setInterval(() => setClock(new Date()), 60000)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
      clearInterval(timer)
    }
  }, [])

  const pending = complaints.filter((c) => c.syncStatus !== "synced").length
  const updateComplaint = async (
    next: Complaint,
    message = "Saved locally",
  ) => {
    const previous = complaints.find((complaint) => complaint.id === next.id)
    const saved = {
      ...next,
      updatedAt: new Date().toISOString(),
      syncStatus: "pending" as const,
    }
    setComplaints((all) => all.map((c) => (c.id === saved.id ? saved : c)))
    setSelected(saved)
    await saveComplaint(saved)
    setUndoRecord(previous || null)
    showToast(message)
  }
  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => {
      setToast("")
      setUndoRecord(null)
    }, 5000)
  }
  const navigate = (next: View) => {
    if (next === "inbox") setInboxPreset({})
    setView(next)
    setMobileNav(false)
    setSelected(null)
  }
  const openInbox = (preset: InboxPreset = {}) => {
    setInboxPreset(preset)
    setView("inbox")
    setSelected(null)
  }

  if (loading)
    return (
      <div className="loading">
        <div className="brand-mark">M</div>
        <p>Opening local workspace…</p>
      </div>
    )

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <Link className="brand" to="/" title="Back to portal selection">
          <div className="brand-mark">M</div>
          <div>
            <strong>MetroSaarthi</strong>
            <small>Operations console</small>
          </div>
        </Link>
        <nav>
          {nav.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id === "sync" && pending > 0 && <em>{pending}</em>}
            </button>
          ))}
        </nav>
        <Link className="portal-switch" to="/">
          <Icon name="arrow" size={15} />
          Switch portal
        </Link>
        <div className="operator-session">
          <span>Signed in</span>
          <strong>{session?.displayName || "Operator"}</strong>
          <button
            onClick={() => {
              logout()
              window.location.replace("/")
            }}
          >
            Log out
          </button>
        </div>
        <div className="sidebar-note">
          <span>DEMO WORKSPACE</span>
          <p>Synthetic records only</p>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMobileNav(true)}
            aria-label="Open navigation"
          >
            <Icon name="menu" />
          </button>
          <div className="workspace-name">
            <span>Demonstration Environment</span>
            <small>
              {clock.toLocaleDateString([], {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}{" "}
              ·{" "}
              {clock.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </small>
          </div>
          <div className="top-status">
            <span className={`connection ${online ? "on" : "off"}`}>
              <i />
              {online ? "Online" : "Offline"}
            </span>
            <button onClick={() => navigate("sync")}>
              <Icon name="sync" size={16} /> {pending} pending
            </button>
          </div>
        </header>
        <main>
          {view === "overview" && (
            <Overview
              complaints={complaints}
              onOpen={setSelected}
              onNew={() => setNewOpen(true)}
              go={navigate}
              onFilter={openInbox}
            />
          )}
          {view === "inbox" && (
            <Inbox
              complaints={complaints}
              onOpen={setSelected}
              onNew={() => setNewOpen(true)}
              preset={inboxPreset}
            />
          )}
          {view === "queues" && (
            <Queues complaints={complaints} onOpen={setSelected} />
          )}
          {view === "reply" && (
            <ReplyAssistant complaints={complaints} onSave={updateComplaint} />
          )}
          {view === "incidents" && (
            <IncidentGroups
              complaints={complaints}
              incidents={incidents}
              onOpen={setSelected}
              onLink={async (a, b) => {
                const incident: Incident = {
                  id: `INC-${Date.now().toString().slice(-6)}`,
                  title: `${a.category} reports at ${a.station}`,
                  complaintIds: [a.id, b.id],
                  createdAt: new Date().toISOString(),
                }
                setIncidents((x) => [...x, incident])
                await saveIncident(incident)
                await updateComplaint(
                  { ...a, relatedIncidentId: incident.id },
                  "Incident group created",
                )
                const nextB = {
                  ...b,
                  relatedIncidentId: incident.id,
                  syncStatus: "pending" as const,
                }
                setComplaints((all) =>
                  all.map((c) => (c.id === b.id ? nextB : c)),
                )
                await saveComplaint(nextB)
              }}
            />
          )}
          {view === "sync" && (
            <SyncCenter complaints={complaints} online={online} />
          )}
          {view === "settings" && (
            <Settings
              complaints={complaints}
              onReset={async () => {
                if (
                  !window.confirm(
                    "Restore the original synthetic dataset? Local edits and incident links will be removed.",
                  )
                )
                  return
                const seeded = await resetDatabase()
                setComplaints(seeded)
                setIncidents([])
                showToast("Demonstration data restored")
              }}
            />
          )}
        </main>
      </div>
      {selected && (
        <DetailDrawer
          complaint={selected}
          onClose={() => setSelected(null)}
          onSave={updateComplaint}
          onReply={() => {
            setSelected(null)
            setView("reply")
          }}
        />
      )}
      {newOpen && (
        <NewComplaint
          onClose={() => setNewOpen(false)}
          onCreate={async (c) => {
            setComplaints((all) => [c, ...all])
            await saveComplaint(c)
            setNewOpen(false)
            setSelected(c)
            showToast("Complaint saved locally")
          }}
        />
      )}
      {toast && (
        <div className="toast">
          <Icon name="check" size={17} />
          {toast}
          {undoRecord && (
            <button
              onClick={async () => {
                const restored = {
                  ...undoRecord,
                  updatedAt: new Date().toISOString(),
                  syncStatus: "pending" as const,
                }
                setComplaints((all) =>
                  all.map((item) =>
                    item.id === restored.id ? restored : item,
                  ),
                )
                setSelected(restored)
                await saveComplaint(restored)
                setUndoRecord(null)
                showToast("Previous values restored")
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function PageHead({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}

function Overview({
  complaints,
  onOpen,
  onNew,
  go,
  onFilter,
}: {
  complaints: Complaint[]
  onOpen: (c: Complaint) => void
  onNew: () => void
  go: (v: View) => void
  onFilter: (preset?: InboxPreset) => void
}) {
  const metrics: Array<[string, number, string, InboxPreset]> = [
    ["Total complaints", complaints.length, "All local records", {}],
    [
      "Critical",
      complaints.filter((c) => c.priorityLevel === "Critical").length,
      "Immediate review",
      { priority: "Critical" },
    ],
    [
      "Pending",
      complaints.filter((c) => c.syncStatus !== "synced").length,
      "Local sync queue",
      { sync: "pending" },
    ],
    [
      "In progress",
      complaints.filter((c) => c.status === "In Progress").length,
      "Active work",
      { status: "In Progress" },
    ],
    [
      "Resolved",
      complaints.filter((c) => c.status === "Resolved").length,
      "Locally recorded",
      { status: "Resolved" },
    ],
  ]
  const critical = complaints
    .filter((c) => c.priorityLevel === "Critical" && c.status !== "Resolved")
    .slice(0, 4)
  return (
    <div>
      <PageHead
        title="Operations overview"
        description="Local complaint triage across the demonstration network."
        action={
          <button className="primary" onClick={onNew}>
            <Icon name="plus" />
            New complaint
          </button>
        }
      />
      <div className="demo-banner">
        <Icon name="alert" size={17} />
        <div>
          <strong>Synthetic demonstration data</strong>
          <span>
            Figures below are generated from fictional local records and are not
            Ahmedabad Metro statistics.
          </span>
        </div>
      </div>
      <section className="metrics">
        {metrics.map(([label, value, note, preset]) => (
          <button
            className="metric"
            key={label as string}
            onClick={() => onFilter(preset as InboxPreset)}
            title={`Filter inbox by ${String(label).toLowerCase()}`}
          >
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </button>
        ))}
      </section>
      <div className="overview-grid">
        <section className="panel span-2">
          <div className="panel-head">
            <div>
              <h2>Recent complaints</h2>
              <p>Latest locally stored records</p>
            </div>
            <button className="text-button" onClick={() => go("inbox")}>
              View inbox <Icon name="arrow" size={15} />
            </button>
          </div>
          <ComplaintTable
            complaints={[...complaints]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 6)}
            onOpen={onOpen}
            compact
          />
        </section>
        <section className="panel critical-panel">
          <div className="panel-head">
            <div>
              <h2>Critical queue</h2>
              <p>Open safety-sensitive reports</p>
            </div>
          </div>
          <div className="critical-list">
            {critical.length ? (
              critical.map((c) => (
                <button key={c.id} onClick={() => onOpen(c)}>
                  <span>
                    <Badge tone="critical">Score {c.priorityScore}</Badge>
                    <small>{c.id}</small>
                  </span>
                  <strong>{c.complaintText}</strong>
                  <em>
                    {c.station} · {fmt(c.createdAt)}
                  </em>
                </button>
              ))
            ) : (
              <Empty text="No unresolved critical complaints" />
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Department load</h2>
              <p>All records by suggested queue</p>
            </div>
          </div>
          <div className="bar-list">
            {departments.slice(0, 5).map((d) => {
              const n = complaints.filter(
                (c) => c.assignedDepartment === d,
              ).length
              return (
                <div key={d}>
                  <span>
                    {d}
                    <b>{n}</b>
                  </span>
                  <i>
                    <em
                      style={{
                        width: `${Math.max(5, (n / complaints.length) * 100)}%`,
                      }}
                    />
                  </i>
                </div>
              )
            })}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Priority distribution</h2>
              <p>Rule-based local triage</p>
            </div>
          </div>
          <div className="priority-stack">
            {priorities.map((p) => (
              <div key={p}>
                <Badge tone={priorityTone(p)}>{p}</Badge>
                <strong>
                  {complaints.filter((c) => c.priorityLevel === p).length}
                </strong>
                <span>
                  {Math.round(
                    (complaints.filter((c) => c.priorityLevel === p).length /
                      complaints.length) *
                      100,
                  )}
                  %
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel storage-card">
          <div className="panel-head">
            <div>
              <h2>Local readiness</h2>
              <p>Offline-first workspace</p>
            </div>
            <Icon name="wifi" />
          </div>
          <div className="storage-row">
            <span>IndexedDB records</span>
            <strong>{complaints.length} available</strong>
          </div>
          <div className="storage-row">
            <span>Application shell</span>
            <strong>Cache requested</strong>
          </div>
          <button className="secondary full" onClick={() => go("sync")}>
            Open synchronization center
          </button>
        </section>
      </div>
    </div>
  )
}

function ComplaintTable({
  complaints,
  onOpen,
  compact = false,
}: {
  complaints: Complaint[]
  onOpen: (c: Complaint) => void
  compact?: boolean
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Complaint</th>
            <th>Department</th>
            <th>Priority</th>
            {!compact && <th>Status</th>}
            <th>Station</th>
            <th>Received</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {complaints.map((c) => (
            <tr key={c.id} onClick={() => onOpen(c)}>
              <td>
                <strong>{c.id}</strong>
                <span>{c.complaintText}</span>
              </td>
              <td>{c.assignedDepartment}</td>
              <td>
                <Badge tone={priorityTone(c.priorityLevel)}>
                  {c.priorityScore} · {c.priorityLevel}
                </Badge>
              </td>
              {!compact && (
                <td>
                  <Badge>{c.status}</Badge>
                </td>
              )}
              <td>{c.station}</td>
              <td>{fmt(c.createdAt)}</td>
              <td>
                <Icon name="arrow" size={16} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!complaints.length && <Empty text="No complaints match these filters" />}
    </div>
  )
}

function Inbox({
  complaints,
  onOpen,
  onNew,
  preset,
}: {
  complaints: Complaint[]
  onOpen: (c: Complaint) => void
  onNew: () => void
  preset: InboxPreset
}) {
  const [search, setSearch] = useState(""),
    [department, setDepartment] = useState("All"),
    [priority, setPriority] = useState(preset.priority || "All"),
    [status, setStatus] = useState(preset.status || "All"),
    [sync, setSync] = useState(preset.sync || "All"),
    [station, setStation] = useState("All"),
    [language, setLanguage] = useState("All"),
    [sort, setSort] = useState("priority")
  useEffect(() => {
    setPriority(preset.priority || "All")
    setStatus(preset.status || "All")
    setSync(preset.sync || "All")
  }, [preset])
  const stationOptions = [
    "All",
    ...Array.from(new Set(complaints.map((item) => item.station))).sort(),
  ]
  const filtered = useMemo(
    () =>
      complaints
        .filter((c) => {
          const q = normalizeText(search)
          return (
            (!q || normalizeText(`${c.id} ${c.complaintText}`).includes(q)) &&
            (department === "All" || c.assignedDepartment === department) &&
            (priority === "All" || c.priorityLevel === priority) &&
            (status === "All" || c.status === status) &&
            (sync === "All" ||
              (sync === "pending"
                ? c.syncStatus !== "synced"
                : c.syncStatus === sync)) &&
            (station === "All" || c.station === station) &&
            (language === "All" || c.language === language)
          )
        })
        .sort((a, b) =>
          sort === "priority"
            ? b.priorityScore - a.priorityScore
            : b.createdAt.localeCompare(a.createdAt),
        ),
    [
      complaints,
      search,
      department,
      priority,
      status,
      sync,
      station,
      language,
      sort,
    ],
  )
  return (
    <div>
      <PageHead
        title="Complaint inbox"
        description={`${filtered.length} of ${complaints.length} local records shown.`}
        action={
          <button className="primary" onClick={onNew}>
            <Icon name="plus" />
            New complaint
          </button>
        }
      />
      <section className="panel inbox-panel">
        <div
          className="status-tabs"
          role="tablist"
          aria-label="Complaint status"
        >
          {["All", ...statuses].map((item) => (
            <button
              role="tab"
              aria-selected={status === item}
              className={status === item ? "active" : ""}
              onClick={() => setStatus(item)}
              key={item}
            >
              {item}
              <span>
                {item === "All"
                  ? complaints.length
                  : complaints.filter((complaint) => complaint.status === item)
                      .length}
              </span>
            </button>
          ))}
        </div>
        <div className="filters">
          <label className="search-field">
            <Icon name="search" size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search complaint text or ID"
            />
          </label>
          <Select
            label="Department"
            value={department}
            onChange={setDepartment}
            options={["All", ...departments]}
          />
          <Select
            label="Priority"
            value={priority}
            onChange={setPriority}
            options={["All", ...priorities]}
          />
          <Select
            label="Station"
            value={station}
            onChange={setStation}
            options={stationOptions}
          />
          <Select
            label="Sync"
            value={sync}
            onChange={setSync}
            options={["All", "pending", "synced", "failed"]}
            labels={["All sync", "Pending", "Synced", "Failed"]}
          />
          <Select
            label="Sort"
            value={sort}
            onChange={setSort}
            options={["priority", "received"]}
            labels={["Priority", "Received time"]}
          />
        </div>
        <div className="filter-summary">
          <span>{filtered.length} results</span>
          {(search ||
            department !== "All" ||
            priority !== "All" ||
            status !== "All" ||
            station !== "All" ||
            sync !== "All") && (
            <button
              onClick={() => {
                setSearch("")
                setDepartment("All")
                setPriority("All")
                setStatus("All")
                setStation("All")
                setSync("All")
                setLanguage("All")
              }}
            >
              Clear filters
            </button>
          )}
        </div>
        <ComplaintTable complaints={filtered} onOpen={onOpen} />
      </section>
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  labels?: string[]
}) {
  return (
    <label className="select-label">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o, i) => (
          <option key={o} value={o}>
            {labels?.[i] || o}
          </option>
        ))}
      </select>
    </label>
  )
}

function Queues({
  complaints,
  onOpen,
}: {
  complaints: Complaint[]
  onOpen: (c: Complaint) => void
}) {
  const [active, setActive] = useState<Category>("Safety")
  const shown = complaints
    .filter((c) => c.assignedDepartment === active && c.status !== "Resolved")
    .sort((a, b) => b.priorityScore - a.priorityScore)
  return (
    <div>
      <PageHead
        title="Department queues"
        description="Workload grouped by final local department assignment."
      />
      <div className="queue-grid">
        <aside className="queue-nav">
          {departments.map((d) => (
            <button
              className={active === d ? "active" : ""}
              onClick={() => setActive(d)}
              key={d}
            >
              <span>
                {d}
                <small>
                  {
                    complaints.filter(
                      (c) =>
                        c.assignedDepartment === d && c.status !== "Resolved",
                    ).length
                  }{" "}
                  open
                </small>
              </span>
              <Icon name="arrow" size={16} />
            </button>
          ))}
        </aside>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{active}</h2>
              <p>Sorted by local urgency score</p>
            </div>
            <Badge>{shown.length} open</Badge>
          </div>
          <ComplaintTable complaints={shown} onOpen={onOpen} />
        </section>
      </div>
    </div>
  )
}

function DetailDrawer({
  complaint: initial,
  onClose,
  onSave,
  onReply,
}: {
  complaint: Complaint
  onClose: () => void
  onSave: (c: Complaint, m?: string) => void
  onReply: () => void
}) {
  const [c, setC] = useState(initial)
  useEffect(() => setC(initial), [initial])
  const recalc = () => {
    const x = classify(c.complaintText)
    const s = scoreComplaint(c.complaintText, c.assignedDepartment)
    setC({
      ...c,
      category: x.category,
      classificationReason: x.reason,
      matchedTerms: x.matchedTerms,
      classificationConfidence: x.confidence,
      ...s,
    })
  }
  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside className="drawer">
        <div className="drawer-head">
          <div>
            <span>COMPLAINT DETAIL</span>
            <h2>{c.id}</h2>
          </div>
          <button onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="drawer-body">
          <div className="detail-priority">
            <div>
              <Badge tone={priorityTone(c.priorityLevel)}>
                {c.priorityLevel}
              </Badge>
              <strong>
                {c.priorityScore}
                <small>/100</small>
              </strong>
            </div>
            <p>
              {c.priorityScore >= 80
                ? "Verify immediately and escalate to station safety control."
                : c.priorityScore >= 60
                  ? "Review and assign within 10 minutes."
                  : "Assign for routine operational follow-up."}
            </p>
          </div>
          <label className="field full">
            <span>Complaint text</span>
            <textarea
              rows={4}
              value={c.complaintText}
              onChange={(e) => setC({ ...c, complaintText: e.target.value })}
            />
          </label>
          {c.attachmentName && (
            <div className="sync-line">
              <Icon name="link" size={16} />
              <span>Passenger photo stored locally: {c.attachmentName}</span>
            </div>
          )}
          <div className="form-grid">
            <Select
              label="Final category"
              value={c.category}
              onChange={(v) => setC({ ...c, category: v as Category })}
              options={departments}
            />
            <Select
              label="Assigned department"
              value={c.assignedDepartment}
              onChange={(v) =>
                setC({ ...c, assignedDepartment: v as Category })
              }
              options={departments}
            />
            <Select
              label="Priority level"
              value={c.priorityLevel}
              onChange={(v) => {
                const level = v as Priority
                const score =
                  level === "Critical"
                    ? Math.max(80, c.priorityScore)
                    : level === "High"
                      ? Math.min(79, Math.max(60, c.priorityScore))
                      : level === "Medium"
                        ? Math.min(59, Math.max(30, c.priorityScore))
                        : Math.min(29, c.priorityScore)
                setC({ ...c, priorityLevel: level, priorityScore: score })
              }}
              options={priorities}
            />
            <label className="field">
              <span>Urgency score (0–100)</span>
              <input
                type="number"
                min="0"
                max="100"
                value={c.priorityScore}
                onChange={(e) => {
                  const score = Math.min(
                    100,
                    Math.max(0, Number(e.target.value)),
                  )
                  setC({
                    ...c,
                    priorityScore: score,
                    priorityLevel:
                      score >= 80
                        ? "Critical"
                        : score >= 60
                          ? "High"
                          : score >= 30
                            ? "Medium"
                            : "Low",
                  })
                }}
              />
            </label>
            <Select
              label="Status"
              value={c.status}
              onChange={(v) => setC({ ...c, status: v as Status })}
              options={statuses}
            />
            <label className="field">
              <span>Assigned team</span>
              <input
                value={c.assignedTeam}
                onChange={(e) => setC({ ...c, assignedTeam: e.target.value })}
                placeholder="Unassigned"
              />
            </label>
            <label className="field">
              <span>Station</span>
              <input
                value={c.station}
                onChange={(e) => setC({ ...c, station: e.target.value })}
              />
            </label>
            {c.locationDetail && (
              <label className="field">
                <span>Station location</span>
                <input
                  value={c.locationDetail}
                  onChange={(e) =>
                    setC({ ...c, locationDetail: e.target.value })
                  }
                />
              </label>
            )}
          </div>
          <section className="explain">
            <div className="section-title">
              <div>
                <h3>Local classification</h3>
                <p>Transparent keyword and rule matching</p>
              </div>
              <button className="secondary small" onClick={recalc}>
                Re-run rules
              </button>
            </div>
            <div className="classification-row">
              <strong>{c.category}</strong>
              <span>Rule strength {c.classificationConfidence}%</span>
            </div>
            <div className="confidence">
              <i style={{ width: `${c.classificationConfidence}%` }} />
            </div>
            <p>{c.classificationReason}</p>
            {c.matchedTerms.length > 0 && (
              <div className="terms">
                {c.matchedTerms.map((x) => (
                  <Badge key={x}>{x}</Badge>
                ))}
              </div>
            )}
          </section>
          <section className="explain">
            <div className="section-title">
              <div>
                <h3>Urgency explanation</h3>
                <p>Rule-based triage aid, not a validated danger prediction</p>
              </div>
            </div>
            <div className="factor-grid">
              <Factor
                label="Safety severity"
                value={c.safetySeverity}
                max={40}
              />
              <Factor
                label="Passenger impact"
                value={c.passengerImpact}
                max={25}
              />
              <Factor
                label="Operational disruption"
                value={c.operationalDisruption}
                max={20}
              />
              <Factor
                label="Time sensitivity"
                value={c.timeSensitivity}
                max={15}
              />
            </div>
          </section>
          <label className="field full">
            <span>Internal notes</span>
            <textarea
              rows={3}
              value={c.internalNotes}
              onChange={(e) => setC({ ...c, internalNotes: e.target.value })}
              placeholder="Add operational notes; stored on this device"
            />
          </label>
          <div className="sync-line">
            <Icon
              name={c.syncStatus === "synced" ? "check" : "sync"}
              size={16}
            />
            <span>
              {c.syncStatus === "synced"
                ? "Previously synchronized"
                : "Local changes will remain in the device queue"}
            </span>
          </div>
        </div>
        <div className="drawer-actions">
          <button className="secondary" onClick={onReply}>
            <Icon name="message" />
            Draft reply
          </button>
          <button className="primary" onClick={() => onSave(c)}>
            Save changes
          </button>
        </div>
      </aside>
    </div>
  )
}

function Factor({
  label,
  value,
  max,
}: {
  label: string
  value: number
  max: number
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>
        {value}
        <small>/{max}</small>
      </strong>
      <i>
        <em style={{ width: `${(value / max) * 100}%` }} />
      </i>
    </div>
  )
}

function NewComplaint({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (c: Complaint) => void
}) {
  const [text, setText] = useState(""),
    [station, setStation] = useState("Vastral Gam"),
    [error, setError] = useState("")
  const preview = text.trim().length >= 4 ? classify(text) : null
  const score = preview ? scoreComplaint(text, preview.category) : null
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="drawer-head">
          <div>
            <span>NEW LOCAL RECORD</span>
            <h2>Create complaint</h2>
          </div>
          <button onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">
          <label className="field full">
            <span>Complaint text</span>
            <textarea
              autoFocus
              rows={5}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setError("")
              }}
              placeholder="Enter the passenger's complaint in English, Hindi, Gujarati, or Gujlish"
            />
            {error && <small className="error">{error}</small>}
          </label>
          <label className="field full">
            <span>Station or location</span>
            <select
              value={station}
              onChange={(e) => setStation(e.target.value)}
            >
              {[
                "Vastral Gam",
                "Apparel Park",
                "Old High Court",
                "Kalupur",
                "Shahpur",
                "Gheekanta",
                "Thaltej",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          {preview && score && (
            <div className="preview-box">
              <div>
                <span>LOCAL TRIAGE PREVIEW</span>
                <Badge tone={priorityTone(score.priorityLevel)}>
                  {score.priorityScore} · {score.priorityLevel}
                </Badge>
              </div>
              <h3>{preview.category}</h3>
              <p>{preview.reason}</p>
              <small>
                Detected language: {detectLanguage(text)} · Rule strength:{" "}
                {preview.confidence}%
              </small>
            </div>
          )}
          <div className="honesty">
            <Icon name="alert" size={17} />
            <p>
              Classification and urgency are deterministic local rules. A
              controller should review safety-critical reports.
            </p>
          </div>
        </div>
        <div className="modal-actions">
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary"
            onClick={() => {
              if (text.trim().length < 4)
                return setError("Enter at least four characters.")
              onCreate(makeComplaint(text.trim(), station))
            }}
          >
            Save locally
          </button>
        </div>
      </div>
    </div>
  )
}

function ReplyAssistant({
  complaints,
  onSave,
}: {
  complaints: Complaint[]
  onSave: (c: Complaint, m?: string) => void
}) {
  const [id, setId] = useState(
    complaints.find((c) => c.status !== "Resolved")?.id || complaints[0]?.id,
  )
  const complaint = complaints.find((c) => c.id === id) || complaints[0]
  const [language, setLanguage] = useState<"English" | "Hindi" | "Gujarati">(
    "Gujarati",
  )
  const [draft, setDraft] = useState(complaint?.responseDraft || "")
  const [reviewed, setReviewed] = useState(complaint?.responseReviewed || false)
  useEffect(() => {
    setDraft(complaint?.responseDraft || "")
    setReviewed(complaint?.responseReviewed || false)
  }, [id])
  if (!complaint) return null
  const templateCategory =
    complaint.assignedDepartment === "Needs Review"
      ? "Staff Behaviour"
      : complaint.assignedDepartment
  return (
    <div>
      <PageHead
        title="Reply assistant"
        description="Create editable local drafts. No message delivery integration is connected."
      />
      <div className="reply-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Complaint context</h2>
              <p>Select a locally stored record</p>
            </div>
          </div>
          <label className="field full">
            <span>Complaint</span>
            <select value={id} onChange={(e) => setId(e.target.value)}>
              {complaints.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.id} — {c.complaintText.slice(0, 54)}
                </option>
              ))}
            </select>
          </label>
          <div className="complaint-context">
            <span>
              <Badge tone={priorityTone(complaint.priorityLevel)}>
                {complaint.priorityLevel}
              </Badge>
              <Badge>{complaint.language}</Badge>
            </span>
            <blockquote>{complaint.complaintText}</blockquote>
            <small>
              {complaint.station} · {complaint.assignedDepartment}
            </small>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Response draft</h2>
              <p>Stored locally against this complaint</p>
            </div>
            <Badge>Draft only</Badge>
          </div>
          <div className="inline-fields">
            <Select
              label="Response language"
              value={language}
              onChange={(v) => setLanguage(v as typeof language)}
              options={["Gujarati", "Hindi", "English"]}
            />
            <button
              className="secondary generate"
              onClick={() => {
                setDraft(replyTemplates[templateCategory][language])
                setReviewed(false)
              }}
            >
              Generate local draft
            </button>
          </div>
          <label className="field full">
            <span>Editable response</span>
            <textarea
              className="reply-textarea"
              rows={9}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                setReviewed(false)
              }}
              placeholder="Choose a language and generate a template, or write a response."
            />
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            <span>
              <strong>Reviewed by controller</strong>
              <small>
                This confirms human review only; it does not send the message.
              </small>
            </span>
          </label>
          <div className="reply-actions">
            <button
              className="secondary"
              disabled={!draft}
              onClick={() =>
                navigator.clipboard.writeText(draft).then(() => {})
              }
            >
              Copy draft
            </button>
            <button
              className="primary"
              disabled={!draft}
              onClick={() =>
                onSave(
                  {
                    ...complaint,
                    responseDraft: draft,
                    responseReviewed: reviewed,
                  },
                  "Reply draft saved locally",
                )
              }
            >
              Save draft
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

function duplicatePairs(complaints: Complaint[]) {
  const pairs: Array<{
    a: Complaint
    b: Complaint
    reason: string
    score: number
  }> = []
  for (let i = 0; i < complaints.length; i++)
    for (let j = i + 1; j < complaints.length; j++) {
      const a = complaints[i],
        b = complaints[j]
      if (a.relatedIncidentId || b.relatedIncidentId) continue
      const wordsA = new Set(
        normalizeText(a.complaintText)
          .split(" ")
          .filter((x) => x.length > 3),
      )
      const wordsB = new Set(
        normalizeText(b.complaintText)
          .split(" ")
          .filter((x) => x.length > 3),
      )
      const shared = [...wordsA].filter((x) => wordsB.has(x))
      let score =
        shared.length * 12 +
        (a.station === b.station ? 35 : 0) +
        (a.assignedDepartment === b.assignedDepartment ? 25 : 0)
      if (score >= 55)
        pairs.push({
          a,
          b,
          score: Math.min(99, score),
          reason: `${a.station === b.station ? "Same station; " : ""}${
            a.assignedDepartment === b.assignedDepartment
              ? "same department; "
              : ""
          }${
            shared.length
              ? `shared terms: ${shared.join(", ")}`
              : "similar local rule classification"
          }.`,
        })
    }
  return pairs.sort((x, y) => y.score - x.score).slice(0, 8)
}

function IncidentGroups({
  complaints,
  incidents,
  onOpen,
  onLink,
}: {
  complaints: Complaint[]
  incidents: Incident[]
  onOpen: (c: Complaint) => void
  onLink: (a: Complaint, b: Complaint) => void
}) {
  const [dismissed, setDismissed] = useState<string[]>([])
  const pairs = duplicatePairs(complaints).filter(
    (x) => !dismissed.includes(`${x.a.id}${x.b.id}`),
  )
  return (
    <div>
      <PageHead
        title="Incident groups"
        description="Local similarity suggestions preserve every original complaint."
      />
      <div className="incident-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Duplicate review</h2>
              <p>
                Suggestions based on text, station, department, and local rules
              </p>
            </div>
            <Badge>{pairs.length} suggestions</Badge>
          </div>
          <div className="suggestions">
            {pairs.length ? (
              pairs.map(({ a, b, reason, score }) => (
                <article key={a.id + b.id}>
                  <div className="suggestion-top">
                    <Badge>{score}% rule match</Badge>
                    <span>{reason}</span>
                  </div>
                  <button onClick={() => onOpen(a)}>
                    <strong>{a.id}</strong>
                    <span>{a.complaintText}</span>
                  </button>
                  <button onClick={() => onOpen(b)}>
                    <strong>{b.id}</strong>
                    <span>{b.complaintText}</span>
                  </button>
                  <div>
                    <button
                      className="secondary small"
                      onClick={() => setDismissed((x) => [...x, a.id + b.id])}
                    >
                      Dismiss
                    </button>
                    <button
                      className="primary small"
                      onClick={() => onLink(a, b)}
                    >
                      Link as incident
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <Empty text="No unreviewed duplicate suggestions" />
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Active groups</h2>
              <p>Locally linked complaint records</p>
            </div>
          </div>
          <div className="group-list">
            {incidents.length ? (
              incidents.map((x) => (
                <article key={x.id}>
                  <span>{x.id}</span>
                  <strong>{x.title}</strong>
                  <p>{x.complaintIds.join(" · ")}</p>
                  <small>Created {fmt(x.createdAt)}</small>
                </article>
              ))
            ) : (
              <Empty text="No incident groups created yet" />
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function SyncCenter({
  complaints,
  online,
}: {
  complaints: Complaint[]
  online: boolean
}) {
  const [retryMessage, setRetryMessage] = useState("")
  const queued = complaints.filter((c) => c.syncStatus !== "synced")
  return (
    <div>
      <PageHead
        title="Offline & synchronization"
        description="Inspect device storage and queued changes without overstating delivery."
      />
      <div className={`status-hero ${online ? "online" : "offline"}`}>
        <div className="status-icon">
          <Icon name={online ? "wifi" : "alert"} />
        </div>
        <div>
          <span>DEVICE STATUS</span>
          <h2>{online ? "Network connection available" : "Working offline"}</h2>
          <p>
            {online
              ? "Core work remains local. No metro backend is configured in this demonstration."
              : "Create, edit, classify, score, and draft replies. Changes remain in IndexedDB."}
          </p>
        </div>
        <Badge tone={online ? "success" : "high"}>
          {online ? "Online" : "Offline"}
        </Badge>
      </div>
      <div className="sync-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Pending change queue</h2>
              <p>{queued.length} records await a real backend integration</p>
            </div>
            <Badge tone={queued.length ? "high" : "success"}>
              {queued.length} pending
            </Badge>
          </div>
          <div className="queue-list">
            {queued.slice(0, 12).map((c) => (
              <div key={c.id}>
                <span className="sync-dot" />
                <div>
                  <strong>{c.id}</strong>
                  <small>{c.complaintText}</small>
                </div>
                <time>{fmt(c.updatedAt)}</time>
                <Badge>{c.syncStatus}</Badge>
              </div>
            ))}
          </div>
        </section>
        <aside>
          <section className="panel honest-panel">
            <Icon name="alert" />
            <h3>Demonstration sync mode</h3>
            <p>
              No server endpoint is connected. Retry cannot honestly mark these
              records as delivered, so they remain pending on this device.
            </p>
            <button
              className="secondary full"
              onClick={() =>
                setRetryMessage(
                  online
                    ? "Connection is available, but no backend endpoint is configured. Records remain safely pending."
                    : "No network connection is available. Records remain safely stored on this device.",
                )
              }
            >
              Retry pending changes
            </button>
            {retryMessage && (
              <p className="sync-retry-message" role="status">
                {retryMessage}
              </p>
            )}
          </section>
          <section className="panel checklist">
            <h3>Offline readiness</h3>
            <p>
              <Icon name="check" /> IndexedDB persistence enabled
            </p>
            <p>
              <Icon name="check" /> Local classification and scoring
            </p>
            <p>
              <Icon name="check" /> Runtime application-shell cache
            </p>
            <small>
              For a valid offline reload test, first load the production build
              online, then disable the network and refresh.
            </small>
          </section>
        </aside>
      </div>
    </div>
  )
}

function Settings({
  complaints,
  onReset,
}: {
  complaints: Complaint[]
  onReset: () => void
}) {
  const exportData = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            environment: "Synthetic demonstration",
            complaints,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `metrosaarthi-local-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div>
      <PageHead
        title="Settings & local data"
        description="Manage the demonstration workspace stored in this browser."
      />
      <div className="settings-grid">
        <section className="panel setting-row">
          <div>
            <h2>Export local records</h2>
            <p>
              Download all complaint records as a JSON file for inspection or
              backup.
            </p>
            <small>
              Includes synthetic demonstration content and your local edits.
            </small>
          </div>
          <button className="secondary" onClick={exportData}>
            <Icon name="download" />
            Export JSON
          </button>
        </section>
        <section className="panel setting-row danger-zone">
          <div>
            <h2>Reset demonstration</h2>
            <p>
              Restore the original synthetic dataset and remove local incident
              links.
            </p>
            <small>
              This action requires confirmation and cannot be undone.
            </small>
          </div>
          <button className="danger-button" onClick={onReset}>
            Reset demo data
          </button>
        </section>
        <section className="panel about">
          <span>METROSAARTHI · DEMONSTRATION BUILD</span>
          <h2>
            Every Complaint Heard.
            <br />
            Every Priority Clear.
          </h2>
          <p>
            All core complaint workflows run locally. Classification is a
            transparent keyword engine, not a trained AI model. No passenger
            identities, verified statistics, or live control-room data are
            included.
          </p>
        </section>
      </div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <Icon name="inbox" />
      <strong>{text}</strong>
      <span>Try adjusting filters or create a local record.</span>
    </div>
  )
}

export default OperatorPortal
