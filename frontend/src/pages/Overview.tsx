import {
  Activity,
  ArrowRight,
  BookOpen,
  ChevronRight,
  CodeXml,
  FileSearch,
  FlaskConical,
  LockKeyhole,
  RefreshCw,
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
import MetricCard from '../components/MetricCard'
import type { WorkspaceState } from '../useWorkspace'
import { labChecks } from '../lab-checks'

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
    <div className="overview-page workspace-page">
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
            <a className="button primary" href="#lab">
              Explorar laboratório <ArrowRight size={16} />
            </a>
            {verify}
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
        ].map((metric) => (
          <MetricCard key={metric.title} {...metric} loading={workspace.loading} />
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
              <RefreshCw size={14} className={workspace.loading ? 'spin' : ''} aria-hidden="true" />
              {workspace.loading ? 'Atualizando…' : 'Atualizar dados'}
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
                      {labChecks[run.check_type].label} ·{' '}
                      {run.mode === 'fixed' ? 'cenário corrigido' : 'cenário vulnerável'}
                    </strong>
                    <small>{new Date(run.created_at).toLocaleString('pt-BR')}</small>
                  </div>
                  <span className={`subtle-tag verdict-${run.verdict}`}>
                    {run.verdict === 'vulnerable'
                      ? 'Achado confirmado'
                      : run.check_type === 'security_misconfiguration'
                        ? 'Erro sem detalhes'
                        : run.check_type === 'data_exposure'
                          ? 'Campos limitados'
                          : 'Acesso bloqueado'}
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
              <h3>
                {workspace.data
                  ? 'Toda investigação tem um começo.'
                  : workspace.loading
                    ? 'Buscando suas evidências…'
                    : 'Seu histórico está indisponível.'}
              </h3>
              <p>
                {workspace.data
                  ? 'Nenhuma execução registrada. Escolha uma verificação no laboratório para começar.'
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
            <FileSearch size={14} /> Testes de objetos, campos e respostas de erro. Dados fictícios,
            evidências reais.
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
              {connection.data?.lab.status === 'ready'
                ? `${connection.data.lab.checks?.length ?? 1} verificações`
                : 'Não verificado'}
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
            <span>03</span> Mochi AI · em breve <ChevronRight size={14} />
          </a>
          <a href="#findings">
            <span>04</span> Relatar <ChevronRight size={14} />
          </a>
        </div>
      </section>
    </div>
  )
}
