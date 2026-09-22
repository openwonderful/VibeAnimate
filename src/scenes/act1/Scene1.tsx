import StarField from './components/StarField'
import MoonOrb from './components/MoonOrb'
import CloudLayer from './components/CloudLayer'
import MountainLayer from './components/MountainLayer'
import CraneLayer from './components/CraneLayer'
import BlossomLayer from './components/BlossomLayer'
import WaveLayer from './components/WaveLayer'
import SkyLayer from './components/SkyLayer'
import IrworobongdoScreen from './components/IrworobongdoScreen'
import Ribbons from './components/Ribbons'
import LatticePattern from './components/LatticePattern'
import TitleTreatment from './components/TitleTreatment'
import HangeulAccents from './components/HangeulAccents'
import MinhwaBorder from './components/MinhwaBorder'
import ParallaxWrapper from '../zoom/ParallaxWrapper'
import { createScene } from '../createScene'

interface Scene1Props {
  zoomScale?: number
}

export function Scene1({ zoomScale = 1 }: Scene1Props) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 72% 15%, #0F1F3E 0%, #080E1F 50%, #050A14 100%)',
      }}
    >
      <ParallaxWrapper depth={0.3} baseScale={zoomScale}>
        <StarField />
      </ParallaxWrapper>
      <ParallaxWrapper depth={0.35} baseScale={zoomScale}>
        <IrworobongdoScreen />
      </ParallaxWrapper>
      <ParallaxWrapper depth={0.4} baseScale={zoomScale}>
        <MoonOrb />
      </ParallaxWrapper>
      <ParallaxWrapper depth={0.5} baseScale={zoomScale}>
        <CloudLayer />
      </ParallaxWrapper>
      <MountainLayer zoomScale={zoomScale > 1.01 ? zoomScale : undefined} />
      <ParallaxWrapper depth={0.65} baseScale={zoomScale}>
        <CraneLayer />
      </ParallaxWrapper>
      <ParallaxWrapper depth={1.0} baseScale={zoomScale}>
        <BlossomLayer />
      </ParallaxWrapper>
      <ParallaxWrapper depth={1.2} baseScale={zoomScale}>
        <WaveLayer />
      </ParallaxWrapper>
      <ParallaxWrapper depth={1.5} baseScale={zoomScale}>
        <Ribbons />
      </ParallaxWrapper>
      <ParallaxWrapper depth={1.5} baseScale={zoomScale}>
        <LatticePattern />
      </ParallaxWrapper>
      <ParallaxWrapper depth={1.5} baseScale={zoomScale}>
        <TitleTreatment />
      </ParallaxWrapper>
      <ParallaxWrapper depth={1.5} baseScale={zoomScale}>
        <HangeulAccents />
      </ParallaxWrapper>
      <ParallaxWrapper depth={1.5} baseScale={zoomScale}>
        <MinhwaBorder />
      </ParallaxWrapper>
      <ParallaxWrapper depth={0.3} baseScale={zoomScale}>
        <SkyLayer />
      </ParallaxWrapper>
    </div>
  )
}

// DOM/SVG scene — no `three` config; the SceneShell makes it render-mode
// aware (Remotion) while leaving live behaviour untouched.
export default createScene({}, Scene1)
