import os
import subprocess
subprocess.run(["pip", "install", "-q", "fastapi", "uvicorn", "pyngrok",
                "python-multipart", "ml_collections", "medpy"], check=False)

import io, base64, threading, time, math, os, sys, glob, random
import numpy as np
import torch
import torchvision.transforms as T
import cv2
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from pyngrok import ngrok

# TransUNet imports
if not os.path.exists("/content/TransUNet"):
    print("Cloning TransUNet...")
    subprocess.run(["git","clone","-q","https://github.com/Beckschen/TransUNet.git","/content/TransUNet"])
if "/content/TransUNet" not in sys.path:
    sys.path.insert(0, "/content/TransUNet")

from networks.vit_seg_modeling import VisionTransformer as ViT_seg
from networks import vit_seg_configs

# Configuration 
DEVICE       = torch.device("cuda" if torch.cuda.is_available() else "cpu")
PROJECT_PATH = "/content/drive/MyDrive/Retina_Project_Data"
BASELINE_WEIGHTS = os.path.join(PROJECT_PATH, "MoNuSeg_Final_Weights", "epoch_99.pth")
RETINA_WEIGHTS   = os.path.join(PROJECT_PATH, "RETINA_Best_Seg.pth")
EXTRACT_ROOT     = "/content/monuseg_data"
DATA_ZIP         = os.path.join(PROJECT_PATH, "monuseg_patches.zip")

print(f"\nDevice: {DEVICE}")

# TCGA barcode → organ mapping (MoNuSeg dataset)
TCGA_ORGAN = {
    # Breast
    'TCGA-A7':'breast','TCGA-B6':'breast','TCGA-BH':'breast','TCGA-D8':'breast',
    'TCGA-E2':'breast','TCGA-EW':'breast','TCGA-GM':'breast','TCGA-18':'breast',
    'TCGA-AO':'breast','TCGA-AR':'breast','TCGA-AN':'breast','TCGA-C8':'breast',
    # Kidney
    'TCGA-B0':'kidney','TCGA-DK':'kidney','TCGA-G9':'kidney','TCGA-HE':'kidney',
    'TCGA-2Z':'kidney','TCGA-44':'kidney','TCGA-BP':'kidney','TCGA-CJ':'kidney',
    'TCGA-F9':'kidney','TCGA-IZ':'kidney','TCGA-KL':'kidney',
    # Liver
    'TCGA-BC':'liver','TCGA-DD':'liver','TCGA-ED':'liver','TCGA-EP':'liver',
    'TCGA-FV':'liver','TCGA-G3':'liver','TCGA-LP':'liver','TCGA-YY':'liver',
    # Colon
    'TCGA-AY':'colon','TCGA-NH':'colon','TCGA-AA':'colon','TCGA-3L':'colon',
    'TCGA-A6':'colon','TCGA-DY':'colon','TCGA-RU':'colon','TCGA-4N':'colon',
    # Prostate
    'TCGA-EJ':'prostate','TCGA-KK':'prostate','TCGA-J4':'prostate',
    'TCGA-CH':'prostate','TCGA-QU':'prostate','TCGA-VN':'prostate',
    # Bladder
    'TCGA-2F':'bladder','TCGA-BL':'bladder','TCGA-GU':'bladder',
    'TCGA-GV':'bladder','TCGA-XF':'bladder','TCGA-4Z':'bladder',
    # Stomach
    'TCGA-BR':'stomach','TCGA-CG':'stomach','TCGA-D7':'stomach',
    'TCGA-FP':'stomach','TCGA-HZ':'stomach','TCGA-R2':'stomach',
}

def detect_organ(filename):
    """Extract organ from TCGA barcode in filename. Falls back to 'other'."""
    base = os.path.basename(filename).upper()
    for barcode, organ in TCGA_ORGAN.items():
        if barcode in base:
            return organ
    return 'other'

# Build organ patch index on startup
print("Scanning MoNuSeg patches...")

# Unzip if needed
if not os.path.exists(EXTRACT_ROOT) and os.path.exists(DATA_ZIP):
    print("Unzipping MoNuSeg data...")
    subprocess.run(["unzip", "-q", DATA_ZIP, "-d", EXTRACT_ROOT])

ALL_PATCHES = sorted(glob.glob(os.path.join(EXTRACT_ROOT, "**", "*.npz"), recursive=True))

ORGAN_INDEX = {}  # organ_name -> [list of .npz paths]
for p in ALL_PATCHES:
    organ = detect_organ(p)
    ORGAN_INDEX.setdefault(organ, []).append(p)

print(f"Found {len(ALL_PATCHES)} patches across organs: { {k:len(v) for k,v in ORGAN_INDEX.items()} }")

