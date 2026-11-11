import { CircleHelp, FileSearch, FlaskConical, Heart, LockKeyhole, ShieldCheck } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import type { Connection } from '../useHealth'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import Panel from '../components/Panel'
import EvidenceView from '../components/EvidenceView'
import type { WorkspaceState } from '../useWorkspace'

export default function SecurityLab({
  connection,
  verify,
  checkedAt,
  workspace,
}: {
  connection: Connection
  verify: ReactNode
  checkedAt: string | null
  workspace: WorkspaceState
}) {
  const [runFeedback, setRunFeedback] = useState<{
    mode: 'vulnerable' | 'fixed'
    status: 'running' | 'success' | 'error'
  } | null>(null)
  const resultPanel = useRef<HTMLDivElement>(null)
  const submitting = useRef(false)
  const displayedRun =
    workspace.busy === 'run' ? null : (workspace.lastRun ?? workspace.data?.runs[0])

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
      const run = await workspace.execute(mode)
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
      <div className="scenario-feedback" role="status">
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
    <div className="workspace-page lab-page">
      <section className="section-banner lab-banner">
        <div className="lab-insignia" aria-hidden="true">
          <FlaskConical size={30} />
        </div>
        <div>
          <span className="eyebrow">LABORATÓRIO CONTROLADO</span>
          <h2>Aprender. Testar. Entender.</h2>
          <p>
            Investigue o acesso a pedidos de usuários fictícios. Compare um cenário vulnerável com a
            versão corrigida e acompanhe as respostas reais de cada verificação.
          </p>
        </div>
        <span className="subtle-tag">BOLA · implementado</span>
      </section>
      <Panel title="Um pedido. Dois usuários. Uma fronteira." eyebrow="01 / AUTORIZAÇÃO DE OBJETOS">
        <p className="panel-description">
          Alice pode ler seu próprio pedido. Mas será que consegue ler o pedido de Bob? O teste
          compara o acesso entre usuários e executa um controle corrigido. Tudo acontece dentro do
          processo, sem conexões a alvos externos.
        </p>
        <p className="learning-note">
          <CircleHelp size={18} aria-hidden="true" />
          <span>
            <strong>O que é BOLA?</strong> É uma falha de autorização: estar conectado não deveria
            permitir ler o pedido de outra pessoa. Aqui, HTTP 200 significa leitura permitida; HTTP
            403 significa acesso negado.
          </span>
        </p>
        <div className="lab-scenarios">
          <article>
            <span className="scenario-number">A / INVESTIGAR</span>
            <h3>Cenário vulnerável</h3>
            <p>
              O laboratório omite a autorização por objeto. A leitura indevida deve gerar um achado
              com evidência.
            </p>
            <p className="scenario-outcome">
              <strong>Resultado esperado:</strong> Alice lê o pedido de Bob e um achado é
              registrado.
            </p>
            <button
              className="button primary"
              disabled={!!workspace.busy}
              onClick={() => void execute('vulnerable')}
            >
              <FlaskConical size={16} />
              {runFeedback?.mode === 'vulnerable' && runFeedback.status === 'running'
                ? 'Executando cenário vulnerável…'
                : 'Executar cenário vulnerável'}
            </button>
            {feedback('vulnerable')}
          </article>
          <article>
            <span className="scenario-number">B / COMPARAR</span>
            <h3>Cenário corrigido</h3>
            <p>
              A autorização verifica o proprietário. O pedido de Bob deve retornar HTTP 403 e não
              gerar um achado.
            </p>
            <p className="scenario-outcome">
              <strong>Resultado esperado:</strong> a leitura é bloqueada, sem novo achado.
            </p>
            <button
              className="button secondary"
              disabled={!!workspace.busy}
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
            ref={resultPanel}
            tabIndex={-1}
            role="region"
            aria-labelledby="run-result-title"
          >
            <span className="eyebrow">
              {workspace.lastRun
                ? 'ÚLTIMA EXECUÇÃO NESTA SESSÃO'
                : 'ÚLTIMA EXECUÇÃO SALVA NO HISTÓRICO'}
            </span>
            <h3 id="run-result-title">
              {displayedRun.verdict === 'vulnerable'
                ? 'BOLA demonstrada: acesso indevido confirmado.'
                : 'Acesso entre usuários bloqueado neste teste.'}
            </h3>
            <p>
              <strong>
                {displayedRun.mode === 'vulnerable' ? 'Cenário vulnerável' : 'Cenário corrigido'}
              </strong>{' '}
              · {new Date(displayedRun.created_at).toLocaleString('pt-BR')} · ID{' '}
              {displayedRun.id.slice(0, 8)}. Este resultado se limita ao cenário executado.
            </p>
            <EvidenceView evidence={displayedRun.evidence} />
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
            <div className="response-frame">
              <div className="response-heading">
                <span>RESPOSTA DO BACKEND</span>
                <span>JSON · última verificação</span>
              </div>
              <pre className="response-code" aria-label="Resposta real do health check">
                {JSON.stringify(connection.data, null, 2)}
              </pre>
            </div>
          )}
        </Panel>
        <Panel title="Limites claros, desde o início" eyebrow="ESCOPO DO LAB">
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
              O laboratório vulnerável não possui porta própria e não é exposto pelo backend.
              Somente o cenário BOLA está implementado.
            </p>
          </div>
        </Panel>
      </div>
      <Panel title="Um laboratório em evolução" eyebrow="IMPLEMENTADO & PLANEJADO">
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
              tag: 'Dados sensíveis',
            },
            {
              n: '03',
              title: 'Configurações inseguras',
              text: 'Examinar configurações propositalmente inseguras dentro do laboratório.',
              tag: 'Configuração',
            },
          ].map((test) => (
            <article className="planned-test" key={test.n}>
              <span className="test-number">{test.n}</span>
              <h3>{test.title}</h3>
              <p>{test.text}</p>
              <span className="subtle-tag">{test.tag}</span>
              <small>
                {test.n === '01'
                  ? 'Disponível nos cenários acima'
                  : 'Planejado · execução indisponível'}
              </small>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  )
}
