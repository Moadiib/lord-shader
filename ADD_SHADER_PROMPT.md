# Prompt: Generate a New Shader for shader-webgl

## Context

I have a Vue 3 + WebGL shader project. All shaders live in a single registry file:
`src/lib/shaders.js`

The registry is an exported object called `EFFECTS`. Each key is the camelCase effect ID
and each value follows the schema below.

Your task is to **design a new visual shader effect** and return the complete entry to add
to the `EFFECTS` object, plus any supporting code noted in the instructions.

---

## Project File Structure

```
src/
  lib/
    shaders.js        ← ADD the new effect entry here (inside EFFECTS = { … })
    shaderUtils.js    ← WebGL helpers; do NOT modify
  composables/
    useShader.js      ← Vue composable; do NOT modify
  components/shader/
    ShaderBackground.vue  ← renders the shader; do NOT modify
    ShaderPicker.vue      ← control panel; do NOT modify
    ShaderPreview.vue     ← thumbnail; do NOT modify
```

---

## Shared GLSL Snippets (already available via `GLSL_NOISE`)

```glsl
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p, float d, int oct){
  float v=0.,a=.5,fr=1.;
  for(int i=0;i<8;i++){ if(i>=oct)break; v+=a*noise(p*fr); fr*=2.; a*=d; }
  return v;
}
```

The vertex shader outputs `gl_FragCoord`. Always use `gl_FragCoord.xy / u_resolution`
for a 0→1 UV.

Built-in uniforms uploaded automatically:
- `uniform float u_time;`      — seconds elapsed
- `uniform vec2  u_resolution;` — canvas size in pixels

---

## EFFECTS Entry Schema

```js
effectKey: {                   // camelCase, e.g. "lavaLamp"
  label: 'Display Name',       // shown in the picker UI

  groups: [                    // ordered list of control groups
    {
      name: 'Group Name',      // section header
      items: [
        // ── float range slider ──────────────────────────────
        { key: 'u_myFloat', type: 'float', label: 'My Float',
          min: 0, max: 2, step: 0.01, default: 0.5 },

        // ── integer range slider ────────────────────────────
        { key: 'u_myInt',   type: 'int',   label: 'My Int',
          min: 1, max: 8,   step: 1,    default: 4   },

        // ── single color picker → vec3 in GLSL ─────────────
        { key: 'u_bgColor', type: 'color', label: 'Background',
          default: [0.02, 0.02, 0.06] },   // [r, g, b] 0-1

        // ── multi-color group (all become vec3 uniforms) ────
        {
          key: '_groupId',  type: 'colors', label: 'Palette',
          keys:      ['u_color1', 'u_color2', 'u_color3'],
          sublabels: ['Shadow',   'Mid',      'Highlight'],
          defaults:  [[0,0.3,0.8],[0.5,0,1],  [1,0.8,0.2]],
        },

        // ── dropdown → float in GLSL (option index 0,1,2…) ─
        {
          key: 'u_mode', type: 'select', label: 'Mode',
          options: [
            { label: 'Option A', value: 0 },
            { label: 'Option B', value: 1 },
          ],
          default: 0,
        },
      ],
    },
  ],

  presets: [
    { label: 'Default', uniforms: {} },             // always include
    { label: 'Name',    uniforms: { u_key: value, … } }, // override any uniform
  ],

  frag: /* glsl */`
    precision mediump float;
    // declare EVERY uniform listed in groups + built-ins
    uniform float u_time, u_speed, …;
    uniform vec2  u_resolution;
    uniform vec3  u_color1, …;

    // optional: inline hash/noise if you need them
    float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

    void main(){
      vec2 uv = gl_FragCoord.xy / u_resolution;
      // … your effect …
      gl_FragColor = vec4(color, 1.0);
    }`,
},
```

---

## Rules

1. **Self-contained fragment shader** — embed any GLSL helpers you need directly inside
   the `frag` template literal. Do NOT import `GLSL_NOISE`.
2. **Only GLSL ES 1.0** (`precision mediump float;`, no `in`/`out`, no UBOs,
   no texture arrays). The target is WebGL 1.
3. Every uniform declared in `frag` must have a corresponding entry in `groups` so the
   system can upload it. The auto-uploaded ones (`u_time`, `u_resolution`) are exempt.
4. `type: 'int'` / `type: 'select'` uniforms are uploaded as `gl.uniform1f` — declare
   them as `uniform float` in GLSL and cast with `int(u_myInt)` when needed.
5. All `type: 'color'` and `type: 'colors'` uniforms are `uniform vec3` in GLSL.
6. Always include a `'Default'` preset with `uniforms: {}`.
7. Provide at least **4 named presets** with meaningfully different aesthetics.
8. Keep the effect key camelCase and unique.
9. The shader should look good at typical aspect ratios (16:9, 4:3, 1:1).

---

## Where to Insert

In `src/lib/shaders.js`, add your new entry inside the `EFFECTS` object.
The file ends like this — insert before the closing brace:

```js
  // ── <Last existing effect> ───
  lastEffect: {
    …
  },

  // ── YOUR NEW EFFECT ──────────────────────────────────────────────────────────
  yourEffectKey: {
    …
  },
}   // ← closing brace of EFFECTS

// ─── Default config factory ──────────────────────────────────────────────────
export function defaultConfig(effectKey) { … }
```

---

## Your Task

Design and implement a new WebGL shader effect for this project.

**Describe the effect you want** (replace this line with your description), for example:
- "A flowing lava lamp effect with blobs of color that float up and merge"
- "A starfield with parallax layers and a nebula background"
- "Animated circuit board / neon grid lines"
- "Watercolor ink diffusion on wet paper"

Return **only** the JavaScript object entry (starting from `yourEffectKey: {` and ending
with the closing `},`) ready to paste into the `EFFECTS` object in `src/lib/shaders.js`.

No extra explanation is needed — just the code block.
