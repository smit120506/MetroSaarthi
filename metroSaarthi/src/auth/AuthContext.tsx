import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import {
  authenticateDemo,
  clearDemoSession,
  restoreDemoSession,
  type AuthSession,
  type UserRole,
} from "./demoAuth"

type AuthContextValue = {
  session: AuthSession | null
  loading: boolean
  login: (
    identifier: string,
    password: string,
    role: UserRole,
  ) => Promise<{ ok: boolean error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    restoreDemoSession()
      .then(setSession)
      .finally(() => setLoading(false))
    const refresh = () => restoreDemoSession().then(setSession)
    window.addEventListener("storage", refresh)
    return () => window.removeEventListener("storage", refresh)
  }, [])

  useEffect(() => {
    if (!session) return
    const remaining = session.expiresAt - Date.now()
    if (remaining <= 0) {
      clearDemoSession()
      setSession(null)
      return
    }
    const timer = window.setTimeout(() => {
      clearDemoSession()
      setSession(null)
    }, remaining)
    return () => window.clearTimeout(timer)
  }, [session])

  const login: AuthContextValue["login"] = async (
    identifier,
    password,
    role,
  ) => {
    try {
      const result = await authenticateDemo(identifier, password, role)
      if (!result.session) return { ok: false, error: result.error }
      setSession(result.session)
      return { ok: true }
    } catch {
      return {
        ok: false,
        error:
          "Secure local session storage is unavailable in this browser. Authentication could not continue.",
      }
    }
  }

  const logout = () => {
    clearDemoSession()
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
