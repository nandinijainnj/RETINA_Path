import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ARCHITECTURE_STEPS } from '../data/paperData'

const COLOR = {
  amber:  { ring:'border-amber/40',  bg:'bg-amber/5',  text:'text-amber',  pill:'bg-amber/10 border-amber/30 text-amber'   },
  teal:   { ring:'border-teal/40',   bg:'bg-teal/5',   text:'text-teal',   pill:'bg-teal/10 border-teal/30 text-teal'     },
  violet: { ring:'border-violet/40', bg:'bg-violet/5', text:'text-violet', pill:'bg-violet/10 border-violet/30 text-violet' },
}

// Refined descriptions from paper section 3.2
const REFINED_ARCH = [
  {
    title: 'ResNet-50 CNN Encoder',
    subtitle: 'Local feature extraction — 4 residual stages',
    color: 'amber',
    formula: 'x ∈ ℝ^(224×224×3) → feature maps H\'×W\'×C\'',
    detail: 'Stages produce skip connection feature maps at 1/2, 1/4, 1/8, 1/16 resolution: [256, 512, 256, 64] channels — concatenated into the CUP decoder at corresponding upsampling stages.',
    description: 'The H&E patch (224×224×3) enters a ResNet-50 backbone that applies hierarchical convolutions across 4 stages. Each stage doubles the channel depth while halving spatial resolution, extracting progressively abstract local features — edge gradients at stage 1, texture at stage 2, tissue structures at stage 3. Three skip connection branches are saved at stages 1/2, 1/4, and 1/8 resolution for the decoder.',
  },
  {
    title: 'Patch Embedding & Positional Encoding',
    subtitle: 'Image → token sequence for the Transformer',
    color: 'teal',
    formula: 'z₀ = [x¹_p E; x²_p E; … ; x^N_p E] + E_pos',
    detail: 'N = (14×14) = 196 tokens. Each token: 16×16×C → D-dimensional embedding via linear projection E. E_pos: 1D learnable positional embeddings added to preserve spatial ordering.',
    description: 'The ResNet-50 feature maps are flattened into N non-overlapping 16×16 patches (matching ViT-B/16\'s native patch size). Each patch is linearly projected into a D-dimensional embedding space. Critically, 1D learnable positional encodings E_pos are added so the Transformer knows the spatial arrangement of tokens — without this, self-attention would be permutation-invariant and lose all spatial context.',
  },
  {
    title: 'ViT-B/16 Transformer Bottleneck',
    subtitle: '12 layers of multi-head self-attention (MSA)',
    color: 'violet',
    formula: "z'_l = MSA(LN(z_{l-1})) + z_{l-1}  |  z_l = MLP(LN(z'_l)) + z'_l",
    detail: '12 Transformer layers × 12 attention heads × 64-dim key/value = 144 attention maps per forward pass. Each head captures different relational patterns across the 196 nuclei tokens.',
    description: 'The 196-token sequence passes through 12 identical Transformer layers, each containing a Multi-head Self-Attention block and an MLP block with Layer Normalisation (Pre-LN). MSA allows every nucleus token to attend to every other token — capturing long-range dependencies like spatial regularity of nuclei across the tissue, cluster patterns, and inter-nuclear distances that CNNs with local receptive fields fundamentally cannot model. This global context is the key advantage over pure U-Net architectures.',
  },
  {
    title: 'Cascaded Upsampler (CUP) + Skip Connections',
    subtitle: 'Recovering spatial resolution with residual detail',
    color: 'teal',
    formula: 'Decoder: reshape → upsample × 3 → concat(skip) at each stage',
    detail: '3 skip connections merge ResNet features: 512ch@1/8, 256ch@1/4, 64ch@1/2. Each CUP stage: Conv3×3 + ReLU + Upsample × 2. Final output: full 224×224 feature map at 16 channels.',
    description: 'The Transformer\'s 1D hidden sequence is reshaped back into a 2D spatial grid (D, H/16, W/16). Three CUP upsampling stages progressively restore resolution. At each stage, the corresponding ResNet skip connection is concatenated, injecting high-frequency spatial detail that the Transformer bottleneck compressed away. This U-shaped path ensures the decoder has both the global semantic understanding from the ViT and the sharp local boundaries from the CNN — critical for precise nuclei delineation.',
  },
  {
    title: 'Segmentation Head — Binary Classification',
    subtitle: '2-channel pixel-wise softmax output',
    color: 'violet',
    formula: 'mask = argmax(softmax(Conv1×1(features, out=2))) ∈ {0,1}^(224×224)',
    detail: 'Class 0 = background/stroma. Class 1 = nucleus. Trained with ℒ = λ·ℒ_CE + (1−λ)·ℒ_Dice. In Phase 3, this head replaces the 3-channel reconstruction head from Phase 2.',
    description: 'The final 224×224 feature map passes through a 1×1 convolution outputting exactly 2 channels — one for background (stroma, cytoplasm) and one for nuclei. A softmax normalises each pixel into a probability distribution, and argmax produces the binary segmentation mask. In the RETINA-Path pipeline, this 2-channel head is surgically attached after removing the RGB reconstruction head from Phase 2, transferring all encoder knowledge without restarting from scratch.',
  },
]

