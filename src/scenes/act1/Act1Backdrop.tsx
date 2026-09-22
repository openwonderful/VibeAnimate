/**
 * Act1Backdrop — landscape-only version of Scene 1 for use as a backdrop
 * in other scenes (e.g. Act 3.1). Pulls the same Mountains, Moon, Stars,
 * Cranes, Blossoms, Clouds, Waves, Irworobongdo screen as Act 1 — but
 * strips the decorative frame (title, hangeul text, lattice, ribbons,
 * minhwa border) so the scene can carry its own foreground content.
 */

import StarField from './components/StarField'
import MoonOrb from './components/MoonOrb'
import CloudLayer from './components/CloudLayer'
import MountainLayer from './components/MountainLayer'
import CraneLayer from './components/CraneLayer'
import BlossomLayer from './components/BlossomLayer'
import WaveLayer from './components/WaveLayer'
import SkyLayer from './components/SkyLayer'
import IrworobongdoScreen from './components/IrworobongdoScreen'
import ParallaxWrapper from '../zoom/ParallaxWrapper'

interface Act1BackdropProps {
  zoomScale?: number
  showBlossoms?: boolean
  mountainBlur?: number
  atmosphere?: 'night' | 'sunset'
}

const SUN_X = '68%'
const SUN_Y = '44%'

const BACKGROUNDS = {
  night: 'radial-gradient(ellipse at 72% 15%, #0F1F3E 0%, #080E1F 50%, #050A14 100%)',
  sunset: [
    // Atmospheric glow around the horizon sun — wide soft warmth
    `radial-gradient(ellipse 900px 500px at ${SUN_X} ${SUN_Y}, rgba(255, 225, 180, 0.55) 0%, rgba(255, 200, 170, 0.25) 35%, rgba(255, 180, 160, 0) 72%)`,
    // Pastel Your Name palette — lilac zenith → peach pink → cream-gold at horizon → warm dusky ground
    'linear-gradient(to bottom, #C7B5D2 0%, #D8B8CC 15%, #EAC0BE 30%, #F5CFB8 45%, #FCDDB4 58%, #FFD9A8 68%, #E89C78 82%, #8E4D3A 100%)',
  ].join(', '),
}

function SunBurst() {
  return (
    <>
      {/* Vertical godray pillar — soft column of light rising from the sun */}
      <div style={{
        position: 'absolute',
        left: SUN_X,
        top: 0,
        transform: 'translateX(-50%)',
        width: 180,
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
        background: `linear-gradient(to top,
          rgba(255, 245, 220, 0.45) ${100 - parseFloat(SUN_Y)}%,
          rgba(255, 245, 220, 0.25) ${100 - parseFloat(SUN_Y) + 15}%,
          rgba(255, 245, 220, 0.08) ${100 - parseFloat(SUN_Y) + 35}%,
          transparent 100%)`,
        filter: 'blur(22px)',
      }} />
      {/* Bright sun core — tight white-gold center that bleeds outward */}
      <div style={{
        position: 'absolute',
        left: SUN_X,
        top: SUN_Y,
        transform: 'translate(-50%, -50%)',
        width: 420,
        height: 420,
        pointerEvents: 'none',
        zIndex: 2,
        background: 'radial-gradient(circle, rgba(255,253,245,1) 0%, rgba(255,245,215,0.98) 7%, rgba(255,228,185,0.8) 18%, rgba(255,200,165,0.4) 38%, rgba(255,175,140,0) 70%)',
        borderRadius: '50%',
      }} />
    </>
  )
}

export default function Act1Backdrop({
  zoomScale = 1,
  showBlossoms = true,
  mountainBlur = 0,
  atmosphere = 'night',
}: Act1BackdropProps) {
  const isSunset = atmosphere === 'sunset'
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: BACKGROUNDS[atmosphere],
      }}
    >
      {!isSunset && (
        <ParallaxWrapper depth={0.3} baseScale={zoomScale}>
          <StarField />
        </ParallaxWrapper>
      )}
      {!isSunset && (
        <ParallaxWrapper depth={0.35} baseScale={zoomScale}>
          <IrworobongdoScreen />
        </ParallaxWrapper>
      )}
      {!isSunset && (
        <ParallaxWrapper depth={0.4} baseScale={zoomScale}>
          <MoonOrb />
        </ParallaxWrapper>
      )}
      {isSunset && <SunBurst />}
      <ParallaxWrapper depth={0.5} baseScale={zoomScale}>
        <CloudLayer />
      </ParallaxWrapper>
      {mountainBlur > 0 ? (
        <div style={{ position: 'absolute', inset: 0, filter: `blur(${mountainBlur}px)` }}>
          <MountainLayer zoomScale={zoomScale > 1.01 ? zoomScale : undefined} />
        </div>
      ) : (
        <MountainLayer zoomScale={zoomScale > 1.01 ? zoomScale : undefined} />
      )}
      <ParallaxWrapper depth={0.65} baseScale={zoomScale}>
        <CraneLayer />
      </ParallaxWrapper>
      {showBlossoms && (
        <ParallaxWrapper depth={1.0} baseScale={zoomScale}>
          <BlossomLayer />
        </ParallaxWrapper>
      )}
      <ParallaxWrapper depth={1.2} baseScale={zoomScale}>
        <WaveLayer />
      </ParallaxWrapper>
      <ParallaxWrapper depth={0.3} baseScale={zoomScale}>
        <SkyLayer />
      </ParallaxWrapper>
    </div>
  )
}
