import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useCountUp, useInView } from '../hooks'
import { HERO_STATS } from '../data/paperData'

const PROBLEM_SENTENCES = [
  "Accurately analyzing cell nuclei in tissue slides is a critical requirement for cancer diagnosis and prognosis, yet performing this task manually is exhausting and prone to human error.",
  "Most AI models are trained on everyday photographs — creating a significant knowledge gap when applied to complex microscopic medical images.",
  "RETINA-Path solves this by first training the AI on 100,000 unlabeled medical images, forcing it to learn the intricate patterns of human tissue by reconstructing missing parts.",
  "This specialized preparation results in an AI that is 3× more precise at defining cell boundaries and highly reliable even when very little expert data is available — providing a faster, more accurate tool for clinical cancer diagnostics.",
]

const HIGHLIGHTS = [
  { kw: 'RETINA-Path',      cls: 'text-teal font-medium' },
  { kw: '3×',               cls: 'text-teal font-medium' },
  { kw: '100,000',          cls: 'text-teal font-medium' },
  { kw: 'cell boundaries',  cls: 'text-teal font-medium' },
  { kw: 'knowledge gap',    cls: 'text-violet font-medium' },
  { kw: 'cancer diagnosis', cls: 'text-violet font-medium' },
  { kw: 'cell nuclei',      cls: 'text-violet font-medium' },
  { kw: 'exhausting',       cls: 'text-amber' },
  { kw: 'human error',      cls: 'text-amber' },
  { kw: 'reconstructing missing parts', cls: 'text-amber' },
]

function renderHighlighted(sentence) {
  let parts = [{ text: sentence, highlighted: false, cls: '' }]
  HIGHLIGHTS.forEach(({ kw, cls }) => {
    parts = parts.flatMap(part => {
      if (part.highlighted) return [part]
      const idx = part.text.indexOf(kw)
      if (idx === -1) return [part]
      return [
        { text: part.text.slice(0, idx),          highlighted: false, cls: '' },
        { text: kw,                                highlighted: true,  cls },
        { text: part.text.slice(idx + kw.length), highlighted: false, cls: '' },
      ]
    })
  })
  return parts.map((p, i) =>
    p.highlighted
      ? <span key={i} className={p.cls}>{p.text}</span>
      : <span key={i}>{p.text}</span>
  )
}

function AnimatedProblemText() {
  const [visibleCount, setVisibleCount] = useState(0)
  useEffect(() => {
    if (visibleCount >= PROBLEM_SENTENCES.length) return
    const t = setTimeout(() => setVisibleCount(v => v + 1), visibleCount === 0 ? 700 : 520)
    return () => clearTimeout(t)
  }, [visibleCount])
  return (
    <div className="space-y-3">
      {PROBLEM_SENTENCES.slice(0, visibleCount).map((s, i) => (
        <motion.p key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="text-sm text-muted/80 leading-loose font-body">
          {renderHighlighted(s)}
        </motion.p>
      ))}
      {visibleCount < PROBLEM_SENTENCES.length && (
        <div className="flex gap-1 pt-1">
          {[0,1,2].map(i => (
            <motion.div key={i} animate={{ opacity: [0.3,1,0.3] }}
              transition={{ repeat: Infinity, duration: 1, delay: i*0.2 }}
              className="w-1 h-1 rounded-full bg-teal/50" />
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ stat, index }) {
  const [ref, inView] = useInView(0.3)
  const numericVal = parseFloat(stat.value)
  const decimals = stat.value.includes('.') ? stat.value.split('.')[1].length : 0
  const count = useCountUp(numericVal, 1800, inView, decimals)
  const colorMap = {
    teal:   { border:'border-teal/30',   bg:'bg-teal/5',   text:'text-teal',   glow:'shadow-[0_0_30px_rgba(0,201,177,0.1)]' },
    violet: { border:'border-violet/30', bg:'bg-violet/5', text:'text-violet', glow:'shadow-[0_0_30px_rgba(123,111,255,0.1)]' },
    amber:  { border:'border-amber/30',  bg:'bg-amber/5',  text:'text-amber',  glow:'shadow-[0_0_30px_rgba(245,158,11,0.1)]' },
  }
  const c = colorMap[stat.color]
  return (
    <motion.div ref={ref} initial={{ opacity:0, y:40 }} animate={inView?{opacity:1,y:0}:{}}
      transition={{ duration:0.6, delay:index*0.15 }}
      className={`relative rounded-2xl border ${c.border} ${c.bg} ${c.glow} p-6 flex flex-col gap-2`}>
      <p className="text-xs font-mono text-muted uppercase tracking-widest">{stat.label}</p>
      <div className="flex items-end gap-2">
        <span className={`metric-value text-4xl font-display font-bold ${c.text}`}>{count.toFixed(decimals)}</span>
        <span className="text-sm text-muted mb-1 font-mono">{stat.unit}</span>
      </div>
      <p className="text-xs text-muted/70">{stat.detail}</p>
      <div className={`absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-current opacity-60 ${c.text}`} />
    </motion.div>
  )
}

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center hex-bg overflow-hidden pt-16">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(0,201,177,0.06),transparent)]" />
      <div className="relative max-w-5xl mx-auto px-6 py-20 w-full">
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.5}}
          className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-teal/30 bg-teal/5 text-xs font-mono text-teal">
            <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse-slow" />
            Digital Pathology · Nuclei Segmentation · Self-Supervised Learning
          </span>
        </motion.div>
        <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:0.7,delay:0.1}}
          className="text-center mb-4">
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight text-ink leading-tight">
            RETINA<span className="text-teal">-Path</span>
          </h1>
          <p className="mt-3 text-base md:text-lg text-muted max-w-xl mx-auto font-body leading-relaxed">
            Bridging the medical domain gap via generative reconstruction pre-training
          </p>
        </motion.div>
        <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.5,delay:0.35}}
          className="text-center text-xs font-mono text-muted/50 mb-8">
          Nandini Jain · Archit Patre · Girirajan S &nbsp;|&nbsp; SRM Institute of Science &amp; Technology
        </motion.p>

        {/* Problem statement card */}
        <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.45}}
          className="relative rounded-2xl border border-border bg-surface/80 overflow-hidden mb-10">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal to-violet/60" />
          <div className="absolute top-0 left-0 w-32 h-32 bg-teal/5 rounded-full blur-2xl pointer-events-none" />
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-4 rounded-full bg-teal" />
              <p className="text-xs font-mono text-teal/70 uppercase tracking-widest">The problem we solve</p>
            </div>
            <AnimatedProblemText />
          </div>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {HERO_STATS.map((stat, i) => <StatCard key={stat.label} stat={stat} index={i} />)}
        </div>

        {/* CTAs */}
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.5,delay:0.7}}
          className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#inference" className="px-6 py-3 rounded-xl bg-teal text-bg font-display font-semibold text-sm hover:bg-teal/90 transition-all duration-200 hover:scale-105 active:scale-95">
            Try Live Demo →
          </a>
          <a href="#methodology" className="px-6 py-3 rounded-xl border border-border bg-card text-ink text-sm font-body hover:border-teal/40 transition-all duration-200">
            Explore Methodology
          </a>
        </motion.div>

        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.4}}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-xs text-muted/30 font-mono">scroll to explore</span>
          <motion.div animate={{y:[0,6,0]}} transition={{repeat:Infinity,duration:1.5}}
            className="w-0.5 h-6 bg-gradient-to-b from-teal/40 to-transparent rounded-full" />
        </motion.div>
      </div>
    </section>
  )
}
