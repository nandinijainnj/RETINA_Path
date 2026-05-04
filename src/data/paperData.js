// All quantitative results from the RETINA-Path paper (Table 1, Figs 6-9)

export const PERFORMANCE_TABLE = [
  { split: '10%',  baseline_dice: 0.7313, retina_dice: 0.7611, baseline_iou: 0.5822, retina_iou: 0.6204, baseline_hd95: 15.37, retina_hd95: 13.68 },
  { split: '25%',  baseline_dice: 0.7805, retina_dice: 0.7777, baseline_iou: 0.6443, retina_iou: 0.6412, baseline_hd95: 12.55, retina_hd95: 14.78 },
  { split: '100%', baseline_dice: 0.8734, retina_dice: 0.9222, baseline_iou: 0.7783, retina_iou: 0.8562, baseline_hd95: 7.15,  retina_hd95: 2.63  },
]

// Data efficiency curve (Fig 7) — interpolated for smooth chart
export const EFFICIENCY_CURVE = [
  { pct: 10,  baseline: 0.731, retina: 0.761 },
  { pct: 20,  baseline: 0.756, retina: 0.769 },
  { pct: 25,  baseline: 0.780, retina: 0.778 },
  { pct: 35,  baseline: 0.793, retina: 0.798 },
  { pct: 50,  baseline: 0.812, retina: 0.828 },
  { pct: 65,  baseline: 0.831, retina: 0.858 },
  { pct: 75,  baseline: 0.848, retina: 0.878 },
  { pct: 85,  baseline: 0.859, retina: 0.900 },
  { pct: 100, baseline: 0.873, retina: 0.922 },
]

// Box plot data for stability section (Fig 9)
export const STABILITY = {
  baseline: { mean: 0.9053, q1: 0.886, q3: 0.924, min: 0.862, max: 0.942, iqr: 0.038 },
  retina:   { mean: 0.9220, q1: 0.914, q3: 0.930, min: 0.901, max: 0.944, iqr: 0.016 },
}

// Pre-training dynamics (Fig 5)
export const PRETRAIN_LOSS = [
  { epoch: 1, mse: 0.01740 },
  { epoch: 2, mse: 0.01420 },
  { epoch: 3, mse: 0.01220 },
  { epoch: 4, mse: 0.01080 },
  { epoch: 5, mse: 0.00980 },
  { epoch: 6, mse: 0.00920 },
  { epoch: 7, mse: 0.00878 },
  { epoch: 8, mse: 0.00846 },
]

// Hero stats
export const HERO_STATS = [
  { label: 'Dice Score',        value: '0.922',  unit: 'DSC',  color: 'teal',   detail: 'State-of-the-art' },
  { label: 'Hausdorff Dist.',   value: '2.63',   unit: 'px',   color: 'violet', detail: '3× better boundary' },
  { label: 'Low-data Dice',     value: '0.761',  unit: '10%',  color: 'amber',  detail: 'With 10% labels' },
]

// Methodology phases (Idea 16)
export const METHODOLOGY_PHASES = [
  {
    id: 1,
    title: 'Phase 1 — Baseline TransUNet',
    subtitle: 'Standard ImageNet initialization',
    color: 'amber',
    badge: 'ImageNet weights',
    steps: [
      { label: 'ImageNet pre-training', detail: 'ResNet-50 + ViT-B/16 weights from natural image classification' },
      { label: 'Hybrid encoder',        detail: 'CNN extracts local feature maps, ViT captures global context via MSA' },
      { label: 'CUP decoder',           detail: 'Cascaded upsampler with 3 skip connections from ResNet stages' },
      { label: 'Segmentation head',     detail: '2-channel output (nuclei vs. background), trained with CE + Dice loss' },
    ],
    metric: { label: 'Dice @ 100%', value: '0.873' },
    note: 'Reaches a convergence plateau — domain gap limits performance',
  },
  {
    id: 2,
    title: 'Phase 2 — Self-Supervised Pre-training',
    subtitle: '100K unlabeled H&E patches, zero manual labels',
    color: 'teal',
    badge: 'No labels needed',
    steps: [
      { label: 'NCT-CRC-HE-100K dataset', detail: '100,000 unlabeled colorectal cancer H&E patches (224×224px)' },
      { label: '50% random patch masking', detail: 'Half of input patches are randomly zeroed — a generative in-painting task' },
      { label: 'Pixel reconstruction',     detail: 'Encoder forced to predict original pixels from visible context' },
      { label: 'MSE reconstruction loss',  detail: 'ℒ_MSE = (1/n)Σ(xᵢ − x̂)² converges from 0.01740 → 0.00846 over 8 epochs' },
    ],
    metric: { label: 'MSE converged to', value: '0.00846' },
    note: 'Forces the model to learn chromatin texture, cell geometry, membrane continuity',
  },
  {
    id: 3,
    title: 'Phase 3 — Surgical Fine-tuning',
    subtitle: 'Knowledge transfer to MoNuSeg',
    color: 'violet',
    badge: 'RETINA-Path',
    steps: [
      { label: 'Load domain-specific weights', detail: 'RETINA_Epoch_8.pth replaces ImageNet initialization in the encoder' },
      { label: 'Swap the head',               detail: '3-channel reconstruction head removed; 2-channel segmentation head added' },
      { label: 'MoNuSeg fine-tuning',         detail: '30 annotated slides → 1813 patches, 80/20 train/test split' },
      { label: 'Combined loss',               detail: 'ℒ_Total = λ·ℒ_CE + (1−λ)·ℒ_Dice — balances pixel accuracy and overlap' },
    ],
    metric: { label: 'Dice @ 100%', value: '0.922' },
    note: '+5.6% over baseline — domain-specific pre-training closes the medical domain gap',
  },
]

