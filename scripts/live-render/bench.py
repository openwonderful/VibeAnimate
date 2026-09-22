#!/usr/bin/env python3
"""
bench.py — the number that decides the live-render model (features_1.md §7d.1).

Runs N frames of a real still through each candidate and prints ms/frame,
with and without the depth ControlNet. Uses the newest shot-ref PNG under
out/shotrefs/ as the input (a genuine frame of the film), or --image.

    .venv-live/bin/python scripts/live-render/bench.py [--n 30] [--size 512x288]
                                                       [--models sd-turbo,sdxl-turbo]
"""
from __future__ import annotations

import argparse
import glob
import os
import sys
import time

import numpy as np
import torch
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pipeline  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def newest_shotref() -> str | None:
    pngs = sorted(glob.glob(os.path.join(ROOT, "out/shotrefs/*.png")), key=os.path.getmtime)
    return pngs[-1] if pngs else None


def fake_depth(w: int, h: int) -> Image.Image:
    # Ground-plane-ish gradient: bottom near (white), top far (black).
    y = np.linspace(255, 0, h, dtype=np.float32)[:, None]
    return Image.fromarray(np.repeat(y, w, axis=1).astype(np.uint8), mode="L")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=30)
    ap.add_argument("--size", default="512x288")
    ap.add_argument("--models", default="sd-turbo")
    ap.add_argument("--image", default=None)
    ap.add_argument("--prompt", default="hand-painted korean ink wash landscape, warm lantern light, cinematic")
    ap.add_argument("--out", default=os.path.join(ROOT, "out/live/bench"))
    ap.add_argument("--full-vae", action="store_true")
    a = ap.parse_args()

    w, h = (int(x) for x in a.size.split("x"))
    src = a.image or newest_shotref()
    if src:
        image = Image.open(src).convert("RGB").resize((w, h), Image.BILINEAR)
        print(f"input: {src}")
    else:
        image = Image.fromarray(np.random.randint(0, 255, (h, w, 3), dtype=np.uint8))
        print("input: noise (no shot ref found)")
    depth = fake_depth(w, h)
    os.makedirs(a.out, exist_ok=True)
    print(f"gpu: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'cpu'}  size: {w}x{h}  n: {a.n}")

    rows = []
    for model in a.models.split(","):
        for cn in (False, True):
            L = pipeline.load(model, controlnet=cn, fast_vae=not a.full_vae)
            # warm-up (cudnn autotune, first-allocation)
            for _ in range(3):
                pipeline.generate(L, image, depth, a.prompt, strength=0.5, steps=2)
            torch.cuda.synchronize()
            t0 = time.perf_counter()
            for i in range(a.n):
                out = pipeline.generate(L, image, depth, a.prompt, strength=0.5, steps=2, seed=7)
            torch.cuda.synchronize()
            ms = (time.perf_counter() - t0) * 1000 / a.n
            mem = torch.cuda.max_memory_allocated() / 2**30 if torch.cuda.is_available() else 0
            out.save(os.path.join(a.out, f"{model}{'-depth' if cn else ''}.jpg"), quality=90)
            rows.append((model, cn, ms, mem))
            print(f"  {model:<11} controlnet={str(cn):<5} {ms:7.1f} ms/frame  {1000 / ms:5.1f} fps  peak {mem:.1f} GB", flush=True)
            del L
            torch.cuda.empty_cache()
            torch.cuda.reset_peak_memory_stats()

    print("\n| model | depth control | ms/frame | fps | peak VRAM |")
    print("|---|---|---|---|---|")
    for model, cn, ms, mem in rows:
        print(f"| {model} | {'yes' if cn else 'no'} | {ms:.0f} | {1000 / ms:.1f} | {mem:.1f} GB |")
    print(f"\nsamples in {a.out}/")


if __name__ == "__main__":
    main()
