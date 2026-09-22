"""
pipeline.py — the diffusion side of the live AI render (features_1.md §7).

One function loads a model, one function turns (render, depth, prompt) into a
stylised frame. server.py and bench.py both use it, so the number bench.py
prints is the number the live path pays.

Models (pick with `load(model=…)`):
  sd-turbo    stabilityai/sd-turbo (SD 2.1 distilled, 512px, 1–4 steps)
              + thibaud/controlnet-sd21-depth-diffusers for the depth control
  sdxl-turbo  stabilityai/sdxl-turbo + diffusers/controlnet-depth-sdxl-1.0-small
              (better picture, ~3× the cost; needs the fp16-fix VAE)

The live contract: img2img from the raw render at `strength`, the depth map as
the ControlNet condition, guidance 0, a FIXED seed so the noise is the same
every frame (the single biggest flicker reduction), and an optional blend of
the previous OUTPUT into the next init image.
"""
from __future__ import annotations

import time
from dataclasses import dataclass

import numpy as np
import torch
from PIL import Image

MODELS = {
    "sd-turbo": {
        "base": "stabilityai/sd-turbo",
        "controlnet": "thibaud/controlnet-sd21-depth-diffusers",
        "xl": False,
    },
    "sdxl-turbo": {
        "base": "stabilityai/sdxl-turbo",
        "controlnet": "diffusers/controlnet-depth-sdxl-1.0-small",
        "xl": True,
    },
}


@dataclass
class Loaded:
    name: str
    pipe: object
    controlnet: bool
    device: str
    dtype: torch.dtype


def load(model: str = "sd-turbo", controlnet: bool = True, compile_unet: bool = False, fast_vae: bool = True) -> Loaded:
    from diffusers import (
        AutoPipelineForImage2Image,
        ControlNetModel,
        StableDiffusionControlNetImg2ImgPipeline,
        StableDiffusionXLControlNetImg2ImgPipeline,
    )

    spec = MODELS[model]
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if device == "cuda" else torch.float32
    torch.backends.cuda.matmul.allow_tf32 = True
    torch.backends.cudnn.allow_tf32 = True

    t0 = time.time()
    kw = {"torch_dtype": dtype, "safety_checker": None, "requires_safety_checker": False}
    if spec["xl"]:
        from diffusers import AutoencoderKL
        kw.pop("safety_checker"); kw.pop("requires_safety_checker")
        kw["vae"] = AutoencoderKL.from_pretrained("madebyollin/sdxl-vae-fp16-fix", torch_dtype=dtype)

    if controlnet:
        cn = ControlNetModel.from_pretrained(spec["controlnet"], torch_dtype=dtype)
        cls = StableDiffusionXLControlNetImg2ImgPipeline if spec["xl"] else StableDiffusionControlNetImg2ImgPipeline
        pipe = cls.from_pretrained(spec["base"], controlnet=cn, **kw)
    else:
        pipe = AutoPipelineForImage2Image.from_pretrained(spec["base"], **kw)

    # The tiny autoencoder (TAESD / TAESDXL): encode + decode drop from ~40ms
    # to ~3ms at 512×288 for a preview-grade loss in fine detail. The live
    # path is a preview; the offline pass (features_1.md §7c) keeps the real VAE.
    if fast_vae:
        from diffusers import AutoencoderTiny
        tiny = "madebyollin/taesdxl" if spec["xl"] else "madebyollin/taesd"
        pipe.vae = AutoencoderTiny.from_pretrained(tiny, torch_dtype=dtype)
    pipe.to(device)
    pipe.set_progress_bar_config(disable=True)
    if device == "cuda":
        try:
            pipe.unet.to(memory_format=torch.channels_last)
        except Exception:
            pass
    if compile_unet and device == "cuda":
        pipe.unet = torch.compile(pipe.unet, mode="reduce-overhead", fullgraph=False)
    print(f"[pipeline] {model} controlnet={controlnet} fast_vae={fast_vae} on {device} in {time.time() - t0:.1f}s", flush=True)
    return Loaded(model, pipe, controlnet, device, dtype)


# Prompt embeddings, cached: the text encoder ran on every frame before this,
# for a prompt that changes when the user types and not otherwise.
_embed_cache: dict[tuple[str, str, str], dict] = {}


def _prompt_kwargs(L: Loaded, prompt: str, negative: str) -> dict:
    key = (L.name, prompt, negative)
    hit = _embed_cache.get(key)
    if hit is not None:
        return hit
    pipe = L.pipe
    if hasattr(pipe, "text_encoder_2"):  # SDXL: two encoders, pooled embeds too
        pe, npe, ppe, nppe = pipe.encode_prompt(
            prompt=prompt, negative_prompt=negative or None, device=L.device,
            num_images_per_prompt=1, do_classifier_free_guidance=False,
        )
        out = {"prompt_embeds": pe, "pooled_prompt_embeds": ppe}
    else:
        pe, _npe = pipe.encode_prompt(
            prompt, L.device, 1, False, negative_prompt=negative or None,
        )
        out = {"prompt_embeds": pe}
    if len(_embed_cache) > 64:
        _embed_cache.clear()
    _embed_cache[key] = out
    return out


def _fit8(w: int, h: int) -> tuple[int, int]:
    return max(64, (w // 8) * 8), max(64, (h // 8) * 8)


@torch.inference_mode()
def generate(
    L: Loaded,
    image: Image.Image,
    depth: Image.Image | None,
    prompt: str,
    negative: str = "",
    strength: float = 0.5,
    steps: int = 2,
    seed: int = 7,
    control_scale: float = 0.8,
    prev: Image.Image | None = None,
    blend_prev: float = 0.0,
) -> Image.Image:
    """One frame. `image` is the raw render, `depth` a grayscale map with NEAR
    = WHITE (the MiDaS convention the depth ControlNets were trained on)."""
    w, h = _fit8(*image.size)
    if image.size != (w, h):
        image = image.resize((w, h), Image.BILINEAR)
    init = image.convert("RGB")
    if prev is not None and blend_prev > 0:
        if prev.size != (w, h):
            prev = prev.resize((w, h), Image.BILINEAR)
        init = Image.blend(init, prev.convert("RGB"), float(blend_prev))

    # Turbo models need at least one real denoising step: steps*strength >= 1.
    steps = max(steps, int(np.ceil(1.0 / max(strength, 1e-3))))
    gen = torch.Generator(device=L.device).manual_seed(int(seed))

    kw = dict(
        **_prompt_kwargs(L, prompt, negative),
        image=init,
        strength=float(strength),
        num_inference_steps=int(steps),
        guidance_scale=0.0,
        generator=gen,
        width=w,
        height=h,
    )
    if L.controlnet:
        if depth is None:
            depth = Image.new("L", (w, h), 128)
        if depth.size != (w, h):
            depth = depth.resize((w, h), Image.BILINEAR)
        kw["control_image"] = depth.convert("RGB")
        kw["controlnet_conditioning_scale"] = float(control_scale)
    out = L.pipe(**kw).images[0]
    return out
