import * as THREE from 'three'

export type Curve = {
  points: THREE.Vector3[]
  /**
   * Constant radius, or a taper: a function of u, 0 at the first point and 1
   * at the last. A taper is what lets a limb leave the body fat and reach the
   * wrist thin — and so what lets it blend into the trunk rather than being
   * socketed into it with a bead at the joint.
   */
  radius: number | ((u: number) => number)
  segments?: number
  /** Loop the tube back to its first point — rings, bands, hoops. Closed
   *  curves get no end caps, since they have no ends. */
  closed?: boolean
  /** Tube cross-section sides. Defaults to 12; fine trim can drop it. */
  radialSegments?: number
}
export type Sphere = { center: THREE.Vector3; radius: number }

/**
 * TubeGeometry carries one radius from end to end, so this is the
 * varying-radius version of it: the same Frenet-framed rings, with the ring
 * radius sampled per station. Normals are left to computeVertexNormals below.
 */
function taperedTube(
  curve: THREE.CatmullRomCurve3,
  segments: number,
  radial: number,
  closed: boolean,
  radiusAt: (u: number) => number,
): THREE.BufferGeometry {
  const frames = curve.computeFrenetFrames(segments, closed)
  const pos = new Float32Array((segments + 1) * (radial + 1) * 3)
  const idx: number[] = []
  let k = 0
  for (let i = 0; i <= segments; i++) {
    const u = i / segments
    const P = curve.getPointAt(u)
    const r = radiusAt(u)
    const N = frames.normals[Math.min(i, frames.normals.length - 1)]
    const B = frames.binormals[Math.min(i, frames.binormals.length - 1)]
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2
      const sin = Math.sin(a), cos = -Math.cos(a)
      pos[k++] = P.x + r * (cos * N.x + sin * B.x)
      pos[k++] = P.y + r * (cos * N.y + sin * B.y)
      pos[k++] = P.z + r * (cos * N.z + sin * B.z)
    }
  }
  for (let i = 1; i <= segments; i++) {
    for (let j = 1; j <= radial; j++) {
      const a = (radial + 1) * (i - 1) + (j - 1)
      const b = (radial + 1) * i + (j - 1)
      const c = (radial + 1) * i + j
      const d = (radial + 1) * (i - 1) + j
      idx.push(a, b, d, b, c, d)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/**
 * Merge a set of Catmull-Rom tube limbs and sphere caps into a single
 * BufferGeometry. Tube ends get sphere caps of matching radius so limb
 * junctions read as continuous joined forms rather than disjoint segments.
 */
export function buildBody(curves: Curve[], spheres: Sphere[] = []): THREE.BufferGeometry {
  const geos: THREE.BufferGeometry[] = []
  for (const { points, radius, segments = 14, closed = false, radialSegments = 12 } of curves) {
    const curve = new THREE.CatmullRomCurve3(points, closed, 'catmullrom', 0.5)
    const taper = typeof radius === 'function'
    geos.push(taper
      ? taperedTube(curve, segments, radialSegments, closed, radius)
      : new THREE.TubeGeometry(curve, segments, radius, radialSegments, closed))
    if (closed) continue
    const ends: [THREE.Vector3, number][] = [
      [points[0], taper ? radius(0) : radius],
      [points[points.length - 1], taper ? radius(1) : radius],
    ]
    for (const [pt, r] of ends) {
      const s = new THREE.SphereGeometry(r, 16, 16)
      s.translate(pt.x, pt.y, pt.z)
      geos.push(s)
    }
  }
  for (const { center, radius } of spheres) {
    const s = new THREE.SphereGeometry(radius, 24, 24)
    s.translate(center.x, center.y, center.z)
    geos.push(s)
  }
  let tv = 0, ti = 0
  for (const g of geos) { tv += g.attributes.position.count; ti += g.index ? g.index.count : 0 }
  const p = new Float32Array(tv * 3), n = new Float32Array(tv * 3), ix = new Uint32Array(ti)
  let vo = 0, io = 0
  for (const g of geos) {
    const gp = g.attributes.position, gn = g.attributes.normal
    for (let i = 0; i < gp.count * 3; i++) {
      p[vo * 3 + i] = (gp.array as Float32Array)[i]
      if (gn) n[vo * 3 + i] = (gn.array as Float32Array)[i]
    }
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) ix[io + i] = g.index.array[i] + vo
      io += g.index.count
    }
    vo += gp.count
  }
  for (const g of geos) g.dispose()
  const m = new THREE.BufferGeometry()
  m.setAttribute('position', new THREE.BufferAttribute(p, 3))
  m.setAttribute('normal', new THREE.BufferAttribute(n, 3))
  m.setIndex(new THREE.BufferAttribute(ix, 1))
  m.computeVertexNormals()
  return m
}

export const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
