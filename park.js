// 🗺 한강 오픈월드 — 01(index.html)과 02(3d.html)가 같이 쓰는 파일. 그림은 parkgl.js(three.js, WebGL2)
// 여의도에서 반포까지 약 7.8km가 끊김 없이 이어진 한강공원. 장면을 넘기지 않고 걸어서·자전거로·오리배로 그대로 이동한다.
// 🚶 걷기(3인칭) · 🚲 자전거(1인칭, 페달·브레이크·핸들, 🤖 자동이면 자전거 길을 따라 달리고 🌌 하늘만 보며 갈 수 있다)
// 🦆 오리배(1인칭, 직접 젓기·🤖 자동 한 바퀴) · 🚢 유람선·🏙 63빌딩·🏪 편의점·🚚 분식 트럭·🎸 버스킹은 그 자리에 가면 바로 들어간다
// 01·02 모두 같은 한강: 지금 오픈월드에 있는 사람이 이름과 함께 보인다(서버는 위치를 메모리에만, 0.8초마다)
(function () {
  "use strict";
  const H = window.HNPark = { isOpen: false };
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const hash = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
  const kstDay = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const angD = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

  // 🔇 소리 끄기: 페이지에서 재생되는 모든 소리(라디오·버스킹·배경 소리·잠들기)를 기억했다가 한꺼번에 음소거
  const MEDIA = new Set();
  { const op = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { MEDIA.add(this); if (H.muted) this.muted = true; return op.apply(this, arguments); }; }
  H.muted = false;
  function setMute(on) { H.muted = on; for (const el of MEDIA) { if (on) { if (el.__pkm == null) el.__pkm = el.muted; el.muted = true; } else if (el.__pkm != null) { el.muted = el.__pkm; el.__pkm = null; } } const b = document.getElementById("pMute"); if (b) b.textContent = on ? "🔇" : "🔊"; }
  let cfg = { send() {}, me: () => null, nick: () => "", toast() {}, openSup: null, onClose: null };
  H.init = o => Object.assign(cfg, o);

  // ---------- 세상(유람선과 같은 펴진 물길 좌표: x 강 가로(+ 남쪽), z 강 따라 동쪽, 물 0 · 공원 7m) ----------
  const R = 250, Z0 = -900, Z1 = 6900, GY = 7, PATH = R + 43;
  const BRIDGES = [
    { z: -640, name: "서강대교", type: "arch2", col: "255,120,120", lamp: "255,220,200" },
    { z: 900, name: "마포대교", type: "plain", col: "150,200,255", lamp: "235,240,255" },
    { z: 2050, name: "원효대교", type: "plain", col: "255,170,110", lamp: "255,205,140" },
    { z: 3050, name: "한강철교", type: "truss", col: "120,170,230", lamp: "200,215,255" },
    { z: 3700, name: "한강대교", type: "arch", col: "255,200,120", lamp: "255,215,150" },
    { z: 4950, name: "동작대교", type: "arch2", col: "170,150,255", lamp: "220,210,255" },
    { z: 6300, name: "반포대교", type: "fountain", col: "120,220,255", lamp: "235,240,255" },
    { z: 7750, name: "한남대교", type: "plain", col: "140,255,210", lamp: "235,245,255" },
  ];
  const ISLES = [{ k: "bam", x: -20, z: -560, rx: 80, rz: 220 }, { k: "nodeul", x: 0, z: 3700, rx: 85, rz: 300 }];
  const SEBIT = [{ x: R - 55, z: 6080, rx: 22, rz: 30, h: 14 }, { x: R - 62, z: 6150, rx: 16, rz: 20, h: 11 }, { x: R - 50, z: 6205, rx: 12, rz: 14, h: 8 }];
  const NAMSAN = { x: -2600, z: 5300 };
  // 장소: k 종류, (x, z) 그림 자리, (ex, ez) 들어가는 자리(땅 위), clear = 나무를 비울 반경
  const POI = [
    { id: "mat", k: "mat", icon: "🧺", name: "우리 돗자리", x: R + 28, z: 180, clear: 6 },
    { id: "bike1", k: "bike", icon: "🚲", name: "자전거 대여소", sign: "자전거", x: PATH + 9, z: 120 },
    { id: "run", k: "run", icon: "🏃", name: "러닝 출발점 · 옷 갈아입기", sign: "러닝", x: R + 20, z: 245 },
    { id: "deliv", k: "deliv", icon: "🛵", name: "배달존", sign: "배달존", x: R + 60, z: 150 },
    { id: "cruise", k: "cruise", icon: "🚢", name: "유람선 선착장", sign: "여의도 선착장", x: R - 20, z: -40, ex: R + 10, ez: -20 },
    { id: "store", k: "store", icon: "🏪", name: "편의점", x: R + 70, z: 300, clear: 4 },
    { id: "truck", k: "truck", icon: "🚚", name: "분식 트럭", x: R + 30, z: 360 },
    { id: "duck1", k: "duck", icon: "🦆", name: "오리배 선착장", sign: "오리배", x: R - 24, z: 470, ex: R + 10, ez: 470, loop: [R - 95, 560, 40, 260] },
    { id: "busk", k: "busk", icon: "🎸", name: "버스킹 존", sign: "버스킹", x: R + 30, z: 600 },
    { id: "kayak", k: "kayak", icon: "🛶", name: "카약·패들보드 선착장", sign: "카약·SUP", x: R - 18, z: 1350, ex: R + 10, ez: 1350, loop: [R - 85, 1450, 38, 190] },
    { id: "sky63", k: "tower", icon: "🏙", name: "63빌딩 전망대", x: R + 290, z: 300, ly: 262, far: 4000 },
    { id: "bike2", k: "bike", icon: "🚲", name: "자전거 대여소 · 노량진", sign: "자전거", x: PATH + 9, z: 2600 },
    { id: "nodeul", k: "view", icon: "🏝", name: "노들섬이 보이는 곳", sign: "노들섬 전망", x: R + 12, z: 3560, far: 900 },
    { id: "bike3", k: "bike", icon: "🚲", name: "자전거 대여소 · 동작", sign: "자전거", x: PATH + 9, z: 4800 },
    { id: "bike4", k: "bike", icon: "🚲", name: "자전거 대여소 · 반포", sign: "자전거", x: PATH + 9, z: 5760 },
    { id: "duck2", k: "duck", icon: "🦆", name: "반포 오리배 선착장", sign: "오리배", x: R - 24, z: 5880, ex: R + 10, ez: 5880, loop: [R - 130, 5750, 45, 300] },
    { id: "market", k: "market", icon: "🏮", name: "밤도깨비 야시장", sign: "야시장", x: R + 62, z: 5560 },
    { id: "fount", k: "view", icon: "🌈", name: "반포 무지개분수 · 세빛섬", sign: "무지개분수", x: R + 12, z: 6020, far: 1500 },
  ];
  H.WORLD = { R, Z0, Z1, GY, PATH, BRIDGES, ISLES, SEBIT, NAMSAN, POI, areaAt: z => areaAt(z) };
  POI.forEach(p => { if (p.ex == null) { p.ex = p.k === "bike" ? PATH + 4 : p.k === "tower" ? R + 99 : p.x - (p.k === "store" ? 7 : p.k === "truck" ? 3 : p.k === "busk" ? 4 : p.k === "mat" ? 6 : -3); p.ez = p.k === "tower" ? 300 : p.z; } });
  const AREAS = [[-900, "서강대교 · 밤섬"], [-300, "여의도 한강공원"], [1500, "여의도 · 원효대교"], [2400, "노량진 · 한강철교"], [3400, "노들섬 · 한강대교"], [4100, "흑석 · 동작대교"], [5400, "반포 한강공원"], [6450, "반포 · 서래섬 쪽"]];
  const areaAt = z => { let n = AREAS[0][1]; for (const [zz, nm] of AREAS) if (z >= zz) n = nm; return n; };

  // ---------- 화면 ----------
  const css = `
  #park { position: fixed; inset: 0; z-index: 50; background: #04050d; display: none; touch-action: none; user-select: none; -webkit-user-select: none; font-family: -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; color: #f3ecdf; overflow: hidden; }
  #park.on { display: block; } #park canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  body.parkOn #stWrap, body.parkOn #tkWrap, body.parkOn #dvWrap, body.parkOn #mkWrap, body.parkOn #bkWrap, body.parkOn #supBox, body.parkOn #toast { z-index: 60 !important; }
  .pGl { background: rgba(14,17,40,.62); border: 1px solid rgba(255,255,255,.13); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
  #pTop { position: absolute; left: 12px; right: 12px; top: max(12px, env(safe-area-inset-top)); display: flex; gap: 8px; align-items: flex-start; pointer-events: none; }
  #pTitle { padding: 8px 14px 9px; border-radius: 18px; min-width: 0; flex: 1 1 auto; max-width: 360px; pointer-events: auto; cursor: pointer; }
  #pTitle b { display: block; font-size: 14.5px; font-weight: 700; letter-spacing: -.2px; } #pTitle span { display: block; font-size: 12px; color: #cfc6e0; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  #pRoute { position: relative; height: 4px; border-radius: 2px; background: rgba(255,255,255,.14); margin-top: 8px; } #pRoute i { position: absolute; top: -2px; width: 2px; height: 8px; background: rgba(255,255,255,.35); border-radius: 1px; }
  #pRoute u { position: absolute; top: -1px; width: 6px; height: 6px; margin-left: -3px; border-radius: 50%; background: #9fd0ff; opacity: .8; } #pRoute em { position: absolute; top: -4px; width: 12px; height: 12px; margin-left: -6px; border-radius: 50%; background: #f3d9a4; box-shadow: 0 0 10px #f3d9a4; }
  #pMute { all: unset; pointer-events: auto; cursor: pointer; flex: none; padding: 8px 11px; border-radius: 18px; font-size: 16px; }
  #pClose { all: unset; pointer-events: auto; cursor: pointer; flex: none; padding: 9px 14px; border-radius: 18px; font-size: 13.5px; font-weight: 600; }
  #pCap { position: absolute; left: 0; right: 0; top: 28%; text-align: center; pointer-events: none; opacity: 0; transition: opacity 1.6s ease; text-shadow: 0 2px 18px rgba(0,0,0,.7); } #pCap.on { opacity: 1; }
  #pCap b { display: block; font-size: clamp(26px, 7vw, 40px); font-weight: 300; letter-spacing: 6px; color: #fff6e6; } #pCap span { display: block; margin-top: 8px; font-size: 13.5px; letter-spacing: 1px; color: #e3d9f0; padding: 0 20px; }
  #pHint { position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(max(14px, env(safe-area-inset-bottom)) + 84px); font-size: 12.5px; color: #e6def3; padding: 6px 14px; border-radius: 999px; opacity: 0; transition: opacity .8s; pointer-events: none; white-space: nowrap; max-width: calc(100vw - 30px); overflow: hidden; text-overflow: ellipsis; } #pHint.on { opacity: 1; }
  #pBar { position: absolute; left: 50%; transform: translateX(-50%); bottom: max(14px, env(safe-area-inset-bottom)); display: flex; gap: 2px; padding: 6px 8px; border-radius: 24px; max-width: calc(100vw - 20px); }
  #pBar button { all: unset; cursor: pointer; width: min(58px, calc((100vw - 52px) / 5)); height: 54px; display: grid; place-items: center; align-content: center; gap: 3px; border-radius: 16px; font-size: 22px; line-height: 1; text-align: center; }
  #pBar button span { font-size: 11px; color: #d9d1e6; white-space: nowrap; } #pBar button:active { transform: scale(.92); background: rgba(255,255,255,.08); }
  #pBar button.sel { background: rgba(243,217,164,.18); } #pBar button.dim { opacity: .45; }
  #pJoy { position: absolute; left: 18px; bottom: calc(max(14px, env(safe-area-inset-bottom)) + 84px); width: 112px; height: 112px; border-radius: 50%; touch-action: none; }
  #pJoy i { position: absolute; left: 50%; top: 50%; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; background: rgba(243,217,164,.85); box-shadow: 0 0 14px rgba(243,217,164,.4); }
  #pJoy span { position: absolute; left: -10px; right: -10px; top: -20px; text-align: center; font-size: 11.5px; color: #d9d1e6; white-space: nowrap; }
  #pAct { position: absolute; right: 16px; bottom: calc(max(14px, env(safe-area-inset-bottom)) + 92px); display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
  #pAct button { all: unset; cursor: pointer; padding: 12px 16px; border-radius: 20px; font-size: 15px; font-weight: 700; color: #3b2808; background: linear-gradient(180deg, #f6d68e, #e2b35c); box-shadow: 0 6px 20px rgba(0,0,0,.35); display: none; }
  #pAct button.on { display: block; } #pAct button.soft { background: rgba(14,17,40,.7); color: #f3ecdf; border: 1px solid rgba(255,255,255,.18); font-weight: 600; font-size: 14px; }
  #pAct button:active { transform: scale(.94); }
  #pSpd { position: absolute; right: 18px; top: calc(max(12px, env(safe-area-inset-top)) + 64px); padding: 6px 12px; border-radius: 14px; font-size: 13px; font-weight: 700; display: none; text-align: right; } #pSpd small { display: block; font-size: 10.5px; font-weight: 500; color: #cfc6e0; }
  #pBox { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(350px, calc(100vw - 32px)); max-height: calc(100vh - 120px); overflow: auto; padding: 18px 18px 14px; border-radius: 22px; display: none; background: rgba(16,19,44,.95); font-size: 13.5px; line-height: 1.55; color: #e9e2f3; }
  #pBox.on { display: block; } #pBox h3 { margin: 0 0 8px; font-size: 16.5px; color: #fff3dc; } #pBox p { margin: 6px 0; } #pBox small { color: #a9a1bd; font-size: 12px; display: block; }
  #pBox .x { all: unset; position: absolute; right: 10px; top: 8px; cursor: pointer; font-size: 18px; padding: 6px 10px; color: #bbb3cc; }
  #pBox .pl { all: unset; cursor: pointer; display: block; box-sizing: border-box; width: 100%; text-align: left; padding: 10px 14px; margin-top: 7px; border-radius: 14px; background: rgba(255,255,255,.08); } #pBox .pl b { display: block; font-size: 14.5px; color: #fff3dc; } #pBox .pl:active { transform: scale(.98); }
  #pMapCv { width: 100%; height: 76px; display: block; margin: 6px 0 2px; border-radius: 12px; background: rgba(0,0,0,.25); position: static !important; }
  #pFade { position: absolute; inset: 0; background: #04050d; opacity: 0; pointer-events: none; transition: opacity .35s; } #pFade.on { opacity: 1; }
  #pLoad { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; font-size: 14px; color: #d9d1e6; pointer-events: none; } #pLoad b { display: block; font-size: 20px; font-weight: 300; letter-spacing: 4px; color: #fff3dc; margin-bottom: 8px; }
  @media (orientation: landscape) and (max-height: 520px) { #pJoy { bottom: 18px; } #pAct { bottom: 84px; } #pHint { bottom: 76px; } }`;

  let root, glCv, cv, g, box, W = 0, H2 = 0, DPR = 1, raf = 0, last = 0, built = false, GL = null, glState = 0, low = false, dprCap = 1.75;
  const q = id => document.getElementById(id);
  function build() {
    if (built) return; built = true;
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    root = document.createElement("div"); root.id = "park";
    root.innerHTML = `<canvas id="pCv"></canvas><div id="pLoad"><div><b>한강으로 가는 중</b>여의도에서 반포까지 이어진 길을 그리고 있어요</div></div>
      <div id="pTop"><div id="pTitle" class="pGl"><b id="pName">🗺 한강 오픈월드</b><span id="pSub">여의도 한강공원</span><div id="pRoute"></div></div><button id="pMute" class="pGl" aria-label="소리">🔊</button><button id="pClose" class="pGl">✕ 돌아가기</button></div>
      <div id="pSpd" class="pGl"></div><div id="pCap"><b></b><span></span></div><div id="pHint" class="pGl"></div>
      <div id="pJoy" class="pGl"><span>움직이기</span><i></i></div>
      <div id="pAct"><button id="pBell" class="soft">🔔 따릉</button><button id="pAct2" class="soft"></button><button id="pAct1"></button></div>
      <div id="pBar" class="pGl">
        <button id="pAuto">🤖<span>자동</span></button><button id="pSky">🌌<span>하늘 보기</span></button><button id="pView">👀<span>시점</span></button><button id="pMap">🗺<span>지도</span></button><button id="pSup">💛<span>응원</span></button>
      </div><div id="pBox"></div><div id="pFade"></div>`;
    document.body.appendChild(root);
    cv = q("pCv"); g = cv.getContext("2d"); box = q("pBox");
    q("pRoute").innerHTML = BRIDGES.filter(b => b.z > Z0 && b.z < Z1).map(b => `<i style="left:${(b.z - Z0) / (Z1 - Z0) * 100}%"></i>`).join("") + "<em></em>";
    q("pClose").onclick = () => H.close();
    q("pTitle").onclick = openMap; q("pMap").onclick = openMap;
    q("pAuto").onclick = () => { if (!S.m) return hint("🚲 자전거·🦆 오리배·🛶 카약을 타거나 🏃 달리면 자동으로 갈 수 있어요"); S.auto = !S.auto; if (S.auto) { S.autoDir = Math.cos(S.a) >= 0 ? 1 : -1; S.goal = null; } syncBar(); hint(S.auto ? (S.m === 1 ? "🤖 자전거 길을 따라 달려요 · 🌌 하늘을 보며 가 보세요" : S.m === 3 ? "🤖 강변 산책로를 따라 달려요 · 끝에서 돌아와요" : "🤖 선착장 앞을 한 바퀴 돌아요 · 화면을 끌어 둘러봐요") : "✋ 직접 움직여요 · 위로 밀면 앞으로, 옆으로 밀면 방향"); };
    q("pSky").onclick = () => { S.sky = !S.sky; if (S.m === 2) { S.lookY = S.sky ? Math.PI / 2 : 0; } if (S.sky && S.m && !S.auto) { S.auto = true; S.autoDir = Math.cos(S.a) >= 0 ? 1 : -1; hint("🌌 하늘을 보는 동안은 🤖 자동으로 갈게요"); } else hint(S.sky ? "🌌 끌어서 하늘을 둘러봐요" : "앞을 봐요"); syncBar(); };
    q("pView").onclick = () => { S.fp = !S.fp; ls("hn-pk-fp" + S.m, S.fp ? "1" : "0"); syncBar(); hint(S.fp ? "👀 내 눈으로 보기" : "👀 뒤에서 보기"); };
    q("pMute").onclick = () => { setMute(!H.muted); ls("hn-pk-mute", H.muted ? "1" : "0"); hint(H.muted ? "🔇 소리를 껐어요(라디오·버스킹·배경 소리 모두) · 돗자리로 돌아가면 다시 켜져요" : "🔊 소리를 켰어요"); };
    q("pSup").onclick = () => { if (cfg.openSup) cfg.openSup(); };
    q("pAct1").onclick = () => doAct(1); q("pAct2").onclick = () => doAct(2);
    q("pBell").onclick = bell;
    // 조이스틱
    const joy = q("pJoy"), knob = joy.querySelector("i");
    let jid = null;
    const jset = e => { const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } JX = dx; JY = -dy; knob.style.transform = `translate(${dx * 34}px,${dy * 34}px)`; };
    joy.addEventListener("pointerdown", e => { e.stopPropagation(); jid = e.pointerId; joy.setPointerCapture(jid); jset(e); S.goal = null; });
    joy.addEventListener("pointermove", e => { if (e.pointerId === jid) jset(e); });
    const jend = e => { if (e.pointerId !== jid) return; jid = null; JX = JY = 0; knob.style.transform = ""; };
    joy.addEventListener("pointerup", jend); joy.addEventListener("pointercancel", jend);
    // 끌어서 둘러보기 · 눌러서 이름표
    let drag = null;
    cv.addEventListener("pointerdown", e => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now(), moved: false }; cv.setPointerCapture(e.pointerId); box.classList.remove("on"); });
    cv.addEventListener("pointermove", e => { if (!drag || e.pointerId !== drag.id) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 6) drag.moved = true; const k = 1 / Math.min(W, H2) * 2.4; if (e.pointerType === "touch") { const now = performance.now(), dts = Math.max(8, now - S.mvAt) / 1000; S.mvAt = now; S.pdY += dx * k; S.pdP -= dy * k; S.fv = S.fv * .5 + dx * k / dts * .5; } else { S.lookY += dx * k; S.lookP = clamp(S.lookP - dy * k, -1.0, 1.35); } S.lookAt = performance.now(); });   // 📱 88차: 폰은 부드럽게 따라가고 놓으면 미끄러지듯(PC 그대로)
    cv.addEventListener("pointerup", e => { if (!drag || e.pointerId !== drag.id) return; const d = drag; drag = null; if (e.pointerType === "touch") { if (d.moved && performance.now() - S.mvAt < 90) { S.pdY += clamp(S.fv, -5, 5) * .22; S.lookAt = performance.now(); } S.fv = 0; } if (!d.moved && performance.now() - d.t < 400) tap(e.clientX, e.clientY); });
    cv.addEventListener("pointercancel", () => { drag = null; });
    window.addEventListener("keydown", e => { if (!H.isOpen || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return; KEY[e.key.toLowerCase()] = 1; if (e.key === " ") { e.preventDefault(); bell(); } if (e.key.toLowerCase() === "e") doAct(1); if (e.key === "Escape") H.close(); });
    window.addEventListener("keyup", e => { KEY[e.key.toLowerCase()] = 0; });
    window.addEventListener("popstate", () => { if (H.isOpen) H.close(true); });
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", () => { last = performance.now(); });
  }
  let hintT = 0, capT = 0;
  function hint(t) { const h = q("pHint"); h.textContent = t; h.classList.add("on"); clearTimeout(hintT); hintT = setTimeout(() => h.classList.remove("on"), 4800); }
  function showCap(a, b) { const c = q("pCap"); c.querySelector("b").textContent = a; c.querySelector("span").textContent = b || ""; c.classList.add("on"); clearTimeout(capT); capT = setTimeout(() => c.classList.remove("on"), 4200); }
  function openBox(html) { box.innerHTML = `<button class="x" aria-label="닫기">✕</button>` + html; box.classList.add("on"); box.querySelector(".x").onclick = () => box.classList.remove("on"); }
  function resize() { if (!built) return; DPR = Math.min(window.devicePixelRatio || 1, dprCap); W = innerWidth; H2 = innerHeight; cv.width = W * DPR; cv.height = H2 * DPR; }

  // ---------- 상태 ----------
  let JX = 0, JY = 0; const KEY = {};
  const S = { x: R + 22, z: 190, a: -Math.PI / 2, m: 0, v: 0, auto: false, autoDir: 1, sky: false, fp: false, lookY: 0, lookP: -.22, lookAt: 0, pdY: 0, pdP: 0, fv: 0, mvAt: 0, camYaw: -Math.PI / 2, dist: 0, lean: 0, walkPh: 0, goal: null, loopT: 0, dock: null, km: 0, rkm: 0, padPh: 0 };
  { const r = (() => { try { return JSON.parse(ls("hn-run-km") || "null"); } catch { return null; } })(); if (r && r.d === kstDay()) S.rkm = r.m || 0; }
  // 🏃 79차 러닝 옷: 윗옷 색 · 아래 · 모자(오픈월드에서 달릴 때 나와 다른 사람에게 보임). 폰 기록 hn-run-fit
  const FIT_TOP = [["neon", "#d8f03a", "형광 연두"], ["coral", "#ff7a6b", "코랄"], ["sky", "#5fb4ff", "하늘"], ["mint", "#4fd6b0", "민트"], ["lav", "#b49cff", "라벤더"], ["white", "#f2f2f2", "흰색"], ["black", "#3a3d46", "검정"]];
  const FIT_HAT_COL = ["#3a3d46", "#f2f2f2", "#ffffff", "#f2f2f2", "#ffffff", "#5fb4ff", "#d8f03a"];
  const FIT_HATS = [["없음", "🙂"], ["러닝 캡", "🧢"], ["헤어밴드", "🎽"], ["비니", "🧶"]];
  const FIT = (() => { try { const f = JSON.parse(ls("hn-run-fit") || "null"); if (f && f.top >= 0 && f.top < 7 && f.hat >= 0 && f.hat < 4) return f; } catch {} return { top: 0, hat: 1 }; })();
  const fitCode = () => S.m === 3 ? FIT.top * 100 + FIT.hat : 0;
  H.fit = () => ({ col: FIT_TOP[FIT.top][1], hat: FIT.hat, top: FIT.top }); H.FIT_TOP = FIT_TOP; H.FIT_HATS = FIT_HATS;
  H.setFit = (top, hat) => { if (top != null) FIT.top = top; if (hat != null) FIT.hat = hat; ls("hn-run-fit", JSON.stringify(FIT)); };
  let others = new Map(), pkN = 0, hits = [], near = null, lastSend = 0, sentKey = "", fwQ = [], wakeQ = [], wakeAt = 0, fpsAcc = [], tNow = 0;
  const myCol = () => `hsl(${hash(cfg.nick() || "나") * 360 | 0},38%,52%)`;
  H.onMsg = m => {
    if (m.t === "pkN") {
      pkN = m.n || 0; const meId = cfg.me(), now = performance.now(), seen = new Set();
      for (const [id, nick, x, z, a, mm, fo] of m.p || []) { if (id === meId) continue; seen.add(id); let o = others.get(id); if (!o) { o = { id, nick, x, z, a, m: mm, base: `hsl(${hash(nick) * 360 | 0},38%,52%)` }; others.set(id, o); } o.tx = x; o.tz = z; o.ta = a; o.m = mm; o.nick = nick; o.at = now; o.col = mm === 3 ? (FIT_TOP[Math.floor((fo || 0) / 100) % FIT_TOP.length] || FIT_TOP[0])[1] : o.base; }
      for (const id of [...others.keys()]) if (!seen.has(id)) others.delete(id);
      syncTitle();
    } else if (m.t === "sup" && H.isOpen) { for (let i = 0; i < 3; i++) fwQ.push([performance.now() + i * 600, true]); if (m.nick) hint(`💛 ${m.nick}님의 응원 폭죽이 강 위로 올라가요`); }
  };

  // ---------- 열기·닫기 ----------
  function loadGL() {
    if (glState) return; glState = 1;
    import("/parkgl.js").then(m => m.create({ R, Z0, Z1, GY, PATH, BRIDGES, ISLES, SEBIT, NAMSAN, POI }))
      .then(api => { if (!api) { glState = -1; failGL(); return; } GL = api; PIERS = api.PIERS || []; TREES = api.TREES || []; root.insertBefore(api.canvas, cv); glState = 2; q("pLoad").style.display = "none"; showCap("한강 오픈월드", "여의도에서 반포까지 7.8km · 걷고, 자전거 타고, 오리배를 저어 봐요"); hint("🧺 우리 돗자리 옆이에요 · 🚲 자전거 대여소는 바로 앞"); })
      .catch(e => { glState = -1; console.warn("parkgl", e); failGL(); });
  }
  function failGL() { const l = q("pLoad"); l.style.pointerEvents = "auto"; l.innerHTML = `<div><b>이 기기에서는 열 수 없어요</b>3D 그림(WebGL2)을 지원하지 않는 브라우저예요.<br>크롬·사파리 최신 버전에서 다시 열어 주세요.<br><br><button class="pGl" style="all:unset;cursor:pointer;padding:10px 18px;border-radius:16px;background:rgba(255,255,255,.12)" onclick="HNPark.close()">돌아가기</button></div>`; }
  H.open = () => {
    build(); loadGL();
    if (window.HNMenu && HNMenu.close) HNMenu.close();
    if (H.isOpen) return;
    H.isOpen = true; root.classList.add("on"); document.body.classList.add("parkOn"); try { history.pushState({ park: 1 }, ""); } catch {}
    resize(); last = performance.now(); raf = requestAnimationFrame(frame); syncBar(); syncTitle(); setMute(ls("hn-pk-mute") === "1");
    cfg.send({ t: "pk", x: S.x, z: S.z, a: S.a, m: S.m }); lastSend = performance.now();
  };
  H.close = fromPop => {
    if (!H.isOpen) return;
    H.isOpen = false; cancelAnimationFrame(raf); root.classList.remove("on"); document.body.classList.remove("parkOn"); box.classList.remove("on");
    cfg.send({ t: "pk", off: 1 }); others.clear(); setMute(false);
    if (!fromPop) try { if (history.state && history.state.park) history.back(); } catch {}
    cfg.onClose && cfg.onClose();
  };

  // ---------- 타기·내리기·장소 ----------
  const nearPOI = () => { let best = null, bd = 1e9; for (const p of POI) { const d = Math.hypot(p.ex - S.x, p.ez - S.z), lim = p.k === "duck" || p.k === "cruise" || p.k === "kayak" ? 26 : p.k === "mat" ? 16 : p.k === "tower" ? 12 : 11; if (d < lim && d < bd) { bd = d; best = p; } } return best; };
  const ACT = { run: "🏃 달리기 시작", kayak: "🛶 카약·패들보드 타기", market: "🏮 야시장 구경", deliv: "🛵 치킨 배달 주문", bike: "🚲 자전거 타기", duck: "🦆 오리배 타기", cruise: "🚢 유람선 타기", store: "🏪 편의점 들어가기", truck: "🚚 분식 주문하기", busk: "🎸 버스킹 보기", mat: "🧺 돗자리로 돌아가기", tower: "🏙 63빌딩 전망대 올라가기" };
  function syncAct() {
    const a1 = q("pAct1"), a2 = q("pAct2"), bl = q("pBell");
    let t1 = "", t2 = "";
    if (S.m === 0) { near = nearPOI(); if (near && ACT[near.k]) t1 = ACT[near.k]; }
    else { near = null; t2 = S.m === 1 ? "🅿 내리기" : S.m === 3 ? "🛑 그만 달리기" : "⚓ 선착장으로"; if (S.m === 3) t1 = "👕 옷"; }
    a1.textContent = t1; a1.classList.toggle("on", !!t1); a2.textContent = t2; a2.classList.toggle("on", !!t2); bl.classList.toggle("on", S.m === 1);
  }
  function doAct(k) {
    if (k === 1 && S.m === 3) return openFit();
    if (k === 2 || (k === 1 && S.m)) return dismount();
    const p = near; if (!p) return;
    if (p.k === "bike") mount(1, p);
    else if (p.k === "duck") mount(2, p);
    else if (p.k === "run") openFit(true);
    else if (p.k === "kayak") openBoat(p);
    else if (p.k === "market") window.HNMarket ? HNMarket.open() : hint("야시장은 잠시 뒤에 열려요");
    else if (p.k === "deliv") window.HNDeliv ? HNDeliv.open() : hint("배달은 잠시 뒤에 돼요");
    else if (p.k === "mat") H.close();
    else if (p.k === "cruise") { H.close(); setTimeout(() => window.HNTrip && HNTrip.open("cruise"), 60); }
    else if (p.k === "tower") { H.close(); setTimeout(() => window.HNTrip && HNTrip.open("sky63"), 60); }
    else if (p.k === "store") window.HNStore ? HNStore.open() : hint("편의점은 잠시 뒤에 열려요");
    else if (p.k === "truck") window.HNTruck ? HNTruck.open() : hint("분식 트럭은 잠시 뒤에 열려요");
    else if (p.k === "busk") window.HNBusk ? HNBusk.open() : hint("버스킹은 잠시 뒤에 열려요");
  }
  function mount(m, p) {
    S.m = m; S.v = 0; S.auto = false; S.goal = null; S.lookY = 0; S.lookP = m === 1 ? -.12 : -.1;
    const f = ls("hn-pk-fp" + m); S.fp = f == null ? true : f === "1";
    if (m === 1) { S.x = PATH + 1.4; S.z = p.z; S.a = 0; hint("위로 밀면 페달, 아래는 브레이크, 옆으로 핸들 · 🤖 자동도 있어요"); showCap("자전거", "한강 자전거 길 · 여의도 ↔ 반포"); cfg.send({ t: "pk", x: S.x, z: S.z, a: S.a, m: 1 }); }
    else if (m === 3) { S.x = clamp(S.x, R + 8, R + 98); S.lookP = -.18; S.fp = ls("hn-pk-fp3") === "1"; hint("위로 밀면 달려요 · 🤖 자동이면 강변 산책로를 따라 달려요"); showCap("한강 러닝", "강변 산책로 · 여의도 ↔ 반포"); S.rt0 = S.rkm; S.rs = performance.now(); }
    else if (m === 4 || m === 5) { S.dock = p; S.x = p.x - 16; S.z = p.z; S.a = -Math.PI / 2; hint(m === 4 ? "위로 밀면 노 젓기, 옆으로 방향 · 🤖 자동이면 선착장 앞을 천천히 돌아요" : "서서 천천히 · 위로 밀면 노 젓기 · 🤖 자동도 있어요"); showCap(m === 4 ? "카약" : "패들보드", m === 4 ? "물 위에 낮게 앉아 한강을 가까이" : "물 위에 서서, 조용히 한 걸음씩"); }
    else { S.dock = p; S.x = p.x - 22; S.z = p.z; S.a = -Math.PI / 2; S.loopT = 0; hint("위로 밀면 페달, 옆으로 밀면 방향 · 🤖 자동이면 한 바퀴 돌아요"); showCap("오리배", "천천히 저어서 한강 한가운데로"); }
    syncBar(); syncAct();
  }
  function dismount() {
    if (S.m === 1) { S.x = clamp(S.x + 2.5, R + 8, R + 98); hint("자전거를 세웠어요 · 걸어서 둘러봐요"); }
    else if (S.m === 2 || S.m === 4 || S.m === 5) { const d = S.dock || POI.find(p => p.k === "duck"); fade(() => { S.x = d.ex; S.z = d.ez; S.a = Math.PI / 2; }); hint("선착장으로 돌아왔어요"); }
    else if (S.m === 3) { const km = (S.rkm - (S.rt0 || 0)) / 1000; hint(km > .05 ? `🏃 수고했어요 · 이번에 ${km.toFixed(2)}km 달렸어요` : "🏃 천천히 걸어요"); }
    S.m = 0; S.v = 0; S.auto = false; S.sky = false; S.fp = false; S.lookP = -.22; S.camYaw = S.a; S.lookY = 0; syncBar(); syncAct();
  }
  function bell() {
    if (S.m !== 1 || H.muted) return;
    try { const ctx = H.ac || (H.ac = new (window.AudioContext || window.webkitAudioContext)()); if (ctx.state === "suspended") ctx.resume(); const t = ctx.currentTime;
      for (const [d, f] of [[0, 1760], [.16, 1760]]) { for (const [mul, gain] of [[1, .14], [2.76, .05], [5.4, .02]]) { const o = ctx.createOscillator(), gg = ctx.createGain(); o.frequency.value = f * mul; gg.gain.setValueAtTime(0, t + d); gg.gain.linearRampToValueAtTime(gain, t + d + .005); gg.gain.exponentialRampToValueAtTime(.0001, t + d + .7); o.connect(gg).connect(ctx.destination); o.start(t + d); o.stop(t + d + .75); } } } catch {}
  }
  function fade(fn) { const f = q("pFade"); f.classList.add("on"); setTimeout(() => { fn(); f.classList.remove("on"); }, 360); }
  function teleport(p) {
    box.classList.remove("on");
    fade(() => {
      if (S.m === 2 || S.m === 4 || S.m === 5) { S.m = 0; S.auto = false; }
      if (S.m === 3) { S.x = p.k === "duck" || p.k === "cruise" || p.k === "kayak" ? p.ex : clamp(p.ex, R + 8, R + 98); S.z = p.ez; S.goal = null; syncBar(); syncAct(); return; }
      if (S.m === 1 && p.k !== "duck") { S.x = PATH + 1.4; S.z = p.ez; S.a = 0; }
      else { if (S.m === 1) S.m = 0; S.x = p.ex; S.z = p.ez + (p.k === "bike" ? -3 : 0); S.a = p.k === "duck" || p.k === "cruise" || p.k === "view" ? -Math.PI / 2 : Math.PI / 2; if (p.k === "bike") S.a = Math.PI / 2; S.camYaw = S.a; S.lookY = 0; }
      S.goal = null; syncBar(); syncAct();
    });
    hint(`${p.icon} ${p.name}(으)로 왔어요`);
  }
  function openMap() {
    const near2 = p => [...others.values()].filter(o => Math.abs(o.z - p.ez) < 400).length;
    openBox(`<h3>🗺 한강 지도</h3><p>지금 <b>${areaAt(S.z)}</b> · 오픈월드에 ${Math.max(pkN, 1)}명</p><canvas id="pMapCv"></canvas><small>노란 점 = 나 · 파란 점 = 다른 사람 · 누르면 바로 가요</small>` +
      POI.filter(p => p.k !== "tower").map(p => { const d = Math.abs(p.ez - S.z) + Math.abs(p.ex - S.x) * .3, n = near2(p); return `<button class="pl" data-go="${p.id}"><b>${p.icon} ${esc(p.name)}</b><small>${d < 1000 ? Math.round(d) + "m" : (d / 1000).toFixed(1) + "km"}${n ? ` · 근처 ${n}명` : ""}</small></button>`; }).join(""));
    box.querySelectorAll("[data-go]").forEach(b => b.onclick = () => teleport(POI.find(p => p.id === b.dataset.go)));
    const mc = q("pMapCv"); if (!mc) return; const w = mc.clientWidth, h = 76, d = Math.min(2, devicePixelRatio || 1); mc.width = w * d; mc.height = h * d; const x = mc.getContext("2d"); x.scale(d, d);
    const X = z => 8 + (z - Z0) / (Z1 - Z0) * (w - 16), Y = xx => h / 2 + xx / (R + 120) * (h / 2 - 6);
    x.fillStyle = "#15204a"; x.fillRect(0, Y(-R), w, Y(R) - Y(-R)); x.fillStyle = "#1d2a1e"; x.fillRect(0, Y(R), w, Y(R + 100) - Y(R));
    x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = 2; for (const b of BRIDGES) { x.beginPath(); x.moveTo(X(b.z), Y(-R - 20)); x.lineTo(X(b.z), Y(R + 30)); x.stroke(); }
    x.fillStyle = "#26301f"; for (const s of ISLES) { x.beginPath(); x.ellipse(X(s.z), Y(s.x), s.rz / (Z1 - Z0) * (w - 16), s.rx / (R + 120) * (h / 2 - 6), 0, 0, TAU); x.fill(); }
    x.font = "11px sans-serif"; x.textAlign = "center"; for (const p of POI) if (p.k !== "tower") x.fillText(p.icon, X(p.z), Y(p.x) + 4);
    x.fillStyle = "#9fd0ff"; for (const o of others.values()) { x.beginPath(); x.arc(X(o.z), Y(o.x), 2.5, 0, TAU); x.fill(); }
    x.fillStyle = "#f3d9a4"; x.beginPath(); x.arc(X(S.z), Y(S.x), 4, 0, TAU); x.fill();
  }
  function tap(cx, cy) {
    for (const h of hits) if (cx >= h.x && cx <= h.x + h.w && cy >= h.y && cy <= h.y + h.h) {
      const p = POI.find(pp => pp.id === h.id); if (!p) return;
      if (p.k === "tower") { near = p; return doAct(1); }
      if (Math.hypot(p.ex - S.x, p.ez - S.z) < 12 && S.m === 0) { near = p; return doAct(1); }
      if (S.m === 0) { S.goal = [p.ex, p.ez]; hint(`${p.icon} ${p.name}(으)로 걸어가요 · 멀면 🗺 지도로 바로`); }
      else hint(`${p.icon} ${p.name} · 🗺 지도로 바로 갈 수 있어요`);
      return;
    }
  }
  function openFit(start) {
    const draw = () => {
      openBox(`<h3>👕 러닝 옷 고르기</h3><p>달리는 동안 나와 다른 사람 모두에게 이 옷으로 보여요.</p>
        <small>윗옷</small><div style="display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 10px">${FIT_TOP.map(([k, c, n], i) => `<button class="pl" data-top="${i}" style="width:auto;margin:0;padding:8px 10px;display:flex;gap:6px;align-items:center;${FIT.top === i ? "outline:2px solid #f3d9a4" : ""}"><i style="width:18px;height:18px;border-radius:50%;background:${c};display:inline-block"></i><span style="font-size:12.5px">${n}</span></button>`).join("")}</div>
        <small>모자</small><div style="display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 4px">${FIT_HATS.map(([n, e], i) => `<button class="pl" data-hat="${i}" style="width:auto;margin:0;padding:8px 12px;${FIT.hat === i ? "outline:2px solid #f3d9a4" : ""}">${e} <span style="font-size:12.5px">${n}</span></button>`).join("")}</div>
        <p style="margin-top:10px">오늘 달린 거리 <b>${(S.rkm / 1000).toFixed(2)}km</b></p>
        ${S.m === 3 ? `<button class="pl" data-go="ok" style="text-align:center"><b>👟 계속 달리기</b></button>` : `<button class="pl" data-go="run" style="text-align:center;background:linear-gradient(180deg,#f6d68e,#e2b35c);color:#3b2808"><b style="color:#3b2808">🏃 이 옷으로 달리기 시작</b></button>`}`);
      box.querySelectorAll("[data-top]").forEach(b => b.onclick = () => { H.setFit(+b.dataset.top, null); draw(); });
      box.querySelectorAll("[data-hat]").forEach(b => b.onclick = () => { H.setFit(null, +b.dataset.hat); draw(); });
      box.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { box.classList.remove("on"); if (b.dataset.go === "run" && S.m === 0) mount(3, null); });
    };
    draw();
  }
  function openBoat(p) {
    openBox(`<h3>🛶 무엇을 탈까요?</h3><p>모두 무료예요. 천천히 물 위를 즐겨요.</p>
      <button class="pl" data-b="4"><b>🛶 카약</b><small>물 위에 낮게 앉아 양쪽 노로 · 조금 빨라요</small></button>
      <button class="pl" data-b="5"><b>🏄 패들보드(SUP)</b><small>판 위에 서서 긴 노로 · 느긋하게</small></button>`);
    box.querySelectorAll("[data-b]").forEach(b => b.onclick = () => { box.classList.remove("on"); mount(+b.dataset.b, p); });
  }
  function syncBar() {
    if (!built) return;
    q("pAuto").classList.toggle("sel", S.auto); q("pAuto").classList.toggle("dim", !S.m); q("pAuto").innerHTML = S.auto ? "🤖<span>자동 중</span>" : "✋<span>직접</span>";
    q("pSky").classList.toggle("sel", S.sky); q("pSky").innerHTML = S.sky ? "🌊<span>앞 보기</span>" : "🌌<span>하늘 보기</span>";
    q("pView").innerHTML = S.fp ? "👀<span>내 눈</span>" : "🧍<span>뒤에서</span>";
    q("pJoy").querySelector("span").textContent = S.m === 3 ? (S.auto ? "자동으로 달리는 중" : "달리기") : S.m >= 4 ? (S.auto ? "자동으로 도는 중" : "노 젓기 · 방향") : S.m === 1 ? (S.auto ? "옆: 둘러보기" : "페달 · 핸들") : S.m === 2 ? (S.auto ? "자동 운항 중" : "젓기 · 방향") : "걷기";
    q("pJoy").style.opacity = S.auto ? .45 : 1;
  }
  let titleKey = "";
  function syncTitle() {
    if (!built) return;
    const sp = S.m ? Math.round(Math.abs(S.v) * 3.6) : 0;   // 🏃 달리기는 아래에서 페이스(분/km)로
    const k = areaAt(S.z) + "|" + pkN + "|" + S.m;
    if (k !== titleKey) { titleKey = k; q("pName").textContent = S.m === 1 ? "🚲 한강 자전거 길" : S.m === 2 ? "🦆 오리배" : S.m === 3 ? "🏃 한강 러닝" : S.m === 4 ? "🛶 카약" : S.m === 5 ? "🏄 패들보드" : "🗺 한강 오픈월드"; q("pSub").textContent = `${S.m === 2 || S.m >= 4 ? "한강 위 · " : ""}${areaAt(S.z)} · 👥 ${Math.max(pkN, 1)}명`; }
    const em = q("pRoute").querySelector("em"); if (em) em.style.left = clamp((S.z - Z0) / (Z1 - Z0) * 100, 0, 100) + "%";
    const sp2 = q("pSpd"); sp2.style.display = S.m ? "block" : "none"; if (S.m) sp2.innerHTML = S.m === 3 ? `${S.v > .3 ? (() => { const pc = 1000 / S.v; return `${Math.floor(pc / 60)}'${String(Math.round(pc % 60)).padStart(2, "0")}"`; })() : "–"} /km<small>오늘 ${(S.rkm / 1000).toFixed(2)}km</small>` : `${sp} km/h<small>${S.m === 1 ? "오늘 " + (S.km / 1000).toFixed(1) + "km" : S.auto ? "자동 운항" : "직접 젓는 중"}</small>`;
  }
  let dotsKey = "";
  function syncDots() { const rt = q("pRoute"), ks = [...others.values()].map(o => Math.round(o.z / 40)).join(","); if (ks === dotsKey) return; dotsKey = ks; rt.querySelectorAll("u").forEach(e => e.remove()); for (const o of [...others.values()].slice(0, 30)) { const u = document.createElement("u"); u.style.left = clamp((o.z - Z0) / (Z1 - Z0) * 100, 0, 100) + "%"; rt.insertBefore(u, rt.querySelector("em")); } }

  // ---------- 움직임 ----------
  let PIERS = [], TREES = [];
  function collide(px, pz, rad, water) {
    let x = px, z = pz;
    for (const [bx, bz, hx, hz] of PIERS) { const dx = x - bx, dz = z - bz, ox = hx + rad - Math.abs(dx), oz = hz + rad - Math.abs(dz); if (ox > 0 && oz > 0) { if (ox < oz) x += Math.sign(dx || 1) * ox; else z += Math.sign(dz || 1) * oz; } }
    if (water) {
      for (const s of ISLES) { const ex = (x - s.x) / (s.rx + rad + 6), ez = (z - s.z) / (s.rz + rad + 6), d = Math.hypot(ex, ez); if (d < 1) { x = s.x + ex / d * (s.rx + rad + 6); z = s.z + ez / d * (s.rz + rad + 6); } }
      for (const s of SEBIT) { const rr = Math.max(s.rx, s.rz) * 1.15 + rad, d = Math.hypot(x - s.x, z - s.z); if (d < rr) { x = s.x + (x - s.x) / d * rr; z = s.z + (z - s.z) / d * rr; } }
      for (const p of POI) if (p.k === "duck" || p.k === "cruise" || p.k === "kayak") { const hx = p.k === "duck" ? 17 : p.k === "kayak" ? 11 : 15, hz = p.k === "duck" ? 23 : p.k === "kayak" ? 17 : 35, dx = x - p.x, dz = z - p.z, ox = hx + rad - Math.abs(dx), oz = hz + rad - Math.abs(dz); if (ox > 0 && oz > 0) { if (ox < oz) x += Math.sign(dx || 1) * ox; else z += Math.sign(dz || 1) * oz; } }
      x = clamp(x, -R + 10, R - 8);
    } else {
      x = clamp(x, R + 7, R + 98);
      if (S.m === 0 || S.m === 3) for (const [tx, tz, tr] of TREES) { const dx = x - tx, dz = z - tz, d = Math.hypot(dx, dz), rr = tr + rad; if (d < rr && d > .001 && Math.abs(dz) < 3) { x = tx + dx / d * rr; z = tz + dz / d * rr; } }
    }
    return [x, clamp(z, Z0 + 30, Z1 - 30)];
  }
  function step(dt) {
    if (S.pdY || S.pdP) { const f = 1 - Math.pow(.00002, dt); S.lookY += S.pdY * f; S.pdY *= 1 - f; S.lookP = clamp(S.lookP + S.pdP * f, -1.0, 1.35); S.pdP *= 1 - f; if (Math.abs(S.pdY) < 1e-4) S.pdY = 0; if (Math.abs(S.pdP) < 1e-4) S.pdP = 0; }
    let jx = JX, jy = JY;
    if (KEY.w || KEY.arrowup) jy = 1; if (KEY.s || KEY.arrowdown) jy = -1; if (KEY.a || KEY.arrowleft) jx = -1; if (KEY.d || KEY.arrowright) jx = 1;
    const look = performance.now() - S.lookAt < 1500;
    if (S.m === 0 || S.m === 3) {
      // 걷기·달리기: 화면 방향 기준. 도착 지점이 있으면 그쪽으로. 🏃 달리기 자동 = 강변 산책로(x R+11)를 따라
      let mx = 0, mz = 0, sp = 0; const run = S.m === 3;
      if (run && S.auto && Math.hypot(jx, jy) < .12) { if (S.z > Z1 - 70 && S.autoDir > 0) S.autoDir = -1; if (S.z < Z0 + 70 && S.autoDir < 0) S.autoDir = 1; const lx = R + 11 + S.autoDir * .8, tz = S.z + S.autoDir * 10, dx = lx - S.x, dz = tz - S.z, d = Math.hypot(dx, dz); mx = dx / d; mz = dz / d; sp = 2.9; S.goal = null; }
      else if (Math.hypot(jx, jy) > .12) { const yaw = S.camYaw + S.lookY, ang = yaw + Math.atan2(jx, jy); mx = Math.sin(ang); mz = Math.cos(ang); sp = run ? 2.2 + Math.min(1, Math.hypot(jx, jy)) * 1.7 : 1.6 + Math.min(1, Math.hypot(jx, jy)) * 1.8; S.goal = null; }
      else if (S.goal) { const dx = S.goal[0] - S.x, dz = S.goal[1] - S.z, d = Math.hypot(dx, dz); if (d < 1.2) { S.goal = null; } else { mx = dx / d; mz = dz / d; sp = Math.min(3.2, 1 + d * .2); if (d > 160) sp = 6; } }
      if (sp > 0) { const na = Math.atan2(mx, mz); S.a += angD(S.a, na) * Math.min(1, dt * 8); const ox = S.x, oz = S.z; [S.x, S.z] = collide(S.x + mx * sp * dt, S.z + mz * sp * dt, .35, false); S.walkPh += dt * sp * (run ? 1.25 : 1.6); S.v = sp; if (run) { const mv = Math.hypot(S.x - ox, S.z - oz); S.rkm += mv; ls("hn-run-km", JSON.stringify({ d: kstDay(), m: Math.round(S.rkm) })); } } else S.v = 0;
      // 3인칭 카메라는 천천히 등 뒤로
      if (!look && sp > 0) { S.camYaw += angD(S.camYaw + S.lookY, S.a) * Math.min(1, dt * 1.2); }
    } else if (S.m === 1) {
      let steer = jx, thr = jy;
      if (S.auto) {
        if (S.z > Z1 - 70 && S.autoDir > 0) S.autoDir = -1; if (S.z < Z0 + 70 && S.autoDir < 0) S.autoDir = 1;
        const lx = PATH + S.autoDir * 1.4, tz = S.z + S.autoDir * 14, da = angD(S.a, Math.atan2(lx - S.x, tz - S.z));
        steer = clamp(da * 2.2, -1, 1); thr = S.v < 4.6 ? .7 : 0; if (S.v > 5) thr = -.2;
      }
      if (thr > 0) S.v += thr * 1.7 * dt; else if (thr < 0) S.v += thr * 3.4 * dt;
      S.v -= (.12 + S.v * .025) * dt; S.v = clamp(S.v, 0, 7.5);
      const tr = clamp(.25 + S.v * .2, 0, 1.15);
      S.a += steer * tr * dt;
      S.lean += (-steer * Math.min(1, S.v / 4) * .22 - S.lean) * Math.min(1, dt * 4);
      const nx = S.x + Math.sin(S.a) * S.v * dt, nz = S.z + Math.cos(S.a) * S.v * dt;
      const [cx2, cz2] = collide(nx, nz, .5, false); if (Math.hypot(cx2 - nx, cz2 - nz) > .05) S.v *= .6;
      const moved = Math.hypot(cx2 - S.x, cz2 - S.z); S.km += moved; S.dist += moved; S.x = cx2; S.z = cz2;
    } else {
      let steer = jx, thr = jy;
      if (S.auto && S.dock) {
        const [lx, lz, rx, rz] = S.dock.loop;
        // 타원 길에서 지금보다 조금 앞 점을 따라간다
        const th = Math.atan2((S.x - lx) / rx, (S.z - lz) / rz); const t2 = th + .22, tx = lx + Math.sin(t2) * rx, tz = lz + Math.cos(t2) * rz;
        const da = angD(S.a, Math.atan2(tx - S.x, tz - S.z)); steer = clamp(da * 2, -1, 1); thr = S.v < 2 ? .8 : 0;
      }
      const vmax = S.m === 4 ? 3.4 : S.m === 5 ? 1.9 : 2.8, acc = S.m === 4 ? 1.1 : S.m === 5 ? .6 : .8;
      if (S.auto && S.m !== 2) thr = S.v < vmax * .55 ? .8 : 0;
      if (thr > 0) S.v += thr * acc * dt; else if (thr < 0) S.v += thr * 1.2 * dt;
      S.v -= (.08 + S.v * .1) * dt; S.v = clamp(S.v, -.8, vmax); if (S.m >= 4) S.padPh += dt * (1.2 + Math.abs(S.v) * 1.1) * (Math.abs(S.v) > .05 || thr ? 1 : .15);
      S.a += steer * (.25 + Math.abs(S.v) * .25) * dt;
      const nx = S.x + Math.sin(S.a) * S.v * dt, nz = S.z + Math.cos(S.a) * S.v * dt;
      const [cx2, cz2] = collide(nx, nz, S.m === 2 ? 1.3 : .8, true); if (Math.hypot(cx2 - nx, cz2 - nz) > .05) S.v *= .5;
      S.x = cx2; S.z = cz2;
      const now = performance.now(); if (Math.abs(S.v) > .3 && now - wakeAt > 220) { wakeAt = now; for (const e of (S.m === 2 ? [-.75, .75] : [-.3, .3])) wakeQ.push([S.x - Math.sin(S.a) * 1.3 + Math.cos(S.a) * e, S.z - Math.cos(S.a) * 1.3 - Math.sin(S.a) * e, .8]); }
    }
    // 시선: 손을 떼면 천천히 앞으로(하늘 보기면 위를 계속)
    if (!look) {
      if (S.sky) { const tp = S.m === 2 || S.m === 4 ? .42 : 1.0; S.lookP += (tp - S.lookP) * Math.min(1, dt * 1.5); }
      else { const base = S.m === 3 ? -.18 : S.m ? (S.m === 1 ? -.12 : -.1) : -.22; S.lookP += (base - S.lookP) * Math.min(1, dt * 1.2); if (S.m && S.v > .5) S.lookY *= Math.max(0, 1 - dt * 1.1); }
    }
  }
  // 지나가는 유람선(여의도 ↔ 반포 앞, 7m/s)
  const boatAt = t => { const L = 6200, sp = 7, u = (t * sp) % (2 * L), east = u < L; return { x: east ? -90 : -140, z: east ? u : 2 * L - u, a: east ? 0 : Math.PI }; };
  const fountainOn = () => new Date().getMinutes() % 15 < 5;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now; tNow += dt;
    if (document.hidden) return;
    const covered = ["stWrap", "tkWrap", "bkWrap", "dvWrap", "mkWrap"].some(id => { const e = q(id); return e && e.classList.contains("on"); }) || (window.HNBusk && HNBusk.isOpen && HNBusk.isOpen());
    step(dt);
    syncAct(); syncTitle(); syncDots();
    // 다른 사람: 부드럽게 따라가기
    const os = [];
    for (const o of others.values()) { const k = Math.min(1, dt * 4); o.x += (o.tx - o.x) * k; o.z += (o.tz - o.z) * k; o.a += angD(o.a, o.ta) * k; o.mv = Math.hypot(o.tx - o.x, o.tz - o.z) > .2; os.push(o); }
    // 보내기
    if (now - lastSend > 400) { const key = `${S.x.toFixed(1)},${S.z.toFixed(1)},${S.a.toFixed(2)},${S.m},${fitCode()}`; if (key !== sentKey || now - lastSend > 5000) { sentKey = key; lastSend = now; cfg.send({ t: "pk", x: +S.x.toFixed(1), z: +S.z.toFixed(1), a: +S.a.toFixed(2), m: S.m, o: fitCode() }); } }
    if (glState !== 2 || covered) return;
    g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H2);
    // 카메라
    let cx, cy, cz, yaw, pitch, roll = 0;
    if (S.m === 0 || S.m === 3) {
      if (S.m === 3 && (S.auto || S.v > 0) && performance.now() - S.lookAt > 1500) S.camYaw += angD(S.camYaw, S.a) * Math.min(1, dt * 1.5);
      yaw = S.camYaw + S.lookY; pitch = S.lookP;
      if (S.fp) { cx = S.x; cz = S.z; cy = GY + 1.62 + (S.m === 3 ? Math.abs(Math.sin(S.walkPh * 2)) * .06 : 0); }
      else { const D = 7.4, cp = Math.cos(Math.min(pitch, .9)); cx = S.x - Math.sin(yaw) * D * cp; cz = S.z - Math.cos(yaw) * D * cp; cy = Math.max(GY + .6, GY + 1.7 - Math.sin(Math.min(pitch, .9)) * D); }
    } else {
      yaw = S.a + S.lookY; pitch = S.lookP;
      const bob = S.m >= 4 ? Math.sin(tNow * 1.2) * .03 : S.m === 1 ? Math.sin(S.dist / 1.05 * Math.PI) * .018 * Math.min(1, S.v / 3) : Math.sin(tNow * 1.3) * .04;
      if (S.fp) { const back = S.m === 1 ? -.18 : S.m >= 4 ? -.15 : -.5, side = S.m === 2 ? (S.sky ? (Math.sin(S.lookY) >= 0 ? .95 : -.95) : .3) : 0; cx = S.x + Math.sin(S.a) * back + Math.cos(S.a) * side; cz = S.z + Math.cos(S.a) * back - Math.sin(S.a) * side; cy = (S.m === 1 ? GY + 1.62 : S.m === 4 ? 1.05 : S.m === 5 ? 1.85 : 1.32) + bob; roll = S.m === 1 ? S.lean * .55 : Math.sin(tNow * 1.3) * .015 + (S.sky ? .1 : 0); }
      else { const D = S.m === 1 ? 5.2 : S.m >= 4 ? 5.5 : 7.5, cp = Math.cos(Math.min(pitch, .9)); cx = S.x - Math.sin(yaw) * D * cp; cz = S.z - Math.cos(yaw) * D * cp; cy = Math.max((S.m === 1 ? GY : 0) + .8, (S.m === 1 ? GY + 2 : 2.4) - Math.sin(Math.min(pitch, .9)) * D); }
    }
    const fwNew = []; while (fwQ.length && fwQ[0][0] <= now) fwNew.push(fwQ.shift()[1]);
    const st = { W, H: H2, dpr: DPR, t: tNow, low, cx, cy, cz, yaw, pitch, roll, fov: S.m === 1 && S.fp ? 66 + Math.min(8, S.v * 1.1) : 62, fp: S.fp, skyUp: S.sky || pitch > .5,
      me: { x: S.x, z: S.z, a: S.a, m: S.m, lean: S.lean, dist: S.dist, walkPh: S.walkPh, bob: S.m === 2 || S.m >= 4 ? Math.sin(tNow * 1.7) * .04 : 0, padPh: S.padPh, hat: S.m === 3 ? FIT.hat : 0, hatCol: FIT_HAT_COL[FIT.top] }, meCol: S.m === 3 ? FIT_TOP[FIT.top][1] : myCol(),
      others: os, boat: boatAt(Date.now() / 1000), fountainOn: H.fountain || fountainOn(), fwNew: fwNew.length ? fwNew : null, wakeAt: wakeQ.length ? wakeQ.splice(0) : null };
    try { hits = GL.render(st, g) || []; } catch (e) { console.warn(e); }
    // 속도가 느린 기기는 해상도를 낮추고, 그래도 느리면 빛 번짐을 끈다
    fpsAcc.push(dt); if (fpsAcc.length >= 90) { const avg = fpsAcc.reduce((a, b) => a + b, 0) / fpsAcc.length; fpsAcc = []; if (avg > .042) { if (dprCap > 1.05) { dprCap = 1; resize(); } else if (!low) low = true; } }
  }
  H.others = () => others; H.pkN = () => pkN; H.setMuteAll = on => setMute(on);
  H.dbg = () => S;
  H.dbgSet = o => { Object.assign(S, o); syncBar(); };
})();
