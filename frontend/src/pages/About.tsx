import { ArrowRight, CodeXml, Play, ShieldCheck, Sparkles } from 'lucide-react'
import JourneyCarousel from '../components/JourneyCarousel'
import MochiStudio from '../components/MochiStudio'
import Panel from '../components/Panel'
import { MotionToggle, useWorkspaceMotion } from '../components/WorkspaceMotion'
import { useScrollReveal } from '../useScrollReveal'

export default function About({ replayIntro }: { replayIntro: () => void }) {
  const motion = useWorkspaceMotion()
  const revealScope = useScrollReveal()
  return (
    <div className="workspace-page about-page" ref={revealScope}>
      <section className="sakura-hero about-hero">
        <div className="sakura-hero-copy" data-reveal="fade-up">
          <span className="sakura-label">
            <Sparkles size={14} /> UM PROJETO DA LARI
          </span>
          <h2>
            Segurança também pode ser <span>descomplicada.</span>
          </h2>
          <p>
            Conheça o NekoStrike: um laboratório interativo de segurança ofensiva e automação, com
            assistência opcional por inteligência artificial e revisão humana.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#lab">
              Explorar laboratório <ArrowRight size={16} />
            </a>
            <button
              className="button secondary"
              onClick={() => {
                const section = document.getElementById('about-how')
                section?.focus({ preventScroll: true })
                section?.scrollIntoView({
                  block: 'start',
                  behavior: motion.enabled ? 'smooth' : 'instant',
                })
              }}
            >
              Como funciona
            </button>
          </div>
        </div>
        <figure className="sakura-studio" data-reveal="scale">
          <MochiStudio />
          <figcaption>FEITO DE CURIOSIDADE & CUIDADO</figcaption>
          <div className="studio-controls">
            <MotionToggle />
          </div>
        </figure>
      </section>
      <Panel title="Por que criei o NekoStrike?" eyebrow="AUTORIA / LARI" reveal="slide-right">
        <div className="about-story">
          <p>
            O NekoStrike nasceu da minha vontade de unir duas áreas que me fascinam: cibersegurança
            e inteligência artificial.
          </p>
          <p>
            Ao estudar segurança ofensiva, percebi a importância não apenas de identificar
            vulnerabilidades, mas também de compreender, organizar e comunicar os resultados de uma
            investigação.
          </p>
          <p>
            A proposta do NekoStrike é explorar como automação e IA podem auxiliar nesse processo,
            transformando evidências técnicas em informações mais claras e acessíveis.
          </p>
          <p>
            O projeto também representa minha forma de desenvolver: combinando engenharia,
            aprendizado prático e uma identidade visual que faz parte de quem eu sou.
          </p>
        </div>
      </Panel>
      <JourneyCarousel />
      <div className="overview-grid">
        <Panel title="Conheça a Mochi" eyebrow="SUA COMPANHEIRA DE WORKSPACE" reveal="scale">
          <p>
            A Mochi reage às ações reais no Overview e tem um cantinho com fones e notebook. As
            animações e falas locais não são análises por IA.
          </p>
          <p>
            A Mochi interpreta evidências e mantém análises salvas para consulta. A geração é
            desativada por padrão; confira o estado real do provedor na página Mochi AI.
          </p>
          <a className="text-link" href="#mochi">
            Visitar o cantinho da Mochi <ArrowRight size={16} />
          </a>
        </Panel>
        <Panel title="Ética e segurança" eyebrow="LIMITES CLAROS" revealIndex={1}>
          <ul className="about-limits">
            <li>Somente o laboratório interno do projeto; nenhum alvo externo arbitrário.</li>
            <li>Resultados apoiados em evidências verificáveis e controles.</li>
            <li>Severidade qualitativa por cenário; sem CVSS inventado.</li>
            <li>Interpretações de IA passam por validação e exigem revisão humana.</li>
          </ul>
          <p>
            API conectada confirma somente uma resposta válida do backend, não segurança da
            aplicação.
          </p>
        </Panel>
      </div>
      <Panel title="Por dentro do NekoStrike" eyebrow="ARQUITETURA REAL" reveal={false}>
        <details className="architecture-details">
          <summary>
            <CodeXml size={18} /> Arquitetura e tecnologias
          </summary>
          <div className="architecture-grid">
            {[
              [
                'Frontend',
                'React, TypeScript e Vite. Navegação por hash, CSS e SVGs locais; ícones Lucide.',
              ],
              [
                'Backend',
                'FastAPI e Pydantic, servido em loopback. Contratos validados e origem/hosts permitidos.',
              ],
              [
                'Laboratório',
                'Fixtures ASGI internas, httpx e três verificadores com dados fictícios. Não é exposto como servidor vulnerável.',
              ],
              [
                'Persistência',
                'SQLite: execuções, evidências, análises e revisão. Backup por comando local.',
              ],
              [
                'Qualidade',
                'pytest, testes JavaScript, TypeScript, Prettier e demonstração isolada.',
              ],
              [
                'Relatórios e IA',
                'Markdown com evidências e análises salvas opcionais. Mochi AI validada em uma amostra BOLA real; revisão humana pendente. PDF no produto ainda não implementado.',
              ],
            ].map(([title, text], index) => (
              <div key={title} data-reveal="fade-up" data-reveal-index={index}>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </details>
      </Panel>
      <section className="about-outro" data-reveal="fade-in">
        <ShieldCheck size={24} />
        <h2>Pequenos passos. Evidências reais.</h2>
        <p>
          A abertura apresenta a identidade. Este guia permanece aqui para quando você precisar.
        </p>
        <button className="button secondary" onClick={replayIntro} disabled={!motion.enabled}>
          <Play size={16} /> Rever introdução
        </button>
        {!motion.enabled && (
          <p>Ative animações para rever a sequência. O guia continua disponível.</p>
        )}
        <a className="text-link" href="#overview">
          Voltar ao workspace <ArrowRight size={16} />
        </a>
      </section>
    </div>
  )
}
