import { RefreshCw, Sparkles, ShieldCheck, Settings2 } from 'lucide-react'
import type { AIState } from '../useAI'

export function providerPresentation(ai: AIState) {
  if (ai.pending)
    return {
      state: 'processing',
      label: 'Processando',
      detail: 'Solicitação em andamento; sem repetição automática.',
    }
  if (ai.checking)
    return {
      state: 'checking',
      label: 'Consultando configuração',
      detail: 'Consulta local, sem consumo de tokens.',
    }
  if (ai.statusError || !ai.status)
    return {
      state: 'error',
      label: 'Indisponível por erro',
      detail: 'Não foi possível consultar a configuração local. Tente atualizar.',
    }
  if (ai.status.status === 'disabled')
    return {
      state: 'disabled',
      label: 'Desativada',
      detail: 'Geração desativada. As análises salvas continuam disponíveis.',
    }
  if (ai.status.status !== 'configured')
    return {
      state: 'unconfigured',
      label: 'Não configurada',
      detail:
        ai.status.status === 'missing_key'
          ? 'Configure a credencial somente no backend.'
          : ai.status.status === 'missing_model'
            ? 'Falta escolher o modelo no backend.'
            : 'Confira a configuração local do backend.',
    }
  if (ai.generationError)
    return {
      state: 'error',
      label: 'Indisponível por erro',
      detail: ai.error
        ? 'A última solicitação falhou. Confira o detalhe no painel da Mochi.'
        : 'A última solicitação falhou; as análises salvas continuam disponíveis.',
    }
  return {
    state: 'available',
    label: 'Disponível para solicitar',
    detail: 'Configuração local pronta; esta consulta não comprova conexão com o provedor.',
  }
}

export default function AIProviderStatus({ ai }: { ai: AIState }) {
  const status = providerPresentation(ai)
  return (
    <section
      className="studio-provider"
      aria-label="Estado do provedor de IA"
      data-provider-state={status.state}
    >
      <div className="studio-provider-main">
        <span className="studio-provider-icon" aria-hidden="true">
          <Sparkles size={20} />
        </span>
        <div>
          <p className="studio-overline">
            PROVEDOR DE IA {ai.status?.provider === 'test_double' && '· SIMULAÇÃO'}
          </p>
          <p className="studio-provider-line" role="status">
            <strong>
              <i aria-hidden="true" />
              {status.label}
            </strong>
            <span>{status.detail}</span>
          </p>
        </div>
        <button
          type="button"
          className="studio-icon-button"
          onClick={() => void ai.refresh()}
          disabled={ai.checking || ai.pending || ai.localBusy}
          aria-label="Atualizar configuração"
          title="Atualizar configuração"
        >
          <RefreshCw size={17} aria-hidden="true" />
        </button>
      </div>
      <details className="studio-disclosure studio-config-help">
        <summary>
          <Settings2 size={14} aria-hidden="true" /> Configuração e limites
        </summary>
        <div className="studio-disclosure-body">
          <p>
            Backend online não significa IA conectada. Atualizar configuração apenas consulta o
            backend; não chama a OpenAI.
          </p>
          {ai.status?.provider === 'test_double' ? (
            <p>Ambiente de teste: provedor simulado, sem chamadas pagas.</p>
          ) : (
            <p>
              O backend lê o <code>.env</code> da raiz. Modelo em <code>MOCHI_AI_MODEL</code>;
              geração controlada por <code>MOCHI_AI_ENABLED</code>. Configure a chave somente no seu
              computador, nunca no chat ou em variáveis <code>VITE_</code>. Após uma alteração
              autorizada, reinicie o backend.
            </p>
          )}
          {ai.status?.status === 'configured' && (
            <p>
              {ai.status.model} · {ai.status.requests_remaining} chamada(s) restante(s) neste
              processo · até {ai.status.max_output_tokens} tokens de saída ·{' '}
              {ai.status.timeout_seconds} s.
            </p>
          )}
          <p>
            <ShieldCheck size={14} aria-hidden="true" /> Habilite a geração somente após autorizar
            custos. Limites por processo não são um orçamento financeiro.
          </p>
        </div>
      </details>
    </section>
  )
}
