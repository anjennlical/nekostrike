import { CircleHelp, FileSearch, FlaskConical, Heart, LockKeyhole, ShieldCheck } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import type { Connection } from '../useHealth'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import Panel from '../components/Panel'
import EvidenceView from '../components/EvidenceView'
import type { WorkspaceState } from '../useWorkspace'
import type { CheckType } from '../workspace-api'
import { labChecks } from '../lab-checks'
import { useScrollReveal } from '../useScrollReveal'

export default function SecurityLab({
  connection,
  verify,
  checkedAt,
  workspace,
  checkType,
  setCheckType,
}: {
  connection: Connection
  verify: ReactNode
  checkedAt: string | null
  workspace: WorkspaceState
  checkType: CheckType
  setCheckType: (value: CheckType) => void
}) {
  const revealScope = useScrollReveal()
  const selectedCheck = labChecks[checkType]
  const exposureReady = connection.data?.lab.checks?.includes('data_exposure') ?? false
  const configurationReady =
    connection.data?.lab.checks?.includes('security_misconfiguration') ?? false
  const selectedReady =
    checkType === 'bola' || (checkType === 'data_exposure' ? exposureReady : configurationReady)
  const [runFeedback, setRunFeedback] = useState<{
    mode: 'vulnerable' | 'fixed'
    status: 'running' | 'success' | 'error'
  } | null>(null)
  const resultPanel = useRef<HTMLDivElement>(null)
  const submitting = useRef(false)
  const displayedRun =
    workspace.busy === 'run'
      ? null
      : workspace.lastRun?.check_type === checkType
        ? workspace.lastRun
        : workspace.data?.runs.find((run) => run.check_type === checkType)

  function showResult() {
    resultPanel.current?.focus({ preventScroll: true })
    resultPanel.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }

  useEffect(() => {
    if (runFeedback?.status === 'success') showResult()
  }, [runFeedback])

  async function execute(mode: 'vulnerable' | 'fixed') {
    if (submitting.current || workspace.busy) return
    submitting.current = true
    setRunFeedback({ mode, status: 'running' })
    try {
      const run = await workspace.execute(mode, checkType)
      setRunFeedback({ mode, status: run ? 'success' : 'error' })
    } finally {
      submitting.current = false
    }
  }

  function feedback(mode: 'vulnerable' | 'fixed') {
    if (runFeedback?.mode !== mode) return null
    if (runFeedback.status === 'error')
      return (
        <div className="scenario-feedback is-error" role="alert">
          <strong>Não foi possível confirmar a execução.</strong>
          <p>
            Confira o histórico antes de repetir: a resposta pode ter sido interrompida após o
            salvamento.
          </p>
          <button
            className="text-link"
            disabled={workspace.loading || !!workspace.busy}
            onClick={() => void workspace.refresh()}
          >
            Atualizar histórico
          </button>
        </div>
      )
    return (
      <div className="scenario-feedback" role="status" data-state={runFeedback.status}>
        {runFeedback.status === 'running' ? (
          'Executando e salvando… Aguarde a confirmação.'
        ) : (
          <>
            <strong>Execução concluída e salva.</strong>
            <button className="text-link" onClick={showResult}>
              Ver resultado desta execução
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="workspace-page lab-page" ref={revealScope}>
      <section className="section-banner lab-banner" data-reveal="fade-in">
        <div className="lab-insignia" aria-hidden="true">
          <FlaskConical size={30} />
        </div>
        <div>
          <span className="eyebrow">LABORATÓRIO CONTROLADO</span>
          <h2>Aprender. Testar. Entender.</h2>
          <p>
            Investigue pedidos, perfis e respostas de erro fictícios. Escolha uma verificação e
            compare o cenário vulnerável com a versão corrigida.
          </p>
        </div>
        <span className="subtle-tag">3 verificações locais</span>
      </section>
      <div className="lab-check-picker">
        <label className="filter-label">
          Verificação do laboratório
          <select
            value={checkType}
            disabled={!!workspace.busy}
            onChange={(event) => {
              setCheckType(event.target.value as CheckType)
              setRunFeedback(null)
            }}
          >
            <option value="bola">BOLA · acesso ao objeto</option>
            <option value="data_exposure" disabled={!exposureReady}>
              Exposição de dados
            </option>
            <option value="security_misconfiguration" disabled={!configurationReady}>
              Configuração insegura
            </option>
          </select>
        </label>
        {(!exposureReady || !configurationReady) && (
          <p>
            Para habilitar as três verificações, reinicie o projeto com o backend 0.4 e clique em
            Verificar conexão. Opções indisponíveis não foram anunciadas pelo backend conectado.
          </p>
        )}
      </div>
      <Panel title={selectedCheck.title} eyebrow={selectedCheck.eyebrow} reveal={false}>
        <p className="panel-description motion-selection" key={checkType}>
          {selectedCheck.description}
        </p>
        <p className="learning-note">
          <CircleHelp size={18} aria-hidden="true" />
          <span>
            <strong>Entenda o teste: </strong>
            {selectedCheck.lesson}
          </span>
        </p>
        <div className="lab-scenarios">
          <article data-reveal="fade-up">
            <span className="scenario-number">A / INVESTIGAR</span>
            <h3>Cenário vulnerável</h3>
            <p>{selectedCheck.vulnerable}</p>
            <p className="scenario-outcome">
              <strong>Resultado esperado:</strong> {selectedCheck.vulnerableExpected}
            </p>
            <button
              className="button primary"
              disabled={!!workspace.busy || !selectedReady}
              aria-busy={runFeedback?.mode === 'vulnerable' && runFeedback.status === 'running'}
              onClick={() => void execute('vulnerable')}
            >
              <FlaskConical size={16} />
              {runFeedback?.mode === 'vulnerable' && runFeedback.status === 'running'
                ? 'Executando cenário vulnerável…'
                : 'Executar cenário vulnerável'}
            </button>
            {feedback('vulnerable')}
          </article>
          <article data-reveal="fade-up" data-reveal-index="1">
            <span className="scenario-number">B / COMPARAR</span>
            <h3>Cenário corrigido</h3>
            <p>{selectedCheck.fixed}</p>
            <p className="scenario-outcome">
              <strong>Resultado esperado:</strong> {selectedCheck.fixedExpected}
            </p>
            <button
              className="button secondary"
              disabled={!!workspace.busy || !selectedReady}
              aria-busy={runFeedback?.mode === 'fixed' && runFeedback.status === 'running'}
              onClick={() => void execute('fixed')}
            >
              <ShieldCheck size={16} />
              {runFeedback?.mode === 'fixed' && runFeedback.status === 'running'
                ? 'Executando cenário corrigido…'
                : 'Executar cenário corrigido'}
            </button>
            {feedback('fixed')}
          </article>
        </div>
        {displayedRun && (
          <div
            className="run-result"
            data-verdict={displayedRun.verdict}
            data-reveal="fade-in"
            ref={resultPanel}
            tabIndex={-1}
            role="region"
            aria-labelledby="run-result-title"
          >
            <span className="eyebrow">
              {workspace.lastRun?.id === displayedRun.id
                ? 'ÚLTIMA EXECUÇÃO NESTA SESSÃO'
                : 'ÚLTIMA EXECUÇÃO SALVA NO HISTÓRICO'}
            </span>
            <h3 id="run-result-title">
              {displayedRun.verdict === 'vulnerable'
                ? selectedCheck.vulnerableResult
                : selectedCheck.fixedResult}
            </h3>
            <p>
              <strong>
                {displayedRun.mode === 'vulnerable' ? 'Cenário vulnerável' : 'Cenário corrigido'}
              </strong>{' '}
              · {new Date(displayedRun.created_at).toLocaleString('pt-BR')} · ID{' '}
              {displayedRun.id.slice(0, 8)}. Este resultado se limita ao cenário executado.
            </p>
            <EvidenceView evidence={displayedRun.evidence} checkType={displayedRun.check_type} />
            <a className="text-link" href="#findings">
              Consultar achados e exportar relatório <FileSearch size={16} />
            </a>
          </div>
        )}
      </Panel>
      <div className="overview-grid">
        <Panel title="Verificação de conectividade" eyebrow="DISPONÍVEL AGORA">
          <p className="panel-description">
            Uma requisição real ao FastAPI confirma se a base da plataforma está acessível. Esta
            verificação não procura vulnerabilidades.
          </p>
          <div className="endpoint">
            <span>GET</span>
            <code>/api/health</code>
            <StatusBadge status={connection.status} />
          </div>
          <div className="action-row">
            {verify}
            {checkedAt && <span className="muted">Última resposta: {checkedAt}</span>}
          </div>
          {connection.data && (
            <details className="response-frame health-response">
              <summary>Ver resposta técnica · JSON da última verificação</summary>
              <pre
                className="response-code"
                tabIndex={0}
                aria-label="Resposta real do health check"
              >
                {JSON.stringify(connection.data, null, 2)}
              </pre>
            </details>
          )}
        </Panel>
        <Panel title="Limites claros, desde o início" eyebrow="ESCOPO DO LAB" revealIndex={1}>
          <ul className="check-list">
            <li>
              <ShieldCheck />
              Somente recursos locais controlados pelo projeto.
            </li>
            <li>
              <LockKeyhole />
              Nenhum campo para informar alvos externos.
            </li>
            <li>
              <FileSearch />
              Evidências geradas por verificações programáticas.
            </li>
            <li>
              <Heart />
              Usuários e informações inteiramente fictícios.
            </li>
          </ul>
          <div className="local-notice">
            <CircleHelp size={17} />
            <p>
              O laboratório vulnerável não possui porta própria e não é exposto pelo backend. BOLA,
              exposição de dados e configuração de erros estão implementados. Isso não cobre todos
              os riscos de uma API.
            </p>
          </div>
        </Panel>
      </div>
      <Panel
        title="Três caminhos para aprender"
        eyebrow="VERIFICAÇÕES IMPLEMENTADAS"
        reveal={false}
      >
        <div className="test-grid">
          {[
            {
              n: '01',
              title: 'Autorização de objetos',
              text: 'Verificar se um usuário consegue acessar um recurso que pertence a outro usuário.',
              tag: 'BOLA · implementado',
            },
            {
              n: '02',
              title: 'Exposição de dados',
              text: 'Identificar campos sensíveis que não deveriam estar presentes na resposta da API.',
              tag: 'Exposição · implementado',
            },
            {
              n: '03',
              title: 'Configurações inseguras',
              text: 'Comparar detalhes de diagnóstico fictícios com uma resposta de erro genérica.',
              tag: 'Configuração · implementado',
            },
          ].map((test) => (
            <article
              className="planned-test"
              key={test.n}
              data-reveal="fade-up"
              data-reveal-index={Number(test.n) - 1}
            >
              <span className="test-number">{test.n}</span>
              <h3>{test.title}</h3>
              <p>{test.text}</p>
              <span className="subtle-tag">{test.tag}</span>
              <small>Disponível no seletor de verificação</small>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  )
}
