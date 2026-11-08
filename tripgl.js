// 🚢 유람선 · 🗼 남산타워 — 진짜 3D(WebGL, three.js) 화면. trip.js가 불러 쓴다(안 되면 trip.js의 2D 그림으로 돌아감).
// · 하늘: 오늘 밤 서울(북위 37.55°)에서 실제로 보이는 별 5,044개(밝기·색), 실제 은하수 모양, 지금 달의 위치와 위상, 도시 불빛에 물든 구름
//   별 자료: d3-celestial(Olaf Frohn, BSD-3-Clause)의 stars.6.json · mw.json → sky-stars.json · sky-mw.webp
// · 빛 번짐(블룸)·톤 매핑으로 불빛이 실제처럼 번지고, 강물은 실제로 주변을 비추는 반사면(물결에 일렁임)
// · 건물 창문은 셰이더로 그린다: 아파트(두 칸이 한 집, 계단실 불빛), 유리 오피스(층마다 켜진 사무실), 호텔. 멀어지면 평균 밝기로 섞여 깜빡임 없음
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Water } from "three/addons/objects/Water.js";

const TAU = Math.PI * 2, RAD = Math.PI / 180;
const LAT = 37.55 * RAD, LON = 126.98;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hash = n => { n = Math.imul(n ^ n >>> 16, 0x45d9f3b); n = Math.imul(n ^ n >>> 16, 0x45d9f3b); return ((n ^ n >>> 16) >>> 0) / 4294967296; };
const C3 = (r, g, b) => new THREE.Vector3(r, g, b);
// 색온도(K) → 선형 RGB(대략)
function kelvin(k) {
  const t = k / 100; let r, g, b;
  r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -.1332);
  g = t <= 66 ? 99.47 * Math.log(t) - 161.1 : 288.1 * Math.pow(t - 60, -.0755);
  b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5 * Math.log(t - 10) - 305;
  const f = v => Math.pow(clamp(v, 0, 255) / 255, 2.2);
  return [f(r), f(g), f(b)];
}

// ---------- 천문: 항성시, 달·해 위치 (suncalc 식, 1° 안팎) ----------
const J2000 = Date.UTC(2000, 0, 1, 12);
const daysJ = ms => (ms - J2000) / 864e5;
const lstDeg = ms => { const d = daysJ(ms); return ((280.46061837 + 360.98564736629 * d + LON) % 360 + 360) % 360; };
const OBL = 23.4397 * RAD;
function eclToEq(l, b) { return { ra: Math.atan2(Math.sin(l) * Math.cos(OBL) - Math.tan(b) * Math.sin(OBL), Math.cos(l)), dec: Math.asin(Math.sin(b) * Math.cos(OBL) + Math.cos(b) * Math.sin(OBL) * Math.sin(l)) }; }
function sunEq(ms) { const d = daysJ(ms), M = RAD * (357.5291 + .98560028 * d), C = RAD * (1.9148 * Math.sin(M) + .02 * Math.sin(2 * M) + .0003 * Math.sin(3 * M)); return eclToEq(M + C + RAD * 102.9372 + Math.PI, 0); }
function moonEq(ms) { const d = daysJ(ms), L = RAD * (218.316 + 13.176396 * d), M = RAD * (134.963 + 13.064993 * d), F = RAD * (93.272 + 13.22935 * d); return eclToEq(L + RAD * 6.289 * Math.sin(M), RAD * 5.128 * Math.sin(F)); }
// 적경·적위(라디안) → 동·북·위(ENU) 단위 벡터
function eqToEnu(ra, dec, lst) {
  const ha = lst - ra, x = Math.cos(dec) * Math.cos(ha), y = -Math.cos(dec) * Math.sin(ha), z = Math.sin(dec);
  return [y, -x * Math.sin(LAT) + z * Math.cos(LAT), x * Math.cos(LAT) + z * Math.sin(LAT)];
}

// ---------- 공통 셰이더 조각 ----------
const GL_COMMON = `
uniform float uCamS; uniform float uLen; uniform float uTime; uniform vec3 uHaze; uniform float uHazeD; uniform float uWin; uniform float uStyl;
// 유람선은 9.2km 물길을 빙빙 돈다: 물체 가운데(z)를 카메라 근처로 감싸 옮긴다(트립 좌표 z = -three z)
float wrapOff(float cz) { if (uLen <= 0.) return 0.; float tz = -cz; float tz2 = mod(tz - uCamS + 1200., uLen) - 1200. + uCamS; return -(tz2 - tz); }
float h13(vec3 p) { p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
`;
const NOISE = `
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453), b = fract(sin(dot(i + vec2(1, 0), vec2(127.1, 311.7))) * 43758.5453),
        c = fract(sin(dot(i + vec2(0, 1), vec2(127.1, 311.7))) * 43758.5453), d = fract(sin(dot(i + vec2(1, 1), vec2(127.1, 311.7))) * 43758.5453);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
float fbm(vec2 p) { float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * n2(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return s; }
`;
// 구름: 높이 1.6km 얇은 층, 도시 불빛을 아래에서 받아 주황빛. 별 셰이더도 같은 식으로 가려진다
const CLOUD = `
uniform float uCloud; uniform vec2 uWind;
float cloudAt(vec3 d) { if (d.y < .015) return 0.; vec2 p = d.xz / d.y * .9 + uWind; float c = fbm(p * .55) * .75 + fbm(p * 2.1 + 3.) * .35; return smoothstep(.62 - uCloud, .98 - uCloud * .6, c) * smoothstep(.015, .12, d.y); }
`;

