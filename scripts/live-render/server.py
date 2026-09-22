#!/usr/bin/env python3
"""
server.py — the live AI render server (features_1.md §7b).

The studio viewport streams (render JPEG, depth bytes, prompt) frames over a
WebSocket; this turns each one into a stylised JPEG and sends it back tagged
with the frame id. One frame in flight at a time — the browser does not send
the next until the reply lands, so nothing ever queues behind a slow frame.

    .venv-live/bin/python scripts/live-render/server.py [--port 8765] [--model sd-turbo|sdxl-turbo]
                                                        [--no-controlnet] [--compile] [--host 0.0.0.0]

Wire format (binary, both directions):
    u32 little-endian header length | header JSON (utf-8) | payload bytes

  request header  {id, w, h, jpeg: <bytes of the render>, depth: <bytes of u8 depth, w*h, or 0>,
                   prompt, negative, strength, steps, seed, control, blend}
                  payload = jpeg bytes ++ depth bytes   (depth: w*h u8, near = 255)
  reply header    {id, ms, model}          payload = jpeg bytes
  text frames     {"type":"hello"} -> {"type":"status", ready, model, controlnet, device}

Depth NEAR = WHITE is the convention the depth ControlNets were trained on; the
browser normalises to the shot's own depth range before sending.
"""
from __future__ import annotations

import argparse
import asyncio
import io
import json
import os
import struct
import sys
import time
from urllib.parse import urlparse

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pipeline  # noqa: E402


def pack(header: dict, payload: bytes = b"") -> bytes:
    h = json.dumps(header).encode("utf-8")
    return struct.pack("<I", len(h)) + h + payload


def unpack(data: bytes) -> tuple[dict, bytes]:
    (n,) = struct.unpack_from("<I", data, 0)
    header = json.loads(data[4:4 + n].decode("utf-8"))
    return header, data[4 + n:]


class Live:
    def __init__(self, model: str, controlnet: bool, compile_unet: bool, fast_vae: bool = True):
        self.loaded = pipeline.load(model, controlnet, compile_unet, fast_vae)
        self.prev: Image.Image | None = None
        self.prev_key: str = ""
        self.frames = 0
        self.ema_ms = 0.0

    def run(self, header: dict, payload: bytes) -> tuple[dict, bytes]:
        t0 = time.perf_counter()
        w, h = int(header["w"]), int(header["h"])
        jl = int(header["jpeg"])
        dl = int(header.get("depth", 0))
        image = Image.open(io.BytesIO(payload[:jl])).convert("RGB")
        depth = None
        if dl == w * h:
            arr = np.frombuffer(payload[jl:jl + dl], dtype=np.uint8).reshape(h, w)
            depth = Image.fromarray(arr, mode="L")
        # The previous-output blend is only meaningful within one shot; a scene
        # change (the browser sends the key) drops it so a cut is a cut.
        key = str(header.get("scene", ""))
        if key != self.prev_key:
            self.prev, self.prev_key = None, key
        out = pipeline.generate(
            self.loaded, image, depth,
            prompt=str(header.get("prompt", "")),
            negative=str(header.get("negative", "")),
            strength=float(header.get("strength", 0.5)),
            steps=int(header.get("steps", 2)),
            seed=int(header.get("seed", 7)),
            control_scale=float(header.get("control", 0.8)),
            prev=self.prev,
            blend_prev=float(header.get("blend", 0.0)),
        )
        self.prev = out
        buf = io.BytesIO()
        out.save(buf, format="JPEG", quality=88)
        ms = (time.perf_counter() - t0) * 1000
        self.frames += 1
        self.ema_ms = ms if self.ema_ms == 0 else self.ema_ms * 0.8 + ms * 0.2
        if self.frames % 30 == 0:
            print(f"[live] {self.frames} frames, {self.ema_ms:.0f} ms/frame ({1000 / self.ema_ms:.1f} fps)", flush=True)
        return {"id": header.get("id"), "ms": round(ms, 1), "model": self.loaded.name}, buf.getvalue()


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--model", default="sd-turbo", choices=list(pipeline.MODELS))
    ap.add_argument("--no-controlnet", action="store_true")
    ap.add_argument("--compile", action="store_true", help="torch.compile the unet (slow first frames, faster after)")
    ap.add_argument("--full-vae", action="store_true", help="use the real VAE instead of the tiny one (slower, sharper)")
    a = ap.parse_args()

    import websockets
    from websockets.asyncio.server import serve

    live = Live(a.model, not a.no_controlnet, a.compile, not a.full_vae)
    lock = asyncio.Lock()
    loop = asyncio.get_running_loop()

    async def handler(ws):
        # Same-host browsers only: a page on another host must not be able
        # to drive the GPU. The pty in vite.config.ts applies the same rule.
        origin = ws.request.headers.get("Origin", "")
        host = ws.request.headers.get("Host", "")
        if origin:
            oh = urlparse(origin).hostname
            hh = host.split(":")[0]
            if oh != hh and oh not in ("localhost", "127.0.0.1"):
                await ws.close(code=4403, reason="cross-origin")
                return
        status = {"type": "status", "ready": True, "model": live.loaded.name,
                  "controlnet": live.loaded.controlnet, "device": live.loaded.device}
        try:
            await ws.send(json.dumps(status))
            await frames(ws, status)
        except websockets.exceptions.ConnectionClosed:
            pass  # the tab went away (reload, toggle off, closed) — routine, not an error

    async def frames(ws, status):
        async for msg in ws:
            if isinstance(msg, str):
                try:
                    j = json.loads(msg)
                except Exception:
                    continue
                if j.get("type") == "hello":
                    await ws.send(json.dumps(status))
                continue
            try:
                header, payload = unpack(msg)
            except Exception as e:  # noqa: BLE001
                await ws.send(json.dumps({"type": "error", "error": f"bad frame: {e}"}))
                continue
            async with lock:
                try:
                    reply, jpeg = await loop.run_in_executor(None, live.run, header, payload)
                except Exception as e:  # noqa: BLE001
                    await ws.send(json.dumps({"type": "error", "id": header.get("id"), "error": str(e)}))
                    continue
            await ws.send(pack(reply, jpeg))

    print(f"[live] ws://{a.host}:{a.port}  model={a.model} controlnet={not a.no_controlnet} websockets={websockets.__version__}", flush=True)
    print("[live] ready", flush=True)
    async with serve(handler, a.host, a.port, max_size=64 * 1024 * 1024, compression=None):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