# Model builder 
def build_transunet():
    config = vit_seg_configs.get_r50_b16_config()
    config.n_skip        = 3
    config.skip_channels = [512, 256, 64, 16]
    config.patches.grid  = (14, 14)
    return ViT_seg(config, img_size=224, num_classes=2)

def load_model(weights_path):
    model = build_transunet().to(DEVICE)
    if not os.path.exists(weights_path):
        found = glob.glob(os.path.join("/content/drive","**",os.path.basename(weights_path)), recursive=True)
        if found: weights_path = found[0]
        else: raise FileNotFoundError(f"Not found: {weights_path}")
    ckpt  = torch.load(weights_path, map_location=DEVICE)
    state = ckpt.get("model_state_dict", ckpt.get("state_dict", ckpt))
    model.load_state_dict(state, strict=False)
    model.eval()
    print(f"  Loaded: {os.path.basename(weights_path)}")
    return model

print("\nLoading models...")
MODELS_LOADED = False
baseline_model = retina_model = None
try:
    baseline_model = load_model(BASELINE_WEIGHTS)
    retina_model   = load_model(RETINA_WEIGHTS)
    MODELS_LOADED  = True
    print("✓ Both models loaded\n")
except Exception as e:
    print(f"⚠  Model loading failed: {e}")
    print("   Running in mock mode.\n")

# Pre-processing 
_patch_transform = T.Compose([T.ToTensor()])

def pil_to_tensor(pil_img):
    """224×224 PIL RGB → (1,3,224,224) tensor on DEVICE."""
    return _patch_transform(pil_img).unsqueeze(0).float().to(DEVICE)

def preprocess_bytes(img_bytes):
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    W, H = img.size
    if W >= 224 and H >= 224:
        img = T.CenterCrop(224)(img)
    else:
        img = img.resize((224, 224))
    return pil_to_tensor(img), img

# Direct inference (224×224 input)
def run_inference(model, tensor):
    """Returns (224,224) uint8 binary mask: 1=nucleus, 0=background."""
    with torch.no_grad():
        out = model(tensor)
        return torch.argmax(torch.softmax(out, dim=1), dim=1).squeeze(0).cpu().numpy().astype(np.uint8)

# Smooth overlapping sliding window (exact Cell 11 logic) 
def run_smooth_sliding_window(model, pil_img, patch_size=224, stride=112):
    """
    Mirrors Phase 3 Cell 11 exactly:
      - prob_map (H,W,2): accumulates softmax probabilities across tiles
      - count_map (H,W):  counts predictions per pixel
      - avg_probs = prob_map / count_map
      - final_mask = argmax(avg_probs, axis=2)
    Overlapping tiles (stride=112 = 50%) smooth boundary artefacts.
    """
    W, H = pil_img.size
    prob_map  = np.zeros((H, W, 2), dtype=np.float32)
    count_map = np.zeros((H, W),    dtype=np.float32)

    rows = math.ceil(H / stride)
    cols = math.ceil(W / stride)

    model.eval()
    for y_idx in range(rows):
        for x_idx in range(cols):
            x_start = x_idx * stride
            y_start = y_idx * stride
            valid_w = min(patch_size, W - x_start)
            valid_h = min(patch_size, H - y_start)

            # Crop + pad edge tiles to 224×224
            tile = pil_img.crop((x_start, y_start, x_start + patch_size, y_start + patch_size))
            if tile.size != (patch_size, patch_size):
                pad = Image.new("RGB", (patch_size, patch_size), (0, 0, 0))
                pad.paste(tile, (0, 0))
                tile = pad

            img_tensor = pil_to_tensor(tile)
            with torch.no_grad():
                output = model(img_tensor)
                probs  = torch.softmax(output, dim=1).squeeze(0).cpu().numpy()  # (2, 224, 224)

            # Only accumulate the VALID (non-padded) region
            valid_probs = probs[:, :valid_h, :valid_w].transpose(1, 2, 0)  # (vh, vw, 2)
            prob_map[y_start:y_start+valid_h, x_start:x_start+valid_w, :] += valid_probs
            count_map[y_start:y_start+valid_h, x_start:x_start+valid_w]   += 1.0

    # Average across overlapping predictions, then argmax
    avg_probs  = prob_map / np.maximum(count_map[..., None], 1.0)
    final_mask = np.argmax(avg_probs, axis=2).astype(np.uint8)
    return final_mask

