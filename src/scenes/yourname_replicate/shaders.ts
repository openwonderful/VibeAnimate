/**
 * GLSL shaders for the Your Name comet-scene replication.
 *
 * Every element of the reference image is reconstructed procedurally — no
 * painted reference plate is used. Color stops are sampled directly from
 * the Shinkai painting so the palette matches the source.
 */

/* ─── Shared noise helpers (GLSL) ───────────────────────────────────── */
const NOISE_GLSL = /* glsl */ `
  float hash11(float p) { return fract(sin(p * 127.1) * 43758.5453); }
  float hash21(vec2 p)  { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 6; i++) {
      v += a * vnoise(p);
      p = r * p * 2.05;
      a *= 0.5;
    }
    return v;
  }
`

/* ─── Sky — deep violet → mulberry → rose → peach → warm horizon ───── */
export const SKY_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const SKY_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  ${NOISE_GLSL}

  void main() {
    float y = vUv.y;
    float x = vUv.x - 0.5;

    // Five-stop vertical gradient — WARM Shinkai palette, coral/rose dominant
    vec3 zenith    = vec3(0.42, 0.28, 0.48);   // dusk-purple (softer, not deep violet)
    vec3 upperMid  = vec3(0.74, 0.45, 0.58);   // warm mauve-rose
    vec3 midRose   = vec3(0.95, 0.60, 0.60);   // salmon rose
    vec3 warmBand  = vec3(1.00, 0.78, 0.60);   // peach
    vec3 horizon   = vec3(1.00, 0.92, 0.78);   // warm cream near sun

    vec3 col;
    if (y > 0.82) {
      col = mix(upperMid, zenith, smoothstep(0.82, 1.0, y));
    } else if (y > 0.60) {
      col = mix(midRose, upperMid, smoothstep(0.60, 0.82, y));
    } else if (y > 0.42) {
      col = mix(warmBand, midRose, smoothstep(0.42, 0.60, y));
    } else {
      col = mix(horizon, warmBand, smoothstep(0.22, 0.42, y));
    }

    // Strong warmth bias near sun — soft orange halo sitting around the
    // horizon like a haze, not a point-source glare
    float centerBias = 1.0 - smoothstep(0.0, 0.50, abs(x));
    float horizonFalloff = 1.0 - smoothstep(0.18, 0.58, y);
    col += vec3(0.50, 0.30, 0.10) * centerBias * horizonFalloff * 0.9;

    // Rose tint wash across the whole lower sky — unifies colors
    float lowerWash = 1.0 - smoothstep(0.30, 0.65, y);
    col = mix(col, col * vec3(1.05, 0.97, 0.92), lowerWash * 0.4);

    // Faint star grain in upper sky only — sparse so post-FX doesn't
    // rainbow-halo every pixel
    float starMask = smoothstep(0.62, 0.90, y) * (1.0 - smoothstep(0.2, 0.45, abs(x)));
    starMask = max(starMask, smoothstep(0.70, 0.95, y));
    float starNoise = hash21(floor(vUv * vec2(500.0, 280.0)));
    float star = smoothstep(0.9975, 1.0, starNoise) * starMask;
    col += vec3(0.95, 0.92, 1.0) * star * 0.7;

    // Subtle atmospheric color drift (breathing)
    col += 0.02 * sin(uTime * 0.3 + y * 4.0) * vec3(0.1, 0.05, 0.15);

    gl_FragColor = vec4(col, 1.0);
  }
`

/* ─── Clouds — painterly FBM, warm underside / cool tops ───────────── */
export const CLOUD_VERTEX = SKY_VERTEX

export const CLOUD_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uDensity;     // threshold: lower = more cloud cover
  uniform float uStretch;     // horizontal anisotropy
  uniform vec3  uWarmColor;   // orange-lit undersides
  uniform vec3  uCoolColor;   // cool lavender tops
  uniform float uDrift;       // horizontal time drift
  uniform float uSeed;
  ${NOISE_GLSL}

  void main() {
    vec2 uv = vUv;
    vec2 p = vec2(
      uv.x * uStretch + uTime * uDrift + uSeed,
      uv.y * 4.0 + uSeed * 0.7
    );

    float d = fbm(p);
    // Secondary fine-scale detail layer for painterly edges
    float d2 = fbm(p * 3.2 + vec2(2.3, 4.7));
    d = mix(d, d * d2, 0.35);

    // Softer threshold — wider smoothstep window, more painterly edges
    float alpha = smoothstep(uDensity - 0.14, uDensity + 0.22, d);
    if (alpha < 0.01) discard;

    // Internal shading gradient — warmer at bottom where sun backlights
    float internalY = smoothstep(0.0, 1.0, uv.y);
    vec3 col = mix(uWarmColor, uCoolColor, internalY);

    // Bright rim at the underside where direct horizon light catches edges
    float rim = smoothstep(uDensity - 0.02, uDensity + 0.04, d)
              - smoothstep(uDensity + 0.04, uDensity + 0.14, d);
    col += vec3(0.55, 0.35, 0.10) * rim * (1.0 - internalY);

    // Slight hotspot near center (where sun is brightest)
    float centerGlow = 1.0 - smoothstep(0.0, 0.35, abs(uv.x - 0.5));
    col += vec3(0.35, 0.18, 0.05) * centerGlow * (1.0 - internalY) * 0.6;

    gl_FragColor = vec4(col, alpha);
  }
`

