import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { normalizeTheme, resolveTheme, type ThemePreference } from '../theme'

const ThemeContext = createContext<{
  preference: ThemePreference
  setPreference: (value: ThemePreference) => void
} | null>(null)
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState(() =>
    normalizeTheme(document.documentElement.dataset.themePreference),
  )
  const [systemDark, setSystemDark] = useState(
    () => matchMedia('(prefers-color-scheme: dark)').matches,
  )
  useEffect(() => {
    const query = matchMedia('(prefers-color-scheme: dark)')
    const change = () => setSystemDark(query.matches)
    query.addEventListener('change', change)
    change()
    return () => query.removeEventListener('change', change)
  }, [])
  useLayoutEffect(() => {
    const resolved = resolveTheme(preference, systemDark)
    document.documentElement.dataset.theme = resolved
    document.documentElement.dataset.themePreference = preference
    document.documentElement.style.colorScheme = resolved
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolved === 'dark' ? '#2A1C30' : '#FFF8FC')
    try {
      localStorage.setItem('nekostrike-theme', preference)
    } catch {
      /* Session remains usable. */
    }
  }, [preference, systemDark])
  return (
    <ThemeContext.Provider value={{ preference, setPreference }}>{children}</ThemeContext.Provider>
  )
}
export function ThemeSelect({ compact = false }: { compact?: boolean }) {
  const theme = useContext(ThemeContext)!
  const Icon = theme.preference === 'light' ? Sun : theme.preference === 'dark' ? Moon : Monitor
  return (
    <label className={`theme-select ${compact ? 'theme-select-compact' : ''}`}>
      <Icon size={16} aria-hidden="true" />
      <span className="sr-only">Tema da interface</span>
      <select
        value={theme.preference}
        onChange={(event) => theme.setPreference(normalizeTheme(event.target.value))}
      >
        <option value="light">Claro</option>
        <option value="dark">Escuro</option>
        <option value="system">Sistema</option>
      </select>
    </label>
  )
}
