/**
 * Act B scene factory.
 *
 * Every Act B key is the same world with a different start time. The initial
 * camera pose is read from the flight itself, so a window opens on exactly
 * the frame the previous window closed on — that is what makes B.1→B.4 play
 * as one continuous take, and it is checked by the fact that neither file
 * contains a camera number.
 */
import * as THREE from 'three'
import { createScene } from '../createScene'
import World from './World'
import { flightPose, storyTime, type PoseFn } from './flight'

/**
 * `offset` is FILM time — seconds into the song where this window opens.
 * `pose` is which cut of the act to fly: the original take by default, or an
 * alternate keyframe list (`flightApproachB.ts`) for a variant scene.
 * `signX` is where that cut hangs the four "I need" signs across the canyon.
 * The film's is derived from the film's own camera and is the default
 * (`SIGN_X` in city.tsx); the alternate cut leaves all four on the axis. A
 * cut owns BOTH, and a window into a cut has to pass both or its words sit
 * somewhere its camera is not.
 */
export function makeFlightScene(
  offset: number, name: string, pose: PoseFn = flightPose, signX?: number[],
) {
  const p = pose(storyTime(offset))
  const Scene = createScene({
    background: '#03060E',
    three: {
      camera: {
        position: [p.pos[0], p.pos[1], p.pos[2]],
        fov: p.fov,
        // The pull-out ends 10,000 units past the mountains, so the far
        // plane has to clear the whole valley plus the range beyond it —
        // at 6,800 the hills were simply clipped away and the wide shot
        // was fields and sky with nothing on the horizon at all.
        near: 4,
        far: 24000,
      },
      gl: {
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.04,
      },
      onCreated: ({ camera }) => camera.lookAt(p.tgt[0], p.tgt[1], p.tgt[2]),
      debugTarget: [p.tgt[0], p.tgt[1], p.tgt[2]],
    },
  }, function FlightBody() {
    return <World offset={offset} pose={pose} signX={signX} />
  })
  Scene.displayName = name
  return Scene
}
