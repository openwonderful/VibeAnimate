/**
 * story.6 — "First light" (0:50–1:00, dawn, shrine → valley wide).
 * The child raises the lantern as dawn breaks; the camera pulls back to
 * reveal the whole valley waking below. Title card fades in.
 *
 * Uses the SceneCanvas shell directly (not createScene) so the title
 * card can live in DOM above the canvas.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SceneCanvas } from '../../../scenes/SceneCanvas'
import { useSceneMode } from '../../../scenes/sceneMode'
import { CameraMove } from '../../../scenes/DebugCamera'
import { useAnimTime, getAnimTime, easeInOut } from '../../../hooks/useAnimTime'
import { GoldFigure } from '../../../scenes/characters/goldFigure'
import { Lantern } from '../../ingredients/Lantern'
import { Fireflies } from '../../ingredients/Fireflies'
import { WorldMount } from '../../worlds/World'
import { LANTERN_VALLEY } from '../../worlds/LanternValley'
import { StoryPost } from '../StoryPost'

const CROWN: [number, number, number] = [15, 4.45, -15]

export function NewKeeper() {
  const lantern = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!lantern.current) return
    const t = getAnimTime()
    // The child lifts the lantern high over the first three seconds.
    const p = easeInOut(Math.min(1, t / 3))
    lantern.current.position.set(CROWN[0] + 0.55, CROWN[1] + 0.85 + p * 0.75, CROWN[2] + 2.65)
  })
  return (
    <>
      {/* The child, lantern raised, at the crown's open edge */}
      <group position={[CROWN[0] + 0.3, CROWN[1], CROWN[2] + 2.5]} rotation={[0, Math.PI * 0.1, 0]}>
        <GoldFigure kind="child" pose="standing" rightHandAt={[0.25, 1.32, 0.15]} />
      </group>
      {/* The keeper a step behind, watching */}
      <group position={[CROWN[0] - 1.4, CROWN[1], CROWN[2] + 1.5]} rotation={[0, Math.PI * 0.2, 0]}>
        <GoldFigure kind="adult" pose="standing" />
      </group>
      <group ref={lantern}>
        <Lantern scale={0.55} cordLength={0.1} light intensity={3.2} swayPhase={0.9} />
      </group>
    </>
  )
}

/** Camera + world + actors only — grade (StoryPost/AnimeLook) is added by the caller. */
export function S6Film() {
  return (
    <>
      <CameraMove
        a={{ pos: [16.2, 5.6, -12.2], target: [15.1, 5.3, -14.8] }}
        b={{ pos: [30, 12, 2], target: [6, 2.5, -8] }}
        t0={2.5} t1={9.7} ease="inout"
      />
      <WorldMount
        world={LANTERN_VALLEY}
        shot={{ lighting: 'dawn', actors: <NewKeeper /> }}
      />
      {/* Last fireflies of the night, drifting off the shrine hill */}
      <Fireflies position={[14, 4.6, -13]} bounds={[6, 2, 5]} count={22} seed={13} size={0.07} />
    </>
  )
}

export default function S6_FirstLight() {
  const mode = useSceneMode()
  const time = useAnimTime()
  const size = mode.kind === 'render'
    ? { width: mode.width, height: mode.height }
    : { width: '100vw', height: '100vh' }

  // Title fades in at t=6, holds to the end.
  const titleOpacity = Math.min(1, Math.max(0, (time - 6) / 2))

  return (
    <div style={{ ...size, position: 'relative', overflow: 'hidden', background: '#3A2438' }}>
      <SceneCanvas
        camera={{ position: [16.2, 5.6, -12.2], fov: 42, near: 0.1, far: 220 }}
        gl={{ antialias: true }}
        debugTarget={[15, 5, -15]}
      >
        <S6Film />
        <StoryPost bloom={1.0} />
      </SceneCanvas>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        opacity: titleOpacity,
      }}>
        <div style={{
          color: '#F2E3C8', fontFamily: "'Noto Serif KR', serif", fontSize: 'min(6.4vw, 78px)',
          fontWeight: 600, letterSpacing: '0.12em', textShadow: '0 2px 40px #000000AA',
        }}>
          등불지기
        </div>
        <div style={{
          color: '#D9C8A8', fontFamily: "'Playfair Display', serif", fontSize: 'min(2vw, 24px)',
          letterSpacing: '0.42em', textTransform: 'uppercase', marginTop: 14, opacity: 0.85,
        }}>
          The Lantern Keeper
        </div>
      </div>
    </div>
  )
}
