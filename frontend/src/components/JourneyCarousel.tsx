import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CodeXml,
  FileSearch,
  FlaskConical,
  Pause,
  Play,
} from 'lucide-react'
import { useWorkspaceMotion } from './WorkspaceMotion'
import { canAdvanceJourney, journeyIndex, scheduleJourneyAdvance } from '../journey-playback'

const steps = [
  {
    title: 'Explore',
    text: 'Conheça a API e o ambiente controlado. Os dados do laboratório são fictícios.',
    icon: BookOpen,
    href: '#overview',
    action: 'Conhecer o workspace',
  },
  {
    title: 'Investigue',
    text: 'Compare os cenários locais de BOLA, exposição de campos e configuração de erros.',
    icon: FlaskConical,
    href: '#lab',
    action: 'Abrir laboratório',
  },
  {
    title: 'Analise',
    text: 'Leia achados, respostas e recomendações. A Mochi apoia a interpretação; você revisa as evidências.',
    icon: FileSearch,
    href: '#findings',
    action: 'Conferir evidências',
  },
  {
    title: 'Documente',
    text: 'Exporte Markdown com evidências. Inclua análises salvas opcionalmente, sem nova geração de IA.',
    icon: CodeXml,
    href: '#findings',
    action: 'Preparar relatório',
  },
]

export default function JourneyCarousel() {
  const motion = useWorkspaceMotion()
  const section = useRef<HTMLElement>(null)
  const track = useRef<HTMLOListElement>(null)
  const programmatic = useRef(false)
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [active, setActive] = useState(0)
  const activeIndex = useRef(active)
  activeIndex.current = active
  const [requested, setRequested] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [inView, setInView] = useState(false)
  const state = { requested, motionEnabled: motion.enabled, inView, hovered, focused }
  const playing = canAdvanceJourney(state)

  const reveal = useCallback((index: number, smooth: boolean) => {
    const rail = track.current
    const slide = rail?.children[index] as HTMLElement | undefined
    if (!rail || !slide) return
    const left =
      slide.getBoundingClientRect().left - rail.getBoundingClientRect().left + rail.scrollLeft
    programmatic.current = true
    rail.scrollTo({ left, behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  const select = useCallback(
    (index: number, manual = true) => {
      const next = journeyIndex(index, steps.length)
      if (manual) setRequested(false)
      setActive(next)
      reveal(next, motion.enabled)
    },
    [motion.enabled, reveal],
  )

  useEffect(
    () =>
      scheduleJourneyAdvance(
        { requested, motionEnabled: motion.enabled, inView, hovered, focused },
        () => select(active + 1, false),
      ),
    [requested, motion.enabled, inView, hovered, focused, active, select],
  )

  useEffect(() => {
    if (!section.current || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.25,
    })
    observer.observe(section.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!track.current || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => reveal(activeIndex.current, false))
    observer.observe(track.current)
    return () => observer.disconnect()
  }, [reveal])

  useEffect(() => {
    // Native smooth scrolling must also stop when motion is paused mid-transition.
    if (!motion.enabled) reveal(activeIndex.current, false)
  }, [motion.enabled, reveal])

  useEffect(
    () => () => {
      if (settle.current) clearTimeout(settle.current)
    },
    [],
  )

  const interrupt = () => {
    setRequested(false)
    programmatic.current = false
  }
  const syncScroll = () => {
    if (settle.current) clearTimeout(settle.current)
    settle.current = setTimeout(() => {
      const rail = track.current
      if (!rail) return
      if (programmatic.current) {
        programmatic.current = false
        return
      }
      const start = rail.getBoundingClientRect().left
      const distances = Array.from(rail.children, (child) =>
        Math.abs(child.getBoundingClientRect().left - start),
      )
      setActive(distances.indexOf(Math.min(...distances)))
    }, 140)
  }

  return (
    <section
      id="about-how"
      className="about-how journey-carousel"
      tabIndex={-1}
      ref={section}
      aria-labelledby="about-how-title"
      aria-roledescription="carrossel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
    >
      <div className="journey-heading">
        <div>
          <p className="eyebrow">DA CURIOSIDADE À EVIDÊNCIA</p>
          <h2 id="about-how-title" data-reveal="fade-in">
            Como funciona?
          </h2>
          <p className="journey-intro">Quatro passos. Uma investigação com contexto.</p>
        </div>
        <span className="journey-counter" aria-hidden="true">
          0{active + 1}
          <span> / 04</span>
        </span>
      </div>
      <p id="journey-instructions" className="journey-instructions">
        Deslize os cartões ou use as setas. No teclado: ← →, Home e End na área das etapas.
      </p>
      <ol
        id="journey-track"
        className="journey-track"
        ref={track}
        tabIndex={0}
        aria-label="As quatro etapas da investigação"
        aria-describedby="journey-instructions"
        onScroll={syncScroll}
        onPointerDown={interrupt}
        onWheel={interrupt}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return
          const index = {
            ArrowLeft: active - 1,
            ArrowRight: active + 1,
            Home: 0,
            End: steps.length - 1,
          }[event.key]
          if (index !== undefined) {
            event.preventDefault()
            select(index)
          }
        }}
      >
        {steps.map(({ title, text, icon: Icon, href, action }, index) => (
          <li
            key={title}
            className="journey-slide"
            data-current={active === index ? 'true' : undefined}
          >
            <a
              className="about-step journey-card"
              href={href}
              data-reveal="fade-up"
              data-reveal-index={index}
              onFocus={() => select(index)}
            >
              <div className="journey-card-top">
                <span className="eyebrow">0{index + 1} / ETAPA</span>
                <Icon size={24} aria-hidden="true" />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
              <span className="journey-action">
                {action}
                <ArrowRight size={16} aria-hidden="true" />
              </span>
            </a>
          </li>
        ))}
      </ol>
      <div className="journey-toolbar">
        <div className="journey-navigation" role="group" aria-label="Navegar pelas etapas">
          <button
            type="button"
            className="icon-button"
            aria-label="Etapa anterior"
            aria-controls="journey-track"
            onClick={() => select(active - 1)}
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <div className="journey-positions" role="group" aria-label="Escolher uma etapa">
            {steps.map(({ title }, index) => (
              <button
                type="button"
                key={title}
                aria-label={`Etapa 0${index + 1}: ${title}`}
                aria-current={active === index ? 'step' : undefined}
                onClick={() => select(index)}
              >
                <span aria-hidden="true">0{index + 1}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Próxima etapa"
            aria-controls="journey-track"
            onClick={() => select(active + 1)}
          >
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          className="button secondary journey-play"
          aria-pressed={requested}
          disabled={!motion.enabled}
          onClick={() => setRequested((value) => !value)}
        >
          {requested ? (
            <Pause size={16} aria-hidden="true" />
          ) : (
            <Play size={16} aria-hidden="true" />
          )}
          {requested ? 'Pausar apresentação' : 'Reproduzir apresentação'}
        </button>
      </div>
      <div className="journey-footer">
        <p className="journey-status" aria-live={requested ? 'off' : 'polite'} aria-atomic="true">
          <strong>
            {steps[active].title} · {active + 1} de 4
          </strong>
          <span>
            {!motion.enabled
              ? 'Movimento pausado. Navegação manual disponível.'
              : playing
                ? 'Avanço a cada 7 segundos.'
                : requested
                  ? 'Ativada; aguardando cursor e foco saírem da seção.'
                  : 'No seu ritmo. Reprodução automática pausada.'}
          </span>
        </p>
      </div>
    </section>
  )
}