# ── Mask → RGBA overlay (nuclei pixels colored, background transparent) ──
def mask_to_binary_b64(mask):
    """
    Binary mask → pure grayscale PNG: white (255) = nucleus, black (0) = background.
    Exactly matches Colab: imshow(prediction, cmap='gray') and final_mask * 255.
    No color overlays, no transparency — standalone binary image.
    """
    grayscale = (mask.astype(np.uint8) * 255)
    buf = io.BytesIO()
    Image.fromarray(grayscale, "L").save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()

def mask_to_rgba_b64(mask, rgb=(0, 201, 177)):
    return mask_to_binary_b64(mask)

# ── GT mask → grayscale PNG (white nuclei, black background) ─────────
def gt_to_b64(gt_mask):
    """Pure binary: white (255) = nucleus, black (0) = background."""
    vis = (gt_mask.astype(np.uint8) * 255)
    buf = io.BytesIO()
    Image.fromarray(vis, "L").save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()

# ── Image array → JPEG base64 ─────────────────────────────────────────
def img_array_to_b64(img_chw):
    """(3,H,W) float or uint8 → JPEG base64."""
    arr = np.transpose(img_chw, (1, 2, 0))
    if arr.dtype != np.uint8:
        arr = (arr * 255).clip(0, 255).astype(np.uint8) if arr.max() <= 1.0 else arr.astype(np.uint8)
    buf = io.BytesIO()
    Image.fromarray(arr, "RGB").save(buf, format="JPEG", quality=88)
    return base64.b64encode(buf.getvalue()).decode()

#  Metric computation vs ground truth 
def compute_metrics(pred, gt):
    """Compute Dice, IoU, HD95 and nuclei count vs ground truth."""
    pred_b = pred.astype(bool)
    gt_b   = gt.astype(bool)

    intersection = np.logical_and(pred_b, gt_b).sum()
    union        = np.logical_or(pred_b, gt_b).sum()

    dice = float((2 * intersection + 1e-5) / (pred_b.sum() + gt_b.sum() + 1e-5))
    iou  = float((intersection + 1e-5)     / (union + 1e-5))

    # HD95 — requires medpy
    hd95_val = 999.0
    if pred_b.sum() > 0 and gt_b.sum() > 0:
        try:
            from medpy.metric.binary import hd95 as medpy_hd95
            hd95_val = float(medpy_hd95(pred_b.astype(np.uint8), gt_b.astype(np.uint8)))
        except Exception:
            pass  # medpy unavailable or edge case

    # Nuclei count via connected components
    n_labels, _, _, _ = cv2.connectedComponentsWithStats(pred.astype(np.uint8), connectivity=8)
    cell_count = max(0, n_labels - 1)

    return {
        "dice":       round(dice,  4),
        "iou":        round(iou,   4),
        "hd95":       round(hd95_val, 2),
        "cell_count": cell_count,
    }

# Mock mask (demo/fallback mode) 
def mock_mask(seed=42, tighter=False):
    mask = np.zeros((224, 224), dtype=np.uint8)
    rng  = np.random.default_rng(seed)
    for _ in range(40):
        cx, cy = rng.integers(15, 209, size=2)
        rx, ry = rng.integers(4, 10, size=2)
        if tighter: rx, ry = int(rx*0.8), int(ry*0.8)
        Y, X = np.ogrid[:224, :224]
        mask[(((X-cx)/max(rx,1))**2 + ((Y-cy)/max(ry,1))**2) <= 1] = 1
    return mask

# FastAPI app 
app = FastAPI(title="RETINA-Path API v2", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],  
)

