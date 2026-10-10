export type UserRole = "passenger" | "operator"

export interface AuthSession {
  subject: string
  displayName: string
  identifier: string
  role: UserRole
  issuedAt: number
  expiresAt: number
  tokenId: string
}

type DemoAccount = {
  subject: string
  displayName: string
  identifiers: string[]
  role: UserRole
  salt: string
  passwordHash: string
}

const SESSION_KEY = "metrosaarthi.demo.session.v1"
const SESSION_DURATION = 8 * 60 * 60 * 1000
const PBKDF2_ITERATIONS = 120_000

// Explicit hackathon-only identities. Only derived password hashes are bundled.
const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    subject: "demo-passenger-001",
    displayName: "Demo Passenger",
    identifiers: ["passenger@demo.local", "9000000001"],
    role: "passenger",
    salt: "metrosaarthi-passenger-v1",
    passwordHash:
      "e28bb72223d1d47187a94f71c22b9a1a1cf675d059f269519e6b434d8d935ea3",
  },
  {
    subject: "demo-operator-001",
    displayName: "Demo Station Controller",
    identifiers: ["operator@demo.local", "OP-DEMO-01"],
    role: "operator",
    salt: "metrosaarthi-operator-v1",
    passwordHash:
      "28bbbea99ea45572c768fe6366bd16f48c50c5544d972f9a42db4b104c240507",
  },
]

function toHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function toBase64(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

async function passwordHash(password: string, salt: string) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  )
  return toHex(
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: new TextEncoder().encode(salt),
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      material,
      256,
    ),
  )
}

function openAuthDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("metrosaarthi-demo-auth", 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("keys")) {
        request.result.createObjectStore("keys")
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function sessionKey(): Promise<CryptoKey> {
  const database = await openAuthDatabase()
  const existing = await new Promise<CryptoKey | undefined>(
    (resolve, reject) => {
      const request = database
        .transaction("keys", "readonly")
        .objectStore("keys")
        .get("session-hmac")
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    },
  )
  if (existing) return existing
  const key = await crypto.subtle.generateKey(
    { name: "HMAC", hash: "SHA-256", length: 256 },
    false,
    ["sign", "verify"],
  )
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("keys", "readwrite")
    transaction.objectStore("keys").put(key, "session-hmac")
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  return key
}

async function storeSession(session: AuthSession) {
  const payload = JSON.stringify(session)
  const signature = await crypto.subtle.sign(
    "HMAC",
    await sessionKey(),
    new TextEncoder().encode(payload),
  )
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ payload, signature: toBase64(signature) }),
  )
}

export async function restoreDemoSession(): Promise<AuthSession | null> {
  const stored = localStorage.getItem(SESSION_KEY)
  if (!stored) return null
  try {
    const envelope = JSON.parse(stored) as {
      payload: string
      signature: string
    }
    const valid = await crypto.subtle.verify(
      "HMAC",
      await sessionKey(),
      fromBase64(envelope.signature),
      new TextEncoder().encode(envelope.payload),
    )
    if (!valid) throw new Error("Invalid session signature")
    const session = JSON.parse(envelope.payload) as AuthSession
    if (
      session.expiresAt <= Date.now() ||
      !["passenger", "operator"].includes(session.role)
    ) {
      throw new Error("Expired session")
    }
    return session
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export async function authenticateDemo(
  identifier: string,
  password: string,
  requiredRole: UserRole,
): Promise<{ session: AuthSession | null error?: string }> {
  if (!navigator.onLine) {
    return {
      session: null,
      error:
        "A network connection is required to start a new demo session. Previously verified sessions continue offline until expiry.",
    }
  }
  const normalized = identifier.trim().toLocaleLowerCase()
  const account = DEMO_ACCOUNTS.find((candidate) =>
    candidate.identifiers.some(
      (value) => value.toLocaleLowerCase() === normalized,
    ),
  )
  if (!account) {
    return { session: null, error: "The identifier or password is incorrect." }
  }
  if (account.role !== requiredRole) {
    return {
      session: null,
      error: `This account is not authorized for the ${requiredRole} portal.`,
    }
  }
  const candidateHash = await passwordHash(password, account.salt)
  if (candidateHash !== account.passwordHash) {
    return { session: null, error: "The identifier or password is incorrect." }
  }
  const now = Date.now()
  const session: AuthSession = {
    subject: account.subject,
    displayName: account.displayName,
    identifier: account.identifiers[0],
    role: account.role,
    issuedAt: now,
    expiresAt: now + SESSION_DURATION,
    tokenId: crypto.randomUUID(),
  }
  await storeSession(session)
  return { session }
}

export function clearDemoSession() {
  localStorage.removeItem(SESSION_KEY)
}
