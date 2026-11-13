import type { AIState } from './useAI'
import type { WorkspaceState } from './useWorkspace'

export function aiPresentation(ai: AIState, workspace: WorkspaceState) {
  const finding = workspace.data?.findings.find((item) => item.id === ai.selected)
  const run = workspace.data?.runs.find((item) => item.id === finding?.run_id)
  const result = finding && run && ai.result?.analysis.finding_id === finding.id ? ai.result : null
  const state = ai.pending
    ? 'analyzing'
    : ai.error
      ? 'error'
      : result
        ? 'completed'
        : workspace.error || ai.status?.status !== 'configured'
          ? 'unavailable'
          : finding && run && !workspace.loading
            ? 'ready'
            : 'idle'
  return { finding, run, result, state } as const
}

export const aiStateLabels = {
  idle: 'Escolha um achado para começar.',
  ready: 'Achado selecionado. Revise os fatos antes de solicitar a análise.',
  analyzing: 'Requisição em andamento. Aguarde; você pode navegar sem repetir a chamada.',
  completed: 'Análise recebida e validada estruturalmente. Revisão humana pendente.',
  unavailable: 'A análise está indisponível. Confira a configuração e o histórico.',
  error: 'A análise não foi concluída. Nenhuma nova tentativa será feita automaticamente.',
}