export const T_DBG = {};
export async function create(o) {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", stencil: false }); }
  catch (e) { return null; }
  if (!renderer.capabilities.isWebGL2) { renderer.dispose(); return null; }
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const maxTex = renderer.capabilities.maxTextureSize, aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const phone = Math.min(screen.width, screen.height) < 700;

  // 하늘 자료
  const [starsArr, mwTex] = await Promise.all([
    fetch("/sky-stars.json").then(r => r.json()).catch(() => []),
    new Promise(res => new THREE.TextureLoader().load("/sky-mw.webp", t => res(t), undefined, () => res(null))),
  ]);
  if (mwTex) { mwTex.wrapS = THREE.RepeatWrapping; mwTex.colorSpace = THREE.NoColorSpace; mwTex.minFilter = THREE.LinearFilter; mwTex.generateMipmaps = false; }

  const U = {   // 모든 재질이 같이 쓰는 값
    uCamS: { value: 0 }, uLen: { value: 0 }, uTime: { value: 0 }, uHaze: { value: C3(.05, .035, .04) }, uHazeD: { value: 1 / 4000 },
    uEnu2W: { value: new THREE.Matrix3() }, uW2Enu: { value: new THREE.Matrix3() }, uLst: { value: 0 }, uLat: { value: LAT },
    uCloud: { value: -.12 }, uWind: { value: new THREE.Vector2() }, uPx: { value: 800 }, uDpr: { value: 1 },
    uMw: { value: mwTex }, uMoonDir: { value: new THREE.Vector3(0, -1, 0) }, uMoonUp: { value: 0 }, uWin: { value: .6 },
    uSky0: { value: C3(.0003, .0005, .0016) }, uSky1: { value: C3(.009, .006, .009) }, uStarK: { value: 1 }, uStyl: { value: 0 },
  };
  const uni = extra => Object.assign({}, U, extra || {});

  // ---------- 재질 ----------
  // 1) 하늘 돔: 빛공해 그라데이션 + 은하수(실제 위치) + 구름 + 달무리
  const skyMat = new THREE.ShaderMaterial({
    uniforms: uni(), depthWrite: false, depthTest: false, side: THREE.BackSide,
    vertexShader: `varying vec3 vD; void main() { vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }`,
    fragmentShader: GL_COMMON + NOISE + CLOUD + `
      uniform mat3 uW2Enu; uniform float uLst; uniform float uLat; uniform sampler2D uMw; uniform vec3 uMoonDir; uniform float uMoonUp; uniform vec3 uSky0; uniform vec3 uSky1; uniform float uStarK;
      varying vec3 vD;
      void main() {
        vec3 d = normalize(vD); vec3 e = uW2Enu * d; float alt = asin(clamp(e.z, -1., 1.));
        float h = max(alt, 0.);
        // 빛공해: 지평선은 주황·보라 빛, 위로 갈수록 깊은 남색
        vec3 col = mix(uSky1, uSky0, pow(smoothstep(0., 1.3, h), .42));
        col += uSky1 * .9 * exp(-h * 18.);
        // 은하수: 적경·적위로 바꿔 실제 은하수 지도에서 읽는다
        float sl = sin(uLat), cl = cos(uLat);
        float x = -e.y * sl + e.z * cl, z = e.y * cl + e.z * sl, y = e.x;
        float dec = asin(clamp(z, -1., 1.)), ha = atan(-y, x), ra = mod(uLst - ha, 6.2831853);
        float mw = texture2D(uMw, vec2(ra / 6.2831853, dec / 3.14159265 + .5)).r;
        float grain = .55 + .9 * fbm(vec2(ra, dec) * 9.);
        col += vec3(.7, .74, 1.) * mw * (mw * .7 + .3) * .1 * grain * smoothstep(.0, .35, h) * uStarK;
        // 달무리
        float md = max(dot(d, uMoonDir), 0.);
        col += vec3(.55, .6, .75) * uMoonUp * (pow(md, 900.) * .9 + pow(md, 60.) * .04 + pow(md, 8.) * .012);
        // 구름(도시 불빛을 받아 아래쪽이 주황)
        float c = cloudAt(d);
        vec3 cc = mix(vec3(.035, .022, .02), vec3(.012, .011, .016), smoothstep(.0, .6, h)) * (.7 + .5 * fbm(d.xz / max(d.y, .02) * 2.));
        cc += vec3(.5, .55, .7) * uMoonUp * pow(md, 6.) * .08;
        col = mix(col, cc, c * .7);
        if (alt < 0.) col = uSky1 * 1.2;
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  // 2) 별: 실제 별 목록. 밝기 = 10^(-0.4·등급), 색 = B-V. 지평선 근처는 대기에 흐려지고 더 반짝인다
  function starGeo() {
    // 실제 별 목록 + 맨눈 한계 근처의 희미한 별 4,000개(고르게 흩뿌림): "별 많고 어둡게 예쁘게"
    if (Array.isArray(starsArr) && starsArr.length) { const rr = rng(77); for (let i = 0; i < 4000; i++) starsArr.push(rr() * 360, Math.asin(rr() * 2 - 1) / RAD, 5.6 + rr() * 1.5, .1 + rr() * 1.3); }
    const n = starsArr.length / 4, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), mag = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const ra = starsArr[i * 4] * RAD, dec = starsArr[i * 4 + 1] * RAD, m = starsArr[i * 4 + 2], bv = starsArr[i * 4 + 3];
      pos[i * 3] = ra; pos[i * 3 + 1] = dec; pos[i * 3 + 2] = i;
      const T = 4600 * (1 / (.92 * bv + 1.7) + 1 / (.92 * bv + .62)), c = kelvin(clamp(T, 2600, 14000)), mx = Math.max(...c);
      col[i * 3] = c[0] / mx; col[i * 3 + 1] = c[1] / mx; col[i * 3 + 2] = c[2] / mx; mag[i] = m;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aCol", new THREE.BufferAttribute(col, 3)); g.setAttribute("aMag", new THREE.BufferAttribute(mag, 1));
    return g;
  }
  const starMat = new THREE.ShaderMaterial({
    uniforms: uni({ uRadius: { value: 1000 } }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: GL_COMMON + NOISE + CLOUD + `
      uniform mat3 uEnu2W; uniform float uLst; uniform float uLat; uniform float uRadius; uniform float uPx; uniform float uDpr; uniform float uStarK;
      attribute vec3 aCol; attribute float aMag; varying vec3 vC; varying float vA;
      void main() {
        float ra = position.x, dec = position.y, ha = uLst - ra;
        float x = cos(dec) * cos(ha), y = -cos(dec) * sin(ha), z = sin(dec);
        vec3 e = vec3(y, -x * sin(uLat) + z * cos(uLat), x * cos(uLat) + z * sin(uLat));
        vec3 d = uEnu2W * e;
        float alt = e.z;
        // 대기 감광(공기 질량)과 반짝임
        float air = 1. / max(alt + .05, .02), ext = exp(-.22 * (air - 1.));
        float tw = 1. + (.18 + .5 * smoothstep(.5, .05, alt)) * sin(uTime * (7. + h13(vec3(position.z, 1., 2.)) * 9.) + position.z);
        float b = pow(10., -.4 * (aMag - 1.)) * ext * tw * (1. - cloudAt(d) * .92) * uStarK;
        // 서울 빛공해: 어두운 별은 지평선 쪽에서 먼저 사라진다
        b *= smoothstep(-.02, .15, alt) * .7 + .3;
        float s = clamp(1.7 + sqrt(b) * 2.6, 1.7, 7.5) * uDpr;
        vA = pow(b, .5) * 2.1 + .08; vC = aCol;
        if (alt < -.02) vA = 0.;
        vec4 mv = modelViewMatrix * vec4(d * uRadius, 1.);
        gl_Position = projectionMatrix * mv; gl_PointSize = s;
      }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main() { vec2 p = gl_PointCoord - .5; float r = dot(p, p) * 4.; float a = exp(-r * 5.5); if (a < .01) discard; gl_FragColor = vec4(vC * vA * a, 1.); }`,
  });
  // 3) 빛 점: 가로등, 다리 조명, 차, 항공등, 먼 창문, 불꽃. 크기(m) → 화면 크기, 작아지면 밝기를 보존해 멀리서도 반짝
  //    aMove: (방향x, 방향z, 속도 m/s, 구간 길이) — 차는 구간을 따라 흐른다. aAnim: (종류, 위상, 깜빡 속도, 0) 종류 1=항공등 깜빡, 2=반짝임
  const ptMat = (wrap, extra) => new THREE.ShaderMaterial({
    uniforms: uni(Object.assign({ uWrap: { value: wrap ? 1 : 0 }, uMinPx: { value: 1.4 }, uBright: { value: 1 } }, extra)), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: GL_COMMON + `
      uniform float uPx; uniform float uDpr; uniform float uWrap; uniform float uMinPx; uniform float uBright;
      attribute vec3 aCol; attribute float aSize; attribute vec4 aMove; attribute vec4 aAnim; varying vec3 vC;
      void main() {
        vec3 p = position;
        if (aMove.z != 0.) { float u = mod(aAnim.y * aMove.w + uTime * aMove.z, aMove.w); p.x += aMove.x * u; p.z += aMove.y * u; }
        if (uWrap > .5) p.z += wrapOff(p.z);
        vec4 mv = modelViewMatrix * vec4(p, 1.); float dist = -mv.z;
        float px = aSize * uPx / max(dist, .1), s = max(px, uMinPx * uDpr);
        float k = (px * px) / (s * s); k = max(k, min(1., .05 + 1200. / (dist + 600.)) * .12);
        float on = 1.;
        if (aAnim.x > .5 && aAnim.x < 1.5) on = step(.35, sin(uTime * aAnim.z + aAnim.y * 6.28)) * .95 + .05;
        if (aAnim.x > 1.5) on = .75 + .25 * sin(uTime * aAnim.z + aAnim.y * 40.);
        vC = aCol * k * on * uBright * exp(-dist * uHazeD * .55);
        gl_Position = projectionMatrix * mv; gl_PointSize = min(s, 160.);
        if (dist < .3) gl_PointSize = 0.;
      }`,
    fragmentShader: `varying vec3 vC; void main() { vec2 p = gl_PointCoord - .5; float r = dot(p, p) * 4.; float a = exp(-r * 4.) + exp(-r * 30.) * 1.5; if (r > 1.) discard; gl_FragColor = vec4(vC * a, 1.); }`,
  });
  // 4) 구운(미리 칠한) 물체: 꼭짓점 색(빛 받은 정도까지 포함) + 공기 원근
  const bakedMat = (wrap, side) => new THREE.ShaderMaterial({
    uniforms: uni({ uWrap: { value: wrap ? 1 : 0 } }), side: side || THREE.DoubleSide,
    vertexShader: GL_COMMON + `uniform float uWrap; attribute vec3 aCol; attribute float aCZ; varying vec3 vC; varying float vDist;
      void main() { vec3 p = position; if (uWrap > .5) p.z += wrapOff(aCZ); vec4 mv = modelViewMatrix * vec4(p, 1.); vDist = -mv.z; vC = aCol; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: GL_COMMON + `varying vec3 vC; varying float vDist; void main() { float f = 1. - exp(-vDist * uHazeD); gl_FragColor = vec4(mix(vC, uHaze, f), 1.); }`,
  });
  // 5) 건물: 창문을 셰이더로. aInfo = (종류, 씨앗, 켜진 비율, 면: 0 넓은 면 1 좁은 면 2 지붕), aInfo2 = (높이, 꼭대기 조명 종류, 1층 상가, 0)
  const bldMat = wrap => new THREE.ShaderMaterial({
    uniforms: uni({ uWrap: { value: wrap ? 1 : 0 } }),
    side: THREE.DoubleSide,
    vertexShader: GL_COMMON + `uniform float uWrap; attribute vec2 aUv; attribute vec4 aInfo; attribute vec4 aInfo2; attribute float aCZ;
      varying vec2 vUv; varying vec4 vI; varying vec4 vI2; varying vec3 vWP; varying vec3 vN; varying float vDist;
      void main() { vec3 p = position; if (uWrap > .5) p.z += wrapOff(aCZ); vUv = aUv; vI = aInfo; vI2 = aInfo2; vN = normal; vec4 w = modelMatrix * vec4(p, 1.); vWP = w.xyz; vec4 mv = viewMatrix * w; vDist = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: GL_COMMON + `varying vec2 vUv; varying vec4 vI; varying vec4 vI2; varying vec3 vWP; varying vec3 vN; varying float vDist;
      vec3 winCol(float r, float type) {
        if (type > 1.5 && type < 2.5) return r < .7 ? vec3(1., .62, .3) : vec3(1., .82, .6);
        if (type > .5 && type < 1.5) return r < .72 ? vec3(.78, .88, 1.) : r < .92 ? vec3(1., .86, .66) : vec3(.6, .75, 1.);
        return r < .5 ? vec3(1., .58, .27) : r < .78 ? vec3(1., .76, .5) : r < .95 ? vec3(.86, .92, 1.) : vec3(.45, .6, 1.);
      }
      void main() {
        float type = vI.x, seed = vI.y, lit = vI.z, face = vI.w, H = vI2.x;
        vec3 V = normalize(cameraPosition - vWP); vec3 N = normalize(vN);
        float fres = pow(1. - clamp(abs(dot(V, N)), 0., 1.), 3.);
        vec3 col;
        if (face > 1.5) { col = uStyl > .5 ? vec3(.085, .07, .13) : uLen > 0. ? vec3(.006, .006, .008) : vec3(.026, .026, .034) * (.8 + .4 * h13(vec3(seed, 3., 1.))); }
        else {
          float fh = type < .5 ? 2.9 : type < 1.5 ? 3.9 : type < 2.5 ? 3.2 : 4.2;
          float ww = type < .5 ? 1.8 : type < 1.5 ? 1.5 : type < 2.5 ? 2.1 : 1.6;
          vec2 g = vec2(vUv.x / ww, vUv.y / fh), c = floor(g), f = fract(g), fw = fwidth(g);
          float far = smoothstep(.55, 1.3, max(fw.x, fw.y)) * (uLen > 0. ? 1. : .3);
          vec3 base, em = vec3(0.), avg;
          if (type < .5) {   // 아파트
            base = vec3(.008, .008, .01) + vec3(.02, .014, .01) * exp(-vUv.y * .08);
            if (face < .5) {
              float unit = floor(c.x / 2.), hU = h13(vec3(unit, c.y, seed)), on = step(hU, lit);
              float r = h13(vec3(unit, c.y, seed + 7.)), br = (.25 + .75 * h13(vec3(unit, c.y, seed + 3.))) * uWin;
              vec3 wc = winCol(r, 0.);
              float m = step(.07, f.x) * step(f.x, .93) * step(.2, f.y) * step(f.y, .86);
              float curtain = h13(vec3(c.x, c.y, seed + 11.)) < .35 ? .45 : 1.;
              if (r > .95) br *= .7 + .3 * sin(uTime * 3. + unit * 7.);
              em = wc * br * on * m * curtain * vec3(1.) * (.75 + .25 * f.y);
              base += vec3(.03, .03, .035) * (step(f.y, .1) * step(.05, f.y));   // 발코니 난간
              base = mix(base, vec3(.012, .013, .02), m * (1. - on));
              avg = vec3(1., .66, .38) * .62 * lit * .6 * uWin;
            } else {   // 좁은 면: 계단실 불빛 한 줄
              float mid = abs(vUv.x - vI2.w * .5) < .9 ? 1. : 0.;
              float on = step(h13(vec3(7., c.y, seed)), .82);
              em = vec3(.75, .82, .9) * .45 * mid * on * step(.25, f.y) * step(f.y, .7) * uWin;
              avg = vec3(.75, .82, .9) * .02 * uWin;
            }
            if (vUv.y < 3.) { base = vec3(.01); em = vec3(0.); }
          } else if (type < 1.5 || type > 2.5) {   // 유리 오피스(3 = 금빛 63빌딩)
            vec3 glass = type > 2.5 ? vec3(.16, .1, .03) : vec3(.005, .007, .014);
            base = mix(glass, uHaze * .35 + glass, fres * .6);
            float run = floor(c.x / 6.), on = step(h13(vec3(run, c.y, seed)), lit);
            float m = step(.04, f.x) * step(.14, f.y) * step(f.y, .94);
            float r = h13(vec3(run, c.y, seed + 5.)), br = (.55 + .7 * h13(vec3(c.x, c.y, seed + 2.))) * uWin * (.6 + .5 * h13(vec3(run, c.y, seed + 9.)));
            vec3 wc = type > 2.5 ? vec3(1., .78, .45) : winCol(r, 1.);
            em = wc * br * on * m * (.8 + .2 * f.y);
            if (step(f.y, .14) > .5) base = vec3(.004);
            avg = (type > 2.5 ? vec3(1., .78, .45) : vec3(.8, .88, 1.)) * .7 * lit * .8 * uWin;
            if (vUv.y < 7.) { em = vec3(1., .85, .65) * .9 * m * uWin; }
          } else {   // 호텔·주상복합: 세로로 긴 창
            base = vec3(.02, .018, .02);
            float on = step(h13(vec3(c.x, c.y, seed)), lit);
            float m = step(.28, f.x) * step(f.x, .72) * step(.15, f.y) * step(f.y, .9);
            float r = h13(vec3(c.x, c.y, seed + 5.)), br = (.4 + .7 * h13(vec3(c.x, c.y, seed + 1.))) * uWin;
            em = winCol(r, 2.) * br * on * m;
            avg = vec3(1., .66, .38) * .65 * lit * .3 * uWin;
          }
          if (uStyl > .5) { float lt = .55 + .45 * max(dot(N, normalize(vec3(.35, .8, .45))), 0.); base = vec3(.05, .04, .125) * lt * (.85 + .3 * h13(vec3(seed, 1., 2.))); em = dot(em, vec3(.33)) * vec3(1., .66, .26) * .55; avg = vec3(1., .66, .26) * lit * .06; }
          col = mix(base + em, base * .6 + avg * (uLen > 0. ? .55 : .3), far);
          // 1층 상가 불빛
          if (vI2.z > .5 && vUv.y < 4.5 && face < .5) col += vec3(1., .7, .4) * .5 * step(.6, vUv.y) * (.6 + .4 * h13(vec3(floor(vUv.x / 6.), 1., seed))) * uWin;
          // 꼭대기 테두리 조명
          if (vI2.y > .5 && vUv.y > H - 1.) col += (vI2.y > 1.5 ? vec3(1., .72, .38) : vec3(.85, .92, 1.)) * 1.1;
        }
        float fh2 = 1. - exp(-vDist * uHazeD);
        gl_FragColor = vec4(mix(col, uHaze, fh2), 1.);
      }`,
  });

  // ---------- 장면 공통 ----------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, .3, 30000); camera.rotation.order = "YXZ";
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), skyMat); sky.frustumCulled = false; sky.renderOrder = -10;
  sky.onBeforeRender = (r, s, cam) => { sky.position.copy(cam.position); sky.scale.setScalar(cam.far * .8); sky.updateMatrixWorld(); };
  scene.add(sky);
  const stars = new THREE.Points(starGeo(), starMat); stars.frustumCulled = false; stars.renderOrder = -9;
  stars.onBeforeRender = (r, s, cam) => { stars.position.copy(cam.position); starMat.uniforms.uRadius.value = cam.far * .75; stars.updateMatrixWorld(); };
  scene.add(stars);
  // 달: 실제 해 방향으로 비춘 공(위상이 저절로 맞는다), 바다(어두운 무늬)는 잡음
  const moonMat = new THREE.ShaderMaterial({
    uniforms: uni({ uSunDir: { value: new THREE.Vector3(1, 0, 0) } }), transparent: true, depthWrite: false,
    vertexShader: `varying vec3 vN; varying vec3 vP; void main() { vN = normalize(mat3(modelMatrix) * normal); vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: NOISE + `uniform vec3 uSunDir; varying vec3 vN; varying vec3 vP; void main() {
      float l = smoothstep(-.05, .12, dot(normalize(vN), uSunDir));
      float mar = smoothstep(.45, .7, fbm(vP.xy * 1.6 + vP.z * .8 + 4.)) * .45 + fbm(vP.xz * 7.) * .12;
      vec3 c = vec3(1., .96, .88) * (1.05 - mar) * 3.2 * l + vec3(.02, .025, .04);
      gl_FragColor = vec4(c, 1.); }`,
  });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), moonMat); moon.frustumCulled = false; moon.renderOrder = -8;
  moon.onBeforeRender = (r, s, cam) => { const D = cam.far * .7; moon.position.copy(cam.position).addScaledVector(U.uMoonDir.value, D); moon.scale.setScalar(D * Math.tan(.42 * RAD)); moon.updateMatrixWorld(); };
  scene.add(moon);

  // 물결 법선 지도(이음새 없이 반복): 여러 방향 물결의 합
  function waterNormals() {
    const N = 256, d = new Uint8Array(N * N * 4), r = rng(5), waves = [];
    for (let i = 0; i < 22; i++) { const a = r() * TAU, k = 1 + (r() * 9 | 0); waves.push([Math.round(Math.cos(a) * k), Math.round(Math.sin(a) * k), r() * TAU, 1 / (k + 1.5)]); }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let dx = 0, dy = 0; for (const [kx, ky, ph, a] of waves) { const c = Math.cos((kx * x + ky * y) / N * TAU + ph) * a; dx += c * kx; dy += c * ky; }
      const nx = -dx * .09, ny = -dy * .09, l = Math.hypot(nx, ny, 1), i = (y * N + x) * 4;
      d[i] = (nx / l * .5 + .5) * 255; d[i + 1] = (ny / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255;
    }
    const t = new THREE.DataTexture(d, N, N); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
  }
  const wNorm = waterNormals();
  function makeWater(geo, texSize, size, dist) {
    const w = new Water(geo, { textureWidth: texSize, textureHeight: texSize, waterNormals: wNorm, sunDirection: new THREE.Vector3(0, 1, 0), sunColor: 0x000000, waterColor: 0x010205, distortionScale: dist, fog: false, alpha: 1 });
    w.rotation.x = -Math.PI / 2; w.material.uniforms.size.value = size;
    w.material.polygonOffset = true; w.material.polygonOffsetFactor = -2; w.material.polygonOffsetUnits = -6;
    return w;
  }

  // ---------- 쌓아 올리는 도구 ----------
  class Bake {   // 구운 물체(꼭짓점 색)
    constructor() { this.p = []; this.c = []; this.z = []; }
    tri(a, b, c, ca, cb, cc, cz) { this.p.push(...a, ...b, ...c); this.c.push(...ca, ...cb, ...cc); this.z.push(cz, cz, cz); }
    quad(a, b, c, d, ca, cb, cc, cd, cz) { cb = cb || ca; cc = cc || cb; cd = cd || cc; this.tri(a, b, c, ca, cb, cc, cz); this.tri(a, c, d, ca, cc, cd, cz); }
    // 상자: 트립 좌표(x, y, z) 가운데·크기. 아래 색 → 위 색 그라데이션
    box(cx, y0, cz, sx, h, sz, cBot, cTop, cTopFace, czw) {
      const x0 = cx - sx / 2, x1 = cx + sx / 2, z0 = -(cz - sz / 2), z1 = -(cz + sz / 2), y1 = y0 + h, W = czw == null ? -cz : czw;
      this.quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], cBot, cBot, cTop, cTop, W);
      this.quad([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], cBot, cBot, cTop, cTop, W);
      this.quad([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], cBot, cBot, cTop, cTop, W);
      this.quad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], cBot, cBot, cTop, cTop, W);
      const t = cTopFace || cTop; this.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], t, t, t, t, W);
      const b = cBot; this.quad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], b, b, b, b, W);
    }
    // 관(아치 등): 트립 좌표 점들을 따라
    tube(pts, r, col, czw, seg = 6) {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        for (let k = 0; k < seg; k++) {
          const a0 = k / seg * TAU, a1 = (k + 1) / seg * TAU, o = (an, p) => [p[0] + Math.cos(an) * r, p[1] + Math.sin(an) * r, -p[2]];
          this.quad(o(a0, a), o(a1, a), o(a1, b), o(a0, b), col, col, col, col, czw);
        }
      }
    }
    mesh(mat) {
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute("aCol", new THREE.Float32BufferAttribute(this.c, 3)); g.setAttribute("aCZ", new THREE.Float32BufferAttribute(this.z, 1));
      const m = new THREE.Mesh(g, mat); m.frustumCulled = false; return m;
    }
  }
  class Pts {   // 빛 점
    constructor() { this.p = []; this.c = []; this.s = []; this.m = []; this.a = []; }
    add(x, y, z, col, size, move, anim) { this.p.push(x, y, -z); this.c.push(...col); this.s.push(size); this.m.push(...(move || [0, 0, 0, 0])); this.a.push(...(anim || [0, 0, 0, 0])); }
    mesh(mat) {
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute("aCol", new THREE.Float32BufferAttribute(this.c, 3));
      g.setAttribute("aSize", new THREE.Float32BufferAttribute(this.s, 1)); g.setAttribute("aMove", new THREE.Float32BufferAttribute(this.m, 4)); g.setAttribute("aAnim", new THREE.Float32BufferAttribute(this.a, 4));
      const m = new THREE.Points(g, mat); m.frustumCulled = false; return m;
    }
  }
  class Blds {   // 건물(창문 셰이더)
    constructor() { this.p = []; this.uv = []; this.i = []; this.i2 = []; this.z = []; this.n = []; }
    face(a, b, h, info, info2, len, cz, nrm) {   // a, b: 바닥 두 점(three 좌표), 높이 h
      const [ax, ay, az] = a, [bx, , bz] = b;
      const P = [[ax, ay, az], [bx, ay, bz], [bx, ay + h, bz], [ax, ay + h, az]], UV = [[0, 0], [len, 0], [len, h], [0, h]];
      for (const k of [0, 1, 2, 0, 2, 3]) { this.p.push(...P[k]); this.uv.push(...UV[k]); this.i.push(...info); this.i2.push(...info2); this.z.push(cz); this.n.push(...nrm); }
    }
    // 가운데 (cx, cz) 트립 좌표, 크기 sx·sz, 회전 rot, 바닥 y0, 높이 h. type 0 아파트 1 오피스 2 호텔 3 금빛
    add(cx, cz, sx, sz, rot, y0, h, type, seed, lit, crown, shop) {
      const c = Math.cos(rot), s = Math.sin(rot), P = (dx, dz) => [cx + dx * c - dz * s, y0, -(cz + dx * s + dz * c)];
      const pA = P(-sx / 2, -sz / 2), pB = P(sx / 2, -sz / 2), pC = P(sx / 2, sz / 2), pD = P(-sx / 2, sz / 2), W = -cz;
      const wide = sx >= sz;
      const sides = [[pA, pB, sx, wide ? 0 : 1], [pB, pC, sz, wide ? 1 : 0], [pC, pD, sx, wide ? 0 : 1], [pD, pA, sz, wide ? 1 : 0]];
      for (const [a, b, len, nar] of sides) {
        const nx = (b[2] - a[2]), nz = -(b[0] - a[0]), l = Math.hypot(nx, nz) || 1;
        this.face(a, b, h, [type, seed, lit, type === 0 ? nar : 0], [h, crown || 0, shop ? 1 : 0, len], len, W, [nx / l, 0, nz / l]);
      }
      const y1 = y0 + h, R4 = [pA, pB, pC, pD].map(p => [p[0], y1, p[2]]);
      for (const k of [0, 2, 1, 0, 3, 2]) { this.p.push(...R4[k]); this.uv.push(0, 0); this.i.push(type, seed, lit, 2); this.i2.push(h, 0, 0, 0); this.z.push(W); this.n.push(0, 1, 0); }
    }
    mesh(mat) {
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute("aUv", new THREE.Float32BufferAttribute(this.uv, 2));
      g.setAttribute("aInfo", new THREE.Float32BufferAttribute(this.i, 4)); g.setAttribute("aInfo2", new THREE.Float32BufferAttribute(this.i2, 4)); g.setAttribute("aCZ", new THREE.Float32BufferAttribute(this.z, 1)); g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3));
      const m = new THREE.Mesh(g, mat); m.frustumCulled = false; return m;
    }
  }
  const K = (k, s) => kelvin(k).map(v => v * s);

  // ---------- 전광판(한 장의 글자 그림을 모든 전광판이 같이 쓴다) ----------
  const bbCv = document.createElement("canvas"); bbCv.width = 512; bbCv.height = 144; const bbG = bbCv.getContext("2d");
  const bbTex = new THREE.CanvasTexture(bbCv); bbTex.colorSpace = THREE.SRGBColorSpace; bbTex.anisotropy = aniso;
  const bbMat = new THREE.MeshBasicMaterial({ map: bbTex, color: new THREE.Color(2.2, 2.2, 2.2), toneMapped: true });
  const haloTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d"), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.5, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const bbHalo = new THREE.MeshBasicMaterial({ map: haloTex, color: new THREE.Color(.35, .3, .45), transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false });
  let bbLast = "";
  function drawBB(st) {
    const { text, age, k } = st.bb, hue = [42, 330, 190, 140][k % 4], key = text + "|" + Math.round(age * 30);
    if (key === bbLast) return; bbLast = key;
    const W = 512, H = 144; bbG.fillStyle = "#05040a"; bbG.fillRect(0, 0, W, H);
    const fs = 64; bbG.font = `800 ${fs}px -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`; bbG.textBaseline = "middle";
    const tw = bbG.measureText(text).width, fade = Math.min(1, age * 2, (9 - age) * 2);
    let x = (W - tw) / 2; if (tw > W * .92) x = W - ((age * W * .34) % (tw + W));
    bbG.globalAlpha = Math.max(0, fade); bbG.shadowColor = `hsl(${hue},95%,60%)`; bbG.shadowBlur = 18; bbG.fillStyle = `hsl(${hue},95%,74%)`; bbG.fillText(text, x, H / 2 + 3);
    bbG.shadowBlur = 0; bbG.globalAlpha = 1;
    bbG.fillStyle = "rgba(0,0,0,.32)"; for (let y = 0; y < H; y += 4) bbG.fillRect(0, y, W, 1.5);
    for (let xx = 0; xx < W; xx += 4) bbG.fillRect(xx, 0, 1.2, H);
    bbTex.needsUpdate = true;
    bbHalo.color.setHSL(hue / 360, .45, .3);
  }
  function boardMesh(w, h) {
    const g = new THREE.Group();
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bbMat); g.add(scr);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 2, h + 2, 1.5), new THREE.MeshBasicMaterial({ color: 0x050508 })); fr.position.z = -.9; g.add(fr);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.5, h * 2.2), bbHalo); halo.position.z = -.5; halo.renderOrder = 2; g.add(halo);
    const pole = new THREE.Mesh(new THREE.BoxGeometry(w * .05, h * 1.6, 2), new THREE.MeshBasicMaterial({ color: 0x07070c })); pole.position.set(0, -h * 1.3, -1.5); g.add(pole);
    g.userData.w = w; g.userData.h = h; g.userData.scr = scr;
    return g;
  }

  // ---------- 불꽃 · 별똥별 (동적 점) ----------
  const FWN = 2400, fwPos = new Float32Array(FWN * 3), fwCol = new Float32Array(FWN * 3), fwSize = new Float32Array(FWN);
  const fwGeo = new THREE.BufferGeometry(); fwGeo.setAttribute("position", new THREE.BufferAttribute(fwPos, 3)); fwGeo.setAttribute("aCol", new THREE.BufferAttribute(fwCol, 3)); fwGeo.setAttribute("aSize", new THREE.BufferAttribute(fwSize, 1));
  fwGeo.setAttribute("aMove", new THREE.BufferAttribute(new Float32Array(FWN * 4), 4)); fwGeo.setAttribute("aAnim", new THREE.BufferAttribute(new Float32Array(FWN * 4), 4));
  const fwPts = new THREE.Points(fwGeo, ptMat(false, { uMinPx: { value: 1.8 } })); fwPts.frustumCulled = false; fwPts.renderOrder = 5;
  const FWC = [[1, .35, .45], [1, .75, .35], [.45, .75, 1], [.55, 1, .65], [.85, .5, 1], [1, 1, 1]];
  const fws = [], mets = [];
  function fwLaunch(gold, mode, base) {
    const r = Math.random;
    let x, z, h;
    if (mode === "cruise") { x = (r() - .5) * 600; z = base + 700 + r() * 900; h = 150 + r() * 160; }
    else if (mode === "sky123") { x = 8800 + (r() - .5) * 5000; z = o.riverZ(x) + (r() - .5) * 250; h = 250 + r() * 200; }
    else if (mode === "sky63") { x = Y63.x - 800 + (r() - .5) * 3000; z = o.riverZ(x) + (r() - .5) * 250; h = 170 + r() * 160; }   // 여의도 앞 한강 위(서울세계불꽃축제 자리)
    else { x = (r() - .5) * 9000; z = o.riverZ(x) + (r() - .5) * 300; h = 300 + r() * 220; }
    fws.push({ x, z, h, y0: mode === "cruise" ? 0 : 31, t: 0, up: true, col: gold ? [1, .8, .45] : FWC[r() * 6 | 0], col2: FWC[r() * 6 | 0], gold, parts: null, size: (mode === "cruise" ? 70 : 130) * (.8 + r() * .5) });
  }
  function fwStep(dt, cam) {
    let n = 0;
    const put = (x, y, z, c, a, s) => { if (n >= FWN) return; fwPos[n * 3] = x; fwPos[n * 3 + 1] = y; fwPos[n * 3 + 2] = -z; fwCol[n * 3] = c[0] * a; fwCol[n * 3 + 1] = c[1] * a; fwCol[n * 3 + 2] = c[2] * a; fwSize[n] = s; n++; };
    for (let i = fws.length - 1; i >= 0; i--) {
      const f = fws[i]; f.t += dt;
      if (f.up) {
        const p = Math.min(1, f.t / 1.6), y = f.y0 + f.h * (1 - (1 - p) * (1 - p));
        put(f.x, y, f.z, [1, .8, .55], 6, 3);
        for (let k = 1; k < 6; k++) put(f.x, y - k * 4, f.z, [1, .6, .3], 2.5 / k, 2);
        if (p >= 1) { f.up = false; f.t = 0; const m = f.gold ? 110 : 85; f.parts = []; for (let k = 0; k < m; k++) { const a = Math.random() * TAU, b = Math.acos(2 * Math.random() - 1); f.parts.push([Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a), k % 3 === 0 ? 1 : 0]); } }
        continue;
      }
      const p = f.t / 2.8; if (p > 1) { fws.splice(i, 1); continue; }
      const R = f.size * (1 - Math.pow(1 - Math.min(1, p * 1.6), 3)), fall = 34 * p * p, a = (1 - p) * (1 - p) * 4;
      for (const q of f.parts) {
        const sp = .75 + .25 * Math.sin(f.t * 30 + q[0] * 9);
        put(f.x + q[0] * R, f.y0 + f.h + q[1] * R - fall, f.z + q[2] * R, q[3] ? f.col2 : f.col, a * sp, f.gold ? 3.4 : 2.8);
        put(f.x + q[0] * R * .93, f.y0 + f.h + q[1] * R * .93 - fall * .9, f.z + q[2] * R * .93, q[3] ? f.col2 : f.col, a * .35, 2);
      }
      if (p < .15) put(f.x, f.y0 + f.h, f.z, f.col, (.15 - p) * 6, f.size * .25);
    }
    // 별똥별: 하늘 방향으로, 카메라에서 아주 멀리
    const D = 9000;
    for (let i = mets.length - 1; i >= 0; i--) {
      const m = mets[i]; m.life += dt; const p = m.life / m.dur; if (p > 1) { mets.splice(i, 1); continue; }
      const A = Math.sin(p * Math.PI);
      for (let k = 0; k < 18; k++) {
        const tt = m.life - k * .012, az = m.az + m.daz * tt, el = m.el + m.del * tt, ce = Math.cos(el);
        const dx = ce * Math.sin(az), dy = Math.sin(el), dz = ce * Math.cos(az);
        put(cam.x + dx * D, cam.y + dy * D, cam.z + dz * D, m.gold ? [1, .85, .6] : [.85, .92, 1], A * (1 - k / 18) * 3, 9 * (1 - k / 22));
      }
    }
    for (let k = n; k < FWN; k++) fwSize[k] = 0;
    fwGeo.attributes.position.needsUpdate = fwGeo.attributes.aCol.needsUpdate = fwGeo.attributes.aSize.needsUpdate = true;
    fwGeo.setDrawRange(0, n);
  }

  // ====================== 🚢 유람선 장면 ======================
  const R = o.R, LEN = o.LEN;
  let cruise = null;
  function buildCruise() {
    const G = new THREE.Group(), r = rng(7);
    const bake = new Bake(), pts = new Pts(), bl = new Blds(), mats = { bake: bakedMat(true), bld: bldMat(true), pt: ptMat(true) };
    const nearBridge = z => o.BRIDGES.some(b => Math.abs(b.z - z) < 80);
    // 구역: 강 오른쪽(남쪽, sd=1) / 왼쪽(북쪽, sd=-1). 여의도 오피스, 이촌·반포·압구정 아파트 단지, 용산 고층
    const zone = (sd, z) => {
      if (sd > 0 && z < 1500) return "yeouido";
      if (sd < 0 && z > 2400 && z < 3700) return "yongsan";
      if (sd < 0 && z > 3700 && z < 5300) return "ichon";
      if (sd > 0 && z > 5600 && z < 7500) return "banpo";
      if (sd > 0 && z > 7700) return "apgu";
      if (sd < 0 && z < 2400) return "mapo";
      return "mix";
    };
    const addB = (sd, x, z, sx, sz, h, type, crownP, shop) => {
      const seed = r() * 100, lit = type === 0 ? .3 + r() * .2 : type === 1 ? .12 + r() * .25 : .28 + r() * .2;
      const crown = r() < crownP ? (r() < .5 ? 2 : 1) : 0;
      bl.add(sd * x, z, sx, sz, 0, 7, h, type, seed, lit, crown, shop);
      if (h > 90) pts.add(sd * x, 7 + h + 1.5, z, [6, .25, .15], 1.8, null, [1, r(), 2.4, 0]);   // 항공등
    };
    for (let z = 0; z < LEN; z += 1) {
      for (const sd of [-1, 1]) {
        const zn = zone(sd, z);
        // 첫 줄(강변): 아파트 단지는 강을 바라보는 긴 판상형, 여의도는 유리 오피스
        if (z % 74 === 0 && !nearBridge(z) && r() < .9) {
          if (zn === "yeouido" || (zn === "yongsan" && r() < .5)) addB(sd, R + 80 + r() * 40, z + r() * 20, 34 + r() * 16, 34 + r() * 16, 110 + r() * 140, r() < .8 ? 1 : 2, .5, true);
          else if (zn === "mix" && r() < .4) addB(sd, R + 75 + r() * 50, z, 22 + r() * 18, 28 + r() * 20, 25 + r() * 40, 2, .1, true);
          else addB(sd, R + 75 + r() * 30, z + r() * 8, 16 + r() * 4, 58 + r() * 22, (zn === "banpo" || zn === "ichon" || zn === "apgu" ? 60 : 40) + r() * 50, 0, .35, false);
        }
        // 둘째 줄
        if (z % 62 === 31 && r() < .8) {
          const tall = zn === "yeouido" || zn === "yongsan" ? r() < .7 : r() < .15;
          if (tall) addB(sd, R + 200 + r() * 220, z + r() * 20, 30 + r() * 20, 30 + r() * 20, 120 + r() * r() * 160, r() < .75 ? 1 : 2, .55, false);
          else addB(sd, R + 190 + r() * 240, z + r() * 20, 16 + r() * 4, 50 + r() * 25, 45 + r() * 60, 0, .25, false);
        }
        // 먼 줄
        if (z % 55 === 20 && r() < .75) addB(sd, R + 520 + r() * 900, z + r() * 30, 18 + r() * 30, 30 + r() * 40, 40 + r() * r() * 170, r() < .55 ? 0 : r() < .7 ? 1 : 2, .3, false);
      }
    }
    // 63빌딩(금빛)
    bl.add(R + 290, 300, 50, 46, 0, 7, 250, 3, 3.3, .55, 0, true);
    pts.add(R + 290, 260, 300, [6, .2, .12], 2.2, null, [1, .3, 2.2, 0]);
    // 먼 도시 불빛(건물 뒤로 끝없이)
    for (let i = 0; i < 9000; i++) { const sd = r() < .5 ? -1 : 1, x = R + 600 + Math.pow(r(), .7) * 3200, z = r() * LEN; pts.add(sd * x, 7 + r() * r() * 70, z, r() < .6 ? K(3000, 1.2 + r() * 1.5) : K(5200, 1 + r() * 1.5), 2.2, null, [2, r(), 1 + r() * 3, 0]); }
    // 강둑: 돌 둑(경사), 강변 공원(풀·산책로), 강변도로
    const concrete = [.018, .017, .02], concreteTop = [.05, .04, .035], grass = [.006, .009, .006], path = [.03, .026, .024], road = [.012, .012, .014];
    for (let z = 0; z < LEN; z += 50) for (const sd of [-1, 1]) {
      const cz = -(z + 25), x = v => sd * v, Z0 = -z, Z1 = -(z + 50);
      const q = (xa, ya, xb, yb, ca, cb) => sd > 0 ? bake.quad([x(xa), ya, Z0], [x(xa), ya, Z1], [x(xb), yb, Z1], [x(xb), yb, Z0], ca, ca, cb, cb, cz) : bake.quad([x(xa), ya, Z1], [x(xa), ya, Z0], [x(xb), yb, Z0], [x(xb), yb, Z1], ca, ca, cb, cb, cz);
      q(R - 2, -1, R + 8, 7, concrete, concreteTop);
      q(R + 8, 7, R + 13, 7, path, path); q(R + 13, 7, R + 36, 7.2, grass, grass);
      q(R + 36, 7.2, R + 38, 9, concrete, concrete); q(R + 38, 9, R + 54, 9, road, road); q(R + 54, 9, R + 56, 10, [.03, .03, .035], [.03, .03, .035]);
      q(R + 56, 10, R + 4000, 7, [.004, .004, .006], [.004, .004, .006]);
    }
    // 나무: 강변 공원의 어두운 나무(아래쪽은 가로등 빛을 받아 따뜻하게)
    const ico = new THREE.IcosahedronGeometry(1, 0), ip = ico.attributes.position.array;
    for (let z = 0; z < LEN; z += 9) for (const sd of [-1, 1]) {
      if (r() < .35 || nearBridge(z)) continue;
      const tx = sd * (R + 16 + r() * 18), tz = z + r() * 6, th = 4 + r() * 4, rr = 2.5 + r() * 2;
      for (let i = 0; i < ip.length; i += 9) {
        const P = k => [tx + ip[i + k * 3] * rr, 7 + th * .55 + ip[i + k * 3 + 1] * th * .55, -(tz + ip[i + k * 3 + 2] * rr)];
        const C = k => { const yy = ip[i + k * 3 + 1]; return yy < 0 ? [.03, .025, .012] : [.006, .01, .007]; };
        bake.tri(P(0), P(1), P(2), C(0), C(1), C(2), -tz);
      }
      bake.box(tx, 7, tz, .4, th * .4, .4, [.01, .008, .006], [.01, .008, .006], null);
    }
    // 가로등: 강변 공원(따뜻한 3000K) + 강변도로(나트륨 주황 / 하얀 LED)
    for (let z = 0; z < LEN; z += 30) for (const sd of [-1, 1]) {
      if (nearBridge(z)) continue;
      pts.add(sd * (R + 10), 11.5, z, K(4200, 6), 1);
      bake.box(sd * (R + 10), 7, z, .25, 4.4, .25, [.02, .02, .02], [.02, .02, .02], null);
    }
    for (let z = 15; z < LEN; z += 37.5) for (const sd of [-1, 1]) { pts.add(sd * (R + 46), 21, z, K(5000, 6), 1.3); }
    // 가로등이 바닥에 떨어뜨린 빛 웅덩이
    const poolMat = new THREE.ShaderMaterial({ uniforms: uni(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: GL_COMMON + `attribute vec3 aCol; attribute float aCZ; attribute vec2 aUv2; varying vec3 vC; varying vec2 vU; varying float vD; void main() { vec3 p = position; p.z += wrapOff(aCZ); vC = aCol; vU = aUv2; vec4 mv = modelViewMatrix * vec4(p, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: GL_COMMON + `varying vec3 vC; varying vec2 vU; varying float vD; void main() { float r = length(vU); float a = exp(-r * r * 3.5) * (1. - smoothstep(.8, 1., r)); gl_FragColor = vec4(vC * a * exp(-vD * uHazeD), 1.); }` });
    const pool = { p: [], c: [], z: [], u: [] };
    const addPool = (x, y, z, rad, col) => { const P = [[x - rad, y, -(z - rad)], [x + rad, y, -(z - rad)], [x + rad, y, -(z + rad)], [x - rad, y, -(z + rad)]], UV = [[-1, -1], [1, -1], [1, 1], [-1, 1]]; for (const k of [0, 1, 2, 0, 2, 3]) { pool.p.push(...P[k]); pool.c.push(...col); pool.z.push(-z); pool.u.push(...UV[k]); } };
    for (let z = 0; z < LEN; z += 30) for (const sd of [-1, 1]) if (!nearBridge(z)) { addPool(sd * (R + 10), 7.05, z, 9, K(4200, .06)); addPool(sd * (R + 4), 3.2, z, 7, K(4200, .02)); }
    for (let z = 15; z < LEN; z += 37.5) for (const sd of [-1, 1]) addPool(sd * (R + 46), 9.05, z, 14, K(5000, .05));
    { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pool.p, 3)); g.setAttribute("aCol", new THREE.Float32BufferAttribute(pool.c, 3)); g.setAttribute("aCZ", new THREE.Float32BufferAttribute(pool.z, 1)); g.setAttribute("aUv2", new THREE.Float32BufferAttribute(pool.u, 2)); const m = new THREE.Mesh(g, poolMat); m.frustumCulled = false; m.renderOrder = 1; G.add(m); }
    // 차: 강변도로 양방향(앞불 하양, 뒷불 빨강). 구간 = 물길 한 바퀴
    for (const sd of [-1, 1]) for (const [dir, lane, col] of [[1, 41, K(5500, 7)], [-1, 47, [7, .35, .2]], [1, 44, K(5500, 7)], [-1, 51, [7, .35, .2]]]) {
      const n = 120 + (r() * 40 | 0);
      for (let i = 0; i < n; i++) pts.add(sd * (R + lane), 9.9, 0, col, .9, [0, -dir, 14 + r() * 8, LEN], [0, i / n + r() * .004, 0, 0]);
    }
    // 다리
    for (const b of o.BRIDGES) {
      const B = R + 170, z = b.z, col = b.col.split(",").map(v => Math.pow(+v / 255, 2.2)), lamp = b.lamp.split(",").map(v => Math.pow(+v / 255, 2.2));
      const deck = [.012, .012, .016], under = col.map(v => v * .35);
      // 상판: 옆면은 어둡고, 밑면은 다리 색 조명으로 은은히 빛난다
      bake.box(0, 14, z, 2 * B, 3.4, 22, under, deck, [.01, .01, .012], -z);
      bake.box(0, 17.4, z - 10.6, 2 * B, 1.1, .4, [.03, .03, .035], [.03, .03, .035], null, -z);
      bake.box(0, 17.4, z + 10.6, 2 * B, 1.1, .4, [.03, .03, .035], [.03, .03, .035], null, -z);
      // 교각: 아래에서 위로 비추는 조명
      for (let px = -R + 70; px <= R - 70; px += 105) bake.box(px, -1, z, 9, 15, 16, col.map(v => v * .6), [.015, .015, .02], null, -z);
      // 상판 아래 LED 띠, 난간 가로등
      for (let px = -B; px <= B; px += 2.2) { pts.add(px, 14.1, z - 11.2, col.map(v => v * 4), .55); }
      for (let px = -B + 12; px <= B; px += 34) for (const e of [-1, 1]) { pts.add(px, 24, z + e * 10.8, lamp.map(v => v * 5), 1.1); bake.box(px, 18.5, z + e * 10.8, .3, 5.5, .3, [.025, .025, .03], [.025, .025, .03], null, -z); }
      // 다리 위 차
      for (const [dir, off, cc] of [[1, -4, K(5500, 6)], [-1, 4, [6, .3, .18]]]) for (let i = 0; i < 14; i++) pts.add(dir > 0 ? -B : B, 18.4, z + off, cc, .8, [1 * dir, 0, 11 + r() * 6, 2 * B], [0, i / 14 + r() * .03, 0, 0]);
      if (b.type === "arch" || b.type === "arch2") {
        const spans = b.type === "arch" ? [[-R + 60, -R + 250], [-R + 250, -R + 440], [R - 440, R - 250], [R - 250, R - 60]] : [[-300, -20], [20, 300]];
        const ah = b.type === "arch" ? 30 : 50, ac = b.type === "arch" ? K(4500, .9) : col.map(v => v * 1.2);
        for (const [a, c] of spans) for (const e of [-1, 1]) {
          const P = []; for (let k = 0; k <= 24; k++) { const u = k / 24; P.push([a + (c - a) * u, 17.4 + Math.sin(u * Math.PI) * ah, z + e * 9.5]); }
          bake.tube(P, b.type === "arch" ? .9 : 1.3, ac, -z, 6);
          for (let k = 0; k <= 48; k++) { const u = k / 48; pts.add(a + (c - a) * u, 17.4 + Math.sin(u * Math.PI) * ah + 1.2, z + e * 9.5, (b.type === "arch" ? K(4800, 2.5) : col.map(v => v * 2.5)), .5); }
          for (let k = 2; k < 24; k += 2) { const u = k / 24, xx = a + (c - a) * u, yy = Math.sin(u * Math.PI) * ah; bake.box(xx, 17.4, z + e * 9.5, .25, yy, .25, [.06, .05, .04], [.06, .05, .04], null, -z); }
        }
      }
      if (b.type === "truss") {   // 철교: 마름모 철골(옅은 푸른 조명)
        for (const e of [-1, 1]) for (let px = -B; px < B; px += 30) {
          bake.tube([[px, 17.4, z + e * 10], [px + 15, 29, z + e * 10], [px + 30, 17.4, z + e * 10]], .35, [.08, .12, .22], -z, 4);
          bake.tube([[px, 29, z + e * 10], [px + 30, 29, z + e * 10]], .35, [.08, .12, .22], -z, 4);
        }
      }
    }
    // 반포대교 달빛무지개분수: 노즐마다 물줄기 입자(셰이더로 흐름, 무지개빛)
    const fb = o.BRIDGES.find(b => b.type === "fountain");
    const fMat = new THREE.ShaderMaterial({ uniforms: uni({ uOn: { value: 1 } }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: GL_COMMON + `uniform float uPx; uniform float uDpr; uniform float uOn; attribute vec4 aF; varying vec3 vC;
        vec3 hsv(float h) { return clamp(abs(mod(h * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.); }
        void main() { float u = fract(aF.y + uTime * .45); vec3 p = vec3(aF.x + sin(aF.x) * 1.3, 15.6 + 4. * u - 19.5 * u * u, -(aF.z - 2. - 21. * u + aF.w * u));
          p.z += wrapOff(p.z); vec4 mv = modelViewMatrix * vec4(p, 1.); float d = -mv.z;
          float s = max(.9 * uPx / d, 1.3 * uDpr); vC = hsv(fract((aF.x + 260.) / 520. * .85 + uTime * .06)) * .4 * (1. - u * .55) * uOn * exp(-d * uHazeD) * min(1., pow((.9 * uPx / d) / s, 2.) + .08);
          gl_Position = projectionMatrix * mv; gl_PointSize = min(s, 90.); }`,
      fragmentShader: `varying vec3 vC; void main() { vec2 p = gl_PointCoord - .5; float r = dot(p, p) * 4.; if (r > 1.) discard; gl_FragColor = vec4(vC * exp(-r * 3.), 1.); }` });
    const fa = [];
    for (let px = -R + 12; px <= R - 12; px += 3.2) for (let k = 0; k < 16; k++) fa.push(px, k / 16 + Math.random() * .05, fb.z - 11, (Math.random() - .5) * 3);
    const fg = new THREE.BufferGeometry(); fg.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(fa.length / 4 * 3), 3)); fg.setAttribute("aF", new THREE.Float32BufferAttribute(fa, 4));
    const fountain = new THREE.Points(fg, fMat); fountain.frustumCulled = false; G.add(fountain);
    // 남산 + N서울타워(왼쪽 멀리, 실제처럼 불빛 색이 있는 하얀 탑)
    const NS = o.NAMSAN;
    for (let ri = 0; ri < 10; ri++) for (let ai = 0; ai < 24; ai++) {
      const hgt = (rr) => 235 * Math.exp(-Math.pow(rr / 700, 2)) + 7;
      const P = (rr, a) => { const n = 1 + .08 * Math.sin(a * 5 + rr * .01); return [NS.x + Math.cos(a) * rr * 1.1, hgt(rr) * n, -(NS.z + Math.sin(a) * rr * 1.5)]; };
      const r0 = ri * 150, r1 = (ri + 1) * 150, a0 = ai / 24 * TAU, a1 = (ai + 1) / 24 * TAU, c0 = [.005, .007, .006], c1 = [.012, .01, .008];
      bake.quad(P(r0, a0), P(r1, a0), P(r1, a1), P(r0, a1), ri < 2 ? c0 : c0, c1, c1, c0, -NS.z);
    }
    for (let i = 0; i < 70; i++) { const a = r() * TAU, rr = 150 + r() * 1100; pts.add(NS.x + Math.cos(a) * rr * 1.1, 235 * Math.exp(-Math.pow(rr / 700, 2)) + 9, NS.z + Math.sin(a) * rr * 1.5, K(2800, 2), 2.5); }
    {
      const tb = 242; const tc = [.35, .42, .8];
      const seg = [[tb, 7.5, 6.5], [tb + 110, 6.5, 5.2], [tb + 120, 10, 10], [tb + 150, 10, 5.5], [tb + 158, 2.2, 1.6], [tb + 236, 1.2, .4]];
      for (let i = 0; i < seg.length - 1; i++) { const [y0, r0] = seg[i], [y1, r1] = [seg[i + 1][0], seg[i + 1][2]]; const cc = i === 2 ? K(3200, 1.8) : tc.map(v => v * (1.1 - i * .12));
        for (let k = 0; k < 10; k++) { const a0 = k / 10 * TAU, a1 = (k + 1) / 10 * TAU, P = (rr, yy, a) => [NS.x + Math.cos(a) * rr, yy, -(NS.z + Math.sin(a) * rr)]; bake.quad(P(seg[i][1], y0, a0), P(seg[i][1], y0, a1), P(r1, y1, a1), P(r1, y1, a0), cc, cc, cc, cc, -NS.z); } }
      for (let k = 0; k < 36; k++) { const a = k / 36 * TAU; pts.add(NS.x + Math.cos(a) * 10.5, tb + 133, NS.z + Math.sin(a) * 10.5, K(3000, 5), 2.2); }
      pts.add(NS.x, tb + 238, NS.z, [8, .3, .2], 4, null, [1, 0, 2.4, 0]);
    }
    // 전광판(강가 건물 위)
    const boards = o.BOARDS.map(bd => { const m = boardMesh(120, 34); m.position.set(bd.x, bd.y + 7 + 10, -bd.z); m.rotation.y = bd.x < 0 ? 1.15 : -1.15; G.add(m); return { m, bd }; });
    // 먼 산 능선 + 롯데월드타워(카메라를 따라감: 아주 멀어서)
    const far = new THREE.Group(), fb2 = new Bake();
    for (const [a0, a1, dist, hmax] of [[-110, -20, 9000, 420], [-40, 30, 15000, 700], [20, 110, 11000, 520], [100, 170, 9000, 380], [-170, -100, 12000, 500]]) {
      let prev = null;
      for (let a = a0; a <= a1; a += 2) {
        const u = (a - a0) / (a1 - a0), hh = hmax * Math.pow(Math.sin(u * Math.PI), .7) * (.65 + .35 * Math.sin(a * .21) * Math.sin(a * .07 + 1)), ar = a * RAD;
        const top = [Math.sin(ar) * dist, hh, -Math.cos(ar) * dist], bot = [Math.sin(ar) * dist, 0, -Math.cos(ar) * dist];
        if (prev) fb2.quad(prev[1], bot, top, prev[0], [.004, .004, .007], [.004, .004, .007], [.006, .006, .01], [.006, .006, .01], 0);
        prev = [top, bot];
      }
    }
    { const az = 6 * RAD, D = 14000, x = Math.sin(az) * D, z = Math.cos(az) * D; for (let i = 0; i < 12; i++) { const y0 = i / 12 * 555, y1 = (i + 1) / 12 * 555, w0 = 70 * (1 - i / 12 * .85), w1 = 70 * (1 - (i + 1) / 12 * .85); const c = K(6500, .25 + .3 * i / 12); fb2.quad([x - w0 / 2, y0, -z], [x + w0 / 2, y0, -z], [x + w1 / 2, y1, -z], [x - w1 / 2, y1, -z], c, c, c, c, 0); } }
    const farMesh = fb2.mesh(bakedMat(false, THREE.DoubleSide)); far.add(farMesh);
    const farPts = new Pts(); { const az = 6 * RAD, D = 14000; farPts.add(Math.sin(az) * D, 560, Math.cos(az) * D, [8, .3, .2], 9, null, [1, .5, 2, 0]); }
    for (let i = 0; i < 2500; i++) { const a = (r() * 360 - 180) * RAD, d = 5000 + r() * 9000; farPts.add(Math.sin(a) * d, 10 + r() * 60, Math.cos(a) * d, r() < .6 ? K(2900, 1.4) : K(5000, 1.2), 7, null, [2, r(), 2, 0]); }
    far.add(farPts.mesh(ptMat(false)));
    G.add(far);
    // 마주 오는 유람선
    const boat = new THREE.Group(), bB = new Bake();
    bB.box(0, -.5, 23, 12, 4, 46, [.12, .11, .1], [.35, .33, .3], [.08, .07, .06], 0);
    bB.box(0, 3.5, 23, 11, 2.8, 42, [.25, .24, .22], [.3, .29, .27], [.05, .05, .05], 0);
    bB.box(0, 6.3, 23, 9, 2.6, 34, [.25, .24, .22], [.3, .29, .27], [.05, .05, .05], 0);
    boat.add(bB.mesh(bakedMat(false)));
    const bp = new Pts();
    for (const [y, x0, x1] of [[4.9, 1.5, 44.5], [7.6, 5.5, 40.5]]) for (let z = x0; z < x1; z += 2.6) for (const e of [-1, 1]) bp.add(e * (y > 6 ? 4.6 : 5.6), y, z, K(3000, 3), 1.2);
    for (let k = 0; k <= 20; k++) { const u = k / 20; bp.add(0, 9.5 + 4 * Math.sin(u * Math.PI), u * 46, FWC[k % 5].map(v => v * 5), .7); }
    bp.add(-6, 4, 2, [8, .2, .2], .8); bp.add(6, 4, 2, [.2, 8, .5], .8); bp.add(0, 14, 23, [8, 8, 7], .8);
    boat.add(bp.mesh(ptMat(false)));
    const banCv = document.createElement("canvas"); banCv.width = 640; banCv.height = 96; const banTex = new THREE.CanvasTexture(banCv); banTex.colorSpace = THREE.SRGBColorSpace;
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(40, 6), new THREE.MeshBasicMaterial({ map: banTex, color: new THREE.Color(1.6, 1.6, 1.6), side: THREE.DoubleSide, transparent: true }));
    banner.position.set(6.2, 11, -23); banner.rotation.y = Math.PI / 2; boat.add(banner);
    let banName = null;
    G.add(boat);
    // 물: 실제 반사면
    const water = makeWater(new THREE.PlaneGeometry(2 * R + 6, 16000), phone ? 512 : 1024, .5, 7);
    water.position.y = 0; G.add(water);

    G.add(bake.mesh(mats.bake), bl.mesh(mats.bld), pts.mesh(mats.pt));
    // 내 배(앞머리 갑판): 진짜 조명(줄전구 빛)을 받는 나무 갑판·하얀 뱃전·쇠 난간
    const deck = new THREE.Group();
    const wood = (() => { const c = document.createElement("canvas"); c.width = 512; c.height = 512; const x = c.getContext("2d"); const rr = rng(3);
      for (let i = 0; i < 16; i++) { const l = 38 + rr() * 16; x.fillStyle = `rgb(${l * 2.3 | 0},${l * 1.45 | 0},${l * .85 | 0})`; x.fillRect(i * 32, 0, 32, 512); for (let k = 0; k < 40; k++) { x.strokeStyle = `rgba(30,15,5,${.08 + rr() * .1})`; x.beginPath(); const xx = i * 32 + rr() * 32; x.moveTo(xx, 0); x.bezierCurveTo(xx + rr() * 6 - 3, 170, xx + rr() * 6 - 3, 340, xx + rr() * 4 - 2, 512); x.stroke(); } x.fillStyle = "rgba(10,5,2,.6)"; x.fillRect(i * 32, 0, 2, 512); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; return t; })();
    // 배 한 척을 통째로: 갑판은 뒤쪽 14m까지, 뱃전(벽)은 끊김 없이 이어진 1m 높이 띠 + 위 나무 손잡이. 물이 갑판 옆에 바로 보이지 않게
    const DY = 2.25, tip = 7.4, BW = 1.0, edge = [[-3.3, .6], [-2.9, 4], [-1.4, 6.6], [0, tip], [1.4, 6.6], [2.9, 4], [3.3, .6]];
    const outl = [[-3.3, -14], ...edge, [3.3, -14]];
    { const sh = new THREE.Shape(); sh.moveTo(-3.3, -14); for (const [x, z] of edge) sh.lineTo(x, z); sh.lineTo(3.3, -14); sh.closePath();
      const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3);
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: wood, roughness: .55, metalness: 0 })); m.position.y = DY; deck.add(m); }
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x8e939d, roughness: .6, side: THREE.DoubleSide }), outMat = new THREE.MeshStandardMaterial({ color: 0x9aa0ab, roughness: .5, side: THREE.DoubleSide }),
      capMat = new THREE.MeshStandardMaterial({ map: wood, roughness: .45, side: THREE.DoubleSide }), railMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd4, roughness: .25, metalness: .9 });
    // 바깥쪽 법선(2D)
    const nrm = outl.map((pt, i) => { const a = outl[Math.max(0, i - 1)], b = outl[Math.min(outl.length - 1, i + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz); return [dz / l, -dx / l]; });
    const ribbon = (f, mat) => { const P = [], idx = []; outl.forEach((pt, i) => { for (const [o, y] of f) P.push(pt[0] + nrm[i][0] * o, y, -(pt[1] + nrm[i][1] * o)); });
      const k = f.length; for (let i = 0; i < outl.length - 1; i++) for (let j = 0; j < k - 1; j++) { const a = i * k + j, b = a + 1, c = a + k, d = c + 1; idx.push(a, b, c, b, d, c); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(P.map((v, i) => i % 3 === 1 ? 0 : v * .3).filter((_, i) => i % 3 !== 1), 2)); g.setIndex(idx); g.computeVertexNormals(); deck.add(new THREE.Mesh(g, mat)); };
    ribbon([[0, DY - .05], [0, DY + BW]], hullMat);                       // 안쪽 뱃전(밝은 흰 회색)
    ribbon([[0, DY + BW], [.26, DY + BW], [.26, DY + BW - .08]], capMat);  // 나무 손잡이 위판
    ribbon([[.26, DY + BW - .08], [.34, DY * .5], [.1, -.6]], outMat);     // 바깥 선체(물 아래까지)
    { const P = []; for (const [x, z] of outl) P.push(new THREE.Vector3(x * .985, DY + BW + .32, -z)); const cv3 = new THREE.CatmullRomCurve3(P, false, "catmullrom", .1);
      deck.add(new THREE.Mesh(new THREE.TubeGeometry(cv3, 160, .028, 8, false), railMat));
      for (let i = 0; i < outl.length - 1; i++) { const [ax, az] = outl[i], [bx, bz] = outl[i + 1], n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 1.6)); for (let k = 0; k < n; k++) { const u = k / n; const post = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .32, 6), railMat); post.position.set((ax + (bx - ax) * u) * .985, DY + BW + .16, -(az + (bz - az) * u)); deck.add(post); } } }
    const mz = tip - .5, mt = 5.6;
    { const mast = new THREE.Mesh(new THREE.CylinderGeometry(.05, .07, mt - DY, 10), railMat); mast.position.set(0, (DY + mt) / 2, -mz); }
    const flagGeo = new THREE.PlaneGeometry(1.1, .62, 10, 1); flagGeo.translate(.55, 0, 0); const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: 0x8a2a2a, side: THREE.DoubleSide, roughness: .8 })); flag.position.set(0, mt - .4, -mz);
    const dp = new Pts(), bulbs = [];
    for (const sx of []) for (const [x0, y0, z0, sag] of []) for (let k = 0; k <= 22; k++) {
      const u = k / 22, x = x0 * (1 - u), z = z0 + (mz - z0) * u, y = y0 + (mt - y0) * u - Math.sin(u * Math.PI) * sag; dp.add(x, y, z, K(2400, 3.2), .06); bulbs.push([x, y, z]);
    }
    dp.add(-3.55, DY + BW, 1, [1.6, .1, .08], .07); dp.add(3.55, DY + BW, 1, [.1, 1.6, .25], .07);
    for (let i = 0; i < edge.length; i++) dp.add(edge[i][0] * .9, DY + .06, edge[i][1] - .1, K(4500, .8), .05);
    deck.add(dp.mesh(ptMat(false, { uMinPx: { value: 1 } })));
    for (const [x, y, z] of [[-1.8, 3.2, 3], [1.8, 3.2, 3], [0, 3, 6]]) { const L = new THREE.PointLight(0xdde4f2, 1.4, 7, 1.8); L.position.set(x, y, -z); deck.add(L); }
    deck.add(new THREE.HemisphereLight(0x223355, 0x080605, .25));
    // 함께 탄 사람(최대 6명): 난간 쪽에 서서 강을 보는 모습
    const riderMeshes = [];
    const SL = [[-2.75, -3], [2.75, -3.6], [-2.75, -6.5], [2.75, -7.2], [-2.75, -10], [2.75, -10.6]];
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: .8 });
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(.2, .75, 4, 10), mat); body.position.y = DY + .65; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(.13, 14, 10), new THREE.MeshStandardMaterial({ color: 0x2a1d18, roughness: .9 })); head.position.y = DY + 1.42; g.add(head);
      g.position.set(SL[i][0], 0, -SL[i][1]); g.rotation.y = Math.atan2(SL[i][0], SL[i][1]) + Math.PI; g.visible = false; deck.add(g); riderMeshes.push({ g, mat });
    }
    G.add(deck);
    cruise = { G, water, deck, flag, flagGeo, boards, boat, banner, banCv, banTex, far, fMat, riderMeshes, setBan(n) { if (n === banName) return; banName = n; const x = banCv.getContext("2d"); x.clearRect(0, 0, 640, 96); if (n) { x.fillStyle = "rgba(40,28,10,.85)"; x.fillRect(0, 0, 640, 96); x.strokeStyle = "rgba(255,205,95,.9)"; x.lineWidth = 3; x.strokeRect(2, 2, 636, 92); x.font = "700 44px sans-serif"; x.fillStyle = "#ffe2a0"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(`💛 ${n}님, 응원 고마워요`, 320, 50); } banTex.needsUpdate = true; banner.visible = !!n; } };
  }

  // ====================== 🗼 남산타워 장면 ======================
  // 트립 좌표: x 동쪽, z 북쪽, y 해발(m). 땅은 해발 30m. 카메라 = 전망대(바닥 478m)
  let tower = null;
  const GY = 30;
  const Y63 = o.DECKS ? o.DECKS.sky63 : { x: -4300, z: -3520 };
  const LG = o.DECKS && o.DECKS.lounge ? o.DECKS.lounge : { x: 600, z: -3520, floor: 136 };   // 🛋 79차 한강 라운지 빌딩(주변 빌딩은 비운다)
  const nearLG = (x, z, r) => Math.hypot(x - LG.x, z - LG.z) < r;
  const ISLES = [[-6150, 420, 140], [-2600, 260, 70]];   // 밤섬, 노들섬 [x, 반지름 x, 반지름 z]
  function buildTower() {
    const G = new THREE.Group(), r = rng(480);
    const riverZ = o.riverZ, RW = 480;
    const inRiver = (x, z) => Math.abs(z - riverZ(x)) < RW + 20;
    const mountains = [[200, 11800, 3800, 790], [-1700, 3300, 900, 300], [-2400, -9300, 2600, 600], [-9800, 5800, 2200, 300], [11500, 4200, 1800, 280], [2600, 6200, 1200, 340], [6200, -9800, 1800, 300], [-12500, -2000, 1500, 200]];
    const mtnH = (x, z) => { let h = 0; for (const [mx, mzz, rad, hh] of mountains) { const d = Math.hypot(x - mx, (z - mzz) * 1.25) / rad; if (d < 1.6) h = Math.max(h, hh * Math.exp(-d * d * 2.2) * (.8 + .2 * Math.sin(x * .004) * Math.cos(z * .003))); } return h; };
    const namsanH = (x, z) => { const d = Math.hypot(x * 1.2, z) / 620; return 230 * Math.exp(-d * d); };
    // 🏙 샛강: 여의도 남쪽을 감싸 도는 작은 물길(여의도가 섬으로 보이게). 폭 약 80m
    const SAET = [[-7050, -2600], [-6950, -3250], [-6700, -3950], [-6250, -4260], [-5450, -4370], [-4720, -4230], [-4180, -3820], [-3960, -3380]];
    const saetD = (x, z) => { let m = 1e9; for (let i = 0; i < SAET.length - 1; i++) { const [ax, az] = SAET[i], [bx, bz] = SAET[i + 1], ux = bx - ax, uz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * ux + (z - az) * uz) / (ux * ux + uz * uz))); m = Math.min(m, Math.hypot(x - ax - ux * t, z - az - uz * t)); } return m; };
    const dark = (x, z) => mtnH(x, z) > 60 || namsanH(x, z) > 25 || inRiver(x, z) || saetD(x, z) < 70 || (Math.hypot(x + 300, z + 1700) < 700) /* 용산공원 */;
    // 동네 밀도(도심·강남·여의도·잠실 등)
    const D = [[0, 0, 2600, .5], [1500, -1300, 1200, 1.4], [-600, 1600, 1100, 1.7], [-1900, -1600, 1200, 1.3], [-200, 2800, 1700, 1.6], [-5900, -2900, 1100, 1.8], [6200, -6200, 3200, 1.7], [9200, -5400, 2000, 1.5], [-3500, 1800, 2600, 1], [3500, 2600, 2800, 1.1], [-1800, -1400, 1500, 1.1], [-1500, -8500, 3500, .9], [-9500, -2500, 3500, 1], [10500, 1500, 3500, .9], [3000, -9500, 3500, .9], [-6500, 3500, 3000, .8], [-11000, 2500, 3500, .8], [12500, -2500, 3000, .7]];
    const dens = (x, z) => { let s = .12; for (const [cx, cz, rad, w] of D) { const d = Math.hypot(x - cx, z - cz) / rad; s += w * Math.exp(-d * d * 1.5); } return s; };
    // 🌃 잠실 격자(서울스카이 발밑): 230m 블록 + 24m 길. 블록마다 아파트 단지·업무 빌딩·공원. 따로 씨앗(rj)을 써서 다른 동네 모양은 그대로
    const rj = rng(123), JX0 = 6900, JX1 = 10690, JZ0 = -7430, JZ1 = -4900, JB = 230;
    const LAKES = [[8550, -6250, 330, 150, .35], [9250, -6300, 300, 140, -.25]];
    const inLake = (x, z, m = 1.1) => LAKES.some(([lx, lz, rx, rz, rot]) => { const dx = x - lx, dz = z - lz, ex = dx * Math.cos(rot) + dz * Math.sin(rot), ez = -dx * Math.sin(rot) + dz * Math.cos(rot); return (ex / (rx * m)) ** 2 + (ez / (rz * m)) ** 2 < 1; });
    const inJam = (x, z) => x > JX0 - 20 && x < JX1 + 20 && z > JZ0 - 20 && z < JZ1 + 60;
    const JAMB = [];
    for (let gx = JX0; gx < JX1; gx += JB) for (let gz = JZ0; gz < JZ1; gz += JB) {
      const cx = gx + JB / 2, cz = gz + JB / 2; if (gz + JB > riverZ(cx) - RW - 90) continue;
      let kind = "apt";
      if (Math.abs(cx - 8800) < 240 && Math.abs(cz + 5930) < 160) kind = "mall";
      else if (inLake(cx, cz, 1.25)) kind = "lake";
      else if (Math.hypot((cx - 6600) / 1.25, cz + 5100) < 200) kind = "stadium";
      else if (Math.hypot(cx - 10900, cz + 6400) < 700) kind = "park";
      else if (Math.abs(cx - 8800) < 950 && Math.abs(cz + 5900) < 360) kind = "office";
      else if (rj() < .1) kind = "green";
      JAMB.push({ gx, gz, cx, cz, kind, h: 72 + rj() * 34, tw: rj() < .22, hue: rj() });
    }
    // 1) 도시 불빛 지도: 길(가로등 줄)·창문 점·빛 번짐을 큰 그림 한 장에. 강·산·공원은 어둡게
    const EXT = 13000, TS = maxTex >= 4096 && !phone ? 4096 : 3072, px = TS / (2 * EXT);
    const cv = document.createElement("canvas"); cv.width = cv.height = TS; const x = cv.getContext("2d");
    const toP = (wx, wz) => [(wx + EXT) * px, (EXT - wz) * px];
    x.fillStyle = "#2e2650"; x.fillRect(0, 0, TS, TS);
    for (let wz = -EXT; wz < EXT; wz += 60) for (let wx = -EXT; wx < EXT; wx += 60) {
      const cxm = wx + 30, czm = wz + 30, [p, q] = toP(wx, wz + 60);
      if (mtnH(cxm, czm) > 60 || namsanH(cxm, czm) > 25 || Math.hypot(cxm + 300, czm + 1700) < 700) { x.fillStyle = "#1c2338"; x.fillRect(p, q, 60 * px + 1, 60 * px + 1); }
      else { const dn = dens(cxm, czm); if (dn > .6) { x.fillStyle = `rgba(110,92,150,${Math.min(.3, (dn - .6) * .25)})`; x.fillRect(p, q, 60 * px + 1, 60 * px + 1); } }
    }
    const roads = [], cells = [];
    // 큰길: 동네마다 기울어진 격자 + 방사형 큰길
    for (let gx = -EXT; gx < EXT; gx += 1500) for (let gz = -EXT; gz < EXT; gz += 1500) {
      const cx = gx + 750, cz = gz + 750, dn = dens(cx, cz); if (dn < .25) continue;
      const ang = ((Math.floor(gx / 3000) * 13 + Math.floor(gz / 3000) * 7) % 40 - 20) * RAD + (r() - .5) * .1, ca = Math.cos(ang), sa = Math.sin(ang);
      const sp = dn > 1 ? 160 : dn > .6 ? 220 : 320;
      cells.push({ cx, cz, ang, ca, sa, sp, dn });
      for (let k = -900; k <= 900; k += sp) for (const rot of [0, 1]) {
        const major = Math.abs(k) % (sp * 4) < sp * .5, L = 900;
        const [dx, dz] = rot ? [ca, -sa] : [sa, ca], [ox, oz] = rot ? [sa * k, ca * k] : [ca * k, -sa * k];
        const a = [cx + ox - dx * L, cz + oz - dz * L], b = [cx + ox + dx * L, cz + oz + dz * L];
        roads.push({ a, b, major, dn, white: r() < .45 });
      }
    }
    // 강변 고속도로(강북 강변북로·강남 올림픽대로): 양쪽 강가 주황 줄
    const riverRoads = [];
    for (let i = -16000; i < 16000; i += 400) for (const side of [-1, 1]) { const a = [i, riverZ(i) + side * (RW + 60)], b = [i + 400, riverZ(i + 400) + side * (RW + 60)]; riverRoads.push({ a, b, side }); }
    x.lineCap = "round";
    for (const rd of roads) {
      const steps = Math.ceil(Math.hypot(rd.b[0] - rd.a[0], rd.b[1] - rd.a[1]) / 120);
      for (let s = 0; s < steps; s++) {
        const u0 = s / steps, u1 = (s + 1) / steps, ax = rd.a[0] + (rd.b[0] - rd.a[0]) * u0, az = rd.a[1] + (rd.b[1] - rd.a[1]) * u0, bx = rd.a[0] + (rd.b[0] - rd.a[0]) * u1, bz = rd.a[1] + (rd.b[1] - rd.a[1]) * u1;
        if (dark((ax + bx) / 2, (az + bz) / 2)) continue;
        const [p1, q1] = toP(ax, az), [p2, q2] = toP(bx, bz);
        x.strokeStyle = rd.major ? "#4a4468" : "#3c3658"; x.lineWidth = Math.max(1, (rd.major ? 30 : 14) * px); x.beginPath(); x.moveTo(p1, q1); x.lineTo(p2, q2); x.stroke();
        if (rd.major) { x.strokeStyle = "rgba(235,195,90,.8)"; x.lineWidth = .6; x.setLineDash([2, 2.4]); x.beginPath(); x.moveTo(p1, q1); x.lineTo(p2, q2); x.stroke(); x.setLineDash([]);
          x.fillStyle = "rgba(255,210,140,.55)"; for (let u = r() * .3; u < 1; u += .3) x.fillRect(p1 + (p2 - p1) * u - .4, q1 + (q2 - q1) * u - .4, 1, 1); }
      }
    }
    for (const rd of riverRoads) { const [p1, q1] = toP(...rd.a), [p2, q2] = toP(...rd.b); x.strokeStyle = "#4a4468"; x.lineWidth = Math.max(1.5, 40 * px); x.beginPath(); x.moveTo(p1, q1); x.lineTo(p2, q2); x.stroke(); x.strokeStyle = "rgba(235,195,90,.75)"; x.lineWidth = .6; x.setLineDash([2, 2.4]); x.stroke(); x.setLineDash([]); }
    // 창문·간판 점
    for (let i = 0; i < 260000; i++) {
      const wx = (r() * 2 - 1) * EXT, wz = (r() * 2 - 1) * EXT, dn = dens(wx, wz); if (r() > dn * .55 || dark(wx, wz) || Math.hypot(wx, wz) < 4200) continue;
      const [p, q] = toP(wx, wz); x.fillStyle = `rgba(255,${200 + r() * 40 | 0},${110 + r() * 50 | 0},${.25 + r() * .45})`; x.fillRect(p, q, .9, .9);
    }
    // 빛 번짐(빛공해 안개)
    { const c2 = document.createElement("canvas"); c2.width = c2.height = TS / 8; const y = c2.getContext("2d"); y.drawImage(cv, 0, 0, TS / 8, TS / 8); x.globalCompositeOperation = "lighter"; x.globalAlpha = .25; x.filter = "blur(3px)"; x.drawImage(c2, 0, 0, TS, TS); x.filter = "none"; x.globalAlpha = 1; x.globalCompositeOperation = "source-over"; }
    // 강은 까맣게(물은 따로 반사면)
    x.fillStyle = "#141838"; x.beginPath(); for (let i = -EXT - 500; i <= EXT + 500; i += 200) { const [p, q] = toP(i, riverZ(i) + RW); i === -EXT - 500 ? x.moveTo(p, q) : x.lineTo(p, q); } for (let i = EXT + 500; i >= -EXT - 500; i -= 200) { const [p, q] = toP(i, riverZ(i) - RW); x.lineTo(p, q); } x.fill();
    x.strokeStyle = "#141838"; x.lineCap = x.lineJoin = "round"; x.lineWidth = 80 * px; x.beginPath(); SAET.forEach(([wx, wz], i) => { const [p, q] = toP(wx, wz); i ? x.lineTo(p, q) : x.moveTo(p, q); }); x.stroke();
    const cityTex = new THREE.CanvasTexture(cv); cityTex.colorSpace = THREE.SRGBColorSpace; cityTex.anisotropy = aniso; cityTex.minFilter = THREE.LinearMipmapLinearFilter; cityTex.generateMipmaps = true;
    // 땅: 산 높이를 반영한 격자(가까울수록 촘촘), 불빛 지도를 빛으로
    const groundMat = new THREE.ShaderMaterial({ uniforms: uni({ uMap: { value: cityTex }, uExt: { value: EXT } }), side: THREE.DoubleSide,
      vertexShader: GL_COMMON + `varying vec2 vU; varying float vD; varying float vH; uniform float uExt; void main() { vU = vec2((position.x + uExt) / (2. * uExt), (-position.z + uExt) / (2. * uExt)); vH = position.y; vec4 mv = modelViewMatrix * vec4(position, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: GL_COMMON + `uniform sampler2D uMap; varying vec2 vU; varying float vD; varying float vH; void main() {
        vec3 c = texture2D(uMap, vec2(vU.x, 1. - vU.y)).rgb; c = pow(c, vec3(2.2)) * 1.05;
        c *= .45 + .55 * smoothstep(1., .0, (vH - 60.) / 500.);
        float e = max(abs(vU.x - .5), abs(vU.y - .5)) * 2.; c *= smoothstep(1., .85, e);
        float f = 1. - exp(-vD * uHazeD); gl_FragColor = vec4(mix(c, uHaze, f), 1.); }` });
    {
      const N = 220, pos = [], idx = [];
      for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
        const u = i / N * 2 - 1, v = j / N * 2 - 1, sx = Math.sign(u) * Math.pow(Math.abs(u), 1.6) * EXT, sz = Math.sign(v) * Math.pow(Math.abs(v), 1.6) * EXT;
        const h = GY + Math.max(mtnH(sx, sz), namsanH(sx, sz));
        pos.push(sx, h, -sz);
      }
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      const m = new THREE.Mesh(g, groundMat); m.frustumCulled = false; G.add(m);
    }
    // 동네 집(1번 그림 느낌): 박공지붕 집·평지붕 빌라, 노란 창불, 길 격자 안에만. 인스턴스로 그려 가볍게
    {
      const mkHouse = gable => {
        const P = [], A = []; const q = (a, b, c, d, roof) => { P.push(...a, ...b, ...c, ...a, ...c, ...d); for (let i = 0; i < 6; i++) A.push(roof); };
        const y1 = 1, o = .06;
        q([-.5, 0, .5], [.5, 0, .5], [.5, y1, .5], [-.5, y1, .5], 0); q([.5, 0, -.5], [-.5, 0, -.5], [-.5, y1, -.5], [.5, y1, -.5], 0);
        q([.5, 0, .5], [.5, 0, -.5], [.5, y1, -.5], [.5, y1, .5], 0); q([-.5, 0, -.5], [-.5, 0, .5], [-.5, y1, .5], [-.5, y1, -.5], 0);
        if (gable) { const rh = .38; q([-.5 - o, y1 - .03, .5 + o], [.5 + o, y1 - .03, .5 + o], [.5 + o, y1 + rh, 0], [-.5 - o, y1 + rh, 0], 1); q([.5 + o, y1 - .03, -.5 - o], [-.5 - o, y1 - .03, -.5 - o], [-.5 - o, y1 + rh, 0], [.5 + o, y1 + rh, 0], 1);
          P.push(.5, y1, .5, .5, y1, -.5, .5, y1 + rh, 0, -.5, y1, -.5, -.5, y1, .5, -.5, y1 + rh, 0); A.push(0, 0, 0, 0, 0, 0); }
        else { q([-.5, y1, .5], [.5, y1, .5], [.5, y1, -.5], [-.5, y1, -.5], 1); q([-.5, y1, .5], [.5, y1, .5], [.5, y1 + .06, .5], [-.5, y1 + .06, .5], 1); }
        const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("aRoof", new THREE.Float32BufferAttribute(A, 1)); g.computeVertexNormals(); return g;
      };
      const houseMat = new THREE.ShaderMaterial({ uniforms: uni(),
        vertexShader: GL_COMMON + `attribute float aRoof; varying vec3 vN; varying vec3 vL; varying vec3 vS; varying float vRoof; varying float vD;
          void main() { mat4 im = mat4(1.);
            #ifdef USE_INSTANCING
            im = instanceMatrix;
            #endif
            vec3 sc = vec3(length(im[0].xyz), length(im[1].xyz), length(im[2].xyz)); vL = position * sc; vRoof = aRoof;
            vN = normalize(mat3(im) * (normal / sc)); vS = vec3(.5);
            #ifdef USE_INSTANCING_COLOR
            vS = instanceColor;
            #endif
            vec4 mv = modelViewMatrix * im * vec4(position, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: GL_COMMON + `varying vec3 vN; varying vec3 vL; varying vec3 vS; varying float vRoof; varying float vD;
          void main() { float seed = vS.x; vec3 N = normalize(vN); float lt = .5 + .5 * max(dot(N, normalize(vec3(.35, .8, .45))), 0.); vec3 col;
            float k = fract(seed * 7.13);
            if (vRoof > .5) col = (k < .4 ? vec3(.16, .075, .085) : k < .7 ? vec3(.19, .1, .08) : vec3(.1, .075, .16)) * lt * 1.15;
            else {
              float k2 = fract(seed * 3.7); col = (k2 < .4 ? vec3(.065, .06, .17) : k2 < .7 ? vec3(.085, .072, .18) : vec3(.052, .05, .13)) * lt;
              float hz = abs(N.x) > .5 ? vL.z : vL.x; vec2 f = vec2(fract(hz / 4. + .5), fract(vL.y / 4.4));
              float m = step(.3, f.x) * step(f.x, .7) * step(.32, f.y) * step(f.y, .78) * step(1.8, vL.y) * step(abs(N.y), .5) * step(vL.y, vS.z - .9);
              float on = step(h13(vec3(floor(hz / 4. + .5), floor(vL.y / 4.4), seed * 97. + N.x * 3. + N.z * 7.)), .55);
              col += vec3(1., .72, .32) * m * on * (.75 + .3 * fract(seed * 31.));
            }
            float f2 = 1. - exp(-vD * uHazeD); gl_FragColor = vec4(mix(col, uHaze, f2), 1.); }` });
      const HM = { g: [], f: [] }, MAX = phone ? 22000 : 34000, Y3 = new THREE.Vector3(0, 1, 0), mtx = new THREE.Matrix4(), qu = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3();
      const apt = new Blds(); let nApt = 0;
      const sorted = cells.map(c => [Math.hypot(c.cx, c.cz), c]).filter(c => c[0] < 6200).sort((a, b) => a[0] - b[0]);
      for (const [dc, c] of sorted) {
        const STEP = dc < 2200 ? 26 : dc < 3800 ? 32 : 44, keep = dc < 2200 ? .75 : .6;
        for (let a1 = -750; a1 < 750; a1 += STEP) for (let a2 = -750; a2 < 750; a2 += STEP) {
          if ((HM.g.length + HM.f.length) / 2 >= MAX) break;
          if (r() > keep) continue;
          const l1 = a1 + (r() - .5) * 4, l2 = a2 + (r() - .5) * 4, m1 = ((l1 + 900) % c.sp + c.sp) % c.sp, m2 = ((l2 + 900) % c.sp + c.sp) % c.sp;
          if (m1 < 20 || m1 > c.sp - 20 || m2 < 20 || m2 > c.sp - 20) continue;
          const wx = c.cx + c.ca * l1 + c.sa * l2, wz = c.cz - c.sa * l1 + c.ca * l2, d = Math.hypot(wx, wz);
          if (d < 650 || dark(wx, wz) || r() > Math.min(1, dens(wx, wz) * 1.1 + .6) || nearLG(wx, wz, 60)) continue;
          const gy = GY + Math.max(mtnH(wx, wz), namsanH(wx, wz));
          if (c.dn > .9 && r() < .035 && nApt < 700) { nApt++; apt.add(wx, wz, 14, 34 + r() * 16, -c.ang + (r() < .5 ? 0 : Math.PI / 2), gy, 24 + r() * 26, 0, r() * 100, .45 + r() * .2, 0, false); continue; }
          const flat = r() < .4, w = 15 + r() * 8, dd = 14 + r() * 7, h = flat ? 13 + (r() * 3 | 0) * 4.4 : 7 + (r() < .5 ? 4.4 : 0);
          qu.setFromAxisAngle(Y3, -c.ang + (r() < .5 ? 0 : Math.PI / 2)); mtx.compose(V.set(wx, gy - .3, -wz), qu, S.set(w, h, dd));
          (flat ? HM.f : HM.g).push(mtx.clone(), [r(), 0, h]);
        }
      }
      for (const [k, geo] of [["g", mkHouse(true)], ["f", mkHouse(false)]]) {
        const L = HM[k]; if (!L.length) continue; const im = new THREE.InstancedMesh(geo, houseMat, L.length / 2), col = new THREE.Color();
        for (let i = 0; i < L.length; i += 2) { im.setMatrixAt(i / 2, L[i]); im.setColorAt(i / 2, col.setRGB(L[i + 1][0], L[i + 1][1], L[i + 1][2])); }
        im.frustumCulled = false; G.add(im);
      }
      G.add(apt.mesh(bldMat(false)));
      T_DBG.houses = (HM.g.length + HM.f.length) / 2;
      // 가로수: 큰길 따라, 남산 자락
      const trees = [];
      for (const rd of roads) { if (!rd.major) continue; const L = Math.hypot(rd.b[0] - rd.a[0], rd.b[1] - rd.a[1]), dx = (rd.b[0] - rd.a[0]) / L, dz = (rd.b[1] - rd.a[1]) / L;
        for (let u = 0; u < L; u += 20) for (const e of [-1, 1]) { const wx = rd.a[0] + dx * u - dz * e * 16, wz = rd.a[1] + dz * u + dx * e * 16, d = Math.hypot(wx, wz); if (d > 3800 || d < 650 || dark(wx, wz) || r() < .25) continue; trees.push([wx, wz]); } }
      for (let i = 0; i < 3000; i++) { const a = r() * TAU, rr = 450 + r() * 700, wx = Math.sin(a) * rr / 1.2, wz = Math.cos(a) * rr; const h = namsanH(wx, wz); if (h < 8 || h > 200) continue; trees.push([wx, wz]); }
      for (let i = 0; i < 3500; i++) { const a = r() * TAU, rr = Math.sqrt(r()) * 680; trees.push([-300 + Math.sin(a) * rr, -1700 + Math.cos(a) * rr]); }  // 용산공원 숲
      // 🏙 여의도: 한강공원(강가 숲띠)·여의도공원(가운데 긴 숲)·밤섬·노들섬
      for (let i = 0; i < 2600; i++) { const wx = -6600 + r() * 2700, wz = riverZ(wx) - RW - 25 - r() * 120; if (Math.abs(wx - Y63.x) < 40) continue; trees.push([wx, wz]); }
      for (let i = 0; i < 1500; i++) trees.push([-5620 + (r() - .5) * 170, -3460 - r() * 820]);
      // 잠실 길 가로수·작은 공원
      for (let x = JX0; x <= JX1; x += JB) for (let z = JZ0 + 10; z < JZ1; z += 22) for (const e of [-1, 1]) { const tx = x + e * 15; if (z > riverZ(tx) - RW - 100 || inLake(tx, z) || (Math.abs(tx - 8800) < 140 && Math.abs(z + 5930) < 90)) continue; trees.push([tx, z]); }
      for (let z = JZ0; z <= JZ1; z += JB) for (let x = JX0 + 10; x < JX1; x += 22) for (const e of [-1, 1]) { const tz = z + e * 15; if (tz > riverZ(x) - RW - 100 || inLake(x, tz) || (Math.abs(x - 8800) < 140 && Math.abs(tz + 5930) < 90)) continue; trees.push([x, tz]); }
      for (const b of JAMB) { if (b.kind === "green") for (let i = 0; i < 90; i++) trees.push([b.gx + 20 + rj() * 190, b.gz + 20 + rj() * 190]); if (b.kind === "apt") for (let i = 0; i < 14; i++) trees.push([b.gx + 20 + rj() * 190, b.gz + (rj() < .5 ? 34 : 196) + (rj() - .5) * 8]); if (b.kind === "lake") for (let i = 0; i < 60; i++) { const tx = b.gx + rj() * JB, tz = b.gz + rj() * JB; if (!inLake(tx, tz, 1.08) && inLake(tx, tz, 1.4)) trees.push([tx, tz]); } }
      for (let i = 0; i < 2200; i++) { const a = r() * TAU, rr = Math.sqrt(r()); trees.push([10900 + Math.cos(a) * rr * 700, -6400 + Math.sin(a) * rr * 600]); }   // 올림픽공원 숲
      for (const [ix, rx, rz] of ISLES) for (let i = 0; i < (rx > 300 ? 700 : 180); i++) { const a = r() * TAU, rr = Math.sqrt(r()) * .85; trees.push([ix + Math.cos(a) * rr * rx, riverZ(ix) + Math.sin(a) * rr * rz, -9]); }
      const treeMat = new THREE.ShaderMaterial({ uniforms: uni(), vertexShader: GL_COMMON + `varying vec3 vN; varying float vD; void main() { mat4 im = mat4(1.);
          #ifdef USE_INSTANCING
          im = instanceMatrix;
          #endif
          vN = normalize(mat3(im) * normal); vec4 mv = modelViewMatrix * im * vec4(position, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: GL_COMMON + `varying vec3 vN; varying float vD; void main() { float lt = .45 + .55 * max(dot(normalize(vN), normalize(vec3(.35, .8, .45))), 0.); vec3 c = vec3(.025, .07, .075) * lt; float f = 1. - exp(-vD * uHazeD); gl_FragColor = vec4(mix(c, uHaze, f), 1.); }` });
      const tg = new THREE.IcosahedronGeometry(1, 0), tim = new THREE.InstancedMesh(tg, treeMat, trees.length);
      trees.forEach(([wx, wz, isl], i) => { const s2 = 3.5 + r() * 3, gy = isl ? GY - 1 : GY + Math.max(mtnH(wx, wz), namsanH(wx, wz)); mtx.compose(V.set(wx, gy + s2 * 1.1, -wz), qu.identity(), S.set(s2, s2 * 1.15, s2)); tim.setMatrixAt(i, mtx); });
      tim.frustumCulled = false; G.add(tim);
    }
    // 바깥 고리(13km~45km): 지평선까지 이어지는 흐린 도시빛
    {
      const ringMat = new THREE.ShaderMaterial({ uniforms: uni(), side: THREE.DoubleSide,
        vertexShader: `varying vec3 vW; varying float vD; void main() { vW = position; vec4 mv = modelViewMatrix * vec4(position, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: GL_COMMON + NOISE + `varying vec3 vW; varying float vD; void main() { float n = fbm(vW.xz / 2500.); float sp = step(.988, n2(vW.xz / 40.)); vec3 c = vec3(.04, .036, .13) * (.8 + .5 * smoothstep(.45, .8, n)) + vec3(1., .75, .4) * sp * .25; float f = 1. - exp(-vD * uHazeD * 1.1); gl_FragColor = vec4(mix(c, uHaze * 1.15, f), 1.); }` });
      const g = new THREE.RingGeometry(EXT * .98, 45000, 96, 4); g.rotateX(-Math.PI / 2); g.translate(0, GY, 0);
      const m = new THREE.Mesh(g, ringMat); m.frustumCulled = false; G.add(m);
    }
    // 2) 3D 빌딩(창문 셰이더): 도심·여의도·강남·잠실·용산은 높게
    const bl = new Blds();
    const tall = [[-5900, -2800, 1000, 26, 260], [6200, -6000, 2800, 60, 200], [9300, -5300, 1500, 30, 200], [-300, 2900, 1300, 45, 150], [-1700, -1500, 900, 18, 210], [1500, -1300, 1200, 14, 120], [-1200, 1800, 900, 20, 120]];
    for (let i = 0; i < 2600; i++) {
      let cx, cz, hmax;
      if (i >= 2600 && i < 6500) { const a = r() * TAU, d = 850 + Math.pow(r(), 1.3) * 3800; cx = Math.sin(a) * d; cz = Math.cos(a) * d; hmax = 40; if (r() > dens(cx, cz) * 1.2) continue; }
      else if (i < 900) { const t = tall[i % tall.length], a = r() * TAU, d = Math.sqrt(r()) * t[2]; cx = t[0] + Math.sin(a) * d; cz = t[1] + Math.cos(a) * d; hmax = t[4]; }
      else if (i < 2600) { const a = r() * TAU, d = 900 + Math.pow(r(), .85) * 9000; cx = Math.sin(a) * d; cz = Math.cos(a) * d; hmax = 70; if (r() > dens(cx, cz) * .8) continue; }
      if (dark(cx, cz) || Math.hypot(cx, cz) < 800 || inJam(cx, cz) || nearLG(cx, cz, 110)) continue;
      const low = i >= 2600, apt = low ? r() < .35 : i >= 900 ? r() < .7 : r() < .25, h = low ? (apt ? 35 + r() * 40 : 10 + r() * r() * 45) : apt ? 40 + r() * 60 : 30 + r() * r() * hmax + (i < 900 ? 30 : 0);
      const type = apt ? 0 : low ? (r() < .5 ? 2 : 1) : r() < .7 ? 1 : 2, sx = apt ? 16 : low ? 14 + r() * 20 : 25 + r() * 25, sz = apt ? 50 + r() * 25 : low ? 14 + r() * 24 : 25 + r() * 25;
      const rot = ((Math.floor(cx / 3000) * 13 + Math.floor(cz / 3000) * 7) % 40 - 20) * RAD + (r() < .3 ? Math.PI / 2 : 0);
      bl.add(cx, cz, sx, sz, rot, GY, h, type, r() * 100, type === 0 ? .42 + r() * .2 : .32 + r() * .25, h > 120 && r() < .5 ? (r() < .5 ? 2 : 1) : 0, low && r() < .5);
    }
    // 🌃 잠실 동네: 블록마다 같은 방향·같은 높이로 줄 선 아파트(판상형 2×3 또는 탑상형 4동), 업무 빌딩, 옥상 기계실
    const jb = new Bake();
    for (const B of JAMB) {
      const L0 = B.gx + 12, S = 206;
      if (B.kind === "apt") {
        const spots = B.tw ? [[.28, .28], [.72, .28], [.28, .72], [.72, .72]] : [[.27, .2], [.73, .2], [.27, .5], [.73, .5], [.27, .8], [.73, .8]];
        for (const [u, v] of spots) { const x = L0 + S * u, z = B.gz + 12 + S * v, h = (B.tw ? B.h + 35 : B.h) + (rj() - .5) * 8, sx = B.tw ? 26 : 62, sz = B.tw ? 26 : 16;
          bl.add(x, z, sx, sz, 0, GY, h, 0, B.hue * 100 + u * 7 + v * 3, .42 + rj() * .22, rj() < .4 ? 1 : 0, false);
          jb.box(x, GY + h, z, B.tw ? 9 : 12, 4.5, 6, [.022, .022, .03], [.035, .035, .045], [.03, .03, .04]); }
      } else if (B.kind === "office") {
        for (const [u, v] of [[.3, .3], [.7, .7]]) { const x = L0 + S * u, z = B.gz + 12 + S * v, h = 60 + rj() * 90, w = 34 + rj() * 14;
          bl.add(x, z, w, w, 0, GY, h, 1, rj() * 100, .55 + rj() * .2, rj() < .6 ? 1 : 0, true); }
        bl.add(L0 + S * .7, B.gz + 12 + S * .28, 40, 30, 0, GY, 22, 2, rj() * 100, .6, 2, true);
      }
    }
    G.add(jb.mesh(bakedMat(false)));
    // 잠실 바닥 그림(2m 한 칸): 블록·길·횡단보도·단지 안 길·공원·호수, 가로등 빛 웅덩이. 가장자리는 아래 큰 지도와 부드럽게 이어짐
    {
      const X0 = JX0 - 160, X1 = JX1 + 160, Z0 = JZ0 - 160, Z1 = JZ1 + 160, PW = 2, cw = Math.round((X1 - X0) / PW), ch = Math.round((Z1 - Z0) / PW);
      const c = document.createElement("canvas"); c.width = cw; c.height = ch; const y = c.getContext("2d");
      const P2 = (wx, wz) => [(wx - X0) / PW, (Z1 - wz) / PW];
      y.fillStyle = "#0c0d17"; y.fillRect(0, 0, cw, ch);
      for (const B of JAMB) { const [p, q] = P2(B.gx + 12, B.gz + JB - 12), w = 206 / PW;
        y.fillStyle = B.kind === "park" || B.kind === "green" ? "#0c1a18" : B.kind === "lake" ? "#0d1316" : B.kind === "office" || B.kind === "mall" ? "#14141e" : "#12131d"; y.fillRect(p, q, w, w);
        if (B.kind === "apt") { y.strokeStyle = "#1c1d29"; y.lineWidth = 2; for (const v of [.35, .65]) { y.beginPath(); y.moveTo(p + 6, q + w * v); y.lineTo(p + w - 6, q + w * v); y.stroke(); } y.beginPath(); y.moveTo(p + w / 2, q + 6); y.lineTo(p + w / 2, q + w - 6); y.stroke();
          y.fillStyle = "#171824"; y.fillRect(p + w * .08, q + w * .9, w * .3, w * .06); for (let k = 0; k < 9; k++) { y.fillStyle = ["#3a2a2a", "#2a3040", "#3a3a40", "#20283a"][k % 4]; y.fillRect(p + w * .09 + k * 3.2, q + w * .91, 2.2, 3.6); } }
        if (B.kind === "park" || B.kind === "green") { y.strokeStyle = "rgba(200,170,110,.25)"; y.lineWidth = 1.2; y.beginPath(); y.arc(p + w / 2, q + w / 2, w * .32, 0, TAU); y.stroke(); }
      }
      // 길: 아스팔트, 노란 가운데 줄, 흰 횡단보도
      y.fillStyle = "#08080d";
      for (let x = JX0; x <= JX1; x += JB) { const [p] = P2(x - 12, 0); y.fillRect(p, 0, 24 / PW, ch); }
      for (let z = JZ0; z <= JZ1; z += JB) { const [, q] = P2(0, z + 12); y.fillRect(0, q, cw, 24 / PW); }
      y.strokeStyle = "rgba(230,190,90,.5)"; y.lineWidth = .8; y.setLineDash([5, 4]);
      for (let x = JX0; x <= JX1; x += JB) { const [p] = P2(x, 0); y.beginPath(); y.moveTo(p, 0); y.lineTo(p, ch); y.stroke(); }
      for (let z = JZ0; z <= JZ1; z += JB) { const [, q] = P2(0, z); y.beginPath(); y.moveTo(0, q); y.lineTo(cw, q); y.stroke(); }
      y.setLineDash([]); y.fillStyle = "rgba(210,210,225,.35)";
      for (let x = JX0; x <= JX1; x += JB) for (let z = JZ0; z <= JZ1; z += JB) { const [p, q] = P2(x, z); for (let k = -5; k <= 5; k++) { y.fillRect(p + k * 2 - .6, q - 9, 1.2, 3); y.fillRect(p + k * 2 - .6, q + 6, 1.2, 3); y.fillRect(p - 9, q + k * 2 - .6, 3, 1.2); y.fillRect(p + 6, q + k * 2 - .6, 3, 1.2); } }
      // 석촌호수(물은 어둡게, 둘레 산책로는 밝게)
      for (const [lx, lz, rx, rz, rot] of LAKES) { const [p, q] = P2(lx, lz); y.save(); y.translate(p, q); y.rotate(-rot); y.fillStyle = "#2a2430"; y.beginPath(); y.ellipse(0, 0, (rx + 18) / PW, (rz + 18) / PW, 0, 0, TAU); y.fill(); y.fillStyle = "#04060e"; y.beginPath(); y.ellipse(0, 0, rx / PW, rz / PW, 0, 0, TAU); y.fill(); y.restore(); }
      // 가로등 빛 웅덩이(따뜻한 빛·하얀 LED)
      y.globalCompositeOperation = "lighter";
      const pool = (p, q, rr, col, a) => { const g2 = y.createRadialGradient(p, q, 0, p, q, rr); g2.addColorStop(0, `rgba(${col},${a})`); g2.addColorStop(1, `rgba(${col},0)`); y.fillStyle = g2; y.fillRect(p - rr, q - rr, rr * 2, rr * 2); };
      for (let x = JX0; x <= JX1; x += JB) for (let z = JZ0; z <= JZ1; z += 30) for (const e of [-1, 1]) { const [p, q] = P2(x + e * 10, z); pool(p, q, 9, (x / JB | 0) % 3 ? "255,190,120" : "220,230,255", .22); }
      for (let z = JZ0; z <= JZ1; z += JB) for (let x = JX0; x <= JX1; x += 30) for (const e of [-1, 1]) { const [p, q] = P2(x, z + e * 10); pool(p, q, 9, (z / JB | 0) % 3 ? "255,190,120" : "220,230,255", .22); }
      for (const B of JAMB) if (B.kind === "apt" || B.kind === "office") for (let k = 0; k < 10; k++) { const [p, q] = P2(B.gx + 20 + rj() * 190, B.gz + 20 + rj() * 190); pool(p, q, 6, "255,200,140", .14); }
      for (const [lx, lz, rx, rz, rot] of LAKES) for (let k = 0; k < 70; k++) { const a = k / 70 * TAU, ex = Math.cos(a) * (rx + 12), ez = Math.sin(a) * (rz + 12), [p, q] = P2(lx + ex * Math.cos(rot) - ez * Math.sin(rot), lz + ex * Math.sin(rot) + ez * Math.cos(rot)); pool(p, q, 7, "255,215,160", .3); }
      y.globalCompositeOperation = "destination-out";
      // 한강 쪽과 가장자리는 지우기(투명) → 아래 큰 지도가 보임
      y.fillStyle = "#000"; y.beginPath(); for (let wx = X0; wx <= X1; wx += 40) { const [p, q] = P2(wx, riverZ(wx) - RW - 70); wx === X0 ? y.moveTo(p, q) : y.lineTo(p, q); } y.lineTo(cw, 0); y.lineTo(0, 0); y.fill();
      for (const [x0, y0, x1, y1, w, h] of [[0, 0, 80, 0, 80, ch], [cw, 0, cw - 80, 0, 80, ch], [0, 0, 0, 80, cw, 80], [0, ch, 0, ch - 80, cw, 80]]) { const gr = y.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)"); y.fillStyle = gr; y.fillRect(x0 === cw ? cw - 80 : 0, y0 === ch ? ch - 80 : 0, w, h); }
      y.globalCompositeOperation = "source-over";
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = aniso; tex.minFilter = THREE.LinearMipmapLinearFilter;
      const jm = new THREE.ShaderMaterial({ uniforms: uni({ uMap: { value: tex } }), transparent: true, depthWrite: false,
        vertexShader: `varying vec2 vU; varying float vD; void main() { vU = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: GL_COMMON + `uniform sampler2D uMap; varying vec2 vU; varying float vD; void main() { vec4 t = texture2D(uMap, vU); vec3 c = t.rgb * 1.1; float f = 1. - exp(-vD * uHazeD); gl_FragColor = vec4(mix(c, uHaze, f), t.a); }` });
      jm.polygonOffset = true; jm.polygonOffsetFactor = -3; jm.polygonOffsetUnits = -8;
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), jm); pl.rotation.x = -Math.PI / 2; pl.position.set((X0 + X1) / 2, GY + .35, -(Z0 + Z1) / 2); pl.renderOrder = 1; pl.frustumCulled = false; G.add(pl);
    }
    // 63빌딩(따로: 63 전망대 안에서는 숨김), 롯데월드타워(555m)
    const bl63 = new Blds(); bl63.add(Y63.x, Y63.z, 40, 22, 0, GY, 249, 3, 3.3, .5, 0, false); bl63.add(Y63.x, Y63.z, 30, 14, 0, GY + 249, 12, 1, 7.1, .2, 0, false);
    const b63 = bl63.mesh(bldMat(false)); G.add(b63);
    { const blg = new Blds(); blg.add(LG.x, LG.z, 34, 18, 0, GY, LG.floor - GY - .2, 1, 5.7, .45, 0, true); blg.add(LG.x, LG.z, 31, 15, 0, LG.floor + LG.ceil, 2.4, 2, 6.1, .1, 0, false); G.add(blg.mesh(bldMat(false))); }
    // 여의도 빌딩: 파크원(333m)·IFC(284m 등 세 동)·업무 빌딩 줄·남쪽 아파트
    for (const [x, z, sx, sz, h, ty, cr] of [[-4950, -3830, 46, 46, 333, 1, 1], [-4870, -3700, 42, 42, 256, 1, 1], [-5300, -3680, 44, 44, 284, 1, 1], [-5380, -3590, 40, 40, 217, 1, 0], [-5220, -3580, 38, 38, 186, 1, 0], [-5850, -3560, 46, 40, 245, 1, 1]]) bl.add(x, z, sx, sz, 0, GY, h, ty, x * .01, .55, cr, true);
    for (let i = 0; i < 70; i++) { const x = -6150 + r() * 1900, z = -3420 - r() * 700; if (Math.abs(x - -5620) < 130 || Math.hypot(x - Y63.x, z - Y63.z) < 80 || Math.hypot(x + 6350, z + 3600) < 150 || saetD(x, z) < 80) continue;
      { const ux = -6350 - Y63.x, uz = -3600 - Y63.z, L2 = ux * ux + uz * uz, tt = Math.max(0, Math.min(1, ((x - Y63.x) * ux + (z - Y63.z) * uz) / L2)); if (Math.hypot(x - Y63.x - ux * tt, z - Y63.z - uz * tt) < 110) continue; }   // 63에서 국회의사당이 보이게
      const apt = z < -3950; bl.add(x, z, apt ? 16 : 30 + r() * 20, apt ? 55 : 30 + r() * 20, apt ? .3 : 0, GY, apt ? 45 + r() * 40 : 50 + r() * r() * 130, apt ? 0 : r() < .7 ? 1 : 2, r() * 100, apt ? .5 : .4 + r() * .2, 0, r() < .4); }
    const lotte = new Bake();
    { const x0 = 8800, z0 = -5900; for (let i = 0; i < 24; i++) { const y0 = GY + i / 24 * 555, y1 = GY + (i + 1) / 24 * 555, w0 = 72 * (1 - Math.pow(i / 24, 1.6) * .9), w1 = 72 * (1 - Math.pow((i + 1) / 24, 1.6) * .9); const c = K(6500, .02 + .25 * Math.pow(i / 24, 2)), c1 = K(6500, .02 + .25 * Math.pow((i + 1) / 24, 2));
      for (let k = 0; k < 4; k++) { const a0 = k / 4 * TAU + .3, a1 = (k + 1) / 4 * TAU + .3, P = (w, y, a) => [x0 + Math.cos(a) * w * .7, y, -(z0 + Math.sin(a) * w * .7)]; lotte.quad(P(w0, y0, a0), P(w0, y0, a1), P(w1, y1, a1), P(w1, y1, a0), c, c, c1, c1, 0); } } }
    const lotteMesh = lotte.mesh(bakedMat(false, THREE.DoubleSide)); G.add(lotteMesh);
    // 국회의사당: 낮고 넓은 흰 건물 + 둥근 돔(초록빛 조명)
    const lm = new Bake();
    { const ax = -6350, az = -3600; lm.box(ax, GY, az, 122, 30, 82, K(4600, .05), K(4600, .22), [.02, .022, .03]);
      for (let k = 0; k < 24; k++) for (const e of [-1, 1]) lm.box(ax - 57 + k * 4.96, GY + 4, az + e * 42, 1.6, 24, 1.6, K(4800, .35), K(4800, .5));   // 기둥 줄
      const dr = 32, dy = GY + 30; for (let i = 0; i < 10; i++) for (let k = 0; k < 24; k++) { const a0 = i / 10 * Math.PI / 2, a1 = (i + 1) / 10 * Math.PI / 2, b0 = k / 24 * TAU, b1 = (k + 1) / 24 * TAU, P2 = (a, b) => [ax + Math.cos(a) * Math.cos(b) * dr, dy + 6 + Math.sin(a) * dr * .72, -(az + Math.cos(a) * Math.sin(b) * dr)], c0 = [.05, .16, .12].map(v => v * (1 - i / 14)), c1 = [.05, .16, .12].map(v => v * (1 - (i + 1) / 14)); lm.quad(P2(a0, b0), P2(a0, b1), P2(a1, b1), P2(a1, b0), c0, c0, c1, c1, -az); }
      lm.box(ax, GY + 30, az, 70, 6, 70, K(4600, .2), K(4600, .25)); }
    // 🌃 잠실: 석촌호수(두 호수)와 호숫가 산책로 불빛, 롯데월드 매직아일랜드 성, 잠실 주경기장
    lm.box(8800, GY, -5930, 250, 42, 150, K(5000, .06), K(5000, .25), [.014, .014, .022]);   // 롯데월드몰(타워 아래 낮은 건물)
    for (const [lx, lz, rx, rz, rot] of LAKES) { const N2 = 36, c = [.006, .01, .03]; for (let k = 0; k < N2; k++) { const a0 = k / N2 * TAU, a1 = (k + 1) / N2 * TAU, Q = a => { const ex = Math.cos(a) * rx, ez = Math.sin(a) * rz; return [lx + ex * Math.cos(rot) - ez * Math.sin(rot), GY + 1.2, -(lz + ex * Math.sin(rot) + ez * Math.cos(rot))]; }; lm.tri([lx, GY + 1.2, -lz], Q(a0), Q(a1), c, c, c, -lz); } }
    { const sx = 6600, sz = -5100; for (let k = 0; k < 40; k++) { const a0 = k / 40 * TAU, a1 = (k + 1) / 40 * TAU, Q = (rr, y, a) => [sx + Math.cos(a) * rr * 1.25, y, -(sz + Math.sin(a) * rr)]; lm.quad(Q(110, GY, a0), Q(110, GY, a1), Q(110, GY + 34, a1), Q(110, GY + 34, a0), [.03, .03, .04], [.03, .03, .04], K(5000, .5), K(5000, .5), -sz); lm.quad(Q(110, GY + 34, a0), Q(110, GY + 34, a1), Q(70, GY + 4, a1), Q(70, GY + 4, a0), [.05, .05, .07], [.05, .05, .07], [.02, .04, .02], [.02, .04, .02], -sz); } }
    { const cx2 = 8500, cz2 = -6250; lm.box(cx2, GY, cz2, 34, 22, 26, K(5200, .3), K(5200, .5)); for (const [dx, dz, hh] of [[-14, -10, 44], [14, -10, 40], [0, 8, 52], [-12, 10, 36], [12, 10, 38]]) { lm.box(cx2 + dx, GY + 22, cz2 + dz, 6, hh - 22, 6, K(5200, .45), K(9000, .7)); for (let k = 0; k < 6; k++) { const a0 = k / 6 * TAU, a1 = (k + 1) / 6 * TAU, c0 = [.6, .25, .55]; lm.tri([cx2 + dx + Math.cos(a0) * 4.4, GY + hh, -(cz2 + dz + Math.sin(a0) * 4.4)], [cx2 + dx + Math.cos(a1) * 4.4, GY + hh, -(cz2 + dz + Math.sin(a1) * 4.4)], [cx2 + dx, GY + hh + 12, -(cz2 + dz)], c0, c0, [.9, .45, .9], -cz2); } } }
    // 밤섬·노들섬: 강 위 낮은 섬(숲은 위에서 나무로)
    for (const [ix, rx, rz] of ISLES) { const cz = riverZ(ix), N2 = 28; for (let k = 0; k < N2; k++) { const a0 = k / N2 * TAU, a1 = (k + 1) / N2 * TAU, c = [.012, .02, .02]; lm.tri([ix, GY + .9, -cz], [ix + Math.cos(a0) * rx, GY + .9, -(cz + Math.sin(a0) * rz)], [ix + Math.cos(a1) * rx, GY + .9, -(cz + Math.sin(a1) * rz)], c, c, c, -cz); } }
    { const nz = riverZ(-2600); lm.box(-2600, GY + .9, nz, 110, 14, 60, K(3000, .2), K(3000, .35), [.03, .03, .04]); }   // 노들섬 공연장
    // 남산서울타워(남산 꼭대기, 63·멀리서 보이는 탑): 기둥 + 전망대 + 안테나. 남산 전망대 안에서는 숨김
    const nt = new Bake(), ntop = GY + namsanH(0, 0);
    { const ring2 = (y0, y1, r0, r1, c0, c1, n = 20) => { for (let k = 0; k < n; k++) { const a0 = k / n * TAU, a1 = (k + 1) / n * TAU, P2 = (rr, y, a) => [Math.cos(a) * rr, y, -Math.sin(a) * rr]; nt.quad(P2(r0, y0, a0), P2(r0, y0, a1), P2(r1, y1, a1), P2(r1, y1, a0), c0, c0, c1, c1, 0); } };
      ring2(ntop, ntop + 150, 8, 5.2, [.5, .7, 1.4], [.12, .16, .3]);
      ring2(ntop + 150, ntop + 158, 5.2, 15, [.08, .1, .18], [.2, .22, .32]);
      ring2(ntop + 158, ntop + 178, 15, 15, [1.6, 1.25, .8], [1.3, 1.05, .7]);
      ring2(ntop + 178, ntop + 186, 15, 9, [.15, .16, .25], [.1, .1, .16]);
      ring2(ntop + 186, ntop + 196, 9, 9, [1.1, 1, .8], [.9, .85, .7]);
      ring2(ntop + 196, ntop + 260, 2.4, 1, [.5, .6, .9], [.25, .3, .5], 8); }
    const ntMesh = nt.mesh(bakedMat(false, THREE.DoubleSide)); G.add(ntMesh);
    G.add(lm.mesh(bakedMat(false, THREE.DoubleSide)));
    G.add(bl.mesh(bldMat(false)));
    // 3) 빛 점: 길 가로등(가까운 곳), 다리, 강변, 항공등, 차
    const P = new Pts();
    for (const rd of roads) {
      const L = Math.hypot(rd.b[0] - rd.a[0], rd.b[1] - rd.a[1]), dx = (rd.b[0] - rd.a[0]) / L, dz = (rd.b[1] - rd.a[1]) / L;
      if (!rd.major) { for (let u = r() * 60; u < L; u += 60) { const wx = rd.a[0] + dx * u, wz = rd.a[1] + dz * u, d = Math.hypot(wx, wz); if (d > 5500 || dark(wx, wz) || r() < .3) continue; P.add(wx, GY + 8, wz, rd.white ? K(4800, 2.2) : [3, 1.1, .3], 1.6); } continue; }
      for (let u = 0; u < L; u += 45) { const wx = rd.a[0] + dx * u, wz = rd.a[1] + dz * u, d = Math.hypot(wx, wz); if (d > 9000 || dark(wx, wz)) continue; P.add(wx, GY + 10, wz, rd.white ? K(5000, 4) : [5, 1.9, .5], 2.2); }
      // 차: 큰길을 따라 흐르는 앞불·뒷불
      if (rd.dn > .5) for (const dir of [0, 1]) for (let k = 0; k < 6; k++) { const a = dir ? rd.b : rd.a, b = dir ? rd.a : rd.b; if (dark((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) continue; P.add(a[0], GY + 2, a[1], dir ? [5, .25, .15] : K(5500, 5), 1.6, [(b[0] - a[0]) / L, -(b[1] - a[1]) / L, 9 + r() * 7, L], [0, r(), 0, 0]); }
    }
    for (const rd of riverRoads) { const L = Math.hypot(rd.b[0] - rd.a[0], rd.b[1] - rd.a[1]), dx = (rd.b[0] - rd.a[0]) / L, dz = (rd.b[1] - rd.a[1]) / L;
      for (let u = 0; u < L; u += 40) P.add(rd.a[0] + dx * u, GY + 12, rd.a[1] + dz * u, [6, 2.2, .6], 2.4);
      for (let k = 0; k < 10; k++) { const back = k % 2; const a = back ? rd.b : rd.a, b = back ? rd.a : rd.b; P.add(a[0] + (back ? 0 : 0), GY + 6, a[1] + rd.side * (back ? 8 : -8), back ? [5, .25, .15] : K(5500, 5), 1.7, [(b[0] - a[0]) / L, -(b[1] - a[1]) / L, 18 + r() * 8, L], [0, r(), 0, 0]); } }
    const bridgeBake = new Bake();
    // 🌉 다리: 상판 + 물속 교각 + 상판 아래 띠 불빛 + 물에 비친 불빛. 63에서 보이는 다리는 실제 모양(서강 빨간 아치·한강철교 트러스·한강/동작 아치)
    const steel = [.05, .055, .07];
    const arch = (bx, z0, u0, u1, hh, xo, col, lampCol, yb = GY + 14, n = 18) => { for (const e of xo) { const pts = []; for (let k = 0; k <= n; k++) { const t = k / n; pts.push([bx + e, yb + Math.sin(t * Math.PI) * hh, z0 + u0 + (u1 - u0) * t]); } bridgeBake.tube(pts, 1.3, col, -z0, 5);
        for (let k = 1; k < n; k++) { const [px, py, pz] = pts[k]; if (k % 2 === 0) bridgeBake.tube([[px, yb, pz], [px, py, pz]], .35, col.map(v => v * .6), -z0, 4); P.add(px, py + 1.6, pz, lampCol, 1.9); } } };
    for (const [bx, name] of o.TB) {
      const z0 = riverZ(bx), hue = name === "반포대교" ? [.4, .8, 1] : name === "한강대교" ? [1, .7, .35] : name === "동작대교" ? [.7, .6, 1] : name === "성수대교" ? [.5, 1, .8] : name === "서강대교" ? [1, .55, .45] : name === "마포대교" ? [.75, .85, 1] : [.9, .92, 1];
      const rail = name === "한강철교", Lh = RW + 120, W = rail ? 10 : 26, lines = rail ? [-27, -9, 9, 27] : [0];
      for (const lo of lines) {
        const x = bx + lo;
        bridgeBake.box(x, GY + 11, z0, W, 3, 2 * Lh, hue.map(v => v * .08), [.012, .012, .015], [.015, .015, .02], 0);
        // 교각: 물에서 상판까지(아래가 살짝 밝게 = 물빛 반사)
        for (let u = -RW + 40; u <= RW - 40; u += rail ? 62 : 80) bridgeBake.box(x, GY, z0 + u, W * .55, 11, 5, hue.map(v => v * .05), [.02, .02, .026], null, -z0);
        // 상판 옆 띠(차분한 불빛 줄) + 아래 따뜻한 등
        for (let u = -Lh; u <= Lh; u += 4) for (const e of [-1, 1]) P.add(x + e * (W / 2 + .5), GY + 12.5, z0 + u, hue.map(v => v * (rail ? 1.2 : 2.5)), 1.4);
        for (let u = -RW; u <= RW; u += 11) P.add(x, GY + 10.2, z0 + u, K(2800, 1.8), 1.5);
        // 물에 비친 불빛: 다리 아래 강물에 흔들리는 빛(반짝임)
        for (let u = -RW + 10; u <= RW - 10; u += 7) for (let k = 0; k < 2; k++) P.add(x + (r() - .5) * 46, GY + 1, z0 + u + (r() - .5) * 6, hue.map(v => v * (.9 + r())), 1.5, null, [2, r(), 1.4 + r(), 0]);
      }
      if (rail) {
        // 한강철교: 네 줄 트러스(위가 둥근 철골), 오가는 기차 불빛
        for (const lo of lines) { const x = bx + lo; for (let u = -RW + 40 - 62; u < RW - 40; u += 62) { const ua = Math.max(-Lh, u), ub = Math.min(Lh, u + 62), top = t => GY + 14 + 7 + 5 * Math.sin(t * Math.PI), N = 6;
            for (const e of [-1, 1]) { const xx = x + e * 4.6, pts = []; for (let k = 0; k <= N; k++) pts.push([xx, top(k / N), z0 + ua + (ub - ua) * k / N]); bridgeBake.tube(pts, .5, [.14, .16, .22], -z0, 4);
              for (let k = 0; k <= N; k++) { const [, py, pz] = pts[k]; bridgeBake.tube([[xx, GY + 14, pz], [xx, py, pz]], .3, [.1, .11, .15], -z0, 3); if (k < N) bridgeBake.tube([[xx, GY + 14, pz], [xx, pts[k + 1][1], pts[k + 1][2]]], .25, [.08, .09, .12], -z0, 3); }
              for (let k = 0; k <= N; k++) P.add(xx, pts[k][1] + .8, pts[k][2], K(4200, 1.6), 1.3); } }
          for (const dir of [0, 1]) { const ph = r(); for (let c = 0; c < 16; c++) P.add(x + (dir ? 1.6 : -1.6), GY + 15.5, z0 + (dir ? Lh : -Lh) + (dir ? c * 5 : -c * 5), c === 0 ? K(6500, 6) : K(4000, 2.6), c === 0 ? 2.2 : 1.6, [0, dir ? 1 : -1, 22, 2 * Lh + 400], [0, ph, 0, 0]); } }
      } else {
        for (let u = -RW - 100; u <= RW + 100; u += 22) for (const e of [-1, 1]) P.add(bx + e * 12, GY + 20, z0 + u, hue.map(v => v * 5), 2);
        for (const dir of [0, 1]) for (let k = 0; k < 10; k++) P.add(bx + (dir ? 5 : -5), GY + 16, z0 + (dir ? RW + 120 : -RW - 120), dir ? [5, .25, .15] : K(5500, 5), 1.7, [0, dir ? 1 : -1, 12 + r() * 6, 2 * RW + 240], [0, r(), 0, 0]);
      }
      if (name === "서강대교") arch(bx, z0, -95, 95, 46, [-10, 10], [1.05, .1, .07], [5, .5, .35], GY + 14, 22);   // 가운데 빨간 아치(밤섬 위)
      if (name === "한강대교") for (const [u0, u1] of [[-RW + 20, -RW + 150], [-RW + 150, -RW + 280], [RW - 280, RW - 150], [RW - 150, RW - 20]]) arch(bx, z0, u0, u1, 17, [-11, 11], [.55, .36, .16], [5, 3, 1.2], GY + 14, 12);
      if (name === "동작대교") for (const [u0, u1, hh] of [[-260, -90, 26], [-90, 90, 34], [90, 260, 26]]) arch(bx, z0, u0, u1, hh, [-12, 12], [.32, .26, .55], [3.4, 2.6, 6], GY + 14, 14);
    }
    G.add(bridgeBake.mesh(bakedMat(false)));
    // 창문·간판 불빛 점(가까운 동네): 반짝이는 결
    for (let i = 0; i < 16000; i++) { const a = r() * TAU, d = 900 + Math.pow(r(), .7) * 7000, wx = Math.sin(a) * d, wz = Math.cos(a) * d; if (dark(wx, wz) || r() > dens(wx, wz) * .7) continue; const c = r(); P.add(wx, GY + 3 + r() * 40, wz, c < .6 ? K(2900, 1.4 + r() * 1.6) : c < .92 ? K(5500, 1.2 + r() * 1.4) : [1.2, .5, 2.4], 1.4, null, [2, r(), 1 + r() * 2, 0]); }
    // 남산 둘레길 가로등, 먼 고층 항공등
    for (let i = 0; i < 160; i++) { const a = r() * TAU, rr = 250 + r() * 600; P.add(Math.sin(a) * rr / 1.2, GY + namsanH(Math.sin(a) * rr / 1.2, Math.cos(a) * rr) + 4, Math.cos(a) * rr, K(2700, 3), 2.5); }
    for (let i = 0; i < 400; i++) { const t = tall[i % tall.length], a = r() * TAU, d = Math.sqrt(r()) * t[2], cx = t[0] + Math.sin(a) * d, cz = t[1] + Math.cos(a) * d; if (dark(cx, cz)) continue; P.add(cx, GY + 90 + r() * t[4], cz, [7, .25, .15], 4, null, [1, r(), 2.6, 0]); }
    P.add(8800, GY + 560, -5900, [9, .3, .2], 9, null, [1, .3, 2.2, 0]);
    const ntP = new Pts(); ntP.add(0, GY + namsanH(0, 0) + 262, 0, [9, .3, .2], 6, null, [1, .7, 2.2, 0]);
    for (let k = 0; k < 40; k++) { const a = k / 40 * TAU; ntP.add(Math.cos(a) * 15.3, GY + namsanH(0, 0) + 168, Math.sin(a) * 15.3, K(3200, 4), 2); }
    const ntPm = ntP.mesh(ptMat(false, { uMinPx: { value: 1.25 } })); G.add(ntPm);
    // 여의도 한강공원 산책로 가로등·파크원 항공등
    for (let wx = -6600; wx < -3950; wx += 28) P.add(wx, GY + 5, riverZ(wx) - RW - 30, K(3000, 2.2), 1.6);
    for (let wx = -6500; wx < -4000; wx += 36) P.add(wx, GY + 5, riverZ(wx) - RW - 95, K(3400, 1.6), 1.4);   // 안쪽 산책로
    { const mx = -5150, mz = riverZ(-5150) - RW - 55; for (let k = 0; k < 70; k++) { const a = r() * TAU, rr = Math.sqrt(r()) * 34; P.add(mx + Math.cos(a) * rr * 1.6, GY + 1.5, mz + Math.sin(a) * rr * .7, [[1.2, 2.4, 4], [3.6, 2.4, 1.2], [3, 1.4, 3]][k % 3], 1.6, null, [2, r(), 1.6, 0]); } }   // 물빛광장(물놀이 광장) 불빛
    // 샛강 둑길 가로등 + 샛강을 건너는 작은 다리 불빛
    for (let i = 0; i < SAET.length - 1; i++) { const [ax, az] = SAET[i], [bx2, bz] = SAET[i + 1], L = Math.hypot(bx2 - ax, bz - az), nx = -(bz - az) / L, nz = (bx2 - ax) / L; for (let u = 0; u < L; u += 30) for (const e of [-1, 1]) P.add(ax + (bx2 - ax) * u / L + nx * e * 52, GY + 5, az + (bz - az) * u / L + nz * e * 52, K(3000, 1.9), 1.4); }
    for (const k of [1.5, 3.4, 4.6, 5.5]) { const i = k | 0, f = k - i, [ax, az] = SAET[i], [bx2, bz] = SAET[i + 1], cx2 = ax + (bx2 - ax) * f, cz2 = az + (bz - az) * f, L = Math.hypot(bx2 - ax, bz - az), nx = -(bz - az) / L, nz = (bx2 - ax) / L; for (let u = -60; u <= 60; u += 5) for (const e of [-6, 6]) P.add(cx2 + nx * u + (bz - az) / L * e * 0 + (bx2 - ax) / L * e, GY + 9, cz2 + nz * u + (bz - az) / L * e, K(4200, 2.2), 1.4); }
    for (const [lx, lz, rx, rz, rot] of [[8550, -6250, 330, 150, .35], [9250, -6300, 300, 140, -.25]]) for (let k = 0; k < 90; k++) { const a = k / 90 * TAU, ex = Math.cos(a) * (rx + 14), ez = Math.sin(a) * (rz + 14); P.add(lx + ex * Math.cos(rot) - ez * Math.sin(rot), GY + 5, lz + ex * Math.sin(rot) + ez * Math.cos(rot), K(3200, 2.6), 1.7); }
    for (let u = -125; u <= 125; u += 6) for (const e of [-1, 1]) { P.add(8800 + u, GY + 43, -5930 + e * 75, K(4200, 2), 1.4); if (Math.abs(u) < 75) P.add(8800 + e * 125, GY + 43, -5930 + u, K(4200, 2), 1.4); }
    for (let k = 0; k < 60; k++) { const a = r() * TAU; P.add(8500 + Math.cos(a) * 20, GY + 24 + r() * 30, -6250 + Math.sin(a) * 16, [[3, 1, 3], [1, 2.4, 3], [3, 2.4, .8]][k % 3], 1.8, null, [2, r(), 2, 0]); }   // 매직아일랜드 불빛
    for (let k = 0; k < 120; k++) { const a = k / 120 * TAU; P.add(6600 + Math.cos(a) * 112 * 1.25, GY + 36, -5100 + Math.sin(a) * 112, K(5200, 2.2), 1.8); }
    // 잠실 길: 양쪽 가로등(30m마다, 세 줄에 한 줄은 하얀 LED) + 오가는 차 불빛
    for (let x = JX0; x <= JX1; x += JB) for (let z = JZ0; z <= JZ1; z += 30) { if (z > riverZ(x) - RW - 90) continue; for (const e of [-1, 1]) P.add(x + e * 10, GY + 9, z, (x / JB | 0) % 3 ? K(3000, 2.4) : K(5200, 2.4), 1.5); }
    for (let z = JZ0; z <= JZ1; z += JB) for (let x = JX0; x <= JX1; x += 30) { if (z > riverZ(x) - RW - 90) continue; for (const e of [-1, 1]) P.add(x, GY + 9, z + e * 10, (z / JB | 0) % 3 ? K(3000, 2.4) : K(5200, 2.4), 1.5); }
    for (let x = JX0; x <= JX1; x += JB) for (let k = 0; k < 8; k++) { const back = k % 2, L = JZ1 - JZ0; P.add(x + (back ? 4 : -4), GY + 2, back ? JZ1 : JZ0, back ? [5, .25, .15] : K(5500, 5), 1.6, [0, back ? 1 : -1, 10 + rj() * 6, L], [0, rj(), 0, 0]); }
    for (let z = JZ0; z <= JZ1; z += JB) for (let k = 0; k < 10; k++) { const back = k % 2, L = JX1 - JX0; P.add(back ? JX1 : JX0, GY + 2, z + (back ? 4 : -4), back ? [5, .25, .15] : K(5500, 5), 1.6, [back ? -1 : 1, 0, 10 + rj() * 6, L], [0, rj(), 0, 0]); }
    for (const [x, z, h] of [[-4950, -3830, 333], [-4870, -3700, 256], [-5300, -3680, 284], [-5850, -3560, 245]]) P.add(x, GY + h + 3, z, [7, .25, .15], 4, null, [1, r(), 2.6, 0]);
    G.add(P.mesh(ptMat(false, { uMinPx: { value: 1.25 } })));
    // 반포대교 무지개분수(위에서 보면 다리 옆으로 무지개 물줄기)
    const fMat = new THREE.ShaderMaterial({ uniforms: uni({ uOn: { value: 1 } }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: GL_COMMON + `uniform float uPx; uniform float uDpr; uniform float uOn; attribute vec4 aF; varying vec3 vC;
        vec3 hsv(float h) { return clamp(abs(mod(h * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.); }
        void main() { float u = fract(aF.y + uTime * .45); vec3 p = vec3(aF.x + 15. + 22. * u * aF.w, ${GY + 13}. + 4. * u - 17. * u * u, -aF.z);
          vec4 mv = modelViewMatrix * vec4(p, 1.); float d = -mv.z; float s = max(3. * uPx / d, 1.4 * uDpr);
          vC = hsv(fract(aF.z / 900. + uTime * .05)) * 2.2 * (1. - u * .5) * uOn * min(1., (3. * uPx / d) / s + .3) * exp(-d * uHazeD * .5); gl_Position = projectionMatrix * mv; gl_PointSize = s; }`,
      fragmentShader: `varying vec3 vC; void main() { vec2 p = gl_PointCoord - .5; float r = dot(p, p) * 4.; if (r > 1.) discard; gl_FragColor = vec4(vC * exp(-r * 3.), 1.); }` });
    { const fa = [], fz = riverZ(200); for (let u = -RW + 10; u <= RW - 10; u += 6) for (let k = 0; k < 8; k++) fa.push(200, k / 8 + Math.random() * .05, fz + u, 1); const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(fa.length / 4 * 3), 3)); g.setAttribute("aF", new THREE.Float32BufferAttribute(fa, 4)); const m = new THREE.Points(g, fMat); m.frustumCulled = false; G.add(m); }
    // 4) 한강: 강줄기 모양의 반사면
    let water;
    {
      const pos = [], idx = [], N = 0; let n = 0;
      for (let i = -EXT - 2000; i <= EXT + 2000; i += 150) { const z = riverZ(i); pos.push(i, z - RW, 0, i, z + RW, 0); if (n) { const a = (n - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } n++; }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      const rvMat = new THREE.ShaderMaterial({ uniforms: uni(), vertexShader: `varying vec3 vW; varying float vD; void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: GL_COMMON + NOISE + `varying vec3 vW; varying float vD; void main() { vec2 p = vW.xz; float n = fbm(p * .012 + vec2(uTime * .05, 0.)); float sp = pow(n2(p * .09 + vec2(uTime * .3, uTime * .1)), 14.) * 2.5 * smoothstep(900., 3500., vD);
          vec3 c = vec3(.016, .02, .07) * (.8 + .5 * n) + vec3(1., .8, .5) * sp * .5; float f = 1. - exp(-vD * uHazeD); gl_FragColor = vec4(mix(c, uHaze, f), 1.); }` });
      rvMat.polygonOffset = true; rvMat.polygonOffsetFactor = -2; rvMat.polygonOffsetUnits = -6;
      water = new THREE.Mesh(g, rvMat); water.rotation.x = -Math.PI / 2; water.position.y = GY + .5; water.frustumCulled = false; G.add(water); water = null;
      { const sp = [], si = []; let m = 0; for (let i = 0; i < SAET.length - 1; i++) { const [ax, az] = SAET[i], [bx2, bz] = SAET[i + 1], L = Math.hypot(bx2 - ax, bz - az), nx = -(bz - az) / L, nz = (bx2 - ax) / L; for (let u = 0; u <= L; u += 40) { const cx2 = ax + (bx2 - ax) * u / L, cz2 = az + (bz - az) * u / L; sp.push(cx2 + nx * 40, cz2 + nz * 40, 0, cx2 - nx * 40, cz2 - nz * 40, 0); if (m) { const a = (m - 1) * 2; si.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } m++; } }
        const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3)); sg.setIndex(si); const sw = new THREE.Mesh(sg, rvMat); sw.material.side = THREE.DoubleSide; sw.rotation.x = -Math.PI / 2; sw.position.y = GY + .6; sw.frustumCulled = false; G.add(sw); }
    }
    // 5) 전광판(도시 위 큰 화면)
    const bl2 = new Blds();
    const boards = [[152, 1500], [70, 1700], [-100, 1600], [-20, 1500]].map(([az, d]) => { const ar = az * RAD, m = boardMesh(110, 31); m.position.set(Math.sin(ar) * d, GY + 95, -Math.cos(ar) * d); bl2.add(Math.sin(ar) * d, Math.cos(ar) * d, 40, 40, ar, GY, 72, 1, az, .5, 0, true); m.lookAt(0, 470, 0); G.add(m); return { m }; });
    G.add(bl2.mesh(bldMat(false)));
    // 6) 전망대 안: 둥근 유리 벽, 창틀, 놋쇠 손잡이, 천장 다운라이트, 카펫, 엘리베이터 기둥, 망원경
    const F0 = o.FLOOR, RG = o.RG, RC = o.RC, room = new THREE.Group();
    const roomMat = (c, rough = .8, metal = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal });
    { const g = new THREE.RingGeometry(RC, RG + .3, 96, 3); g.rotateX(-Math.PI / 2);
      const carpet = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const y = c.getContext("2d"); y.fillStyle = "#3a3034"; y.fillRect(0, 0, 256, 256); const rr = rng(9); for (let i = 0; i < 9000; i++) { y.fillStyle = `rgba(${rr() < .5 ? "0,0,0" : "90,70,80"},${rr() * .12})`; y.fillRect(rr() * 256, rr() * 256, 2, 2); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10); return t; })();
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: carpet, roughness: .95 })); m.position.y = F0; room.add(m); }
    { const g = new THREE.RingGeometry(RC, RG - 4.2, 96, 1); g.rotateX(Math.PI / 2); const m = new THREE.Mesh(g, roomMat(0x1d1b22, .9)); m.position.y = F0 + 3.9; room.add(m);
      const sp = new THREE.InstancedMesh(new THREE.BoxGeometry(.08, .12, 4.4), roomMat(0x0d0d12, .6, .3), 30), mm = new THREE.Matrix4(); for (let i = 0; i < 30; i++) { const a = i / 30 * TAU; mm.makeRotationY(-a); mm.setPosition(Math.sin(a) * (RG - 2.1), F0 + 3.9, -Math.cos(a) * (RG - 2.1)); sp.setMatrixAt(i, mm); } room.add(sp);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(RG - 4.2, .08, 6, 120), roomMat(0x0d0d12, .6, .3)); rim.rotation.x = Math.PI / 2; rim.position.y = F0 + 3.9; room.add(rim); }
    { const g = new THREE.CylinderGeometry(RC, RC, 3.9, 64, 1, true); const wd = roomMat(0x5a3a26, .6); const m = new THREE.Mesh(g, wd); m.position.y = F0 + 1.95; room.add(m);
      for (const a of [0, Math.PI]) { const d = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, .08), roomMat(0x8a8c95, .3, .8)); d.position.set(Math.sin(a) * (RC + .03), F0 + 1.3, -Math.cos(a) * (RC + .03)); d.rotation.y = -a; room.add(d); } }
    { const sill = new THREE.Mesh(new THREE.CylinderGeometry(RG + .2, RG + .2, .3, 96, 1, true), roomMat(0x121218, .7)); sill.material.side = THREE.BackSide; sill.position.y = F0 + .15; room.add(sill);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(RG + .2, RG + .2, .35, 96, 1, true), roomMat(0x101016, .7)); top.material.side = THREE.BackSide; top.position.y = F0 + 3.72; room.add(top);
      const hr = new THREE.Mesh(new THREE.TorusGeometry(RG - .3, .035, 8, 160), roomMat(0x7a6040, .55, .6)); hr.rotation.x = Math.PI / 2; hr.position.y = F0 + 1.02; room.add(hr);
      const mull = new THREE.InstancedMesh(new THREE.BoxGeometry(.09, 3.3, .14), roomMat(0x0d0d12, .6, .3), 30), mm = new THREE.Matrix4();
      for (let i = 0; i < 30; i++) { const a = i / 30 * TAU; mm.makeRotationY(-a); mm.setPosition(Math.sin(a) * (RG + .1), F0 + 2.15, -Math.cos(a) * (RG + .1)); mull.setMatrixAt(i, mm); } room.add(mull);
      for (let i = 0; i < 8; i++) { const a = (i + .5) / 8 * TAU, tg = new THREE.Group(); const post = new THREE.Mesh(new THREE.CylinderGeometry(.06, .09, 1.05, 10), roomMat(0x2a2a33, .4, .7)); post.position.y = .52; tg.add(post); const tube = new THREE.Mesh(new THREE.CylinderGeometry(.12, .1, .55, 12), roomMat(0x34343e, .35, .7)); tube.rotation.x = Math.PI / 2 - .2; tube.position.y = 1.15; tg.add(tube); tg.position.set(Math.sin(a) * (RG - .8), F0, -Math.cos(a) * (RG - .8)); tg.rotation.y = -a; room.add(tg); }
    }
    const rp = new Pts();
    for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; for (const rr of [9.5, 12.8]) rp.add(Math.sin(a + (rr > 10 ? .04 : 0)) * rr, F0 + 3.86, Math.cos(a + (rr > 10 ? .04 : 0)) * rr, K(2900, 3), .07); }
    for (let i = 0; i < 120; i++) { const a = i / 120 * TAU; rp.add(Math.sin(a) * (RG - .15), F0 + .48, Math.cos(a) * (RG - .15), K(2700, .9), .06); for (const yy of [F0 + .12, F0 + 3.75]) if (i % 2 === 0) rp.add(Math.sin(a) * (RC + .06), yy, Math.cos(a) * (RC + .06), K(2700, 1.1), .06); }
    room.add(rp.mesh(ptMat(false, { uMinPx: { value: .8 } })));
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const L = new THREE.PointLight(0xffc690, 22, 14, 1.6); L.position.set(Math.sin(a) * 11, F0 + 3.6, -Math.cos(a) * 11); room.add(L); }
    room.add(new THREE.HemisphereLight(0x3a3050, 0x140e0a, .8));
    // 창가에 서서 밖을 보는 사람(함께 보는 사람)
    const riderMeshes = [];
    for (let i = 0; i < 6; i++) { const g = new THREE.Group(), mat = roomMat(0x555555, .8); const body = new THREE.Mesh(new THREE.CapsuleGeometry(.2, .78, 4, 10), mat); body.position.y = .62; g.add(body); const head = new THREE.Mesh(new THREE.SphereGeometry(.13, 14, 10), roomMat(0x1e1612, .9)); head.position.y = 1.45; g.add(head); g.visible = false; room.add(g); riderMeshes.push({ g, mat }); }
    room.position.y = 0; G.add(room);
    // 63빌딩 60층 전망대 안: 긴 네모 유리방(금빛 유리), 돌바닥, 가운데 엘리베이터 벽과 그림, 망원경
    const mkRect = (Dk, artSeed) => { const room63 = new THREE.Group(), riders63 = [];
    { const Dk2 = Dk, F1 = Dk.floor, hx = Dk.hx, hz = Dk.hz, CH = Dk.ceil, cx = Dk.cx, cz = Dk.cz;
      room63.position.set(Dk.x, 0, -Dk.z);
      const flM = new THREE.MeshStandardMaterial({ color: 0x2c2630, roughness: .6, metalness: .1 });
      const flRect = (x0, x1, z0, z1) => { if (x1 - x0 < .01 || z1 - z0 < .01) return; const fl = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), flM); fl.rotation.x = -Math.PI / 2; fl.position.set((x0 + x1) / 2, F1, -(z0 + z1) / 2); room63.add(fl); };
      const X0 = -hx - .2, X1 = hx + .2, Z0 = -hz - .2, Z1 = hz + .2;
      if (Dk.glass) { const [gx0, gx1, gz0, gz1] = Dk.glass; flRect(X0, X1, Z0, gz0); flRect(X0, X1, gz1, Z1); flRect(X0, gx0, gz0, gz1); flRect(gx1, X1, gz0, gz1);
        // 유리 바닥: 아주 옅은 푸른 유리 + 가는 철 틀(1.5m 격자) + 가장자리 띠 조명
        const gp = new THREE.Mesh(new THREE.PlaneGeometry(gx1 - gx0, gz1 - gz0), new THREE.MeshBasicMaterial({ color: new THREE.Color(.5, .7, 1), transparent: true, opacity: .018, depthWrite: false })); gp.rotation.x = -Math.PI / 2; gp.position.set((gx0 + gx1) / 2, F1 + .01, -(gz0 + gz1) / 2); gp.renderOrder = 3; room63.add(gp);
        const fm = roomMat(0x16161c, .5, .6);
        for (let x = gx0; x <= gx1 + .01; x += (gx1 - gx0) / Math.round((gx1 - gx0) / 1.5)) { const b = new THREE.Mesh(new THREE.BoxGeometry(.06, .08, gz1 - gz0), fm); b.position.set(x, F1 - .04, -(gz0 + gz1) / 2); room63.add(b); }
        for (let z = gz0; z <= gz1 + .01; z += (gz1 - gz0) / Math.round((gz1 - gz0) / 1.5)) { const b = new THREE.Mesh(new THREE.BoxGeometry(gx1 - gx0, .08, .06), fm); b.position.set((gx0 + gx1) / 2, F1 - .04, -z); room63.add(b); }
        const ep = new Pts(); for (let x = gx0; x <= gx1; x += .25) for (const z of [gz0, gz1]) ep.add(x, F1 + .02, z, K(6500, 1.6), .05); for (let z = gz0; z <= gz1; z += .25) for (const x of [gx0, gx1]) ep.add(x, F1 + .02, z, K(6500, 1.6), .05); room63.add(ep.mesh(ptMat(false, { uMinPx: { value: .8 } }))); }
      else flRect(X0, X1, Z0, Z1);
      const ce = new THREE.Mesh(new THREE.PlaneGeometry(hx * 2 + .4, hz * 2 + .4), roomMat(0x1a1920, .9)); ce.rotation.x = Math.PI / 2; ce.position.y = F1 + CH; room63.add(ce);
      const frameM = roomMat(0x0d0d12, .6, .3), sillM = roomMat(0x141218, .7);
      const glassM = new THREE.MeshBasicMaterial({ color: Dk.tint ? new THREE.Color(...Dk.tint) : new THREE.Color(1, .72, .3), transparent: true, opacity: .012, depthWrite: false, side: THREE.DoubleSide });
      for (const [px, pz, w, ry] of [[0, hz, hx * 2, 0], [0, -hz, hx * 2, Math.PI], [hx, 0, hz * 2, -Math.PI / 2], [-hx, 0, hz * 2, Math.PI / 2]]) {
        // 63(lowSill): 바닥 가까이까지 유리, 얇은 틀, 손잡이 없음(발아래 강변이 보이게)
        const sH = Dk.lowSill ? .1 : .45, tH = Dk.lowSill ? .22 : .4, gH = CH - sH - tH;
        const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, gH), glassM); gl.position.set(px, F1 + sH + gH / 2, -pz); gl.rotation.y = ry; gl.renderOrder = 3; room63.add(gl);
        const sl = new THREE.Mesh(new THREE.BoxGeometry(w, sH, .3), sillM); sl.position.set(px, F1 + sH / 2, -pz); sl.rotation.y = ry; room63.add(sl);
        const tp = new THREE.Mesh(new THREE.BoxGeometry(w, tH, .3), frameM); tp.position.set(px, F1 + CH - tH / 2, -pz); tp.rotation.y = ry; room63.add(tp);
        if (!Dk.lowSill) { const hr = new THREE.Mesh(new THREE.BoxGeometry(w, .05, .05), roomMat(0x7a6040, .55, .6)); hr.position.set(px - Math.sign(px) * .35, F1 + 1.02, -(pz - Math.sign(pz) * .35)); hr.rotation.y = ry; room63.add(hr); }
        const n = Math.round(w / (Dk.lowSill ? 2.8 : 1.8)), mull = new THREE.InstancedMesh(new THREE.BoxGeometry(Dk.lowSill ? .06 : .09, gH, .14), frameM, n + 1), mm = new THREE.Matrix4();
        for (let i = 0; i <= n; i++) { const u = -w / 2 + i * w / n; mm.makeRotationY(ry); mm.setPosition(px + Math.cos(ry) * u, F1 + sH + gH / 2, -pz + Math.sin(ry) * u * -1); mull.setMatrixAt(i, mm); } room63.add(mull);
      }
      // 엘리베이터 벽(나무) + 그림 액자(색 면을 겹친 추상화, 직접 그린 것)
      const core = new THREE.Mesh(new THREE.BoxGeometry(cx * 2, CH, cz * 2), roomMat(Dk.wall || 0x5a3a26, .6)); core.position.y = F1 + CH / 2; room63.add(core);
      const art = k => { const c = document.createElement("canvas"); c.width = 256; c.height = 180; const y = c.getContext("2d"), rr = rng(artSeed + k); const pal = [["#1d3557", "#e9c46a", "#f4a261", "#e76f51"], ["#22223b", "#9a8c98", "#c9ada7", "#f2e9e4"], ["#0b3954", "#bfd7ea", "#ff6663", "#e0ff4f"], ["#2b2d42", "#8d99ae", "#ef233c", "#edf2f4"], ["#264653", "#2a9d8f", "#e9c46a", "#f4a261"], ["#3d405b", "#e07a5f", "#81b29a", "#f2cc8f"]][k % 6];
        y.fillStyle = pal[0]; y.fillRect(0, 0, 256, 180); for (let i = 0; i < 9; i++) { y.fillStyle = pal[1 + (i % 3)]; y.globalAlpha = .55 + rr() * .4; if (rr() < .5) { y.beginPath(); y.arc(rr() * 256, rr() * 180, 14 + rr() * 50, 0, TAU); y.fill(); } else y.fillRect(rr() * 220, rr() * 150, 20 + rr() * 90, 10 + rr() * 60); } y.globalAlpha = 1;
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
      let ak = 0;
      for (const e of [-1, 1]) for (let k = -1; k <= 1; k++) { const fr = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.7, .06), roomMat(0x1a1410, .5, .4)); fr.position.set(k * 3.3, F1 + 1.95, -e * (cz + .03)); room63.add(fr);
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.5), new THREE.MeshStandardMaterial({ map: art(ak++), roughness: .8 })); pic.position.set(k * 3.3, F1 + 1.95, -e * (cz + .07)); if (e > 0) pic.rotation.y = Math.PI; room63.add(pic);
        const sp = new THREE.SpotLight(0xffd6a0, 3, 6, .5, .6, 1.5); sp.position.set(k * 3.3, F1 + CH - .1, -e * (cz + 1.4)); sp.target.position.set(k * 3.3, F1 + 1.9, -e * cz); room63.add(sp, sp.target); }
      // 천장 다운라이트, 유리 아래 띠 조명
      const rp2 = new Pts();
      for (let i = -3; i <= 3; i++) for (const lz of hz > 10 ? [-11, -7.5, 7.5, 11] : [-5.4, 5.4]) if (Math.abs(i * 4.6) < hx - 1) rp2.add(i * 4.6, F1 + CH - .04, lz, K(2900, 3), .08);
      const sY = F1 + (Dk.lowSill ? .12 : .47); for (let u = -hx; u <= hx; u += .3) for (const e of [-1, 1]) rp2.add(u, sY, e * (hz - .2), K(2700, .9), .06);
      for (let u = -hz; u <= hz; u += .3) for (const e of [-1, 1]) rp2.add(e * (hx - .2), sY, u, K(2700, .9), .06);
      room63.add(rp2.mesh(ptMat(false, { uMinPx: { value: .8 } })));
      for (const [lx, lz] of Dk.room === "rect" && hz > 10 ? [[-9, 9], [9, 9], [-9, -9], [9, -9], [0, 11], [0, -11]] : [[-11, 5], [0, 5.5], [11, 5], [-11, -5], [0, -5.5], [11, -5]]) { const L = new THREE.PointLight(0xffc690, 26, 15, 1.6); L.position.set(lx, F1 + CH - .4, -lz); room63.add(L); }
      room63.add(new THREE.HemisphereLight(0x3a3050, 0x140e0a, .8));
      // 🛋 라운지: 북쪽 창가 소파 셋(창을 보고 앉는다) + 작은 탁자·스탠드 불빛 + 화분
      if (Dk.sofa) { const fab = roomMat(0x6b4f3f, .95), cush = roomMat(0x8a6a52, .95), wood = roomMat(0x3a2618, .6), sp3 = new Pts();
        for (const sx of [-9, 0, 9]) { const zz = hz - 3.3;
          const seat = new THREE.Mesh(new THREE.BoxGeometry(2.8, .42, .95), fab); seat.position.set(sx, F1 + .21, -zz); room63.add(seat);
          const back = new THREE.Mesh(new THREE.BoxGeometry(2.8, .85, .25), fab); back.position.set(sx, F1 + .42, -(zz - .55)); room63.add(back);
          for (const e of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(.25, .6, .95), fab); arm.position.set(sx + e * 1.45, F1 + .3, -zz); room63.add(arm); }
          for (const e of [-.65, .65]) { const c = new THREE.Mesh(new THREE.BoxGeometry(1.2, .14, .8), cush); c.position.set(sx + e, F1 + .49, -zz); room63.add(c); }
          const tb = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, .05, 20), wood); tb.position.set(sx + 2.1, F1 + .55, -zz); room63.add(tb); const tl = new THREE.Mesh(new THREE.CylinderGeometry(.04, .06, .55, 8), wood); tl.position.set(sx + 2.1, F1 + .27, -zz); room63.add(tl);
          const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.12, .16, .22, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd9a0, side: THREE.DoubleSide })); lamp.position.set(sx + 2.1, F1 + .72, -zz); room63.add(lamp); sp3.add(sx + 2.1, F1 + .72, zz, K(2600, 3), .35);
          const pot = new THREE.Mesh(new THREE.CylinderGeometry(.22, .17, .45, 12), roomMat(0x2a2a2e, .7)); pot.position.set(sx - 2.2, F1 + .22, -zz + .2); room63.add(pot);
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(.42, 10, 8), roomMat(0x1f3a22, .9)); leaf.scale.set(1, 1.4, 1); leaf.position.set(sx - 2.2, F1 + .95, -zz + .2); room63.add(leaf); }
        const rug = new THREE.Mesh(new THREE.PlaneGeometry(26, 3.6), roomMat(0x3a2c2a, 1)); rug.rotation.x = -Math.PI / 2; rug.position.set(0, F1 + .01, -(hz - 3.2)); room63.add(rug);
        room63.add(sp3.mesh(ptMat(false, { uMinPx: { value: 1 } }))); }
      // 망원경(금빛 렌즈 통)
      for (const [lx, lz, a] of Dk.tel) { const tg = new THREE.Group(); const post = new THREE.Mesh(new THREE.CylinderGeometry(.06, .09, 1.05, 10), roomMat(0x2a2a33, .4, .7)); post.position.y = .52; tg.add(post); const tube = new THREE.Mesh(new THREE.CylinderGeometry(.12, .1, .55, 12), roomMat(0x6a5530, .35, .8)); tube.rotation.x = Math.PI / 2 - .2; tube.position.y = 1.15; tg.add(tube); tg.position.set(lx, F1, -lz); tg.rotation.y = -a * RAD; room63.add(tg); }
      for (let i = 0; i < 6; i++) { const g = new THREE.Group(), mat = roomMat(0x555555, .8); const body = new THREE.Mesh(new THREE.CapsuleGeometry(.2, .78, 4, 10), mat); body.position.y = .62; g.add(body); const head = new THREE.Mesh(new THREE.SphereGeometry(.13, 14, 10), roomMat(0x1e1612, .9)); head.position.y = 1.45; g.add(head); g.visible = false; G.add(g); riders63.push({ g, mat }); }
    }
    G.add(room63); return { room63, riders63 }; };
    const R63 = mkRect(o.DECKS.sky63, 70), R123 = mkRect(o.DECKS.sky123, 140), room63 = R63.room63, riders63 = R63.riders63, RLG = o.DECKS.lounge ? mkRect(o.DECKS.lounge, 210) : { room63: new THREE.Group(), riders63: [] };
    tower = { G, water, boards, riderMeshes, fMat, room, room63, riders63, room123: R123.room63, riders123: R123.riders63, roomLg: RLG.room63, ridersLg: RLG.riders63, b63, lotteMesh, ntMesh, ntPm };
  }

  // ---------- 그리기 ----------
  const hf = renderer.extensions.has("EXT_color_buffer_float") || renderer.extensions.has("EXT_color_buffer_half_float");
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: hf ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: hf ? 2 : 0 }));
  const rpass = new RenderPass(scene, camera); composer.addPass(rpass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .8, .5, .9); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let W = 0, H = 0, DPRv = 1, curMode = null, lastQ = 0;
  function resize(w, h, dpr) {
    if (w === W && h === H && dpr === DPRv) return; W = w; H = h; DPRv = dpr;
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); composer.setPixelRatio(dpr); composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const enu = new THREE.Matrix3(), tmpV = new THREE.Vector3();
  function setMode(m) {
    if (m === curMode) return; curMode = m;
    const tw = m !== "cruise";
    if (m === "cruise" && !cruise) buildCruise(); if (tw && !tower) buildTower();
    if (cruise) cruise.G.visible = m === "cruise"; if (tower) { tower.G.visible = tw; tower.room.visible = m === "tower"; tower.room63.visible = m === "sky63"; tower.room123.visible = m === "sky123"; tower.roomLg.visible = m === "lounge"; tower.ridersLg.forEach(r => r.g.visible = false); tower.b63.visible = m !== "sky63"; tower.lotteMesh.visible = m !== "sky123"; tower.riders123.forEach(r => r.g.visible = false); tower.ntMesh.visible = tower.ntPm.visible = m !== "tower"; tower.riders63.forEach(r => r.g.visible = false); tower.riderMeshes.forEach(r => r.g.visible = false); }
    if (cruise && !cruise.G.parent) scene.add(cruise.G); if (tower && !tower.G.parent) scene.add(tower.G);
    fws.length = 0;
    if (m === "cruise") {
      // three(x,y,z) → 동·북·위: 동 = -z, 북 = -x
      enu.set(0, 0, -1, -1, 0, 0, 0, 1, 0);   // W→ENU 행렬(행 = E, N, U)
      U.uHazeD.value = 1 / 3800; U.uHaze.value.set(.011, .008, .011); U.uStyl.value = 0; U.uLen.value = LEN;
      camera.near = .3; camera.far = 22000;
      U.uSky1.value.set(.009, .006, .009);
    } else {
      enu.set(1, 0, 0, 0, 0, -1, 0, 1, 0);
      U.uHazeD.value = 1 / 6500; U.uHaze.value.set(.03, .022, .055); U.uStyl.value = m === "sky123" ? 0 : 1; U.uLen.value = 0;   // 롯데에서 내려다보면 진짜 밤 빌딩(불 켜진 창)이 더 깔끔
      camera.near = .5; camera.far = 50000;
      U.uSky1.value.set(.03, .026, .075);
    }
    U.uW2Enu.value.copy(enu); U.uEnu2W.value.copy(enu).transpose();
    camera.updateProjectionMatrix();
  }
  // 하늘(시간·달)은 1초에 한 번만 다시 계산
  let skyAt = 0;
  function updSky(now) {
    if (now - skyAt < 1000 && skyAt) return; skyAt = now;
    const lst = lstDeg(now) * RAD; U.uLst.value = lst;
    const m = moonEq(now), s = sunEq(now), me = eqToEnu(m.ra, m.dec, lst), se = eqToEnu(s.ra, s.dec, lst);
    const toW = v => tmpV.set(v[0], v[1], v[2]).applyMatrix3(U.uEnu2W.value).normalize();
    U.uMoonDir.value.copy(toW(me)); moonMat.uniforms.uSunDir.value.copy(toW(se));
    // 달이 떠 있으면 달빛(위상 반영)
    const cosE = clamp(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra), -1, 1), illum = (1 - cosE) / 2;
    U.uMoonUp.value = me[2] > -.02 ? illum * clamp(me[2] * 6 + .2, 0, 1) : 0;
    moon.visible = me[2] > -.03;
    const W2 = curMode === "cruise" ? cruise && cruise.water : tower && tower.water;
    if (W2) { W2.material.uniforms.sunDirection.value.copy(U.uMoonDir.value); W2.material.uniforms.sunColor.value.setRGB(1, .95, .85).multiplyScalar(U.uMoonUp.value * (U.uMoonDir.value.y > 0 ? .9 : 0)); }
  }

  let lastT = 0;
  function render(st, g2d) {
    setMode(st.mode);
    const now = Date.now(), t = st.t; U.uTime.value = t;
    updSky(now);
    U.uWind.value.set(t * .004, t * .0015);
    U.uStarK.value = (st.mode === "cruise" ? 1 : 1.7) * (st.starOn ? 1.25 : 1);   // 전망대는 높은 곳이라 별을 더 또렷하게
    // 카메라
    resize(st.W, st.H, st.dpr);
    camera.fov = 2 * Math.atan(st.H / 2 / st.F) / RAD; camera.updateProjectionMatrix();
    camera.position.set(st.camX, st.camY, -st.camZ);
    camera.rotation.set(st.pitch, -st.yaw, st.roll || 0);
    camera.updateMatrixWorld();
    U.uPx.value = st.F * st.dpr; U.uDpr.value = st.dpr;
    const dt = Math.min(.1, Math.max(0, t - lastT)); lastT = t;
    if (st.mode === "cruise") {
      const s = st.s; U.uCamS.value = s;
      camera.position.z = -s; camera.updateMatrixWorld();
      const C = cruise;
      C.deck.position.set(0, 0, -s);
      C.far.position.set(0, 0, -s);
      C.water.position.z = -s - 6000;
      C.water.material.uniforms.time.value = t * .6;
      // 깃발 펄럭임
      const fp = C.flagGeo.attributes.position; for (let i = 0; i < fp.count; i++) { const x = fp.getX(i); fp.setZ(i, Math.sin(t * 5 - x * 6) * .07 * x); } fp.needsUpdate = true;
      // 마주 오는 배
      const ob = st.boat; C.boat.visible = ob.z > 4 && ob.z < 3500; C.boat.position.set(ob.x, 0, -(s + ob.z)); C.setBan(ob.name);
      // 전광판 자리
      for (const b of C.boards) { const rz = ((b.bd.z - s) % LEN + LEN + 1200) % LEN - 1200; b.m.position.z = -(s + rz); b.m.visible = rz > -50 && rz < 3600; }
      C.fMat.uniforms.uOn.value = st.fountainOn ? 1 : 0;
      // 함께 탄 사람
      C.riderMeshes.forEach((m, i) => { const n = st.others[i]; m.g.visible = !!n; if (n) m.mat.color.setHSL((hash(n.length * 7 + n.charCodeAt(0)) * 360 | 0) / 360, .4, .5); });
    } else {
      U.uCamS.value = 0;
      tower.room.visible = st.mode === "tower" && !st.scope; tower.room63.visible = st.mode === "sky63" && !st.scope; tower.room123.visible = st.mode === "sky123" && !st.scope; tower.roomLg.visible = st.mode === "lounge";   // 망원경으로 볼 때는 창틀이 앞을 가리지 않게
      tower.fMat.uniforms.uOn.value = st.fountainOn ? 1 : 0;
      const DK = o.DECKS[st.mode], RM = st.mode === "sky63" ? tower.riders63 : st.mode === "sky123" ? tower.riders123 : st.mode === "lounge" ? tower.ridersLg : tower.riderMeshes;
      RM.forEach((m, i) => { const n = st.others[i], rp = st.rpos && st.rpos[i]; m.g.visible = !!(n && rp); if (n && rp) { const a = rp[2]; m.g.position.set(rp[0], DK.floor, -rp[1]); m.g.rotation.y = -a + Math.PI; m.mat.color.setHSL((hash(n.length * 7 + n.charCodeAt(0)) * 360 | 0) / 360, .35, .4); } });
    }
    // 불꽃·별똥별
    if (st.fwNew) for (const gold of st.fwNew) fwLaunch(gold, st.mode, st.s || 0);
    if (st.metNew) for (const m of st.metNew) mets.push(m);
    if (!fwPts.parent) scene.add(fwPts);
    fwStep(dt, { x: camera.position.x, y: camera.position.y, z: -camera.position.z });
    drawBB(st);
    composer.render();
    // 2D 위에 덧그리기: 이름표·장소 이름, 전광판 누를 자리
    const hits = [];
    const proj = (x, y, z) => { tmpV.set(x, y, -z).project(camera); if (tmpV.z > 1 || tmpV.z < -1) return null; return [(tmpV.x + 1) / 2 * st.W, (1 - tmpV.y) / 2 * st.H]; };
    const boards = st.mode === "cruise" ? cruise.boards : tower.boards;
    for (const b of boards) {
      if (!b.m.visible) continue; const m = b.m, w = m.userData.w, h = m.userData.h; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, ok = 0;
      for (const [ux, uy] of [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]]) { tmpV.set(ux * w, uy * h, 0); m.localToWorld(tmpV); tmpV.project(camera); if (tmpV.z > 1) continue; ok++; const sx = (tmpV.x + 1) / 2 * st.W, sy = (1 - tmpV.y) / 2 * st.H; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
      if (ok === 4 && x1 > 0 && x0 < st.W && x1 - x0 > 8) hits.push([x0, y0, x1 - x0, y1 - y0]);
    }
    if (g2d) {
      g2d.textAlign = "center"; g2d.textBaseline = "bottom";
      if (st.mode === "cruise") {
        const SL = [[-2.75, -3], [2.75, -3.6], [-2.75, -6.5], [2.75, -7.2], [-2.75, -10], [2.75, -10.6]];
        st.others.forEach((n, i) => { const p = proj(SL[i][0], 2.25 + 1.75, st.s + SL[i][1]); if (!p) return; g2d.font = "600 12px sans-serif"; g2d.fillStyle = "rgba(255,240,220,.85)"; g2d.fillText(n, p[0], p[1]); });
      } else {
        g2d.font = "600 11.5px -apple-system, sans-serif";
        if (!st.scope) for (const [name, x, y, z] of (st.labs || o.TLAB)) { const p = proj(x, y + GY, z); if (!p || p[0] < 30 || p[0] > st.W - 30 || p[1] < 0 || p[1] > st.H) continue; const yy = p[1] - 10; g2d.strokeStyle = "rgba(255,255,255,.25)"; g2d.lineWidth = 1; g2d.beginPath(); g2d.moveTo(p[0], p[1] - 2); g2d.lineTo(p[0], yy); g2d.stroke(); g2d.fillStyle = "rgba(240,234,255,.8)"; g2d.fillText(name, p[0], yy - 2); }
        const DK = o.DECKS[st.mode];
        st.others.forEach((n, i) => { const rp = st.rpos && st.rpos[i]; if (!rp) return; const p = proj(rp[0], DK.floor + 1.8, rp[1]); if (!p) return; g2d.font = "600 12px sans-serif"; g2d.fillStyle = "rgba(255,240,220,.85)"; g2d.fillText(n, p[0], p[1]); });
        // 유리에 붙은 방향 글씨
        const L = st.mode === "lounge" ? ["북쪽 · 한강 · 남산서울타워", "동쪽 · 한남대교 · 강남", "남쪽 · 반포 · 서초", "서쪽 · 동작대교 · 여의도"] : st.mode === "sky123" ? ["북쪽 · 한강 · 아차산", "동쪽 · 올림픽공원 · 하남", "남쪽 · 석촌호수 · 롯데월드", "서쪽 · 강남 · 남산서울타워"] : st.mode === "sky63" ? ["북쪽 · 한강 · 마포", "동쪽 · 남산서울타워 · 용산", "남쪽 · 영등포 · 관악산", "서쪽 · 국회의사당 · 밤섬"] : ["북쪽 · 북한산 · 광화문", "동쪽 · 롯데월드타워 · 잠실", "남쪽 · 한강 · 강남", "서쪽 · 여의도 · 63빌딩"];
        L.forEach((s, k) => { const a = k * Math.PI / 2 + .1; let x = Math.sin(a) * (o.RG - .05), z = Math.cos(a) * (o.RG - .05), fy = o.FLOOR + 3.3;
          if (st.mode !== "tower") { const dk = o.DECKS[st.mode]; x = dk.x + [3, dk.hx - .05, -3, -dk.hx + .05][k]; z = dk.z + [dk.hz - .05, 1, -dk.hz + .05, -1][k]; fy = dk.floor + dk.ceil - .7; }
          const p = proj(x, fy, z); if (!p) return; const d = Math.hypot(x - st.camX, z - st.camZ); if (d > 26) return; g2d.font = `500 ${clamp(170 / d, 9, 24)}px -apple-system, sans-serif`; g2d.fillStyle = "rgba(240,232,255,.5)"; g2d.textBaseline = "middle"; g2d.fillText(s, p[0], p[1]); g2d.textBaseline = "bottom"; });
      }
    }
    return hits;
  }
  return {
    canvas, render,
    capture(st) { render(st, null); return canvas; },
    dispose() { renderer.dispose(); },
  };
}
