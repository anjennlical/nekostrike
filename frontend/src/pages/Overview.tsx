import {
  Activity,
  ArrowRight,
  BookOpen,
  ChevronRight,
  CodeXml,
  FileSearch,
  FlaskConical,
  LockKeyhole,
  ScanLine,
  Shield,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import Mochi from '../components/Mochi'
import SakuraBloom from '../components/SakuraBloom'
import type { Connection } from '../useHealth'
import type { ReactNode } from 'react'
import Panel from '../components/Panel'
import type { WorkspaceState } from '../useWorkspace'

export default function Overview({
  connection,
  verify,
  workspace,
}: {
  connection: Connection
  verify: ReactNode
  workspace: WorkspaceState
}) {
  return (
    <>
      <section className="sakura-hero overview-hero">
        <SakuraBloom className="hero-blossom" />
        <div className="sakura-hero-copy">
          <span className="sakura-label">
            <Sparkles size={13} /> UM NOVO COMEÇO, LARI
          </span>
          <h2>
            Segurança com precisão.
            <br />
            <span>Um toque de Mochi.</span>
          </h2>
          <p>
            Seu espaço para investigar, entender e documentar.
            <br className="desktop-break" /> Vamos construir uma descoberta de cada vez.
          </p>
          <div className="hero-actions">
            {verify}
            <a className="text-link" href="#lab">
              Explorar laboratório <ArrowRight size={16} />
            </a>
          </div>
        </div>
        <div className="overview-mascot">
          <div className="art-label label-code">
            <CodeXml size={16} />
            <span>evidence first</span>
          </div>
          <Mochi />
          <span className="art-label label-safe">
            <ShieldCheck size={14} /> safe little workspace
          </span>
        </div>
      </section>
      <div className="metrics-grid">
        {[
          {
            title: 'Verificações executadas',
            icon: ScanLine,
            tone: 'pink',
            sub: 'Execuções salvas no laboratório local.',
            value: workspace.data?.runs.length,
          },
          {
            title: 'Achados registrados',
            icon: Shield,
            tone: 'purple',
            sub: 'Registros por execução, com evidências.',
            value: workspace.data?.findings.length,
          },
          {
            title: 'Achados revisados',
            icon: BookOpen,
            tone: 'peach',
            sub: 'Conferência humana, não correção.',
            value: workspace.data?.findings.filter(
              (finding) => finding.review_status === 'reviewed',
            ).length,
          },
        ].map(({ title, icon: Icon, tone, sub, value }) => (
          <section className="metric-card" key={title}>
            <div className="metric-top">
              <span>{title}</span>
              <span className={`metric-icon ${tone}`}>
                <Icon size={19} />
              </span>
            </div>
            <div className="metric-value">
              {value ?? '—'}{' '}
              <span>{value === undefined ? 'Dados indisponíveis' : 'No histórico local'}</span>
            </div>
            <p>{sub}</p>
          </section>
        ))}
      </div>
      <div className="overview-grid">
        <Panel
          title="Atividade recente"
          eyebrow="SEU HISTÓRICO"
          action={
            <button
              className="text-link"
              disabled={workspace.loading || !!workspace.busy}
              onClick={() => void workspace.refresh()}
            >
              Atualizar dados
            </button>
          }
        >
          {workspace.data && workspace.data.runs.length > 0 ? (
            <div className="recent-runs">
              {workspace.data.runs.slice(0, 5).map((run) => (
                <div className="recent-run" key={run.id}>
                  <span className="service-icon">
                    <FlaskConical size={18} />
                  </span>
                  <div>
                    <strong>
                      BOLA · {run.mode === 'fixed' ? 'cenário corrigido' : 'cenário vulnerável'}
                    </strong>
                    <small>{new Date(run.created_at).toLocaleString('pt-BR')}</small>
                  </div>
                  <span className="subtle-tag">
                    {run.verdict === 'vulnerable' ? 'Achado confirmado' : 'Acesso bloqueado'}
                  </span>
                </div>
              ))}
              <a className="text-link" href="#findings">
                Ver evidências e exportar <ArrowRight size={15} />
              </a>
            </div>
          ) : (
            <div className="empty-state activity-empty">
              <div className="empty-illustration">
                <FileSearch size={31} strokeWidth={1.3} />
                <span>
                  <Sparkles size={13} />
                </span>
              </div>
              <h3>Toda investigação tem um começo.</h3>
              <p>
                {workspace.data
                  ? 'Nenhuma execução registrada. Execute o cenário BOLA no laboratório para começar.'
                  : workspace.loading
                    ? 'Carregando seu histórico…'
                    : 'Histórico indisponível. Atualize os dados para tentar novamente.'}
              </p>
              <a className="text-link" href="#lab">
                Conhecer o Security Lab <ArrowRight size={15} />
              </a>
            </div>
          )}
          <div className="panel-foot">
            <FileSearch size={14} /> Um teste de leitura de objetos. Dados fictícios, evidências
            reais.
          </div>
        </Panel>
        <Panel title="Um ambiente, sob controle" eyebrow="STATUS DO WORKSPACE">
          <div className="service-row">
            <span className="service-icon">
              <Activity size={18} />
            </span>
            <div>
              <strong>Backend FastAPI</strong>
              <small>Conexão real · /api/health</small>
            </div>
            <span className={`service-state ${connection.status}`}>
              {connection.status === 'online'
                ? 'Online'
                : connection.status === 'loading'
                  ? 'Verificando'
                  : 'Offline'}
            </span>
          </div>
          <div className="service-row">
            <span className="service-icon">
              <FlaskConical size={18} />
            </span>
            <div>
              <strong>Laboratório de API</strong>
              <small>Testes em ambiente isolado</small>
            </div>
            <span className="service-state">
              {connection.data?.lab.status === 'ready' ? 'BOLA disponível' : 'Não verificado'}
            </span>
          </div>
          <div className="service-row">
            <span className="service-icon">
              <Sparkles size={18} />
            </span>
            <div>
              <strong>Mochi AI</strong>
              <small>Análise assistida por evidências</small>
            </div>
            <span className="service-state">IA indisponível</span>
          </div>
          <div className="local-notice">
            <LockKeyhole size={16} />
            <p>
              <strong>Um espaço controlado para aprender.</strong>Os testes são limitados ao
              laboratório local do projeto.
            </p>
          </div>
        </Panel>
      </div>
      <section className="journey">
        <div className="journey-intro">
          <span className="eyebrow">NOSSO CAMINHO</span>
          <h2>Da curiosidade à evidência.</h2>
        </div>
        <div className="journey-steps">
          <a href="#lab">
            <span>01</span> Testar <ChevronRight size={14} />
          </a>
          <a href="#findings">
            <span>02</span> Investigar <ChevronRight size={14} />
          </a>
          <a href="#mochi">
            <span>03</span> Analisar <ChevronRight size={14} />
          </a>
          <a href="#findings">
            <span>04</span> Relatar <ChevronRight size={14} />
          </a>
        </div>
      </section>
    </>
  )
}
