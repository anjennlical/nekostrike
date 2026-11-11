import Overview from './pages/Overview'
import SecurityLab from './pages/SecurityLab'
import Findings from './pages/Findings'
import MochiAI from './pages/MochiAI'
import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  FileSearch,
  FlaskConical,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  PawPrint,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import StatusBadge from './components/StatusBadge'
import { useHealth } from './useHealth'
import { useWorkspace } from './useWorkspace'

const pages = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    caption: 'Seu workspace, em um olhar.',
  },
  {
    id: 'lab',
    label: 'Security Lab',
    icon: FlaskConical,
    caption: 'Um espaço controlado para aprender na prática.',
  },
  {
    id: 'findings',
    label: 'Findings',
    icon: FileSearch,
    caption: 'Evidências primeiro. Conclusões depois.',
  },
  {
    id: 'mochi',
    label: 'Mochi AI',
    icon: Sparkles,
    caption: 'Uma parceira para transformar evidências em clareza.',
  },
] as const
type Page = (typeof pages)[number]['id']
function currentPage(): Page {
  const route = window.location.hash.slice(1)
  return pages.find((page) => page.id === route)?.id ?? 'overview'
}

export default function App() {
  const [page, setPage] = useState<Page>(currentPage)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const navigation = useRef<HTMLElement>(null)
  const { connection, refresh } = useHealth()
  const workspace = useWorkspace()
  const selected = pages.find((item) => item.id === page)!
  useEffect(() => {
    const handleHash = () => {
      setPage(currentPage())
      setMenuOpen(false)
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])
  useEffect(() => {
    document.title = `${selected.label} · NekoStrike`
  }, [selected.label])
  useEffect(() => {
    if (menuOpen)
      navigation.current?.querySelector<HTMLAnchorElement>('[aria-current="page"]')?.focus()
  }, [menuOpen])
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menuOpen) {
        setMenuOpen(false)
        menuButton.current?.focus()
      }
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [menuOpen])
  const verify = (
    <button
      className={`button ${page === 'overview' ? 'secondary' : 'primary'}`}
      onClick={() => {
        void refresh()
        void workspace.refresh()
      }}
      disabled={connection.status === 'loading'}
    >
      <RefreshCw size={16} className={connection.status === 'loading' ? 'spin' : ''} />
      {connection.status === 'loading' ? 'Verificando…' : 'Verificar conexão'}
    </button>
  )
  const checkedAt = connection.data
    ? new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(connection.data.timestamp))
    : null

  return (
    <div className="app-shell sakura-theme">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
      >
        Pular para o conteúdo
      </a>
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
        <a href="#overview" className="brand" aria-label="NekoStrike, início">
          <span className="brand-mark">
            <PawPrint size={23} strokeWidth={1.8} />
          </span>
          <span>
            Neko<span className="brand-light">Strike</span>
            <small>SECURITY WORKSPACE</small>
          </span>
        </a>
        <div className="workspace-label">
          <span className="workspace-avatar">L</span>
          <div>
            Workspace da Lari<small>Ambiente de desenvolvimento</small>
          </div>
          <LockKeyhole size={13} />
        </div>
        <p className="nav-heading">WORKSPACE</p>
        <nav id="workspace-navigation" ref={navigation} aria-label="Navegação principal">
          {pages.map(({ id, label, icon: Icon }) => (
            <a
              href={`#${id}`}
              key={id}
              className={`nav-link ${page === id ? 'active' : ''}`}
              aria-current={page === id ? 'page' : undefined}
              onClick={() => {
                if (menuOpen) document.getElementById('main-content')?.focus()
                setMenuOpen(false)
              }}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === 'mochi' ? (
                <span className="tiny-tag">AI</span>
              ) : (
                page === id && <span className="nav-dot" />
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="mochi-note">
            <span className="note-icon">
              <Sparkles size={18} />
            </span>
            <p>
              Pequenos passos.
              <br />
              <strong>Grandes descobertas.</strong>
            </p>
            <a href="#mochi">
              Conheça a Mochi <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="local-footer">
            <ShieldCheck size={17} />
            <div>
              Feito para explorar com cuidado<small>Local. Controlado. Seu.</small>
            </div>
          </div>
          <span className="version">
            NekoStrike <span>v0.3 · Lab & evidências</span>
          </span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              ref={menuButton}
              aria-controls="workspace-navigation"
              aria-label={menuOpen ? 'Fechar navegação' : 'Abrir navegação'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="breadcrumb-root">Workspace</span>
            <ChevronRight size={14} />
            <strong>{selected.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="local-pill">
              <LockKeyhole size={12} /> AMBIENTE LOCAL
            </span>
            <span className="profile" aria-label="Workspace da Lari">
              L
            </span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <div className="page-kicker">
                NEKOSTRIKE / {page === 'overview' ? 'VISÃO GERAL' : selected.label.toUpperCase()}
              </div>
              <h1>
                {selected.label}
                <span className="heading-dot">.</span>
              </h1>
              <p>{selected.caption}</p>
            </div>
            <div className="connection-summary" aria-live="polite">
              <span className="backend-label">BACKEND LOCAL</span>
              <StatusBadge status={connection.status} />
              <small>{checkedAt ? `Verificado às ${checkedAt}` : 'Health check do backend'}</small>
            </div>
          </div>
          {connection.status === 'offline' && (
            <div className="error-banner" role="alert">
              <Activity size={20} />
              <div>
                <strong>Não foi possível conectar à API local.</strong>
                <p>
                  {connection.message} Inicie o backend na porta 8000 e tente novamente. As áreas do
                  workspace continuam acessíveis.
                </p>
              </div>
              <button
                className="button secondary"
                onClick={() => {
                  void refresh()
                  void workspace.refresh()
                }}
              >
                Tentar novamente
              </button>
            </div>
          )}

          <div className="workspace-feedback" aria-live="polite">
            {workspace.error && (
              <div className="error-banner" role="alert">
                <p>{workspace.error}</p>
                <button
                  className="button secondary"
                  disabled={workspace.loading || !!workspace.busy}
                  onClick={() => void workspace.refresh()}
                >
                  Atualizar dados
                </button>
              </div>
            )}
            {workspace.notice && !workspace.error && (
              <p className="workspace-notice">
                <ShieldCheck size={17} />
                {workspace.notice}
              </p>
            )}
          </div>
          {page === 'overview' && (
            <Overview connection={connection} verify={verify} workspace={workspace} />
          )}

          {page === 'lab' && (
            <SecurityLab
              connection={connection}
              verify={verify}
              checkedAt={checkedAt}
              workspace={workspace}
            />
          )}

          {page === 'findings' && <Findings workspace={workspace} />}

          {page === 'mochi' && <MochiAI />}
          <footer className="page-footer">
            <span>
              <PawPrint size={13} /> Feito com cuidado. Construído com evidências.
            </span>
            <span>NekoStrike · AI-Assisted Offensive Security</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
