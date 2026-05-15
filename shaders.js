// ─── Shared GLSL snippets ──────────────────────────────────────────────────────
export const GLSL_NOISE = /* glsl */`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p,float d,int oct){
  float v=0.,a=.5,fr=1.;
  for(int i=0;i<8;i++){if(i>=oct)break;v+=a*noise(p*fr);fr*=2.;a*=d;}
  return v;
}`;

export const GLSL_VERT = /* glsl */`
  attribute vec2 a_pos;
  void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// ─── Effect registry ───────────────────────────────────────────────────────────
// Each effect defines:
//   label      — display name
//   groups     — control groups (shown in ShaderPicker)
//   presets    — named uniform snapshots
//   frag       — GLSL fragment shader source 
//
// Uniform types:
//   float      — range slider
//   int        — integer range slider
//   color      — single color picker   → vec3 in GLSL
//   colors     — multi-color picker group (sublabels, keys, defaults)
//   select     — dropdown              → float in GLSL (index)

export const EFFECTS = {

  // ── Mesh Gradient ────────────────────────────────────────────────────────────
  meshGradient: {
    label: 'Mesh Gradient',
    audioReactive: true,
    groups: [
      {
        name: 'Motion',
        items: [
          { key: 'u_speed',  type: 'float', label: 'Speed',        min: 0,   max: 3,   step: 0.01, default: 0.5 },
          { key: 'u_spread', type: 'float', label: 'Spread',       min: 0.3, max: 2,   step: 0.01, default: 1.0 },
        ],
      },
      {
        name: 'Shape',
        items: [
          { key: 'u_points', type: 'int',   label: 'Point Count',  min: 2,   max: 6,   step: 1,    default: 4   },
          { key: 'u_blend',  type: 'float', label: 'Blend Power',  min: 0.5, max: 10,  step: 0.1,  default: 2.5 },
          { key: 'u_radius', type: 'float', label: 'Orbit Radius', min: 0.05,max: 0.6, step: 0.01, default: 0.4 },
          { key: 'u_noise',  type: 'float', label: 'Warp Noise',   min: 0,   max: 1.5, step: 0.01, default: 0.0 },
        ],
      },
      {
        name: 'Colors',
        items: [
          {
            key: '_colors', type: 'colors', label: 'Point Colors',
            keys: ['u_color1','u_color2','u_color3','u_color4','u_color5','u_color6'],
            sublabels: ['A','B','C','D','E','F'],
            defaults: [[1,.15,.5],[.1,.4,1],[.05,.85,.65],[1,.55,.05],[.8,.2,1],[0,.9,.6]],
          },
        ],
      },
    ],
    presets: [
      { label: 'Default',  uniforms: {} },
      { label: 'Sunset',   uniforms: { u_color1:[1,.3,.1], u_color2:[1,.05,.4], u_color3:[.6,.05,.8], u_color4:[.1,.05,.5], u_speed:.4, u_blend:2 } },
      { label: 'Ocean',    uniforms: { u_color1:[0,.6,1],  u_color2:[0,.3,.8],  u_color3:[0,.9,.7],   u_color4:[0,.1,.4],  u_speed:.3, u_blend:3 } },
      { label: 'Forest',   uniforms: { u_color1:[.1,.6,.2],u_color2:[.05,.4,.1],u_color3:[.5,.8,.1],  u_color4:[.02,.2,.05],u_speed:.25 } },
      { label: 'Fire',     uniforms: { u_color1:[1,.1,0],  u_color2:[1,.5,0],   u_color3:[1,.9,0],    u_color4:[.5,0,0],   u_speed:.8, u_blend:1.5 } },
    ],
    frag: /* glsl */`
      precision mediump float;
      uniform float u_time, u_speed, u_blend, u_spread, u_noise, u_radius;
      uniform float u_points;
      uniform float u_bass, u_mid, u_treble, u_volume, u_beat;
      uniform vec2  u_resolution;
      uniform vec3  u_color1, u_color2, u_color3, u_color4, u_color5, u_color6;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
      }
      void main(){
        vec2 uv = gl_FragCoord.xy / u_resolution;
        float t = u_time * u_speed;
        float asp = u_resolution.x / u_resolution.y;
        uv.x *= asp;
        float cx = asp * 0.5, r = u_radius * (1.0 + u_bass * 0.8);
        vec2 warp = u_noise > 0.0
          ? u_noise * vec2(noise(uv*2.+t*.1), noise(uv*2.+vec2(3.7)+t*.1))
          : vec2(0.0);
        vec2 q = uv + warp;
        vec2 pts[6];
        pts[0] = vec2(cx + r*cos(t*.70),        0.5 + r*sin(t*.50));
        pts[1] = vec2(cx + r*cos(t*.50 + 2.09), 0.5 + r*sin(t*.80 + 1.0));
        pts[2] = vec2(cx + r*cos(t*.90 + 4.19), 0.5 + r*sin(t*.60 + 2.0));
        pts[3] = vec2(cx + r*cos(t*.40 + 1.00), 0.5 + r*sin(t*.70 + 3.0));
        pts[4] = vec2(cx + r*cos(t*1.10 + 3.00),0.5 + r*sin(t*.90 + 4.0));
        pts[5] = vec2(cx + r*cos(t*.60 + 5.00), 0.5 + r*sin(t*.45 + 5.0));
        vec3 cols[6];
        cols[0]=u_color1; cols[1]=u_color2; cols[2]=u_color3;
        cols[3]=u_color4; cols[4]=u_color5; cols[5]=u_color6;
        float tot = 0.0; vec3 col = vec3(0.0);
        int n = int(u_points);
        for(int i = 0; i < 6; i++){
          if(i >= n) break;
          float d = 1.0 / (pow(length(q*u_spread - pts[i]*u_spread), u_blend) + 0.0001);
          col += cols[i] * d; tot += d;
        }
        gl_FragColor = vec4(col / tot, 1.0);
      }`,
  },

  // ── Aurora ───────────────────────────────────────────────────────────────────
  aurora: {
    label: 'Aurora',
    audioReactive: true,
    groups: [
      {
        name: 'Motion',
        items: [
          { key: 'u_speed',      type: 'float', label: 'Speed',       min: 0,   max: 2,   step: 0.01, default: 0.4  },
          { key: 'u_drift',      type: 'float', label: 'Drift',       min: 0,   max: 1,   step: 0.01, default: 0.3  },
        ],
      },
      {
        name: 'Band',
        items: [
          { key: 'u_height',     type: 'float', label: 'Height',      min: 0.1, max: 0.9, step: 0.01, default: 0.55 },
          { key: 'u_width',      type: 'float', label: 'Width',       min: 1,   max: 20,  step: 0.1,  default: 6    },
          { key: 'u_layers',     type: 'int',   label: 'Layers',      min: 1,   max: 5,   step: 1,    default: 3    },
          { key: 'u_complexity', type: 'float', label: 'Complexity',  min: 0.5, max: 6,   step: 0.1,  default: 2    },
          { key: 'u_detail',     type: 'float', label: 'Detail',      min: 0.4, max: 1,   step: 0.01, default: 0.75 },
          { key: 'u_intensity',  type: 'float', label: 'Intensity',   min: 0,   max: 3,   step: 0.05, default: 1.2  },
        ],
      },
      {
        name: 'Stars',
        items: [
          { key: 'u_stars',      type: 'float', label: 'Density',     min: 0,   max: 1,   step: 0.01, default: 0.5  },
          { key: 'u_starBright', type: 'float', label: 'Brightness',  min: 0,   max: 1,   step: 0.01, default: 0.4  },
        ],
      },
      {
        name: 'Colors',
        items: [
          {
            key: '_aur', type: 'colors', label: 'Aurora Bands',
            keys: ['u_color1','u_color2','u_color3'],
            sublabels: ['Primary','Secondary','Accent'],
            defaults: [[0,1,.5],[0,.5,1],[.7,0,1]],
          },
          { key: 'u_skyColor', type: 'color', label: 'Sky Color', default: [0.01, 0.01, 0.04] },
        ],
      },
    ],
    presets: [
      { label: 'Default',   uniforms: {} },
      { label: 'Northern',  uniforms: { u_color1:[0,1,.4],  u_color2:[0,.4,1],  u_color3:[.4,0,.8],  u_skyColor:[.01,.01,.04] } },
      { label: 'Red Sky',   uniforms: { u_color1:[1,.1,.2], u_color2:[1,.5,0],  u_color3:[1,0,.5],   u_skyColor:[.04,.01,.01] } },
      { label: 'Nebula',    uniforms: { u_color1:[.8,.1,1], u_color2:[.2,0,1],  u_color3:[1,.2,.8],  u_skyColor:[.02,0,.04]   } },
      { label: 'Pastel',    uniforms: { u_color1:[.8,1,.9], u_color2:[.7,.9,1], u_color3:[1,.8,.95], u_intensity:.7, u_width:4 } },
    ],
    frag: /* glsl */`
      precision mediump float;
      uniform float u_time,u_speed,u_drift,u_height,u_width,u_layers,u_complexity,u_detail,u_intensity,u_stars,u_starBright;
      uniform float u_bass, u_mid, u_treble, u_volume, u_beat;
      uniform vec2  u_resolution;
      uniform vec3  u_color1, u_color2, u_color3, u_skyColor;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
      }
      float fbm(vec2 p,float d){
        float v=0.,a=.5,fr=1.;
        for(int i=0;i<7;i++){v+=a*noise(p*fr);fr*=2.;a*=d;}return v;
      }
      void main(){
        vec2 uv = gl_FragCoord.xy / u_resolution;
        float t  = u_time * u_speed;
        float band = 0.0;
        int L = int(u_layers);
        for(int i=0;i<5;i++){
          if(i>=L) break;
          float fi=float(i);
          float dist=fbm(vec2(uv.x*u_complexity*(1.+fi*.3),t*.3+fi*1.7),u_detail)*.5;
          float y=uv.y+dist-.25;
          float h=u_height+fi*.07;
          band+=u_intensity*(1.-fi*.15)*exp(-pow((y-h)*u_width,2.));
        }
        vec3 col=mix(u_color1,u_color2,clamp(uv.x+.2*sin(t*.4),0.,1.));
        col=mix(col,u_color3,fbm(uv*2.+t*.05,u_detail)*.8);
        col*=band*(1.0+u_bass*1.5+u_beat*0.8);
        float starMask=u_stars>0.0?step(1.-u_stars*.03,noise(uv*200.+fbm(uv*u_drift*3.+t*.02,u_detail))):0.0;
        col+=(u_starBright+u_treble*0.4)*starMask;
        gl_FragColor=vec4(u_skyColor+col,1.0);
      }`,
  },

  // ── Plasma ───────────────────────────────────────────────────────────────────
  plasma: {
    label: 'Plasma',
    audioReactive: true,
    groups: [
      {
        name: 'Motion',
        items: [
          { key: 'u_speed',       type: 'float', label: 'Speed',      min: 0,   max: 4,   step: 0.01, default: 0.6 },
          { key: 'u_rotate',      type: 'float', label: 'Rotation',   min: 0,   max: 2,   step: 0.01, default: 0   },
        ],
      },
      {
        name: 'Wave',
        items: [
          { key: 'u_scale',       type: 'float', label: 'Scale',      min: 1,   max: 16,  step: 0.1,  default: 4   },
          { key: 'u_layers',      type: 'int',   label: 'Layers',     min: 1,   max: 6,   step: 1,    default: 4   },
          { key: 'u_freq',        type: 'float', label: 'Frequency',  min: 0.5, max: 5,   step: 0.05, default: 1   },
          { key: 'u_turbulence',  type: 'float', label: 'Turbulence', min: 0,   max: 3,   step: 0.05, default: 1   },
        ],
      },
      {
        name: 'Colors',
        items: [
          {
            key: '_pcols', type: 'colors', label: 'Palette',
            keys: ['u_color1','u_color2','u_color3'],
            sublabels: ['A','B','C'],
            defaults: [[1,0,.5],[0,1,1],[1,1,0]],
          },
          { key: 'u_saturation', type: 'float', label: 'Saturation', min: 0, max: 2, step: 0.05, default: 1 },
        ],
      },
    ],
    presets: [
      { label: 'Default',  uniforms: {} },
      { label: 'Electric', uniforms: { u_color1:[0,.8,1], u_color2:[.5,0,1], u_color3:[0,1,.5], u_speed:.8, u_scale:5 } },
      { label: 'Rainbow',  uniforms: { u_color1:[1,0,0],  u_color2:[0,1,0],  u_color3:[0,0,1],  u_freq:2   } },
      { label: 'Candy',    uniforms: { u_color1:[1,.4,.8],u_color2:[.4,.8,1],u_color3:[1,1,.4], u_scale:3  } },
      { label: 'Magma',    uniforms: { u_color1:[1,.05,0],u_color2:[.8,.3,0],u_color3:[.3,0,0], u_speed:.3, u_turbulence:2 } },
    ],
    frag: /* glsl */`
      precision mediump float;
      uniform float u_time,u_speed,u_scale,u_layers,u_freq,u_turbulence,u_rotate,u_saturation;
      uniform float u_bass, u_mid, u_treble, u_volume, u_beat;
      uniform vec2  u_resolution;
      uniform vec3  u_color1,u_color2,u_color3;
      const float PI=3.14159265;
      void main(){
        vec2 uv=(gl_FragCoord.xy/u_resolution-.5)*(u_scale*(1.0+u_beat*0.12));
        float t=u_time*u_speed;
        float c=cos(u_rotate*t*.2),s=sin(u_rotate*t*.2);
        uv=vec2(uv.x*c-uv.y*s,uv.x*s+uv.y*c);
        float v=0.;
        int L=int(u_layers);
        for(int i=0;i<6;i++){
          if(i>=L)break;
          float fi=float(i);
          v+=sin(uv.x*u_freq+t+fi)+sin(uv.y*u_freq*.8+t*1.1+fi*1.3);
          v+=sin((uv.x+uv.y)*u_freq*.6+t*.9+fi*.7);
          float r=length(uv+vec2(sin(t*.5+fi),cos(t*.4+fi))*u_turbulence*.5);
          v+=sin(r*u_freq+t+fi*.5);
        }
        v=clamp(v/(float(L)*4.)+.5+u_bass*0.12,0.,1.);
        vec3 col=mix(u_color1,u_color2,sin(v*PI));
        col=mix(col,u_color3,sin(v*PI*2.)*.5+.5);
        float grey=dot(col,vec3(.299,.587,.114));
        col=mix(vec3(grey),col,u_saturation);
        gl_FragColor=vec4(col,1.);
      }`,
  },

  // ── Metaball ─────────────────────────────────────────────────────────────────
  metaball: {
    label: 'Metaball',
    audioReactive: true,
    groups: [
      {
        name: 'Motion',
        items: [
          { key: 'u_speed',      type: 'float', label: 'Speed',        min: 0,    max: 4,   step: 0.01,  default: 0.5  },
          { key: 'u_chaos',      type: 'float', label: 'Chaos',        min: 0,    max: 2,   step: 0.01,  default: 0    },
        ],
      },
      {
        name: 'Shape',
        items: [
          { key: 'u_count',      type: 'int',   label: 'Blob Count',   min: 1,    max: 7,   step: 1,     default: 4    },
          { key: 'u_size',       type: 'float', label: 'Blob Size',    min: 0.03, max: 0.4, step: 0.005, default: 0.12 },
          { key: 'u_orbit',      type: 'float', label: 'Orbit Radius', min: 0.05, max: 0.5, step: 0.01,  default: 0.32 },
          { key: 'u_threshold',  type: 'float', label: 'Threshold',    min: 5,    max: 80,  step: 0.5,   default: 20   },
          { key: 'u_smoothness', type: 'float', label: 'Smoothness',   min: 0,    max: 20,  step: 0.1,   default: 2    },
        ],
      },
      {
        name: 'Colors',
        items: [
          {
            key: '_mcols', type: 'colors', label: 'Fill / Edge / Glow',
            keys: ['u_color1','u_color2','u_glow'],
            sublabels: ['Fill','Edge','Glow'],
            defaults: [[0,.5,1],[0,.15,.7],[.2,.75,1]],
          },
          { key: 'u_bgColor',  type: 'color', label: 'Background',    default: [0.02, 0.02, 0.06] },
          { key: 'u_glowStr',  type: 'float', label: 'Glow Strength', min: 0, max: 3, step: 0.05, default: 0.85 },
        ],
      },
    ],
    presets: [
      { label: 'Default', uniforms: {} },
      { label: 'Water',   uniforms: { u_color1:[0,.6,1],   u_color2:[0,.2,.6],  u_glow:[.3,.9,1],  u_bgColor:[.01,.02,.05] } },
      { label: 'Soap',    uniforms: { u_color1:[.9,.5,1],  u_color2:[.4,.2,.8], u_glow:[1,.8,1],   u_bgColor:[.04,.02,.06] } },
      { label: 'Lava',    uniforms: { u_color1:[1,.3,0],   u_color2:[.6,.1,0],  u_glow:[1,.7,0],   u_bgColor:[.04,.01,0]   } },
      { label: 'Ink',     uniforms: { u_color1:[.9,.9,.9], u_color2:[.4,.4,.4], u_glow:[1,1,1],    u_bgColor:[0,0,0], u_glowStr:.3 } },
    ],
    frag: /* glsl */`
      precision mediump float;
      uniform float u_time,u_speed,u_count,u_size,u_threshold,u_smoothness,u_orbit,u_glowStr,u_chaos;
      uniform float u_bass, u_mid, u_treble, u_volume, u_beat;
      uniform vec2  u_resolution;
      uniform vec3  u_color1,u_color2,u_glow,u_bgColor;
      void main(){
        vec2 uv=gl_FragCoord.xy/u_resolution;
        float asp=u_resolution.x/u_resolution.y;
        vec2 p=vec2(uv.x*asp,uv.y);
        float t=u_time*u_speed,cx=asp*.5,r=u_size*(1.0+u_beat*0.4),or=u_orbit*(1.0+u_bass*0.35);
        vec2 b[7];
        b[0]=vec2(cx+or*cos(t*.70),        .5+or*sin(t*.50));
        b[1]=vec2(cx+or*cos(t*.50+2.09),   .5+or*sin(t*.80+1.0));
        b[2]=vec2(cx+or*cos(t*.90+4.19),   .5+or*sin(t*.60+2.0));
        b[3]=vec2(cx+or*cos(t*.40+1.00),   .5+or*sin(t*.70+3.0));
        b[4]=vec2(cx+or*cos(t*1.10+3.00),  .5+or*sin(t*.90+4.0));
        b[5]=vec2(cx+or*.7*cos(t*.80+5.0), .5+or*.7*sin(t*.50+5.0));
        b[6]=vec2(cx+or*.5*cos(t*1.3+.5),  .5+or*.5*sin(t*1.2+2.5));
        float field=0.;
        int N=int(u_count);
        for(int i=0;i<7;i++){
          if(i>=N)break;
          vec2 bp=b[i];
          if(u_chaos>0.)bp+=u_chaos*.05*vec2(sin(u_time*1.7+float(i)*2.3),cos(u_time*1.3+float(i)*1.7));
          field+=r*r/(dot(p-bp,p-bp)+.0001);
        }
        float th=u_threshold*.01,sm=u_smoothness*.005;
        float edge=smoothstep(th-sm,th+sm,field);
        float glow=smoothstep(th*.25,th*.85,field)*(1.-edge);
        vec3 col=mix(u_color1,u_color2,edge*smoothstep(0.,.15,field-th))*edge;
        col+=u_glow*glow*u_glowStr;
        gl_FragColor=vec4(u_bgColor+col,1.);
      }`,
  },

  // ── Ripple ───────────────────────────────────────────────────────────────────
  ripple: {
    label: 'Ripple',
    audioReactive: true,
    groups: [
      {
        name: 'Motion',
        items: [
          { key: 'u_speed',     type: 'float', label: 'Speed',      min: 0, max: 6,  step: 0.1,  default: 1.5 },
        ],
      },
      {
        name: 'Wave',
        items: [
          { key: 'u_frequency', type: 'float', label: 'Frequency',  min: 2, max: 50, step: 0.5,  default: 15  },
          { key: 'u_amplitude', type: 'float', label: 'Amplitude',  min: 0, max: 3,  step: 0.01, default: 0.8 },
          { key: 'u_damping',   type: 'float', label: 'Damping',    min: 0, max: 15, step: 0.1,  default: 3   },
          { key: 'u_layers',    type: 'int',   label: 'Layers',     min: 1, max: 4,  step: 1,    default: 2   },
          { key: 'u_distort',   type: 'float', label: 'Distortion', min: 0, max: 1,  step: 0.01, default: 0   },
        ],
      },
      {
        name: 'Origin',
        items: [
          { key: 'u_cx',        type: 'float', label: 'Center X',   min: 0, max: 1, step: 0.01, default: 0.5 },
          { key: 'u_cy',        type: 'float', label: 'Center Y',   min: 0, max: 1, step: 0.01, default: 0.5 },
        ],
      },
      {
        name: 'Colors',
        items: [
          {
            key: '_rcols', type: 'colors', label: 'Wave Colors',
            keys: ['u_color1','u_color2','u_color3'],
            sublabels: ['Trough','Mid','Crest'],
            defaults: [[0,.1,.3],[0,.6,1],[1,1,1]],
          },
        ],
      },
    ],
    presets: [
      { label: 'Default', uniforms: {} },
      { label: 'Water',   uniforms: { u_color1:[0,.1,.25],  u_color2:[0,.5,.9],  u_color3:[.8,.95,1], u_frequency:14 } },
      { label: 'Sonar',   uniforms: { u_color1:[0,.05,0],   u_color2:[0,.7,.2],  u_color3:[.3,1,.5],  u_frequency:20, u_damping:5 } },
      { label: 'Dark',    uniforms: { u_color1:[0,0,0],      u_color2:[.15,.15,.15],u_color3:[.4,.4,.4] } },
      { label: 'Prism',   uniforms: { u_color1:[1,0,.5],    u_color2:[0,.5,1],   u_color3:[1,1,0],    u_layers:4, u_frequency:12 } },
    ],
    frag: /* glsl */`
      precision mediump float;
      uniform float u_time,u_speed,u_frequency,u_amplitude,u_damping,u_cx,u_cy,u_layers,u_distort;
      uniform float u_bass, u_mid, u_treble, u_volume, u_beat;
      uniform vec2  u_resolution;
      uniform vec3  u_color1,u_color2,u_color3;
      void main(){
        vec2 uv=gl_FragCoord.xy/u_resolution;
        float t=u_time*u_speed;
        if(u_distort>0.){
          vec2 d=vec2(sin(uv.y*10.+t),cos(uv.x*10.+t))*u_distort*.03;
          uv+=d;
        }
        float d=length(uv-vec2(u_cx,u_cy)),w=0.;
        float audioAmp=u_amplitude*(1.0+u_bass*1.2+u_beat*0.8);
        int L=int(u_layers);
        for(int i=0;i<4;i++){
          if(i>=L)break;
          float fi=float(i);
          w+=sin(d*u_frequency*(1.+fi*.15)-t+fi*1.57)*exp(-d*u_damping*(1.+fi*.2))*audioAmp*(1.-fi*.15);
        }
        float n=w*.5+.5;
        vec3 col=mix(u_color1,u_color2,n);
        col=mix(col,u_color3,smoothstep(.4,.6,n));
        gl_FragColor=vec4(col,1.);
      }`,
  },

  // ── FBM Noise ────────────────────────────────────────────────────────────────
  fbmNoise: {
    label: 'FBM Noise',
    audioReactive: true,
    groups: [
      {
        name: 'Motion',
        items: [
          { key: 'u_speed',      type: 'float', label: 'Speed',       min: 0,    max: 2,   step: 0.01, default: 0.3  },
          { key: 'u_animate',    type: 'float', label: 'Flow',        min: 0,    max: 1,   step: 0.01, default: 0.5  },
        ],
      },
      {
        name: 'Structure',
        items: [
          { key: 'u_scale',      type: 'float', label: 'Scale',       min: 0.5,  max: 12,  step: 0.1,  default: 3    },
          { key: 'u_octaves',    type: 'int',   label: 'Octaves',     min: 1,    max: 8,   step: 1,    default: 6    },
          { key: 'u_detail',     type: 'float', label: 'Detail',      min: 0.1,  max: 1,   step: 0.01, default: 0.75 },
          { key: 'u_warp',       type: 'float', label: 'Domain Warp', min: 0,    max: 4,   step: 0.05, default: 0.6  },
          { key: 'u_warpLvl',    type: 'int',   label: 'Warp Levels', min: 1,    max: 3,   step: 1,    default: 1    },
        ],
      },
      {
        name: 'Tone',
        items: [
          { key: 'u_contrast',   type: 'float', label: 'Contrast',    min: 0.2,  max: 5,   step: 0.05, default: 1.5  },
          { key: 'u_brightness', type: 'float', label: 'Brightness',  min: -0.5, max: 0.5, step: 0.01, default: 0    },
          { key: 'u_gamma',      type: 'float', label: 'Gamma',       min: 0.5,  max: 2.5, step: 0.05, default: 1    },
          { key: 'u_colorize',   type: 'float', label: 'Colorize',    min: 0,    max: 1,   step: 0.01, default: 1    },
        ],
      },
      {
        name: 'Colors',
        items: [
          {
            key: '_ncols', type: 'colors', label: 'Dark / Light',
            keys: ['u_color1','u_color2'],
            sublabels: ['Shadow','Light'],
            defaults: [[0.04,0.04,0.09],[0.92,0.82,0.62]],
          },
        ],
      },
    ],
    presets: [
      { label: 'Default', uniforms: {} },
      { label: 'Desert',  uniforms: { u_color1:[.15,.08,.02], u_color2:[.95,.8,.5],  u_scale:4, u_warp:.4  } },
      { label: 'Smoke',   uniforms: { u_color1:[.05,.05,.07], u_color2:[.85,.85,.9], u_scale:3, u_warp:1.5, u_speed:.15 } },
      { label: 'Lichen',  uniforms: { u_color1:[.02,.07,.01], u_color2:[.55,.8,.25], u_detail:.6,u_warp:.8 } },
      { label: 'Crystal', uniforms: { u_color1:[.02,0,.08],   u_color2:[.7,.5,1],    u_detail:.9,u_warp:3, u_contrast:2 } },
    ],
    frag: /* glsl */`
      precision mediump float;
      uniform float u_time,u_speed,u_scale,u_detail,u_warp,u_contrast,u_brightness,u_gamma,u_colorize,u_animate;
      uniform float u_octaves,u_warpLvl;
      uniform float u_bass, u_mid, u_treble, u_volume, u_beat;
      uniform vec2  u_resolution;
      uniform vec3  u_color1,u_color2;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
      }
      float fbmO(vec2 p,float d,int oct){
        float v=0.,a=.5,fr=1.;
        for(int i=0;i<8;i++){if(i>=oct)break;v+=a*noise(p*fr);fr*=2.;a*=d;}return v;
      }
      void main(){
        int oct=int(u_octaves),wl=int(u_warpLvl);
        vec2 uv=gl_FragCoord.xy/u_resolution*u_scale;
        float t=u_time*u_speed;
        vec2 q=uv+vec2(t*u_animate,0.),warp=vec2(0.);
        if(wl>=1){warp=vec2(fbmO(q,u_detail,oct),fbmO(q+vec2(5.2,1.3),u_detail,oct));}
        if(wl>=2){vec2 q2=q+u_warp*warp;warp=vec2(fbmO(q2,u_detail,oct),fbmO(q2+vec2(1.7,9.2),u_detail,oct));}
        if(wl>=3){vec2 q3=q+u_warp*warp;warp=vec2(fbmO(q3,u_detail,oct),fbmO(q3+vec2(8.3,2.8),u_detail,oct));}
        float n=fbmO(q+u_warp*warp+t*.05,u_detail,oct);
        n=clamp((n-.5)*(u_contrast+u_bass*1.0)+.5+u_brightness+u_beat*0.15,0.,1.);
        n=pow(n,u_gamma);
        vec3 col=mix(u_color1,u_color2,n);
        float grey=dot(col,vec3(.299,.587,.114));
        col=mix(vec3(grey),col,u_colorize);
        gl_FragColor=vec4(col,1.);
      }`,
  },

  // ── Silk ────────────────────────────────────────────────────────────────
  silk: {
    label: 'Silk',
    mouseInteractive: true,
    groups: [
      {
        name: 'Mouse',
        items: [
          { key: 'u_mouseEnabled', type: 'toggle', label: 'Mouse Light',  default: 0    },
          { key: 'u_mouseSmooth',  type: 'float',  label: 'Smoothness',   min: 0.01, max: 0.99, step: 0.01, default: 0.85 },
          { key: 'u_mouseStr',     type: 'float',  label: 'Strength',     min: 0,    max: 3,    step: 0.05, default: 1.8  },
        ],
      },
      {
        name: 'Motion',
        items: [
          { key: 'u_speed',      type: 'float',  label: 'Speed',         min: 0,   max: 2,    step: 0.01, default: 0.63 },
          { key: 'u_warpSpeed',  type: 'float',  label: 'Warp Speed',    min: 0,   max: 2,    step: 0.01, default: 1.38 },
          { key: 'u_flowAngle',  type: 'float',  label: 'Flow Direction', min: -180, max: 180, step: 1,    default: 0    },
          {
            key: 'u_warpType', type: 'select', label: 'Warp Pattern',
            options: [
              { label: 'Smooth',    value: 0 },
              { label: 'Detailed',  value: 1 },
              { label: 'Chevron',   value: 2 },
              { label: 'Satin',     value: 3 },
              { label: 'Cortex',    value: 4 },
              { label: 'Flag',       value: 5 },
            ],
            default: 0,
          },
        ],
      },
      {
        name: 'Surface',
        items: [
          { key: 'u_scale',      type: 'float', label: 'Scale',         min: 0.5, max: 4,   step: 0.05, default: 1.6  },
          { key: 'u_complexity', type: 'float', label: 'Complexity',    min: 1,   max: 6,   step: 0.1,  default: 4.5  },
          { key: 'u_bumpScale',  type: 'float', label: 'Bump Depth',    min: 0.5, max: 12,  step: 0.1,  default: 12   },
          { key: 'u_shininess',  type: 'float', label: 'Shininess',     min: 1,   max: 80,  step: 0.5,  default: 38   },
          { key: 'u_specStr',    type: 'float', label: 'Specular',      min: 0,   max: 3,   step: 0.05, default: 2.05 },
          { key: 'u_diffStr',    type: 'float', label: 'Diffuse',       min: 0,   max: 2,   step: 0.05, default: 0.45 },
        ],
      },
      {
        name: 'Lights',
        items: [
          { key: 'u_light1X',   type: 'float', label: 'Light A — X',   min: -2,  max: 2,   step: 0.05, default: -0.65 },
          { key: 'u_light1Y',   type: 'float', label: 'Light A — Y',   min: -2,  max: 2,   step: 0.05, default:  0.2  },
          { key: 'u_light2X',   type: 'float', label: 'Light B — X',   min: -2,  max: 2,   step: 0.05, default: -0.75 },
          { key: 'u_light2Y',   type: 'float', label: 'Light B — Y',   min: -2,  max: 2,   step: 0.05, default: -1.5  },
        ],
      },
      {
        name: 'Colors',
        items: [
          { key: 'u_baseColor', type: 'color', label: 'Base',           default: [0.0196078431372549, 0.0392156862745098, 0.1411764705882353] },
          { key: 'u_ambient',   type: 'float', label: 'Ambient',        min: 0,   max: 1,   step: 0.01, default: 0.08 },
          {
            key: '_silkcols', type: 'colors', label: 'Light Colors',
            keys: ['u_lightColor1', 'u_lightColor2'],
            sublabels: ['Light A', 'Light B'],
            defaults: [[0, 0.15294117647058825, 0.3254901960784314], [1, 0.07450980392156863, 0.10196078431372549]],
          },
        ],
      },
      {
        name: 'Texture',
        items: [
          { key: 'u_texStr',   type: 'float', label: 'Texture Strength', min: 0,    max: 1,    step: 0.01, default: 0    },
          { key: 'u_texScale', type: 'float', label: 'Weave Scale',      min: 2,    max: 40,   step: 0.5,  default: 8    },
          { key: 'u_texAngle', type: 'float', label: 'Weave Angle',      min: -180, max: 180,  step: 1,    default: 45   },
          { key: 'u_texBump',  type: 'float', label: 'Weave Bump',       min: 0,    max: 6,    step: 0.1,  default: 2.5  },
          { key: 'u_texWarp',  type: 'float', label: 'Warp Intensity',   min: 0,    max: 2,    step: 0.01, default: 0.35 },
        ],
      },
    ],
    presets: [
      { label: 'Default',    uniforms: {} },
      {
        label: 'Midnight',
        uniforms: {
          u_baseColor: [0.01, 0.01, 0.08],
          u_lightColor1: [0.4, 0.2, 1.0], u_lightColor2: [0.0, 0.7, 1.0],
          u_shininess: 30, u_specStr: 1.5, u_bumpScale: 5,
        },
      },
      {
        label: 'Gold',
        uniforms: {
          u_baseColor: [0.05, 0.03, 0.01],
          u_lightColor1: [1.0, 0.75, 0.1], u_lightColor2: [1.0, 0.35, 0.05],
          u_shininess: 40, u_specStr: 1.8, u_bumpScale: 6,
        },
      },
      {
        label: 'Rose',
        uniforms: {
          u_baseColor: [0.08, 0.02, 0.05],
          u_lightColor1: [1.0, 0.35, 0.6], u_lightColor2: [0.6, 0.1, 1.0],
          u_shininess: 18, u_specStr: 1.0, u_bumpScale: 3.5,
        },
      },
      {
        label: 'Arctic',
        uniforms: {
          u_baseColor: [0.02, 0.06, 0.1],
          u_lightColor1: [0.8, 1.0, 1.0], u_lightColor2: [0.3, 0.6, 1.0],
          u_shininess: 50, u_specStr: 2.0, u_bumpScale: 7, u_ambient: 0.05,
        },
      },
      {
        label: 'Monochrome',
        uniforms: {
          u_baseColor: [0.02, 0.02, 0.02],
          u_lightColor1: [1.0, 1.0, 1.0], u_lightColor2: [0.6, 0.6, 0.6],
          u_shininess: 35, u_specStr: 1.6, u_bumpScale: 5,
        },
      },
      {
        label: 'Dark',
        uniforms: {
          u_speed: 0.71, u_warpSpeed: 1.29, u_flowAngle: -32, u_warpType: 0,
          u_scale: 1.65, u_complexity: 5.6, u_bumpScale: 12, u_shininess: 44,
          u_specStr: 1, u_diffStr: 0,
          u_light1X: -1, u_light1Y: -0.15, u_light2X: -0.75, u_light2Y: -2,
          u_baseColor: [0.0196078431372549, 0.0392156862745098, 0.1411764705882353],
          u_ambient: 0.07,
          u_lightColor1: [0, 0.0784313725490196, 0.16862745098039217],
          u_lightColor2: [1, 0.07450980392156863, 0.10196078431372549],
          u_texStr: 0, u_texScale: 7.5, u_texAngle: 45, u_texBump: 2.5, u_texWarp: 0.35,
        },
      },
    ],
    frag: /* glsl */`
      precision highp float;

      uniform float u_time, u_speed, u_warpSpeed, u_scale, u_complexity;
      uniform float u_bumpScale, u_shininess, u_specStr, u_diffStr, u_ambient;
      uniform float u_light1X, u_light1Y, u_light2X, u_light2Y;
      uniform float u_flowAngle, u_warpType;
      uniform float u_texStr, u_texScale, u_texAngle, u_texBump, u_texWarp;
      uniform float u_mouseEnabled, u_mouseStr;
      uniform vec2  u_resolution;
      uniform vec2  u_mouse;
      uniform vec2  u_mouseVel;
      uniform vec3  u_baseColor, u_lightColor1, u_lightColor2;

      const float PI = 3.14159265359;

      // ── Carbon fiber 2/2 twill weave ──────────────────────────────────────────
      // p: UV where 1 unit = 1 fiber bundle cell.
      // Each cell has one fiber bundle on top with a cylindrical cross-section.
      // Adjacent cells alternate horizontal/vertical to form the twill diagonal.
      float weavePattern(vec2 p) {
        vec2  cell  = floor(p);
        vec2  local = fract(p);

        // 2/2 twill parity: diagonal alternation
        float parity = mod(cell.x + cell.y, 2.0);
        float along  = parity < 1.0 ? local.x : local.y;
        float across = parity < 1.0 ? local.y : local.x;

        // Cylindrical cross-section: cos² gives a smooth, realistic fiber shine
        float c   = across * 2.0 - 1.0;           // -1..1 across fiber
        float cyl = cos(c * 1.5707963) * cos(c * 1.5707963);  // cos²(c·π/2)

        // Hard-edged groove at bundle boundaries (tight, like real CF)
        float groove = smoothstep(0.0, 0.10, across) * smoothstep(1.0, 0.90, across);

        // Slight secondary gap at mid-point of the 'along' axis (2-strand bundle)
        float midGap = 1.0 - 0.25 * smoothstep(0.42, 0.50, fract(along))
                                  * smoothstep(0.58, 0.50, fract(along));

        return cyl * groove * midGap;
      }

      // Bump normal from weave (finite difference)
      vec3 weaveNormal(vec2 p) {
        float e  = 0.4;
        float hL = weavePattern(p - vec2(e, 0.0));
        float hR = weavePattern(p + vec2(e, 0.0));
        float hD = weavePattern(p - vec2(0.0, e));
        float hU = weavePattern(p + vec2(0.0, e));
        return normalize(vec3(-(hR - hL) * u_texBump, -(hU - hD) * u_texBump, 1.0));
      }

      // ── Domain warp delta for one octave (pattern-selectable) ──────────────
      vec2 warpDelta(vec2 p, float s, float fi, float tw) {
        if (u_warpType < 0.5) {
          // Smooth: gentle low-frequency cross-coupled flow
          return 0.18 * vec2(
            sin(p.y * s * 1.3 + tw * (0.5 + fi * 0.15) + fi * 2.39),
            cos(p.x * s * 1.1 + tw * (0.4 + fi * 0.12) + fi * 1.61)
          );
        } else if (u_warpType < 1.5) {
          // Detailed: higher frequency, tighter fine-grain ripple
          return 0.18 * vec2(
            sin(p.y * s * 2.8 + tw * (0.6 + fi * 0.20) + fi * 2.39),
            cos(p.x * s * 2.4 + tw * (0.5 + fi * 0.18) + fi * 1.61)
          );
        } else if (u_warpType < 2.5) {
          // Chevron: V-shaped diagonal bands
          float d = (p.x + p.y) * s * 1.2;
          float e = abs(p.x - p.y) * s * 0.8;
          return 0.18 * vec2(
            sin(d + tw * (0.5 + fi * 0.15) + fi * 1.9),
            cos(e + tw * (0.4 + fi * 0.12) + fi * 2.7)
          );
        } else if (u_warpType < 3.5) {
          // Satin: long-axis dominant, very low cross-frequency streaks
          return 0.18 * vec2(
            sin(p.y * s * 0.7 + tw * (0.3 + fi * 0.08) + fi * 2.39) * 1.6,
            cos(p.x * s * 0.3 + tw * (0.2 + fi * 0.06) + fi * 1.61) * 0.4
          );
        } else if (u_warpType < 4.5) {
          // Cortex: curl of a smooth potential field — divergence-free, so the
          // domain warp preserves band width across iterations. Each loop closes
          // back on itself, producing the rounded winding gyri of brain tissue.
          // curl(sin(phx)*cos(phy)) = (df/dy, -df/dx)
          float phx = p.x * s * 2.3 + tw * (0.45 + fi * 0.13) + fi * 1.57;
          float phy = p.y * s * 1.9 + tw * (0.38 + fi * 0.11) + fi * 2.09;
          return 0.22 * vec2(
            -sin(phx) * sin(phy),
            -cos(phx) * cos(phy)
          );
        } else {
          // Flag: sinusoidal waves propagating along X axis with dominant Y
          // displacement — like cloth attached at the left, rippling rightward.
          // Secondary X flutter grows with p.x to simulate amplitude taper.
          float wave1 = sin(p.x * s * 1.8 + tw * (1.4 + fi * 0.18) + fi * 1.57);
          float wave2 = sin(p.x * s * 0.9 + tw * (0.7 + fi * 0.10) + fi * 0.52);
          float flutter = cos(p.y * s * 0.6 + tw * (0.5 + fi * 0.08) + fi * 2.1) * 0.18;
          return 0.26 * vec2(
            flutter,
            wave1 * 0.75 + wave2 * 0.25
          );
        }
      }

      // ── Smooth wave field ───────────────────────────────────────────────────
      // Generates large, organic flowing curves — not grainy noise.
      float field(vec2 p, float t) {
        float f  = 0.0;
        float s  = 1.0;
        float a  = 1.0;
        float tw = t * u_warpSpeed;
        for (int i = 0; i < 6; i++) {
          if (float(i) >= u_complexity) break;
          float fi = float(i);
          p += warpDelta(p, s, fi, tw);
          f += a * sin(p.x * s + p.y * s * 0.9 + t * u_speed * (1.0 + fi * 0.1) + fi);
          s *= 1.55;
          a *= 0.58;
        }
        return f;
      }

      // ── Normal from field gradient (bump mapping) ───────────────────────────
      vec3 calcNormal(vec2 uv, float t) {
        float eps = 0.002;
        float hL = field(uv - vec2(eps, 0.0), t);
        float hR = field(uv + vec2(eps, 0.0), t);
        float hD = field(uv - vec2(0.0, eps), t);
        float hU = field(uv + vec2(0.0, eps), t);
        return normalize(vec3(
          -(hR - hL) * u_bumpScale,
          -(hU - hD) * u_bumpScale,
          1.0
        ));
      }

      // ── Accumulated domain warp from wave field ─────────────────────────────
      // Returns the total UV displacement the wave field applies at (p, t).
      // Using this to offset texUV makes the weave move in lock-step with the silk.
      vec2 fieldWarp(vec2 p, float t) {
        float s    = 1.0;
        float tw   = t * u_warpSpeed;
        vec2  warp = vec2(0.0);
        for (int i = 0; i < 6; i++) {
          if (float(i) >= u_complexity) break;
          float fi    = float(i);
          vec2 delta  = warpDelta(p, s, fi, tw);
          warp += delta;
          p    += delta;
          s    *= 1.55;
        }
        return warp;
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy / u_resolution - 0.5) * u_scale;
        uv.x *= u_resolution.x / u_resolution.y;

        // Rotate UV by flow angle (degrees → radians)
        float _a = u_flowAngle * 3.14159265 / 180.0;
        float _ca = cos(_a), _sa = sin(_a);
        uv = vec2(_ca * uv.x - _sa * uv.y, _sa * uv.x + _ca * uv.y);

        float t = u_time;

        // ── Mouse UV deformation ───────────────────────────────────────────────
        // Map mouse to the same aspect-corrected, flow-rotated UV space as uv,
        // then pull nearby fabric waves toward the cursor (gaussian falloff).
        // Mouse velocity amplifies the effect so fast sweeps create bigger ripples.
        float asp     = u_resolution.x / u_resolution.y;
        vec2  mouseUV = (u_mouse - 0.5) * u_scale;
        mouseUV.x    *= asp;
        mouseUV       = vec2(_ca * mouseUV.x - _sa * mouseUV.y,
                             _sa * mouseUV.x + _ca * mouseUV.y);
        vec2  toMouse = mouseUV - uv;
        float mDist   = length(toMouse);
        float falloff = exp(-mDist * mDist * 1.6);
        float velMag  = length(u_mouseVel);
        float mStr    = u_mouseEnabled * u_mouseStr * 0.22 * falloff * (1.0 + velMag * 4.0);
        vec2  uvW     = uv + normalize(toMouse + vec2(0.0001)) * mStr;

        // ── Weave texture ─────────────────────────────────────────────────────
        // texUV is built from 'uv' (surface space) warped by the same time-varying
        // domain warp that drives the silk colors — so the grid moves with the folds.
        float texA = u_texAngle * PI / 180.0;
        float tca  = cos(texA), tsa = sin(texA);
        // Rotate uv to weave angle, then apply the live warp, then scale to cell size
        vec2  uvR   = vec2(tca * uv.x - tsa * uv.y, tsa * uv.x + tca * uv.y);
        vec2  warp  = fieldWarp(uvW, t);
        vec2  texUV = (uvR + warp * u_texWarp) * max(u_texScale, 0.5);

        // Compute wave normal (needed for shading and weave bump blend)
        vec3 waveN = calcNormal(uvW, t);

        float weaveBright = weavePattern(texUV);
        vec3  weaveN      = weaveNormal(texUV);

        // Blend weave normals additively on top of wave normals
        vec3 N = u_texStr > 0.0
          ? normalize(vec3(waveN.xy + weaveN.xy * u_texStr, 1.0))
          : waveN;

        // View direction (orthographic — straight at the screen)
        vec3 V = vec3(0.0, 0.0, 1.0);

        // Two directional lights — subtle cursor nudge (primary effect is wave deformation)
        vec2 mPos = (u_mouse * 2.0 - 1.0);
        vec3 L1 = normalize(vec3(
          mix(u_light1X, mPos.x * 0.5, u_mouseEnabled * 0.3),
          mix(u_light1Y, mPos.y * 0.5, u_mouseEnabled * 0.3),
          1.5
        ));
        vec3 L2 = normalize(vec3(
          mix(u_light2X, -mPos.x * 0.25, u_mouseEnabled * 0.3),
          mix(u_light2Y, -mPos.y * 0.25, u_mouseEnabled * 0.3),
          1.5
        ));

        // Diffuse (Lambertian)
        float diff1 = max(dot(N, L1), 0.0) * u_diffStr;
        float diff2 = max(dot(N, L2), 0.0) * u_diffStr;

        // Specular (Blinn-Phong)
        vec3 H1 = normalize(L1 + V);
        vec3 H2 = normalize(L2 + V);
        float spec1 = pow(max(dot(N, H1), 0.0), u_shininess) * u_specStr;
        float spec2 = pow(max(dot(N, H2), 0.0), u_shininess) * u_specStr;

        // Combine: dark base + two colored lights
        vec3 col = u_baseColor * u_ambient;
        col += u_lightColor1 * (diff1 + spec1);
        col += u_lightColor2 * (diff2 + spec2);

        // Modulate brightness by weave pattern (gives fiber-to-fiber contrast)
        if (u_texStr > 0.0) {
          float texMod = mix(1.0, weaveBright * 0.75 + 0.25, u_texStr);
          col *= texMod;
        }

        // Subtle tone-map to prevent harsh clipping
        col = col / (col + 0.6);
        col = pow(col, vec3(0.88)); // slight gamma lift

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },

  ocean: {
    label: 'Ocean',
    mouseInteractive: true,
    groups: [
      {
        name: 'Motion',
        items: [
          { key: 'u_speed', type: 'float', label: 'Speed', min: 0, max: 3, step: 0.05, default: 1.0 },
        ],
      },
      {
        name: 'Camera',
        items: [
          { key: 'u_mouseEnabled', type: 'toggle', label: 'Mouse Look',   default: 0    },
          { key: 'u_camYaw',       type: 'float',  label: 'Yaw',          min: -180, max: 180, step: 1,   default: 0    },
          { key: 'u_camPitch',     type: 'float',  label: 'Pitch',        min: -80,  max: 0,   step: 1,   default: -30  },
          { key: 'u_camHeight',    type: 'float',  label: 'Height',       min: 0.5,  max: 8,   step: 0.1, default: 2.0  },
        ],
      },
      {
        name: 'Water',
        items: [
          { key: 'u_waterDepth', type: 'float', label: 'Depth',      min: 0.5, max: 6,    step: 0.05,  default: 2.1   },
          { key: 'u_dragMult',   type: 'float', label: 'Wave Drag',  min: 0,   max: 0.15, step: 0.002, default: 0.048 },
          { key: 'u_waveScale',  type: 'float', label: 'Wave Scale',       min: 0.2, max: 3,    step: 0.05, default: 1.0  },
          { key: 'u_fresnelF0',  type: 'float', label: 'Base Reflectance', min: 0,   max: 0.5,  step: 0.01, default: 0.04 },
          { key: 'u_fresnelPow', type: 'float', label: 'Fresnel Falloff',  min: 1.0, max: 12.0, step: 0.1,  default: 5.0  },
        ],
      },
      {
        name: 'Quality',
        items: [
          { key: 'u_rayIter',  type: 'int', label: 'Raymarch Steps',     min: 3,  max: 30, step: 1, default: 13 },
          { key: 'u_normIter', type: 'int', label: 'Normal Detail (GPU)', min: 4,  max: 64, step: 1, default: 48 },
        ],
      },
      {
        name: 'Sun',
        items: [
          { key: 'u_sunAzimuth',   type: 'float', label: 'Azimuth',   min: -180, max: 180, step: 1, default: 45 },
          { key: 'u_sunElevation', type: 'float', label: 'Elevation', min: 1,    max: 89,  step: 1, default: 45 },
        ],
      },
      {
        name: 'Colors',
        items: [
          { key: 'u_waterColor', type: 'color', label: 'Deep Water Color', default: [0.0, 0.0, 0.0] },
          { key: 'u_skyTint',    type: 'color', label: 'Sky Tint',         default: [1.0, 1.0, 1.0] },
          { key: 'u_sunColor',   type: 'color', label: 'Sun Color',        default: [1.0, 1.0, 1.0] },
        ],
      },
    ],
    presets: [
      { label: 'Default',  uniforms: {} },
      { label: 'Sunset',   uniforms: { u_sunElevation: 8,   u_sunAzimuth: 30,  u_camPitch: -20, u_waterDepth: 3.0  } },
      { label: 'Stormy',   uniforms: { u_dragMult: 0.1,     u_waveScale: 1.5,  u_waterDepth: 4.0, u_speed: 1.5     } },
      { label: 'Calm',     uniforms: { u_dragMult: 0.015,   u_waveScale: 0.6,  u_speed: 0.4,  u_waterDepth: 1.5   } },
      { label: 'Overhead', uniforms: { u_camPitch: -70,     u_camHeight: 4.0,  u_waterDepth: 2.5               } },
    ],
    frag: /* glsl */`
      precision highp float;

      uniform float u_time, u_speed;
      uniform float u_camYaw, u_camPitch, u_camHeight, u_mouseEnabled;
      uniform float u_waterDepth, u_dragMult, u_waveScale;
      uniform float u_rayIter, u_normIter;
      uniform float u_sunAzimuth, u_sunElevation;
      uniform float u_fresnelF0, u_fresnelPow;
      uniform vec3  u_waterColor, u_skyTint, u_sunColor;
      uniform vec2  u_resolution, u_mouse;

      const float PI = 3.14159265359;

      // ── Sun direction from spherical angles ──────────────────────────────────
      vec3 getSunDir() {
        float az = u_sunAzimuth   * PI / 180.0;
        float el = u_sunElevation * PI / 180.0;
        return normalize(vec3(cos(el) * sin(az), sin(el), cos(el) * cos(az)));
      }

      // ── Gerstner-style wave derivative ───────────────────────────────────────
      vec2 wavedx(vec2 position, vec2 direction, float speed, float frequency, float timeshift) {
        float x    = dot(direction, position) * frequency + timeshift * speed;
        float wave = exp(sin(x) - 1.0);
        float dx   = wave * cos(x);
        return vec2(wave, -dx);
      }

      // ── Layered wave field ───────────────────────────────────────────────────
      float getwaves(vec2 position, int iterations) {
        float iter   = 0.0;
        float phase  = 6.0;
        float speed  = 2.0;
        float weight = 1.0;
        float w      = 0.0;
        float ws     = 0.0;
        for (int i = 0; i < 64; i++) {
          if (i >= iterations) break;
          vec2 p   = vec2(sin(iter), cos(iter));
          vec2 res = wavedx(position, p, speed, phase, u_time * u_speed);
          position += p * res.y * weight * u_dragMult;
          w        += res.x * weight;
          iter     += 12.0;
          ws       += weight;
          weight    = mix(weight, 0.0, 0.2);
          phase    *= 1.18;
          speed    *= 1.07;
        }
        return w / ws;
      }

      // ── Axis-angle rotation matrix ───────────────────────────────────────────
      mat3 rotmat(vec3 axis, float angle) {
        float s  = sin(angle);
        float c  = cos(angle);
        float oc = 1.0 - c;
        return mat3(
          oc*axis.x*axis.x + c,          oc*axis.x*axis.y - axis.z*s,  oc*axis.z*axis.x + axis.y*s,
          oc*axis.x*axis.y + axis.z*s,   oc*axis.y*axis.y + c,         oc*axis.y*axis.z - axis.x*s,
          oc*axis.z*axis.x - axis.y*s,   oc*axis.y*axis.z + axis.x*s,  oc*axis.z*axis.z + c
        );
      }

      // ── Camera ray (with optional mouse look) ────────────────────────────────
      vec3 getRay(vec2 uv) {
        uv = (uv * 2.0 - 1.0) * vec2(u_resolution.x / u_resolution.y, 1.0);
        vec3  proj  = normalize(vec3(uv.x, uv.y, 1.0) + vec3(uv.x, uv.y, -1.0) * pow(length(uv), 2.0) * 0.05);
        float yaw   = u_mouseEnabled > 0.5
          ? 3.0 * (u_mouse.x * 2.0 - 1.0)
          : u_camYaw   * PI / 180.0;
        float pitch = u_mouseEnabled > 0.5
          ? 1.5 * (u_mouse.y * 2.0 - 1.0)
          : u_camPitch * PI / 180.0;
        return rotmat(vec3(0.0, -1.0, 0.0), yaw)
             * rotmat(vec3(1.0,  0.0, 0.0), pitch)
             * proj;
      }

      // ── Ray-plane intersection ───────────────────────────────────────────────
      float intersectPlane(vec3 origin, vec3 direction, vec3 point, vec3 normal) {
        return clamp(dot(point - origin, normal) / dot(direction, normal), -1.0, 9991999.0);
      }

      // ── Raymarch to the wave surface ─────────────────────────────────────────
      float raymarchwater(vec3 camera, vec3 start, vec3 end) {
        vec3  pos = start;
        vec3  dir = normalize(end - start);
        float eps = 0.01;
        int   ri  = int(u_rayIter);
        for (int i = 0; i < 40; i++) {
          if (i >= ri) break;
          float h = getwaves(pos.xz * 0.1 * u_waveScale, ri) * u_waterDepth - u_waterDepth;
          float d = distance(pos, camera);
          if (h + eps * d > pos.y) return d;
          pos += dir * (pos.y - h);
        }
        return distance(end, camera);
      }

      // ── Surface normal via finite differences ────────────────────────────────
      vec3 calcNormal(vec2 xz, float e) {
        vec2  ex = vec2(e, 0.0);
        int   ni = int(u_normIter);
        float sc = 0.1 * u_waveScale;
        float H  = getwaves(xz         * sc, ni) * u_waterDepth;
        float hL = getwaves((xz - ex.xy) * sc, ni) * u_waterDepth;
        float hF = getwaves((xz + ex.yx) * sc, ni) * u_waterDepth;
        vec3 a = vec3(xz.x,     H,  xz.y    );
        vec3 b = vec3(xz.x - e, hL, xz.y    );
        vec3 c = vec3(xz.x,     hF, xz.y + e);
        return cross(normalize(a - b), normalize(a - c));
      }

      // ── Analytic atmosphere (Rayleigh + Mie approximation) ──────────────────
      vec3 extra_cheap_atmosphere(vec3 raydir, vec3 sundir) {
        sundir.y = max(sundir.y, -0.07);
        float special_trick  = 1.0 / (raydir.y * 1.0 + 0.1);
        float special_trick2 = 1.0 / (sundir.y * 11.0 + 1.0);
        float raysundt = pow(abs(dot(sundir, raydir)), 2.0);
        float sundt    = pow(max(0.0, dot(sundir, raydir)), 8.0);
        float mymie    = sundt * special_trick * 0.2;
        vec3 suncolor  = mix(vec3(1.0), max(vec3(0.0), vec3(1.0) - vec3(5.5, 13.0, 22.4) / 22.4), special_trick2);
        vec3 bluesky   = vec3(5.5, 13.0, 22.4) / 22.4 * suncolor;
        vec3 bluesky2  = max(vec3(0.0), bluesky - vec3(5.5, 13.0, 22.4) * 0.002 * (special_trick - 6.0 * sundir.y * sundir.y));
        bluesky2      *= special_trick * (0.24 + raysundt * 0.24);
        return bluesky2 * (1.0 + pow(1.0 - raydir.y, 3.0)) + mymie * suncolor;
      }

      vec3 getatm(vec3 ray, vec3 sundir) { return extra_cheap_atmosphere(ray, sundir) * 0.5 * u_skyTint; }

      float sun(vec3 ray, vec3 sundir) { return pow(max(0.0, dot(ray, sundir)), 528.0) * 110.0; }

      // ── ACES filmic tone mapping ─────────────────────────────────────────────
      vec3 aces_tonemap(vec3 color) {
        mat3 m1 = mat3(
          0.59719, 0.07600, 0.02840,
          0.35458, 0.90834, 0.13383,
          0.04823, 0.01566, 0.83777
        );
        mat3 m2 = mat3(
           1.60475, -0.10208, -0.00327,
          -0.53108,  1.10813, -0.07276,
          -0.07367, -0.00605,  1.07602
        );
        vec3 v = m1 * color;
        vec3 a = v * (v + 0.0245786) - 0.000090537;
        vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
        return pow(clamp(m2 * (a / b), 0.0, 1.0), vec3(1.0 / 2.2));
      }

      void main() {
        vec2 uv     = gl_FragCoord.xy / u_resolution;
        vec3 sundir = getSunDir();
        vec3 orig   = vec3(0.0, u_camHeight, 0.0);
        vec3 ray    = getRay(uv);

        // ── Sky ───────────────────────────────────────────────────────────────
        if (ray.y >= -0.01) {
          vec3 C = getatm(ray, sundir) * 2.0 + sun(ray, sundir) * u_sunColor;
          gl_FragColor = vec4(aces_tonemap(C), 1.0);
          return;
        }

        // ── Intersect bounding planes (ceiling y=0, floor y=-depth) ───────────
        float hihit = intersectPlane(orig, ray, vec3(0.0,             0.0, 0.0), vec3(0.0, 1.0, 0.0));
        float lohit = intersectPlane(orig, ray, vec3(0.0, -u_waterDepth, 0.0), vec3(0.0, 1.0, 0.0));
        vec3  hipos = orig + ray * hihit;
        vec3  lopos = orig + ray * lohit;

        // ── Raymarch the wave surface ─────────────────────────────────────────
        float dist = raymarchwater(orig, hipos, lopos);
        vec3  pos  = orig + ray * dist;

        // ── Shading: Fresnel + sky reflection ─────────────────────────────────
        vec3  N       = calcNormal(pos.xz, 0.001);
        // Blur normals at distance to suppress aliasing
        N             = mix(vec3(0.0, 1.0, 0.0), N, 1.0 / (dist * dist * 0.01 + 1.0));
        vec3  R       = reflect(ray, N);
        float fresnel = u_fresnelF0 + (1.0 - u_fresnelF0) * pow(1.0 - max(0.0, dot(-N, ray)), u_fresnelPow);

        vec3 skyRefl = getatm(R, sundir) * 2.0 + sun(R, sundir) * u_sunColor;
        vec3 C = mix(u_waterColor, skyRefl, fresnel);
        gl_FragColor = vec4(aces_tonemap(C), 1.0);
      }
    `,
  },

  organicLines: {
    label: 'Organic Lines',
    mouseInteractive: true,
    groups: [
      {
        name: 'Line Configuration',
        items: [
          { key: 'u_lineDensity',   type: 'float',  label: 'Line Count / Density', min: 1.0,  max: 30.0, step: 0.5,  default: 6.5  },
          { key: 'u_lineProximity', type: 'float',  label: 'Line Proximity',       min: 0.2,  max: 5.0,  step: 0.1,  default: 1.0  },
          { key: 'u_glowSharp',     type: 'float',  label: 'Line Thickness',       min: 0.01, max: 0.5,  step: 0.01, default: 0.06 },
          { key: 'u_glowSpread',    type: 'float',  label: 'Line Glow Radian',     min: 0.1,  max: 5.0,  step: 0.1,  default: 3.5  },
        ],
      },
      {
        name: 'Fluid Dynamics',
        items: [
          { key: 'u_scale',         type: 'float',  label: 'Global Zoom/Scale',    min: 0.5,  max: 4.0,  step: 0.05, default: 1.8  },
          { key: 'u_amplitude',     type: 'float',  label: 'Distortion Force',     min: 0.1,  max: 3.0,  step: 0.05, default: 1.5  },
          { key: 'u_speed',         type: 'float',  label: 'Flow Speed',           min: 0.0,  max: 3.0,  step: 0.05, default: 0.6  },
        ],
      },
      {
        name: 'Gradient Weights',
        items: [
          { key: 'u_bgWeight',      type: 'float',  label: 'Background Spread',    min: 0.0,  max: 2.0,  step: 0.05, default: 1.0  },
          { key: 'u_baseWeight',    type: 'float',  label: 'Mid-Tone Spread',      min: 0.0,  max: 2.0,  step: 0.05, default: 1.0  },
          { key: 'u_accentWeight',  type: 'float',  label: 'Bright Core Spread',   min: 0.0,  max: 2.0,  step: 0.05, default: 1.0  },
        ],
      },
      {
        name: 'Color Palette',
        items: [
          { key: 'u_bgColor',       type: 'color',  label: 'Deep Base',                                      default: [0.01, 0.02, 0.04] },
          { key: 'u_baseColor',     type: 'color',  label: 'Line Mid-Tone',                                  default: [0.0, 0.35, 0.75] },
          { key: 'u_accentColor',   type: 'color',  label: 'Line Glow Aura',                                 default: [0.0, 0.85, 0.95] },
          { key: 'u_highlightColor',type: 'color',  label: 'Line Core Highlight',                            default: [0.95, 1.0, 1.0]  },
        ],
      },
    ],
    presets: [
      { label: 'Electric Core',     uniforms: { u_lineDensity: 5.5, u_accentWeight: 1.6, u_baseWeight: 0.7 } },
      { label: 'Ghostly Whispers',  uniforms: { u_lineDensity: 12.0, u_bgWeight: 1.8, u_accentWeight: 0.3 } },
      { label: 'Standard Fluid',    uniforms: {} },
      {
        label: 'Lava',
        uniforms: {
          u_lineDensity: 10.5, u_lineProximity: 1.4, u_glowSharp: 0.14, u_glowSpread: 3.6,
          u_scale: 1.2, u_amplitude: 1.1, u_speed: 0.6,
          u_bgWeight: 1, u_baseWeight: 1.1, u_accentWeight: 2,
          u_bgColor: [0.01, 0.02, 0.04],
          u_baseColor: [0.3686274509803922, 0, 0.00784313725490196],
          u_accentColor: [0.9411764705882353, 0.10196078431372549, 0.00784313725490196],
          u_highlightColor: [0.9882352941176471, 0.5607843137254902, 0.13725490196078433],
        },
      },
    ],
    frag: /* glsl */`
      precision highp float;

      uniform float u_time, u_speed, u_scale, u_amplitude;
      uniform float u_lineDensity, u_lineProximity, u_glowSharp, u_glowSpread;
      uniform float u_bgWeight, u_baseWeight, u_accentWeight;
      uniform vec2  u_resolution;
      uniform vec2  u_mouse;
      uniform float u_mouseEnabled, u_mouseRadius, u_mouseStr;
      uniform vec3  u_bgColor, u_baseColor, u_accentColor, u_highlightColor;

      vec2 hash(vec2 p) {
        p = vec2(dot(p, vec2(142.1, 281.7)), dot(p, vec2(239.5, 123.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }

      float noise2D(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(dot(hash(i + vec2(0.0,0.0)), f - vec2(0.0,0.0)), 
                      dot(hash(i + vec2(1.0,0.0)), f - vec2(1.0,0.0)), u.x),
                  mix(dot(hash(i + vec2(0.0,1.0)), f - vec2(0.0,1.0)), 
                      dot(hash(i + vec2(1.0,1.0)), f - vec2(1.0,1.0)), u.x), u.y);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy / u_resolution.xy - 0.5) * u_scale;
        float aspect = u_resolution.x / u_resolution.y;
        uv.x *= aspect;

        float t = u_time * u_speed;

        // ── Interactive Mouse Space Warp ────────────────────────────────────────
        if (u_mouseEnabled > 0.5) {
          vec2 mUV = (u_mouse - 0.5) * u_scale;
          mUV.x *= aspect;
          vec2 toMouse = uv - mUV;
          float dist = length(toMouse);
          float dInfluence = exp(-pow(dist / u_mouseRadius, 2.0));
          uv += normalize(toMouse + vec2(0.001)) * dInfluence * u_mouseStr;
        }

        // ── Layer 1: Base Vector Flow Field ─────────────────────────────────────
        vec2 flowOffset = vec2(
          noise2D(uv * 2.5 + vec2(t * 0.2, t * 0.15)),
          noise2D(uv * 2.5 - vec2(t * 0.15, t * 0.2))
        ) * u_amplitude;

        // ── Layer 2: Deep Domain Warping ────────────────────────────────────────
        vec2 warpedUV = uv + flowOffset;
        
        float n1 = noise2D(warpedUV * 1.2 + vec2(sin(t * 0.2), cos(t * 0.15)));
        float n2 = noise2D(warpedUV * 2.0 - vec2(cos(t * 0.1), sin(t * 0.2)));
        float fluidPattern = mix(n1, n2, 0.4);

        // ── Density & Proximity Processing ──────────────────────────────────────
        float baseWaves = sin(fluidPattern * u_lineDensity + t);
        float lineField = sign(baseWaves) * pow(abs(baseWaves), 1.0 / max(u_lineProximity, 0.01));
        float fieldVal = abs(lineField);

        // ── Structural Mask Interpolations ──────────────────────────────────────
        float crispVein = smoothstep(u_glowSharp, 0.0, fieldVal);
        float lineGlow = exp(-fieldVal * (10.0 / u_glowSpread));

        // ── Weight Adjusted Color Gradient Construction ─────────────────────────
        // Modulate masks with our control weight variables before blending
        float bgMask = clamp((1.0 - lineGlow) * u_bgWeight, 0.0, 1.0);
        float midMask = clamp(lineGlow * u_baseWeight, 0.0, 1.0);
        float coreMask = clamp(crispVein * u_accentWeight, 0.0, 1.0);

        // Progressive smooth interpolation across the color values
        vec3 col = mix(u_baseColor, u_bgColor, bgMask);
        col = mix(col, u_accentColor, midMask);
        col = mix(col, u_highlightColor, coreMask);

        // Safe tone mapping curve processing
        col = col / (col + 0.4); 

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },

  

  // ── Fluid ────────────────────────────────────────────────────────────────
  fluid: {
    label: 'Fluid',

    groups: [
      {
        name: 'Motion',
        items: [
          { key: 'u_speed',      type: 'float', label: 'Speed',         min: 0,    max: 2,   step: 0.01, default: 0.18 },
          { key: 'u_rotation',   type: 'float', label: 'Rotation',      min: -1,   max: 1,   step: 0.01, default: 0.06 },
        ],
      },
      {
        name: 'Geometry',
        items: [
          { key: 'u_ringRadius', type: 'float', label: 'Ring Radius',   min: 0.1,  max: 0.9, step: 0.01, default: 0.38 },
          { key: 'u_ringWidth',  type: 'float', label: 'Ring Width',    min: 0.001,max: 0.05,step: 0.001,default: 0.006},
          { key: 'u_ringGlow',   type: 'float', label: 'Ring Glow',     min: 0,    max: 0.2, step: 0.002,default: 0.04 },
          { key: 'u_tiltAngle',  type: 'float', label: 'Tilt Axis',     min: -180, max: 180, step: 1,    default: 0    },
          { key: 'u_tiltAmount', type: 'float', label: 'Tilt Amount',   min: 0,    max: 0.97,step: 0.01, default: 0    },
          { key: 'u_beamAngle',  type: 'float', label: 'Beam Angle',    min: -180, max: 180, step: 1,    default: -42  },
          { key: 'u_beamWidth',  type: 'float', label: 'Beam Width',    min: 0.001,max: 0.05,step: 0.001,default: 0.004},
          { key: 'u_beamGlow',   type: 'float', label: 'Beam Glow',     min: 0,    max: 0.3, step: 0.005,default: 0.07 },
        ],
      },
      {
        name: 'Flares & Smoke',
        items: [
          { key: 'u_flareCount',       type: 'int',   label: 'Flare Count',       min: 1,   max: 8,    step: 1,    default: 2    },
          { key: 'u_flareStr',         type: 'float', label: 'Flare Strength',    min: 0,   max: 3,    step: 0.05, default: 1.2  },
          { key: 'u_flareSpike',       type: 'float', label: 'Flare Spikes',      min: 0,   max: 1,    step: 0.01, default: 0.5  },
          { key: 'u_glareAmount',      type: 'float', label: 'Glare Amount',      min: 0,   max: 0.3,  step: 0.005,default: 0.08 },
          { key: 'u_smokeStr',         type: 'float', label: 'Smoke Strength',    min: 0,   max: 2,    step: 0.05, default: 0.5  },
          { key: 'u_smokeDissipation', type: 'float', label: 'Smoke Dissipation', min: 0.5, max: 15,   step: 0.1,  default: 4.0  },
          { key: 'u_smokeRingAffect',  type: 'float', label: 'Smoke → Ring',      min: 0,   max: 5,    step: 0.1,  default: 1.5  },
          { key: 'u_glareRingAffect',  type: 'float', label: 'Glare → Ring',      min: 0,   max: 5,    step: 0.1,  default: 1.0  },
        ],
      },
      {
        name: 'Ripple',
        items: [
          { key: 'u_rippleSpeed',     type: 'float', label: 'Ripple Speed',     min: 0,    max: 3,   step: 0.01, default: 0.8  },
          { key: 'u_rippleDir',       type: 'float', label: 'Direction',        min: -1,   max: 1,   step: 0.01, default: 1.0  },
          { key: 'u_rippleThickness', type: 'float', label: 'Ripple Thickness', min: 0.001,max: 0.05,step: 0.001,default: 0.008},
          { key: 'u_rippleFade',      type: 'float', label: 'Ripple Fade',      min: 0.5,  max: 8,   step: 0.1,  default: 3.0  },
          { key: 'u_rippleCount',     type: 'int',   label: 'Ripple Count',     min: 1,    max: 6,   step: 1,    default: 3    },
          { key: 'u_rippleStr',       type: 'float', label: 'Ripple Strength',  min: 0,    max: 2,   step: 0.05, default: 0.5  },
        ],
      },
      {
        name: 'Colors',
        items: [
          {
            key: '_fluidcols', type: 'colors', label: 'Light Colors',
            keys: ['u_color1', 'u_color2'],
            sublabels: ['Color A', 'Color B'],
            defaults: [[1.0, 0.08, 0.12], [0.05, 0.35, 1.0]],
          },
          { key: 'u_bgBrightness', type: 'float', label: 'Bg Brightness', min: 0, max: 1, step: 0.01, default: 0.22 },
          { key: 'u_glowStr',      type: 'float', label: 'Ambient Glow',  min: 0, max: 2, step: 0.05, default: 0.7  },
        ],
      },
    ],

    presets: [
      { label: 'Default', uniforms: {} },
      {
        label: 'Crimson Blue',
        uniforms: {
          u_color1: [1.0, 0.08, 0.12], u_color2: [0.05, 0.35, 1.0],
          u_bgBrightness: 0.22, u_glowStr: 0.7,
        },
      },
      {
        label: 'Gold Teal',
        uniforms: {
          u_color1: [1.0, 0.7, 0.0], u_color2: [0.0, 0.85, 0.75],
          u_bgBrightness: 0.18, u_glowStr: 0.6,
        },
      },
      {
        label: 'Violet White',
        uniforms: {
          u_color1: [0.75, 0.2, 1.0], u_color2: [0.9, 0.9, 1.0],
          u_bgBrightness: 0.15, u_glowStr: 0.5,
        },
      },
      {
        label: 'Neon Green',
        uniforms: {
          u_color1: [0.1, 1.0, 0.3], u_color2: [0.0, 0.5, 1.0],
          u_bgBrightness: 0.12, u_glowStr: 0.8,
        },
      },
    ],

    frag: /* glsl */`
      precision highp float;
      uniform float u_time, u_speed, u_rotation;
      uniform float u_ringRadius, u_ringWidth, u_ringGlow;
      uniform float u_tiltAngle, u_tiltAmount;
      uniform float u_beamAngle,  u_beamWidth,  u_beamGlow;
      uniform float u_flareStr, u_flareSpike, u_flareCount;
      uniform float u_glareAmount, u_smokeStr, u_smokeDissipation;
      uniform float u_smokeRingAffect, u_glareRingAffect;
      uniform float u_bgBrightness, u_glowStr;
      uniform float u_rippleSpeed, u_rippleThickness, u_rippleFade, u_rippleCount, u_rippleStr, u_rippleDir;
      uniform vec2  u_resolution;
      uniform vec3  u_color1, u_color2;

      const float PI = 3.14159265359;

      // Soft line: distance from a line through origin at angle 'ang' (radians)
      float beamDist(vec2 uv, float ang) {
        vec2 dir = vec2(cos(ang), sin(ang));
        return abs(dot(uv, vec2(-dir.y, dir.x)));
      }

      // ── Noise helpers for smoke ──────────────────────────────────────────
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float vnoise(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                   mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
      }
      float smokeNoise(vec2 p){
        return 0.5*vnoise(p)+0.3*vnoise(p*2.1+1.7)+0.2*vnoise(p*4.3+3.1);
      }

      // Star-burst / lens spike
      float flare(vec2 d, float size) {
        float r   = length(d);
        float ang = atan(d.y, d.x);
        float spikes = abs(cos(ang * 2.0)) * u_flareSpike;
        float core   = exp(-r * 18.0 / size);
        float halo   = exp(-r *  6.0 / size) * 0.3;
        float spike  = exp(-(r - spikes * size * 0.25) * 20.0 / size) * 0.6 * spikes;
        return core + halo + spike;
      }

      // Wispy animated smoke cloud around a flare center
      float smokeAt(vec2 d, float t) {
        float dist = length(d);
        vec2  dir  = dist > 0.0001 ? normalize(d) : vec2(1.0, 0.0);
        vec2  sp   = d * 3.5 + dir * t * 0.12;
        float n    = smokeNoise(sp);
        return exp(-dist * u_smokeDissipation) * (0.35 + 0.65 * n);
      }

      // Soft glare disc
      float glareAt(vec2 d) {
        return exp(-length(d) / max(u_glareAmount, 0.0001));
      }

      void main() {
        vec2 fc = gl_FragCoord.xy / u_resolution;
        float asp = u_resolution.x / u_resolution.y;

        // Centered, aspect-corrected coords
        vec2 uv = vec2((fc.x - 0.5) * asp, fc.y - 0.5);

        float t = u_time * u_speed;

        // Slowly rotate everything
        float ra = t * u_rotation;
        float ca = cos(ra), sa = sin(ra);
        vec2 ruv = vec2(ca * uv.x - sa * uv.y, sa * uv.x + ca * uv.y);

        float r = length(ruv);

        // ── Tilt: squash ruv into an ellipse to simulate 3-D perspective ──────
        // Rotate to tilt axis, squash Y, rotate back.
        float tAng  = u_tiltAngle * PI / 180.0;
        float tc = cos(tAng), ts = sin(tAng);
        float squeeze = max(1.0 - u_tiltAmount, 0.03);
        // ruv in tilt-axis frame
        vec2 tuvLocal = vec2( tc * ruv.x + ts * ruv.y,
                             -ts * ruv.x + tc * ruv.y);
        // squash the axis-perpendicular component
        tuvLocal.y *= squeeze;
        float rt = length(tuvLocal);   // ellipse-space radius used for ring/ripple

        // ── Ring ──────────────────────────────────────────────────────────────
        float ringD    = abs(rt - u_ringRadius);
        float ringLine = smoothstep(u_ringWidth, 0.0, ringD);
        float ringHalo = exp(-ringD / max(u_ringGlow, 0.001)) * 0.4;
        float ring     = ringLine + ringHalo;

        // ── Diagonal beam (line through ring center) ───────────────────────────
        float bAng   = u_beamAngle * PI / 180.0;
        float bDist  = beamDist(ruv, bAng);
        float beam   = smoothstep(u_beamWidth, 0.0, bDist)
                     + exp(-bDist / max(u_beamGlow, 0.001)) * 0.35;

        // Attenuate ring far from beam line and beam far from ring for subtlety
        beam *= smoothstep(u_ringRadius + 0.05, 0.0, abs(rt - u_ringRadius * 0.5));

        // ── Flares + smoke + glare (N evenly spaced around ring) ─────────────
        float totalFlare = 0.0;
        float totalSmoke = 0.0;
        float totalGlare = 0.0;
        int   nFlares    = int(u_flareCount);
        // How close this pixel is to the ring line (for ring-affect boost)
        float ringProx   = exp(-ringD / max(u_ringGlow + 0.005, 0.001));
        for (int i = 0; i < 8; i++) {
          if (i >= nFlares) break;
          float fa = float(i) / float(nFlares) * 2.0 * PI;
          // Flare positions follow the ellipse
          vec2 fpLocal = vec2(cos(fa) * u_ringRadius, sin(fa) * u_ringRadius * squeeze);
          vec2 fp = vec2(tc * fpLocal.x - ts * fpLocal.y,
                         ts * fpLocal.x + tc * fpLocal.y);
          vec2  d  = ruv - fp;
          totalFlare += flare(d, 0.05) * u_flareStr;
          totalSmoke += smokeAt(d, u_time * u_speed) * u_smokeStr;
          totalGlare += glareAt(d) * u_glareAmount;
        }
        // Boost smoke and glare where they overlap the ring
        totalSmoke *= 1.0 + u_smokeRingAffect * ringProx;
        totalGlare *= 1.0 + u_glareRingAffect * ringProx;

        // ── Ripples emanating from ring ────────────────────────────────────────
        // u_rippleDir: +1 = outward, -1 = inward, 0 = both directions
        float ripple = 0.0;
        float numRipples = u_rippleCount;
        // Travel range: outward uses [radius, radius+0.6], inward uses [radius-0.4, radius]
        float outRange = 0.6;
        float inRange  = 0.4;
        for (int i = 0; i < 6; i++) {
          if (float(i) >= numRipples) break;
          float phase = float(i) / numRipples;
          float ripR, travel;
          if (u_rippleDir >= 0.0) {
            // Outward component
            float w = clamp(u_rippleDir, 0.0, 1.0);
            ripR   = u_ringRadius + mod(u_time * u_rippleSpeed + phase, 1.0) * outRange;
            travel = (ripR - u_ringRadius) / outRange;
            float fade = exp(-travel * u_rippleFade);
            float line = smoothstep(u_rippleThickness, 0.0, abs(rt - ripR));
            ripple += line * fade * w;
          }
          if (u_rippleDir <= 0.0) {
            // Inward component
            float w = clamp(-u_rippleDir, 0.0, 1.0);
            ripR   = u_ringRadius - mod(u_time * u_rippleSpeed + phase, 1.0) * inRange;
            travel = (u_ringRadius - ripR) / inRange;
            float fade = exp(-travel * u_rippleFade);
            float line = smoothstep(u_rippleThickness, 0.0, abs(rt - ripR));
            ripple += line * fade * w;
          }
        }
        ripple *= u_rippleStr;

        // ── Background volumetric glow (sweeping beams) ───────────────────────
        float bg = 0.0;
        bg += exp(-beamDist(ruv, bAng)           / 0.18) * 0.5;
        bg += exp(-beamDist(ruv, bAng + PI * 0.5)/ 0.22) * 0.3;
        bg += exp(-r / 0.55) * 0.4;                        // radial centre glow
        bg *= u_bgBrightness;

        // ── Color mixing ───────────────────────────────────────────────────────
        // Color A comes from top-left (-x, +y), color B from bottom-right
        float blend = clamp(dot(normalize(ruv + vec2(0.001)), vec2(-0.707, 0.707)) * 0.5 + 0.5, 0.0, 1.0);
        vec3 lightCol = mix(u_color2, u_color1, blend);

        // Background gradient
        vec3 col = lightCol * bg * u_glowStr;

        // Ring, beam, ripples, smoke, glare and flares all inherit light color
        col += lightCol * ring        * u_glowStr;
        col += lightCol * beam        * u_glowStr;
        col += lightCol * ripple      * u_glowStr;
        col += lightCol * totalSmoke;
        col += lightCol * totalGlare;
        col += lightCol * totalFlare;

        // White-hot core at flare centres
        col += vec3(1.0) * totalFlare * 0.25;

        // Tone-map & gamma
        col  = col / (col + 0.5);
        col  = pow(max(col, vec3(0.0)), vec3(0.85));

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },

  // ─────────────────────────────────────────────────────────────────────────────
// ADD THIS TO THE EFFECTS OBJECT IN src/lib/shaders.js
//
// Requires the mouse-aware ShaderBackground.vue (from the fluid-shader update).
// u_mouse and u_mouseVel are injected automatically by the component.
// ─────────────────────────────────────────────────────────────────────────────

lightWaves: {
  label: 'Light Waves',

  // Enables mouse tracking in ShaderBackground.vue
  mouseInteractive: true,

  groups: [
    {
      name: 'Motion',
      items: [
        { key: 'u_speed',       type: 'float', label: 'Speed',          min: 0,    max: 2,   step: 0.01, default: 0.35 },
        { key: 'u_followSpeed', type: 'float', label: 'Follow Speed',   min: 0.01, max: 1,   step: 0.01, default: 0.06 },
      ],
    },
    {
      name: 'Shape',
      items: [
        { key: 'u_size',        type: 'float', label: 'Size',           min: 0.1,  max: 1.2, step: 0.01, default: 0.52 },
        { key: 'u_softness',    type: 'float', label: 'Edge Softness',  min: 0.01, max: 0.5, step: 0.01, default: 0.18 },
        { key: 'u_distort',     type: 'float', label: 'Distortion',     min: 0,    max: 1.5, step: 0.01, default: 0.55 },
        { key: 'u_complexity',  type: 'float', label: 'Complexity',     min: 0.5,  max: 6,   step: 0.1,  default: 2.2  },
        { key: 'u_detail',      type: 'float', label: 'Detail',         min: 0.3,  max: 0.9, step: 0.01, default: 0.6  },
        { key: 'u_layers',      type: 'int',   label: 'Noise Layers',   min: 1,    max: 6,   step: 1,    default: 4    },
        { key: 'u_squish',      type: 'float', label: 'Squish',         min: 0.3,  max: 2.0, step: 0.01, default: 1.0  },
      ],
    },
    {
      name: 'Glow',
      items: [
        { key: 'u_glowWidth',   type: 'float', label: 'Glow Width',     min: 0,    max: 1,   step: 0.01, default: 0.38 },
        { key: 'u_glowStr',     type: 'float', label: 'Glow Strength',  min: 0,    max: 3,   step: 0.05, default: 1.1  },
        { key: 'u_innerGlow',   type: 'float', label: 'Inner Glow',     min: 0,    max: 1,   step: 0.01, default: 0.3  },
        { key: 'u_opacity',     type: 'float', label: 'Opacity',        min: 0,    max: 1,   step: 0.01, default: 1.0  },
      ],
    },
    {
      name: 'Colors',
      items: [
        { key: 'u_bgColor',     type: 'color', label: 'Background',     default: [0.04, 0.04, 0.06] },
        { key: 'u_baseColor',   type: 'color', label: 'Base',           default: [0.06, 0.06, 0.14] },
        { key: 'u_accentColor', type: 'color', label: 'Accent',         default: [0.40, 0.60, 1.00] },
        { key: 'u_glowColor',   type: 'color', label: 'Glow',           default: [0.55, 0.75, 1.00] },
      ],
    },
  ],

  presets: [
    { label: 'Default',   uniforms: {} },
    {
      label: 'Midnight',
      uniforms: {
        u_bgColor: [0.02, 0.02, 0.05], u_baseColor: [0.04, 0.04, 0.12],
        u_accentColor: [0.3, 0.5, 1.0], u_glowColor: [0.5, 0.7, 1.0],
        u_glowStr: 1.4, u_size: 0.55,
      },
    },
    {
      label: 'Ember',
      uniforms: {
        u_bgColor: [0.04, 0.01, 0.01], u_baseColor: [0.1, 0.03, 0.01],
        u_accentColor: [1.0, 0.35, 0.05], u_glowColor: [1.0, 0.6, 0.1],
        u_glowStr: 1.3, u_distort: 0.7, u_speed: 0.45,
      },
    },
    {
      label: 'Aura',
      uniforms: {
        u_bgColor: [0.02, 0.0, 0.05], u_baseColor: [0.06, 0.02, 0.12],
        u_accentColor: [0.8, 0.2, 1.0], u_glowColor: [1.0, 0.5, 1.0],
        u_glowStr: 1.5, u_glowWidth: 0.45, u_innerGlow: 0.4,
      },
    },
    {
      label: 'Ice',
      uniforms: {
        u_bgColor: [0.02, 0.04, 0.08], u_baseColor: [0.04, 0.08, 0.16],
        u_accentColor: [0.6, 0.9, 1.0], u_glowColor: [0.9, 1.0, 1.0],
        u_softness: 0.25, u_glowStr: 0.9, u_speed: 0.2,
      },
    },
    {
      label: 'Toxic',
      uniforms: {
        u_bgColor: [0.01, 0.04, 0.01], u_baseColor: [0.02, 0.08, 0.02],
        u_accentColor: [0.2, 1.0, 0.2], u_glowColor: [0.6, 1.0, 0.3],
        u_glowStr: 1.6, u_distort: 0.8, u_complexity: 3.0,
      },
    },
    {
      label: 'Ghost',
      uniforms: {
        u_bgColor: [0.0, 0.0, 0.0], u_baseColor: [0.05, 0.05, 0.05],
        u_accentColor: [0.9, 0.9, 1.0], u_glowColor: [1.0, 1.0, 1.0],
        u_softness: 0.28, u_glowStr: 0.7, u_innerGlow: 0.15, u_opacity: 0.85,
      },
    },
  ],

  frag: /* glsl */`
    precision highp float;

    uniform float u_time, u_speed, u_followSpeed;
    uniform float u_size, u_softness, u_distort, u_complexity, u_detail, u_squish;
    uniform float u_glowWidth, u_glowStr, u_innerGlow, u_opacity;
    uniform float u_layers;
    uniform vec2  u_resolution, u_mouse, u_mouseVel;
    uniform vec3  u_bgColor, u_baseColor, u_accentColor, u_glowColor;

    // ── Noise ─────────────────────────────────────────────────────────────────
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i),           hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y
      );
    }
    float fbm(vec2 p, float d, int oct) {
      float v = 0.0, a = 0.5, fr = 1.0;
      for (int i = 0; i < 6; i++) {
        if (i >= oct) break;
        v += a * noise(p * fr);
        fr *= 2.0; a *= d;
      }
      return v;
    }

    // ── Organic blob SDF ──────────────────────────────────────────────────────
    // Returns a 0–1 "inside-ness" value for the neural shape.
    // The boundary is perturbed by layered FBM noise for the organic look.
    float blobField(vec2 uv, vec2 center, float t, float asp) {
      // Aspect-corrected distance from the blob center
      vec2 d = (uv - center) * vec2(asp, 1.0) * vec2(1.0, u_squish);

      // Base radial distance
      float r = length(d);
      float angle = atan(d.y, d.x);

      // Angular noise — makes the boundary wavy and organic
      float angularNoise = fbm(
        vec2(cos(angle) * u_complexity, sin(angle) * u_complexity) + t * 0.4,
        u_detail,
        int(u_layers)
      );

      // Radial noise — adds large-scale lumps
      float radialNoise = fbm(
        d * u_complexity * 0.7 + t * 0.3,
        u_detail,
        int(u_layers)
      );

      // Combine: boundary is the size radius ± noise perturbation
      float boundary = u_size + u_distort * (angularNoise - 0.5) * 0.5
                              + u_distort * (radialNoise  - 0.5) * 0.25;

      // Smooth step from outside → inside around the boundary
      return smoothstep(boundary + u_softness, boundary - u_softness, r);
    }

    void main() {
      vec2 uv  = gl_FragCoord.xy / u_resolution;
      float asp = u_resolution.x / u_resolution.y;
      float t  = u_time * u_speed;

      // ── Blob center follows mouse (with lag from u_followSpeed) ─────────────
      // The actual lerp happens in JS (ShaderBackground smoothMouse).
      // Here we just use u_mouse directly — it's already smoothed.
      // We offset the resting position to center of screen when no mouse data.
      vec2 center = u_mouse;

      // ── Evaluate the blob field ───────────────────────────────────────────
      float blob = blobField(uv, center, t, asp);

      // ── Edge / glow band ──────────────────────────────────────────────────
      // Derive a slightly larger field for the outer glow
      float blobOuter = blobField(uv, center, t * 0.97, asp * 1.0);
      float blobGlow  = blobField(
        uv, center, t * 1.03,
        asp
      );

      // Edge = ring just outside the blob boundary
      float edge = smoothstep(0.0, u_glowWidth, blob) * (1.0 - smoothstep(0.8, 1.0, blob));
      float outerGlow = smoothstep(0.0, u_glowWidth * 1.6, blobOuter) * (1.0 - blob);

      // Inner rim light
      float innerRim = (1.0 - smoothstep(0.6, 1.0, blob)) * blob * u_innerGlow;

      // ── Velocity-driven shimmer ────────────────────────────────────────────
      float velLen = length(u_mouseVel);
      float shimmer = velLen * 0.4 * blob;

      // ── Composite ─────────────────────────────────────────────────────────
      // 1. Start with background
      vec3 col = u_bgColor;

      // 2. Fill the blob with base color
      col = mix(col, u_baseColor, blob);

      // 3. Accent glow on the edge (outer halo)
      col += u_accentColor * outerGlow * u_glowStr;

      // 4. Sharp accent ring at boundary
      col += u_glowColor * edge * u_glowStr * 0.8;

      // 5. Inner rim
      col += u_accentColor * innerRim;

      // 6. Velocity shimmer (brightens blob when mouse moves fast)
      col += u_glowColor * shimmer;

      // ── Gamma + opacity ───────────────────────────────────────────────────
      col = pow(max(col, vec3(0.0)), vec3(0.9));
      gl_FragColor = vec4(col, u_opacity);
    }
  `,
},
}

// ─── Default config factory ────────────────────────────────────────────────────
// Returns a fresh config object with all defaults for a given effect key.
export function defaultConfig(effectKey) {
  const effect = EFFECTS[effectKey]
  if (!effect) return null
  const uniforms = {}
  for (const group of effect.groups) {
    for (const def of group.items) {
      if (def.type === 'colors') {
        def.keys.forEach((k, i) => { uniforms[k] = [...def.defaults[i]] })
      } else if (def.type === 'color') {
        uniforms[def.key] = [...def.default]
      } else if (def.type !== 'colors') {
        uniforms[def.key] = def.default
      }
    }
  }
  return { effect: effectKey, uniforms }
}

// ─── Merge preset into a config ────────────────────────────────────────────────
export function applyPreset(config, preset) {
  return {
    ...config,
    uniforms: { ...config.uniforms, ...preset.uniforms },
  }
}
