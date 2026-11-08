// 🗺 한강 오픈월드 — 진짜 3D(WebGL, three.js). park.js가 불러 쓴다. 여의도에서 반포까지 약 7.8km가 끊김 없이 한 번에 이어진 세상.
// 하늘(실제 서울 밤하늘 별·은하수·달 위상)·물 반사·건물 창문 셰이더는 유람선 화면(tripgl.js)과 같은 코드(복사본, 유람선을 고쳐도 여기는 그대로).
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

  // ====================== 🗺 한강 오픈월드: 여의도 ~ 반포, 한 번에 이어진 세상 ======================
  // 트립 좌표(유람선과 같은 펴진 물길): x = 강을 가로지름(+ 남쪽 = 여의도·반포 쪽), z = 강을 따라 동쪽(m), y = 높이(물 0, 강변 공원 7)
  // three 좌표 = (x, y, -z). 하늘·별·달·물·건물 창문 셰이더는 유람선(tripgl.js)과 같은 것
  const R = o.R, Z0 = o.Z0, Z1 = o.Z1, GY = o.GY, PB = o.PATH;   // PB = 자전거 길 가운데 x
  const ZA = Z0 - 1500, ZB = Z1 + 1700;
  {
    const enu = new THREE.Matrix3(); enu.set(0, 0, -1, -1, 0, 0, 0, 1, 0);
    U.uW2Enu.value.copy(enu); U.uEnu2W.value.copy(enu).transpose();
    U.uHazeD.value = 1 / 3600; U.uHaze.value.set(.011, .008, .011); U.uStyl.value = 0; U.uLen.value = 0; U.uSky1.value.set(.009, .006, .009);
    camera.near = .12; camera.far = 20000; camera.updateProjectionMatrix();
  }
  const K = (k, s) => kelvin(k).map(v => v * s);
  // 관(방향에 맞게 원을 세운다): 바퀴·자전거 뼈대·오리 목
  function tube2(bk, P, rad, col, seg = 6, closed = false) {
    const V = (a, b) => [b[0] - a[0], b[1] - a[1], b[2] - a[2]], N = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); }, X = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const n = P.length, rings = [];
    for (let i = 0; i < n; i++) {
      const a = P[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = P[closed ? (i + 1) % n : Math.min(n - 1, i + 1)], t = N(V(a, b));
      let u = Math.abs(t[1]) < .9 ? N(X(t, [0, 1, 0])) : N(X(t, [1, 0, 0])); const w = X(t, u);
      const rr = typeof rad === "function" ? rad(i / (n - 1)) : rad;
      const ring = []; for (let k = 0; k < seg; k++) { const an = k / seg * TAU, c = Math.cos(an) * rr, s = Math.sin(an) * rr; ring.push([P[i][0] + u[0] * c + w[0] * s, P[i][1] + u[1] * c + w[1] * s, -(P[i][2] + u[2] * c + w[2] * s)]); }
      rings.push(ring);
    }
    const L = closed ? n : n - 1;
    for (let i = 0; i < L; i++) { const A = rings[i], B = rings[(i + 1) % n]; for (let k = 0; k < seg; k++) { const k2 = (k + 1) % seg; bk.quad(A[k], A[k2], B[k2], B[k], col, col, col, col, 0); } }
  }
  // 공(얼굴·나무): 트립 좌표 가운데, 반지름(가로·세로·깊이), 색 함수(높이 -1~1 → 색)
  const icoG = new THREE.IcosahedronGeometry(1, 1).toNonIndexed(), icoP = icoG.attributes.position.array;
  const ico0 = new THREE.IcosahedronGeometry(1, 0).toNonIndexed(), ico0P = ico0.attributes.position.array;
  function ball(bk, cx, cy, cz, rx, ry, rz, colF, lo) {
    const A = lo ? ico0P : icoP;
    for (let i = 0; i < A.length; i += 9) {
      const P = k => [cx + A[i + k * 3] * rx, cy + A[i + k * 3 + 1] * ry, -(cz + A[i + k * 3 + 2] * rz)];
      const C = k => colF(A[i + k * 3 + 1], A[i + k * 3], A[i + k * 3 + 2]);
      bk.tri(P(0), P(1), P(2), C(0), C(1), C(2), 0);
    }
  }
  const geoOf = bk => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(bk.p, 3)); g.setAttribute("aCol", new THREE.Float32BufferAttribute(bk.c, 3)); g.setAttribute("aCZ", new THREE.Float32BufferAttribute(bk.z, 1)); return g; };
  // 움직이는 물체용: 꼭짓점 색 × (인스턴스 색) × 밝기, 공기 원근
  const objMat = () => new THREE.ShaderMaterial({ uniforms: uni({ uK: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) } }), side: THREE.DoubleSide,
    vertexShader: GL_COMMON + `attribute vec3 aCol; varying vec3 vC; varying float vDist; uniform float uK; uniform vec3 uTint;
      void main() { vec4 p = vec4(position, 1.);
        #ifdef USE_INSTANCING
        p = instanceMatrix * p;
        #endif
        vC = aCol * uK * uTint;
        #ifdef USE_INSTANCING_COLOR
        vC *= instanceColor;
        #endif
        vec4 mv = modelViewMatrix * p; vDist = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: GL_COMMON + `varying vec3 vC; varying float vDist; void main() { float f = 1. - exp(-vDist * uHazeD); gl_FragColor = vec4(mix(vC, uHaze, f), 1.); }` });

  const G = new THREE.Group(); scene.add(G);
  const r = rng(11), bake = new Bake(), pts = new Pts(), bl = new Blds();
  const nearBridge = (z, d = 80) => o.BRIDGES.some(b => Math.abs(b.z - z) < d);
  const nearPOI = (x, z, d) => o.POI.some(p => Math.hypot(p.x - x, p.z - z) < d + (p.clear || 0));

  // ---------- 1) 건물: 남쪽(여의도·노량진·흑석·반포), 북쪽(마포·용산·이촌·한남) ----------
  const zone = (sd, z) => {
    if (sd > 0) return z < 1500 ? "yeouido" : z < 3500 ? "mix" : z < 5500 ? "apt" : "banpo";
    return z < 2400 ? "mapo" : z < 3700 ? "yongsan" : z < 5300 ? "ichon" : "apt";
  };
  const addB = (sd, x, z, sx, sz, h, type, crownP, shop) => {
    if (sd > 0 && Math.abs(z - 300) < 110 && Math.abs(x - (R + 290)) < 90) return;   // 63빌딩 자리
    const seed = r() * 100, lit = type === 0 ? .3 + r() * .2 : type === 1 ? .12 + r() * .25 : .28 + r() * .2;
    const crown = r() < crownP ? (r() < .5 ? 2 : 1) : 0;
    bl.add(sd * x, z, sx, sz, 0, 7, h, type, seed, lit, crown, shop);
    if (h > 90) pts.add(sd * x, 7 + h + 1.5, z, [6, .25, .15], 1.8, null, [1, r(), 2.4, 0]);
  };
  for (let z = ZA; z < ZB; z += 1) for (const sd of [-1, 1]) {
    const zn = zone(sd, z), X1 = sd > 0 ? R + 160 : R + 75, X2 = sd > 0 ? R + 270 : R + 190;
    if (((z % 74) + 74) % 74 === 0 && !nearBridge(z) && r() < .9) {
      if (zn === "yeouido" || (zn === "yongsan" && r() < .5)) addB(sd, X1 + 5 + r() * 40, z + r() * 20, 34 + r() * 16, 34 + r() * 16, 110 + r() * 140, r() < .8 ? 1 : 2, .5, true);
      else if (zn === "mix" && r() < .4) addB(sd, X1 + r() * 50, z, 22 + r() * 18, 28 + r() * 20, 25 + r() * 40, 2, .1, true);
      else addB(sd, X1 + r() * 30, z + r() * 8, 16 + r() * 4, 58 + r() * 22, (zn === "banpo" || zn === "ichon" || zn === "apt" ? 60 : 40) + r() * 50, 0, .35, false);
    }
    if (((z % 62) + 62) % 62 === 31 && r() < .8) {
      const tall = zn === "yeouido" || zn === "yongsan" ? r() < .7 : r() < .15;
      if (tall) addB(sd, X2 + r() * 220, z + r() * 20, 30 + r() * 20, 30 + r() * 20, 120 + r() * r() * 160, r() < .75 ? 1 : 2, .55, false);
      else addB(sd, X2 + r() * 240, z + r() * 20, 16 + r() * 4, 50 + r() * 25, 45 + r() * 60, 0, .25, false);
    }
    if (((z % 55) + 55) % 55 === 20 && r() < .75) addB(sd, R + 560 + r() * 900, z + r() * 30, 18 + r() * 30, 30 + r() * 40, 40 + r() * r() * 170, r() < .55 ? 0 : r() < .7 ? 1 : 2, .3, false);
  }
  bl.add(R + 290, 300, 50, 46, 0, 7, 250, 3, 3.3, .55, 0, true);   // 63빌딩(금빛)
  pts.add(R + 290, 260, 300, [6, .2, .12], 2.2, null, [1, .3, 2.2, 0]);
  for (let i = 0; i < (phone ? 5000 : 8000); i++) { const sd = r() < .5 ? -1 : 1, x = R + 600 + Math.pow(r(), .7) * 3200, z = ZA + r() * (ZB - ZA); pts.add(sd * x, 7 + r() * r() * 70, z, r() < .6 ? K(3000, 1.2 + r() * 1.5) : K(5200, 1 + r() * 1.5), 2.2, null, [2, r(), 1 + r() * 3, 0]); }

  // ---------- 2) 땅: 북쪽은 유람선과 같은 강둑, 남쪽은 넓은 한강공원(산책로·잔디·자전거 길·강변도로) ----------
  const concrete = [.018, .017, .02], concreteTop = [.05, .04, .035], road = [.012, .012, .014];
  const park = { p: [], c: [] };   // 남쪽 공원 바닥: 가로등 빛 웅덩이·자전거 길 선·자전거 앞불을 셰이더로
  const pq = (xa, xb, z0, z1, ya, yb, c) => { const P = [[xa, ya, -z0], [xa, ya, -z1], [xb, yb, -z1], [xb, yb, -z0]]; for (const k of [0, 2, 1, 0, 3, 2]) { park.p.push(...P[k]); park.c.push(...c); } };
  for (let z = ZA; z < ZB; z += 50) {
    const Z0b = -z, Z1b = -(z + 50), cz = -(z + 25);
    // 북쪽(sd = -1)
    { const x = v => -v, q = (xa, ya, xb, yb, ca, cb) => bake.quad([x(xa), ya, Z1b], [x(xa), ya, Z0b], [x(xb), yb, Z0b], [x(xb), yb, Z1b], ca, ca, cb, cb, cz);
      q(R - 2, -1, R + 8, 7, concrete, concreteTop); q(R + 8, 7, R + 13, 7, [.03, .026, .024], [.03, .026, .024]); q(R + 13, 7, R + 36, 7.2, [.006, .009, .006], [.006, .009, .006]);
      q(R + 36, 7.2, R + 38, 9, concrete, concrete); q(R + 38, 9, R + 54, 9, road, road); q(R + 54, 9, R + 56, 10, [.03, .03, .035], [.03, .03, .035]); q(R + 56, 10, R + 4000, 7, [.004, .004, .006], [.004, .004, .006]); }
    // 남쪽(sd = 1): 돌 둑(경사) → 공원(셰이더 바닥) → 강변도로 둑 → 도시
    { const q = (xa, ya, xb, yb, ca, cb) => bake.quad([xa, ya, Z0b], [xa, ya, Z1b], [xb, yb, Z1b], [xb, yb, Z0b], ca, ca, cb, cb, cz);
      q(R - 2, -1, R + 6, GY, concrete, concreteTop);
      q(R + 100, GY, R + 102, 10, concrete, [.03, .028, .03]); q(R + 102, 10, R + 128, 10, road, road); q(R + 128, 10, R + 130, 11, [.03, .03, .035], [.03, .03, .035]); q(R + 130, 11, R + 4000, 7, [.004, .004, .006], [.004, .004, .006]);
      pq(R + 6, R + 8, z, z + 50, GY, GY, [.028, .026, .024]);        // 둑 위 돌 턱
      pq(R + 8, R + 14, z, z + 50, GY, GY, [.02, .018, .017]);      // 강변 산책로
      pq(R + 14, R + 40, z, z + 50, GY, GY, [.011, .017, .009]);    // 잔디
      pq(R + 40, R + 46, z, z + 50, GY, GY, [.026, .013, .012]);    // 자전거 길(붉은 포장)
      pq(R + 46, R + 100, z, z + 50, GY, GY, [.011, .016, .009]); } // 잔디·숲
  }
  const POOLN = 16;
  const groundMat = new THREE.ShaderMaterial({
    uniforms: uni({ uR: { value: R }, uPB: { value: PB }, uHead: { value: new THREE.Vector4(0, 0, 0, 1) }, uHeadOn: { value: 0 }, uPools: { value: Array.from({ length: POOLN }, () => new THREE.Vector4(0, 0, 1, 0)) } }),
    vertexShader: GL_COMMON + `attribute vec3 aCol; varying vec3 vC; varying vec3 vW; varying float vD; void main() { vC = aCol; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: GL_COMMON + NOISE + `uniform float uR; uniform float uPB; uniform vec4 uHead; uniform float uHeadOn; uniform vec4 uPools[${POOLN}];
      varying vec3 vC; varying vec3 vW; varying float vD;
      float pool(vec2 p, float lx, float per, float rad) { float dz = p.y - per * floor(p.y / per + .5), dx = p.x - lx; return exp(-(dx * dx + dz * dz) / (rad * rad)); }
      void main() {
        vec2 p = vec2(vW.x, -vW.z);
        float near = smoothstep(160., 25., vD);
        float n = mix(.5, n2(p * 2.3) * .45 + n2(p * .37) * .55, near);
        vec3 alb = vC * (.7 + .6 * n);
        // 자전거 길: 가운데 흰 점선, 양쪽 흰 실선. 산책로: 보도블록 줄
        float bw = fwidth(p.x) + .01;
        float dash = smoothstep(.09 + bw, .09, abs(p.x - uPB)) * step(fract(p.y / 6.), .5);
        float edge = smoothstep(.07 + bw, .07, abs(abs(p.x - uPB) - 2.75));
        alb = mix(alb, vec3(.06, .058, .056), max(dash, edge) * near * .9);
        if (p.x > uR + 8. && p.x < uR + 14.) { vec2 g = fract(vec2(p.x / .6, p.y / 1.2)); alb *= .82 + .18 * smoothstep(.0, .08, min(g.x, g.y)) ; }
        // 가로등 빛 웅덩이(산책로 30m, 자전거 길 35m 간격) + 가게·대여소 불빛
        vec3 L = vec3(1., .74, .47) * (pool(p, uR + 10., 30., 7.5) + pool(p, uPB + 4., 35., 8.5) * .85);
        for (int i = 0; i < ${POOLN}; i++) { vec4 q = uPools[i]; if (q.w <= 0.) continue; vec2 d = p - q.xy; L += vec3(1., .86, .7) * q.w * exp(-dot(d, d) / (q.z * q.z)); }
        // 자전거 앞불: 앞쪽 바닥을 비추는 빛
        if (uHeadOn > 0.) { vec2 hp = p - uHead.xy; float al = dot(hp, uHead.zw), sd = dot(hp, vec2(-uHead.w, uHead.z));
          L += vec3(.85, .92, 1.) * uHeadOn * 1.6 * smoothstep(.5, 2.5, al) * exp(-al / 11.) * exp(-sd * sd / (.25 + al * al * .05)); }
        vec3 col = alb * (.32 + L * 7.);
        float f = 1. - exp(-vD * uHazeD); gl_FragColor = vec4(mix(col, uHaze, f), 1.); }` });
  { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(park.p, 3)); g.setAttribute("aCol", new THREE.Float32BufferAttribute(park.c, 3)); const m = new THREE.Mesh(g, groundMat); m.frustumCulled = false; G.add(m); }

  // ---------- 3) 나무(가을: 은행 노랑·단풍 빨강이 가로등 빛에), 벤치, 가로등 ----------
  const TREES = [];
  const tree = (tx, tz, th, rr, kind) => {
    const lit = kind === 1 ? [.09, .06, .008] : kind === 2 ? [.07, .016, .01] : [.016, .022, .01], top = kind === 1 ? [.016, .012, .003] : kind === 2 ? [.014, .004, .003] : [.004, .008, .005];
    const cf = (y, x2) => { const u = clamp((y + 1) / 2, 0, 1); return lit.map((v, i) => v * (1 - u) + top[i] * u + (x2 > .5 ? .0015 : 0)); };
    // 덩어리 세 개로 풍성하게
    ball(bake, tx, GY + th * .55, tz, rr, th * .36, rr, cf, true);
    ball(bake, tx + rr * .35, GY + th * .8, tz - rr * .2, rr * .7, th * .28, rr * .7, cf, true);
    ball(bake, tx - rr * .3, GY + th * .75, tz + rr * .3, rr * .65, th * .26, rr * .65, cf, true);
    bake.box(tx, GY, tz, .3, th * .5, .3, [.012, .009, .006], [.012, .009, .006], null, 0);
    TREES.push([tx, tz, .6]);
  };
  for (let z = ZA + 300; z < ZB - 300; z += 9) {
    if (nearBridge(z, 22)) continue;
    // 남쪽 공원: 산책로와 자전거 길 사이 드문드문, 자전거 길 뒤로 숲
    if (r() < .5) { const x = R + 18 + r() * 18, zz = z + r() * 6; if (!nearPOI(x, zz, 12)) tree(x, zz, 4 + r() * 4, 2.3 + r() * 1.8, r() < .3 ? 1 : r() < .2 ? 2 : 0); }
    for (let k = 0; k < 2; k++) { const x = R + 52 + r() * 45, zz = z + r() * 9; if (r() < .75 && !nearPOI(x, zz, 14)) tree(x, zz, 5 + r() * 5, 2.6 + r() * 2.2, r() < .25 ? 1 : r() < .2 ? 2 : 0); }
    // 북쪽(유람선과 같은 모양)
    if (r() < .65) tree(-(R + 16 + r() * 18), z + r() * 6, 4 + r() * 4, 2.5 + r() * 2, r() < .2 ? 1 : 0);
  }
  // 가로등: 산책로(따뜻한 4000K) · 자전거 길 · 강변도로 · 북쪽
  for (let z = Math.ceil(ZA / 30) * 30; z < ZB; z += 30) {
    if (!nearBridge(z, 12)) { pts.add(R + 10, GY + 4.6, z, K(4000, 6), 1); bake.box(R + 10, GY, z, .16, 4.5, .16, [.025, .024, .024], [.03, .03, .03], null, 0); bake.box(R + 10, GY + 4.45, z, .5, .18, .5, [.04, .035, .03], [.05, .045, .04], null, 0); }
    pts.add(-(R + 10), 11.5, z, K(4200, 6), 1); bake.box(-(R + 10), 7, z, .25, 4.4, .25, [.02, .02, .02], [.02, .02, .02], null, 0);
  }
  for (let z = Math.ceil(ZA / 35) * 35; z < ZB; z += 35) if (!nearBridge(z, 12)) { pts.add(PB + 4, GY + 5.4, z, K(4300, 6), 1.1); bake.box(PB + 4, GY, z, .18, 5.3, .18, [.025, .024, .024], [.03, .03, .03], null, 0); bake.box(PB + 3.4, GY + 5.25, z, 1.3, .16, .3, [.04, .035, .03], [.05, .045, .04], null, 0); }
  for (let z = 15; z < ZB; z += 37.5) { pts.add(R + 115, 22, z + ZA % 37.5, K(5000, 6), 1.3); pts.add(-(R + 46), 21, z + ZA % 37.5, K(5000, 6), 1.3); }
  // 벤치(강을 보고)
  for (let z = ZA + 320; z < ZB - 300; z += 45) { if (nearBridge(z, 20) || nearPOI(R + 15, z, 8)) continue; bake.box(R + 15.2, GY + .42, z, .45, .06, 1.8, [.05, .035, .02], [.07, .05, .03], null, 0); bake.box(R + 15.45, GY + .48, z, .06, .45, 1.8, [.05, .035, .02], [.07, .05, .03], null, 0); for (const e of [-.75, .75]) bake.box(R + 15.2, GY, z + e, .4, .42, .06, [.02, .02, .02], [.02, .02, .02], null, 0); }
  // 차: 남쪽 강변도로(올림픽대로)·북쪽 강변도로(강변북로)
  const LW = ZB - ZA;
  for (const [x, y, dir, col] of [[R + 106, 10.9, 1, K(5500, 7)], [R + 110, 10.9, 1, K(5500, 7)], [R + 119, 10.9, -1, [7, .35, .2]], [R + 123, 10.9, -1, [7, .35, .2]], [-(R + 41), 9.9, 1, K(5500, 7)], [-(R + 44), 9.9, 1, K(5500, 7)], [-(R + 47), 9.9, -1, [7, .35, .2]], [-(R + 51), 9.9, -1, [7, .35, .2]]]) {
    const n = 130 + (r() * 40 | 0);
    for (let i = 0; i < n; i++) pts.add(x, y, ZA, col, .9, [0, -dir, 14 + r() * 8, LW], [0, i / n + r() * .004, 0, 0]);
  }

  // ---------- 4) 다리 ----------
  const PIERS = [];   // 부딪힘: [x, z, 반 x, 반 z]
  for (const b of o.BRIDGES) {
    const B = R + 170, z = b.z, col = b.col.split(",").map(v => Math.pow(+v / 255, 2.2)), lamp = b.lamp.split(",").map(v => Math.pow(+v / 255, 2.2));
    const deck = [.012, .012, .016], under = col.map(v => v * .35);
    bake.box(0, 14, z, 2 * B, 3.4, 22, under, deck, [.01, .01, .012], 0);
    bake.box(0, 17.4, z - 10.6, 2 * B, 1.1, .4, [.03, .03, .035], [.03, .03, .035], null, 0);
    bake.box(0, 17.4, z + 10.6, 2 * B, 1.1, .4, [.03, .03, .035], [.03, .03, .035], null, 0);
    for (let px = -R + 70; px <= R - 70; px += 105) { bake.box(px, -1, z, 9, 15, 16, col.map(v => v * .6), [.015, .015, .02], null, 0); PIERS.push([px, z, 5.5, 8.5]); }
    for (const px of [R + 27, R + 75]) { bake.box(px, GY, z, 3, 14 - GY, 12, [.03, .03, .035], [.02, .02, .025], null, 0); PIERS.push([px, z, 2, 6.5]); }
    for (let px = -B; px <= B; px += 2.2) pts.add(px, 14.1, z - 11.2, col.map(v => v * 4), .55);
    for (let px = -B + 12; px <= B; px += 34) for (const e of [-1, 1]) { pts.add(px, 24, z + e * 10.8, lamp.map(v => v * 5), 1.1); bake.box(px, 18.5, z + e * 10.8, .3, 5.5, .3, [.025, .025, .03], [.025, .025, .03], null, 0); }
    // 다리 밑 길: 따뜻한 등(아래를 지날 때 아늑하게)
    for (const px of [R + 11, PB, PB + 3]) for (const e of [-6, 6]) pts.add(px, 13.6, z + e, K(3600, 3), .5);
    for (const [dir, off, cc] of [[1, -4, K(5500, 6)], [-1, 4, [6, .3, .18]]]) for (let i = 0; i < 14; i++) pts.add(dir > 0 ? -B : B, 18.4, z + off, cc, .8, [1 * dir, 0, 11 + r() * 6, 2 * B], [0, i / 14 + r() * .03, 0, 0]);
    if (b.type === "arch" || b.type === "arch2") {
      const spans = b.type === "arch" ? [[-R + 60, -R + 250], [-R + 250, -R + 440], [R - 440, R - 250], [R - 250, R - 60]] : [[-300, -20], [20, 300]];
      const ah = b.type === "arch" ? 30 : 50, ac = b.type === "arch" ? K(4500, .9) : col.map(v => v * 1.2);
      for (const [a, c] of spans) for (const e of [-1, 1]) {
        const P = []; for (let k = 0; k <= 24; k++) { const u = k / 24; P.push([a + (c - a) * u, 17.4 + Math.sin(u * Math.PI) * ah, z + e * 9.5]); }
        tube2(bake, P, b.type === "arch" ? .9 : 1.3, ac, 6);
        for (let k = 0; k <= 48; k++) { const u = k / 48; pts.add(a + (c - a) * u, 17.4 + Math.sin(u * Math.PI) * ah + 1.2, z + e * 9.5, (b.type === "arch" ? K(4800, 2.5) : col.map(v => v * 2.5)), .5); }
        for (let k = 2; k < 24; k += 2) { const u = k / 24, xx = a + (c - a) * u, yy = Math.sin(u * Math.PI) * ah; bake.box(xx, 17.4, z + e * 9.5, .25, yy, .25, [.06, .05, .04], [.06, .05, .04], null, 0); }
      }
    }
    if (b.type === "truss") for (const e of [-1, 1]) for (let px = -B; px < B; px += 30) {
      tube2(bake, [[px, 17.4, z + e * 10], [px + 15, 29, z + e * 10], [px + 30, 17.4, z + e * 10]], .35, [.08, .12, .22], 4);
      tube2(bake, [[px, 29, z + e * 10], [px + 30, 29, z + e * 10]], .35, [.08, .12, .22], 4);
    }
  }
  // 반포대교 달빛무지개분수
  const fb = o.BRIDGES.find(b => b.type === "fountain");
  const fMat = new THREE.ShaderMaterial({ uniforms: uni({ uOn: { value: 0 } }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: GL_COMMON + `uniform float uPx; uniform float uDpr; uniform float uOn; attribute vec4 aF; varying vec3 vC;
      vec3 hsv(float h) { return clamp(abs(mod(h * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.); }
      void main() { float u = fract(aF.y + uTime * .45); vec3 p = vec3(aF.x + sin(aF.x) * 1.3, 15.6 + 4. * u - 19.5 * u * u, -(aF.z - 2. - 21. * u + aF.w * u));
        vec4 mv = modelViewMatrix * vec4(p, 1.); float d = -mv.z;
        float s = max(1.1 * uPx / d, 1.5 * uDpr); vC = hsv(fract((aF.x + 260.) / 520. * .85 + uTime * .06)) * .8 * (1. - u * .55) * uOn * exp(-d * uHazeD) * min(1., pow((.9 * uPx / d) / s, 2.) + .08);
        gl_Position = projectionMatrix * mv; gl_PointSize = min(s, 90.); if (uOn <= 0.) gl_PointSize = 0.; }`,
    fragmentShader: `varying vec3 vC; void main() { vec2 p = gl_PointCoord - .5; float r = dot(p, p) * 4.; if (r > 1.) discard; gl_FragColor = vec4(vC * exp(-r * 3.), 1.); }` });
  { const fa = []; for (let px = -R + 12; px <= R - 12; px += 3.2) for (let k = 0; k < 16; k++) fa.push(px, k / 16 + Math.random() * .05, fb.z - 11, (Math.random() - .5) * 3);
    const fg = new THREE.BufferGeometry(); fg.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(fa.length / 4 * 3), 3)); fg.setAttribute("aF", new THREE.Float32BufferAttribute(fa, 4));
    const fountain = new THREE.Points(fg, fMat); fountain.frustumCulled = false; G.add(fountain); }

  // ---------- 5) 섬: 밤섬(새들의 섬, 불 없음) · 노들섬(문화 공간) · 세빛섬(빛나는 떠 있는 섬) ----------
  const ISL = o.ISLES;
  for (const s of ISL) {
    const [ix, iz, rx, rz] = [s.x, s.z, s.rx, s.rz];
    for (let a = 0; a < 32; a++) { const a0 = a / 32 * TAU, a1 = (a + 1) / 32 * TAU, P = (an, k, y) => [ix + Math.cos(an) * rx * k, y, -(iz + Math.sin(an) * rz * k)];
      bake.quad(P(a0, 1.05, -.5), P(a1, 1.05, -.5), P(a1, .9, 2.5), P(a0, .9, 2.5), [.012, .012, .01], [.012, .012, .01], [.01, .012, .008], [.01, .012, .008], 0);
      bake.tri(P(a0, .9, 2.5), P(a1, .9, 2.5), [ix, 3, -iz], [.006, .009, .006], [.006, .009, .006], [.006, .009, .006], 0); }
    const n = s.k === "bam" ? 90 : 26; for (let i = 0; i < n; i++) { const an = r() * TAU, k = Math.sqrt(r()) * .8; const tx = ix + Math.cos(an) * rx * k, tz = iz + Math.sin(an) * rz * k; ball(bake, tx, 2.5 + 3, tz, 3 + r() * 2, 3, 3 + r() * 2, y => y < 0 ? [.01, .012, .008] : [.004, .007, .005], true); }
    if (s.k === "nodeul") { bl.add(ix + 20, iz - 60, 60, 40, 0, 2.5, 12, 2, 7.7, .6, 1, true); bl.add(ix - 10, iz + 80, 40, 50, 0, 2.5, 9, 2, 8.1, .5, 1, true); for (let i = 0; i < 30; i++) pts.add(ix + (r() - .5) * rx, 4, iz + (r() - .5) * rz * 1.4, K(3200, 3), .6); }
  }
  // 세빛섬: 물 위 세 개의 빛나는 건물(색이 천천히 바뀐다)
  const sbMat = new THREE.ShaderMaterial({ uniforms: uni(), vertexShader: GL_COMMON + `varying vec3 vP; varying float vD; varying vec3 vN; void main() { vP = position; vN = normal; vec4 mv = modelViewMatrix * vec4(position, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: GL_COMMON + `varying vec3 vP; varying float vD; varying vec3 vN;
      vec3 hsv(float h) { return clamp(abs(mod(h * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.); }
      void main() { float h = fract(uTime * .03 + vP.y * .02 + (vP.x + vP.z) * .004); float band = .55 + .45 * smoothstep(.35, .5, abs(fract(vP.y * .9 + atan(vP.x, vP.z) * 1.5) - .5));
        vec3 c = mix(vec3(.8, .85, 1.), hsv(h), .8) * band * .32; c *= .6 + .4 * abs(vN.y);
        gl_FragColor = vec4(mix(c, uHaze, 1. - exp(-vD * uHazeD)), 1.); }` });
  const SBI = o.SEBIT;
  { const g = new THREE.SphereGeometry(1, 28, 14, 0, TAU, 0, Math.PI / 2);
    SBI.forEach((s, i) => { const m = new THREE.Mesh(g, sbMat); m.scale.set(s.rx, s.h, s.rz); m.position.set(s.x, .6, -s.z); m.rotation.y = s.rot || 0; G.add(m);
      bake.box(s.x, -.4, s.z, s.rx * 2.2, 1, s.rz * 2.2, [.03, .03, .035], [.05, .05, .06], null, 0); for (let k = 0; k < 24; k++) { const an = k / 24 * TAU; pts.add(s.x + Math.cos(an) * s.rx * 1.08, .8, s.z + Math.sin(an) * s.rz * 1.08, K(6000, 3), .5); } });
    // 세빛섬을 잇는 다리 + 강가 연결
    bake.box((SBI[0].x + R) / 2, .2, SBI[0].z, R - SBI[0].x, .4, 2.5, [.03, .03, .035], [.05, .05, .06], null, 0); }

  // ---------- 6) 남산 + N서울타워, 먼 산, 롯데월드타워 ----------
  const NS = o.NAMSAN;
  for (let ri = 0; ri < 10; ri++) for (let ai = 0; ai < 24; ai++) {
    const hgt = rr => 235 * Math.exp(-Math.pow(rr / 700, 2)) + 7;
    const P = (rr, a) => { const n = 1 + .08 * Math.sin(a * 5 + rr * .01); return [NS.x + Math.cos(a) * rr * 1.1, hgt(rr) * n, -(NS.z + Math.sin(a) * rr * 1.5)]; };
    const r0 = ri * 150, r1 = (ri + 1) * 150, a0 = ai / 24 * TAU, a1 = (ai + 1) / 24 * TAU, c0 = [.005, .007, .006], c1 = [.012, .01, .008];
    bake.quad(P(r0, a0), P(r1, a0), P(r1, a1), P(r0, a1), c0, c1, c1, c0, 0);
  }
  for (let i = 0; i < 70; i++) { const a = r() * TAU, rr = 150 + r() * 1100; pts.add(NS.x + Math.cos(a) * rr * 1.1, 235 * Math.exp(-Math.pow(rr / 700, 2)) + 9, NS.z + Math.sin(a) * rr * 1.5, K(2800, 2), 2.5); }
  { const tb = 242, tc = [.35, .42, .8], seg = [[tb, 7.5, 6.5], [tb + 110, 6.5, 5.2], [tb + 120, 10, 10], [tb + 150, 10, 5.5], [tb + 158, 2.2, 1.6], [tb + 236, 1.2, .4]];
    for (let i = 0; i < seg.length - 1; i++) { const [y0] = seg[i], [y1, , r1] = seg[i + 1]; const cc = i === 2 ? K(3200, 1.8) : tc.map(v => v * (1.1 - i * .12));
      for (let k = 0; k < 10; k++) { const a0 = k / 10 * TAU, a1 = (k + 1) / 10 * TAU, P = (rr, yy, a) => [NS.x + Math.cos(a) * rr, yy, -(NS.z + Math.sin(a) * rr)]; bake.quad(P(seg[i][1], y0, a0), P(seg[i][1], y0, a1), P(r1, y1, a1), P(r1, y1, a0), cc, cc, cc, cc, 0); } }
    for (let k = 0; k < 36; k++) { const a = k / 36 * TAU; pts.add(NS.x + Math.cos(a) * 10.5, tb + 133, NS.z + Math.sin(a) * 10.5, K(3000, 5), 2.2); }
    pts.add(NS.x, tb + 238, NS.z, [8, .3, .2], 4, null, [1, 0, 2.4, 0]); }
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
  far.add(fb2.mesh(bakedMat(false, THREE.DoubleSide)));
  { const fp = new Pts(), az = 6 * RAD, D = 14000; fp.add(Math.sin(az) * D, 560, Math.cos(az) * D, [8, .3, .2], 9, null, [1, .5, 2, 0]);
    for (let i = 0; i < 2000; i++) { const a = (r() * 360 - 180) * RAD, d = 5000 + r() * 9000; fp.add(Math.sin(a) * d, 10 + r() * 60, Math.cos(a) * d, r() < .6 ? K(2900, 1.4) : K(5000, 1.2), 7, null, [2, r(), 2, 0]); }
    far.add(fp.mesh(ptMat(false))); }
  G.add(far);

  // ---------- 7) 모델: 사람·자전거·오리배·유람선 ----------
  // 사람(앞 = +z): 몸(옷 색은 인스턴스 색으로), 머리는 따로
  const personB = new Bake(), headB = new Bake();
  { const W = [.55, .55, .58];
    personB.box(-.1, 0, 0, .14, .82, .16, [.08, .08, .1], [.1, .1, .12], null, 0); personB.box(.1, 0, 0, .14, .82, .16, [.08, .08, .1], [.1, .1, .12], null, 0);
    personB.box(0, .8, 0, .4, .62, .24, W.map(v => v * .7), W, W, 0);
    personB.box(-.25, .85, 0, .1, .55, .12, W.map(v => v * .6), W.map(v => v * .9), null, 0); personB.box(.25, .85, 0, .1, .55, .12, W.map(v => v * .6), W.map(v => v * .9), null, 0);
    ball(headB, 0, 1.58, 0, .13, .15, .14, (y, x, z) => (y > .15 || z < -.3) ? [.03, .022, .02] : [.36, .25, .19]); }
  const personGeo = geoOf(personB), headGeo = geoOf(headB);
  // 자전거(앞 = +z, 바닥 0): 크림색 뼈대, 검은 바구니, 앞불. 바퀴는 따로 돈다
  const bikeB = new Bake(), wheelB = new Bake();
  { const F = [.32, .29, .24], D = [.03, .03, .033], BB = [0, .33, -.02], HD = [0, .86, .43], ST = [0, .88, -.2];
    for (const [a, b] of [[BB, HD], [BB, ST], [ST, HD], [BB, [0, .33, -.52]], [ST, [0, .33, -.52]], [HD, [0, .33, .52]]]) tube2(bikeB, [a, b], .028, F, 5);
    tube2(bikeB, [[0, .86, .43], [0, 1.02, .38]], .022, D, 5); tube2(bikeB, [[-.3, 1.02, .36], [-.2, 1.04, .4], [.2, 1.04, .4], [.3, 1.02, .36]], .016, D, 5);
    for (const e of [-1, 1]) tube2(bikeB, [[e * .23, 1.03, .39], [e * .33, 1.02, .35]], .024, [.015, .015, .015], 6);
    bikeB.box(0, .9, -.22, .14, .07, .26, [.02, .02, .02], [.03, .03, .03], null, 0);
    // 바구니(앞)
    for (const [y, c] of [[.82, D], [1.06, D]]) tube2(bikeB, [[-.2, y, .5], [.2, y, .5], [.2, y, .8], [-.2, y, .8], [-.2, y, .5]], .012, c, 4);
    for (const [x, z] of [[-.2, .5], [.2, .5], [.2, .8], [-.2, .8]]) tube2(bikeB, [[x, .82, z], [x, 1.06, z]], .01, D, 4);
    bikeB.box(0, .82, .65, .4, .01, .3, D, D, D, 0);
    bikeB.box(0, .92, .83, .07, .05, .03, [.05, .05, .05], [.06, .06, .06], [.08, .08, .08], 0); bikeB.box(0, .92, .846, .05, .035, .005, [.9, .9, .85], [.9, .9, .85], null, 0);   // 앞불
    bikeB.box(0, .55, -.62, .05, .04, .03, [.9, .05, .04], [.9, .05, .04], null, 0);           // 뒷불
    // 바퀴(가운데가 0, 옆에서 보는 원은 y-z 평면)
    const ring = []; for (let k = 0; k < 18; k++) { const a = k / 18 * TAU; ring.push([0, Math.cos(a) * .33, Math.sin(a) * .33]); }
    tube2(wheelB, ring, .022, [.012, .012, .012], 4, true);
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI; tube2(wheelB, [[0, Math.cos(a) * .31, Math.sin(a) * .31], [0, -Math.cos(a) * .31, -Math.sin(a) * .31]], .006, [.1, .1, .1], 3); } }
  const bikeGeo = geoOf(bikeB), wheelGeo = geoOf(wheelB);
  // 오리배(앞 = +z, 물 0): 하얀 백조, 지붕, 의자 두 개
  const swanB = new Bake();
  { const Wt = [.034, .034, .038], Wb = [.016, .016, .019], In = [.008, .009, .012];
    const rings = []; const NR = 12;
    for (let i = 0; i <= NR; i++) { const u = i / NR, z = -1.25 + u * 2.6, hw = .82 * Math.pow(Math.max(0, 1 - Math.pow((z - .05) / 1.36, 2)), .45) + .02, top = .62 + (u > .8 ? (u - .8) * .6 : 0);
      const ring = []; for (let k = 0; k <= 8; k++) { const a = k / 8 * Math.PI; ring.push([Math.cos(a) * hw, top - Math.sin(a) * .75, z]); } rings.push(ring); }
    for (let i = 0; i < NR; i++) for (let k = 0; k < 8; k++) { const A = rings[i], B = rings[i + 1], f = p => [p[0], p[1], -p[2]], cA = A[k][1] < .1 ? Wb : Wt;
      swanB.quad(f(A[k]), f(A[k + 1]), f(B[k + 1]), f(B[k]), cA, cA, cA, cA, 0); }
    swanB.quad([-.7, .12, 1.0], [.7, .12, 1.0], [.7, .12, -1.0], [-.7, .12, -1.0], In, In, In, In, 0);   // 바닥
    for (const z of [-.55, .05]) { swanB.box(0, .12, z, 1.1, .3, .38, [.06, .06, .08], [.08, .08, .1], [.1, .1, .13], 0); swanB.box(0, .42, z - .17, 1.1, .4, .06, [.06, .06, .08], [.09, .09, .11], null, 0); }
    // 날개(옆에 올라온 깃)
    for (const e of [-1, 1]) for (let k = 0; k < 5; k++) { const z0 = -1.1 + k * .32; swanB.tri([e * .84, .5, -z0], [e * .86, .5, -(z0 + .5)], [e * .78, .9 + k * .05, -(z0 + .1)], Wt, Wt, [.3, .3, .32], 0); }
    // 목·머리·부리
    const neck = [[0, .55, 1.15], [0, .95, 1.35], [0, 1.35, 1.32], [0, 1.68, 1.14], [0, 1.88, 1.18]];
    tube2(swanB, neck, u => .1 - u * .04, Wt, 8);
    ball(swanB, 0, 1.92, 1.25, .11, .1, .15, () => [.055, .055, .06]);
    tube2(swanB, [[0, 1.9, 1.38], [0, 1.86, 1.56]], u => .045 - u * .035, [.16, .06, .015], 6);
    for (const e of [-1, 1]) ball(swanB, e * .09, 1.96, 1.33, .02, .025, .025, () => [.005, .005, .005], true);
    // 지붕(차양) + 기둥
    for (const [x, z] of [[-.72, -1.0], [.72, -1.0], [-.66, .45], [.66, .45]]) tube2(swanB, [[x, .5, z], [x, 1.98, z]], .016, [.04, .04, .045], 5);
    swanB.box(0, 1.98, -.28, 1.6, .05, 1.6, [.05, .055, .065], [.08, .085, .1], [.06, .065, .075], 0);
    for (let k = 0; k < 24; k++) { const u = (k + .5) / 24; swanB.box(-.78 + u * 1.56, 1.955, .5, .018, .018, .018, [.7, .6, .45], [.7, .6, .45], null, 0); } }
  const swanGeo = geoOf(swanB);
  // 🛶 79차 카약(앞 = +z, 물 0): 길쭉한 주황 배, 가운데 검은 좌석 구멍 · 패들보드(SUP): 납작한 판
  const kayakB = new Bake(), supB = new Bake(), padB = new Bake(), supPadB = new Bake();
  { const Hc = [.32, .08, .02], Dk = [.42, .14, .04], Bt = [.05, .02, .01], NR = 14, rings = [];
    for (let i = 0; i <= NR; i++) { const u = i / NR, z = -1.75 + u * 3.5, hw = .33 * Math.pow(Math.max(0, 1 - Math.pow(z / 1.78, 2)), .6) + .01, ring = [];
      for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI; ring.push([Math.cos(a) * hw, .16 - Math.sin(a) * .2, z]); } ring.push([hw * .6, .2, z], [-hw * .6, .2, z]); rings.push(ring); }
    for (let i = 0; i < NR; i++) { const A = rings[i], B = rings[i + 1], f = q => [q[0], q[1], -q[2]];
      for (let k = 0; k < 6; k++) kayakB.quad(f(A[k]), f(A[k + 1]), f(B[k + 1]), f(B[k]), Bt, Bt, Hc, Hc, 0);
      kayakB.quad(f(A[0]), f(B[0]), f(B[7]), f(A[7]), Dk, Dk, Dk, Dk, 0); kayakB.quad(f(A[7]), f(B[7]), f(B[8]), f(A[8]), Dk, Dk, Dk, Dk, 0); kayakB.quad(f(A[8]), f(B[8]), f(B[6]), f(A[6]), Dk, Dk, Dk, Dk, 0); }
    ball(kayakB, 0, .2, -.1, .22, .03, .42, () => [.01, .01, .012]);   // 좌석 구멍
    for (const z of [1.2, -1.3]) kayakB.box(0, .19, z, .02, .02, .5, [.6, .6, .6], [.6, .6, .6], null, 0);   // 갑판 줄
    // 패들보드: 길이 3.2m, 앞이 둥근 납작한 판 + 가운데 미끄럼 방지 패드
    const Sb = [.02, .12, .14], St = [.05, .3, .32], Sp = [.02, .03, .04];
    supB.box(0, 0, -.3, .76, .12, 2.4, Sb, St, St, 0);
    for (let k = 0; k < 8; k++) { const a0 = k / 8 * Math.PI, a1 = (k + 1) / 8 * Math.PI, P = (a, y) => [Math.cos(a) * .38, y, .9 + Math.sin(a) * .7]; supB.quad([P(a0, 0)[0], 0, -P(a0, 0)[2]], [P(a1, 0)[0], 0, -P(a1, 0)[2]], [P(a1, .12)[0], .12, -P(a1, .12)[2]], [P(a0, .12)[0], .12, -P(a0, .12)[2]], Sb, Sb, St, St, 0); supB.tri([0, .12, -.9], [P(a0, .12)[0], .12, -P(a0, .12)[2]], [P(a1, .12)[0], .12, -P(a1, .12)[2]], St, St, St, 0); }
    supB.box(0, .121, -.4, .6, .01, 1.0, Sp, Sp, Sp, 0);
    // 카약 노(양쪽 날), 패들보드 노(한쪽 날, 세로)
    tube2(padB, [[-1.05, 0, 0], [1.05, 0, 0]], .018, [.05, .05, .055], 5);
    for (const e of [-1, 1]) padB.box(e * 1.05, -.03, 0, .32, .06, .16, [.35, .3, .05], [.45, .38, .06], null, 0);
    tube2(supPadB, [[0, 0, 0], [0, 1.75, 0]], .016, [.05, .05, .055], 5); supPadB.box(0, -.02, 0, .03, .4, .18, [.3, .3, .32], [.4, .4, .42], null, 0); supPadB.box(0, 1.72, 0, .12, .04, .04, [.1, .1, .1], [.1, .1, .1], null, 0); }
  const kayakGeo = geoOf(kayakB), supGeo = geoOf(supB), padGeo = geoOf(padB), supPadGeo = geoOf(supPadB);
  // 🏃 러닝 모자(흰색 → 옷 색으로 물들임): 캡 · 헤어밴드 · 비니
  const capB = new Bake(), bandB = new Bake(), beanB = new Bake(), Wc = [.6, .6, .62];
  ball(capB, 0, 1.64, 0, .14, .07, .148, () => Wc); capB.box(0, 1.62, .15, .22, .015, .15, Wc, Wc, Wc, 0);
  bandB.box(0, 1.6, 0, .285, .045, .3, Wc, Wc, Wc, 0);
  ball(beanB, 0, 1.65, 0, .148, .1, .152, () => Wc); ball(beanB, 0, 1.77, 0, .04, .04, .04, () => [.7, .7, .7]);
  const hatGeos = [null, geoOf(capB), geoOf(bandB), geoOf(beanB)];
  // 유람선(지나가는 배)
  const cruiseB = new Bake();
  cruiseB.box(0, -.5, 0, 12, 4, 46, [.12, .11, .1], [.35, .33, .3], [.08, .07, .06], 0);
  cruiseB.box(0, 3.5, 0, 11, 2.8, 42, [.25, .24, .22], [.3, .29, .27], [.05, .05, .05], 0);
  cruiseB.box(0, 6.3, 0, 9, 2.6, 34, [.25, .24, .22], [.3, .29, .27], [.05, .05, .05], 0);
  const cruise = new THREE.Group(); cruise.add(cruiseB.mesh(bakedMat(false)));
  { const bp = new Pts(); for (const [y, x0, x1] of [[4.9, -21.5, 21.5], [7.6, -17.5, 17.5]]) for (let z = x0; z < x1; z += 2.6) for (const e of [-1, 1]) bp.add(e * (y > 6 ? 4.6 : 5.6), y, z, K(3600, 3), 1.2);
    bp.add(-6, 4, -21, [8, .2, .2], .8); bp.add(6, 4, -21, [.2, 8, .5], .8); bp.add(0, 10, 0, [8, 8, 7], .8); cruise.add(bp.mesh(ptMat(false))); }
  G.add(cruise);

  // ---------- 8) 장소: 자전거 대여소·오리배 선착장·유람선 선착장·편의점·분식 트럭·버스킹·돗자리 ----------
  const signs = [];
  function signTex(icon, text) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 128; const x = c.getContext("2d");
    x.fillStyle = "#0d1022"; x.fillRect(0, 0, 512, 128); x.strokeStyle = "rgba(243,217,164,.75)"; x.lineWidth = 4; x.strokeRect(4, 4, 504, 120);
    x.font = `700 60px -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#fff1d6"; x.fillText(icon + " " + text, 256, 68, 480);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t;
  }
  const signAt = (p, x, y, z, rotY, w) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: signTex(p.icon, p.sign || p.name), color: new THREE.Color(1.3, 1.3, 1.3) })); m.position.set(x, y, -z); m.rotation.y = rotY; G.add(m); signs.push(m); const m2 = m.clone(); m2.rotation.y = rotY + Math.PI; m2.position.x -= Math.cos(rotY) * .02; m2.position.z += Math.sin(rotY) * .02; G.add(m2); };
  const RACK = [], MOOR = [], KAY = [], SUPS = [], pools = [];
  for (const p of o.POI) {
    const x = p.x, z = p.z;
    if (p.k === "bike") {
      bake.box(x + 1.2, GY, z, .5, .12, 14, [.03, .03, .035], [.05, .05, .06], null, 0);
      for (let i = 0; i < 8; i++) RACK.push([x, z - 6 + i * 1.7, Math.PI / 2]);
      bake.box(x + 2.2, GY, z + 8.5, .9, 2.1, .6, [.04, .045, .05], [.06, .07, .07], null, 0); pts.add(x + 1.7, GY + 1.6, z + 8.5, K(6500, 2.5), .5);
      signAt(p, x + 2.2, GY + 2.9, z + 8.5, Math.PI / 2, 3.2); pools.push([x, z, 9, .5]);
    } else if (p.k === "duck") {
      // 떠 있는 선착장(물 위 판 + 난간 + 등)
      bake.box(x, -.2, z, 34, .8, 46, [.03, .03, .035], [.07, .065, .06], [.06, .055, .05], 0);
      bake.box(R + 1, 0, z, 14, .35, 3, [.04, .04, .04], [.06, .06, .06], null, 0);   // 둑으로 가는 다리
      for (let k = -2; k <= 2; k++) { pts.add(x - 16, 2.4, z + k * 10, K(3800, 4), .6); bake.box(x - 16, .6, z + k * 10, .12, 1.8, .12, [.03, .03, .03], [.03, .03, .03], null, 0); }
      for (let i = 0; i < 6; i++) MOOR.push([x - 22, z - 17 + i * 6.5, -Math.PI / 2]);
      signAt(p, x + 15, GY + 3.2, z, Math.PI / 2, 4.2); pools.push([x + 18, z, 10, .35]);
    } else if (p.k === "cruise") {
      bake.box(x, -.3, z, 30, 1.2, 70, [.04, .04, .045], [.08, .075, .07], [.07, .065, .06], 0);
      bake.box(x + 4, .9, z, 14, 6, 34, [.05, .05, .06], [.09, .09, .1], [.04, .04, .05], 0);
      for (let k = -15; k <= 15; k += 2.5) pts.add(x - 3, 3.5, z + k, K(3300, 3), .7);
      pts.add(x + 4, 7.5, z, K(5000, 4), 1.4);
      bake.box(R + 1, 0, z + 20, 16, .4, 3.4, [.04, .04, .04], [.06, .06, .06], null, 0);
      signAt(p, x + 4, 8.6, z, Math.PI / 2, 7);
    } else if (p.k === "store") {
      bake.box(x, GY, z, 9, 3.6, 13, [.04, .04, .045], [.05, .05, .055], [.03, .03, .035], 0);
      bake.box(x - 4.55, GY + .2, z, .05, 2.6, 11, [.9, .95, 1], [1, 1.05, 1.1], null, 0);   // 환한 유리 앞면
      signAt(p, x - 4.65, GY + 3.1, z, Math.PI / 2, 4.6); pools.push([x - 7, z, 9, 1]);
    } else if (p.k === "truck") {
      bake.box(x, GY + .5, z, 2.4, 2.6, 5.6, [.05, .04, .03], [.09, .07, .05], [.05, .05, .05], 0);
      bake.box(x - 1.25, GY + 1.5, z + .6, .05, 1.1, 3.4, [1.1, .7, .35], [1.2, .8, .4], null, 0);
      for (const e of [-2, 2]) bake.box(x, GY, z + e, 2.2, .5, .6, [.01, .01, .01], [.01, .01, .01], null, 0);
      for (let k = 0; k < 12; k++) pts.add(x - 1.5, GY + 3.25, z - 2.6 + k * .47, K(2700, 2.5), .18);
      signAt(p, x - 1.3, GY + 3.7, z, Math.PI / 2, 3); pools.push([x - 4, z, 7, .8]);
    } else if (p.k === "busk") {
      bake.box(x, GY, z, 6, .4, 8, [.04, .035, .03], [.08, .06, .05], [.07, .055, .045], 0);
      pts.add(x - 3, GY + 4, z, K(3000, 5), .8); bake.box(x + 2, GY + .4, z, .1, 1.1, .1, [.03, .03, .03], [.03, .03, .03], null, 0);
      signAt(p, x + 3.5, GY + 2.6, z, Math.PI / 2, 3.4); pools.push([x - 1, z, 6, 1]);
    } else if (p.k === "mat") {
      const MC = [[.12, .06, .06], [.05, .07, .12], [.1, .09, .04], [.05, .1, .07], [.1, .05, .1]];
      for (let i = 0; i < 9; i++) { const mx = x - 6 + (i % 3) * 6, mz = z - 8 + Math.floor(i / 3) * 7, c = MC[i % 5]; bake.box(mx, GY + .01, mz, 2.6, .03, 3, c, c, c.map(v => v * 1.3), 0); pts.add(mx + 1, GY + .5, mz + 1.2, K(2600, 1.6), .25); }
      signAt(p, x - 11, GY + 2.2, z, Math.PI / 2, 3.6); pools.push([x, z, 12, .3]);
    } else if (p.k === "kayak") {
      // 🛶 작은 물 위 선착장 + 줄 맞춘 카약·패들보드
      bake.box(x, -.2, z, 22, .7, 34, [.03, .03, .035], [.07, .065, .06], [.06, .055, .05], 0);
      bake.box(R + 1, 0, z, 14, .35, 3, [.04, .04, .04], [.06, .06, .06], null, 0);
      for (let k = -1; k <= 1; k++) { pts.add(x - 10, 2.2, z + k * 12, K(3800, 3.4), .5); bake.box(x - 10, .5, z + k * 12, .1, 1.7, .1, [.03, .03, .03], [.03, .03, .03], null, 0); }
      for (let i = 0; i < 5; i++) KAY.push([x - 14, z - 13 + i * 3.2, -Math.PI / 2]); for (let i = 0; i < 4; i++) SUPS.push([x + 2, z - 10 + i * 2.6, -Math.PI / 2]);
      signAt(p, x + 10, GY + 3, z, Math.PI / 2, 4); pools.push([x + 13, z, 9, .35]);
    } else if (p.k === "run") {
      // 🏃 러닝 출발점: 출발 아치(작은 문) + 옷걸이
      for (const e of [-2.2, 2.2]) bake.box(x, GY, z + e, .16, 2.6, .16, [.04, .04, .05], [.06, .06, .07], null, 0);
      bake.box(x, GY + 2.6, z, .2, .35, 4.6, [.05, .05, .06], [.08, .08, .09], null, 0);
      for (let k = 0; k < 9; k++) pts.add(x - .12, GY + 2.78, z - 2 + k * .5, K(6000, 2.2), .12);
      bake.box(x + 3, GY, z - 4, .06, 1.5, .06, [.03, .03, .03], [.03, .03, .03], null, 0); bake.box(x + 3, GY + 1.5, z - 4, .06, .06, 1.6, [.04, .04, .04], [.04, .04, .04], null, 0);
      [[.5, .45, .02], [.55, .12, .1], [.08, .25, .5], [.06, .4, .3]].forEach((c, k) => bake.box(x + 3, GY + .8, z - 4.6 + k * .4, .3, .62, .06, c.map(v => v * .7), c, null, 0));
      signAt(p, x + .2, GY + 3.3, z, Math.PI / 2, 3); pools.push([x, z, 7, .7]);
    } else if (p.k === "market") {
      // 🏮 야시장: 천막 가게 두 줄 + 초롱 줄
      const AW = [[.5, .08, .04], [.45, .25, .03], [.4, .08, .2], [.08, .25, .35], [.45, .1, .1], [.35, .3, .04]];
      for (let i = 0; i < 6; i++) for (const e of [-1, 1]) { const sx = x + e * 5, sz = z - 14 + i * 5.6, c = AW[(i * 2 + (e > 0)) % 6];
        bake.box(sx, GY, sz, 2.2, 1, 4, [.04, .03, .03], [.07, .05, .04], [.09, .07, .05], 0);
        bake.box(sx + e * .3, GY + 2.3, sz, 2.8, .12, 4.4, c, c, c.map(v => v * 1.4), 0);
        for (const k of [-1.9, 1.9]) bake.box(sx - e * 1, GY, sz + k, .06, 2.3, .06, [.03, .03, .03], [.03, .03, .03], null, 0);
        pts.add(sx - e * .6, GY + 1.6, sz, K(2600, 4), .6); }
      for (let k = 0; k < 36; k++) { const u = k / 35, lz = z - 16 + u * 32; pts.add(x, GY + 3.3 - Math.sin((u * 6 % 1) * Math.PI) * .4, lz, k % 3 ? [5, 1.4, .5] : [5, 3, .9], .28); }
      signAt(p, x - 3, GY + 3.6, z - 17, Math.PI / 2, 3.6); pools.push([x, z, 18, 1]);
    } else if (p.k === "deliv") {
      // 🛵 배달존: 노란 표지판 기둥 + 바닥 네모 칸
      bake.box(x, GY, z, .12, 2.4, .12, [.05, .05, .02], [.08, .08, .03], null, 0);
      bake.box(x, GY + .005, z + 3, 3.4, .01, 4.4, [.25, .2, .02], [.25, .2, .02], [.25, .2, .02], 0);
      signAt(p, x - .1, GY + 2.6, z, Math.PI / 2, 2.8); pools.push([x - 2, z + 2, 6, .6]);
    } else if (p.k === "view") {
      for (const e of [-1.5, 1.5]) bake.box(x + 2.6, GY, z + e, .08, 1.9, .08, [.02, .02, .02], [.02, .02, .02], null, 0);
      signAt(p, x + 2.6, GY + 2.4, z, Math.PI / 2, 3.6);
    }
  }
  groundMat.uniforms.uPools.value.forEach((v, i) => { const p = pools[i]; if (p) v.set(p[0], p[1], p[2], p[3]); });
  // 대여소 자전거·선착장 오리배(한 번에 그리기)
  const sOm = objMat(), oMat = objMat();
  const rackM = new THREE.InstancedMesh(bikeGeo, sOm, RACK.length), rackW = new THREE.InstancedMesh(wheelGeo, sOm, RACK.length * 2), moorM = new THREE.InstancedMesh(swanGeo, sOm, MOOR.length);
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1), Y = new THREE.Vector3(0, 1, 0);
    RACK.forEach(([x, z, a], i) => { q.setFromAxisAngle(Y, -a); m4.compose(V.set(x, GY, -z), q, S); rackM.setMatrixAt(i, m4);
      for (const [k, e] of [[0, .52], [1, -.52]]) { m4.compose(V.set(x + Math.sin(a) * e, GY + .33, -(z + Math.cos(a) * e)), q, S); rackW.setMatrixAt(i * 2 + k, m4); } });
    MOOR.forEach(([x, z, a], i) => { q.setFromAxisAngle(Y, -a); m4.compose(V.set(x, 0, -z), q, S); moorM.setMatrixAt(i, m4); }); }
  for (const m of [rackM, rackW, moorM]) { m.frustumCulled = false; G.add(m); }
  { const kM = new THREE.InstancedMesh(kayakGeo, sOm, Math.max(1, KAY.length)), sM = new THREE.InstancedMesh(supGeo, sOm, Math.max(1, SUPS.length)), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1), Y = new THREE.Vector3(0, 1, 0);
    KAY.forEach(([x, z, a], i) => { q.setFromAxisAngle(Y, -a); m4.compose(V.set(x, 0, -z), q, S); kM.setMatrixAt(i, m4); }); kM.count = KAY.length;
    SUPS.forEach(([x, z, a], i) => { q.setFromAxisAngle(Y, -a); m4.compose(V.set(x, .3, -z), q, S); sM.setMatrixAt(i, m4); }); sM.count = SUPS.length;
    for (const m of [kM, sM]) { m.frustumCulled = false; G.add(m); } }

  // ---------- 9) 물(진짜 반사면) ----------
  const water = makeWater(new THREE.PlaneGeometry(2 * R + 6, ZB - ZA), phone ? 512 : 1024, .3, 1.8);   // 물결 일렁임을 작게(어지럽지 않게)
  water.position.set(0, 0, -(ZA + ZB) / 2); G.add(water);
  G.add(bake.mesh(bakedMat(false)), bl.mesh(bldMat(false)), pts.mesh(ptMat(false)));

  // ---------- 10) 나 + 다른 사람 ----------
  const meMat = objMat();
  const me = { g: new THREE.Group(), body: new THREE.Mesh(personGeo, meMat), head: new THREE.Mesh(headGeo, meMat), bike: new THREE.Group(), swan: new THREE.Mesh(swanGeo, meMat), w1: new THREE.Mesh(wheelGeo, meMat), w2: new THREE.Mesh(wheelGeo, meMat) };
  me.bike.add(new THREE.Mesh(bikeGeo, meMat), me.w1, me.w2); me.w1.position.set(0, .33, -.52); me.w2.position.set(0, .33, .52);
  me.rider = new THREE.Group(); me.rider.add(me.body, me.head);
  me.kayak = new THREE.Mesh(kayakGeo, meMat); me.sup = new THREE.Mesh(supGeo, meMat); me.pad = new THREE.Mesh(padGeo, meMat); me.supPad = new THREE.Mesh(supPadGeo, meMat);
  me.g.add(me.rider, me.bike, me.swan, me.kayak, me.sup, me.pad, me.supPad); G.add(me.g);
  const hatMat = objMat(); me.hats = hatGeos.map(g => { if (!g) return null; const m = new THREE.Mesh(g, hatMat); m.visible = false; me.rider.add(m); return m; });
  meMat.uniforms.uK.value = 1;
  // 내 몸 색(옷): 몸에만 색 재질을 하나 더
  const bodyMat = objMat(); me.body.material = bodyMat;
  const MAXO = 40;
  const oBody = new THREE.InstancedMesh(personGeo, oMat, MAXO), oHead = new THREE.InstancedMesh(headGeo, objMat(), MAXO), oBike = new THREE.InstancedMesh(bikeGeo, objMat(), MAXO), oSwan = new THREE.InstancedMesh(swanGeo, objMat(), MAXO), oKay = new THREE.InstancedMesh(kayakGeo, objMat(), MAXO), oSup = new THREE.InstancedMesh(supGeo, objMat(), MAXO);
  oBody.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXO * 3).fill(1), 3);
  for (const m of [oBody, oHead, oBike, oSwan, oKay, oSup]) { m.count = 0; m.frustumCulled = false; G.add(m); }
  // 물결(오리배·유람선 뒤 흰 물살)
  const WK = 220, wkPos = new Float32Array(WK * 3), wkCol = new Float32Array(WK * 3), wkSize = new Float32Array(WK);
  const wkGeo = new THREE.BufferGeometry(); wkGeo.setAttribute("position", new THREE.BufferAttribute(wkPos, 3)); wkGeo.setAttribute("aCol", new THREE.BufferAttribute(wkCol, 3)); wkGeo.setAttribute("aSize", new THREE.BufferAttribute(wkSize, 1));
  wkGeo.setAttribute("aMove", new THREE.BufferAttribute(new Float32Array(WK * 4), 4)); wkGeo.setAttribute("aAnim", new THREE.BufferAttribute(new Float32Array(WK * 4), 4));
  const wkPts = new THREE.Points(wkGeo, ptMat(false, { uMinPx: { value: 1 } })); wkPts.frustumCulled = false; G.add(wkPts);
  const wake = []; let wkI = 0;
  // 불꽃(응원 폭죽이 오면 강 위로)
  const FWN = 1600, fwPos = new Float32Array(FWN * 3), fwCol = new Float32Array(FWN * 3), fwSize = new Float32Array(FWN);
  const fwGeo = new THREE.BufferGeometry(); fwGeo.setAttribute("position", new THREE.BufferAttribute(fwPos, 3)); fwGeo.setAttribute("aCol", new THREE.BufferAttribute(fwCol, 3)); fwGeo.setAttribute("aSize", new THREE.BufferAttribute(fwSize, 1));
  fwGeo.setAttribute("aMove", new THREE.BufferAttribute(new Float32Array(FWN * 4), 4)); fwGeo.setAttribute("aAnim", new THREE.BufferAttribute(new Float32Array(FWN * 4), 4));
  const fwPts = new THREE.Points(fwGeo, ptMat(false, { uMinPx: { value: 1.8 } })); fwPts.frustumCulled = false; G.add(fwPts);
  const FWC = [[1, .35, .45], [1, .75, .35], [.45, .75, 1], [.55, 1, .65], [.85, .5, 1], [1, 1, 1]];
  const fws = [];
  function fwLaunch(gold, z0) { const rr = Math.random, x = -60 + (rr() - .5) * 200, z = z0 + 150 + rr() * 400, h = 120 + rr() * 120, c = gold ? [1, .78, .35] : FWC[rr() * FWC.length | 0], N = 90, sp = [];
    for (let i = 0; i < N; i++) { const a = rr() * TAU, b = Math.acos(rr() * 2 - 1), v = 26 + rr() * 10; sp.push([Math.sin(b) * Math.cos(a) * v, Math.cos(b) * v, Math.sin(b) * Math.sin(a) * v]); }
    fws.push({ x, y: h, z, c, sp, t: -1.2 - rr() * .4 }); }
  function fwStep(dt) {
    let n = 0;
    for (let i = fws.length - 1; i >= 0; i--) { const f = fws[i]; f.t += dt; if (f.t > 3.2) { fws.splice(i, 1); continue; }
      if (f.t < 0) { if (n < FWN) { const u = 1 + f.t / 1.4; fwPos.set([f.x, f.y * Math.max(0, u), -f.z], n * 3); fwCol.set(f.c.map(v => v * 3), n * 3); fwSize[n] = 1.4; n++; } continue; }
      const k = f.t, fade = Math.max(0, 1 - k / 3.2);
      for (const s of f.sp) { if (n >= FWN) break; const e = 1 - Math.exp(-k * 1.6); fwPos.set([f.x + s[0] * e, f.y + s[1] * e - 4.9 * k * k * .6, -(f.z + s[2] * e)], n * 3); fwCol.set(f.c.map(v => v * 6 * fade * fade), n * 3); fwSize[n] = 1.6; n++; } }
    for (let i = n; i < FWN; i++) fwSize[i] = 0;
    fwGeo.attributes.position.needsUpdate = fwGeo.attributes.aCol.needsUpdate = fwGeo.attributes.aSize.needsUpdate = true; fwGeo.setDrawRange(0, n);
  }
  // 손: 자전거 손잡이를 잡은 두 손(1인칭에서만)
  const handB = new Bake(); for (const e of [-1, 1]) { ball(handB, e * .27, 1.05, .38, .045, .04, .06, () => [.3, .21, .16]); handB.box(e * .25, 1.03, .25, .07, .07, .24, [.2, .2, .22], [.25, .25, .27], null, 0); }
  const hands = new THREE.Mesh(geoOf(handB), meMat); me.bike.add(hands);

  // ---------- 그리기 ----------
  const hf = renderer.extensions.has("EXT_color_buffer_float") || renderer.extensions.has("EXT_color_buffer_half_float");
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: hf ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: hf && !phone ? 2 : 0 }));
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .8, .5, .9); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let W = 0, H = 0, DPRv = 1;
  function resize(w, h, dpr) {
    if (w === W && h === H && dpr === DPRv) return; W = w; H = h; DPRv = dpr;
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); composer.setPixelRatio(dpr); composer.setSize(w, h);
    bloom.resolution.set(w * dpr / 2, h * dpr / 2);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const tmpV = new THREE.Vector3();
  let skyAt = 0;
  function updSky(now) {
    if (now - skyAt < 1000 && skyAt) return; skyAt = now;
    const lst = lstDeg(now) * RAD; U.uLst.value = lst;
    const m = moonEq(now), s = sunEq(now), me2 = eqToEnu(m.ra, m.dec, lst), se = eqToEnu(s.ra, s.dec, lst);
    const toW = v => tmpV.set(v[0], v[1], v[2]).applyMatrix3(U.uEnu2W.value).normalize();
    U.uMoonDir.value.copy(toW(me2)); moonMat.uniforms.uSunDir.value.copy(toW(se));
    const cosE = clamp(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra), -1, 1), illum = (1 - cosE) / 2;
    U.uMoonUp.value = me2[2] > -.02 ? illum * clamp(me2[2] * 6 + .2, 0, 1) : 0;
    moon.visible = me2[2] > -.03;
    water.material.uniforms.sunDirection.value.copy(U.uMoonDir.value); water.material.uniforms.sunColor.value.setRGB(1, .95, .85).multiplyScalar(U.uMoonUp.value * (U.uMoonDir.value.y > 0 ? .9 : 0));
  }
  const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), VV = new THREE.Vector3(), SS = new THREE.Vector3(1, 1, 1), YA = new THREE.Vector3(0, 1, 0), col3 = new THREE.Color();
  let lastT = 0, meColKey = "";
  function render(st, g2d) {
    const now = Date.now(), t = st.t; U.uTime.value = t;
    const dt = Math.min(.1, Math.max(0, t - lastT)); lastT = t;
    updSky(now);
    U.uWind.value.set(t * .004, t * .0015);
    U.uStarK.value = st.skyUp ? 1.45 : 1.1;
    resize(st.W, st.H, st.dpr);
    camera.fov = st.fov || 62; camera.updateProjectionMatrix();
    camera.position.set(st.cx, st.cy, -st.cz);
    camera.rotation.set(st.pitch, -st.yaw, st.roll || 0);
    camera.updateMatrixWorld();
    U.uPx.value = st.H / 2 / Math.tan(camera.fov * RAD / 2) * st.dpr; U.uDpr.value = st.dpr;
    far.position.set(st.cx, 0, -st.cz);
    water.material.uniforms.time.value = t * .22;
    fMat.uniforms.uOn.value = st.fountainOn ? 1 : 0;
    // 나
    const M = st.me;
    me.g.position.set(M.x, M.m === 2 || M.m === 4 || M.m === 5 ? M.bob || 0 : GY, -M.z); me.g.rotation.set(0, -M.a, 0);
    me.bike.visible = M.m === 1; me.swan.visible = M.m === 2; hands.visible = M.m === 1 && st.fp;
    me.kayak.visible = M.m === 4; me.sup.visible = M.m === 5; me.pad.visible = M.m === 4; me.supPad.visible = M.m === 5;
    me.hats.forEach((h, i) => { if (h) h.visible = M.m === 3 && M.hat === i; }); if (M.m === 3 && M.hatCol && hatMat.userData.k !== M.hatCol) { hatMat.userData.k = M.hatCol; col3.set(M.hatCol); col3.convertSRGBToLinear(); hatMat.uniforms.uTint.value.copy(col3); }
    me.rider.visible = !st.fp; me.rider.rotation.z = 0;
    if (M.m === 1) { me.g.rotation.z = -(M.lean || 0); me.rider.position.set(0, .42, -.12); me.rider.rotation.x = .18; me.w1.rotation.x = me.w2.rotation.x = -(M.dist || 0) / .33; }
    else if (M.m === 2) { me.rider.position.set(0, -.25, -.55); me.rider.rotation.x = 0; me.g.rotation.z = Math.sin(t * 1.3) * .015; }
    else if (M.m === 4) { me.rider.position.set(0, -.55, -.1); me.rider.rotation.x = 0; me.g.rotation.z = Math.sin(t * 1.3) * .02; const ph = M.padPh || 0; me.pad.position.set(0, .62, .25); me.pad.rotation.set(0, Math.sin(ph) * .5, Math.sin(ph) * .45); }
    else if (M.m === 5) { me.rider.position.set(0, .12, -.2); me.rider.rotation.x = .05; me.g.rotation.z = Math.sin(t * 1.1) * .025; const ph = M.padPh || 0, sd = Math.sin(ph * .5) > 0 ? 1 : -1; me.supPad.position.set(sd * .38, .1 + Math.max(0, Math.sin(ph)) * .15, -.1 + Math.cos(ph) * .45); me.supPad.rotation.set(-.2 + Math.cos(ph) * .35, 0, sd * .1); }
    else if (M.m === 3) { me.rider.position.set(0, Math.abs(Math.sin((M.walkPh || 0) * 2)) * .11, 0); me.rider.rotation.x = .14; me.g.rotation.z = 0; }
    else { me.rider.position.set(0, Math.abs(Math.sin((M.walkPh || 0) * 2)) * .05, 0); me.rider.rotation.x = 0; me.g.rotation.z = 0; }
    if (meColKey !== st.meCol) { meColKey = st.meCol; col3.set(st.meCol || "#8a8fa0"); col3.convertSRGBToLinear(); bodyMat.uniforms.uTint.value.copy(col3); }
    meMat.uniforms.uK.value = bodyMat.uniforms.uK.value = st.lit || 1;
    // 다른 사람
    const os = st.others || []; let nb = 0, nk = 0, nd = 0, nka = 0, ns = 0;
    for (const p of os) {
      if (nb >= MAXO) break;
      const water = p.m === 2 || p.m === 4 || p.m === 5, base = water ? Math.sin(t * 1.3 + p.x) * .03 : GY;
      qq.setFromAxisAngle(YA, -p.a);
      if (p.m === 1) { m4.compose(VV.set(p.x, GY, -p.z), qq, SS); oBike.setMatrixAt(nk++, m4); }
      if (p.m === 2) { m4.compose(VV.set(p.x, base, -p.z), qq, SS); oSwan.setMatrixAt(nd++, m4); }
      if (p.m === 4) { m4.compose(VV.set(p.x, base, -p.z), qq, SS); oKay.setMatrixAt(nka++, m4); }
      if (p.m === 5) { m4.compose(VV.set(p.x, base, -p.z), qq, SS); oSup.setMatrixAt(ns++, m4); }
      const oy = p.m === 1 ? .42 : p.m === 2 ? -.25 : p.m === 4 ? -.55 : p.m === 5 ? .12 : 0, oz = p.m === 1 ? -.12 : p.m === 2 ? -.55 : p.m === 4 ? -.1 : p.m === 5 ? -.2 : 0;
      m4.compose(VV.set(p.x + Math.sin(p.a) * oz, base + oy + (p.m === 0 || p.m === 3 ? Math.abs(Math.sin(t * (p.m === 3 ? 6 : 4) + p.x)) * (p.mv ? (p.m === 3 ? .1 : .05) : 0) : 0), -(p.z + Math.cos(p.a) * oz)), qq, SS);
      oBody.setMatrixAt(nb, m4); oHead.setMatrixAt(nb, m4); col3.set(p.col || "#888"); col3.convertSRGBToLinear(); oBody.setColorAt(nb, col3); nb++;
    }
    oBody.count = oHead.count = nb; oBike.count = nk; oSwan.count = nd; oKay.count = nka; oSup.count = ns;
    for (const m of [oBody, oHead, oBike, oSwan, oKay, oSup]) { m.instanceMatrix.needsUpdate = true; } if (oBody.instanceColor) oBody.instanceColor.needsUpdate = true;
    // 유람선
    if (st.boat) { cruise.position.set(st.boat.x, 0, -st.boat.z); cruise.rotation.y = -st.boat.a; }
    // 물살
    if (st.wakeAt) for (const w of st.wakeAt) { wake[wkI] = { x: w[0], z: w[1], t: 0, s: w[2] || 1 }; wkI = (wkI + 1) % WK; }
    for (let i = 0; i < WK; i++) { const w = wake[i]; if (!w) { wkSize[i] = 0; continue; } w.t += dt; const k = w.t / 3.5; if (k > 1) { wake[i] = null; wkSize[i] = 0; continue; }
      wkPos[i * 3] = w.x; wkPos[i * 3 + 1] = .08; wkPos[i * 3 + 2] = -w.z; const a = (1 - k) * .5 * w.s; wkCol[i * 3] = a; wkCol[i * 3 + 1] = a; wkCol[i * 3 + 2] = a * 1.1; wkSize[i] = (.25 + k * .9) * w.s; }
    wkGeo.attributes.position.needsUpdate = wkGeo.attributes.aCol.needsUpdate = wkGeo.attributes.aSize.needsUpdate = true;
    // 자전거 앞불(바닥에)
    groundMat.uniforms.uHeadOn.value = M.m === 1 ? 1 : 0;
    groundMat.uniforms.uHead.value.set(M.x, M.z, Math.sin(M.a), Math.cos(M.a));
    if (st.fwNew) for (const g of st.fwNew) fwLaunch(g, st.cz);
    fwStep(dt);
    if (st.low) renderer.render(scene, camera); else composer.render();
    // 2D 위: 장소 이름표(거리), 다른 사람 이름
    const hits = [];
    const proj = (x, y, z) => { tmpV.set(x, y, -z).project(camera); if (tmpV.z > 1 || tmpV.z < -1) return null; return [(tmpV.x + 1) / 2 * st.W, (1 - tmpV.y) / 2 * st.H]; };
    if (g2d) {
      g2d.textAlign = "center"; g2d.textBaseline = "bottom";
      for (const p of o.POI) {
        const d = Math.hypot(p.x - st.cx, p.z - st.cz), maxD = p.far || 420; if (d > maxD) continue;
        const pp = proj(p.x, (p.ly || GY + 4.2), p.z); if (!pp || pp[0] < -40 || pp[0] > st.W + 40 || pp[1] < 30 || pp[1] > st.H - 40) continue;
        const a = clamp((maxD - d) / 80, 0, 1) * (d < 6 ? .5 : 1); if (a <= .02) continue;
        g2d.globalAlpha = a; const txt = `${p.icon} ${p.name}`, sub = d < 1000 ? `${Math.round(d)}m` : `${(d / 1000).toFixed(1)}km`;
        g2d.font = "700 13px -apple-system, sans-serif"; const tw = Math.max(g2d.measureText(txt).width, 40) + 22, bx = pp[0] - tw / 2, by = pp[1] - 40;
        g2d.fillStyle = "rgba(14,17,40,.66)"; g2d.beginPath(); g2d.roundRect ? g2d.roundRect(bx, by, tw, 34, 12) : g2d.rect(bx, by, tw, 34); g2d.fill();
        g2d.strokeStyle = "rgba(243,217,164,.45)"; g2d.lineWidth = 1; g2d.stroke();
        g2d.fillStyle = "#fff1d6"; g2d.fillText(txt, pp[0], by + 18); g2d.font = "600 10.5px -apple-system, sans-serif"; g2d.fillStyle = "#cfc6e0"; g2d.fillText(sub, pp[0], by + 31);
        g2d.beginPath(); g2d.moveTo(pp[0], by + 34); g2d.lineTo(pp[0], pp[1]); g2d.strokeStyle = "rgba(255,255,255,.25)"; g2d.stroke();
        hits.push({ id: p.id, x: bx, y: by, w: tw, h: 34 });
      }
      g2d.globalAlpha = 1; g2d.font = "600 12px sans-serif";
      for (const p of os) { const d = Math.hypot(p.x - st.cx, p.z - st.cz); if (d > 140) continue; const pp = proj(p.x, (p.m === 2 ? 2.4 : p.m === 4 ? 1.4 : p.m === 5 ? 2.2 : GY + 2.2), p.z); if (!pp) continue; g2d.globalAlpha = clamp((140 - d) / 40, 0, 1); g2d.fillStyle = "rgba(255,240,220,.9)"; g2d.fillText(p.nick, pp[0], pp[1]); }
      g2d.globalAlpha = 1;
    }
    return hits;
  }
  return { canvas, render, PIERS, TREES, dispose() { renderer.dispose(); } };
}
