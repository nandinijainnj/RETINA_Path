import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const NAV_LINKS = [
  { href: '#methodology',  label: 'Methodology' },
  { href: '#architecture', label: 'Architecture' },
  { href: '#analytics',    label: 'Results' },
  { href: '#inference',    label: 'Live Demo' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive]     = useState('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-surface/90 backdrop-blur-md border-b border-border' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded bg-teal/20 border border-teal/40 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="3" fill="#00C9B1" opacity="0.8"/>
              <circle cx="7" cy="7" r="6" stroke="#00C9B1" strokeWidth="0.8" strokeDasharray="2 1.5"/>
            </svg>
          </div>
          <span className="font-display font-700 text-sm text-ink tracking-tight">
            RETINA<span className="text-teal">-Path</span>
          </span>
        </a>

        {/* Links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="px-4 py-2 text-sm text-muted hover:text-ink hover:bg-subtle rounded-lg transition-all duration-200 font-body"
            >
              {label}
            </a>
          ))}
        </div>

        {/* Paper badge */}
        <a
          href="https://drive.google.com/file/d/1K2fSCtrgSBugCb3NTbIg64hBZWXwPWXK/view?usp=sharing"
          target="_blank"
          rel="noreferrer"
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-xs text-muted hover:text-ink hover:border-teal/40 transition-all duration-200 font-mono"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse-slow"></span>
          Paper Link · IEEE
        </a>
      </div>
    </motion.nav>
  )
}
