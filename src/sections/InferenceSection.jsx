import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import GalleryPanel from './GalleryPanel'

const API_URL = import.meta.env.VITE_API_URL || ''

// Demo fallback metrics
const DEMO_METRICS = {
  baseline: { dice: 0.8734, iou: 0.7783, hd95: 7.15,  cell_count: 38 },
  retina:   { dice: 0.9222, iou: 0.8562, hd95: 2.63,  cell_count: 41 },
}

// Compare slider
function CompareSlider({ baselineMask, retinaMask }) {
  const containerRef = useRef(null)
  const [pos, setPos]   = useState(50)
  const dragging        = useRef(false)

  const updatePos = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setPos(Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100)))
  }, [])

  useEffect(() => {
    const onUp    = () => { dragging.current = false }
    const onMove  = (e) => { if (dragging.current) updatePos(e.clientX) }
    const onTouch = (e) => { if (dragging.current) updatePos(e.touches[0].clientX) }
    window.addEventListener('mouseup',   onUp)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchend',  onUp)
    window.addEventListener('touchmove', onTouch, { passive: true })
    return () => {
      window.removeEventListener('mouseup',   onUp)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchend',  onUp)
      window.removeEventListener('touchmove', onTouch)
    }
  }, [updatePos])

  if (!baselineMask || !retinaMask) return null

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black select-none"
      style={{ aspectRatio: '1', cursor: 'ew-resize', touchAction: 'none' }}
      onMouseDown={(e) => { dragging.current = true; updatePos(e.clientX) }}
      onTouchStart={(e) => { dragging.current = true; updatePos(e.touches[0].clientX) }}
    >
      {/* LAYER 1 (base): RETINA B&W mask — full width always */}
      <img
        src={retinaMask}
        alt="RETINA mask"
        draggable={false}
        className="absolute inset-0 w-full h-full object-contain"
      />

      {/* LAYER 2 (overlay): Baseline B&W mask — clipped to left of divider */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <img
          src={baselineMask}
          alt="Baseline mask"
          draggable={false}
          className="absolute inset-0 w-full h-full object-contain"
        />
      </div>

      {/* Divider */}
      <div
        className="absolute top-0 bottom-0 z-10 pointer-events-none"
        style={{ left: `${pos}%`, width: 2, background: 'rgba(255,255,255,0.9)' }}
      >
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white rounded-full shadow-xl flex items-center justify-center pointer-events-auto"
          style={{ width: 34, height: 34 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M5 4l-3 4 3 4M11 4l3 4-3 4" stroke="#444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Labels */}
      <span className="absolute bottom-2 left-2 z-10 text-[10px] font-mono bg-amber/90 text-black px-2 py-0.5 rounded pointer-events-none">
        Baseline
      </span>
      <span className="absolute bottom-2 right-2 z-10 text-[10px] font-mono bg-teal/90 text-black px-2 py-0.5 rounded pointer-events-none">
        RETINA-Path
      </span>
    </div>
  )
}

// Three-panel result display
function ThreePanelMasks({ imageDataUrl, baselineMask, retinaMask }) {
  const panels = [
    { src: imageDataUrl,  label: 'H&E input',          color: 'text-muted/70',  border: 'border-border' },
    { src: baselineMask,  label: 'Baseline prediction', color: 'text-amber',     border: 'border-amber/30' },
    { src: retinaMask,    label: 'RETINA-Path prediction', color: 'text-teal',   border: 'border-teal/30' },
  ]
  return (
    <div className="grid grid-cols-3 gap-2">
      {panels.map(({ src, label, color, border }) => (
        <div key={label} className={`rounded-xl border ${border} overflow-hidden`}>
          <div className="bg-black" style={{ aspectRatio: '1' }}>
            <img src={src} alt={label} className="w-full h-full object-contain block" />
          </div>
          <p className={`text-center text-[10px] font-mono py-1.5 border-t border-white/5 ${color}`}>
            {label}
          </p>
        </div>
      ))}
    </div>
  )
}

// Upload zone
function UploadZone({ onImage }) {
  const onDrop = useCallback(([file]) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => onImage(e.target.result, file)
    reader.readAsDataURL(file)
  }, [onImage])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, maxFiles: 1,
  })

  return (
    <div
      {...getRootProps()}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 flex flex-col items-center gap-4 transition-all duration-200 ${
        isDragActive ? 'border-teal bg-teal/5' : 'border-border hover:border-teal/50 hover:bg-subtle'
      }`}
    >
      <input {...getInputProps()} />
      <div className="w-12 h-12 rounded-2xl border border-border bg-card flex items-center justify-center">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00C9B1" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm text-ink font-body">Drop an H&amp;E patch here</p>
        <p className="text-xs text-muted mt-1 font-mono">PNG / JPG — any size</p>
        <p className="text-xs text-muted/40 mt-0.5 font-mono">Images &gt;224px use smooth overlapping sliding window</p>
      </div>
    </div>
  )
}

// Scanning loader
function ScanningLoader({ message }) {
  return (
    <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-teal/20 bg-subtle flex flex-col items-center justify-center gap-3">
      <div className="flex gap-1">
        {[0,1,2].map(i => (
          <motion.div key={i} animate={{ scale:[1,1.3,1], opacity:[0.4,1,0.4] }}
            transition={{ repeat:Infinity, duration:1, delay:i*0.2 }}
            className="w-2 h-2 rounded-full bg-teal" />
        ))}
      </div>
      <p className="text-xs font-mono text-teal/70 text-center px-6">{message}</p>
      <motion.div animate={{ y:['-100%','400%'] }} transition={{ repeat:Infinity, duration:2, ease:'linear' }}
        className="absolute left-0 right-0 h-8 bg-gradient-to-b from-transparent via-teal/10 to-transparent pointer-events-none" />
    </div>
  )
}

// Sliding window tile progress
function SlidingWindowProgress({ tiles, activeTile, done }) {
  if (!tiles.length) return null
  const cols = Math.max(...tiles.map(t => t.col), 0) + 1
  const showTiles = tiles.slice(0, 36) // cap at 36 for display

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2 border-b border-border flex justify-between items-center">
        <span className="text-xs font-mono text-muted">Smooth overlapping sliding window</span>
        <span className="text-xs font-mono text-teal/60">stride=112px · 50% overlap</span>
      </div>
      <div className="p-3" style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(cols, 9)}, 1fr)`, gap: 2 }}>
        {showTiles.map((_, i) => (
          <div key={i} className={`aspect-square rounded border text-[8px] font-mono flex items-center justify-center transition-all duration-150 ${
            done || i < activeTile ? 'border-teal/40 bg-teal/10 text-teal/60'
            : i === activeTile     ? 'border-teal bg-teal/25 text-teal animate-pulse'
            :                        'border-border bg-surface text-muted/20'
          }`}>{i+1}</div>
        ))}
        {tiles.length > 36 && (
          <div className="aspect-square rounded border border-border flex items-center justify-center text-[7px] font-mono text-muted/30">
            +{tiles.length - 36}
          </div>
        )}
      </div>
      <div className="px-3 pb-3">
        <div className="h-1 bg-surface rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-teal to-violet rounded-full"
            style={{ width: `${tiles.length > 0 ? (Math.min(activeTile, tiles.length) / tiles.length) * 100 : 0}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
        <p className="text-[10px] font-mono text-muted mt-1.5">
          {done
            ? `✓ ${tiles.length} tiles · averaging overlapping probability maps`
            : `Processing tile ${activeTile}/${tiles.length} · accumulating softmax probs`}
        </p>
      </div>
    </div>
  )
}

// Metric row
function MetricRow({ label, baseline, retina, unit='', lowerIsBetter=false }) {
  const rBetter = lowerIsBetter ? retina < baseline : retina > baseline
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted font-mono">{label}</span>
      <div className="flex items-center gap-4">
        <span className="text-xs font-mono text-amber">
          {typeof baseline === 'number' ? baseline.toFixed(baseline < 10 ? 4 : 2) : '—'}{unit}
        </span>
        <span className="text-xs font-mono text-teal font-bold">
          {typeof retina === 'number' ? retina.toFixed(retina < 10 ? 4 : 2) : '—'}{unit}
        </span>
        {rBetter && <span className="text-[9px] font-mono text-teal bg-teal/10 px-1.5 py-0.5 rounded">↑ better</span>}
      </div>
    </div>
  )
}

//Tile plan computation
function computeTiles(W, H, patchSize=224, stride=112) {
  const tiles = []
  let row = 0
  for (let y = 0; y < H; y += stride) {
    let col = 0
    for (let x = 0; x < W; x += stride) {
      tiles.push({ x, y, w:Math.min(patchSize,W-x), h:Math.min(patchSize,H-y), row, col })
      col++
    }
    row++
  }
  return tiles
}

// Main section
export default function InferenceSection() {
  const [apiUrl, setApiUrl]         = useState(API_URL)
  const [imageDataUrl, setImageUrl] = useState(null)
  const [imageFile, setImageFile]   = useState(null)
  const [imgSize, setImgSize]       = useState({ w:0, h:0 })
  const [loading, setLoading]       = useState(false)
  const [swTiles, setSwTiles]       = useState([])
  const [swActive, setSwActive]     = useState(0)
  const [swDone, setSwDone]         = useState(false)
  const [results, setResults]       = useState(null)
  const [error, setError]           = useState(null)

  const handleImage = (dataUrl, file) => {
    setImageUrl(dataUrl); setImageFile(file)
    setResults(null); setError(null); setSwTiles([]); setSwDone(false)
    const img = new Image()
    img.onload = () => setImgSize({ w: img.width, h: img.height })
    img.src = dataUrl
  }

  const animateSlidingWindow = async (W, H) => {
    const tiles = computeTiles(W, H, 224, 112)
    setSwTiles(tiles); setSwActive(0); setSwDone(false)
    const delay = Math.max(60, Math.min(200, 1200 / tiles.length))
    for (let i = 0; i <= tiles.length; i++) {
      await new Promise(r => setTimeout(r, delay))
      setSwActive(i)
    }
    setSwDone(true)
  }

  const runInference = async () => {
    if (!imageDataUrl) return
    setLoading(true); setError(null); setResults(null); setSwTiles([]); setSwDone(false)

    const needsSW = imgSize.w > 224 || imgSize.h > 224
    const animPromise = needsSW ? animateSlidingWindow(imgSize.w, imgSize.h) : Promise.resolve()

    // Validate and normalize apiUrl
    let validUrl = apiUrl?.trim()
    if (!validUrl) {
      await animPromise
      await new Promise(r => setTimeout(r, needsSW ? 300 : 1800))
      setResults({
        ...DEMO_METRICS,
        baseline_mask: null,
        retina_mask:   null,
        demo: true,
      })
      setLoading(false)
      return
    }
    
    // Ensure https and proper formatting
    if (!validUrl.startsWith('http')) {
      validUrl = 'https://' + validUrl
    }
    if (!validUrl.endsWith('/')) {
      validUrl = validUrl + '/'
    }

    try {
      const form = new FormData()
      if (imageFile) {
        form.append('file', imageFile)
      } else {
        const blob = await (await fetch(imageDataUrl)).blob()
        form.append('file', blob, 'patch.png')
      }

      const [, resp] = await Promise.all([
        animPromise,
        fetch(`${validUrl}predict`, { 
          method:'POST', 
          body:form,
          headers: {
            'ngrok-skip-browser-warning': 'true',
          }
        }),
      ])

      if (!resp.ok) throw new Error(`Server ${resp.status}`)
      const data = await resp.json()

      setResults({
        baseline:      data.baseline,
        retina:        data.retina,
        baseline_mask: `data:image/png;base64,${data.baseline.mask_b64}`,
        retina_mask:   `data:image/png;base64,${data.retina.mask_b64}`,
        demo: false,
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const loaderMessage = swDone
    ? 'Averaging overlapping probability maps…'
    : swTiles.length > 0
    ? `Sliding window · tile ${swActive}/${swTiles.length}…`
    : 'Running inference on both models…'

  return (
    <section id="inference" className="relative py-24 bg-surface">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(0,201,177,0.04),transparent)]" />
      <div className="relative max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-14">
          <motion.p initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}}
            className="text-xs font-mono text-teal uppercase tracking-widest mb-3">Live Demo</motion.p>
          <motion.h2 initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
            className="font-display text-4xl font-bold text-ink">Run nuclei segmentation</motion.h2>
          <motion.p initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}} transition={{delay:0.2}}
            className="mt-3 text-muted max-w-xl mx-auto">
            Upload an H&amp;E patch — binary segmentation masks output as white = nucleus, black = background
          </motion.p>
        </div>

        {/* API config bar */}
        <motion.div initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}}
          className="mb-8 p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-xs font-mono text-muted whitespace-nowrap">Backend URL</span>
          <input
            value={apiUrl}
            onChange={e => setApiUrl(e.target.value)}
            placeholder="https://xxxx.ngrok-free.app  (leave blank for demo mode)"
            className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs font-mono text-ink placeholder:text-muted/40 focus:outline-none focus:border-teal/50 w-full"
          />
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${apiUrl ? 'bg-teal animate-pulse-slow' : 'bg-muted'}`} />
            <span className="text-xs font-mono text-muted whitespace-nowrap">{apiUrl ? 'live mode' : 'demo mode'}</span>
          </div>
        </motion.div>

        {/* Backend version warning */}
        <div className="mb-6 px-4 py-3 rounded-xl border border-amber/20 bg-amber/5 text-xs font-mono text-amber/80 flex gap-3 items-start">
          <span className="shrink-0 mt-0.5">⚠</span>
          <span>
            For real-time metric computation against Ground Truth, choose the "MoNuSeg Gallery" below, which uses a custom backend with the full dataset and Ground Truth labels.
          </span>
        </div>

        {/* Upload + results row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-14">

          {/* Left — upload + controls */}
          <div className="flex flex-col gap-5">
            <UploadZone onImage={handleImage} />

            {imageDataUrl && !loading && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                <img src={imageDataUrl} alt="Input" className="w-12 h-12 rounded-lg border border-border object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-ink truncate">{imgSize.w}×{imgSize.h}px loaded</p>
                  <p className="text-xs text-muted/60 font-mono mt-0.5">
                    {imgSize.w > 224 || imgSize.h > 224
                      ? `Smooth sliding window · ~${computeTiles(imgSize.w,imgSize.h).length} tiles`
                      : 'Direct 224×224 inference'}
                  </p>
                </div>
                <button
                  onClick={() => { setImageUrl(null); setImageFile(null); setResults(null); setSwTiles([]) }}
                  className="text-xs text-muted hover:text-ink border border-border px-2.5 py-1.5 rounded-lg transition-all shrink-0"
                >Clear</button>
              </div>
            )}

            {loading && <ScanningLoader message={loaderMessage} />}
            {swTiles.length > 0 && <SlidingWindowProgress tiles={swTiles} activeTile={swActive} done={swDone} />}

            {imageDataUrl && !loading && (
              <button
                onClick={runInference}
                className="w-full py-3 rounded-xl bg-teal text-bg font-display font-semibold text-sm hover:bg-teal/90 transition-all hover:scale-[1.01] active:scale-95"
              >
                Analyze patch →
              </button>
            )}

            {error && (
              <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/5 text-xs font-mono text-red-400">
                {error} — check ngrok URL, or leave it blank for demo mode.
              </div>
            )}
          </div>

          {/* Right — results */}
          <div className="flex flex-col gap-5">
            <AnimatePresence>
              {results ? (
                <motion.div key="results" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="flex flex-col gap-5">

                  {results.demo && (
                    <div className="px-3 py-2.5 rounded-lg border border-amber/30 bg-amber/5 text-xs font-mono text-amber/80">
                      Demo mode — Reserch paper metrics only. 
                    </div>
                  )}

                  {/* Compare slider — baseline vs RETINA, both pure B&W */}
                  {results.baseline_mask && results.retina_mask && (
                    <div className="rounded-xl overflow-hidden border border-border">
                      <div className="px-4 py-2.5 border-b border-border flex justify-between items-center">
                        <span className="text-xs font-mono text-muted">← Drag to compare masks →</span>
                        <div className="flex gap-3 text-[10px] font-mono">
                          <span className="text-amber">Baseline B&amp;W</span>
                          <span className="text-teal">RETINA B&amp;W</span>
                        </div>
                      </div>
                      <CompareSlider
                        baselineMask={results.baseline_mask}
                        retinaMask={results.retina_mask}
                      />
                      <p className="text-[10px] font-mono text-muted/50 text-center py-1.5 border-t border-border">
                        White = nucleus · Black = background 
                      </p>
                    </div>
                  )}

                  {/* 3-panel: H&E | Baseline B&W | RETINA B&W */}
                  {results.baseline_mask && results.retina_mask && (
                    <ThreePanelMasks
                      imageDataUrl={imageDataUrl}
                      baselineMask={results.baseline_mask}
                      retinaMask={results.retina_mask}
                    />
                  )}

                  {/* Metrics */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex justify-between text-[10px] font-mono text-muted mb-3">
                      <span>Metric</span>
                      <div className="flex gap-6">
                        <span className="text-amber">Baseline</span>
                        <span className="text-teal">RETINA-Path</span>
                      </div>
                    </div>
                    <MetricRow label="Dice (DSC)"       baseline={results.baseline.dice}       retina={results.retina.dice} />
                    <MetricRow label="IoU (Jaccard)"    baseline={results.baseline.iou}        retina={results.retina.iou} />
                    <MetricRow label="HD95"             baseline={results.baseline.hd95}       retina={results.retina.hd95} unit=" px" lowerIsBetter />
                    <MetricRow label="Nuclei detected"  baseline={results.baseline.cell_count} retina={results.retina.cell_count} />
                    {!results.demo && (
                      <p className="text-[10px] font-mono text-muted/40 mt-3">
                        Metrics are paper averages since no Ground Truth is available for custom uploads.
                        Use the gallery below for Ground Truth-computed scores.
                      </p>
                    )}
                  </div>

                  {/* Highlight stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-teal/30 bg-teal/5 p-4">
                      <p className="text-xs font-mono text-muted/60 mb-1">RETINA nuclei count</p>
                      <p className="font-mono text-2xl font-bold text-teal">{results.retina.cell_count}</p>
                      <p className="text-xs text-teal/60 mt-1">cells detected</p>
                    </div>
                    <div className="rounded-xl border border-violet/30 bg-violet/5 p-4">
                      <p className="text-xs font-mono text-muted/60 mb-1">HD95 improvement</p>
                      <p className="font-mono text-2xl font-bold text-violet">
                        {results.baseline.hd95 > 0 && results.retina.hd95 > 0
                          ? `${(results.baseline.hd95 / results.retina.hd95).toFixed(2)}×`
                          : '2.71×'}
                      </p>
                      <p className="text-xs text-violet/60 mt-1">boundary precision</p>
                    </div>
                  </div>

                </motion.div>
              ) : !loading ? (
                <motion.div initial={{opacity:0}} animate={{opacity:1}}
                  className="flex flex-col items-center justify-center h-72 gap-4 rounded-2xl border border-dashed border-border">
                  <div className="w-12 h-12 rounded-2xl border border-border bg-card flex items-center justify-center">
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#64748B" strokeWidth="1.5">
                      <circle cx="11" cy="11" r="8"/><circle cx="11" cy="11" r="3"/>
                      <path d="M11 3v2M11 17v2M3 11h2M17 11h2"/>
                    </svg>
                  </div>
                  <p className="text-xs font-mono text-muted text-center">
                    Upload a patch and click "Analyze patch →"
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* Gallery */}
        <div>
          <div className="mb-6">
            <p className="text-xs font-mono text-teal/70 uppercase tracking-widest mb-1">MoNuSeg Gallery</p>
            <h3 className="font-display text-2xl font-bold text-ink">Organ-specific benchmarks</h3>
            <p className="text-sm text-muted mt-1">
              Randomly picks a real MoNuSeg .npz patch, runs both models, computes Dice/IoU/HD95 against the ground truth label.
            </p>
          </div>
          <GalleryPanel apiUrl={apiUrl} />
        </div>

      </div>
    </section>
  )
}