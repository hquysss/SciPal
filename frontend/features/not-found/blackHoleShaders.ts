export const ENDURANCE_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ENDURANCE_FRAGMENT_SHADER = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform float uReveal;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec4 tex = texture2D(uTexture, vUv);

    // Use true alpha channel from processed transparent PNG
    float alpha = tex.a;
    if (alpha < 0.02) discard;

    vec3 col = tex.rgb;

    // Boost base brightness so the shadowed side doesn't vanish into the abyss
    col = pow(col, vec3(0.75)); // Lift shadows
    col += vec3(0.15, 0.18, 0.25) * (1.0 - col) * 0.8; // Cool ambient starlight

    // Directional illumination from Gargantua's fiery accretion disk
    float accretionFacing = smoothstep(0.1, 0.9, vUv.x * 0.75 - (vUv.y - 0.5) * 0.35);
    vec3 goldenLight = vec3(1.0, 0.88, 0.55) * accretionFacing * 0.55;
    col += goldenLight * max(tex.r, max(tex.g, tex.b));

    // RCS attitude control thruster flares (Interstellar blue engine glow)
    vec2 p = vUv - vec2(0.5);
    float dist = length(p);
    float angle = atan(p.y, p.x);
    float jetRing = smoothstep(0.50, 0.44, dist) * smoothstep(0.38, 0.45, dist);
    float jets = pow(max(0.0, cos(angle * 4.0)), 12.0);
    float jetFlicker = 0.7 + 0.3 * sin(uTime * 14.0 + angle * 3.0);
    vec3 blueJet = vec3(0.40, 0.82, 1.0) * jetRing * jets * jetFlicker * 3.5;
    col += blueJet;

    gl_FragColor = vec4(col * uReveal, alpha * uReveal);
  }
`;

/* ─── Particle Shaders for Swirling Gravitational Infall ─── */

export const PARTICLE_VERTEX_SHADER = `
  attribute float size;
  attribute vec3 customColor;
  attribute float alpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = customColor;
    vAlpha = alpha;
    gl_Position = vec4(position.xy, 0.0, 1.0);
    gl_PointSize = size;
  }
`;

export const PARTICLE_FRAGMENT_SHADER = `
  precision mediump float;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uReveal;
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    float glow = exp(-dist * dist * 9.5);
    float core = exp(-dist * dist * 32.0);
    vec3 col = vColor * glow + vec3(core * 0.70);
    gl_FragColor = vec4(col * (vAlpha * uReveal), glow * vAlpha * uReveal);
  }
