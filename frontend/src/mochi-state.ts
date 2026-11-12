import type { Run } from './workspace-api'

export type MochiEmotion = 'idle' | 'happy' | 'thinking' | 'success' | 'warning' | 'error'
export type MochiSignals = {
  connection: 'loading' | 'online' | 'offline'
  busy: string | null
  loading: boolean
  error: string | null
  lastRun: Pick<Run, 'id' | 'verdict'> | null
}

/** Presentation only: never starts a request or turns historical counts into a verdict. */
export function resolveMochiState(
  signals: MochiSignals,
  greeted = false,
): {
  emotion: MochiEmotion
  message: string
} {
  if (signals.busy === 'run')
    return {
      emotion: 'thinking',
      message: 'A verificação do laboratório está em andamento. Vamos aguardar a evidência.',
    }
  if (signals.busy)
    return {
      emotion: 'thinking',
      message: 'Salvando sua revisão. Revisado não significa corrigido.',
    }
  if (signals.error)
    return {
      emotion: 'error',
      message:
        'Não consegui confirmar os dados. Confira o aviso e atualize o histórico antes de repetir.',
    }
  if (signals.connection === 'offline')
    return {
      emotion: 'error',
      message: 'O backend não respondeu à última checagem. Vamos verificar a conexão?',
    }
  if (signals.connection === 'loading' || signals.loading)
    return {
      emotion: 'thinking',
      message: 'Conferindo conexão e histórico local. Isso não é uma análise de IA.',
    }
  if (signals.lastRun?.verdict === 'vulnerable')
    return {
      emotion: 'warning',
      message: 'A última execução desta sessão encontrou um achado. Vamos conferir as evidências.',
    }
  if (greeted)
    return { emotion: 'happy', message: 'Carinho recebido! Uma descoberta de cada vez, Lari.' }
  if (signals.lastRun?.verdict === 'protected')
    return {
      emotion: 'success',
      message:
        'A última execução desta sessão passou no cenário testado. Isso não garante segurança fora dele.',
    }
  return {
    emotion: 'idle',
    message: 'Estou por aqui. Toque em mim para um oi! Minhas falas são locais, sem IA.',
  }
}

export const mochiLabels: Record<MochiEmotion, string> = {
  idle: 'Mochi tranquila',
  happy: 'Carinho recebido',
  thinking: 'Acompanhando uma operação',
  success: 'Cenário verificado',
  warning: 'Achado requer atenção',
  error: 'Algo precisa de cuidado',
}

export function mochiGaze(x: number, y: number) {
  const clamp = (value: number) => (Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0)
  return { x: clamp(x) * 2, y: clamp(y), angle: clamp(x) * 0.6 }
}
