/**
 * Act 7's hero: the golden kid of Act 3, grown. The one stick figure on a road
 * full of pegs — and, from this pass on, DARK. He does not glow on the road; he
 * glows when he gets home and touches the person waiting for him, which happens
 * two seconds into 8.55. The glow is driven from the same `heroGlow` 8.55 uses,
 * evaluated on 8.55's clock, so it is identically zero for all of Act 7 by
 * construction rather than by a separate switch that could disagree.
 *
 * He walks the whole act — the walk cycle is driven by DISTANCE TRAVELLED, not
 * by the clock, so his feet stay planted instead of skating — and in the last
 * two seconds he stops on GOLDEN_POS, squares up to the house and lifts his
 * chin into the pose 8.55 opens on.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import { GOLD, GOLD_BRIGHT } from '../act8_55/constants'
import { makeGlowMaterial, updateGlowScale } from '../act8_55/glow'
import { GoldFigure } from '../characters/goldFigure'
import { heroSkeleton } from '../act8_55/hero'
import { heroGlow } from '../act8_55/homecoming'
import { GroundShadow, lightGain, S, toWorld, villageLight } from '../act8_55/locale'
import { ACT_DUR, heroMotion, heroPhase, heroSettle, heroX, heroZ } from './journey'

export function Hero({ actOffset }: { actOffset: number }) {
  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const light = useRef<THREE.PointLight>(null)
  const alphaRef = useRef<THREE.BufferAttribute>(null)
  const glowMat = useMemo(() => makeGlowMaterial({ depthTest: false }), [])

  // The 8.55 hero material, to the value — this is the same person walking in.
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#C79A5E', emissive: GOLD_BRIGHT, emissiveIntensity: 0,
    roughness: 0.4, toneMapped: false,
  }), [])

  const halo = useMemo(() => {
    const c = new THREE.Color(GOLD)
    const c2 = new THREE.Color('#E8A030')
    return {
      positions: new Float32Array([0, 1.2, 0, 0, 1.25, 0]),
      colors: new Float32Array([c.r, c.g, c.b, c2.r, c2.g, c2.b]),
      sizes: new Float32Array([1.5, 3.2]),
      alphas: new Float32Array([0.5, 0.16]),
      phases: new Float32Array([0.9, 2.6]),
    }
  }, [])

  // Walk phase comes from the journey, not the clock, and the body itself is
  // 8.55's — so as he stops, he becomes its opening frame rather than
  // approximating it.
  const skeleton = useMemo(() => () => {
    const a = getAnimTime() + actOffset
    return heroSkeleton(heroMotion(a), heroPhase(a))
  }, [actOffset])

  useFrame(({ camera, size, gl }) => {
    const a = getAnimTime() + actOffset
    const motion = heroMotion(a)
    const settle = heroSettle(a)

    if (group.current) {
      group.current.position.set(heroX(a), 0, heroZ(a))
      // He faces down the road (−z), which is the figure's own +z flipped.
      group.current.rotation.y = Math.PI
    }
    if (body.current) {
      // Leaning into the walk, straightening as he arrives, then the 8.55
      // chin-lift takes over.
      body.current.rotation.x = 0.055 * motion - 0.09 * settle
    }

    updateGlowScale(glowMat, camera, size.height * gl.getPixelRatio(), a)
    // 8.55's clock. `heroGlow` is 0 for every frame of Act 7 — the halo, the
    // point light and the emissive are all wired through it anyway so that the
    // handoff can't drift: there is one definition of when he lights.
    const lit = heroGlow(a - ACT_DUR)
    bodyMat.emissiveIntensity = lit * 1.9
    // The outer halo softens whenever the camera is close, exactly as in 8.55.
    // The camera lives in Act B's world units and he lives in village ones, so
    // the comparison has to happen on one side of the locale transform: his mark
    // goes out to the world rather than the camera coming in, because the halo's
    // thresholds are authored in village units.
    const hw = toWorld(heroX(a), 0, heroZ(a))
    const dCam = Math.hypot(camera.position.x - hw[0], camera.position.z - hw[2]) / S
    const far = Math.min(1, Math.max(0, (dCam - 3.5) / 6))
    if (alphaRef.current) {
      const arr = alphaRef.current.array as Float32Array
      arr[0] = 0.55 * lit
      arr[1] = 0.15 * (far * far * (3 - 2 * far)) * lit
      alphaRef.current.needsUpdate = true
    }
    if (light.current) light.current.intensity = 2.4 * lit * lightGain(1.8)
  })

  return (
    <group ref={group}>
      <GroundShadow />
      <group ref={body}>
        {/* inPlace: the journey owns his z, not GoldFigure's own loop. */}
        <GoldFigure skeleton={skeleton} material={bodyMat} inPlace />
      </group>
      <points material={glowMat} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[halo.positions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[halo.colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[halo.sizes, 1]} />
          <bufferAttribute ref={alphaRef} attach="attributes-aAlpha" args={[halo.alphas, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[halo.phases, 1]} />
        </bufferGeometry>
      </points>
      <pointLight ref={light} color={GOLD} position={[0, 1.25, 0.4]}
        {...villageLight(0, 7, 1.8)} />
    </group>
  )
}
