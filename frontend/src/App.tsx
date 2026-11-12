import Overview from './pages/Overview'
import SecurityLab from './pages/SecurityLab'
import Findings from './pages/Findings'
import MochiAI from './pages/MochiAI'
import About from './pages/About'
import { useCallback, useEffect, useRef, useState } from 'react'
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
  BookHeart,
  Settings2,
  ArrowUp,
} from 'lucide-react'
import SystemHeartbeat from './components/SystemHeartbeat'
import { ThemeSelect } from './components/ThemeProvider'
import Dialog from './components/Dialog'
import CinematicIntro from './components/CinematicIntro'
import Notice from './components/Notice'
import type { CheckType } from './workspace-api'
import { useHealth } from './useHealth'
import { useWorkspace } from './useWorkspace'
import { MotionToggle, useWorkspaceMotion } from './components/WorkspaceMotion'

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
  {
    id: 'about',
    label: 'Conheça o NekoStrike',
    icon: BookHeart,
    caption: 'A história, o propósito e os limites do nosso workspace.',
  },
] as const
type Page = (typeof pages)[number]['id']
function currentPage(): Page {
  const route = window.location.hash.slice(1)
  return pages.find((page) => page.id === route)?.id ?? 'overview'
}

export default function App() {
  const motion = useWorkspaceMotion()
  const [page, setPage] = useState<Page>(currentPage)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPresent, setMenuPresent] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [introOpen, setIntroOpen] = useState(false)
  const [introAutomatic, setIntroAutomatic] = useState(true)
  const [showTop, setShowTop] = useState(false)
  const [checkType, setCheckType] = useState<CheckType>('bola')
  const [findingFilter, setFindingFilter] = useState('all')
  const introChecked = useRef(false)
  const replayPending = useRef(false)
  const closeIntro = useCallback(() => setIntroOpen(false), [])
  const replayIntro = () => {
    setIntroAutomatic(false)
    setIntroOpen(true)
  }
  const menuButton = useRef<HTMLButtonElement>(null)
  const navigation = useRef<HTMLElement>(null)
  const { connection, refresh, lastSuccess } = useHealth()
  const workspace = useWorkspace()
  const selected = pages.find((item) => item.id === page)!
  useEffect(() => {
    if (menuOpen) {
      setMenuPresent(true)
      return
    }
    if (!motion.enabled) {
      setMenuPresent(false)
      return
    }
    const timer = setTimeout(() => setMenuPresent(false), 180)
    return () => clearTimeout(timer)
  }, [menuOpen, motion.enabled])
  useEffect(() => {
    if (introChecked.current) return
    introChecked.current = true
    try {
      const seen = sessionStorage.getItem('nekostrike-intro-seen')
      sessionStorage.setItem('nekostrike-intro-seen', 'yes')
      if (!seen && motion.enabled) setIntroOpen(true)
    } catch {
      /* Storage blocked: skip automatic intro, keep manual replay. */
    }
  }, [motion.enabled])
  useEffect(() => {
    const scroll = () => setShowTop(window.scrollY > 500)
    window.addEventListener('scroll', scroll, { passive: true })
    return () => window.removeEventListener('scroll', scroll)
  }, [])
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
    if (menuOpen && menuPresent)
      navigation.current?.querySelector<HTMLAnchorElement>('[aria-current="page"]')?.focus()
  }, [menuOpen, menuPresent])
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
      aria-busy={connection.status === 'loading'}
    >
      <RefreshCw size={16} className={connection.status === 'loading' ? 'spin' : ''} />
      {connection.status === 'loading' ? 'Verificando…' : 'Verificar conexão'}
    </button>
  )
  const checkedAt = lastSuccess
    ? new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(lastSuccess))
    : null

  return (
    <div className="app-shell sakura-theme" data-motion={motion.enabled ? 'on' : 'off'}>
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
      <aside
        className={`sidebar ${menuPresent ? 'is-open' : ''}`}
        data-closing={(menuPresent && !menuOpen) || undefined}
        inert={(menuPresent && !menuOpen) || undefined}
      >
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
          {pages
            .filter((item) => item.id !== 'about')
            .map(({ id, label, icon: Icon }) => (
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
          <p className="nav-heading nav-help-heading">AJUDA & SOBRE</p>
          <a
            className={`nav-link nav-about ${page === 'about' ? 'active' : ''}`}
            href="#about"
            aria-current={page === 'about' ? 'page' : undefined}
            onClick={() => {
              if (menuOpen) document.getElementById('main-content')?.focus()
              setMenuOpen(false)
            }}
          >
            <BookHeart size={19} />
            <span>Conheça o NekoStrike</span>
          </a>
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
            NekoStrike <span>v0.4 · Lab & evidências</span>
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
            <MotionToggle compact />
            <ThemeSelect compact />
            <button
              type="button"
              className="preferences-button"
              aria-label="Abrir preferências"
              onClick={() => setPreferencesOpen(true)}
            >
              <Settings2 size={18} />
            </button>
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
            <SystemHeartbeat connection={connection} checkedAt={checkedAt} refresh={refresh} />
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
              <Notice key={workspace.notice} message={workspace.notice} />
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
              checkType={checkType}
              setCheckType={setCheckType}
            />
          )}

          {page === 'findings' && (
            <Findings workspace={workspace} filter={findingFilter} setFilter={setFindingFilter} />
          )}

          {page === 'mochi' && <MochiAI />}
          {page === 'about' && <About replayIntro={replayIntro} />}
          <footer className="page-footer">
            <span>
              <PawPrint size={13} /> Feito com cuidado. Construído com evidências.
            </span>
            <span>NekoStrike · AI-Assisted Offensive Security</span>
          </footer>
        </main>
        {showTop && (
          <button
            type="button"
            className="scroll-top"
            aria-label="Voltar ao topo"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: motion.enabled ? 'smooth' : 'instant' })
              document.getElementById('main-content')?.focus({ preventScroll: true })
            }}
          >
            <ArrowUp size={18} />
            <span className="scroll-top-label" aria-hidden="true">
              Voltar ao topo
            </span>
          </button>
        )}
      </div>
      <Dialog
        open={preferencesOpen}
        titleId="preferences-title"
        onClose={() => setPreferencesOpen(false)}
        onAfterClose={() => {
          if (replayPending.current) {
            replayPending.current = false
            replayIntro()
          }
        }}
      >
        <div className="dialog-content">
          <div className="dialog-heading">
            <div>
              <p className="eyebrow">SEU WORKSPACE, SEU RITMO</p>
              <h2 id="preferences-title">Preferências</h2>
            </div>
            <button
              type="button"
              className="dialog-close"
              aria-label="Fechar preferências"
              onClick={() => setPreferencesOpen(false)}
              autoFocus
            >
              <X size={19} />
            </button>
          </div>
          <h3>Aparência</h3>
          <p>
            Sakura Daydream traz rosa claro. Midnight Sakura combina ameixa e lavanda. Sistema
            acompanha a preferência do dispositivo.
          </p>
          <ThemeSelect />
          <h3>Movimento</h3>
          <p>
            A pausa vale em todas as páginas desta sessão. A preferência de movimento reduzido do
            sistema sempre prevalece.
          </p>
          <MotionToggle />
          <h3>Abertura</h3>
          <p>
            Uma apresentação visual curta, sem relação com o carregamento de dados. Escape ou Pular
            introdução encerram a sequência.
          </p>
          <button
            type="button"
            className="button secondary"
            disabled={!motion.enabled}
            onClick={() => {
              replayPending.current = true
              setPreferencesOpen(false)
            }}
          >
            Rever introdução
          </button>
          {!motion.enabled && (
            <p>Reprodução desativada enquanto o movimento estiver reduzido ou pausado.</p>
          )}
        </div>
      </Dialog>
      <CinematicIntro open={introOpen} onClose={closeIntro} automatic={introAutomatic} />
    </div>
  )
}
