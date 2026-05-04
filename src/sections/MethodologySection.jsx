import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { METHODOLOGY_PHASES } from '../data/paperData'

const COLOR = {
  amber:  { pill:'bg-amber/10 border-amber/30 text-amber',   ring:'border-amber/40',  bg:'bg-amber/5',   text:'text-amber',  num:'border-amber/40 bg-amber/8 text-amber'   },
  teal:   { pill:'bg-teal/10 border-teal/30 text-teal',     ring:'border-teal/40',   bg:'bg-teal/5',    text:'text-teal',   num:'border-teal/40 bg-teal/8 text-teal'     },
  violet: { pill:'bg-violet/10 border-violet/30 text-violet', ring:'border-violet/40', bg:'bg-violet/5',  text:'text-violet', num:'border-violet/40 bg-violet/8 text-violet' },
}

// Paper figures for each phase
const PHASE_FIGS = [
  { src: '/fig1_methodology.jpg', caption: 'Comprehensive methodology & workflow' },
  { src: '/fig3_pretraining.jpg', caption: 'Multi-phase RETINA-Path training paradigm' },
  { src: '/fig3_pretraining.jpg', caption: 'Surgical fine-tuning on MoNuSeg' },
]

// Refined steps from paper + notebook code
const REFINED_STEPS = [
  // Phase 1
  [
    {
      label: 'Domain-specific data engineering',
      detail: 'Raw 1000×1000px H&E slides processed via sliding window into 1,813 overlapping 224×224 patches. XML ground-truth masks parsed and co-registered. Saved as .npz (NumPy Compressed) for efficient GPU streaming — input dimension matches ViT-B/16 backbone requirement.',
    },
    {
      label: 'ImageNet weight initialisation',
      detail: 'ResNet-50 + ViT-B/16 loaded from imagenet21k_R50+ViT-B_16.npz. Config: n_skip=3, skip_channels=[512,256,64,16], patches.grid=(14,14), num_classes=2. Standard natural-image transfer learning — the "control" branch of the experiment.',
    },
    {
      label: 'Supervised training (100 epochs, Tesla T4)',
      detail: 'Direct supervised training on MoNuSeg patches. Combined loss: ℒ = λ·ℒ_CE + (1−λ)·ℒ_Dice. Batch size 12, base_lr=0.01, trained on Google Colab Tesla T4. Weights saved per epoch to Drive: MoNuSeg_Final_Weights/epoch_N.pth.',
    },
    {
      label: 'Evaluation on 80/20 hold-out split',
      detail: 'Test set: 20% of 1,813 patches (≈363 patches). Metrics: DSC, IoU, HD95. Result: 0.8734 Dice, 0.7783 IoU, 7.15px HD95. Convergence plateau visible at ~epoch 68 — confirms the domain gap ceiling for ImageNet-initialized models.',
    },
  ],
  // Phase 2
  [
    {
      label: 'NCT-CRC-HE-100K unlabeled dataset',
      detail: '100,000 non-overlapping 224×224 H&E patches from colorectal cancer histology (Kaggle). Zero manual annotations. Captures the statistical distribution of clinical tissue: chromatin texture, nuclear geometry, gland structures — domain-native features ImageNet lacks.',
    },
    {
      label: '50% random patch masking pretext task',
      detail: 'Grid: 14×14 patches of 16×16px each (196 patches total per image). 50% (98 patches) randomly zeroed out via apply_mask() in retina_utils.py. The model receives the corrupted image and must reconstruct original pixel values — a generative in-painting constraint.',
    },
    {
      label: 'MSE reconstruction loss optimisation',
      detail: 'ℒ_MSE = (1/n)Σ(xᵢ − x̂)². 8 epochs on Kaggle Tesla P100 (~10 hrs, 800K total image views). Loss trajectory: 0.01740 → 0.01096 → 0.00992 → 0.00942 → 0.00908 → 0.00881 → 0.00861 → 0.00846. Checkpoint: RETINA_Epoch_8.pth.',
    },
    {
      label: 'Domain-specific representation learning',
      detail: 'Reconstruction forces the encoder to model cell membrane continuity, chromatin texture, and nuclear edge statistics — structural features critical for segmentation but invisible to classification pre-training. The encoder learns a latent space aligned to histopathology, not ImageNet categories.',
    },
  ],
  // Phase 3
  [
    {
      label: 'Load RETINA encoder (Knowledge Bridge)',
      detail: 'RETINA_Epoch_8.pth loaded into TransUNet encoder via load_state_dict(strict=False). Replaces ImageNet weights entirely. Same config: R50-ViT-B/16, n_skip=3, grid=(14,14). The domain-specific representations from Phase 2 become the starting point — not random re-initialisation.',
    },
    {
      label: 'Surgical head swap (reconstruction → segmentation)',
      detail: '3-channel RGB reconstruction head removed. New 2-channel binary segmentation head (Conv1×1, output=2) attached. Enables the pretrained encoder to pivot from pixel reconstruction to semantic nuclei delineation without discarding learned tissue representations.',
    },
    {
      label: 'Fine-tuning on MoNuSeg at three data splits',
      detail: 'Fine-tuned at 10% (~145 patches), 25% (~453 patches), and 100% (1,450 patches) of training labels. Multi-organ: breast, liver, kidney, bladder, colon, prostate. Combined loss ℒ = λ·ℒ_CE + (1−λ)·ℒ_Dice balances pixel accuracy and area overlap. Best model saved to RETINA_Best_Seg.pth.',
    },
    {
      label: 'State-of-the-art performance across all regimes',
      detail: 'Full data (100%): 0.9222 Dice (+5.6%), 0.8562 IoU, 2.63px HD95 (2.71× better). Low data (10%): 0.7611 Dice (+3%), 0.6204 IoU, 13.68px HD95. Tighter score distribution (IQR 0.016 vs 0.038) confirms superior generalisation across organ types and staining conditions.',
    },
  ],
]