export default function ArchitectureSection() {
  const [active, setActive] = useState(0)
  const step = REFINED_ARCH[active]
  const c = COLOR[step.color]

  return (
    <section id="architecture" className="relative py-24 bg-surface">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(123,111,255,0.04),transparent)]" />
      <div className="relative max-w-7xl mx-auto px-6">

        <div className="text-center mb-14">
          <motion.p initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}}
            className="text-xs font-mono text-violet uppercase tracking-widest mb-3">
            Architecture
          </motion.p>
          <motion.h2 initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
            className="font-display text-4xl font-bold text-ink">
            Hybrid TransUNet architecture
          </motion.h2>
          <motion.p initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}} transition={{delay:0.2}}
            className="mt-3 text-muted max-w-xl mx-auto">
            CNN local texture + ViT global context = precise nuclei delineation
          </motion.p>
        </div>

        {/* Step progress bar */}
        <div className="flex items-center justify-center gap-0 mb-10 overflow-x-auto pb-2">
          {REFINED_ARCH.map((s, i) => {
            const sc = COLOR[s.color]
            return (
              <div key={i} className="flex items-center">
                <button onClick={() => setActive(i)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 border whitespace-nowrap ${
                    active===i ? `${sc.pill} border-current` : 'border-transparent text-muted hover:text-ink'
                  }`}>
                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] flex-shrink-0 ${
                    active===i ? `${sc.ring} ${sc.bg} ${sc.text}` :
                    i < active ? 'border-teal/30 bg-teal/5 text-teal' : 'border-border text-muted'
                  }`}>
                    {i < active ? '✓' : i+1}
                  </span>
                  <span className="hidden md:inline">{s.title.split(' ')[0]}{i===1?' Embed':i===2?' ViT':i===3?' CUP':i===4?' Head':''}</span>
                </button>
                {i < REFINED_ARCH.length-1 && (
                  <div className={`w-5 h-px mx-0.5 ${i < active ? 'bg-teal/40' : 'bg-border'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Main card */}
        <AnimatePresence mode="wait">
          <motion.div key={active} initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}
            transition={{duration:0.3}}
            className={`rounded-2xl border ${c.ring} overflow-hidden`}>
            <div className="grid grid-cols-1 lg:grid-cols-5">

              {/* LEFT — paper figure (Fig. 2) for all steps */}
              <div className={`lg:col-span-2 p-6 ${c.bg} border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col gap-4`}>
                <div>
                  <span className={`text-xs font-mono ${c.text}`}>Step {active+1} / {REFINED_ARCH.length}</span>
                  <h3 className="font-display text-xl font-bold text-ink mt-1">{step.title}</h3>
                  <p className="text-xs text-muted mt-1">{step.subtitle}</p>
                </div>

                {/* Paper Fig. 2 always shown */}
                <div className="flex-1 rounded-xl overflow-hidden border border-white/8 bg-bg/40 flex flex-col">
                  <img
                    src="/fig2_architecture.jpg"
                    alt="Architectural overview of the hybrid TransUNet model"
                    className="w-full object-contain"
                    style={{ maxHeight: '260px' }}
                  />
                  <p className="text-center text-xs font-mono text-muted/60 py-2 px-3 border-t border-white/5">
                    Hybrid TransUNet (R50-ViT-B/16)
                  </p>
                </div>

                <div className={`p-3 rounded-xl border ${c.ring} ${c.bg}`}>
                  <p className="text-xs font-mono text-muted/60 leading-relaxed">{step.formula}</p>
                </div>
              </div>

              {/* RIGHT — description + detail */}
              <div className="lg:col-span-3 p-6 flex flex-col justify-center gap-5">
                <motion.div key={active+'desc'} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.4}}>
                  <p className="text-sm text-ink/85 leading-loose font-body">{step.description}</p>
                </motion.div>
                <motion.div key={active+'det'} initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.4, delay:0.1}}
                  className={`p-4 rounded-xl border ${c.ring} ${c.bg}`}>
                  <p className="text-xs font-mono text-muted mb-1">Technical specification</p>
                  <p className={`text-sm font-mono ${c.text} leading-relaxed`}>{step.detail}</p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Nav */}
        <div className="flex justify-between mt-6">
          <button onClick={() => setActive(Math.max(0, active-1))} disabled={active===0}
            className="px-5 py-2 rounded-lg border border-border text-sm text-muted hover:text-ink hover:border-violet/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-body">
            ← Previous
          </button>
          <div className="flex gap-1.5 items-center">
            {REFINED_ARCH.map((_,i) => (
              <button key={i} onClick={() => setActive(i)}
                className={`rounded-full transition-all ${i===active?'w-5 h-1.5 bg-violet':'w-1.5 h-1.5 bg-border hover:bg-muted'}`} />
            ))}
          </div>
          <button onClick={() => setActive(Math.min(4, active+1))} disabled={active===4}
            className="px-5 py-2 rounded-lg border border-border text-sm text-muted hover:text-ink hover:border-violet/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-body">
            Next →
          </button>
        </div>
      </div>
    </section>
  )
}
