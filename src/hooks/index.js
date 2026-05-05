import { useState, useEffect, useRef } from 'react'

export function useCountUp(target, duration = 1600, isActive = false, decimals = 3) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!isActive) return
    let startTime = null
    const startVal = 0
    const animate = (ts) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3) 
      setValue(parseFloat((startVal + (target - startVal) * ease).toFixed(decimals)))
      if (progress < 1) requestAnimationFrame(animate)
      else setValue(target)
    }
    requestAnimationFrame(animate)
  }, [target, duration, isActive, decimals])
  return value
}

export function useInView(threshold = 0.2) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}
