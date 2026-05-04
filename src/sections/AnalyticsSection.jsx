import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { useCountUp, useInView } from '../hooks'
import { PERFORMANCE_TABLE, EFFICIENCY_CURVE, STABILITY } from '../data/paperData'

const TEAL   = '#00C9B1'
const AMBER  = '#F59E0B'
const VIOLET = '#7B6FFF'
const MUTED  = '#64748B'

// HD95 data — lower is better
const HD95_DATA = [
  { split: '10%',  baseline: 15.37, retina: 13.68 },
  { split: '25%',  baseline: 12.55, retina: 14.78 },
  { split: '100%', baseline: 7.15,  retina: 2.63  },
]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 text-xs font-mono shadow-xl">
      <p className="text-muted mb-2">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="flex gap-4 justify-between">
          <span>{p.name}</span>
          <span className="font-bold">{typeof p.value === 'number' ? p.value.toFixed(p.value < 5 ? 2 : 2) : p.value}</span>
        </p>
      ))}
    </div>
  )
}

function HD95Tooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 text-xs font-mono shadow-xl">
      <p className="text-muted mb-2">{label} data</p>
      {payload.map(p => (
        <div key={p.name}>
          <p style={{ color: p.color }} className="flex gap-4 justify-between">
            <span>{p.name}</span>
            <span className="font-bold">{p.value.toFixed(2)} px</span>
          </p>
        </div>
      ))}
      {payload.length === 2 && (
        <p className="text-teal/60 mt-2 border-t border-border pt-2">
          Improvement: {((payload[0].value - payload[1].value) / payload[0].value * 100).toFixed(0)}% reduction
        </p>
      )}
    </div>
  )
}

function MetricCard({ label, retina, baseline, unit, higherIsBetter=true }) {
  const [ref, inView] = useInView()
  const rVal = useCountUp(retina, 1600, inView, retina < 10 ? 4 : 2)
  const bVal = useCountUp(baseline, 1600, inView, baseline < 10 ? 4 : 2)
  const rBetter = higherIsBetter ? retina > baseline : retina < baseline
  return (
    <div ref={ref} className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-mono text-muted mb-3">{label}</p>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-teal/70 font-mono">RETINA-Path</span>
          <span className="font-mono font-bold text-teal text-sm">{rVal.toFixed(retina<10?4:2)} {unit}</span>
        </div>
        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
          <motion.div initial={{width:0}} animate={inView?{width:`${rBetter?90:70}%`}:{}}
            transition={{duration:1,delay:0.3}} className="h-full bg-teal rounded-full" />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-amber/70 font-mono">Baseline</span>
          <span className="font-mono font-bold text-amber text-sm">{bVal.toFixed(baseline<10?4:2)} {unit}</span>
        </div>
        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
          <motion.div initial={{width:0}} animate={inView?{width:`${rBetter?70:90}%`}:{}}
            transition={{duration:1,delay:0.5}} className="h-full bg-amber rounded-full" />
        </div>
      </div>
    </div>
  )
}

