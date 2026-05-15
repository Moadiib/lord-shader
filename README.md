# shader-webgl

A Vue 3 + WebGL shader background system. Authors shaders as self-contained GLSL fragment shader entries in a central registry (`src/lib/shaders.js`). Each shader drives a live canvas rendered by `ShaderBackground.vue`, and is configured through a data-driven control panel (`ShaderPicker.vue`) without any per-shader UI code.

---

## Table of Contents

1. [Stack & Setup](#stack--setup)
2. [Architecture Overview](#architecture-overview)
3. [Shader Registry — How It Works](#shader-registry--how-it-works)
4. [Uniform Types Reference](#uniform-types-reference)
5. [Automatic Uniforms](#automatic-uniforms)
6. [Mouse-Interactive Shaders](#mouse-interactive-shaders)
7. [Shared GLSL Snippets](#shared-glsl-snippets)
8. [Existing Shaders — How Each One Works](#existing-shaders--how-each-one-works)
   - [Mesh Gradient](#mesh-gradient-meshgradient)
   - [Aurora](#aurora-aurora)
   - [Plasma](#plasma-plasma)
   - [Metaball](#metaball-metaball)
   - [Ripple](#ripple-ripple)
   - [FBM Noise](#fbm-noise-fbmnoise)
   - [Silk](#silk-silk)
   - [Fluid](#fluid-fluid)
9. [How to Add a New Shader](#how-to-add-a-new-shader)
10. [Config JSON Format](#config-json-format)
11. [Using the Components](#using-the-components)
12. [Project File Map](#project-file-map)

---

## Stack & Setup

| Tool | Version |
|------|---------|
| Vue | 3.x |
| Vite | 8.x |
| WebGL | 1.0 (via `canvas.getContext('webgl')`) |
| Node | ≥ 20.19 |

```bash
npm install
npm run dev      # dev server
npm run build    # production build
npm run preview  # preview production build
```

---

## Architecture Overview

```
src/
├── lib/
│   ├── shaders.js        ← ALL shader definitions live here
│   └── shaderUtils.js    ← WebGL helpers (compile, link, upload uniforms, setup quad)
├── composables/
│   └── useShader.js      ← Vue composable that manages a single shader config
└── components/shader/
    ├── ShaderBackground.vue  ← Drop-in WebGL canvas (fill parent, render loop)
    ├── ShaderPicker.vue      ← Admin control panel, driven entirely by registry data
    └── ShaderPreview.vue     ← Tiny thumbnail canvas used in the effect selector strip
```

**Data flow:**
1. `shaders.js` exports `EFFECTS` — a keyed object where each entry is a complete shader definition.
2. `useShader(initialConfig?)` composable wraps a reactive `config = { effect, uniforms }`.
3. `ShaderBackground` receives `config` as a prop, compiles the shader on mount (and recompiles when `effect` changes), and runs a `requestAnimationFrame` loop that uploads uniforms each frame.
4. `ShaderPicker` receives the `useShader()` return value and builds the entire control UI from the `groups` array in the registry — no per-shader UI code needed.

---

## Shader Registry — How It Works

Every shader is a single object inside `EFFECTS` in `src/lib/shaders.js`:

```js
export const EFFECTS = {
  myShader: {
    label: 'My Shader',          // Display name shown in the picker
    mouseInteractive: false,     // Optional — set true to receive u_mouse / u_mouseVel
    groups: [ ... ],             // Control groups → drives the UI
    presets: [ ... ],            // Named uniform snapshots
    frag: /* glsl */`...`,       // Fragment shader GLSL source
  },
}
```

### Groups

`groups` is an array of collapsible sections in the picker. Each section has:

```js
{
  name: 'Motion',   // Section header label
  items: [ ... ],   // Array of uniform control definitions
}
```

### Items (Controls)

Each item in `items` maps one-to-one to a GLSL uniform. The `type` field determines both the UI widget and the GLSL type.

---

## Uniform Types Reference

| `type` | UI Widget | GLSL type | Notes |
|--------|-----------|-----------|-------|
| `float` | Range slider | `float` | Requires `min`, `max`, `step`, `default` |
| `int` | Integer range slider | `float` | GLSL receives a float; use `int(u_x)` inside the shader |
| `color` | Single color picker | `vec3` | `default` is `[r, g, b]` in 0–1 range |
| `colors` | Multi-color picker group | `vec3` per key | Requires `keys[]`, `sublabels[]`, `defaults[][]` |
| `select` | Dropdown | `float` | `options[]` with `{label, value}`. Use `< 0.5`, `< 1.5` etc. in GLSL for branching |

**Full item shapes:**

```js
// float / int
{ key: 'u_speed', type: 'float', label: 'Speed', min: 0, max: 2, step: 0.01, default: 0.5 }

// color
{ key: 'u_skyColor', type: 'color', label: 'Sky', default: [0.01, 0.01, 0.04] }

// colors (multi-color group)
{
  key: '_mycolors',           // key with _ prefix — this key is NOT a uniform itself
  type: 'colors',
  label: 'Palette',
  keys:      ['u_color1', 'u_color2', 'u_color3'],
  sublabels: ['Primary', 'Secondary', 'Accent'],
  defaults:  [[1, 0, 0.5], [0, 0.5, 1], [0.5, 1, 0]],
}

// select (dropdown)
{
  key: 'u_mode', type: 'select', label: 'Pattern',
  options: [
    { label: 'Smooth',   value: 0 },
    { label: 'Detailed', value: 1 },
  ],
  default: 0,
}
```

> **`colors` key convention:** The `key` field for a `colors` type is only used internally by the picker for deduplication. It must be unique but is never sent to the GPU. The actual uniforms are in `keys[]`.

---

## Automatic Uniforms

Two uniforms are **always uploaded** by `uploadUniforms()` regardless of the `groups` definition — declare them in your GLSL but do **not** put them in `groups`:

| Uniform | GLSL type | Value |
|---------|-----------|-------|
| `u_time` | `float` | Elapsed seconds since the shader was mounted |
| `u_resolution` | `vec2` | Canvas pixel dimensions `(width, height)` |

---

## Mouse-Interactive Shaders

Set `mouseInteractive: true` on the effect object to opt in. When enabled, `ShaderBackground` tracks mouse position and injects two extra uniforms automatically. Declare them in your GLSL:

| Uniform | GLSL type | Value |
|---------|-----------|-------|
| `u_mouse` | `vec2` | Smoothed cursor position, normalised `0–1` (origin = bottom-left, Y flipped) |
| `u_mouseVel` | `vec2` | Normalised velocity this frame, clamped to length 1 |

Smoothing speed is controlled by `u_mouseSmooth` if it exists in `uniforms` (0 = instant, 1 = very slow). You can expose it as a `float` control or just leave it at the default of `0.5`.

```js
myShader: {
  label: 'My Interactive Shader',
  mouseInteractive: true,
  groups: [
    {
      name: 'Interaction',
      items: [
        { key: 'u_mouseSmooth', type: 'float', label: 'Smoothing', min: 0, max: 0.99, step: 0.01, default: 0.5 },
      ],
    },
  ],
  frag: /* glsl */`
    precision mediump float;
    uniform float u_time;
    uniform vec2  u_resolution, u_mouse, u_mouseVel;
    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;
      float d = length(uv - u_mouse);
      gl_FragColor = vec4(vec3(1.0 - d), 1.0);
    }
  `,
}
```

---

## Shared GLSL Snippets

`src/lib/shaders.js` exports reusable GLSL strings. Currently they are inlined by copy-paste into each shader's `frag` string (the vertex shader is shared via `GLSL_VERT`).

### `GLSL_NOISE`
Provides `hash`, `noise`, and `fbm` functions for value noise:

```glsl
// Hash — pseudo-random scalar from a vec2 seed
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// Value noise — smooth bilinear interpolation of hash values
float noise(vec2 p) { ... }

// Fractal Brownian Motion — octave-stacked noise
// d = lacunarity/persistence (0.5 = halving amplitude each octave)
// oct = number of octaves (capped at 8)
float fbm(vec2 p, float d, int oct) { ... }
```

### `GLSL_VERT`
The standard vertex shader used by all effects. Takes `attribute vec2 a_pos` (the full-screen quad corners, `-1` to `1`) and sets `gl_Position`.

---

## Existing Shaders — How Each One Works

### Mesh Gradient (`meshGradient`)

**Technique:** Inverse-distance-weighted (IDW) blending of N coloured control points orbiting the canvas centre.

**Key uniforms:** `u_points` (2–6), `u_blend` (IDW power), `u_spread`, `u_radius`, `u_noise` (warp), `u_color1`–`u_color6`.

**Algorithm:**
1. Aspect-correct UV. Optionally warp `uv` with FBM noise (`u_noise` > 0).
2. Define up to 6 control points on Lissajous-style orbits:  
   `pts[i] = (cx + r·cos(t·freqX + phaseX), 0.5 + r·sin(t·freqY + phaseY))`
3. For each active point compute weight `w_i = 1 / distance(q, pt_i)^u_blend`.
4. Final colour = `Σ(color_i · w_i) / Σ(w_i)` — normalised weighted average.

**Feel:** Smooth, organic gradient blobs. Raising `u_blend` makes transitions sharper and blobs more distinct. Adding `u_noise` warps the interpolation field.

---

### Aurora (`aurora`)

**Technique:** Layered FBM-displaced horizontal bands lit with exponential falloff, over a star field.

**Key uniforms:** `u_layers` (1–5), `u_complexity`, `u_detail` (FBM persistence), `u_height`, `u_width`, `u_intensity`, `u_stars`, `u_starBright`, `u_color1`–`u_color3`, `u_skyColor`.

**Algorithm:**
1. For each layer `i` in `[0, u_layers)`:
   - Sample `fbm(uv.x · complexity, t · 0.3 + i·1.7)` to get a vertical displacement `dist`.
   - Compute distance of `uv.y` from the band height: `y = uv.y + dist − 0.25`.
   - Accumulate `band += intensity · exp(−(y − height)² · width²)` — a Gaussian curtain.
2. Colour-shift across X using `sin(t)` as a horizontal sweep, then modulate with more FBM.
3. Stars: threshold `noise(uv · 200)` against `u_stars · 0.03` — pixels that pass are white dots scaled by `u_starBright`.
4. Output = `u_skyColor + col · band`.

**Feel:** Northern/southern lights curtains against a dark sky. More layers and higher complexity add internal structure.

---

### Plasma (`plasma`)

**Technique:** Sum of sine waves in 2D (classic plasma / demoscene technique), mapped through a 3-colour palette.

**Key uniforms:** `u_scale`, `u_layers` (1–6), `u_freq`, `u_turbulence`, `u_rotate`, `u_saturation`, `u_color1`–`u_color3`.

**Algorithm:**
1. Centre and scale UV: `uv = (fragCoord / res − 0.5) · u_scale`.
2. Optionally rotate UV each frame: `uv = rot(t · u_rotate · 0.2) · uv`.
3. For each layer `i`, accumulate `v` from three sine terms:
   - `sin(uv.x · freq + t + i)`
   - `sin(uv.y · freq·0.8 + t·1.1 + i·1.3)`
   - `sin((uv.x + uv.y) · freq·0.6 + t·0.9 + i·0.7)`
   - `sin(length(uv + orbitPt) · freq + t + i·0.5)` — radial term from a moving point.
4. Normalise `v` to `[0, 1]`. Map through palette using `sin(v·π)` and `sin(v·2π)`.
5. Apply `u_saturation` as a greyscale mix.

**Feel:** Psychedelic, continuously shifting patterns. More layers = denser interference. Higher frequency = tighter ripples.

---

### Metaball (`metaball`)

**Technique:** Implicit surfaces via summed potential fields, rendered with `smoothstep` threshold and a glow layer.

**Key uniforms:** `u_count` (1–7), `u_size`, `u_orbit`, `u_threshold`, `u_smoothness`, `u_chaos`, `u_color1` (fill), `u_color2` (edge), `u_glow`, `u_bgColor`, `u_glowStr`.

**Algorithm:**
1. Build aspect-corrected `p`. Place up to 7 blobs on Lissajous orbits of radius `u_orbit`.  
   Optional `u_chaos` jitters each blob position with a `sin/cos` term driven by a per-blob phase.
2. Potential field: `field += r² / (dist(p, blob_i)² + ε)` where `r = u_size`.
3. Threshold with smooth transition:  
   `th = u_threshold · 0.01`, `sm = u_smoothness · 0.005`  
   `edge = smoothstep(th − sm, th + sm, field)`
4. A separate glow layer: `glow = smoothstep(th·0.25, th·0.85, field) · (1 − edge)` — the halo just outside the surface.
5. `col = mix(u_color1, u_color2, edge·...) · edge + u_glow · glow · u_glowStr`
6. Output = `u_bgColor + col`.

**Feel:** Liquid blobs that merge and separate. Higher threshold = smaller blobs that merge less. Lower smoothness = harder edge.

---

### Ripple (`ripple`)

**Technique:** Concentric sine-wave ripples emanating from a configurable centre point, optionally layered and distorted.

**Key uniforms:** `u_frequency`, `u_amplitude`, `u_damping`, `u_layers` (1–4), `u_cx`/`u_cy` (origin), `u_distort`, `u_color1`–`u_color3`.

**Algorithm:**
1. Optional `u_distort` pre-warps `uv` with a `sin/cos` grid offset.
2. Compute distance `d = length(uv − centre)`.
3. For each layer `i`:  
   `w += sin(d · frequency · (1 + i·0.15) − t + i·π/2) · exp(−d · damping · (1 + i·0.2)) · amplitude · (1 − i·0.15)`
4. Normalise `w` to `[0, 1]`. Map through 3-colour gradient:  
   `col = mix(color1, color2, n)`, then `mix(col, color3, smoothstep(0.4, 0.6, n))`.

**Feel:** Water rings, sonar pulses, or speaker vibration. More layers create standing-wave interference patterns. High damping confines the rings near the centre.

---

### FBM Noise (`fbmNoise`)

**Technique:** Multi-level domain-warped FBM with tone-mapping controls.

**Key uniforms:** `u_scale`, `u_octaves`, `u_detail` (persistence), `u_warp` (warp strength), `u_warpLvl` (1–3 warp iterations), `u_contrast`, `u_brightness`, `u_gamma`, `u_colorize`, `u_color1`/`u_color2`.

**Algorithm:**
1. Start with `q = uv · scale + (time · flow, 0)`.
2. Apply 1–3 levels of domain warp:  
   - Level 1: `warp = (fbm(q), fbm(q + (5.2, 1.3)))`  
   - Level 2: re-sample warp at `q + u_warp · warp`  
   - Level 3: same again  
   Each level adds organic self-similar folding.
3. Sample `n = fbm(q + u_warp · warp + t·0.05)`.
4. Tone-map: `n = clamp((n − 0.5) · contrast + 0.5 + brightness, 0, 1)`.
5. Gamma: `n = pow(n, u_gamma)`.
6. Colour: `col = mix(u_color1, u_color2, n)`. Desaturate/resaturate via `u_colorize`.

**Feel:** Organic, geological, smoke-like textures. Warp levels above 1 create strongly folded patterns (clouds, marble veining). Three warp levels creates deep recursive turbulence.

---

### Silk (`silk`)

**Technique:** Bump-mapped wave field with Blinn-Phong lighting from two coloured directional lights. Optionally layered with a carbon-fibre / woven fabric texture.

**Key uniforms:** `u_speed`, `u_warpSpeed`, `u_flowAngle`, `u_warpType` (0–5 select), `u_scale`, `u_complexity`, `u_bumpScale`, `u_shininess`, `u_specStr`, `u_diffStr`, `u_light1X/Y`, `u_light2X/Y`, `u_baseColor`, `u_ambient`, `u_lightColor1/2`, `u_texStr`, `u_texScale`, `u_texAngle`, `u_texBump`, `u_texWarp`.

**Algorithm:**
1. Centre and scale UV. Rotate by `u_flowAngle`.
2. `field(uv, t)` — iterative wave accumulator:
   - For each complexity layer `i`, compute a `warpDelta(p, scale, i, t)` (pattern selected by `u_warpType`) and add it to `p`.
   - Accumulate `f += a · sin(p.x·s + p.y·s·0.9 + t·speed + i)`.
   - Scale and amplitude decay by 1.55× / 0.58× per octave.
3. Normal from field gradient via finite differences (±`eps` nudge): `calcNormal(uv, t)`.
4. **Warp type patterns** (selected by `u_warpType`):
   - `0` Smooth — low-frequency cross-coupled sine/cosine  
   - `1` Detailed — higher frequency, tighter grain  
   - `2` Chevron — V-shaped diagonal warp using `d = x+y` and `e = |x−y|`  
   - `3` Satin — dominant long-axis warp, very low cross-frequency  
   - `4` Cortex — curl of a smooth potential field (divergence-free, preserves band width)  
   - `5` Flag — sinusoidal waves along X with Y displacement tapering outward
5. **Weave texture** (when `u_texStr > 0`):
   - `weavePattern(p)` — 2/2 twill carbon-fibre cell: `cos²(c·π/2)` cylindrical cross-section, groove edges, mid-gap.
   - `weaveNormal(p)` — finite-difference bump normal from the weave pattern.
   - Weave UV is built from rotated + warped `uv` to co-move with the fabric folds.
   - Blend wave normal and weave normal: `N = normalize(waveN.xy + weaveN.xy · texStr, 1)`.
6. **Lighting** (Blinn-Phong, two lights):
   - `col = baseColor · ambient`
   - `col += lightColor1 · (Lambert(L1) · diffStr + Blinn-Phong(L1, V)^shininess · specStr)`
   - Same for `lightColor2`.
   - Modulate by `weavePattern` brightness if weave is active.
7. Reinhard tone-map + gamma lift.

**Feel:** Flowing liquid-silk fabric. The warp type changes the drape pattern from smooth waves to chevrons to brain-like cortex folds. The weave overlay adds micro-surface fibre detail.

---

### Fluid (`fluid`)

**Technique:** Geometry-first ring-and-beam composition: a glowing ring, a diagonal beam, animated ripples, lens flares with smoke, and a volumetric background glow — all blended through two colours.

**Key uniforms:** `u_ringRadius`, `u_ringWidth`, `u_ringGlow`, `u_tiltAngle/Amount` (3-D perspective tilt), `u_beamAngle/Width/Glow`, `u_flareCount`, `u_flareStr`, `u_flareSpike`, `u_glareAmount`, `u_smokeStr`, `u_smokeDissipation`, `u_smokeRingAffect`, `u_glareRingAffect`, `u_rippleSpeed/Thickness/Fade/Count/Str/Dir`, `u_color1/2`, `u_bgBrightness`, `u_glowStr`.

**Algorithm:**
1. Aspect-correct and centre UV. Slowly rotate by `u_rotation · t`.
2. **Tilt** — squash one axis by `(1 − u_tiltAmount)` after rotating into the tilt-axis frame, to simulate a 3-D ring seen at an angle. All ring / ripple distances use this ellipse-space radius `rt`.
3. **Ring** — `abs(rt − u_ringRadius)` thresholded with `smoothstep(ringWidth, 0, ringD)` plus exponential halo.
4. **Beam** — distance from a line through the origin at `u_beamAngle` via dot product: `abs(dot(uv, perp(dir)))`. Attenuated away from the ring.
5. **Flares + smoke + glare** — `u_flareCount` evenly spaced around the ring ellipse:
   - `flare(d, size)`: core `exp(−r·18)` + halo + spike (polar `cos(θ·2) · u_flareSpike`).
   - `smokeAt(d, t)`: FBM noise sample following the displacement direction, decayed by distance.
   - `glareAt(d)`: soft disc `exp(−|d| / glareAmount)`.
   - Smoke and glare are boosted near the ring via `ringProx`.
6. **Ripples** — up to 6 concentric rings pulsing outward or inward from `u_ringRadius`:  
   `mod(t · rippleSpeed + phase, 1) · range` drives the radius each frame.  
   `u_rippleDir` ≥ 0 = outward, ≤ 0 = inward, 0 = both simultaneously.
7. **Background** — two soft `exp(−beamDist / 0.18)` sweeping beams plus a radial centre glow, scaled by `u_bgBrightness`.
8. **Colour** — directional blend of `u_color1` vs `u_color2` based on `dot(normalize(uv), (−0.707, 0.707))`. All elements are tinted by this `lightCol`.
9. Reinhard tone-map + gamma.

**Feel:** Sci-fi portal / black hole / lens effect. The tilt and beam parameters create a strong sense of depth and direction. Ripple direction controls whether energy flows in or out of the ring.

---

## How to Add a New Shader

Follow these steps exactly. No other files need to change.

### Step 1 — Add the entry to `EFFECTS` in `src/lib/shaders.js`

```js
export const EFFECTS = {
  // ... existing shaders ...

  myNewShader: {
    label: 'My New Shader',

    // Optional — only set true if your GLSL uses u_mouse / u_mouseVel
    // mouseInteractive: true,

    groups: [
      {
        name: 'Motion',
        items: [
          { key: 'u_speed', type: 'float', label: 'Speed', min: 0, max: 2, step: 0.01, default: 0.5 },
        ],
      },
      {
        name: 'Colors',
        items: [
          {
            key: '_myncols', type: 'colors', label: 'Palette',
            keys:      ['u_color1', 'u_color2'],
            sublabels: ['Dark', 'Light'],
            defaults:  [[0.05, 0.05, 0.15], [0.8, 0.5, 1.0]],
          },
        ],
      },
    ],

    presets: [
      { label: 'Default', uniforms: {} },
      { label: 'Warm',    uniforms: { u_color1: [0.15, 0.05, 0.02], u_color2: [1.0, 0.5, 0.1] } },
    ],

    frag: /* glsl */`
      precision mediump float;
      uniform float u_time, u_speed;
      uniform vec2  u_resolution;
      uniform vec3  u_color1, u_color2;

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        float t  = u_time * u_speed;

        // Your GLSL here...
        float n = sin(uv.x * 10.0 + t) * 0.5 + 0.5;
        vec3 col = mix(u_color1, u_color2, n);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },
}
```

That's it. The shader will automatically appear in the picker's effect strip, all controls will be generated, and presets will work.

---

### Step 2 — GLSL checklist

- Always declare `precision mediump float;` (or `highp` for complex shaders).
- Always declare `u_time` and `u_resolution` — they are always uploaded.
- Declare every uniform listed in your `groups` items (use the exact `key` string).
- For `int`-type controls, declare the uniform as `float` and cast: `int n = int(u_count);`.
- For `select`-type controls, declare as `float` and compare with `< 0.5`, `< 1.5` etc.
- For `color`/`colors` types, declare as `vec3`.
- GLSL 1.0 (WebGL 1): no dynamic indexing of arrays with non-constant expressions — use `if (i == 0) ... else if (i == 1) ...` or use array literals indexed by a constant loop counter.
- Loop upper bounds must be compile-time constants. Gate on the uniform:
  ```glsl
  int n = int(u_count);
  for (int i = 0; i < 8; i++) {
    if (i >= n) break;
    // ...
  }
  ```

---

### Step 3 — Presets

Presets are plain objects with a `label` and a `uniforms` object that only needs to contain the keys you want to override. Omitted keys keep the group defaults. The first preset should always be `{ label: 'Default', uniforms: {} }` so users can reset.

---

### Step 4 — Optional: mouse interactivity

Add `mouseInteractive: true` to the effect object, then declare `u_mouse` and `u_mouseVel` in your GLSL:

```glsl
uniform vec2 u_mouse;     // 0–1, origin bottom-left
uniform vec2 u_mouseVel;  // normalised velocity, decays each frame
```

Expose `u_mouseSmooth` as a `float` slider in your groups if you want users to control smoothing.

---

### Naming conventions

| Item | Convention | Example |
|------|------------|---------|
| Effect key | camelCase | `crystalline`, `vortexRings` |
| Uniform keys | `u_` prefix, camelCase | `u_speed`, `u_ringRadius` |
| Color group `key` | `_` prefix + short id | `_mycols`, `_bandcols` |
| Group names | Title case | `'Motion'`, `'Colors'`, `'Structure'` |

---

## Config JSON Format

The serialisable config object — save this to your database or pass it between components:

```json
{
  "effect": "aurora",
  "uniforms": {
    "u_speed": 0.4,
    "u_color1": [0, 1, 0.4],
    "u_color2": [0, 0.4, 1],
    "u_color3": [0.4, 0, 0.8],
    "u_skyColor": [0.01, 0.01, 0.04],
    "u_layers": 3,
    "u_intensity": 1.2
  }
}
```

Rules:
- `effect` must match an `EFFECTS` key exactly.
- `uniforms` only needs the keys that differ from defaults — missing keys are filled in by `defaultConfig()`.
- `color`/`colors` uniforms are `[r, g, b]` arrays with values in `0–1`.
- All numeric uniforms are `number` (not string).

---

## Using the Components

### `ShaderBackground`

Drop-in canvas that fills its parent (parent must be `position: relative` or `absolute`):

```vue
<div style="position: relative; width: 100%; height: 400px;">
  <ShaderBackground :config="shader.config.value" />
</div>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | Object | required | `{ effect, uniforms }` |
| `paused` | Boolean | `false` | Freeze time |
| `timeScale` | Number | `1` | Multiply animation speed |
| `pixelRatio` | Number | `2` | Cap on `devicePixelRatio` |

**Emits:** `ready` (GL init done), `error` (compile/link failure with message).

---

### `ShaderPicker`

Admin panel with live preview strip, collapsible control groups, preset buttons, and JSON import/export:

```vue
<ShaderPicker
  :shader="myShader"
  label="Hero Background"
  @change="saveToDb"
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `shader` | Object | required | Return value of `useShader()` |
| `label` | String | `'Shader Background'` | Panel title |
| `showExport` | Boolean | `true` | Show JSON tab |
| `showPreview` | Boolean | `true` | Show effect selector strip |

**Emits:** `change` — fires on every config change, payload is `exportJSON()`.

---

### `useShader` composable

```js
import { useShader } from '@/composables/useShader.js'

// New shader with default effect (meshGradient)
const shader = useShader()

// Load saved config from DB
const shader = useShader(savedConfig)

// Switch effect (resets all uniforms to defaults)
shader.setEffect('aurora')

// Tweak a single uniform
shader.setUniform('u_speed', 0.8)

// Apply a preset (merges over current uniforms)
shader.usePreset({ label: 'Sunset', uniforms: { u_color1: [1, 0.3, 0.1] } })

// Reset to all defaults
shader.resetToDefaults()

// Load a full config (merges with defaults — safe with partial objects)
shader.loadConfig({ effect: 'plasma', uniforms: { u_speed: 1.2 } })

// Serialize for DB
const json = shader.exportJSON()    // plain object
const str  = shader.exportString()  // formatted JSON string

// Deserialize
shader.importString('{"effect":"ripple","uniforms":{}}')
```

---

## Project File Map

| File | Role |
|------|------|
| `src/lib/shaders.js` | **Single source of truth** — all effect definitions, GLSL, groups, presets |
| `src/lib/shaderUtils.js` | WebGL helpers: `compileShader`, `buildProgram`, `uploadUniforms`, `setupQuad`, `hexToRgb`, `rgbToHex` |
| `src/composables/useShader.js` | Reactive config state, mutations, serialisation |
| `src/components/shader/ShaderBackground.vue` | WebGL canvas, render loop, resize, mouse tracking |
| `src/components/shader/ShaderPicker.vue` | Data-driven admin UI |
| `src/components/shader/ShaderPreview.vue` | Thumbnail canvas used in effect selector strip |
| `src/views/ShaderAdminView.vue` | Example admin page wiring picker + backgrounds together |

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```