/* ─── Horizon burst — radial + anamorphic cross flare ───────────────── */
export const FLARE_VERTEX = SKY_VERTEX

export const FLARE_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  ${NOISE_GLSL}

  void main() {
    vec2 uv = vUv - 0.5;

    // Radial hotspot — tighter, not so overpowering
    float r = length(uv);
    float radial = exp(-r * 9.0) * 0.8;
    float radialInner = exp(-r * 26.0) * 1.2;

    // Horizontal anamorphic flare (wide but softer so the horizon doesn't blow out)
    float horiz = exp(-abs(uv.y) * 80.0) * exp(-abs(uv.x) * 2.2) * 0.7;
    // Vertical companion
    float vert  = exp(-abs(uv.x) * 90.0) * exp(-abs(uv.y) * 4.5) * 0.5;

    float intensity = radial + radialInner + horiz + vert;

    // Breathing modulation — very subtle so the sun looks alive
    float pulse = 0.92 + 0.08 * sin(uTime * 1.6);
    intensity *= pulse;

    // Color: inner white-gold → outer warm orange
    vec3 hot    = vec3(1.00, 0.97, 0.88);
    vec3 glow   = vec3(1.00, 0.78, 0.52);
    vec3 col    = mix(glow, hot, smoothstep(0.3, 1.2, radialInner));

    gl_FragColor = vec4(col * intensity, clamp(intensity, 0.0, 1.0));
  }
`

/* ─── Vertical light pillar — razor-thin core with layered halos ───── */
export const PILLAR_VERTEX = SKY_VERTEX

export const PILLAR_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  ${NOISE_GLSL}

  void main() {
    vec2 uv = vUv;
    float x = uv.x - 0.5;

    // Softer "column of light" — no razor core. Three wide gaussian layers
    // plus a very wide atmospheric wash so the beam reads as diffuse golden
    // light, not a laser. Bloom does the heavy lifting for the bright core.
    float core      = exp(-abs(x) *  55.0) * 1.0;
    float halo      = exp(-abs(x) *  14.0) * 0.45;
    float wideHalo  = exp(-abs(x) *   3.5) * 0.18;
    float atmos     = exp(-abs(x) *   0.8) * 0.05;

    float intensity = core + halo + wideHalo + atmos;

    // Vertical profile — warm light flowing down from sky to horizon.
    // Dimmer in upper sky (where blue comet lives), brightest at horizon,
    // fades into water below.
    float upperFade = 1.0 - smoothstep(0.36, 1.0, uv.y) * 0.55;
    float lowerFade = 1.0 - smoothstep(0.36, 0.0, uv.y) * 0.55;
    intensity *= upperFade * lowerFade;

    // Very subtle flicker — nothing crisp or strobing
    float flickerNoise = hash21(vec2(floor(uv.y * 80.0), floor(uTime * 6.0)));
    intensity *= (0.96 + 0.04 * flickerNoise);

    // Slow breathing pulse
    intensity *= 0.90 + 0.10 * sin(uTime * 0.9);

    // Warm palette: center warm cream → gold halo → rose outer fringe.
    // Small cyan tint at the top where the beam meets the comet trail.
    vec3 hot       = vec3(1.00, 0.96, 0.85);    // center warm cream
    vec3 glowGold  = vec3(1.00, 0.78, 0.52);    // golden halo
    vec3 glowRose  = vec3(1.00, 0.62, 0.60);    // rose outer fringe
    vec3 col = mix(glowRose, glowGold, smoothstep(0.0, 0.30, intensity));
    col = mix(col, hot, smoothstep(0.55, 1.3, intensity));

    // Blend in a touch of cyan high up where comet trail merges in
    float topBlue = smoothstep(0.70, 0.98, uv.y);
    col = mix(col, col * vec3(0.70, 0.85, 1.05), topBlue * 0.35);

    gl_FragColor = vec4(col * intensity, clamp(intensity, 0.0, 1.0));
  }
`

