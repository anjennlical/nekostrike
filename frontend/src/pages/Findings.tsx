import { useState } from 'react'
import { ArrowRight, Download, FileCheck2 } from 'lucide-react'
import Panel from '../components/Panel'
import EvidenceIllustration from '../components/EvidenceIllustration'
import EvidenceView from '../components/EvidenceView'
import type { WorkspaceState } from '../useWorkspace'

export default function Findings({ workspace }: { workspace: WorkspaceState }) {
  const [filter, setFilter] = useState('all')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const findings = workspace.data?.findings.filter(
    (finding) => filter === 'all' || finding.review_status === filter,
  )
  async function download() {
    setExporting(true)
    setExportError(null)
    try {
      const response = await fetch('/api/reports/markdown', {
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok || !response.headers.get('content-type')?.includes('text/markdown'))
        throw new Error()
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = 'nekostrike-report.md'
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setExportError('Não foi possível exportar. Verifique o backend e tente novamente.')
    } finally {
      setExporting(false)
    }
  }
  return (
    <>
      <Panel
        title="Achados com contexto"
        eyebrow="EVIDÊNCIAS & REVISÃO"
        action={<span className="subtle-tag">SQLite · persistência local</span>}
      >
        <div className="findings-toolbar">
          <p>
            Resultados reais do laboratório fictício. Cada execução vulnerável gera um registro;
            repetições não são vulnerabilidades distintas.
          </p>
          <label className="filter-label">
            Revisão
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">Todos os achados</option>
              <option value="pending">Pendentes</option>
              <option value="reviewed">Revisados</option>
            </select>
          </label>
        </div>
        {!workspace.data ? (
          <p role="status">
            {workspace.loading
              ? 'Carregando evidências…'
              : 'Histórico indisponível. Atualize os dados para tentar novamente.'}
          </p>
        ) : findings?.length === 0 ? (
          <div className="empty-state findings-empty">
            <EvidenceIllustration />
            <h2>
              {filter === 'all'
                ? 'Sua próxima descoberta começa no laboratório.'
                : 'Nenhum achado neste filtro.'}
            </h2>
            <p>
              {filter === 'all'
                ? 'Não há achados registrados. A ausência de achados não comprova segurança.'
                : 'Escolha outro estado de revisão para consultar os registros.'}
            </p>
            <a className="button primary" href="#lab">
              Explorar Security Lab <ArrowRight size={16} />
            </a>
          </div>
        ) : (
          <div className="finding-list">
            {findings?.map((finding) => {
              const run = workspace.data!.runs.find((item) => item.id === finding.run_id)!
              return (
                <article className="finding-record" key={finding.id}>
                  <div className="finding-record-head">
                    <span className="severity-high">Alta · {finding.category}</span>
                    <span className="subtle-tag">
                      {finding.review_status === 'reviewed' ? 'Revisado' : 'Revisão pendente'}
                    </span>
                  </div>
                  <h3>{finding.title}</h3>
                  <p className="record-meta">
                    {new Date(run.created_at).toLocaleString('pt-BR')} · Execução{' '}
                    {run.id.slice(0, 8)}
                  </p>
                  <p>{finding.impact}</p>
                  <details className="finding-detail">
                    <summary>Inspecionar evidências e recomendação</summary>
                    <p>
                      <strong>Critério de severidade:</strong> {finding.severity_reason}
                    </p>
                    <EvidenceView evidence={run.evidence} />
                    <div className="remediation">
                      <h4>Como corrigir</h4>
                      <p>{finding.remediation}</p>
                      <a
                        className="text-link"
                        href="https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Referência OWASP API1:2023 <ArrowRight size={14} />
                      </a>
                    </div>
                    <p className="record-meta">
                      ID do achado: {finding.id}
                      <br />
                      Execução: {finding.run_id}
                    </p>
                  </details>
                  <button
                    className="button secondary"
                    disabled={!!workspace.busy}
                    onClick={() =>
                      void workspace.review(
                        finding.id,
                        finding.review_status === 'reviewed' ? 'pending' : 'reviewed',
                      )
                    }
                  >
                    <FileCheck2 size={16} />
                    {workspace.busy === finding.id
                      ? 'Salvando…'
                      : finding.review_status === 'reviewed'
                        ? 'Reabrir revisão'
                        : 'Marcar como revisado'}
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </Panel>
      <Panel title="Da evidência ao relatório" eyebrow="EXPORTAÇÃO DETERMINÍSTICA">
        <div className="report-export">
          <div>
            <h3>Seu histórico, documentado.</h3>
            <p>
              Markdown com execuções, requisições, respostas, severidade, recomendações e estado de
              revisão. Inclui todo o histórico, independentemente do filtro acima. Sem IA.
            </p>
            <p>Revisado indica conferência humana; não significa que o achado foi corrigido.</p>
          </div>
          <button
            className="button primary"
            disabled={!workspace.data || exporting}
            onClick={() => void download()}
          >
            <Download size={17} />
            {exporting ? 'Exportando…' : 'Exportar relatório .md'}
          </button>
        </div>
        {exportError && (
          <p role="alert" className="inline-error">
            {exportError}
          </p>
        )}
      </Panel>
    </>
  )
}