`;

/* ─── Geodesic Raymarching Shader for Gargantua (Pure Abyss Void, Zero Artifacts) ─── */

export const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const FRAGMENT_SHADER = `
  precision highp float;

  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec2 uHoleCenter;
  uniform float uHoleRadius;
  uniform float uRoll;
  uniform float uIncl;
  uniform sampler2D uTextTexture;
  uniform vec2 uTextCenter;
  uniform vec2 uTextScale;
  uniform float uReveal;
  uniform vec2 uMouse;

  // ── Physics constants (Schwarzschild metric) ──
  #define B_CRIT 2.5980762
  #define LENS_DEPTH 13.5
  #define EXPOSURE 1.15
  #define N_STEPS 64

  // ── Continuous Noise & Hash (Zero Seam, Zero Moiré) ──
  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  // Procedural stars indexed by deflected ray direction
  vec3 stars(vec3 d) {
    vec2 sph = vec2(atan(d.x, -d.z), asin(clamp(d.y, -1.0, 1.0)));
    vec2 g = sph * 42.0;
    vec2 id = floor(g);
    float h = hash21(id);
    if (h < 0.92) return vec3(0.0);
    vec2 f = fract(g) - 0.5;
    vec2 off = (vec2(hash21(id + 17.3), hash21(id + 31.7)) - 0.5) * 0.7;
    float spark = smoothstep(0.12, 0.0, length(f - off));
    float tw = 0.7 + 0.3 * sin(uTime * (0.6 + 2.0 * hash21(id + 5.1)) + 40.0 * h);
    vec3 tint = mix(vec3(1.0, 0.82, 0.60), vec3(0.72, 0.82, 1.0), hash21(id + 2.9));
    return tint * spark * tw * ((h - 0.92) / 0.08) * 1.8;
  }

  // ACES Filmic Tone Mapping
  vec3 acesFilm(vec3 x) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    float aspect = uResolution.x / uResolution.y;

    // Hole center with subtle mouse parallax
    vec2 center = uHoleCenter + uMouse * vec2(0.015 / aspect, 0.012);
    vec2 p = (uv - center) * vec2(aspect, 1.0);

    // Shadow radius & scale mapping
    float rh = uHoleRadius;
    float W = B_CRIT / max(rh, 1e-4);

    // Rotate coordinates by system roll angle
    float cr = cos(uRoll), sr = sin(uRoll);
    vec2 pr = vec2(cr * p.x - sr * p.y, sr * p.x + cr * p.y) * W;
    float b = length(pr);

    float Z0 = 13.5;

    // =========================================================================
    // =========================================================================
    // LEAPFROG SCHWARZSCHILD GEODESIC INTEGRATION (64 STEPS)
    // =========================================================================
    vec3 x = vec3(pr, Z0);
    vec3 v = vec3(0.0, 0.0, -1.0);
    float h2 = dot(pr, pr);

    bool captured = false;

    for (int i = 0; i < N_STEPS; i++) {
      float r2 = dot(x, x);
      if (r2 < 1.0) { captured = true; break; }  // Entered event horizon
      if (x.z < -Z0 && v.z < 0.0) break;         // Fully escaped past background
      if (r2 > 4.0 * Z0 * Z0) break;             // Escaped sideways

      float r = sqrt(r2);
      float dt = clamp(0.12 * r, 0.035, 0.75);

      // Leapfrog integration
      vec3 a = -1.5 * h2 * x / (r2 * r2 * r);
      v += a * (0.5 * dt);
      x += v * dt;
      r2 = dot(x, x);
      r = sqrt(r2);
      a = -1.5 * h2 * x / (r2 * r2 * r);
      v += a * (0.5 * dt);
    }

    // ── Pure Pitch-Black Void Mask: ZERO light inside the event horizon shadow ──
    float shadowVoid = smoothstep(B_CRIT - 0.02, B_CRIT - 0.12, b);

    // ── Ultra-sharp Photon Ring accent at the edge of the shadow ──
    float bDiff = abs(b - B_CRIT);
    float photonCore = exp(-bDiff * bDiff * 900.0) * 4.5;
    float photonGlow = exp(-bDiff * bDiff * 70.0) * 1.5;
    vec3 ringColor = mix(vec3(1.0, 0.90, 0.75), vec3(1.0, 0.98, 1.0), clamp(photonCore / 4.5, 0.0, 1.0));
    vec3 ringLight = (photonCore * ringColor * 2.2 + photonGlow * vec3(1.0, 0.65, 0.28)) * uReveal * (1.0 - shadowVoid);

    // ── Background: Lensed 404 Text & Cosmic Starfield ──
    vec3 bg = vec3(0.0);
    if (!captured) {
      vec3 d = normalize(v);
      bg += stars(d) * uReveal;

      if (d.z < -0.05) {
        // Project ray onto background plane at z = -LENS_DEPTH
        float tpl = (-LENS_DEPTH - x.z) / d.z;
        vec3 hp = x + d * tpl;
        // Convert to screen coordinates
        vec2 q = vec2(cr * hp.x + sr * hp.y, -sr * hp.x + cr * hp.y) / W;
        vec2 suv = center + vec2(q.x / aspect, q.y);

        float toward = smoothstep(0.05, 0.35, -d.z);
        vec2 textUv = (suv - uTextCenter) / uTextScale + 0.5;
        if (textUv.x >= 0.0 && textUv.x <= 1.0 && textUv.y >= 0.0 && textUv.y <= 1.0) {
          vec4 textSample = texture2D(uTextTexture, textUv);
          bg += textSample.rgb * textSample.a * 0.75 * toward * uReveal;
        }
      }
    }

    vec3 col = captured ? vec3(0.0) : (bg + ringLight);
    col = acesFilm(col);

    gl_FragColor = vec4(col, 1.0);
  }
`;
