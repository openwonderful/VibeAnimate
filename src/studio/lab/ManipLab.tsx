/* eslint-disable react-refresh/only-export-components -- scene file: local actors + createScene default export */
/**
 * Manipulation Lab (?act=lab.manip) — the Blender-mode playground.
 *
 * Five <Editable> objects on a grid: click one in the studio viewport to
 * get the transform gizmo and the N-panel, press G/R/S to switch mode,
 * X/Y/Z to constrain, or drive it from the console:
 *
 *     @keeper move y 0.5
 *     @lanternA rot y 45
 *     @stage scale 1.2
 *
 * Everything animates (the keeper bobs, lanterns pulse) so the frame
 * governor, the selection box and the gizmo can all be checked against a
 * moving scene rather than a static one.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import { createScene } from '../../scenes/createScene'
import { Editable } from '../editable/Editable'
import { Lantern } from '../ingredients/Lantern'
import { PersimmonTree } from '../ingredients/PersimmonTree'

const SRC = 'src/studio/lab/ManipLab.tsx'

/** Simple humanoid stand-in — bobs so the selection box has to track it. */
function Keeper() {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (ref.current) ref.current.position.y = Math.sin(getAnimTime() * 1.4) * 0.06
  })
  return (
    <group ref={ref}>
      <mesh position={[0, 1.32, 0]} castShadow>
        <sphereGeometry args={[0.17, 20, 16]} />
        <meshStandardMaterial color="#C9A227" roughness={0.5} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <capsuleGeometry args={[0.19, 0.72, 6, 14]} />
        <meshStandardMaterial color="#B08D2E" roughness={0.6} metalness={0.2} />
      </mesh>
    </group>
  )
}

/** Neutral mid-grey workbench — a DCC viewport, not a lit set, so gizmos
 *  and the selection outline read against it at any camera angle. */
function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#63666b" roughness={1} />
      </mesh>
      <gridHelper args={[24, 24, '#8b8f95', '#75797f']} position={[0, 0.002, 0]} />
    </>
  )
}

export default createScene({
  background: '#4a4d52',
  three: {
    camera: { position: [3.0, 1.9, 4.6], fov: 42 },
    shadows: true,
    debugTarget: [0, 0.9, 0],
  },
}, function ManipLab() {
  return (
    <>
      <ambientLight intensity={0.62} />
      <hemisphereLight args={['#dfe6f2', '#4a4137', 0.7]} />
      <directionalLight position={[4, 6, 3]} intensity={1.25} castShadow
        shadow-mapSize={[1024, 1024]} />
      <Ground />

      <Editable id="keeper" name="Lantern Keeper" kind="character" sourcePath={SRC} position={[0, 0, 0]}>
        <Keeper />
      </Editable>

      <Editable id="lanternA" name="Lantern A" kind="prop" sourcePath={SRC} position={[-1.5, 0, 0.6]}>
        <Lantern scale={0.9} />
      </Editable>

      <Editable id="lanternB" name="Lantern B" kind="prop" sourcePath={SRC} position={[1.5, 0, -0.4]}>
        <Lantern scale={0.9} />
      </Editable>

      <Editable id="tree" name="Persimmon Tree" kind="environment" sourcePath={SRC} position={[-3.4, 0, -3.4]}>
        <PersimmonTree scale={0.55} />
      </Editable>

      <Editable id="stage" name="Stone Plinth" kind="prop" sourcePath={SRC} position={[0, 0, -1.9]}>
        <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.85, 0.95, 0.36, 24]} />
          <meshStandardMaterial color="#8a9099" roughness={0.9} />
        </mesh>
      </Editable>

      <Editable id="crate" name="Crate" kind="prop" sourcePath={SRC} position={[2.3, 0, 1.1]} rotation={[0, -0.4, 0]}>
        <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.64, 0.64, 0.64]} />
          <meshStandardMaterial color="#9a7b4f" roughness={0.85} />
        </mesh>
      </Editable>

      {/* kind="light" — drag the rig and the key light moves with it. */}
      <Editable id="keyLight" name="Key Light" kind="light" sourcePath={SRC} position={[-2.2, 2.1, 1.8]}>
        <mesh>
          <sphereGeometry args={[0.13, 16, 12]} />
          <meshBasicMaterial color="#fff2cf" />
        </mesh>
        <pointLight color="#ffe6b0" intensity={7} distance={11} decay={2} />
      </Editable>

      {/* Backdrop — gives the workbench a horizon to judge depth against. */}
      <mesh position={[0, 3, -7]} receiveShadow>
        <planeGeometry args={[24, 12]} />
        <meshStandardMaterial color="#575b61" roughness={1} />
      </mesh>
    </>
  )
})