function BoxPlot() {
  const [ref, inView] = useInView()
  const data = [
    { label:'Baseline', ...STABILITY.baseline, color: AMBER },
    { label:'RETINA-Path', ...STABILITY.retina, color: TEAL },
  ]
  const yMin=0.85, yMax=1.0
  const toY = v => ((yMax-v)/(yMax-yMin))*100
  return (
    <div ref={ref} className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-mono text-muted mb-4">Dice score distribution — stability analysis</p>
      <div className="flex gap-8 justify-center items-end h-40">
        {data.map(d => {
          const wTop=toY(Math.min(d.max,yMax)), q3y=toY(d.q3), medY=toY(d.mean), q1y=toY(d.q1), wBot=toY(Math.max(d.min,yMin))
          return (
            <div key={d.label} className="flex flex-col items-center gap-2 w-24">
              <div className="relative w-full h-36">
                <motion.div initial={{height:0}} animate={inView?{height:`${q3y-wTop}%`}:{}} transition={{duration:0.8,delay:0.2}}
                  style={{top:`${wTop}%`,left:'50%',transform:'translateX(-50%)',width:1,background:d.color,position:'absolute'}} />
                <motion.div initial={{height:0,top:`${q1y}%`}} animate={inView?{height:`${q1y-q3y}%`,top:`${q3y}%`}:{}} transition={{duration:0.8,delay:0.3}}
                  style={{left:'20%',right:'20%',background:`${d.color}22`,border:`1px solid ${d.color}66`,position:'absolute',borderRadius:4}} />
                <motion.div initial={{opacity:0}} animate={inView?{opacity:1}:{}} transition={{delay:0.7}}
                  style={{top:`${medY}%`,left:'15%',right:'15%',height:2,background:d.color,position:'absolute',borderRadius:1}} />
                <motion.div initial={{height:0}} animate={inView?{height:`${wBot-q1y}%`}:{}} transition={{duration:0.8,delay:0.2}}
                  style={{top:`${q1y}%`,left:'50%',transform:'translateX(-50%)',width:1,background:d.color,position:'absolute'}} />
                <motion.div initial={{opacity:0}} animate={inView?{opacity:1}:{}} transition={{delay:0.9}}
                  style={{top:`${medY-8}%`,right:'-42px',position:'absolute'}}>
                  <span style={{color:d.color}} className="text-[10px] font-mono">{d.mean.toFixed(4)}</span>
                </motion.div>
              </div>
              <span style={{color:d.color}} className="text-[10px] font-mono text-center leading-tight">{d.label}</span>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] font-mono text-muted mt-2 border-t border-border pt-2">
        <span>Tighter = more stable</span>
        <span>RETINA IQR: {STABILITY.retina.iqr.toFixed(3)} vs {STABILITY.baseline.iqr.toFixed(3)}</span>
      </div>
    </div>
  )
}

export default function AnalyticsSection() {
  const [sliderPct, setSliderPct] = useState(100)
  const filtered = EFFICIENCY_CURVE.filter(d => d.pct <= sliderPct)
  const current  = EFFICIENCY_CURVE.find(d => d.pct === sliderPct) || EFFICIENCY_CURVE[EFFICIENCY_CURVE.length-1]

  const barData = PERFORMANCE_TABLE.map(r => ({
    name: r.split,
    'Baseline Dice': r.baseline_dice,
    'RETINA Dice':   r.retina_dice,
  }))

  return (
    <section id="analytics" className="relative py-24 dot-bg">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(245,158,11,0.03),transparent)]" />
      <div className="relative max-w-7xl mx-auto px-6">

        <div className="text-center mb-14">
          <motion.p initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}}
            className="text-xs font-mono text-amber uppercase tracking-widest mb-3">
            Results
          </motion.p>
          <motion.h2 initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
            className="font-display text-4xl font-bold text-ink">
            Quantitative performance
          </motion.h2>
          <motion.p initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}} transition={{delay:0.2}}
            className="mt-3 text-muted max-w-xl mx-auto">
            RETINA-Path vs ImageNet baseline — MoNuSeg benchmark
          </motion.p>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          <MetricCard label="Dice Score (DSC) @ 100% data"     retina={0.9222} baseline={0.8734} unit="" />
          <MetricCard label="IoU (Jaccard) @ 100% data"        retina={0.8562} baseline={0.7783} unit="" />
          <MetricCard label="HD95 @ 100% data"                  retina={2.63}   baseline={7.15}   unit="px" higherIsBetter={false} />
          <MetricCard label="Dice Score (DSC) @ 10% data"      retina={0.7611} baseline={0.7313} unit="" />
          <MetricCard label="IoU (Jaccard) @ 10% data"         retina={0.6204} baseline={0.5822} unit="" />
          <MetricCard label="HD95 @ 10% data"                   retina={13.68}  baseline={15.37}  unit="px" higherIsBetter={false} />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Dice bar chart */}
          <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
            className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-mono text-muted mb-1">Dice Similarity Coefficient by training data split</p>
            <p className="text-xs text-teal/50 font-mono mb-4">↑ Higher is better · RETINA-Path achieves 0.92 score at 100% data</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2E45" vertical={false} />
                <XAxis dataKey="name" tick={{fill:MUTED,fontSize:11,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false} />
                <YAxis domain={[0.5,1]} tick={{fill:MUTED,fontSize:10,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false} tickFormatter={v=>v.toFixed(1)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Baseline Dice" fill={AMBER} fillOpacity={0.75} radius={[4,4,0,0]} animationDuration={1200} />
                <Bar dataKey="RETINA Dice"   fill={TEAL}  fillOpacity={0.9}  radius={[4,4,0,0]} animationDuration={1200} animationBegin={200} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11,fontFamily:'JetBrains Mono',color:MUTED}} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* HD95 bar chart — replaces MSE loss */}
          <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.1}}
            className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-mono text-muted mb-1">Hausdorff Distance HD95 by training data split</p>
            <p className="text-xs text-teal/50 font-mono mb-4">↓ Lower is better · RETINA-Path achieves 2.71× at 100% data</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={HD95_DATA} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2E45" vertical={false} />
                <XAxis dataKey="split" tick={{fill:MUTED,fontSize:11,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false} />
                <YAxis domain={[0,17]} tick={{fill:MUTED,fontSize:10,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}px`} />
                <Tooltip content={<HD95Tooltip />} />
                <Bar dataKey="baseline" name="Baseline" fill={AMBER} fillOpacity={0.75} radius={[4,4,0,0]} animationDuration={1200} />
                <Bar dataKey="retina"   name="RETINA-Path" fill={TEAL} fillOpacity={0.9} radius={[4,4,0,0]} animationDuration={1200} animationBegin={200} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11,fontFamily:'JetBrains Mono',color:MUTED}} />
                <ReferenceLine y={2.63} stroke={TEAL} strokeDasharray="4 3" strokeOpacity={0.4}
                  label={{value:'2.63px best',fill:TEAL,fontSize:9,fontFamily:'JetBrains Mono'}} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Data efficiency + box plot */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
            className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs font-mono text-muted">Data efficiency — drag to explore</p>
                <p className="text-xs text-muted/50 font-mono">How much training data does each model need?</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs text-muted">@ {sliderPct}% labels</p>
                <p className="font-mono text-sm text-teal">{current?.retina?.toFixed(3)} <span className="text-muted text-xs">RETINA</span></p>
                <p className="font-mono text-sm text-amber">{current?.baseline?.toFixed(3)} <span className="text-muted text-xs">baseline</span></p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={filtered}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2E45" vertical={false} />
                <XAxis dataKey="pct" tick={{fill:MUTED,fontSize:11,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} />
                <YAxis domain={[0.7,0.95]} tick={{fill:MUTED,fontSize:10,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false} tickFormatter={v=>v.toFixed(2)} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="retina"   name="RETINA-Path" stroke={TEAL}  strokeWidth={2.5} dot={{fill:TEAL, r:3}}  isAnimationActive={false} />
                <Line type="monotone" dataKey="baseline" name="Baseline"    stroke={AMBER} strokeWidth={2}   dot={{fill:AMBER,r:3}}  isAnimationActive={false} strokeDasharray="5 3" />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11,fontFamily:'JetBrains Mono',color:MUTED}} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-[10px] font-mono text-muted">10%</span>
              <input type="range" min={10} max={100} step={5} value={sliderPct}
                onChange={e => setSliderPct(Number(e.target.value))}
                className="flex-1 accent-teal cursor-pointer" />
              <span className="text-[10px] font-mono text-muted">100%</span>
            </div>
          </motion.div>
          <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.1}}>
            <BoxPlot />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
