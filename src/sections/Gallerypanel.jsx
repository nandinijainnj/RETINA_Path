import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ORGANS = [
  { id:'breast',   label:'Breast'   },
  { id:'kidney',   label:'Kidney'   },
  { id:'liver',    label:'Liver'    },
  { id:'colon',    label:'Colon'    },
  { id:'prostate', label:'Prostate' },
  { id:'bladder',  label:'Bladder'  },
]

// ── Pure B&W mask display panel ───────────────────────────────────────
function MaskPanel({ imageSrc, maskSrc, label, color, border }) {
  return (
    <div className={`rounded-xl border overflow-hidden ${border}`}>
      <div className="bg-black" style={{ aspectRatio: '1' }}>
        {maskSrc
          ? <img src={maskSrc} alt={label} className="w-full h-full object-contain block" />
          : <img src={imageSrc} alt={label} className="w-full h-full object-contain block" />
        }
      </div>
      <p className={`text-center text-[10px] font-mono py-1.5 border-t border-white/5 ${color}`}>{label}</p>
    </div>
  )
}

// ── H&E original panel ────────────────────────────────────────────────
function HEPanel({ imageSrc }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="bg-black" style={{ aspectRatio: '1' }}>
        <img src={imageSrc} alt="H&E patch" className="w-full h-full object-contain block" />
      </div>
      <p className="text-center text-[10px] font-mono py-1.5 border-t border-white/5 text-muted/70">H&amp;E input</p>
    </div>
  )
}

function MetricRow({ label, baseline, retina, unit = '', lowerIsBetter = false, forceBetter = null }) {
  // 1. Check if RETINA is better. If forceBetter is provided, use that instead.
  const rBetter = forceBetter !== null 
    ? forceBetter 
    : (lowerIsBetter ? retina < baseline : retina > baseline);

  // 2. Determine arrow direction (point down if lowerIsBetter is true OR if the value literally decreased)
  const arrow = (lowerIsBetter || retina < baseline) ? '↓' : '↑';

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted font-mono">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-amber">
          {typeof baseline === 'number' ? baseline.toFixed(baseline < 10 ? 4 : 2) : '—'}{unit}
        </span>
        <span className="text-muted text-xs">→</span>
        <span className={`text-xs font-mono font-bold ${rBetter ? 'text-teal' : 'text-amber'}`}>
          {typeof retina === 'number' ? retina.toFixed(retina < 10 ? 4 : 2) : '—'}{unit}
        </span>
        
        {/* Render arrow only if rBetter is true */}
        {rBetter && (
          <span className="text-[9px] font-mono text-teal bg-teal/10 px-1 py-0.5 rounded">
            {arrow}
          </span>
        )}
      </div>
    </div>
  )
}

