import { ShieldCheck, Fingerprint, Heart } from 'lucide-react'
import { MotionToggle } from '../components/WorkspaceMotion'
import { useScrollReveal } from '../useScrollReveal'
import MochiAnalysis from '../components/MochiAnalysis'
import type { AIState } from '../useAI'
import type { WorkspaceState } from '../useWorkspace'

export default function MochiAI({ ai, workspace }: { ai: AIState; workspace: WorkspaceState }) {
  const revealScope = useScrollReveal()
  return (
    <div className="mochi-page workspace-page mochi-studio-page" ref={revealScope}>
      <MochiAnalysis ai={ai} workspace={workspace} motionControl={<MotionToggle compact />} />
      <footer className="studio-principles" data-reveal="fade-in">
        <span>
          <Fingerprint size={16} aria-hidden="true" /> Evidências rastreáveis
        </span>
        <span>
          <ShieldCheck size={16} aria-hidden="true" /> Veredito preservado
        </span>
        <span>
          <Heart size={16} aria-hidden="true" /> Cuidado em cada descoberta
        </span>
      </footer>
    </div>
  )
}
