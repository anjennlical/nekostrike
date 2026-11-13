import { useEffect, useRef, type ReactNode } from 'react'
import { Check, FileSearch, Heart, LoaderCircle } from 'lucide-react'
import MochiHistory from './MochiHistory'
import EvidenceWorkspace from './EvidenceWorkspace'
import AIProviderStatus from './AIProviderStatus'
import MochiCompanion from './MochiCompanion'
import MochiResult from './MochiResult'
import type { AIState } from '../useAI'
import type { WorkspaceState } from '../useWorkspace'
import { aiPresentation } from '../ai-presentation'

export default function MochiAnalysis({
  ai,
  workspace,
  motionControl,
}: {
  ai: AIState
  workspace: WorkspaceState
  motionControl?: ReactNode
}) {
  const { finding, run, result } = aiPresentation(ai, workspace)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const focusOpenedResult = useRef(false)
  const wasPending = useRef(false)
  useEffect(() => {
    if (result && (focusOpenedResult.current || wasPending.current)) {
      focusOpenedResult.current = false
      resultHeading.current?.focus()
    }
    wasPending.current = ai.pending
  }, [result, ai.pending])
  function openHistory(id: string) {
    if (result?.record?.id === id) resultHeading.current?.focus()
    else {
      focusOpenedResult.current = true
      ai.openSaved(id)
    }
  }
  return (
    <div className="mochi-analysis studio-workbench">
      <AIProviderStatus ai={ai} />
      <div className="studio-layout">
        <EvidenceWorkspace ai={ai} workspace={workspace} />
        <section className="studio-analysis studio-surface" aria-label="Mochi Analysis">
          <MochiCompanion
            ai={ai}
            selected={!!finding}
            hasResult={!!result}
            controls={motionControl}
          />
          {ai.pending && (
            <div className="studio-processing" role="status" aria-live="polite">
              <LoaderCircle size={19} aria-hidden="true" />
              <div>
                <strong>Uma explicação começa pelas evidências.</strong>
                <p>Requisição em andamento. Aguarde; não envie outra solicitação.</p>
              </div>
              <span className="studio-loading-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </div>
          )}
          {ai.error && (
            <p className="ai-error" role="alert">
              {ai.error}
            </p>
          )}
          {ai.localNotice && (
            <p className="studio-local-notice" role="status">
              <Check size={16} aria-hidden="true" />
              {ai.localNotice}
            </p>
          )}
          {result ? (
            <>
              <p className="studio-sr-only" role="status">
                {result.record?.review_status === 'reviewed'
                  ? 'Análise salva e revisão humana registrada. Revisado não significa corrigido.'
                  : 'Análise recebida. Revisão humana pendente.'}
              </p>
              <MochiResult
                key={result.record?.id ?? result.analysis.finding_id}
                result={result}
                ai={ai}
                headingRef={resultHeading}
              />
            </>
          ) : (
            !ai.pending &&
            !ai.error && (
              <div className="studio-welcome" data-reveal="scale">
                <span className="studio-welcome-mark" aria-hidden="true">
                  <FileSearch size={29} />
                  <Heart size={15} />
                </span>
                <h3>
                  {finding
                    ? 'Pronta para investigar? ♡'
                    : 'Seu próximo “agora entendi” começa aqui.'}
                </h3>
                <p>
                  {finding
                    ? 'Confira os fatos à esquerda. Você pode solicitar uma explicação ou consultar análises já salvas.'
                    : 'Primeiro, escolha um achado do laboratório. A Mochi ajuda a conectar os fatos; você confere as conclusões.'}
                </p>
                <ol className="studio-workflow">
                  <li>
                    <span>01</span>Evidências
                  </li>
                  <li>
                    <span>02</span>Interpretação
                  </li>
                  <li>
                    <span>03</span>Sua revisão
                  </li>
                </ol>
              </div>
            )
          )}
        </section>
      </div>
      <MochiHistory ai={ai} finding={finding} run={run} onOpen={openHistory} />
    </div>
  )
}