@app.get("/health")
def health():
    return {
        "status":        "ok",
        "device":        str(DEVICE),
        "models_loaded": MODELS_LOADED,
        "gpu":           torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
        "patches":       len(ALL_PATCHES),
        "organs":        {k: len(v) for k, v in ORGAN_INDEX.items()},
    }

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Accepts any H&E image.
    - If 224×224 or smaller: direct single inference.
    - If larger: smooth overlapping sliding window (Cell 11, stride=112px).
    Returns colored RGBA mask overlays + metrics (hardcoded paper values,
    since we don't have GT for arbitrary uploaded images).
    """
    img_bytes = await file.read()
    pil_img   = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    W, H      = pil_img.size

    if MODELS_LOADED:
        if W <= 224 and H <= 224:
            tensor, _ = preprocess_bytes(img_bytes)
            baseline_mask = run_inference(baseline_model, tensor)
            retina_mask   = run_inference(retina_model,   tensor)
        else:
            baseline_mask = run_smooth_sliding_window(baseline_model, pil_img)
            retina_mask   = run_smooth_sliding_window(retina_model,   pil_img)
    else:
        baseline_mask = mock_mask(42, tighter=False)
        retina_mask   = mock_mask(99, tighter=True)

    b_count = compute_metrics(baseline_mask, np.zeros_like(baseline_mask))["cell_count"]
    r_count = compute_metrics(retina_mask,   np.zeros_like(retina_mask))["cell_count"]

    return JSONResponse({
        "baseline": {
            "mask_b64":   mask_to_binary_b64(baseline_mask),
            "cell_count": b_count,
            # Paper metrics at 100% data (no GT available for uploaded image)
            "dice": 0.8734, "iou": 0.7783, "hd95": 7.15,
        },
        "retina": {
            "mask_b64":   mask_to_binary_b64(retina_mask),
            "cell_count": r_count,
            "dice": 0.9222, "iou": 0.8562, "hd95": 2.63,
        },
    })

@app.get("/gallery/organs")
def gallery_organs():
    """List available organs and patch counts."""
    return {k: len(v) for k, v in ORGAN_INDEX.items() if v}

@app.get("/gallery/{organ_id}")
async def gallery_patch(organ_id: str):
    """
    Returns a random MoNuSeg patch for the given organ.
    Loads image + ground truth label from .npz, runs both models,
    computes real Dice/IoU/HD95 vs ground truth.
    """
    # Find patches for organ; fall back to all patches
    candidates = ORGAN_INDEX.get(organ_id.lower(), [])
    if not candidates:
        candidates = ALL_PATCHES
    if not candidates:
        raise HTTPException(status_code=404, detail=f"No patches found for organ '{organ_id}'")

    npz_path = random.choice(candidates)
    try:
        data = np.load(npz_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load NPZ: {str(e)}")
    
    keys = list(data.keys())
    if len(keys) < 2:
        raise HTTPException(status_code=500, detail=f"NPZ missing required keys (found: {keys})")

    # Robust key detection
    img_key = "image" if "image" in keys else keys[0]
    lbl_key = "label" if "label" in keys else keys[1]

    try:
        img = data[img_key]   # expected: (3,H,W) or (H,W,3)
        lbl = data[lbl_key]   # expected: (H,W) binary 0/1
    except KeyError as e:
        raise HTTPException(status_code=500, detail=f"Key not found in NPZ: {str(e)}")

    # Normalise to CHW float
    if img.ndim == 3 and img.shape[0] != 3 and img.shape[-1] == 3:
        img = np.transpose(img, (2, 0, 1))
    img = img.astype(np.float32)
    
    # Normalize to [0,1] range if needed (matches /predict preprocessing)
    if img.max() > 1.0:
        img = img / 255.0
    
    # Validate image shape is (3, H, W)
    if img.shape[0] != 3:
        raise ValueError(f"Expected 3 channels, got {img.shape[0]}")

    # Build tensor for inference
    tensor = torch.from_numpy(img).unsqueeze(0).to(DEVICE)

    # Run models
    if MODELS_LOADED:
        baseline_pred = run_inference(baseline_model, tensor)
        retina_pred   = run_inference(retina_model,   tensor)
    else:
        baseline_pred = mock_mask(42, tighter=False)
        retina_pred   = mock_mask(99, tighter=True)

    gt_binary = (lbl > 0).astype(np.uint8)
    b_metrics = compute_metrics(baseline_pred, gt_binary)
    r_metrics = compute_metrics(retina_pred,   gt_binary)

    return JSONResponse({
        "filename": os.path.basename(npz_path),
        "organ":    organ_id,
        # Original H&E image (JPEG)
        "image_b64":   img_array_to_b64(img),
        # Ground truth mask (grayscale PNG: white=nucleus)
        "gt_mask_b64": gt_to_b64(gt_binary),
        # Baseline
        "baseline": {
            "mask_b64": mask_to_binary_b64(baseline_pred),
            **b_metrics,
        },
        # RETINA-Path
        "retina": {
            "mask_b64": mask_to_binary_b64(retina_pred),
            **r_metrics,
        },
    })

# Start server + ngrok 
def run_server():
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning")

ngrok.kill()
NGROK_TOKEN = os.getenv("NGROK_TOKEN")
ngrok.set_auth_token(NGROK_TOKEN)
public_url = ngrok.connect(8000)

server_thread = threading.Thread(target=run_server, daemon=True)
server_thread.start()
time.sleep(2)

print("\n" + "="*62)
print("   RETINA-Path API v2 is live!")
print(f"  Public URL  :  {public_url}")
print(f"  Health      :  {public_url}/health")
print(f"  Organs      :  {public_url}/gallery/organs")
print(f"\n  Set in your frontend .env:")
print(f"  VITE_API_URL={public_url}")
print("="*62)
print("\n  Keep this cell running. URL changes on restart — update .env.\n")