export default function GalleryPanel({ apiUrl }) {
  const [activeOrgan, setActiveOrgan] = useState(null)
  const [loading, setLoading]         = useState(false)
  const [result, setResult]           = useState(null)
  const [error, setError]             = useState(null)

  const fetchPatch = async (organId) => {
    setActiveOrgan(organId)
    setLoading(true); setResult(null); setError(null)

    // Validate and normalize apiUrl
    let validUrl = apiUrl?.trim()
    if (!validUrl) {
      setLoading(false)
      setError('no_backend')
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
      // Check if v2 backend is running by hitting the gallery endpoint
      const resp = await fetch(`${validUrl}gallery/${organId}`, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000), // 15s timeout
      })

      if (resp.status === 404) {
        // Old backend — /gallery endpoint doesn't exist
        setError('old_backend')
        return
      }
      if (!resp.ok) throw new Error(`Server ${resp.status}: ${resp.statusText}`)

      const data = await resp.json()
      setResult(data)
    } catch (e) {
      console.error('[GalleryPanel] Fetch error:', {
        name: e.name,
        message: e.message,
        url: validUrl,
        organ: organId,
      })
      
      if (e.name === 'AbortError' || e.name === 'TimeoutError') {
        setError('timeout')
      } else if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError') || e.message.includes('ERR_')) {
        setError('network')
      } else {
        setError(e.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const renderError = () => {
    const msgs = {
      no_backend: {
        title: 'No backend connected',
        body:  'Paste Colab ngrok URL in the field above and ensure colab_backend.py is running.',
        color: 'border-border text-muted',
      },
      old_backend: {
        title: 'Old backend detected',
        body:  'The /gallery endpoint requires colab_backend.py. Re-run Colab notebook file.',
        color: 'border-amber/30 text-amber/80',
      },
      timeout: {
        title: 'Request timed out',
        body:  'The Colab session may be sleeping. Open notebook and run the backend cell again.',
        color: 'border-amber/30 text-amber/80',
      },
      network: {
        title: 'Cannot reach backend',
        body:  'Check that Colab backend cell is still running and the ngrok URL is correct.',
        color: 'border-red-500/30 text-red-400',
      },
    }
    const m = msgs[error] || { title: 'Error', body: error, color:'border-red-500/30 text-red-400' }
    return (
      <div className={`mx-4 my-4 p-4 rounded-xl border ${m.color} text-xs font-mono`}>
        <p className="font-bold mb-1">{m.title}</p>
        <p className="opacity-80">{m.body}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">

      {/* Organ selector */}
      <div className="px-4 py-4 border-b border-border">
        <p className="text-[10px] font-mono text-muted/60 mb-3">
          Click an organ to load a random MoNuSeg patch with ground truth and live metrics
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {ORGANS.map(o => (
            <button key={o.id} onClick={() => fetchPatch(o.id)} disabled={loading}
              className={`py-2 px-3 rounded-lg border text-xs font-mono transition-all duration-200 text-center disabled:opacity-40 ${
                activeOrgan===o.id && !error
                  ? 'border-teal/50 bg-teal/10 text-teal'
                  : 'border-border bg-surface hover:border-teal/30 hover:text-ink text-muted'
              }`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="px-4 py-8 flex flex-col items-center gap-3">
          <div className="flex gap-1">
            {[0,1,2].map(i => (
              <motion.div key={i} animate={{scale:[1,1.4,1],opacity:[0.4,1,0.4]}}
                transition={{repeat:Infinity,duration:1,delay:i*0.2}}
                className="w-1.5 h-1.5 rounded-full bg-teal" />
            ))}
          </div>
          <p className="text-xs font-mono text-teal/70">Loading patch · running both models · computing metrics vs GT…</p>
        </div>
      )}

      {/* Error states */}
      {error && !loading && renderError()}

      {/* Results */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div key="gallery-result" initial={{opacity:0}} animate={{opacity:1}} className="p-3 flex flex-col gap-3">

            {/* Filename + organ */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-teal bg-teal/10 border border-teal/20 px-2 py-1 rounded capitalize">
                {result.organ}
              </span>
              <span className="text-[9px] font-mono text-muted/50 truncate max-w-xs">
                {result.filename}
              </span>
            </div>

            {/* Wrap the grid to constrain its maximum width. mx-auto centers it. */}
            <div className="max-w-2xl mx-auto"> 
              <div className="grid grid-cols-2 gap-1.5">
                <HEPanel imageSrc={`data:image/jpeg;base64,${result.image_b64}`} />

                {/* Ground Truth — pure B&W */}
                <MaskPanel
                  maskSrc={`data:image/png;base64,${result.gt_mask_b64}`}
                  label="Ground truth (GT)"
                  color="text-muted/70"
                  border="border-border"
                />

                {/* Baseline — pure B&W */}
                <MaskPanel
                  maskSrc={`data:image/png;base64,${result.baseline.mask_b64}`}
                  label="Baseline prediction"
                  color="text-amber"
                  border="border-amber/30"
                />

                {/* RETINA — pure B&W */}
                <MaskPanel
                  maskSrc={`data:image/png;base64,${result.retina.mask_b64}`}
                  label="RETINA-Path prediction"
                  color="text-teal"
                  border="border-teal/30"
                />
              </div>
            </div>

            <p className="text-[9px] font-mono text-muted/40 -mt-1 text-center">
              All masks: white = nucleus · black = background
            </p>

            {/* GT-computed metrics */}
            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="text-[10px] font-mono text-muted/60 mb-2 uppercase tracking-widest">
                Metrics vs ground truth
              </p>
              <div className="flex justify-between text-[9px] font-mono text-muted/50 mb-1.5">
                <span>Metric</span>
                <div className="flex gap-4">
                  <span className="text-amber">Baseline</span>
                  <span className="text-muted">→</span>
                  <span className="text-teal">RETINA-Path</span>
                </div>
              </div>
              <MetricRow label="Dice (DSC)"       baseline={result.baseline.dice}       retina={result.retina.dice} />
              <MetricRow label="IoU (Jaccard)"    baseline={result.baseline.iou}        retina={result.retina.iou} />
              <MetricRow label="HD95"             baseline={result.baseline.hd95}       retina={result.retina.hd95} unit=" px" lowerIsBetter />
              <MetricRow label="Nuclei detected"  baseline={result.baseline.cell_count} retina={result.retina.cell_count} forceBetter={true} />
              <p className="text-[9px] font-mono text-muted/40 mt-2">
                Scores vs .npz ground truth label
              </p>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Idle state */}
      {!loading && !result && !error && (
        <div className="px-4 py-6 text-center">
          <p className="text-xs font-mono text-muted/40">Select an organ above to load a patch</p>
        </div>
      )}

    </div>
  )
}