// Architecture steps (Idea 13)
export const ARCHITECTURE_STEPS = [
  {
    id: 1,
    title: 'ResNet-50 CNN Encoder',
    subtitle: 'Local feature extraction',
    color: 'amber',
    description: 'The input H&E patch (224×224×3) passes through a ResNet-50 backbone. At each of 4 stages, the network extracts increasingly abstract local feature maps, capturing textures like chromatin patterns and cell edges. Skip connection branches are saved from each stage.',
    visual: 'cnn',
    formula: 'x ∈ ℝ^(H×W×C) → H×W×C feature maps',
    detail: '4 ResNet stages → feature maps at 56×56, 28×28, 14×14, 7×7 resolution',
  },
  {
    id: 2,
    title: 'Patch Embedding',
    subtitle: 'Image → token sequence',
    color: 'teal',
    description: 'The CNN feature maps are flattened into N non-overlapping 16×16 patches. Each patch is linearly projected into a D-dimensional embedding vector. 1D learnable positional encodings are added to preserve spatial awareness.',
    visual: 'embed',
    formula: 'z₀ = [x¹_p E; x²_p E; ...; x^N_p E] + E_pos',
    detail: 'N = (H×W) / P² = 196 tokens for a 224×224 input with P=16',
  },
  {
    id: 3,
    title: 'ViT Transformer Bottleneck',
    subtitle: '12 layers of multi-head self-attention',
    color: 'violet',
    description: 'The token sequence passes through 12 Transformer layers. Each layer applies Multi-head Self-Attention (MSA) followed by an MLP block with Layer Normalization. This allows every nucleus to attend to every other — capturing the global tissue architecture that CNNs miss.',
    visual: 'vit',
    formula: "z'_l = MSA(LN(z_{l-1})) + z_{l-1}",
    detail: '12 Transformer layers × 12 attention heads = 144 attention maps per forward pass',
  },
  {
    id: 4,
    title: 'CUP Decoder + Skip Connections',
    subtitle: 'Recovering spatial resolution',
    color: 'teal',
    description: 'The Transformer output is reshaped from a 1D sequence back to a 2D spatial grid. A Cascaded Upsampler (CUP) progressively restores resolution. At each stage, high-resolution features from the corresponding ResNet layer are concatenated via skip connections — preserving the sharp edges needed for nuclei boundaries.',
    visual: 'decoder',
    formula: 'U-shape: Transformer context + ResNet spatial detail',
    detail: '3 skip connections bring 512, 256, 64 channel features from the CNN encoder',
  },
  {
    id: 5,
    title: 'Segmentation Head',
    subtitle: 'Binary pixel classification',
    color: 'violet',
    description: 'The final feature map passes through a 1×1 convolution outputting 2 channels — one for nuclei, one for background. A softmax normalizes each pixel into a probability. The binary mask is generated by taking the argmax across channels.',
    visual: 'head',
    formula: 'mask = argmax(softmax(Conv1×1(features, out=2)))',
    detail: 'Output: 224×224 binary mask, 1 = nucleus, 0 = background',
  },
]

// Gallery organs
export const GALLERY_ORGANS = [
  { id: 'breast',  label: 'Breast',        emoji: '🔬' },
  { id: 'liver',   label: 'Liver',         emoji: '🔬' },
  { id: 'kidney',  label: 'Kidney',        emoji: '🔬' },
  { id: 'bladder', label: 'Bladder',       emoji: '🔬' },
  { id: 'colon',   label: 'Colon',         emoji: '🔬' },
  { id: 'prostate',label: 'Prostate',      emoji: '🔬' },
]