/* ─── Diagonal comet streak — cyan/blue trail entering from top ────── */
export const COMET_VERTEX = SKY_VERTEX

export const COMET_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  ${NOISE_GLSL}

  void main() {
    vec2 uv = vUv;
    // UV frame: streak oriented horizontally along x, trail fades with x→1.
    // Caller rotates the plane so it reads diagonally in world space.
    float d = abs(uv.y - 0.5);

    // Multi-layer line profile — softer, wider glow
    float core = exp(-d * 90.0) * 1.2;
    float halo = exp(-d * 20.0) * 0.55;
    float glow = exp(-d *  5.0) * 0.22;

    float intensity = core + halo + glow;

    // Fade in from head, taper out at tail
    float headFade = smoothstep(0.0, 0.10, uv.x);
    float tailFade = smoothstep(1.0, 0.60, uv.x);
    intensity *= headFade * tailFade;

    // Sparkle modulation along length
    float sparkle = vnoise(vec2(uv.x * 40.0, uTime * 2.0));
    intensity *= 0.8 + 0.4 * sparkle;

    // Color: inner pale cyan → sky blue → deep cobalt
    vec3 hot  = vec3(0.92, 0.99, 1.00);
    vec3 mid  = vec3(0.50, 0.80, 1.00);
    vec3 deep = vec3(0.30, 0.45, 0.95);
    vec3 col  = mix(deep, mid, smoothstep(0.0, 0.35, intensity));
    col = mix(col, hot, smoothstep(0.55, 1.3, intensity));

    gl_FragColor = vec4(col * intensity, clamp(intensity, 0.0, 1.0));
  }
`

/* ─── Water reflection of sky + beam below horizon ─────────────────── */
export const WATER_VERTEX = SKY_VERTEX

export const WATER_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  ${NOISE_GLSL}

  void main() {
    vec2 uv = vUv;
    // Mirror the sky gradient inverted, slightly muted
    float y = 1.0 - uv.y;   // remap so 0 (top of water) reads as horizon

    vec3 horizonCol  = vec3(1.00, 0.88, 0.72);
    vec3 peach       = vec3(0.95, 0.68, 0.55);
    vec3 rose        = vec3(0.72, 0.44, 0.54);
    vec3 mulberry    = vec3(0.38, 0.22, 0.40);

    vec3 col;
    if (y > 0.55) col = mix(rose, mulberry, smoothstep(0.55, 1.0, y));
    else if (y > 0.25) col = mix(peach, rose, smoothstep(0.25, 0.55, y));
    else col = mix(horizonCol, peach, smoothstep(0.0, 0.25, y));

    // Horizontal bands — subtle wave shimmer
    float shimmer = vnoise(vec2(uv.x * 30.0, uv.y * 120.0 + uTime * 0.4));
    col += 0.04 * (shimmer - 0.5);

    // Darken slightly — water is never as bright as sky
    col *= 0.85;

    // Reflected beam — narrow vertical strip
    float beamX = uv.x - 0.5;
    float beamR = exp(-abs(beamX) * 140.0) * 0.9
                + exp(-abs(beamX) *  15.0) * 0.35
                + exp(-abs(beamX) *   3.0) * 0.10;
    // Water ripple breaks the reflection — horizontal stripes, less metronomic
    float rippleMask = 0.5 + 0.5 * sin(uv.y * 140.0 + uTime * 1.5 + vnoise(uv * 12.0) * 6.0);
    rippleMask = smoothstep(0.2, 0.75, rippleMask);
    float reflFade = smoothstep(1.0, 0.1, uv.y);
    col += vec3(1.0, 0.88, 0.68) * beamR * rippleMask * reflFade * 0.7;

    // Horizon glow that blends into the sky above — keeps no hard seam
    float horizonBand = smoothstep(1.0, 0.88, uv.y);
    col = mix(col, vec3(1.0, 0.92, 0.76), horizonBand * 0.55);

    // Alpha fade at the very top so sky gradient reads through seamlessly
    float alpha = smoothstep(1.0, 0.88, uv.y);
    // Keep bottom fully opaque; fade only the top 12% of the plane
    alpha = mix(1.0, alpha, smoothstep(0.88, 1.0, uv.y));

    gl_FragColor = vec4(col, alpha);
  }
`