export default function MethodologySection() {
  const [active, setActive] = useState(0)
  const phase = METHODOLOGY_PHASES[active]
  const c = COLOR[phase.color]
  const fig = PHASE_FIGS[active]
  const steps = REFINED_STEPS[active]

  return (
    <section id="methodology" className="relative py-24 dot-bg">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(0,201,177,0.03),transparent)]" />
      <div className="relative max-w-7xl mx-auto px-6">

        <div className="text-center mb-14">
          <motion.p initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}}
            className="text-xs font-mono text-teal uppercase tracking-widest mb-3">
            Methodology
          </motion.p>
          <motion.h2 initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
            className="font-display text-4xl font-bold text-ink">
            Three-phase training pipeline
          </motion.h2>
          <motion.p initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}} transition={{delay:0.2}}
            className="mt-3 text-muted max-w-xl mx-auto">
            How RETINA-Path bridges the medical domain gap — step by step
          </motion.p>
        </div>

        {/* Phase selector */}
        <div className="flex justify-center gap-3 mb-10">
          {METHODOLOGY_PHASES.map((p, i) => (
            <button key={p.id} onClick={() => setActive(i)}
              className={`px-5 py-2 rounded-full border text-xs font-mono transition-all duration-200 ${
                active === i ? COLOR[p.color].pill : 'border-border bg-card text-muted hover:text-ink'
              }`}>
              Phase {p.id}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={active} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}}
            transition={{duration:0.35}}
            className={`rounded-2xl border ${c.ring} overflow-hidden`}>

            <div className="grid grid-cols-1 lg:grid-cols-2">

              {/* LEFT — paper figure */}
              <div className={`p-6 border-b lg:border-b-0 lg:border-r border-white/5 ${c.bg} flex flex-col gap-4`}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-mono border ${c.pill}`}>{phase.badge}</span>
                    <span className="text-xs text-muted font-mono">Phase {phase.id} / 3</span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-ink mb-1">{phase.title}</h3>
                  <p className="text-sm text-muted">{phase.subtitle}</p>
                </div>

                {/* Paper figure */}
                <div className="flex-1 rounded-xl overflow-hidden border border-white/8 bg-bg/40 flex flex-col">
                  <img
                    src={fig.src}
                    alt={fig.caption}
                    className="w-full object-contain"
                    style={{ maxHeight: '280px' }}
                  />
                  <p className="text-center text-xs font-mono text-muted/60 py-2 px-3 border-t border-white/5">
                    {fig.caption}
                  </p>
                </div>

                {/* Metric */}
                <div className="p-3 rounded-xl border border-white/5 bg-bg/40 flex justify-between items-center">
                  <span className="text-xs text-muted font-mono">{phase.metric.label}</span>
                  <span className={`font-mono font-bold text-lg ${c.text}`}>{phase.metric.value}</span>
                </div>
              </div>

              {/* RIGHT — refined steps */}
              <div className="p-6 flex flex-col gap-5 bg-bg/20">
                <p className="text-xs font-mono text-muted uppercase tracking-widest">Key steps involved</p>
                <div className="flex flex-col gap-4">
                  {steps.map((step, i) => (
                    <motion.div key={i} initial={{opacity:0,x:16}} animate={{opacity:1,x:0}}
                      transition={{delay:i*0.08}}
                      className="flex gap-3">
                      <div className={`mt-0.5 w-6 h-6 rounded-full border flex-shrink-0 flex items-center justify-center text-xs font-mono ${c.ring} ${c.bg}`}>
                        <span className={c.text}>{i+1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink leading-snug">{step.label}</p>
                        <p className="text-xs text-muted mt-1 leading-relaxed">{step.detail}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-auto p-3 rounded-xl bg-bg/60 border border-white/5">
                  <p className="text-xs text-muted/70 italic">{phase.note}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Nav */}
        <div className="flex justify-between mt-6">
          <button onClick={() => setActive(Math.max(0, active-1))} disabled={active===0}
            className="px-5 py-2 rounded-lg border border-border text-sm text-muted hover:text-ink hover:border-teal/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-body">
            ← Previous
          </button>
          <div className="flex gap-2 items-center">
            {METHODOLOGY_PHASES.map((_,i) => (
              <button key={i} onClick={() => setActive(i)}
                className={`rounded-full transition-all ${i===active?'w-5 h-1.5 bg-teal':'w-1.5 h-1.5 bg-border hover:bg-muted'}`} />
            ))}
          </div>
          <button onClick={() => setActive(Math.min(2, active+1))} disabled={active===2}
            className="px-5 py-2 rounded-lg border border-border text-sm text-muted hover:text-ink hover:border-teal/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-body">
            Next →
          </button>
        </div>
      </div>
    </section>
  )
}
