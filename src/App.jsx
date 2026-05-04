import Navbar from './components/Navbar'
import Hero from './components/Hero'
import MethodologySection from './sections/MethodologySection'
import ArchitectureSection from './sections/ArchitectureSection'
import AnalyticsSection from './sections/AnalyticsSection'
import InferenceSection from './sections/InferenceSection'

export default function App() {
  return (
    <div className="min-h-screen bg-bg text-ink font-body">
      <Navbar />
      <main>
        <Hero />
        <MethodologySection />
        <ArchitectureSection />
        <AnalyticsSection />
        <InferenceSection />
      </main>
      <footer className="border-t border-border bg-surface py-10 mt-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <p className="font-display font-bold text-ink text-sm">RETINA<span className="text-teal">-Path</span></p>
            <p className="text-xs text-muted mt-1 font-mono">
              Nandini Jain · Archit Patre · Girirajan S &nbsp;|&nbsp; Dept. of Computing Technologies, SRMIST
            </p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] font-mono text-muted/50">Built with FastAPI · React · HuggingFace</p>
            <p className="text-[10px] font-mono text-muted/40">MoNuSeg benchmark · NCT-CRC-HE-100K dataset</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
