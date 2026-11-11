import {
  ArrowRight,
  FileSearch,
  Heart,
  LockKeyhole,
  PawPrint,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import MochiStudio from '../components/MochiStudio'
import SakuraBloom from '../components/SakuraBloom'
import Panel from '../components/Panel'

const steps = [
  {
    title: 'Receber evidências reais',
    description:
      'Resultados estruturados dos testes do laboratório, sem segredos ou dados pessoais reais.',
    icon: FileSearch,
  },
  {
    title: 'Explicar e recomendar',
    description:
      'Apoio para entender o impacto e sugerir correções, sem inventar endpoints ou achados.',
    icon: Sparkles,
  },
  {
    title: 'Validar antes de apresentar',
    description: 'Saídas verificadas contra o contrato e as evidências, com revisão humana.',
    icon: ShieldCheck,
  },
]

export default function MochiAI() {
  return (
    <div className="mochi-page workspace-page">
      <section className="sakura-hero" aria-labelledby="mochi-introduction">
        <SakuraBloom className="hero-blossom" />
        <div className="sakura-hero-copy">
          <span className="sakura-label">
            <Sparkles size={15} /> CONHEÇA SUA FUTURA ASSISTENTE
          </span>
          <h2 id="mochi-introduction">
            Oi, eu sou a <span>Mochi.</span>
            <Heart className="hello-heart" size={28} aria-hidden="true" />
            <br />
            <span className="hero-subtitle">Evidências são o meu começo.</span>
          </h2>
          <p>
            Vou ajudar a explicar vulnerabilidades, organizar recomendações e transformar evidências
            em relatórios claros. Uma descoberta de cada vez.
          </p>
          <div className="ai-availability">
            <span className="availability-symbol">
              <LockKeyhole size={16} />
            </span>
            <div>
              <strong>IA indisponível</strong>
              <span>Integração ainda não implementada</span>
            </div>
          </div>
        </div>
        <figure className="sakura-studio">
          <MochiStudio />
          <figcaption>
            <PawPrint size={13} /> MOCHI’S CORNER <span>FEITO DE CURIOSIDADE & CUIDADO</span>
          </figcaption>
        </figure>
        <div className="hero-bottom-line" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      </section>
      <div className="mochi-panels">
        <Panel
          className="process-panel"
          title="Como a análise vai funcionar"
          eyebrow="IA COM CONTEXTO"
          action={
            <span className="panel-seal" aria-hidden="true">
              <PawPrint size={22} />
            </span>
          }
        >
          <ol className="sakura-steps">
            {steps.map(({ title, description, icon: Icon }, index) => (
              <li key={title}>
                <span className="step-number">0{index + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <Icon className="step-icon" size={25} strokeWidth={1.5} aria-hidden="true" />
              </li>
            ))}
          </ol>
          <p className="process-caption">
            <ShieldCheck size={14} /> Evidências primeiro. Revisão humana, sempre.
          </p>
        </Panel>
        <Panel
          className="trust-panel"
          title="Transparência, sempre"
          eyebrow="ESTADO ATUAL"
          action={
            <span className="signal-decoration" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          }
        >
          <div className="sakura-notice">
            <span className="notice-lock">
              <LockKeyhole size={24} strokeWidth={1.7} />
            </span>
            <div>
              <h3>Nenhum provedor de IA está conectado.</h3>
              <p>Esta versão não envia dados a modelos externos e não precisa de chave de API.</p>
            </div>
          </div>
          <p className="trust-description">
            O laboratório já produz evidências e relatórios sem IA. A integração com um modelo será
            feita no backend. Uma API paga só será utilizada com autorização.
          </p>
          <div className="trust-action">
            <a className="sakura-button" href="#lab">
              Ver a base do laboratório <ArrowRight size={19} />
            </a>
            <SakuraBloom className="action-blossom" />
          </div>
          <div className="trust-footnote">
            <span className="status-dot" /> Conexão do backend ≠ conexão com IA
          </div>
        </Panel>
      </div>
      <div className="mochi-signoff" aria-hidden="true">
        <span />
        <PawPrint size={15} />
        <span />
      </div>
    </div>
  )
}
