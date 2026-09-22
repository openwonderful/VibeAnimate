import { Config } from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
Config.setOverwriteOutput(true)
// ANGLE-over-Vulkan is the only backend that gets a hardware WebGL context in
// headless Chrome on this box, and it is ~5x faster than angle-egl / ~27x
// faster than software. `remotion studio` and bare `remotion render` pick this
// up; the render scripts pass --gl explicitly (and fall back to swangle where
// there is no GPU).
Config.setChromiumOpenGlRenderer('vulkan')
