#!/usr/bin/env bash
# One-shot environment for the live AI render server (features_1.md §7).
# Own venv so it never touches the project's node toolchain or the demucs venv.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
venv="$here/../../.venv-live"
python3 -m venv "$venv"
"$venv/bin/pip" install --upgrade pip wheel >/dev/null
"$venv/bin/pip" install torch torchvision --index-url https://download.pytorch.org/whl/cu128
"$venv/bin/pip" install diffusers transformers accelerate safetensors pillow websockets numpy
"$venv/bin/python" -c "import torch; print('torch', torch.__version__, 'cuda', torch.cuda.is_available(), torch.cuda.get_device_name(0))"
