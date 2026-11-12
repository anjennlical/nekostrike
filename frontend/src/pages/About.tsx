import {
  ArrowRight,
  BookOpen,
  CodeXml,
  FileSearch,
  FlaskConical,
  Play,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import MochiStudio from '../components/MochiStudio'
import Panel from '../components/Panel'
import { MotionToggle, useWorkspaceMotion } from '../components/WorkspaceMotion'

export default function About({ replayIntro }: { replayIntro: () => void }) {
  const motion = useWorkspaceMotion()
  return (
    <div className="workspace-page about-page">
      <section className="sakura-hero about-hero">
        <div className="sakura-hero-copy">
          <span className="sakura-label">
            <Sparkles size={14} /> UM PROJETO DA LARI
          </span>
          <h2>
            Segurança também pode ser <span>descomplicada.</span>
          </h2>
          <p>
            Conheça o NekoStrike: um laboratório interativo de segurança ofensiva e automação, com
            assistência por inteligência artificial planejada.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#lab">
              Explorar laboratório <ArrowRight size={16} />
            </a>
            <button
              className="button secondary"
              onClick={() =>
                document
                  .getElementById('about-how')
                  ?.scrollIntoView({ behavior: motion.enabled ? 'smooth' : 'instant' })
              }
            >
              Como funciona
            </button>
          </div>
        </div>
        <figure className="sakura-studio">
          <MochiStudio />
          <figcaption>FEITO DE CURIOSIDADE & CUIDADO</figcaption>
          <div className="studio-controls">
            <MotionToggle />
          </div>
        </figure>
      </section>
      <Panel title="Por que criei o NekoStrike?" eyebrow="AUTORIA / LARI">
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
      <section id="about-how" className="about-how" aria-labelledby="about-how-title">
        <p className="eyebrow">DA CURIOSIDADE À EVIDÊNCIA</p>
        <h2 id="about-how-title">Como funciona?</h2>
        <div className="about-steps">
          {[
            {
              title: 'Explore',
              text: 'Conheça a API e o ambiente controlado. Os dados do laboratório são fictícios.',
              icon: BookOpen,
              href: '#overview',
            },
            {
              title: 'Investigue',
              text: 'Execute os cenários locais de BOLA, exposição de campos e configuração de erros.',
              icon: FlaskConical,
              href: '#lab',
            },
            {
              title: 'Analise',
              text: 'Leia achados, respostas, controles e recomendações. Revisado não significa corrigido.',
              icon: FileSearch,
              href: '#findings',
            },
            {
              title: 'Documente',
              text: 'Exporte o histórico em Markdown. O relatório atual é determinístico, sem IA.',
              icon: CodeXml,
              href: '#findings',
            },
          ].map(({ title, text, icon: Icon, href }, index) => (
            <a className="about-step" key={title} href={href}>
              <span className="eyebrow">0{index + 1}</span>
              <Icon size={24} />
              <h3>{title}</h3>
              <p>{text}</p>
              <ArrowRight size={17} aria-hidden="true" />
            </a>
          ))}
        </div>
      </section>
      <div className="overview-grid">
        <Panel title="Conheça a Mochi" eyebrow="SUA COMPANHEIRA DE WORKSPACE">
          <p>
            A Mochi reage às ações reais no Overview e tem um cantinho com fones e notebook. As
            animações e falas locais não são análises por IA.
          </p>
          <p>
            Quando houver integração validada, ela poderá ajudar a interpretar evidências. Hoje,{' '}
            <strong>IA indisponível</strong>.
          </p>
          <a className="text-link" href="#mochi">
            Visitar o cantinho da Mochi <ArrowRight size={16} />
          </a>
        </Panel>
        <Panel title="Ética e segurança" eyebrow="LIMITES CLAROS">
          <ul className="about-limits">
            <li>Somente o laboratório interno do projeto; nenhum alvo externo arbitrário.</li>
            <li>Resultados apoiados em evidências verificáveis e controles.</li>
            <li>Severidade qualitativa por cenário; sem CVSS inventado.</li>
            <li>Futuras interpretações de IA estarão sujeitas a validação e revisão humana.</li>
          </ul>
          <p>
            API conectada confirma somente uma resposta válida do backend, não segurança da
            aplicação.
          </p>
        </Panel>
      </div>
      <Panel title="Por dentro do NekoStrike" eyebrow="ARQUITETURA REAL">
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
                'SQLite: execuções, evidências e estado de revisão. Backup por comando local.',
              ],
              [
                'Qualidade',
                'pytest, testes JavaScript, TypeScript, Prettier e demonstração isolada.',
              ],
              [
                'Relatórios e IA',
                'Markdown determinístico disponível. PDF no produto e provedor de IA ainda não implementados.',
              ],
            ].map(([title, text]) => (
              <div key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </details>
      </Panel>
      <section className="about-outro">
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
