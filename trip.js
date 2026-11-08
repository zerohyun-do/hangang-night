// 🚢 한강 유람선 · 🗼 남산타워 전망대 — 01(index.html)과 02(3d.html)가 같이 쓰는 파일.
// 2D 캔버스지만 작은 원근 투영 엔진으로 그린다: 카메라(눈 위치)에서 본 세상을 좌우(yaw)·위아래(pitch)로 둘러본다.
// 유람선: 배 앞머리 갑판에 서 있는 시선. 모두 같은 시계로 같은 지점을 지나간다(같은 배를 탄 느낌, 서버 필요 없음).
// 남산타워: 해발 480m 전망대에서 360도. 도시 불빛, 한강과 다리, 움직이는 차 불빛, 산 능선, 밤하늘.
// 💛 응원자 혜택: ✨ 별빛 코스(응원 폭죽을 쏜 날 하루) + 오늘 응원자 이름이 전광판·마주 오는 배 현수막에.
// 💌 전광판 사연: 신청 → 운영자가 확인 → 24시간 동안 모두의 전광판에. 결제 확인은 운영자가 직접 한다.
(function () {
  "use strict";
  const T = window.HNTrip = { isOpen: false };
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hash = n => { n = Math.imul(n ^ n >>> 16, 0x45d9f3b); n = Math.imul(n ^ n >>> 16, 0x45d9f3b); return ((n ^ n >>> 16) >>> 0) / 4294967296; };
  const kstDay = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };

  let cfg = { send() {}, me: () => null, toast() {}, openSup: null, isAdmin: () => false, donate: "" };
  T.init = o => Object.assign(cfg, o);
  T.supDay = () => supDay;

  // ---------- 서버에서 오는 것 ----------
  let bbLive = [], bbPend = [], bbPrice = "", supDay = [], riders = { c: [], cn: 0, w: [], wn: 0 }, myCode = null;
  T.onMsg = m => {
    if (m.t === "init") { if (m.bb) bbLive = m.bb; if (m.supDay) supDay = m.supDay; if (m.bbPrice != null) bbPrice = m.bbPrice; if (m.bbPend) bbPend = m.bbPend; if (m.trips) riders = m.trips; if (T.isOpen) cfg.send({ t: "trip", v: mode }); }
    else if (m.t === "bb") { bbLive = m.live || []; if (box && box.dataset.k === "bbAdmin") openAdmin(); }
    else if (m.t === "bbOk") { myCode = m.n || 1; openBB(); }
    else if (m.t === "bbBad") cfg.toast(m.why === "bad" ? "욕설·야한 말·연락처는 전광판에 올릴 수 없어요" : m.why === "wait" ? "전광판 신청은 10분에 한 번이에요"  : "한 줄이라도 적어 주세요", 3000);
    else if (m.t === "tripN") { riders = m; syncWho(); }
    else if (m.t === "supName") { if (m.nick && !supDay.includes(m.nick)) supDay.push(m.nick); }
    else if (m.t === "sup") {
      if (m.nick && !m.admin && !supDay.includes(m.nick)) supDay.push(m.nick);
      if (m.id === cfg.me()) { ls("hn-supday", kstDay()); if (T.isOpen) { starOn = true; syncStar(); showCap("✨ 별빛 코스가 열렸어요", "오늘 하루, 탈 때마다 불꽃과 별똥별이 함께해요"); } }
      if (T.isOpen) for (let i = 0; i < 3; i++) setTimeout(() => fwLaunch(true), i * 600);
    }
  };
  const ridersOf = () => (mode === "cruise" ? riders.c : mode === "sky63" ? riders.s : mode === "sky123" ? riders.l : mode === "lounge" ? riders.g : riders.w) || [];
  const supporter = () => ls("hn-supday") === kstDay() || cfg.isAdmin();

  // ---------- 화면 ----------
  const css = `
  #trip { position: fixed; inset: 0; z-index: 50; background: #04050d; display: none; touch-action: none; user-select: none; -webkit-user-select: none; font-family: -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; color: #f3ecdf; overflow: hidden; }
  #trip.on { display: block; } #trip canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  body.tripOn #supBox, body.tripOn #toast { z-index: 70 !important; }
  .tGl { background: rgba(14,17,40,.62); border: 1px solid rgba(255,255,255,.13); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
  #tTop { position: absolute; left: 12px; right: 12px; top: max(12px, env(safe-area-inset-top)); display: flex; gap: 8px; align-items: flex-start; pointer-events: none; }
  #tTitle { padding: 8px 14px; border-radius: 18px; min-width: 0; flex: 1 1 auto; max-width: 340px; }
  #tTitle b { display: block; font-size: 14.5px; font-weight: 700; letter-spacing: -.2px; } #tTitle span { display: block; font-size: 12px; color: #cfc6e0; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  #tRoute { position: relative; height: 4px; border-radius: 2px; background: rgba(255,255,255,.14); margin-top: 7px; } #tRoute i { position: absolute; top: -2px; width: 2px; height: 8px; background: rgba(255,255,255,.35); border-radius: 1px; } #tRoute em { position: absolute; top: -4px; width: 12px; height: 12px; margin-left: -6px; border-radius: 50%; background: #f3d9a4; box-shadow: 0 0 10px #f3d9a4; }
  #tClose { all: unset; pointer-events: auto; cursor: pointer; flex: none; padding: 9px 14px; border-radius: 18px; font-size: 13.5px; font-weight: 600; }
  #tWho { position: absolute; left: 50%; transform: translateX(-50%); top: calc(max(12px, env(safe-area-inset-top)) + 84px); padding: 5px 12px; border-radius: 999px; font-size: 12px; color: #e9e2f3; white-space: nowrap; opacity: 0; transition: opacity .4s; pointer-events: none; max-width: calc(100vw - 40px); overflow: hidden; text-overflow: ellipsis; } #tWho.on { opacity: 1; }
  #tCap { position: absolute; left: 0; right: 0; top: 30%; text-align: center; pointer-events: none; opacity: 0; transition: opacity 1.6s ease; text-shadow: 0 2px 18px rgba(0,0,0,.7); } #tCap.on { opacity: 1; }
  #tCap b { display: block; font-size: clamp(26px, 7vw, 40px); font-weight: 300; letter-spacing: 6px; color: #fff6e6; } #tCap span { display: block; margin-top: 8px; font-size: 13.5px; letter-spacing: 1px; color: #e3d9f0; }
  #tHint { position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(max(14px, env(safe-area-inset-bottom)) + 84px); font-size: 12.5px; color: #e6def3; padding: 6px 14px; border-radius: 999px; opacity: 0; transition: opacity .8s; pointer-events: none; white-space: nowrap; } #tHint.on { opacity: 1; }
  #tBar { position: absolute; left: 50%; transform: translateX(-50%); bottom: max(14px, env(safe-area-inset-bottom)); display: flex; gap: 2px; padding: 6px 8px; border-radius: 24px; max-width: calc(100vw - 20px); }
  #tBar button { all: unset; cursor: pointer; width: 58px; height: 54px; display: grid; place-items: center; align-content: center; gap: 3px; border-radius: 16px; font-size: 22px; line-height: 1; text-align: center; }
  #tBar button span { font-size: 11px; color: #d9d1e6; white-space: nowrap; } #tBar button:active { transform: scale(.92); background: rgba(255,255,255,.08); }
  #tBar button.sel { background: rgba(243,217,164,.18); } #tBar button.lock { opacity: .75; } #tBar button.lock span { color: #f3d9a4; }
  #tBox { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(340px, calc(100vw - 32px)); max-height: calc(100vh - 120px); overflow: auto; padding: 18px 18px 14px; border-radius: 22px; display: none; background: rgba(16,19,44,.94); font-size: 13.5px; line-height: 1.55; color: #e9e2f3; }
  #tBox.on { display: block; } #tBox h3 { margin: 0 0 8px; font-size: 16.5px; color: #fff3dc; } #tBox p { margin: 6px 0; } #tBox small { color: #a9a1bd; font-size: 12px; display: block; }
  #tBox textarea, #tBox input { box-sizing: border-box; width: 100%; margin-top: 8px; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.06); color: #fff; font: inherit; font-size: 15px; resize: none; }
  #tBox .row { display: flex; gap: 8px; margin-top: 12px; } #tBox .row button, #tBox .bt { all: unset; cursor: pointer; flex: 1; text-align: center; padding: 11px 0; border-radius: 14px; background: rgba(255,255,255,.1); font-weight: 600; font-size: 14px; }
  #tBox .row button.go, #tBox .bt.go { background: linear-gradient(180deg, #f6d68e, #e2b35c); color: #3b2808; }
  #tBox .code { margin: 10px 0; padding: 12px; border-radius: 14px; background: rgba(243,217,164,.12); border: 1px dashed rgba(243,217,164,.5); text-align: center; } #tBox .code b { font-size: 26px; letter-spacing: 4px; color: #ffe2a0; }
  #tBox .it { padding: 8px 10px; border-radius: 12px; background: rgba(255,255,255,.06); margin-top: 6px; display: flex; gap: 6px; align-items: center; } #tBox .it div { flex: 1; min-width: 0; word-break: break-all; } #tBox .it button { all: unset; cursor: pointer; padding: 6px 9px; border-radius: 10px; background: rgba(255,255,255,.12); font-size: 12.5px; }
  #tBox .it button.ok { background: #e2b35c; color: #3b2808; font-weight: 700; }
  #tBox .x { all: unset; position: absolute; right: 10px; top: 8px; cursor: pointer; font-size: 18px; padding: 6px 10px; color: #bbb3cc; }
  #tJoy { position: absolute; left: 18px; bottom: calc(max(14px, env(safe-area-inset-bottom)) + 86px); width: 104px; height: 104px; border-radius: 50%; display: none; touch-action: none; }
  #trip.walk #tJoy { display: block; } #tJoy i { position: absolute; left: 50%; top: 50%; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%; background: rgba(243,217,164,.85); box-shadow: 0 0 14px rgba(243,217,164,.4); }
  #tJoy span { position: absolute; left: 0; right: 0; top: -20px; text-align: center; font-size: 11.5px; color: #d9d1e6; }
  #tFlash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; transition: opacity .5s; }
  #tBar button { width: min(58px, calc((100vw - 52px) / 6)); } #trip.cr #tScopeB { display: none; } #trip:not(.lg) #tRest, #trip.lg #tScopeB { display: none; }
  #trip.rest #tBar, #trip.rest #tTop, #trip.rest #tJoy, #trip.rest #tWho, #trip.rest #tHint { opacity: 0; pointer-events: none; transition: opacity 1.2s; }
  #trip #tBar, #trip #tTop { transition: opacity .6s; }
  #tRestNote { position: absolute; left: 50%; bottom: max(18px, env(safe-area-inset-bottom)); transform: translateX(-50%); font-size: 12px; color: rgba(230,222,243,.5); opacity: 0; transition: opacity 2s; pointer-events: none; white-space: nowrap; } #trip.rest #tRestNote { opacity: 1; }
  #trip.scope #tBar, #trip.scope #tJoy, #trip.scope #tWho, #trip.scope #tHint, #trip.scope #tTitle { display: none !important; }
  #tScope { position: absolute; left: 50%; transform: translateX(-50%); bottom: max(12px, env(safe-area-inset-bottom)); width: min(400px, calc(100vw - 20px)); display: none; align-items: stretch; gap: 6px; }
  #trip.scope #tScope { display: flex; }
  #tScope > button { all: unset; cursor: pointer; flex: none; width: 46px; display: grid; place-items: center; border-radius: 18px; font-size: 26px; color: #f3d9a4; }
  #tScope > button:active { transform: scale(.92); }
  #scCard { flex: 1; min-width: 0; padding: 10px 14px 11px; border-radius: 18px; position: relative; }
  #scCard b { display: block; word-break: keep-all; font-size: 15.5px; color: #fff3dc; letter-spacing: -.2px; padding-right: 64px; } #scCard b em { font-style: normal; font-size: 12px; font-weight: 600; color: #f3d9a4; margin-left: 6px; }
  #scCard span { display: block; word-break: keep-all; font-size: 12.5px; color: #ddd4ea; margin-top: 3px; line-height: 1.45; } #scCard small { display: block; font-size: 11.5px; color: #a9a1bd; margin-top: 5px; }
  #scCard i { display: inline-block; height: 4px; border-radius: 2px; background: rgba(255,255,255,.14); width: 56px; vertical-align: middle; margin-left: 6px; overflow: hidden; } #scCard i u { display: block; height: 100%; background: #f3d9a4; }
  #scCard.new { animation: scNew 1.2s ease; } @keyframes scNew { 25% { box-shadow: 0 0 0 3px rgba(243,217,164,.75); } 100% { box-shadow: 0 0 0 0 rgba(243,217,164,0); } }
  #scOut { all: unset; cursor: pointer; position: absolute; right: 8px; top: 8px; padding: 4px 9px; border-radius: 10px; background: rgba(255,255,255,.1); font-size: 12px; color: #e9e2f3; }
  #tBox .pl { display: block; box-sizing: border-box; width: 100%; flex: none; text-align: left; padding: 10px 14px; margin-top: 8px; font-weight: 600; } #tBox .pl b { display: block; font-size: 15px; color: #fff3dc; } #tBox .pl small { margin-top: 2px; } #tBox .pl.on { background: rgba(243,217,164,.18); }
  @media (orientation: landscape) and (max-height: 520px) { #tScope { left: auto; right: 10px; transform: none; width: min(300px, 34vw); } }`;

  let root, cv, g, box, W = 0, H = 0, DPR = 1, raf = 0, last = 0, mode = null, built = false;
  function build() {
    if (built) return; built = true;
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    root = document.createElement("div"); root.id = "trip";
    root.innerHTML = `<canvas></canvas>
      <div id="tTop"><div id="tTitle" class="tGl"><b id="tName"></b><span id="tSub"></span><div id="tRoute"></div></div><button id="tClose" class="tGl">돗자리로 ↩</button></div>
      <div id="tWho" class="tGl"></div><div id="tCap"><b></b><span></span></div><div id="tHint" class="tGl"></div>
      <div id="tBar" class="tGl">
        <button id="tSky">🌌<span>하늘 보기</span></button><button id="tStar">✨<span>별빛 코스</span></button>
        <button id="tBB">💌<span>전광판</span></button><button id="tSnap">📷<span>사진</span></button><button id="tScopeB">🔭<span>망원경</span></button><button id="tRest">🛋<span>쉬기</span></button><button id="tSwap"></button></div><div id="tRestNote">화면을 톡 누르면 돌아와요</div>
      <div id="tScope"><button id="scPrev" class="tGl" aria-label="이전 명소">‹</button><div id="scCard" class="tGl"><button id="scOut">눈 떼기 ✕</button><b></b><span></span><small></small></div><button id="scNext" class="tGl" aria-label="다음 명소">›</button></div>
      <div id="tJoy" class="tGl" aria-label="걷기"><i></i><span>걷기</span></div>
      <div id="tBox" class="tGl"></div><div id="tFlash"></div>`;
    document.body.appendChild(root);
    cv = root.querySelector("canvas"); g = cv.getContext("2d"); box = root.querySelector("#tBox");
    const q = id => root.querySelector("#" + id);
    q("tClose").onclick = () => T.close();
    q("tSky").onclick = () => { skyUp = !skyUp; tPitch = skyUp ? (deck() ? 50 : 62) * RAD : basePitch(); idleAt = performance.now() + 4000; syncSky(); };
    q("tStar").onclick = () => supporter() ? (starOn = !starOn, syncStar(), starOn && showCap("✨ 별빛 코스", deck() ? "한강 위로 불꽃이 올라가요" : "불꽃과 별똥별, 무지개분수가 함께해요")) : openStarInfo();
    q("tBB").onclick = () => cfg.isAdmin() ? openAdmin() : openBB();
    q("tSnap").onclick = snap;
    q("tSwap").onclick = openPlaces;
    q("tScopeB").onclick = () => scopeOn();
    q("tRest").onclick = () => restOn();
    q("scOut").onclick = () => scopeOff();
    q("scPrev").onclick = () => scopeGo(-1); q("scNext").onclick = () => scopeGo(1);
    const joy = q("tJoy"), knob = joy.querySelector("i");
    const jmove = e => { const r2 = joy.getBoundingClientRect(), dx = e.clientX - (r2.left + r2.width / 2), dy = e.clientY - (r2.top + r2.height / 2), m = Math.min(1, Math.hypot(dx, dy) / 42), a = Math.atan2(dy, dx); walk.jx = Math.cos(a) * m; walk.jy = -Math.sin(a) * m; if (m < .15) walk.jx = walk.jy = 0; knob.style.transform = `translate(${Math.cos(a) * m * 34}px,${Math.sin(a) * m * 34}px)`; };
    joy.addEventListener("pointerdown", e => { e.stopPropagation(); try { joy.setPointerCapture(e.pointerId); } catch {} joy.dataset.on = 1; jmove(e); });
    joy.addEventListener("pointermove", e => { if (joy.dataset.on) jmove(e); });
    const jend = () => { delete joy.dataset.on; walk.jx = walk.jy = 0; knob.style.transform = ""; }; joy.addEventListener("pointerup", jend); joy.addEventListener("pointercancel", jend);
    addEventListener("keyup", e => walk.keys.delete(e.key.toLowerCase()));
    cv.addEventListener("pointerdown", onDown); addEventListener("pointermove", onMove); addEventListener("pointerup", onUp); addEventListener("pointercancel", onUp);
    cv.addEventListener("wheel", e => { e.preventDefault(); tZoom = clamp(tZoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), zMin(), zMax()); }, { passive: false });
    addEventListener("resize", () => T.isOpen && resize());
    addEventListener("keydown", e => {
      if (!T.isOpen || box.classList.contains("on")) return;
      const k = e.key; if (k === "Escape") { if (scope) return scopeOff(); T.close(); }
      if (deck() && "wasd".includes(k.toLowerCase()) && k.length === 1) { walk.keys.add(k.toLowerCase()); return; }
      const ks = 1 / Math.max(1, zoom); if (k === "ArrowLeft") tYaw -= 10 * RAD * ks; if (k === "ArrowRight") tYaw += 10 * RAD * ks; if (k === "ArrowUp") tPitch += 8 * RAD * ks; if (k === "ArrowDown") tPitch -= 8 * RAD * ks;
      if (k.startsWith("Arrow")) { idleAt = performance.now() + 6000; clampView(); }
    });
    addEventListener("popstate", () => { if (T.isOpen) T.close(true); });
  }
  const q = id => root.querySelector("#" + id);

  // 진짜 3D(WebGL) 화면: tripgl.js를 처음 열 때 불러온다. 안 되는 기기(WebGL2 없음 등)는 아래 2D 그림 그대로
  let GL = null, glState = 0, lastSt = null;
  const glFw = [], glMet = [];
  function loadGL() {
    if (glState) return; glState = 1;
    if (/[?&]gl=0\b/.test(location.search)) { glState = -1; return; }
    import("/tripgl.js").then(m => m.create({ R, LEN, BRIDGES, BOARDS, NAMSAN, riverZ, TB, TLAB, FLOOR, RG, RC, DECKS }))
      .then(api => { if (!api) { glState = -1; return; } GL = api; root.insertBefore(api.canvas, cv); glState = 2; if (deck() && !skyUp) tPitch = basePitch(); })
      .catch(e => { glState = -1; console.warn("tripgl", e); });
  }
  T.glState = () => glState;
  T.dbgView = (yw, pt) => { tYaw = yaw = yw * RAD; if (pt != null && !isNaN(pt)) tPitch = pitch = pt * RAD; idleAt = performance.now() + 1e9; };
  T.open = kind => {
    build(); loadGL();
    const was = mode; mode = DECKS[kind] ? kind : "cruise"; if (deck()) D = DECKS[mode];
    if (!T.isOpen) { T.isOpen = true; root.classList.add("on"); document.body.classList.add("tripOn"); try { history.pushState({ trip: 1 }, ""); } catch {} last = performance.now(); raf = requestAnimationFrame(frame); }
    if (was !== mode) {
      yaw = tYaw = 0; zoom = tZoom = 1; skyUp = false; scope = null; root.classList.remove("scope"); root.classList.toggle("cr", mode === "cruise"); box.classList.remove("on");
      if (deck()) { yaw = tYaw = D.yaw * RAD; if (glState === 2 || glState === 1) zoom = tZoom = 1.5; walk.to = null; walk.x = D.x + D.start[0]; walk.z = D.z + D.start[1]; placeWalk(); } else { camX = camZ = 0; }
      root.classList.toggle("walk", deck()); root.classList.toggle("lg", mode === "lounge"); rest = null; root.classList.remove("rest");
      resize(); pitch = tPitch = basePitch();
      if (mode === "cruise") makeCruise(); else makeTower();
      starOn = supporter() && ls("hn-staroff") !== "1";
      fws.length = 0; meteors.length = 0; capAt = 0; lastPlace = "";
      q("tName").textContent = mode === "cruise" ? "🚢 한강 유람선" : D.name;
      q("tSwap").innerHTML = "🗺<span>다른 곳</span>";
      q("tRoute").style.display = mode === "cruise" ? "" : "none";
      if (mode === "cruise") q("tRoute").innerHTML = BRIDGES.map(b => `<i style="left:${b.z / LEN * 100}%"></i>`).join("") + "<em></em>";
      else q("tSub").textContent = D.sub;
      if (mode === "cruise") showCap("한강 유람선", "여의도에서 한남까지, 다리 아래로 천천히"); else showCap(D.cap[0], D.cap[1]);
      hint(mode === "cruise" ? "화면을 끌어서 둘러봐요 · 위로 올리면 밤하늘" : D.hint);
      cfg.send({ t: "trip", v: mode });
    }
    syncSky(); syncStar(); syncWho(); syncBB();
  };
  // 🗺 다른 곳으로: 유람선·전망대 고르기
  const TRIPS = [["cruise", "🚢", "한강 유람선", "여의도에서 한남까지 강 위로"], ["tower", "🗼", "남산서울타워", "해발 480m, 서울 한가운데서 360°"], ["sky63", "🏙", "63빌딩", "여의도 60층, 한강이 발아래"], ["sky123", "🌃", "롯데월드타워", "118층 유리 바닥, 잠실의 하늘 위"], ["lounge", "🛋", "한강 라운지", "반포 강변 빌딩 위층 · 소파에 앉아 쉬어 가기"]];
  function openPlaces() {
    openBoxHTML("places", `<h3>🗺 어디서 볼까요?</h3><p>모두 무료예요. 같은 곳에 간 사람은 이름이 보여요.</p>` + TRIPS.filter(t => !(window.HNHide || []).includes(t[0])).map(([k, ic, n, d]) => `<button class="bt pl${k === mode ? " on" : ""}" data-go="${k}"><b>${ic} ${n}</b><small>${k === mode ? "지금 여기 있어요" : d}${placeN(k) ? ` · ${placeN(k)}명` : ""}</small></button>`).join(""));
    box.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { box.classList.remove("on"); if (b.dataset.go !== mode) T.open(b.dataset.go); });
  }
  const placeN = k => (k === "cruise" ? riders.cn : k === "tower" ? riders.wn : k === "sky63" ? riders.sn : k === "lounge" ? riders.gn : riders.ln) || 0;
  T.close = fromPop => {
    if (!T.isOpen) return;
    T.isOpen = false; mode = null; scope = null; rest = null; root.classList.remove("rest"); root.classList.remove("scope"); cancelAnimationFrame(raf); root.classList.remove("on"); document.body.classList.remove("tripOn"); box.classList.remove("on");
    cfg.send({ t: "trip", v: "" });
    if (!fromPop) try { if (history.state && history.state.trip) history.back(); } catch {}
    cfg.onClose && cfg.onClose();
  };
  let hintT = 0;
  function hint(t) { const h = q("tHint"); h.textContent = t; h.classList.add("on"); clearTimeout(hintT); hintT = setTimeout(() => h.classList.remove("on"), 5200); }
  let capT = 0, capAt = 0;
  function showCap(a, b) { const c = q("tCap"); c.querySelector("b").textContent = a; c.querySelector("span").textContent = b || ""; c.classList.add("on"); clearTimeout(capT); capT = setTimeout(() => c.classList.remove("on"), 4200); capAt = performance.now(); }
  function syncSky() { if (!built) return; const b = q("tSky"); b.classList.toggle("sel", skyUp); b.innerHTML = skyUp ? "🌊<span>앞 보기</span>" : "🌌<span>하늘 보기</span>"; }
  function syncStar() { if (!built) return; const b = q("tStar"), s = supporter(); b.classList.toggle("lock", !s); b.classList.toggle("sel", s && starOn); b.innerHTML = `✨<span>${s && starOn ? "별빛 켜짐" : "별빛 코스"}</span>`; if (s) ls("hn-staroff", starOn ? "" : "1"); }
  function syncBB() { if (!built) return; q("tBB").innerHTML = "💌<span>전광판</span>"; }
  function syncWho() {
    if (!built || !mode) return; const el = q("tWho"), list = ridersOf(), n = placeN(mode);
    const others = (list || []).filter(x => x !== (cfg.nick ? cfg.nick() : "")); const k = Math.max(0, (n || 0) - 1);
    el.textContent = k > 0 ? `${mode === "cruise" ? "🚢" : D.icon} ${others.slice(0, 3).join(", ")}${k > 3 ? ` 외 ${k - 3}명` : ""}님과 같이 ${mode === "cruise" ? "타고 있어요" : "보고 있어요"}` : "";
    el.classList.toggle("on", k > 0);
  }

  // ---------- 창: 💌 전광판 사연 / ✨ 별빛 코스 / 운영자 ----------
  function openBoxHTML(k, html) { box.dataset.k = k; box.innerHTML = `<button class="x" aria-label="닫기">✕</button>` + html; box.classList.add("on"); box.querySelector(".x").onclick = () => box.classList.remove("on"); }
  function openBB() {
    if (myCode) {
      openBoxHTML("bb", `<h3>💌 전광판에 올라갔어요</h3>
        <p>지금부터 <b>24시간</b> 동안 유람선·남산타워 전광판에 다른 사연들과 <b>순서대로</b> 돌아가며 떠요. 지금 ${esc(myCode)}번째 사연이에요.</p>
        <p>마음에 들었다면 💛 후원으로 한강 돗자리를 응원해 주세요. 후원은 자유예요.</p>
        <div class="row"><button class="go" id="bbPay">💛 후원하기</button></div><div class="row"><button id="bbNew">닫기</button></div>`);
      box.querySelector("#bbPay").onclick = () => { if (cfg.donate) window.open(cfg.donate, "_blank", "noopener"); else cfg.toast("후원 창구를 준비 중이에요", 2500); };
      box.querySelector("#bbNew").onclick = () => { myCode = null; box.classList.remove("on"); };
      return;
    }
    openBoxHTML("bb", `<h3>💌 한강 전광판에 한 줄 띄우기</h3>
      <p>쓰면 바로 유람선과 남산타워 전광판에 올라가서 <b>24시간</b> 동안 순서대로 떠요. 생일 축하, 고백, 기념일 한마디 같은 거요.</p>
      <textarea id="bbEd" rows="2" maxlength="30" placeholder="예) 지은아 생일 축하해 🎂"></textarea><small id="bbCnt" style="text-align:right">0 / 30</small>
      <small>한 사람이 10분에 한 번 올릴 수 있어요. 욕설·광고·연락처는 올라가지 않아요.</small>
      <div class="row"><button class="go" id="bbGo">전광판에 올리기</button></div>`);
    const ed = box.querySelector("#bbEd"); ed.oninput = () => box.querySelector("#bbCnt").textContent = `${[...ed.value].length} / 30`; setTimeout(() => ed.focus(), 60);
    box.querySelector("#bbGo").onclick = () => { const v = ed.value.trim(); if (!v) return cfg.toast("한 줄이라도 적어 주세요", 2000); cfg.send({ t: "bbReq", text: v }); };
  }
  function openStarInfo() {
    openBoxHTML("star", `<h3>✨ 별빛 코스</h3>
      <p>유람선은 누구나 무료로 타요. 💛 응원 폭죽을 쏜 날에는 하루 동안 <b>별빛 코스</b>가 열려요.</p>
      <p>· 유람선: 가는 내내 강 위 불꽃놀이와 별똥별, 반포대교 무지개분수가 늘 켜져요<br>· 남산타워: 한강 위로 올라가는 불꽃을 내려다봐요<br>· 오늘 응원해 준 분 이름은 전광판과 마주 오는 배 현수막에 모두에게 보여요</p>
      <div class="row"><button class="go" id="stSup">💛 응원하러 가기</button></div>`);
    box.querySelector("#stSup").onclick = () => { box.classList.remove("on"); if (cfg.openSup) cfg.openSup(); };
  }
  function openAdmin() {
    const live = bbLive.map(x => `<div class="it"><div>${esc(x.text)}<br><small>${x.by ? esc(x.by) + " · " : ""}${Math.max(0, Math.round((x.until - Date.now()) / 3600e3))}시간 남음</small></div><button data-del="${esc(x.id)}">내리기</button></div>`).join("") || "<small>지금 떠 있는 사연이 없어요</small>";
    openBoxHTML("bbAdmin", `<h3>👑 전광판 관리</h3><p>사연은 쓰면 바로 순서대로 올라가요. 이상한 글만 내려 주세요.</p>${live}
      <p style="margin-top:14px"><b>운영자 바로 띄우기</b></p><input id="bbPut" maxlength="40" placeholder="공지·이벤트 한 줄"><div class="row"><button class="go" id="bbPutGo">바로 띄우기</button></div>
      <div class="row"><button id="bbAsUser">사용자 화면 보기</button></div>`);
    box.querySelectorAll("[data-del]").forEach(b => b.onclick = () => cfg.send({ t: "bbDel", id: b.dataset.del }));
    box.querySelector("#bbPutGo").onclick = () => { const v = box.querySelector("#bbPut").value.trim(); if (v) cfg.send({ t: "bbPut", text: v }); };
    box.querySelector("#bbAsUser").onclick = () => openBB();
  }
  T.openBBForm = () => { if (!T.isOpen) T.open("cruise"); openBB(); };
  T.openAdmin = () => { if (!T.isOpen) T.open("cruise"); openAdmin(); };

  // 전광판에 돌아가며 뜨는 글: 승인된 사연(우선) → 오늘의 응원자 → 기본 문구. 시계로 정해서 모두 같은 글을 같이 본다
  function bbLines() {
    const L = bbLive.map(x => x.text + (x.by ? `  — ${x.by}` : ""));
    if (supDay.length) L.push("💛 오늘의 응원  " + supDay.slice(-8).join(" · ") + "  고마워요");
    L.push(L.length ? "💌 이 전광판에 내 사연을 띄울 수 있어요" : "오늘 하루도 수고했어요 🌙", L.length > 2 ? "🌙 오늘 밤도 한강에서 쉬어 가요" : "💌 이 전광판에 내 사연을 띄울 수 있어요");
    return L;
  }
  const bbNow = T.bbNow = () => { const L = bbLines(), k = Math.floor(Date.now() / 9000); return { text: L[k % L.length], age: (Date.now() % 9000) / 1000, k }; };

  // ---------- 카메라 ----------
  let yaw = 0, pitch = 0, tYaw = 0, tPitch = 0, zoom = 1, tZoom = 1, F = 400, CX = 0, CY = 0, camY = 4, camX = 0, camZ = 0, cyw = 1, syw = 0, cpt = 1, spt = 0, roll = 0;
  let skyUp = false, starOn = false, idleAt = 0;
  let PX = 0, PY = 0, PZ = 0;
  const deck = () => !!mode && mode !== "cruise";
  const basePitch = () => deck() ? (glState === 2 ? D.pitch : -5) * RAD : (H > W ? 11 : 4) * RAD;
  function clampView() {
    if (mode === "cruise") { tYaw = clamp(tYaw, -100 * RAD, 100 * RAD); tPitch = clamp(tPitch, -22 * RAD, 82 * RAD); }
    else tPitch = clamp(tPitch, ((D && D.minP) || -55) * RAD, 70 * RAD);
  }
  function resize() {
    const r = Math.min(window.devicePixelRatio || 1, 2); DPR = r * qual;
    W = innerWidth; H = innerHeight; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    refl = null;
  }
  let qual = 1, slow = 0;
  // 세상 좌표(x 오른쪽, y 위, z 앞) → 화면. 카메라 뒤면 false
  function prj(x, y, z) {
    x -= camX; z -= camZ; const dy = y - camY, x1 = x * cyw - z * syw, z1 = x * syw + z * cyw, y2 = dy * cpt - z1 * spt, z2 = dy * spt + z1 * cpt;
    if (z2 < .4) return false; const k = F / z2; PX = CX + x1 * k; PY = CY - y2 * k; PZ = z2; return true;
  }
  function dirp(vx, vy, vz) {
    const x1 = vx * cyw - vz * syw, z1 = vx * syw + vz * cyw, y2 = vy * cpt - z1 * spt, z2 = vy * spt + z1 * cpt;
    if (z2 < .06) return false; const k = F / z2; PX = CX + x1 * k; PY = CY - y2 * k; return true;
  }
  const elY = e => CY - Math.tan(clamp(e - pitch, -1.45, 1.45)) * F;   // 그 높이(앙각)가 화면 가운데 줄에서 몇 번째 줄인지
  // 앞면이 보이는 다각형만 그린다(가까운 면 자르기 포함)
  const CLIP = [];
  function poly(pts, fill) {
    let n = 0, first = true, px0 = 0, py0 = 0, prevOk = false, pz = 0;
    // 카메라 공간으로 바꾼 뒤 z>0.5 로 자른다
    const cam = [];
    for (let i = 0; i < pts.length; i += 3) { const x = pts[i] - camX, y = pts[i + 1] - camY, z = pts[i + 2] - camZ; const x1 = x * cyw - z * syw, z1 = x * syw + z * cyw; cam.push(x1, y * cpt - z1 * spt, y * spt + z1 * cpt); }
    CLIP.length = 0; const m = cam.length / 3;
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % m, az = cam[i * 3 + 2], bz = cam[j * 3 + 2], ain = az > .5, bin = bz > .5;
      if (ain) CLIP.push(cam[i * 3], cam[i * 3 + 1], az);
      if (ain !== bin) { const t = (.5 - az) / (bz - az); CLIP.push(cam[i * 3] + (cam[j * 3] - cam[i * 3]) * t, cam[i * 3 + 1] + (cam[j * 3 + 1] - cam[i * 3 + 1]) * t, .5); }
    }
    if (CLIP.length < 9) return false;
    g.beginPath();
    for (let i = 0; i < CLIP.length; i += 3) { const k = F / CLIP[i + 2], sx = CX + CLIP[i] * k, sy = CY - CLIP[i + 1] * k; i ? g.lineTo(sx, sy) : g.moveTo(sx, sy); }
    g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } return true;
  }

  // ---------- 하늘 (두 장면 공통) ----------
  let stars = null, milky = null, milkyTex = null, milkyDust = null, starDot = null, starSpk = null, glowS = {}, moonS = null, cloudS = [];
  const SCOL = ["175,200,255", "240,244,255", "255,244,220", "255,210,160", "255,170,140"];
  function glowSprite(col) {
    if (glowS[col]) return glowS[col];
    const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, `rgba(${col},1)`); gr.addColorStop(.18, `rgba(${col},.55)`); gr.addColorStop(.5, `rgba(${col},.12)`); gr.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return glowS[col] = c;
  }
  function makeSky() {
    if (stars) return;
    const r = rng(2024);
    // 별: 1800개. 밝기는 거듭제곱 분포(어두운 별이 훨씬 많음), 색은 온도별(푸른 흰색·흰색·노란 흰색·주황·붉은색)
    const N = 1800; stars = new Float32Array(N * 7);
    for (let i = 0; i < N; i++) {
      const az = r() * TAU, el = Math.asin(.02 + r() * .98), b = Math.pow(r(), 4.2), cr = r();
      const col = cr < .22 ? 0 : cr < .62 ? 1 : cr < .84 ? 2 : cr < .96 ? 3 : 4;
      stars.set([Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az), b, col, r() * TAU, .6 + r() * 2.2], i * 7);
    }
    // 아주 밝은 별 몇 개(빛살 있는 별) — 일부러 높게, 잘 보이는 곳에
    for (let i = 0; i < 9; i++) { const o = (i * 97 % N) * 7, az = (-80 + i * 23 + (i % 3) * 7) * RAD, el = (16 + (i * 29) % 55) * RAD; stars.set([Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az), .975 + r() * .025, [0, 1, 2, 3, 0, 1, 4][i % 7]], o); }
    // 별 그림: 색마다 둥근 점 + 밝은 별용 빛살(대각 4줄 + 후광)
    starDot = SCOL.map(c => { const cv2 = document.createElement("canvas"); cv2.width = cv2.height = 16; const x = cv2.getContext("2d"), gr = x.createRadialGradient(8, 8, 0, 8, 8, 8); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.25, `rgba(${c},.9)`); gr.addColorStop(.6, `rgba(${c},.18)`); gr.addColorStop(1, `rgba(${c},0)`); x.fillStyle = gr; x.fillRect(0, 0, 16, 16); return cv2; });
    starSpk = SCOL.map(c => { const cv2 = document.createElement("canvas"); cv2.width = cv2.height = 128; const x = cv2.getContext("2d");
      let gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, `rgba(${c},.55)`); gr.addColorStop(.08, `rgba(${c},.22)`); gr.addColorStop(.3, `rgba(${c},.05)`); gr.addColorStop(1, `rgba(${c},0)`); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
      for (const [dx, dy, L] of [[1, 0, 60], [0, 1, 60], [.707, .707, 26], [.707, -.707, 26]]) { const lg = x.createLinearGradient(64 - dx * L, 64 - dy * L, 64 + dx * L, 64 + dy * L); lg.addColorStop(0, `rgba(${c},0)`); lg.addColorStop(.5, `rgba(255,255,255,.85)`); lg.addColorStop(1, `rgba(${c},0)`); x.strokeStyle = lg; x.lineWidth = L > 30 ? 1.3 : .9; x.beginPath(); x.moveTo(64 - dx * L, 64 - dy * L); x.lineTo(64 + dx * L, 64 + dy * L); x.stroke(); }
      gr = x.createRadialGradient(64, 64, 0, 64, 64, 7); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, `rgba(${c},0)`); x.fillStyle = gr; x.fillRect(57, 57, 14, 14); return cv2; });
    // 은하수: 기울어진 큰 원. 띠 그림(빛 구름 + 별가루 + 가운데 어두운 먼지 줄)을 만들어 원을 따라 조각조각 붙인다
    const D3 = (az, el) => [Math.cos(el * RAD) * Math.sin(az * RAD), Math.sin(el * RAD), Math.cos(el * RAD) * Math.cos(az * RAD)];
    const u = D3(-75, 4), w0 = D3(35, 58), dt0 = u[0] * w0[0] + u[1] * w0[1] + u[2] * w0[2];   // 왼쪽 지평선에서 앞쪽 높은 하늘로 걸치게
    let v = [w0[0] - u[0] * dt0, w0[1] - u[1] * dt0, w0[2] - u[2] * dt0]; const vl = Math.hypot(...v); v = v.map(c => c / vl);
    const ax = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    milky = { u, v, ax };
    const BW = 2048, BH = 256, band = document.createElement("canvas"); band.width = BW; band.height = BH; const x = band.getContext("2d");
    const blob = (px, py, rr, col, a) => { const gr2 = x.createRadialGradient(px, py, 0, px, py, rr); gr2.addColorStop(0, `rgba(${col},${a})`); gr2.addColorStop(1, `rgba(${col},0)`); x.fillStyle = gr2; x.fillRect(px - rr, py - rr, rr * 2, rr * 2); };
    for (let i = 0; i < 520; i++) { const px = r() * BW, off = (r() + r() + r() - 1.5) * BH * .3, k = .6 + .4 * Math.sin(px / BW * TAU * 3 + 1); blob(px, BH / 2 + off, 18 + r() * 46, ["170,160,235", "150,175,240", "220,170,225", "160,215,230", "255,215,190"][r() * 5 | 0], .05 * k); }
    x.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 260; i++) { const px = r() * BW, py = BH / 2 + Math.sin(px / 140) * 12 + (r() - .5) * 26, rr = 6 + r() * 20, gr2 = x.createRadialGradient(px, py, 0, px, py, rr); gr2.addColorStop(0, "rgba(0,0,0,.35)"); gr2.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gr2; x.fillRect(px - rr, py - rr, rr * 2, rr * 2); }
    x.globalCompositeOperation = "source-over";
    // 위아래 가장자리를 부드럽게
    const fe = x.createLinearGradient(0, 0, 0, BH); fe.addColorStop(0, "rgba(0,0,0,1)"); fe.addColorStop(.3, "rgba(0,0,0,0)"); fe.addColorStop(.7, "rgba(0,0,0,0)"); fe.addColorStop(1, "rgba(0,0,0,1)");
    x.globalCompositeOperation = "destination-out"; x.fillStyle = fe; x.fillRect(0, 0, BW, BH); x.globalCompositeOperation = "source-over";
    milkyTex = band;
    // 은하수 별가루: 띠를 따라 촘촘한 작은 별(방향으로 저장해서 늘어나지 않게)
    const MD = 3000; milkyDust = new Float32Array(MD * 4);
    for (let i = 0; i < MD; i++) { const a = r() * TAU, w = (r() + r() + r() + r() - 2) * .13, ca = Math.cos(a), sa = Math.sin(a); let px = u[0] * ca + v[0] * sa + ax[0] * w, py = u[1] * ca + v[1] * sa + ax[1] * w, pz = u[2] * ca + v[2] * sa + ax[2] * w; const l = Math.hypot(px, py, pz); milkyDust.set([px / l, py / l, pz / l, r()], i * 4); }
    // 달
    const c = document.createElement("canvas"); c.width = c.height = 256; const m = c.getContext("2d");
    let gr = m.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, "rgba(255,240,210,.5)"); gr.addColorStop(.12, "rgba(255,240,210,.22)"); gr.addColorStop(.35, "rgba(200,190,230,.07)"); gr.addColorStop(1, "rgba(200,190,230,0)");
    m.fillStyle = gr; m.fillRect(0, 0, 256, 256);
    gr = m.createRadialGradient(122, 122, 0, 128, 128, 22); gr.addColorStop(0, "#fffbf0"); gr.addColorStop(1, "#eadcbc"); m.fillStyle = gr; m.beginPath(); m.arc(128, 128, 22, 0, TAU); m.fill();
    m.fillStyle = "rgba(180,165,130,.3)"; [[-7, -5, 5], [6, 4, 7], [2, -10, 3.4], [-4, 9, 3]].forEach(([a, b, s]) => { m.beginPath(); m.arc(128 + a, 128 + b, s, 0, TAU); m.fill(); });
    moonS = c;
    // 구름: 달빛에 가장자리가 밝은 얇은 구름
    for (let k = 0; k < 4; k++) {
      const cc = document.createElement("canvas"); cc.width = 360; cc.height = 90; const x = cc.getContext("2d");
      for (let i = 0; i < 22; i++) {
        const px = 40 + r() * 280, py = 40 + (r() - .5) * 26, rr = 16 + r() * 26, gr2 = x.createRadialGradient(px, py, 0, px, py, rr);
        gr2.addColorStop(0, "rgba(170,165,215,.16)"); gr2.addColorStop(1, "rgba(170,165,215,0)"); x.fillStyle = gr2; x.save(); x.translate(px, py); x.scale(2.2, 1); x.beginPath(); x.arc(0, 0, rr, 0, TAU); x.restore(); x.fill();
      }
      cloudS.push({ c: cc, az: r() * TAU, el: (9 + r() * 20) * RAD, v: (.04 + r() * .05) * RAD, s: .8 + r() * .7 });
    }
  }
  const MOON = { cruise: [24 * RAD, 26 * RAD], tower: [208 * RAD, 24 * RAD], sky63: [96 * RAD, 30 * RAD], sky123: [250 * RAD, 30 * RAD], lounge: [20 * RAD, 28 * RAD] };
  function drawSky(t, top, horizon, glowCol) {
    const y0 = elY(0), y1 = elY(70 * RAD);
    const gr = g.createLinearGradient(0, y0, 0, Math.min(y1, y0 - 10));
    gr.addColorStop(0, horizon); gr.addColorStop(.12, "#2a2153"); gr.addColorStop(.38, "#141a46"); gr.addColorStop(1, top);
    g.fillStyle = gr; g.fillRect(-W, -H, W * 3, Math.max(0, y0 + 2 + H));
    // 은하수: 원을 36조각으로 나눠 띠 그림을 이어 붙인다(조각마다 화면에서의 방향·길이에 맞춰 돌려 그림)
    g.globalCompositeOperation = "lighter";
    { const { u, v, ax } = milky, NS = 60, bw = 17 * RAD, TW = milkyTex.width, TH = milkyTex.height; const P = (a, w) => { const ca = Math.cos(a), sa = Math.sin(a); return [u[0] * ca + v[0] * sa + ax[0] * w, u[1] * ca + v[1] * sa + ax[1] * w, u[2] * ca + v[2] * sa + ax[2] * w]; };
      for (let k = 0; k < NS; k++) {
        const a0 = k / NS * TAU, a1 = (k + 1) / NS * TAU, p0 = P(a0, 0), p1 = P(a1, 0); if (p0[1] < -.05 && p1[1] < -.05) continue;
        if (!dirp(p0[0], p0[1], p0[2])) continue; const x0 = PX, y0 = PY; if (!dirp(p1[0], p1[1], p1[2])) continue; const x1 = PX, y1 = PY;
        const pw = P((a0 + a1) / 2, bw); const mx = (x0 + x1) / 2, my = (y0 + y1) / 2; if (!dirp(pw[0], pw[1], pw[2])) continue; const hw = Math.hypot(PX - mx, PY - my);
        const len = Math.hypot(x1 - x0, y1 - y0); if (len > W * 3 || hw > H * 2) continue;
        const elv = Math.max(0, Math.min(1, (p0[1] + p1[1]) * 3));
        g.save(); g.translate(mx, my); g.rotate(Math.atan2(y1 - y0, x1 - x0)); g.globalAlpha = .95 * elv;
        g.drawImage(milkyTex, k / NS * TW, 0, TW / NS, TH, -len * .56, -hw, len * 1.12, hw * 2); g.restore();
      }
      g.globalAlpha = 1; }
    { const md = milkyDust, n2 = md.length / 4; for (let i = 0; i < n2; i++) { const o = i * 4; if (md[o + 1] < .02 || !dirp(md[o], md[o + 1], md[o + 2])) continue; if (PX < 0 || PX > W || PY < 0 || PY > H) continue; const b = md[o + 3]; g.fillStyle = `rgba(235,232,255,${(.1 + b * .4) * Math.min(1, md[o + 1] * 5)})`; const sz = b > .96 ? 1.6 : 1; g.fillRect(PX, PY, sz, sz); } }
    // 별: 둥근 점(색별), 밝은 별은 빛살 + 천천히 반짝임
    const s = stars, ns = s.length / 7, sk = clamp(F / 420, .8, 1.25);
    for (let i = 0; i < ns; i++) {
      const o = i * 7; if (!dirp(s[o], s[o + 1], s[o + 2])) continue;
      if (PX < -30 || PX > W + 30 || PY < -30 || PY > H + 30) continue;
      const b = s[o + 3], ci = s[o + 4], low = Math.min(1, s[o + 1] * 5);
      const tw = 1 - (.18 + b * .25) * (.5 + .5 * Math.sin(t * s[o + 6] + s[o + 5])) * (.6 + .4 * Math.sin(t * 3.7 * s[o + 6] + i));
      const a = (.22 + b * .78) * tw * low;
      if (b > .975) { const z = (10 + b * 9) * sk * (.9 + .1 * tw); g.globalAlpha = a; g.drawImage(starSpk[ci], PX - z, PY - z, z * 2, z * 2); continue; }
      const z = (.9 + b * 3.4) * sk; g.globalAlpha = a; g.drawImage(starDot[ci], PX - z, PY - z, z * 2, z * 2);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    // 구름
    for (const c of cloudS) {
      c.az += c.v * .016; const ca = Math.cos(c.el);
      if (!dirp(ca * Math.sin(c.az), Math.sin(c.el), ca * Math.cos(c.az))) continue;
      const w = F * .9 * c.s, h = w / 4; g.globalAlpha = .9; g.drawImage(c.c, PX - w / 2, PY - h / 2, w, h); g.globalAlpha = 1;
    }
    // 달
    const [ma, me] = MOON[mode];
    if (dirp(Math.cos(me) * Math.sin(ma), Math.sin(me), Math.cos(me) * Math.cos(ma))) { const ms = F * .5; g.drawImage(moonS, PX - ms / 2, PY - ms / 2, ms, ms); }
    // 지평선 근처 도시 불빛이 하늘에 번진 빛
    const hg = g.createLinearGradient(0, y0 - F * .22, 0, y0 + 2);
    hg.addColorStop(0, `rgba(${glowCol},0)`); hg.addColorStop(1, `rgba(${glowCol},.28)`);
    g.fillStyle = hg; g.fillRect(-W, y0 - F * .22, W * 3, F * .22 + 2);
  }

  // ---------- 별똥별 · 불꽃 (두 장면 공통) ----------
  const meteors = [], fws = [];
  let nextMet = 3;
  function spawnMeteor(az, el) {
    az = az == null ? yaw + (Math.random() - .5) * 1.2 : az; el = el == null ? (25 + Math.random() * 35) * RAD : el;
    (glState === 2 ? glMet : meteors).push({ az, el, daz: (Math.random() < .5 ? -1 : 1) * (.25 + Math.random() * .25), del: -(.18 + Math.random() * .2), life: 0, dur: .9 + Math.random() * .8, gold: Math.random() < .2 });
  }
  function drawMeteors(dt) {
    nextMet -= dt; if (nextMet < 0) { spawnMeteor(); nextMet = starOn ? .9 + Math.random() * 2 : 7 + Math.random() * 12; }
    g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i]; m.life += dt; const p = m.life / m.dur; if (p > 1) { meteors.splice(i, 1); continue; }
      const az = m.az + m.daz * m.life, el = m.el + m.del * m.life, ce = Math.cos(el);
      if (!dirp(ce * Math.sin(az), Math.sin(el), ce * Math.cos(az))) continue; const hx = PX, hy = PY;
      const az2 = az - m.daz * .22, el2 = el - m.del * .22, c2 = Math.cos(el2); if (!dirp(c2 * Math.sin(az2), Math.sin(el2), c2 * Math.cos(az2))) continue;
      const a = Math.sin(p * Math.PI), gr = g.createLinearGradient(hx, hy, PX, PY), col = m.gold ? "255,220,150" : "220,235,255";
      gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`); g.strokeStyle = gr; g.lineWidth = 2.2; g.beginPath(); g.moveTo(hx, hy); g.lineTo(PX, PY); g.stroke();
      g.globalAlpha = a; g.drawImage(glowSprite(col), hx - 9, hy - 9, 18, 18); g.globalAlpha = 1;
    }
    g.globalCompositeOperation = "source-over";
  }
  const FWC = ["255,120,140", "255,210,120", "140,210,255", "180,255,190", "230,160,255", "255,255,255"];
  // 불꽃: 세상 좌표에서 터진다(유람선은 앞쪽 강 위, 남산은 한강 위)
  function fwLaunch(gold) {
    if (glState === 2) { glFw.push(!!gold); return; }
    const r = Math.random;
    const p = mode === "cruise" ? { x: (r() - .5) * 700, y: 0, z: 700 + r() * 900 } : (() => { const x = mode === "sky63" || mode === "sky123" ? D.x + (r() - .5) * 3600 : (r() - .5) * 9000, rz = riverZ(x); return { x, y: 0, z: rz + (r() - .5) * 300 }; })();
    const h = mode === "cruise" ? 160 + r() * 150 : mode === "sky63" ? 150 + r() * 150 : 260 + r() * 220;
    fws.push({ x: p.x, z: p.z, y: 0, h, vy: 0, up: true, t: 0, col: gold ? "255,215,130" : FWC[r() * FWC.length | 0], col2: FWC[r() * FWC.length | 0], gold, parts: null, size: (mode === "cruise" ? 70 : 130) * (.8 + r() * .5) });
  }
  function drawFws(dt, mirror) {
    g.globalCompositeOperation = "lighter";
    for (let i = fws.length - 1; i >= 0; i--) {
      const f = fws[i];
      if (!mirror) f.t += dt;
      if (f.up) {
        const p = Math.min(1, f.t / 1.6), y = f.h * (1 - (1 - p) * (1 - p));
        if (!mirror && p >= 1) { f.up = false; f.t = 0; const n = f.gold ? 90 : 70; f.parts = []; for (let k = 0; k < n; k++) { const a = Math.random() * TAU, b = Math.acos(2 * Math.random() - 1); f.parts.push([Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a), k % 3 === 0 ? 1 : 0]); } }
        if (prj(f.x, mirror ? -y : y, f.z)) { const s = Math.max(2, F * 6 / PZ); g.drawImage(glowSprite("255,220,170"), PX - s, PY - s, s * 2, s * 2); }
        continue;
      }
      const p = f.t / 2.6; if (p > 1) { if (!mirror) fws.splice(i, 1); continue; }
      const R = f.size * (1 - Math.pow(1 - Math.min(1, p * 1.6), 3)), fall = 30 * p * p, a = (1 - p) * (mirror ? .35 : 1);
      for (const q2 of f.parts) {
        const y = f.h + q2[1] * R - fall; if (!prj(f.x + q2[0] * R, mirror ? -y : y, f.z + q2[2] * R)) continue;
        const s = Math.max(1.4, F * (f.gold ? 3.2 : 2.6) / PZ) * (mirror ? 1.6 : 1);
        g.globalAlpha = a * (.6 + .4 * Math.sin(f.t * 30 + q2[0] * 9)); g.drawImage(glowSprite(q2[3] ? f.col2 : f.col), PX - s, PY - s * (mirror ? 2.2 : 1), s * 2, s * (mirror ? 4.4 : 2));
      }
      if (!mirror && p < .25 && prj(f.x, f.h, f.z)) { const s = F * 120 / PZ; g.globalAlpha = (.25 - p) * 1.2; g.drawImage(glowSprite(f.col), PX - s, PY - s, s * 2, s * 2); }
      g.globalAlpha = 1;
    }
    g.globalCompositeOperation = "source-over";
  }
  let nextFw = 2;
  function fwTick(dt) {
    const show = Date.now() % 3600e3 < 48e3;   // 01의 매시 정각 불꽃놀이와 같은 때
    nextFw -= dt;
    if (nextFw < 0) { if (show || starOn) fwLaunch(false); nextFw = show ? .5 + Math.random() * .7 : starOn ? 2.2 + Math.random() * 3 : 1; }
  }

  // ====================== 🚢 유람선 ======================
  const R = 250, LEN = 9200, SPEED = 10.5;   // 강 반폭(m), 한 바퀴 길이(m), 배 속도(m/s, 약 38km/h)
  const BRIDGES = [
    { z: 900, name: "마포대교", type: "plain", col: "150,200,255", lamp: "235,240,255" },
    { z: 2050, name: "원효대교", type: "plain", col: "255,170,110", lamp: "255,205,140" },
    { z: 3050, name: "한강철교", type: "truss", col: "120,170,230", lamp: "200,215,255" },
    { z: 3700, name: "한강대교", type: "arch", col: "255,200,120", lamp: "255,215,150" },
    { z: 4950, name: "동작대교", type: "arch2", col: "170,150,255", lamp: "220,210,255" },
    { z: 6300, name: "반포대교", type: "fountain", col: "120,220,255", lamp: "235,240,255" },
    { z: 7750, name: "한남대교", type: "plain", col: "140,255,210", lamp: "235,245,255" },
  ];
  const PLACES = [[0, "여의도 선착장", "63빌딩과 여의도의 불빛"], [1500, "마포 · 여의도 사이", ""], [4300, "노들섬 근처", "한강 한가운데 작은 섬"], [5600, "남산이 보이는 곳", "왼쪽 위 남산서울타워"], [7100, "반포 한강공원", ""], [8500, "한남 · 압구정", "곧 다시 여의도로"]];
  let blds = null, atlas = null, cruiseOk = false, refl = null, rg = null;
  const wrapZ = z => { z %= LEN; return z < -300 ? z + LEN : z > LEN - 300 ? z - LEN : z; };
  const courseS = () => T.dbgS != null ? T.dbgS : (Date.now() / 1000 * SPEED) % LEN;

  // 건물 벽 무늬 지도(고해상도): 유리 커튼월 사무 빌딩 2종, 아파트 2종, 호텔·주상복합, 어두운 고급 타워 → [보통, 물에 비친(뒤집힌) 모습, 너비, 높이]
  // 먼 건물은 불투명도를 낮춰 뒤 하늘빛이 비치게 해서 공기 원근(안개)을 낸다
  const ACW = 10, ARH = 13, ACOLS = 24, AROWS = 64;
  function makeAtlas() {
    if (atlas) return;
    const r = rng(99); atlas = [];
    const AW = ACOLS * ACW, AH = AROWS * ARH;
    for (let s = 0; s < 6; s++) {
      const base = document.createElement("canvas"); base.width = AW; base.height = AH; const x = base.getContext("2d");
      const glass = s === 0 || s === 1 || s === 5, apt = s === 2 || s === 3;
      // 바탕: 유리는 하늘이 비친 세로 그라데이션 + 비스듬한 반사, 아파트는 무광 벽
      let gr = x.createLinearGradient(0, 0, 0, AH);
      if (s === 0) { gr.addColorStop(0, "#1c2b4a"); gr.addColorStop(.5, "#121c34"); gr.addColorStop(1, "#0b1226"); }
      else if (s === 1) { gr.addColorStop(0, "#2a2436"); gr.addColorStop(.5, "#1a1726"); gr.addColorStop(1, "#110f1b"); }
      else if (s === 5) { gr.addColorStop(0, "#151a2a"); gr.addColorStop(1, "#090b14"); }
      else if (apt) { gr.addColorStop(0, s === 2 ? "#23222e" : "#1e2230"); gr.addColorStop(1, s === 2 ? "#181722" : "#141824"); }
      else { gr.addColorStop(0, "#201c28"); gr.addColorStop(1, "#14111b"); }
      x.fillStyle = gr; x.fillRect(0, 0, AW, AH);
      if (glass) { const sh = x.createLinearGradient(0, 0, AW, AH * .35); sh.addColorStop(0, "rgba(160,180,255,0)"); sh.addColorStop(.45, "rgba(160,180,255,.07)"); sh.addColorStop(.55, "rgba(160,180,255,0)"); x.fillStyle = sh; x.fillRect(0, 0, AW, AH); }
      for (let row = 0; row < AROWS; row++) {
        const y = row * ARH;
        if (glass) {
          // 커튼월: 층마다 통째로 켜지거나(사무실) 꺼짐. 켜진 층은 천장 쪽이 밝은 은은한 띠, 자리마다 밝기가 조금씩 다르다
          const on = r() < (s === 5 ? .22 : s === 1 ? .38 : .5), cool = s !== 1, wide = r() < .7;
          if (on) {
            let c0 = 0; while (c0 < ACOLS) { const run = 2 + (r() * 9 | 0), lit = r() < (wide ? .9 : .55), a = .35 + r() * .45;
              if (lit) { const g2 = x.createLinearGradient(0, y + 1, 0, y + ARH - 2); const col = cool ? (r() < .8 ? "214,232,255" : "255,236,205") : "255,214,160"; g2.addColorStop(0, `rgba(${col},${a})`); g2.addColorStop(1, `rgba(${col},${a * .35})`); x.fillStyle = g2; x.fillRect(c0 * ACW, y + 1.5, Math.min(run, ACOLS - c0) * ACW, ARH - 3.5); }
              c0 += run; }
          } else if (r() < .3) { for (let c = 0; c < ACOLS; c++) if (r() < .12) { x.fillStyle = `rgba(${cool ? "200,220,255" : "255,210,150"},${.25 + r() * .4})`; x.fillRect(c * ACW + 1, y + 2, ACW - 2, ARH - 4); } }
          x.fillStyle = "rgba(0,0,0,.45)"; x.fillRect(0, y + ARH - 2, AW, 2);                // 층 사이 슬래브
          x.fillStyle = "rgba(255,255,255,.035)"; for (let c = 0; c <= ACOLS; c++) x.fillRect(c * ACW, y, 1, ARH);   // 세로 멀리언
        } else if (apt) {
          // 아파트: 두 칸이 한 집. 집마다 켜짐/꺼짐, 커튼 사이로 번지는 따뜻한 빛, 가끔 TV 푸른빛. 아래쪽 발코니 난간 선
          for (let c = 0; c < ACOLS; c += 2) {
            const lit = r() < (s === 2 ? .46 : .4), a = .45 + r() * .5;
            if (lit) {
              const col = r() < .07 ? "150,190,255" : s === 3 && r() < .45 ? "232,240,255" : `255,${200 + r() * 30 | 0},${135 + r() * 45 | 0}`;
              const g2 = x.createRadialGradient(c * ACW + ACW, y + ARH * .45, 1, c * ACW + ACW, y + ARH * .45, ACW * 1.3); g2.addColorStop(0, `rgba(${col},${a})`); g2.addColorStop(1, `rgba(${col},${a * .35})`);
              x.fillStyle = g2; x.fillRect(c * ACW + 1.5, y + 2, ACW * 2 - 3, ARH - 5);
              if (r() < .4) { x.fillStyle = "rgba(20,14,12,.35)"; x.fillRect(c * ACW + 1.5 + (r() < .5 ? 0 : ACW), y + 2, ACW - 1.5, ARH - 5); }   // 반쯤 친 커튼
            } else { x.fillStyle = "rgba(60,75,110,.16)"; x.fillRect(c * ACW + 1.5, y + 2, ACW * 2 - 3, ARH - 5); }
          }
          x.fillStyle = "rgba(170,175,195,.13)"; x.fillRect(0, y + ARH - 3, AW, 1.2);          // 발코니 난간
          x.fillStyle = "rgba(0,0,0,.3)"; for (let c = 0; c <= ACOLS; c += 2) x.fillRect(c * ACW, y, 1.2, ARH);
        } else {
          // 호텔·주상복합: 세로로 긴 창, 따뜻한 빛과 하얀 빛이 섞임
          for (let c = 0; c < ACOLS; c++) {
            if (c % 3 === 2) continue; const lit = r() < .42, a = .4 + r() * .5;
            x.fillStyle = lit ? (r() < .65 ? `rgba(255,${210 + r() * 25 | 0},${150 + r() * 40 | 0},${a})` : `rgba(225,235,255,${a})`) : "rgba(70,80,120,.14)";
            x.fillRect(c * ACW + 2, y + 2, ACW - 3, ARH - 4);
          }
          x.fillStyle = "rgba(0,0,0,.35)"; x.fillRect(0, y + ARH - 1.5, AW, 1.5);
        }
      }
      const rf = document.createElement("canvas"); rf.width = AW; rf.height = AH; const y2 = rf.getContext("2d"); y2.translate(0, AH); y2.scale(1, -1); y2.drawImage(base, 0, 0);
      atlas.push([base, rf, AW, AH]);
    }
  }
  function makeCruise() {
    makeSky(); makeAtlas();
    if (cruiseOk) return; cruiseOk = true;
    const r = rng(7); blds = [];
    const nearBridge = z => BRIDGES.some(b => Math.abs(b.z - z) < 70);
    // 스타일: 0·1 유리 사무 빌딩, 2·3 아파트, 4 호텔·주상복합, 5 어두운 고급 타워
    const mk = (sd, x0, d, z0, w, h, far) => {
      const tall = h > 110, st = tall ? [0, 1, 5, 0, 4][r() * 5 | 0] : [2, 3, 2, 4, 0, 3][r() * 6 | 0];
      const b = { sd, x0, d, z0, w, h, s: st, u: r(), v: r(), yb: 7, far };
      if (tall && r() < .55) b.tier = .62 + r() * .2;                                                           // 위쪽이 좁아지는 탑
      b.crown = tall && r() < .6 ? (r() < .55 ? "255,214,150" : "225,236,255") : !tall && st >= 2 && st <= 3 && r() < .25 ? "235,240,255" : null;   // 꼭대기 테두리 조명
      b.edge = tall && st !== 2 && st !== 3 && r() < .35;                                                       // 모서리 세로 조명선
      b.av = h > 95; b.ph = r() * 6;
      blds.push(b);
    };
    for (let z = 0; z < LEN; z += 46) for (const sd of [-1, 1]) {
      const zone = (z / LEN * 7 + (sd > 0 ? 3 : 0)) % 7, tallK = zone < 1.2 ? 1.6 : zone > 5 ? 1.25 : 1;
      if (!nearBridge(z) && r() < .78) mk(sd, R + 70 + r() * 40, 24 + r() * 30, z + r() * 8, 22 + r() * 22, (30 + r() * r() * 90) * tallK);
      if (r() < .7) mk(sd, R + 190 + r() * 240, 30 + r() * 40, z + r() * 20, 26 + r() * 28, (50 + r() * r() * 150) * tallK);
      if (r() < .42) mk(sd, R + 550 + r() * 700, 40, z + r() * 30, 30 + r() * 40, (80 + r() * r() * 200) * tallK, 1);
    }
    blds.push({ sd: 1, x0: R + 260, d: 50, z0: 260, w: 46, h: 250, gold: 1, yb: 7, s: 0, u: 0, v: 0 });   // 63빌딩
  }
  // 벽 한 면: 바닥 선 (ax,az)→(bx,bz), 높이 y0~y1. 세로 띠 n개로 잘라 원근을 흉내낸다
  function facade(img, sx, sy, sw, sh, ax, az, bx, bz, y0, y1, n) {
    let pxa = 0, ta = 0, ba = 0, oka = false;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      let ok = prj(x, y0, z); const pb = PY, px = PX; ok = ok && prj(x, y1, z); const pt = PY;
      if (i > 0 && ok && oka) {
        if (px <= pxa) return false;   // 뒷면
        if (px > -2 && pxa < W + 2) {
          const top = (pt + ta) / 2, bot = (pb + ba) / 2;
          if (bot > top) g.drawImage(img, sx + sw * (i - 1) / n, sy, sw / n, sh, pxa, top, px - pxa + .7, bot - top);
          else g.drawImage(img, sx + sw * (i - 1) / n, sy, sw / n, sh, pxa, bot, px - pxa + .7, top - bot);
        }
      }
      pxa = px; ta = pt; ba = pb; oka = ok;
    }
    return true;
  }
  const line3 = (x1, y1, z1, x2, y2, z2, col, w) => { if (!prj(x1, y1, z1)) return; const ax = PX, ay = PY; if (!prj(x2, y2, z2)) return; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(ax, ay); g.lineTo(PX, PY); g.stroke(); };
  function drawBuilding(b, rz, dist, mirror) {
    if (b.gold) return drawGold(b, rz, mirror);
    if (b.tier) {   // 아래 몸통 + 안쪽으로 물러난 윗부분
      const h1 = b.h * b.tier;
      drawBox(b, b.x0, b.d, rz, b.w, b.yb, h1, dist, mirror, false);
      const ix = b.d * .18, iw = b.w * .18;
      drawBox(b, b.x0 + ix, b.d - ix * 1.6, rz + iw, b.w - iw * 2, b.yb + h1, b.h - h1, dist, mirror, true);
    } else drawBox(b, b.x0, b.d, rz, b.w, b.yb, b.h, dist, mirror, true);
  }
  function drawBox(b, X0, D, rz, Wd, yb0, h, dist, mirror, top) {
    const sd = b.sd, x0 = sd * X0, x1 = sd * (X0 + D), z0 = rz, z1 = rz + Wd, yb = mirror ? -yb0 : yb0, yt = mirror ? -(yb0 + h) : yb0 + h;
    const A = atlas[b.s], img = A[mirror ? 1 : 0], AH = A[3];
    const cols = Math.min(ACOLS, Math.max(3, Math.round(Wd / 3.6))), dcols = Math.min(ACOLS, Math.max(3, Math.round(D / 3.6))), rows = Math.min(AROWS, Math.max(4, Math.round(h / 3.4)));
    const sx = Math.floor(b.u * (ACOLS - cols)) * ACW, sy0 = Math.floor(b.v * (AROWS - rows)) * ARH, sy = mirror ? AH - sy0 - rows * ARH : sy0;
    const nStr = d => clamp(Math.round(F * d / dist / 22), 1, 12);
    const fog = clamp((dist - 500) / 2600, 0, .62);
    g.globalAlpha = (1 - fog) * (mirror ? .8 : 1);
    let front;
    if (sd > 0) { facade(img, sx, sy, cols * ACW, rows * ARH, x0, z1, x0, z0, yb, yt, nStr(Wd)); if (z0 > 0) front = facade(img, sx, sy, dcols * ACW, rows * ARH, x0, z0, x1, z0, yb, yt, nStr(D)); }
    else { facade(img, sx, sy, cols * ACW, rows * ARH, x0, z0, x0, z1, yb, yt, nStr(Wd)); if (z0 > 0) front = facade(img, sx, sy, dcols * ACW, rows * ARH, x1, z0, x0, z0, yb, yt, nStr(D)); }
    g.globalAlpha = 1;
    if (front) poly([x0, yb, z0, x1, yb, z0, x1, yt, z0, x0, yt, z0], `rgba(4,5,14,${.38 * (1 - fog)})`);   // 배 쪽 면은 조금 어둡게 → 입체감
    if (mirror) return;
    const k = 1 - fog;
    // 1~2층 상가 불빛 띠
    if (yb0 < 10 && dist < 1600) poly([x0, yb + .3, z0, x0, yb + .3, z1, x0, yb + 5, z1, x0, yb + 5, z0], `rgba(255,205,150,${.16 * k})`);
    if (!top) return;
    g.globalCompositeOperation = "lighter";
    const lw = Math.max(.8, F * .5 / Math.max(60, dist));
    if (b.crown) { const c = `rgba(${b.crown},${(.55 + .2 * Math.sin(tNow * .6 + b.ph)) * k})`; line3(x0, yt, z0, x0, yt, z1, c, lw * 1.4); if (z0 > 0) line3(x0, yt, z0, x1, yt, z0, c, lw * 1.4);
      if (dist < 2000 && prj(x0, yt + 2, (z0 + z1) / 2)) { const s = F * Wd * .7 / PZ; g.globalAlpha = .18 * k; g.drawImage(glowSprite(b.crown), PX - s, PY - s * .35, s * 2, s * .7); g.globalAlpha = 1; } }
    if (b.edge) { const c = `rgba(225,236,255,${.45 * k})`; line3(x0, yb + h * .05, z0, x0, yt, z0, c, lw); line3(x0, yb + h * .05, z1, x0, yt, z1, c, lw); }
    if (b.av && Math.sin(tNow * 2.2 + b.ph) > .45 && prj(x0, yt + 2, z0 + Wd / 2)) { const s = Math.max(2, F * 5 / PZ); g.drawImage(glowSprite("255,70,60"), PX - s, PY - s, s * 2, s * 2); }
    g.globalCompositeOperation = "source-over";
  }
  // 63빌딩: 금빛 유리, 위로 갈수록 살짝 좁아지고 층마다 금빛 띠
  function drawGold(b, rz, mirror) {
    const sd = b.sd, x0 = sd * b.x0, x1 = sd * (b.x0 + b.d), z0 = rz, z1 = rz + b.w, yb = mirror ? -b.yb : b.yb, yt = mirror ? -(b.yb + b.h) : b.yb + b.h, tp = mirror ? 12 : -12;
    for (const [ax, az, bx, bz] of [[x0, z1, x0, z0], [x0, z0, x1, z0]]) {
      if (!poly([ax, yb, az, bx, yb, bz, bx, yt, bz, ax, yt - tp, az], null)) continue;
      const y0 = PY_of(ax, yb, az), y1 = PY_of(ax, yt, az), gr = g.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(0, mirror ? "rgba(140,100,40,.4)" : "#7a5a24"); gr.addColorStop(.6, mirror ? "rgba(200,150,70,.35)" : "#c99a48"); gr.addColorStop(1, mirror ? "rgba(230,190,110,.3)" : "#f0cc80"); g.fillStyle = gr; g.fill();
    }
    if (mirror) return;
    g.globalCompositeOperation = "lighter";
    for (let y = b.yb + 4; y < b.yb + b.h; y += 5.5) line3(x0, y, z0, x0, y, z1, "rgba(255,225,160,.22)", Math.max(.6, F * .35 / Math.max(80, rz)));
    if (prj(x0, b.yb + b.h * .5, z0)) { const s = F * 80 / PZ; g.globalAlpha = .35; g.drawImage(glowSprite("255,200,110"), PX - s, PY - s * 1.6, s * 2, s * 3.2); g.globalAlpha = 1; }
    g.globalCompositeOperation = "source-over";
  }
  // 강둑 한 토막(길이 150m): 돌 둑, 나무, 강변 가로등, 강변도로 가로등과 차 불빛
  const BANKSEG = 150, LANES = [[-1, 1, 23, 52, "255,245,225"], [-1, -1, 19, 47, "255,70,60"], [1, 1, 21, 55, "255,245,225"], [1, -1, 24, 49, "255,70,60"]];
  function drawBank(sd, zw, rz, dist, mirror) {
    const x = sd * R, z0 = rz, z1 = rz + BANKSEG, ys = mirror ? -1 : 1;
    if (!mirror) {
      poly([x, -1, z0, x, 6.5, z0, x, 6.5, z1, x, -1, z1], "#0d1020");
      poly([x, 6.5, z0, x, 7.3, z0, x, 7.3, z1, x, 6.5, z1], "#262a3c");
      // 강변 나무 실루엣
      if (dist < 1600) for (let k = 0; k < 6; k++) { const tz = z0 + (k + hash(zw * 7 + k + sd * 99) * .8) * BANKSEG / 6, th = 5 + hash(zw * 13 + k) * 5; if (prj(sd * (R + 14), 7 + th, tz)) { const r2 = F * (3 + th * .25) / PZ; g.fillStyle = "#0a0d18"; g.beginPath(); g.ellipse(PX, PY + r2 * .4, r2 * 1.1, r2, 0, 0, TAU); g.fill(); } }
    }
    g.globalCompositeOperation = "lighter";
    // 강변 공원 가로등(따뜻한 빛) + 강변도로 가로등(주황)
    for (let k = 0; k < 5; k++) { const lz = z0 + k * 30 + 5; if (prj(sd * (R + 9), ys * 12, lz)) { const s = clamp(F * 2.4 / PZ, 1.6, 26); mirror ? g.drawImage(glowSprite("255,200,130"), PX - s * .7, PY - s * .5, s * 1.4, s * 5) : g.drawImage(glowSprite("255,210,150"), PX - s, PY - s, s * 2, s * 2); } }
    for (let k = 0; k < 4; k++) { const lz = z0 + k * 37.5 + 18; if (prj(sd * (R + 42), ys * 19, lz)) { const s = clamp(F * 3 / PZ, 1.4, 30); mirror ? g.drawImage(glowSprite("255,170,90"), PX - s * .6, PY - s * .4, s * 1.2, s * 4.6) : g.drawImage(glowSprite("255,175,95"), PX - s, PY - s, s * 2, s * 2); } }
    if (!mirror) {   // 차 불빛: 시계로 정해서 흐른다
      const tt = Date.now() / 1000;
      for (const [lsd, dir, v, gap, col] of LANES) {
        if (lsd !== sd) continue;
        const o = ((tt * v * dir) % gap + gap) % gap, wz0 = zw * BANKSEG, k0 = Math.ceil((wz0 - o) / gap), k1 = Math.floor((wz0 + BANKSEG - o) / gap);
        for (let k = k0; k <= k1; k++) {
          const wz = o + k * gap; if (hash(k * 31 + (dir > 0 ? 7 : 3) + sd * 5) < .3) continue;
          if (prj(sd * (R + 40 + (dir > 0 ? 0 : 6)), 9.2, rz + (wz - wz0))) { const s = clamp(F * 1.1 / PZ, .8, 9); g.fillStyle = `rgba(${col},.9)`; g.fillRect(PX - s, PY - s * .45, s * 2, s * .9); if (s > 2) { g.globalAlpha = .4; g.drawImage(glowSprite(col), PX - s * 3, PY - s * 3, s * 6, s * 6); g.globalAlpha = 1; } }
        }
      }
    }
    g.globalCompositeOperation = "source-over";
  }
  // 다리: 상판 앞면·밑면, 교각(교각 조명), 상판 아래 LED 띠, 난간 가로등, 다리마다 아치·트러스·분수
  function drawBridge(b, rz, mirror) {
    const B = R + 170, zf = rz - 7, zb2 = rz + 7, ys = mirror ? -1 : 1, t = tNow;
    // 교각
    for (let px = -R + 70; px <= R - 70; px += 105) {
      if (!mirror) {
        if (poly([px - 6, 0, zf + 2, px + 6, 0, zf + 2, px + 6, 14, zf + 2, px - 6, 14, zf + 2], null)) {
          const gr = g.createLinearGradient(0, PY_of(px, 0, zf), 0, PY_of(px, 14, zf)); gr.addColorStop(0, `rgba(${b.col},.22)`); gr.addColorStop(.5, "#141828"); gr.addColorStop(1, "#0b0e1a"); g.fillStyle = gr; g.fill();
        }
      } else if (prj(px, -7, zf + 2)) { const s = F * 9 / PZ; g.globalCompositeOperation = "lighter"; g.globalAlpha = .35; g.drawImage(glowSprite(b.col), PX - s * .7, PY - s, s * 1.4, s * 3); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; }
    }
    if (!mirror) {
      if (b.type === "truss") {   // 철교: 마름모 철골 + 가끔 지나가는 전철
        g.strokeStyle = "rgba(120,140,190,.55)"; g.lineWidth = Math.max(.6, F * .5 / Math.max(10, rz));
        g.beginPath(); for (let px = -B; px < B; px += 30) { if (prj(px, 17, zf)) { const ax = PX, ay = PY; if (prj(px + 15, 27, zf)) { g.moveTo(ax, ay); g.lineTo(PX, PY); const bx2 = PX, by2 = PY; if (prj(px + 30, 17, zf)) g.lineTo(PX, PY); g.moveTo(bx2, by2); if (prj(px + 45, 27, zf)) g.lineTo(PX, PY); } } } g.stroke();
      }
      poly([-B, 17, zf, B, 17, zf, B, 17, zb2, -B, 17, zb2], "#0a0c18");
      poly([-B, 14, zf, B, 14, zf, B, 14, zb2, -B, 14, zb2], "#090b16");
      poly([-B, 14, zf, B, 14, zf, B, 17.5, zf, -B, 17.5, zf], "#11142a");
      if (b.type === "truss") {   // 전철: 50초마다, 모두 같은 때
        const tt = (Date.now() / 1000) % 50; if (tt < 14) {
          const tx = -B - 200 + (2 * B + 400) * tt / 14;
          if (poly([tx - 160, 17.6, zf, tx, 17.6, zf, tx, 21.5, zf, tx - 160, 21.5, zf], "#1d2440")) {
            g.globalCompositeOperation = "lighter";
            for (let wx = tx - 155; wx < tx; wx += 4) if (prj(wx, 19.6, zf - .1)) { const s = F * 1.2 / PZ; g.fillStyle = "rgba(255,235,190,.85)"; g.fillRect(PX, PY - s, s * 2, s * 1.4); }
            g.globalCompositeOperation = "source-over";
          }
        }
      }
    }
    g.globalCompositeOperation = "lighter";
    // 상판 아래 LED 띠 (물에 길게 비친다)
    if (prj(-B, ys * 14, zf)) { const ax = PX, ay = PY; if (prj(B, ys * 14, zf)) {
      const lw = Math.max(1, F * (mirror ? 2.4 : .9) / Math.max(8, rz)); g.strokeStyle = `rgba(${b.col},${mirror ? .35 : .9})`; g.lineWidth = lw; g.beginPath(); g.moveTo(ax, ay); g.lineTo(PX, PY); g.stroke();
      g.strokeStyle = `rgba(${b.col},${mirror ? .12 : .25})`; g.lineWidth = lw * 5; g.stroke();
    } }
    // 난간 가로등
    for (let px = -B + 12; px <= B; px += 34) if (prj(px, ys * 23, zf)) {
      const s = clamp(F * 2.2 / PZ, 1.2, 22);
      if (mirror) g.drawImage(glowSprite(b.lamp), PX - s * .6, PY - s * .3, s * 1.2, s * 4.2); else { g.drawImage(glowSprite(b.lamp), PX - s, PY - s, s * 2, s * 2); }
    }
    // 아치(한강대교: 금빛 둥근 아치 여러 개 / 동작대교: 큰 아치 두 개)
    if (b.type === "arch" || b.type === "arch2") {
      const spans = b.type === "arch" ? [[-R + 70, -R + 70 + 210], [-R + 280, -R + 490], [-R + 490 - 0, -R + 700], [R - 280, R - 70]] : [[-280, -20], [20, 280]];
      const ah = b.type === "arch" ? 26 : 46;
      for (const [a, c] of spans) for (let k = 0; k <= 24; k++) {
        const u = k / 24, px = a + (c - a) * u, py = 17 + Math.sin(u * Math.PI) * ah;
        if (prj(px, ys * py, zf)) { const s = clamp(F * 1.5 / PZ, .9, 14), tw = .7 + .3 * Math.sin(t * 2 + k * .7); g.globalAlpha = tw * (mirror ? .4 : 1); g.drawImage(glowSprite(b.col), PX - s, PY - s * (mirror ? .5 : 1), s * 2, s * (mirror ? 3.4 : 2)); }
      }
      g.globalAlpha = 1;
    }
    // 반포대교 달빛무지개분수: 상판 옆 노즐마다 물줄기가 강으로 휘어 떨어진다 (별빛 코스면 늘, 아니면 1분 중 40초)
    if (b.type === "fountain" && (starOn || (Date.now() / 1000) % 60 < 40)) {
      for (let px = -R + 14; px <= R - 14; px += 10) {
        const hue = ((px + R) / (2 * R) * 300 + t * 40) % 360, col = hslRgb(hue);
        for (let k = 0; k < 14; k++) {
          const u = ((k / 14) + t * .5) % 1, y = 15.5 + 3 * u - 18.5 * u * u, z = zf - 2 - 16 * u;
          if (prj(px + Math.sin(px) * 1.5, ys * y, z)) { const s = clamp(F * 2.2 / PZ, 1.2, 26); g.globalAlpha = (mirror ? .3 : .7) * (1 - u * .5); g.drawImage(glowSprite(col), PX - s, PY - s, s * 2, s * 2); }
        }
      }
      g.globalAlpha = 1;
      if (!mirror && prj(0, 1, zf - 30)) { const s = F * 40 / PZ; g.globalAlpha = .1; g.drawImage(glowSprite(hslRgb((t * 40) % 360)), PX - s * 6, PY - s, s * 12, s * 2); g.globalAlpha = 1; }
    }
    g.globalCompositeOperation = "source-over";
  }
  const PY_of = (x, y, z) => prj(x, y, z) ? PY : CY;
  const hslRgb = h => { const f = n => { const k = (n + h / 30) % 12; return Math.round(255 * (.62 - .38 * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return `${f(0)},${f(8)},${f(4)}`; };
  // 마주 오는 유람선(오늘 응원자 이름 현수막). 2분마다, 왼쪽 물길
  function boatAt() {
    const per = 120, tt = Date.now() / 1000, k = Math.floor(tt / per), u = (tt % per) / per;
    const z = 3000 - u * 3400;   // 마주 오며 왼쪽으로 지나간다
    return { z, x: -150 - hash(k) * 80, name: supDay.length ? supDay[k % supDay.length] : "" };
  }
  function drawOtherBoat(o, mirror) {
    const L2 = 46, z0 = o.z, z1 = o.z + L2, x = o.x, ys = mirror ? -1 : 1;
    if (z0 < 4) return;
    if (!mirror) {
      poly([x + 6, 0, z0, x + 6, 3.4, z0, x + 6, 3.4, z1, x + 6, 0, z1], "#e7e3da");
      poly([x - 6, 0, z0 - 2, x + 6, 0, z0, x + 6, 3.4, z0, x - 6, 3.4, z0 - 2], "#dcd7cc");
      for (const [y0, y1, inset] of [[3.4, 6.2, .4], [6.2, 8.8, 4]]) {
        poly([x + 5.5, y0, z0 + inset, x + 5.5, y1, z0 + inset, x + 5.5, y1, z1 - inset, x + 5.5, y0, z1 - inset], "#ece8e0");
        g.globalCompositeOperation = "lighter";
        for (let wz = z0 + inset + 1.5; wz < z1 - inset - 1; wz += 2.6) if (prj(x + 5.4, (y0 + y1) / 2, wz)) { const s = F * .9 / PZ; g.fillStyle = "rgba(255,214,150,.9)"; g.fillRect(PX - s, PY - s * 1.1, s * 1.6, s * 2.2); }
        g.globalCompositeOperation = "source-over";
      }
      if (prj(x + 6.1, 1, z0)) { const ax = PX, ay = PY; if (prj(x + 6.1, 1, z1)) { g.strokeStyle = "rgba(110,170,255,.9)"; g.lineWidth = Math.max(1, F * .4 / PZ); g.beginPath(); g.moveTo(ax, ay); g.lineTo(PX, PY); g.stroke(); } }
      // 줄전구
      g.globalCompositeOperation = "lighter";
      for (let k = 0; k <= 16; k++) { const u = k / 16; if (prj(x, 9 + 4 * Math.sin(u * Math.PI), z0 + u * L2)) { const s = clamp(F * .8 / PZ, .8, 6); g.drawImage(glowSprite(FWC[k % 5]), PX - s, PY - s, s * 2, s * 2); } }
      g.globalCompositeOperation = "source-over";
      if (o.name && prj(x, 15, z0 + L2 / 2)) {
        const fs = clamp(F * 2.6 / PZ, 9, 30), txt = `💛 ${o.name}님, 응원 고마워요`; g.font = `700 ${fs}px sans-serif`; const w = g.measureText(txt).width + fs;
        g.fillStyle = "rgba(40,28,10,.75)"; g.fillRect(PX - w / 2, PY - fs * .8, w, fs * 1.6); g.strokeStyle = "rgba(255,205,95,.8)"; g.lineWidth = 1; g.strokeRect(PX - w / 2, PY - fs * .8, w, fs * 1.6);
        g.fillStyle = "#ffe2a0"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, PX, PY + 1);
      }
    } else {
      g.globalCompositeOperation = "lighter";
      for (let wz = z0 + 2; wz < z1 - 1; wz += 3) if (prj(x + 5.4, -5, wz)) { const s = F * 1.1 / PZ; g.globalAlpha = .4; g.drawImage(glowSprite("255,200,130"), PX - s, PY - s, s * 2, s * 6); }
      g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    }
  }
  // 전광판: 강가 건물 위, 배 쪽을 바라보는 큰 LED 화면
  const BOARDS = [{ z: 1450, x: -R - 40, y: 46 }, { z: 5450, x: R + 45, y: 50 }, { z: 8300, x: -R - 40, y: 46 }];
  function drawBoard(cx3, y3, z3, w3, h3, mirror) {
    if (!prj(cx3, mirror ? -y3 : y3, z3)) return;
    const w = F * w3 / PZ, h = F * h3 / PZ; if (w < 6 || PX + w / 2 < 0 || PX - w / 2 > W) return;
    const { text, age, k } = bbNow(), hue = [42, 330, 190, 140][k % 4], col = `hsl(${hue},95%,72%)`;
    if (mirror) { g.globalCompositeOperation = "lighter"; g.globalAlpha = .28; g.drawImage(glowSprite(hslRgb(hue)), PX - w / 2, PY - h / 2, w, h * 3); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; return; }
    // 기둥·틀
    g.fillStyle = "#0b0d18"; g.fillRect(PX - w * .03, PY + h / 2, w * .06, h * 1.2);
    g.fillStyle = "#06070d"; g.fillRect(PX - w / 2 - 2, PY - h / 2 - 2, w + 4, h + 4);
    g.globalCompositeOperation = "lighter"; g.globalAlpha = .35; g.drawImage(glowSprite(hslRgb(hue)), PX - w, PY - h * 1.6, w * 2, h * 3.2); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    g.fillStyle = "#0c0a16"; g.fillRect(PX - w / 2, PY - h / 2, w, h);
    g.save(); g.beginPath(); g.rect(PX - w / 2, PY - h / 2, w, h); g.clip();
    const fs = Math.max(6, h * .48); g.font = `800 ${fs}px sans-serif`; g.textBaseline = "middle"; g.textAlign = "left";
    const tw = g.measureText(text).width, fade = Math.min(1, age * 2, (9 - age) * 2);
    let x = PX - tw / 2; if (tw > w * .92) x = PX + w / 2 - ((age * w * .32) % (tw + w));
    g.globalAlpha = fade; g.shadowColor = col; g.shadowBlur = fs * .5; g.fillStyle = col; g.fillText(text, x, PY + fs * .04);
    g.shadowBlur = 0; g.globalAlpha = 1;
    if (h > 14) { g.fillStyle = "rgba(0,0,0,.28)"; for (let yy = PY - h / 2; yy < PY + h / 2; yy += 3) g.fillRect(PX - w / 2, yy, w, 1); }
    g.restore();
    boardHit.push([PX - w / 2, PY - h / 2, w, h]);
  }
  let boardHit = [];
  // 남산 + N서울타워(왼쪽, 멀리). 언덕은 어둡게, 타워는 하얀 몸통에 금빛 전망대 띠
  const NAMSAN = { x: -2600, z: 5300 };
  function drawNamsan(s, mirror) {
    const rz = wrapZ(NAMSAN.z - s); if (rz < -2000 || rz > 6000) return;
    const ys = mirror ? -1 : 1, pts = [];
    for (let k = 0; k <= 16; k++) { const u = k / 16 * 2 - 1, hh = 260 * Math.pow(Math.cos(u * Math.PI / 2), 1.6); pts.push(NAMSAN.x + u * 900 * .3, ys * hh, rz + u * 1400); }
    pts.push(NAMSAN.x, 0, rz + 1400, NAMSAN.x, 0, rz - 1400);
    if (!mirror) poly(pts, "#0e1226");
    // 타워
    const top = 260 + 236;
    if (!mirror) { poly([NAMSAN.x - 7, 255, rz, NAMSAN.x + 7, 255, rz, NAMSAN.x + 3.5, 430, rz, NAMSAN.x - 3.5, 430, rz], "#d9dbe6"); poly([NAMSAN.x - 1.2, 440, rz, NAMSAN.x + 1.2, 440, rz, NAMSAN.x + .8, top, rz, NAMSAN.x - .8, top, rz], "#c7c9d6"); }
    g.globalCompositeOperation = "lighter";
    if (prj(NAMSAN.x, ys * 436, rz)) { const s2 = F * 22 / PZ; g.globalAlpha = mirror ? .3 : .9; g.drawImage(glowSprite("255,205,140"), PX - s2 * 1.4, PY - s2 * (mirror ? .6 : .5), s2 * 2.8, s2 * (mirror ? 4 : 1)); }
    if (prj(NAMSAN.x, ys * top, rz) && Math.sin(tNow * 2.4) > 0) { const s2 = Math.max(3, F * 8 / PZ); g.globalAlpha = 1; g.drawImage(glowSprite("255,80,70"), PX - s2, PY - s2, s2 * 2, s2 * 2); }
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  }
  // 먼 산 능선 + 롯데월드타워(정면 저 멀리, 늘 같은 자리)
  function drawFar(mirror) {
    const ys = mirror ? -1 : 1;
    g.fillStyle = mirror ? "rgba(14,16,34,.6)" : "#121531";
    g.beginPath(); let started = false;
    for (let a = -100; a <= 100; a += 4) {
      const ar = a * RAD, h = (1.6 + 1.3 * Math.sin(a * .09) + .8 * Math.sin(a * .23 + 1) + (Math.abs(a - 40) < 14 ? 1.8 * Math.cos((a - 40) / 14 * Math.PI / 2) : 0)) * RAD;
      if (!dirp(Math.sin(ar) * Math.cos(h), ys * Math.sin(h), Math.cos(ar) * Math.cos(h))) continue;
      started ? g.lineTo(PX, PY) : (g.moveTo(PX, mirror ? elY(0) : elY(0) + 2), g.lineTo(PX, PY), started = true);
    }
    if (started) { g.lineTo(PX, elY(0) + 2); g.closePath(); g.fill(); }
    // 롯데월드타워: 가늘고 뾰족한 실루엣, 위쪽 불빛
    const az = 6 * RAD, top = 3.4 * RAD, wid = .32 * RAD;
    if (dirp(Math.sin(az - wid), 0, Math.cos(az - wid))) {
      const lx = PX, by = PY; dirp(Math.sin(az + wid), 0, Math.cos(az + wid)); const rx = PX; dirp(Math.sin(az), ys * Math.sin(top), Math.cos(az)); const tx = PX, ty = PY;
      if (!mirror) { g.fillStyle = "#1a1d38"; g.beginPath(); g.moveTo(lx, by); g.lineTo(tx - (rx - lx) * .08, ty); g.lineTo(tx + (rx - lx) * .08, ty); g.lineTo(rx, by); g.fill(); }
      g.globalCompositeOperation = "lighter";
      for (let k = 0; k < 14; k++) { const u = k / 14, yy = by + (ty - by) * u; g.fillStyle = `rgba(230,236,255,${(.25 + .4 * u) * (mirror ? .4 : 1)})`; g.fillRect(lx + (tx - lx) * u + 1, yy, Math.max(1, (rx - lx) * (1 - u * .85) - 2), mirror ? 2 : 1); }
      const s = F * .02; g.globalAlpha = mirror ? .3 : .8; g.drawImage(glowSprite("200,220,255"), tx - s, ty - s, s * 2, s * 2); g.globalAlpha = 1;
      if (Math.sin(tNow * 2) > .2) { g.drawImage(glowSprite("255,70,60"), tx - 5, ty - 6, 10, 10); }
      g.globalCompositeOperation = "source-over";
    }
  }

  // 내 배: 앞머리 갑판, 난간, 돛대, 줄전구, 함께 탄 사람들
  function drawDeck(t) {
    const DY = 2.25, tip = 7.4;
    // 갑판 (나무, 줄전구 빛)
    if (poly([-3.3, DY, .6, 3.3, DY, .6, 2.9, DY, 4, 1.4, DY, 6.6, 0, DY, tip, -1.4, DY, 6.6, -2.9, DY, 4], null)) {
      const y0 = PY_of(0, DY, .7), y1 = PY_of(0, DY, tip), gr = g.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(0, "#3a2414"); gr.addColorStop(.6, "#5a3a20"); gr.addColorStop(1, "#6b4626"); g.fillStyle = gr; g.fill();
      g.save(); g.clip(); g.strokeStyle = "rgba(20,10,4,.45)"; g.lineWidth = 1;
      for (let x = -3.2; x <= 3.2; x += .32) { if (prj(x, DY, 1.8)) { const ax = PX, ay = PY; if (prj(x * .02, DY, tip + .3)) { g.beginPath(); g.moveTo(ax, ay); g.lineTo(PX, PY); g.stroke(); } } }
      // 줄전구가 갑판에 떨어뜨린 따뜻한 빛
      g.globalCompositeOperation = "lighter"; if (prj(0, DY, 3.6)) { const s = F * 4 / PZ; g.globalAlpha = .35; g.drawImage(glowSprite("255,190,110"), PX - s * 1.4, PY - s * .6, s * 2.8, s * 1.2); g.globalAlpha = 1; }
      g.globalCompositeOperation = "source-over"; g.restore();
    }
    // 뱃전 안쪽 벽(하얀 선체) + 난간
    const edge = [[-3.3, .6], [-2.9, 4], [-1.4, 6.6], [0, tip], [1.4, 6.6], [2.9, 4], [3.3, .6]];
    for (let i = 0; i < edge.length - 1; i++) {
      const [ax, az] = edge[i], [bx, bz] = edge[i + 1];
      poly([ax, DY, az, bx, DY, bz, bx, DY + .5, bz, ax, DY + .5, az], i < 3 ? "#5b5650" : "#4d4843");
    }
    g.strokeStyle = "rgba(235,220,195,.85)"; g.lineWidth = 1.6; g.beginPath(); let st = false;
    for (const [x, z] of edge) if (prj(x * .97, DY + 1.05, z - .05)) { st ? g.lineTo(PX, PY) : g.moveTo(PX, PY); st = true; } g.stroke();
    g.strokeStyle = "rgba(210,205,195,.8)"; g.lineWidth = 1.2;
    for (let i = 0; i < edge.length - 1; i++) for (let k = 0; k < 3; k++) { const u = k / 3, x = edge[i][0] + (edge[i + 1][0] - edge[i][0]) * u, z = edge[i][1] + (edge[i + 1][1] - edge[i][1]) * u; if (prj(x * .97, DY + .5, z)) { const ax = PX, ay = PY; if (prj(x * .97, DY + 1.05, z)) { g.beginPath(); g.moveTo(ax, ay); g.lineTo(PX, PY); g.stroke(); } } }
    // 돛대 + 깃발 + 줄전구 (뒤 위쪽에서 뱃머리 돛대로)
    const mz = tip - .5, mt = 5.6;
    if (prj(0, DY, mz)) { const ax = PX, ay = PY; if (prj(0, mt, mz)) { g.strokeStyle = "#8d8780"; g.lineWidth = Math.max(1.2, F * .05 / PZ); g.beginPath(); g.moveTo(ax, ay); g.lineTo(PX, PY); g.stroke();
      const fx = PX, fy = PY + 4; g.fillStyle = "#e05a5a"; g.beginPath(); g.moveTo(fx, fy); for (let k = 0; k <= 6; k++) g.lineTo(fx + k * 5, fy + 5 + Math.sin(t * 5 + k) * 1.6 - k * .1); for (let k = 6; k >= 0; k--) g.lineTo(fx + k * 5, fy + 13 + Math.sin(t * 5 + k) * 1.6 - k * .6); g.fill(); } }
    g.globalCompositeOperation = "lighter";
    const BC = ["255,206,140", "255,190,120", "255,225,170"];
    for (const sx of [-1, 1]) for (const [x0, y0, z0, sag] of [[sx * 3.1, 7.2, 1.4, .7], [sx * 3.2, 4.2, 1.6, .35]]) {
      const n = 22;
      for (let k = 0; k <= n; k++) {
        const u = k / n, x = x0 + (0 - x0) * u, z = z0 + (mz - z0) * u, y = y0 + (mt - y0) * u - Math.sin(u * Math.PI) * sag + Math.sin(t * 1.3 + u * 3) * .04;
        if (!prj(x, y, z)) continue;
        const s = clamp(F * .05 / PZ, 1.1, 6), tw = .75 + .25 * Math.sin(t * 2.1 + k * 1.7 + sx);
        g.globalAlpha = tw * .5; g.drawImage(glowSprite(BC[k % 3]), PX - s * 3.2, PY - s * 3.2, s * 6.4, s * 6.4);
        g.globalAlpha = 1; g.fillStyle = `rgba(255,228,180,${tw})`; g.beginPath(); g.arc(PX, PY, s * .5, 0, TAU); g.fill();
      }
    }
    // 항해등: 왼쪽 빨강, 오른쪽 초록, 돛대 꼭대기 흰색
    for (const [x, col] of [[-2.95, "255,60,60"], [2.95, "60,255,140"]]) if (prj(x, DY + 1.1, 4)) { const s = F * .12 / PZ; g.drawImage(glowSprite(col), PX - s, PY - s, s * 2, s * 2); }
    if (prj(0, mt + .1, mz)) { const s = F * .12 / PZ; g.drawImage(glowSprite("255,255,240"), PX - s, PY - s, s * 2, s * 2); }
    g.globalCompositeOperation = "source-over";
    // 함께 탄 사람들(나 말고, 최대 6명): 난간에 기대 강을 보는 뒷모습
    const others = (riders.c || []).filter(n => n !== (cfg.nick ? cfg.nick() : "")).slice(0, 6);
    const SL = [[-2.3, 3.4], [2.3, 3.6], [-1.6, 5.4], [1.7, 5.2], [-2.6, 1.9], [2.6, 2.1]];
    others.forEach((nick, i) => {
      const [x, z] = SL[i]; if (!prj(x, DY, z)) return; const fx = PX, fy = PY; if (!prj(x, DY + 1.55, z)) return; const hgt = fy - PY; if (hgt < 6) return;
      const hue = (hash(nick.length * 7 + nick.charCodeAt(0)) * 360) | 0, sw = Math.sin(t * .8 + i) * hgt * .015;
      g.fillStyle = `hsl(${hue},45%,62%)`; g.beginPath(); g.ellipse(fx + sw, fy - hgt * .3, hgt * .17, hgt * .3, 0, 0, TAU); g.fill();
      g.fillStyle = "#2a1d18"; g.beginPath(); g.arc(fx + sw * 1.5, fy - hgt * .73, hgt * .17, 0, TAU); g.fill();
      g.font = `600 ${clamp(hgt * .14, 10, 14)}px sans-serif`; g.textAlign = "center"; g.textBaseline = "bottom"; g.fillStyle = "rgba(255,240,220,.85)"; g.fillText(nick, fx, fy - hgt * .95);
    });
  }
  // 물: 하늘빛 바탕 → 물에 비친 모습(물결에 일렁임) → 물결 줄과 달빛 반짝임
  function drawWater(t, s) {
    const y0 = elY(0); if (y0 > H + 40) return;
    // 1) 물에 비친 모습을 반 해상도 캔버스에 그린다
    const rw = Math.ceil(W / 2), rh = Math.ceil(H / 2);
    if (!refl || refl.width !== rw || refl.height !== rh) { refl = document.createElement("canvas"); refl.width = rw; refl.height = rh; rg = refl.getContext("2d"); }
    const mg = g; g = rg; g.setTransform(.5, 0, 0, .5, 0, 0);
    const gr = g.createLinearGradient(0, y0, 0, H); gr.addColorStop(0, "#2b2552"); gr.addColorStop(.15, "#161a3c"); gr.addColorStop(1, "#060816");
    g.fillStyle = gr; g.fillRect(0, y0 - 2, W, H - y0 + 4);
    g.fillStyle = "#3a2c5c"; g.globalAlpha = .5; g.fillRect(0, y0 - 1, W, 4); g.globalAlpha = 1;
    drawFar(true); drawNamsan(s, true);
    drawItems(s, true);
    drawFws(0, true);
    g = mg;
    // 2) 줄마다 조금씩 좌우로 일렁이며 옮긴다(가까울수록 크게)
    const top = Math.max(0, Math.floor(y0));
    for (let y = top; y < H; y += 2) {
      const dd = (y - y0) / (H - y0 + 1), amp = 1 + dd * dd * 14, dx = Math.sin(y * .09 * (1.4 - dd) + t * 1.7) * amp + Math.sin(y * .023 - t * .9) * amp * .6;
      g.drawImage(refl, 0, y / 2, rw, 1, dx, y, W, 2.2);
    }
    // 3) 물빛 어둡게 + 물결 줄(배가 나아가니 다가온다) + 달빛 길
    const dk = g.createLinearGradient(0, y0, 0, H); dk.addColorStop(0, "rgba(6,8,22,0)"); dk.addColorStop(.35, "rgba(6,8,22,.25)"); dk.addColorStop(1, "rgba(4,5,14,.55)");
    g.fillStyle = dk; g.fillRect(0, y0, W, H - y0);
    const [ma] = MOON.cruise;
    g.globalCompositeOperation = "lighter";
    for (const [z0, z1, step, n] of [[6, 60, 2.2, 7], [60, 400, 9, 9], [400, 2400, 40, 12]]) {
      const first = Math.ceil((s + z0) / step) * step;
      for (let wz = first; wz < s + z1; wz += step) {
        const rz = wz - s, row = Math.round(wz / step);
        for (let k = 0; k < n; k++) {
          const hx = hash(row * 131 + k * 17 + step | 0), x = (hx * 2 - 1) * (R - 10);
          if (!prj(x + Math.sin(t * .8 + row) * 2, 0, rz)) continue;
          const az = Math.atan2(x, rz), inMoon = Math.abs(az - ma) < .05 + 6 / (rz + 30), len = clamp(F * (1.6 + hx * 2.2) / PZ, 1.5, 40);
          const a = inMoon ? .55 * (.5 + .5 * Math.sin(t * 6 + row * 3 + k)) : .08 + .06 * Math.sin(t * 2 + k + row);
          g.fillStyle = inMoon ? `rgba(255,236,200,${a})` : `rgba(160,175,240,${a})`; g.fillRect(PX - len / 2, PY, len, Math.max(1, len * .05));
        }
      }
    }
    // 달빛 길: 달 아래 강물이 반짝이는 띠
    if (dirp(Math.sin(ma), 0, Math.cos(ma))) { const mx = PX; for (let k = 0; k < 40; k++) { const yy = y0 + (H - y0) * Math.pow(hash(k * 7 + (t * 3 | 0)), 1.6), w = 2 + (yy - y0) * .08; g.fillStyle = `rgba(255,232,190,${.25 * hash(k * 13 + (t * 5 | 0))})`; g.fillRect(mx - w / 2 + (hash(k * 5) - .5) * (yy - y0) * .12, yy, w, 1.2); } }
    g.globalCompositeOperation = "source-over";
  }
  // 멀리 있는 것부터 차례로: 건물, 강둑 토막, 다리, 마주 오는 배, 전광판
  const ITEMS = [];
  function drawItems(s, mirror) {
    ITEMS.length = 0;
    for (const b of blds) {
      const rz = wrapZ(b.z0 - s); if (rz + b.w < -40 || rz > (b.far ? 3600 : 3000)) continue;
      const nz = rz > 0 ? rz : rz + b.w < 0 ? rz + b.w : 0, dist = Math.hypot(b.x0, nz);
      if (mirror && dist > 2200) continue;
      ITEMS.push([dist, 0, b, rz]);
    }
    for (const sd of [-1, 1]) { const k0 = Math.floor((s - 160) / BANKSEG); for (let k = k0; k < k0 + 22; k++) { const wz = k * BANKSEG, rz = wz - s; ITEMS.push([Math.hypot(R, Math.max(0, rz)), 1, sd, rz, ((k % (LEN / BANKSEG)) + LEN / BANKSEG) % (LEN / BANKSEG)]); } }
    for (const b of BRIDGES) { const rz = wrapZ(b.z - s); if (rz > -12 && rz < 4200) ITEMS.push([Math.max(1, rz - 7), 2, b, rz]); }
    const ob = boatAt(); if (ob.z > 4 && ob.z < 3500) ITEMS.push([Math.hypot(ob.x, ob.z), 3, ob]);
    for (const bd of BOARDS) { const rz = wrapZ(bd.z - s); if (rz > 20 && rz < 3200) ITEMS.push([Math.hypot(bd.x, rz) - 30, 4, bd, rz]); }
    ITEMS.sort((a, b) => b[0] - a[0]);
    if (!mirror) boardHit = [];
    for (const it of ITEMS) {
      if (it[1] === 0) drawBuilding(it[2], it[3], it[0], mirror);
      else if (it[1] === 1) drawBank(it[2], it[4], it[3], it[0], mirror);
      else if (it[1] === 2) drawBridge(it[2], it[3], mirror);
      else if (it[1] === 3) drawOtherBoat(it[2], mirror);
      else drawBoard(it[2].x, it[2].y, it[3], 120, 34, mirror);
    }
  }
  let lastPlace = "";
  function cruiseHud(s) {
    const nb = BRIDGES.map(b => ({ b, d: ((b.z - s) % LEN + LEN) % LEN })).sort((a, b) => a.d - b.d)[0];
    const pl = [...PLACES].reverse().find(p => p[0] <= s) || PLACES[0];
    const sec = Math.round(nb.d / SPEED), eta = sec >= 60 ? `${Math.floor(sec / 60)}분 ${sec % 60}초` : `${sec}초`;
    q("tSub").textContent = nb.d < 40 ? `지금 ${nb.b.name} 아래를 지나요` : `${pl[1]} · 다음 ${nb.b.name}까지 ${eta}`;
    q("tRoute").querySelector("em").style.left = (s / LEN * 100) + "%";
    const key = nb.d < 420 && nb.d > 300 ? nb.b.name : pl[1];
    if (key !== lastPlace) {
      lastPlace = key;
      if (performance.now() - capAt > 6000) { if (nb.d < 420 && nb.d > 300) showCap(nb.b.name, nb.b.type === "fountain" ? (starOn || (Date.now() / 1000) % 60 < 40 ? "달빛무지개분수가 켜져 있어요" : "곧 무지개분수가 켜져요") : nb.b.type === "truss" ? "가끔 전철이 지나가요" : ""); else if (pl[2]) showCap(pl[1], pl[2]); }
    }
  }
  function frameCruise(t, dt) {
    const s = courseS();
    camY = 4.05 + Math.sin(t * .95) * .07;
    roll = Math.sin(t * .76) * .6 * RAD + Math.sin(t * .31) * .3 * RAD;
    const sway = Math.sin(t * .16) * 1.1 * RAD;
    setCam(yaw + sway, pitch + Math.sin(t * .95 + 1) * .35 * RAD);
    g.save(); g.translate(W / 2, H / 2); g.rotate(roll); g.translate(-W / 2, -H / 2);
    drawSky(t, "#03040e", "#5a3a72", "255,140,120");
    drawMeteors(dt);
    drawFar(false); drawNamsan(s, false);
    fwTick(dt);
    drawWater(t, s);
    drawFws(dt, false);
    drawItems(s, false);
    drawDeck(t);
    g.restore();
    cruiseHud(s);
  }

  // ====================== 🗼 남산타워 ======================
  // 좌표: x 동쪽, z 북쪽(m). 카메라는 해발 480m. 한강은 남쪽 약 3km를 동서로 흐른다
  const RIVER = [[-16000, 1200], [-11000, -400], [-8000, -1600], [-6000, -2500], [-3500, -3000], [-1000, -3100], [1500, -2800], [3500, -2700], [6000, -3600], [8500, -4300], [11000, -3800], [16000, -2600]];
  const riverZ = x => { for (let i = 0; i < RIVER.length - 1; i++) { const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1]; if (x >= ax && x <= bx) return az + (bz - az) * (x - ax) / (bx - ax); } return x < 0 ? RIVER[0][1] : RIVER[RIVER.length - 1][1]; };
  const TB = [[-9800, "가양대교"], [-7400, "성산대교"], [-6300, "양화대교"], [-5900, "서강대교"], [-5000, "마포대교"], [-3900, "원효대교"], [-2830, "한강철교"], [-2600, "한강대교"], [-1300, "동작대교"], [200, "반포대교"], [1700, "한남대교"], [3300, "동호대교"], [4600, "성수대교"], [6300, "영동대교"], [8100, "청담대교"], [10200, "잠실대교"]];
  const TLAB = [["롯데월드타워", 8800, 560, -5900], ["63빌딩", -4300, 255, -3520], ["여의도", -6400, 120, -2400], ["한강", 900, 0, -2950], ["강남", 5200, 60, -6500], ["북한산", 600, 836, 12500], ["광화문", -600, 40, 3300], ["관악산", -2400, 632, -9200], ["잠실", 9600, 60, -5600], ["반포대교 무지개분수", 200, 30, -2950]];
  let city = null, cars = null, towers = null, bloom = null, bg2 = null;
  function makeTower() {
    makeSky(); if (city) return;
    const r = rng(480), pts = [];
    const inRiver = (x, z) => Math.abs(z - riverZ(x)) < 520;
    const blocked = (x, z) => { const d = Math.hypot(x, z), az = Math.atan2(x, z) / RAD; if (d < 420 || d > 17500) return true; if (inRiver(x, z)) return true;
      if (d > 9500 && az > -35 && az < 30) return true; if (d > 2600 && d < 3800 && az > -70 && az < 5) return true; if (d > 8000 && (az > 160 || az < -140)) return true; return false; };
    const D = [[0, 0, 2600, 3.2], [1500, -1300, 1200, 1.4], [-600, 1300, 1000, 1.6], [-1900, -1600, 1200, 1.3], [-200, 2600, 1800, 1.4], [-5900, -2900, 1100, 1.8], [6200, -6200, 3200, 1.6], [9200, -5400, 2000, 1.3], [-3500, 1800, 2600, 1], [3500, 2600, 2800, 1], [-1800, -1400, 1500, 1.1], [-1500, -8500, 3500, .9], [-9500, -2500, 3500, 1], [10500, 1500, 3500, .9], [3000, -9500, 3500, .9], [-6500, 3500, 3000, .8], [-11000, 2500, 3500, .8], [12500, -2500, 3000, .7]];
    const pick = () => { if (r() < .22) { const a = r() * TAU, d = 900 + Math.pow(r(), .8) * 16000; return [Math.sin(a) * d, Math.cos(a) * d]; } let tot = 0; for (const d of D) tot += d[3]; let u = r() * tot; for (const d of D) { u -= d[3]; if (u < 0) { const a = r() * TAU, rr = Math.abs(r() + r() + r() - 1.5) * d[2]; return [d[0] + Math.sin(a) * rr, d[1] + Math.cos(a) * rr]; } } return [0, 3000]; };
    const add = (x, z, c, br, h) => { if (blocked(x, z)) return; pts.push([x, h || 0, z, c, br]); };
    // 길: 가로등 줄(주황·하얀 LED)
    const roads = [];
    for (let i = 0; i < 420; i++) {
      const [cx0, cz0] = pick(), ang = (r() < .5 ? 0 : 90) * RAD + (Math.floor(cx0 / 3000) * 13 + Math.floor(cz0 / 3000) * 7) % 40 * RAD - 20 * RAD, len = 500 + r() * 2600, c = r() < .55 ? 0 : 2;
      const dx = Math.sin(ang), dz = Math.cos(ang);
      for (let u = -len / 2; u < len / 2; u += 34 + r() * 30) if (r() < .85) add(cx0 + dx * u + (r() - .5) * 10, cz0 + dz * u + (r() - .5) * 10, c, .6 + r() * .4);
      if (len > 1800 && roads.length < 40) roads.push([cx0 - dx * len / 2, cz0 - dz * len / 2, cx0 + dx * len / 2, cz0 + dz * len / 2]);
    }
    // 동네 불빛(창문)
    for (let i = 0; i < 14000; i++) { const [x, z] = pick(); add(x, z, r() < .62 ? 1 : r() < .7 ? 2 : 0, .35 + r() * .55, r() < .2 ? r() * 60 : 0); }
    // 강변: 양쪽 강변도로 가로등(주황 줄) + 강변공원 가로등(따뜻한 하양)
    for (let x = -16000; x < 16000; x += 34) { const z = riverZ(x); for (const [o, c] of [[560, 0], [-560, 0], [620, 0], [-620, 0], [530, 1], [-530, 1]]) if (Math.hypot(x, z + o) < 17500) pts.push([x, 0, z + o, c, .9]); }
    // 다리: 다리 가로등(흰/색)
    for (const [bx] of TB) { const z = riverZ(bx); for (let u = -540; u <= 540; u += 22) pts.push([bx, 15, z + u, 3, 1]); }
    // 고층 빌딩: 불 켜진 창이 세로로 쌓인 기둥(여의도·강남·잠실·도심)
    towers = [];
    for (const [cx0, cz0, n, rr, hmax] of [[-5900, -2700, 26, 900, 280], [6200, -6000, 40, 2600, 220], [9300, -5200, 18, 1500, 200], [-300, 2900, 30, 1300, 150], [-1700, -1500, 12, 800, 200]]) for (let i = 0; i < n; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * rr, x = cx0 + Math.sin(a) * d, z = cz0 + Math.cos(a) * d; if (blocked(x, z)) continue;
      const h = 60 + r() * r() * hmax; towers.push([x, z, h, r() < .5 ? 1 : 2, r() < .45]);
      for (let y = 6; y < h; y += 8) if (r() < .6) pts.push([x + (r() - .5) * 14, y, z + (r() - .5) * 8, r() < .5 ? 1 : 2, .55 + r() * .45]);
    }
    // 롯데월드타워 · 63빌딩은 따로 그림
    // 정적인 점: 색·밝기 묶음으로 정렬(fillStyle 바꾸는 횟수를 줄인다)
    pts.forEach(p => { const d = Math.hypot(p[0], p[2]); p[5] = Math.min(2, Math.floor(d / 4500)); p[6] = d; });
    pts.sort((a, b) => (a[3] * 3 + a[5]) - (b[3] * 3 + b[5]));
    T.dbgN = pts.length;
    city = { n: pts.length, x: new Float32Array(pts.map(p => p[0])), y: new Float32Array(pts.map(p => p[1])), z: new Float32Array(pts.map(p => p[2])), c: new Uint8Array(pts.map(p => p[3] * 3 + p[5])), b: new Float32Array(pts.map(p => p[4])), d: new Float32Array(pts.map(p => p[6])) };
    // 차: 강변도로 4줄 + 큰길 + 다리
    cars = [];
    for (let i = 0; i < 260; i++) cars.push({ k: 0, lane: i % 4, u: r(), v: (14 + r() * 10) / 32000 });
    roads.forEach((rd, j) => { for (let i = 0; i < 9; i++) cars.push({ k: 1, rd, u: r(), v: (12 + r() * 8) / Math.hypot(rd[2] - rd[0], rd[3] - rd[1]), back: i % 2 }); });
    TB.forEach(([bx, nm]) => { if (nm === "한강철교") return; for (let i = 0; i < 5; i++) cars.push({ k: 2, bx, u: r(), v: .012 + r() * .01, back: i % 2 }); });
  }
  const CCOL = ["255,168,88", "255,214,160", "222,232,255", "235,240,255"];
  const CSTY = [];
  for (let c = 0; c < 4; c++) for (let lv = 0; lv < 3; lv++) CSTY.push(`rgba(${CCOL[c]},${[1, .8, .55][lv]})`);
  function frameTower(t, dt) {
    walkStep(dt);
    if (!scope && performance.now() > idleAt + 8000 && !drag && !walking()) tYaw += dt * .6 * RAD;   // 오래 가만히 있으면 천천히 둘러본다
    setCam(yaw, pitch);
    drawSky(t, "#02030b", "#6b4a6a", "255,150,110");
    drawMeteors(dt);
    // 땅: 지평선 근처는 불빛 안개, 아래는 어둡게
    const y0 = elY(0) + 2, yb = elY(-40 * RAD);
    const gr = g.createLinearGradient(0, y0, 0, yb); gr.addColorStop(0, "#3c2c4a"); gr.addColorStop(.06, "#1b1730"); gr.addColorStop(.3, "#0c0d1c"); gr.addColorStop(1, "#06070f");
    g.fillStyle = gr; g.fillRect(0, y0, W, H - y0 + 2);
    // 산 능선(북한산·관악산·인왕산 등): 뒤 불빛을 가린다
    const RID = [[-35, 30, 11500, 520, 836, 5], [-70, 5, 3100, 260, 338, 3], [165, 205, 8600, 380, 632, 4], [140, 165, 13500, 300, 618, 3], [60, 100, 9000, 200, 300, 2]];
    for (const [a0, a1, dist, hmin, hmax, bumps] of RID) {
      const P = [];
      for (let a = a0; a <= a1; a += 1) { const u = (a - a0) / (a1 - a0), env = Math.pow(Math.sin(u * Math.PI), .6), h = (hmin + (hmax - hmin) * Math.pow(Math.sin(u * Math.PI), 1.4) * (.8 + .2 * Math.sin(u * bumps * TAU + a0))) * env, ar = a * RAD; P.push(Math.sin(ar) * dist, h, Math.cos(ar) * dist); }
      for (let a = a1; a >= a0; a -= 3) { const ar = a * RAD; P.push(Math.sin(ar) * dist * .93, 0, Math.cos(ar) * dist * .93); }
      poly(P, "#0b0c1b");
    }
    // 한강: 강물 띠 + 달빛·다리 불빛 반사
    const P = []; for (let x = -16000; x <= 16000; x += 800) P.push(x, 0, riverZ(x) + 500); for (let x = 16000; x >= -16000; x -= 800) P.push(x, 0, riverZ(x) - 500);
    poly(P, "#0d1636");
    g.globalCompositeOperation = "lighter";
    for (let x = -12000; x <= 12000; x += 260) if (prj(x, 0, riverZ(x) + (hash(x | 0) - .5) * 700)) { const s = F * 60 / PZ; g.globalAlpha = .1 + .08 * Math.sin(t * 1.5 + x); g.fillStyle = "rgba(120,140,220,1)"; g.fillRect(PX - s, PY, s * 2, 1); }
    g.globalAlpha = 1;
    // 반포대교 무지개분수(1분에 40초 / 별빛 코스면 늘)
    if (starOn || (Date.now() / 1000) % 60 < 40) for (let u = -480; u <= 480; u += 40) if (prj(200 + 14, 6, riverZ(200) + u)) { const s = F * 22 / PZ; g.globalAlpha = .55; g.drawImage(glowSprite(hslRgb(((u + 500) / 1000 * 300 + t * 40) % 360)), PX - s, PY - s * .5, s * 2, s); }
    g.globalAlpha = 1;
    // 도시 불빛
    const C = city, n = C.n; let cur = -1;
    const fx0 = -W * .02, fx1 = W * 1.02;
    for (let i = 0; i < n; i++) {
      const x = C.x[i] - camX, y = C.y[i] - camY, z = C.z[i] - camZ;
      const x1 = x * cyw - z * syw, z1 = x * syw + z * cyw, z2 = y * spt + z1 * cpt; if (z2 < 50) continue;
      const k = F / z2, px = CX + x1 * k; if (px < fx0 || px > fx1) continue; const py = CY - (y * cpt - z1 * spt) * k; if (py < -5 || py > H + 5) continue;
      if (C.c[i] !== cur) { cur = C.c[i]; g.fillStyle = CSTY[cur]; }
      const d = C.d[i], sz = (d < 2000 ? 2.6 : d < 5000 ? 1.8 : d < 10000 ? 1.3 : 1) * Math.sqrt(zoom);
      const tw = d > 7000 && (i * 7 + (t * 4 | 0)) % 23 === 0 ? .4 : 1;
      if (tw < 1) continue;
      g.fillRect(px - sz / 2, py - sz / 2, sz * C.b[i] + .4, sz * C.b[i] + .4);
    }
    // 번짐(블룸): 1/5 크기 캔버스에 불빛을 찍고 크게 늘려 'lighter'로 얹는다 → 동네마다 은은한 빛 안개
    { const bw = Math.ceil(W / 5), bh = Math.ceil(H / 5); if (!bloom || bloom.width !== bw || bloom.height !== bh) { bloom = document.createElement("canvas"); bloom.width = bw; bloom.height = bh; bg2 = bloom.getContext("2d"); }
      bg2.clearRect(0, 0, bw, bh); bg2.globalCompositeOperation = "lighter"; let cc = -1;
      for (let i = 0; i < n; i++) { const x = C.x[i] - camX, y = C.y[i] - camY, z = C.z[i] - camZ, x1 = x * cyw - z * syw, z1 = x * syw + z * cyw, z2 = y * spt + z1 * cpt; if (z2 < 50) continue; const k = F / z2, px = CX + x1 * k, py = CY - (y * cpt - z1 * spt) * k; if (px < 0 || px > W || py < 0 || py > H) continue; if (C.c[i] !== cc) { cc = C.c[i]; bg2.fillStyle = `rgba(${CCOL[cc / 3 | 0]},.13)`; } bg2.fillRect(px / 5, py / 5, 1, 1); }
      g.globalCompositeOperation = "lighter"; g.globalAlpha = .9; g.imageSmoothingEnabled = true; g.drawImage(bloom, 0, 0, bw, bh, -2, -2, W + 4, H + 4); g.globalAlpha = 1; }
    // 가까운 밝은 불빛은 번지게
    for (let i = 0; i < n; i += 9) { if (C.d[i] > 5500 || !prj(C.x[i], C.y[i], C.z[i])) continue; const s = 10 * F / 500 * (2500 / Math.max(1200, C.d[i])); g.globalAlpha = .18; g.drawImage(glowSprite(CCOL[C.c[i] / 3 | 0]), PX - s, PY - s, s * 2, s * 2); }
    g.globalAlpha = 1;
    // 차 불빛(하얀 앞불·빨간 뒷불)
    for (const c of cars) {
      c.u = (c.u + c.v * dt) % 1; let x, z, col;
      if (c.k === 0) { x = -16000 + 32000 * (c.lane % 2 ? 1 - c.u : c.u); z = riverZ(x) + (c.lane < 2 ? 580 : -580) + (c.lane % 2 ? 8 : -8); col = c.lane % 2 ? "255,70,60" : "255,245,230"; }
      else if (c.k === 1) { const u = c.back ? 1 - c.u : c.u; x = c.rd[0] + (c.rd[2] - c.rd[0]) * u; z = c.rd[1] + (c.rd[3] - c.rd[1]) * u; col = c.back ? "255,70,60" : "255,245,230"; }
      else { x = c.bx + (c.back ? 6 : -6); z = riverZ(c.bx) + (c.back ? 1 - c.u : c.u) * 1080 - 540; col = c.back ? "255,70,60" : "255,245,230"; }
      if (!prj(x, 2, z) || PX < -4 || PX > W + 4) continue;
      const s = Math.hypot(x, z) < 4000 ? 1.8 : 1.2; g.fillStyle = `rgba(${col},.95)`; g.fillRect(PX - s / 2, PY - s / 2, s, s);
    }
    // 고층 빌딩 꼭대기 빨간 항공등(같이 깜빡)
    const blink = Math.sin(t * 2.6) > .2;
    for (const [x, z, h, , av] of towers) if (av && blink && prj(x, h + 4, z)) { const s = Math.max(2.5, F * 14 / PZ); g.drawImage(glowSprite("255,60,50"), PX - s, PY - s, s * 2, s * 2); }
    // 롯데월드타워 · 63빌딩
    if (mode !== "sky123") landmark(8800, -5900, 555, 70, "225,232,255", true, t);
    if (mode !== "sky63") landmark(-4300, -3520, 250, 40, "255,200,110", false, t);
    else landmark(0, 0, 480, 18, "200,220,255", true, t);   // 63에서 보면 남산 위 서울타워
    g.globalCompositeOperation = "source-over";
    // 전광판(도시 위 큰 화면 셋)
    boardHit = [];
    for (const [az, d] of [[152, 1500], [70, 1700], [-100, 1600], [-20, 1500]]) { const ar = az * RAD; drawBoard(Math.sin(ar) * d, 130, Math.cos(ar) * d, 260, 74, false); }
    fwTick(dt); drawFws(dt, false);
    // 장소 이름
    g.font = "600 11.5px -apple-system, sans-serif"; g.textAlign = "center"; g.textBaseline = "bottom";
    if (!scope) for (const [name, x, y, z] of labs()) if (prj(x, y, z) && PX > 30 && PX < W - 30) { const yy = PY - 10; g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = 1; g.beginPath(); g.moveTo(PX, PY - 2); g.lineTo(PX, yy); g.stroke(); g.fillStyle = "rgba(240,234,255,.78)"; g.fillText(name, PX, yy - 2); }
    if (scope) return; if (D.room === "ring") drawDeckRoom(t); else drawRectRoom(t);
  }
  // ---------- 🗼 전망대 안: 직접 걸어 다니기 ----------
  // 둥근 전망대(유리 반지름 15m, 가운데 엘리베이터 기둥 반지름 7m). 조이스틱·WASD·바닥 톡으로 걷고, 끌어서 둘러본다
  const FLOOR = 478, EYE = 1.6, RG = 15, RC = 7, RMIN = 8.6, RMAX = 13.9;
  // 전망대들: x·z = 지도 위 자리(남산 = 0,0), floor = 바닥 높이(3D 해발), room = 방 모양
  //   ring: 남산 둥근 전망대 / rect: 63빌딩 60층(긴 네모 유리방, 가운데 엘리베이터 벽 hx·hz 안에 cx·cz)
  const DECKS = {
    tower: { x: 0, z: 0, floor: FLOOR, room: "ring", yaw: 172, pitch: -24, start: [Math.sin(172 * RAD) * 13.8, Math.cos(172 * RAD) * 13.8], icon: "🗼",
      name: "🗼 남산서울타워 전망대", sub: "해발 480m · 서울의 밤 360°", cap: ["남산서울타워", "해발 480m에서 내려다보는 서울의 밤"], hint: "창가 망원경을 누르면 서울 명소가 크게 보여요 🔭" },
    sky63: { x: -4300, z: -3520, floor: 258, room: "rect", hx: 17, hz: 8, cx: 5.2, cz: 2.4, ceil: 4.2, yaw: 40, pitch: -20, start: [0, 6.6], lowSill: 1, icon: "🏙",
      tel: [[-13, 7.2, 0], [-4.5, 7.2, 0], [4.5, 7.2, 0], [13, 7.2, 0], [16.2, 0, 90], [-8, -7.2, 180], [8, -7.2, 180], [-16.2, 0, 270]],
      name: "🏙 63빌딩 전망대", sub: "여의도 60층 · 한강이 발아래", cap: ["63빌딩", "1985년부터 한강을 지켜 온 여의도의 금빛 빌딩, 60층"], hint: "창가 망원경을 누르면 여의도와 한강 명소가 크게 보여요 🔭" },
    sky123: { x: 8800, z: -5900, floor: 508, room: "rect", hx: 15, hz: 15, cx: 5, cz: 5, ceil: 4.6, glass: [-6, 6, 9.2, 13.8], minP: -86, yaw: 0, pitch: -38, start: [0, 11.4], icon: "🌃", tint: [.6, .8, 1], wall: 0x2a2c36,
      tel: [[-11, 14.2, 0], [11, 14.2, 0], [14.2, 8, 90], [14.2, -8, 90], [-8, -14.2, 180], [8, -14.2, 180], [-14.2, -8, 270], [-14.2, 8, 270]],
      name: "🌃 롯데월드타워 서울스카이", sub: "118층 · 발밑까지 유리 바닥", cap: ["서울스카이", "118층, 지상 478m 유리 바닥 위에서"], hint: "북쪽 유리 바닥에 서서 발밑을 내려다봐요 👣" },
    // 🛋 79차 한강 라운지: 반포 강변 빌딩 위층(이 앱 속 가상의 쉼터). 북쪽 창 = 한강·반포대교·남산서울타워. 창가 소파에서 🛋 쉬기
    lounge: { x: 600, z: -3520, floor: 136, room: "rect", hx: 15, hz: 7, cx: 4, cz: 1.8, ceil: 3.8, yaw: 0, pitch: -10, start: [0, 5.6], icon: "🛋", tint: [1, .85, .6], wall: 0x4a3426, sofa: true, tel: [],
      name: "🛋 한강 라운지", sub: "반포 강변 빌딩 위층 · 앱 속 쉼터", cap: ["한강 라운지", "강 건너 남산까지, 소파에 앉아 천천히"], hint: "🛋 쉬기를 누르면 창가 소파에 앉아 화면이 조용해져요" },
  };
  let D = DECKS.tower;
  const walk = { x: 0, z: 0, jx: 0, jy: 0, keys: new Set(), to: null, bob: 0 };
  const walking = () => walk.jx || walk.jy || walk.keys.size || walk.to;
  function placeWalk() { camX = walk.x; camZ = walk.z; }
  // 걸을 수 있는 곳으로 맞추기: 둥근 방은 고리, 네모 방은 유리와 가운데 벽 사이
  function fitWalk(x, z) {
    if (D.room === "ring") { const r = Math.hypot(x, z) || 1, rr = clamp(r, RMIN, RMAX); return [x * rr / r, z * rr / r]; }
    let lx = clamp(x - D.x, -D.hx + 1, D.hx - 1), lz = clamp(z - D.z, -D.hz + 1, D.hz - 1);
    const ox = D.cx + .7 - Math.abs(lx), oz = D.cz + .7 - Math.abs(lz);
    if (ox > 0 && oz > 0) { if (ox < oz) lx = (lx < 0 ? -1 : 1) * (D.cx + .7); else lz = (lz < 0 ? -1 : 1) * (D.cz + .7); }
    return [D.x + lx, D.z + lz];
  }
  // 망원경 자리 [x, z, 바깥 방향]
  function telPos() {
    if (D.room === "ring") { const L = []; for (let i = 0; i < 8; i++) { const a = (i + .5) / 8 * TAU; L.push([Math.sin(a) * (RG - .8), Math.cos(a) * (RG - .8), a]); } return L; }
    return D.tel.map(([lx, lz, a]) => [D.x + lx, D.z + lz, a * RAD]);
  }
  // 함께 보는 사람이 서 있는 자리 [x, z, 보는 방향]
  function riderPos(i, t) {
    if (D.room === "ring") { const a = (i * 61 + 25) * RAD + Math.sin(t * .05 + i) * .05; return [Math.sin(a) * 13.6, Math.cos(a) * 13.6, a]; }
    const k = [[-10, 1], [9, 1], [-1.5, 1], [-6, -1], [6, -1], [14.5, 1]][i % 6], lx = k[0] + Math.sin(t * .05 + i) * .4;
    return [D.x + lx, D.z + k[1] * (D.hz - 1.1), k[1] > 0 ? 0 : Math.PI];
  }
  function walkStep(dt) {
    let fx = 0, fz = 0;
    const k = walk.keys; let mx = walk.jx + (k.has("d") ? 1 : 0) - (k.has("a") ? 1 : 0), my = walk.jy + (k.has("w") ? 1 : 0) - (k.has("s") ? 1 : 0);
    if (walk.to) { const dx = walk.to[0] - camX, dz = walk.to[1] - camZ, d = Math.hypot(dx, dz); if (d < .25) walk.to = null; else { fx = dx / d; fz = dz / d; } }
    if (mx || my) { walk.to = null; const l = Math.max(1, Math.hypot(mx, my)); mx /= l; my /= l; fx = Math.sin(yaw) * my + Math.cos(yaw) * mx; fz = Math.cos(yaw) * my - Math.sin(yaw) * mx; }
    const sp = 2.3, moving = fx || fz;
    if (moving) { const [x, z] = fitWalk(camX + fx * sp * dt, camZ + fz * sp * dt); if (walk.to && Math.hypot(x - walk.x, z - walk.z) < sp * dt * .2) walk.to = null; walk.x = x; walk.z = z; walk.bob += dt * 7.5; idleAt = performance.now() + 4000; }
    placeWalk(); camY = D.floor + EYE + (moving ? Math.sin(walk.bob) * .035 : 0);
    if (rest) { camY += (rest.k - 1) * (EYE - 1.12); rest.k = Math.min(1, rest.k + dt * .5); }
  }
  T.walkTo = (x, z) => { walk.to = [x, z]; };
  T.scopeAt = az => scopeOn(az * RAD);
  // 🛋 쉬기: 가까운 창가 소파로 가서 앉고, 글자·버튼을 숨긴 채 아주 천천히 둘러본다(소리 없음). 화면을 톡 누르면 끝
  let rest = null;
  const SOFAS = [-9, 0, 9];
  function restOn() {
    if (!deck() || !D.sofa) return;
    const lx = SOFAS.reduce((a, b) => Math.abs(b - (camX - D.x)) < Math.abs(a - (camX - D.x)) ? b : a, 0);
    walk.to = null; walk.x = D.x + lx; walk.z = D.z + D.hz - 2.7; placeWalk();
    rest = { t: 0, k: 0, yaw: 0, pitch: -4 * RAD }; tZoom = glState === 2 ? 1.3 : 1;
    root.classList.add("rest"); if (scope) scopeOff(); box.classList.remove("on");
    cfg.send({ t: "trip", v: mode });
  }
  function restOff() { if (!rest) return; rest = null; root.classList.remove("rest"); tPitch = basePitch(); idleAt = performance.now() + 6000; hint("다시 걸을 수 있어요 · 🛋 쉬기로 언제든 다시 앉아요"); }
  T.rest = () => restOn();
  // 화면 한 점 → 바닥 위 점(바닥을 톡 누르면 그리로 걸어감)
  function floorAt(px, py) {
    const x1 = (px - CX) / F, y2 = (CY - py) / F, z2 = 1;
    const y = y2 * cpt + z2 * spt, z1 = -y2 * spt + z2 * cpt, x = x1 * cyw + z1 * syw, z = -x1 * syw + z1 * cyw;
    if (y > -.02) return null; const t = (D.floor - camY) / y; if (t > 25) return null; return [camX + x * t, camZ + z * t];
  }
  const ring = (r, y, a) => [Math.sin(a) * r, y, Math.cos(a) * r];
  function drawDeckRoom(t) {
    const N = 48;
    // 천장: 어두운 판 + 둥글게 늘어선 다운라이트
    for (let i = 0; i < N; i++) { const a0 = i / N * TAU, a1 = (i + 1) / N * TAU; poly([...ring(RC, FLOOR + 3.9, a0), ...ring(RG, FLOOR + 3.9, a0), ...ring(RG, FLOOR + 3.9, a1), ...ring(RC, FLOOR + 3.9, a1)], i % 2 ? "#0e0f18" : "#10111b"); }
    // 바닥: 따뜻한 카펫, 유리 쪽으로 갈수록 바깥 불빛이 은은하게
    for (let i = 0; i < N; i++) { const a0 = i / N * TAU, a1 = (i + 1) / N * TAU; poly([...ring(RC, FLOOR, a0), ...ring(RG, FLOOR, a0), ...ring(RG, FLOOR, a1), ...ring(RC, FLOOR, a1)], i % 2 ? "#161219" : "#18141b"); }
    for (let i = 0; i < N; i++) { const a0 = i / N * TAU, a1 = (i + 1) / N * TAU; poly([...ring(RG - 1.4, FLOOR + .01, a0), ...ring(RG, FLOOR + .01, a0), ...ring(RG, FLOOR + .01, a1), ...ring(RG - 1.4, FLOOR + .01, a1)], "rgba(120,100,150,.10)"); }
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; for (const rr of [9.5, 12.8]) { const p = ring(rr, FLOOR + 3.88, a + (rr > 10 ? .04 : 0)); if (prj(p[0], p[1], p[2])) { const s2 = clamp(F * .5 / PZ, 1, 30); g.drawImage(glowSprite("255,214,160"), PX - s2, PY - s2 * .5, s2 * 2, s2); }
      const f = ring(rr, FLOOR + .02, a + (rr > 10 ? .04 : 0)); if (prj(f[0], f[1], f[2])) { const s2 = clamp(F * .9 / PZ, 1, 60); g.globalAlpha = .12; g.drawImage(glowSprite("255,200,140"), PX - s2, PY - s2 * .35, s2 * 2, s2 * .7); g.globalAlpha = 1; } } }
    // 유리 아래 은은한 띠 조명
    for (let i = 0; i < 96; i++) { const p = ring(RG - .15, FLOOR + .45, i / 96 * TAU); if (prj(p[0], p[1], p[2])) { const s2 = clamp(F * .45 / PZ, .8, 18); g.globalAlpha = .35; g.drawImage(glowSprite("255,205,150"), PX - s2, PY - s2 * .4, s2 * 2, s2 * .8); g.globalAlpha = 1; } }
    g.globalCompositeOperation = "source-over";
    // 창: 아래 턱(낮은 벽), 위 틀, 세로 창틀, 놋쇠 손잡이 — 가까운 것부터 늦게
    const items = [];
    for (let i = 0; i < 30; i++) { const a = i / 30 * TAU, p = ring(RG, FLOOR, a); items.push([Math.hypot(p[0] - camX, p[2] - camZ), 0, a]); }
    for (let i = 0; i < 8; i++) { const a = (i + .5) / 8 * TAU, p = ring(RG - .8, FLOOR, a); items.push([Math.hypot(p[0] - camX, p[2] - camZ), 1, a]); }
    const vis = ridersOf().filter(n => n !== (cfg.nick ? cfg.nick() : "")).slice(0, 6);
    vis.forEach((nick, i) => { const a = (i * 61 + 25) * RAD + Math.sin(t * .05 + i) * .05, p = ring(13.6, FLOOR, a); items.push([Math.hypot(p[0] - camX, p[2] - camZ), 2, a, nick, i]); });
    items.sort((p, q) => q[0] - p[0]);
    for (const it of items) {
      const a = it[2];
      if (it[1] === 0) {
        const a1 = a + TAU / 30;
        poly([...ring(RG, FLOOR, a), ...ring(RG, FLOOR, a1), ...ring(RG, FLOOR + .5, a1), ...ring(RG, FLOOR + .5, a)], "#0b0b12");                       // 턱
        poly([...ring(RG, FLOOR + 3.55, a), ...ring(RG, FLOOR + 3.55, a1), ...ring(RG, FLOOR + 3.9, a1), ...ring(RG, FLOOR + 3.9, a)], "#0a0a12");          // 위 틀
        const p0 = ring(RG, FLOOR + .5, a), p1 = ring(RG, FLOOR + 3.55, a);                                                                        // 세로 창틀
        if (prj(...p0)) { const ax = PX, ay = PY, w = Math.max(1.5, F * .14 / PZ); if (prj(...p1)) { g.strokeStyle = "#0c0c15"; g.lineWidth = w; g.beginPath(); g.moveTo(ax, ay); g.lineTo(PX, PY); g.stroke(); g.strokeStyle = "rgba(255,220,180,.07)"; g.lineWidth = 1; g.stroke(); } }
        const h0 = ring(RG - .3, FLOOR + 1.02, a), h1 = ring(RG - .3, FLOOR + 1.02, a1);                                                           // 손잡이
        if (prj(...h0)) { const ax = PX, ay = PY; if (prj(...h1)) { g.strokeStyle = "rgba(214,176,112,.85)"; g.lineWidth = Math.max(1, F * .05 / PZ); g.beginPath(); g.moveTo(ax, ay); g.lineTo(PX, PY); g.stroke(); } }
        // 유리에 붙은 방향 글씨
        if (Math.round(a / TAU * 30) % 30 % 7.5 < .01 || [0, 8, 15, 23].includes(Math.round(a / TAU * 30))) {
          const idx = [0, 8, 15, 23].indexOf(Math.round(a / TAU * 30)); if (idx >= 0) { const L = ["북쪽 · 북한산 · 광화문", "동쪽 · 롯데월드타워 · 잠실", "남쪽 · 한강 · 강남", "서쪽 · 여의도 · 63빌딩"][idx], q = ring(RG - .05, FLOOR + 3.3, a + TAU / 60);
            if (prj(...q) && PZ < 40) { const fs = clamp(F * .17 / PZ, 8, 26); g.font = `500 ${fs}px -apple-system, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "rgba(240,232,255,.55)"; g.fillText(L, PX, PY); } }
        }
      } else if (it[1] === 1) {   // 망원경
        const p = ring(RG - .8, FLOOR, a), q = ring(RG - .8, FLOOR + 1.15, a);
        if (prj(...p)) { const ax = PX, ay = PY, w = Math.max(2, F * .1 / PZ); if (prj(...q)) { g.strokeStyle = "#2a2a36"; g.lineWidth = w; g.beginPath(); g.moveTo(ax, ay); g.lineTo(PX, PY); g.stroke(); g.fillStyle = "#34343f"; g.beginPath(); g.ellipse(PX, PY, w * 2.4, w * 1.4, 0, 0, TAU); g.fill(); g.fillStyle = "rgba(255,210,150,.25)"; g.fillRect(PX - w * 2, PY - w * .4, w * 4, w * .5); } }
      } else {   // 함께 보는 사람: 창가에 서서 밖을 보는 뒷모습
        const p = ring(13.6, FLOOR, a); if (!prj(...p)) continue; const fx = PX, fy = PY; if (!prj(p[0], FLOOR + 1.6, p[2])) continue; const hgt = fy - PY; if (hgt < 5) continue;
        const nick = it[3], hue = (hash(nick.length * 7 + nick.charCodeAt(0)) * 360) | 0;
        g.fillStyle = `hsl(${hue},35%,45%)`; g.beginPath(); g.ellipse(fx, fy - hgt * .32, hgt * .16, hgt * .32, 0, 0, TAU); g.fill();
        g.fillStyle = "#1e1612"; g.beginPath(); g.arc(fx, fy - hgt * .76, hgt * .15, 0, TAU); g.fill();
        g.font = `600 ${clamp(hgt * .13, 9, 14)}px sans-serif`; g.textAlign = "center"; g.textBaseline = "bottom"; g.fillStyle = "rgba(255,240,220,.8)"; g.fillText(nick, fx, fy - hgt * .97);
      }
    }
    // 가운데 엘리베이터 기둥: 나무 판 + 위아래 띠 조명, 엘리베이터 문 둘
    for (let i = 0; i < 36; i++) {
      const a0 = i / 36 * TAU, a1 = (i + 1) / 36 * TAU, am = (a0 + a1) / 2, nx = Math.sin(am), nz = Math.cos(am);
      if ((camX - nx * RC) * nx + (camZ - nz * RC) * nz <= 0) continue;
      const door = (i % 18 === 0 || i % 18 === 1), shade = .55 + .45 * Math.max(0, Math.cos(am - Math.atan2(camX, camZ)));
      poly([...ring(RC, FLOOR, a0), ...ring(RC, FLOOR, a1), ...ring(RC, FLOOR + 3.9, a1), ...ring(RC, FLOOR + 3.9, a0)], door ? `rgb(${70 * shade | 0},${72 * shade | 0},${82 * shade | 0})` : `rgb(${74 * shade | 0},${52 * shade | 0},${38 * shade | 0})`);
      if (!door && i % 2) { const p0 = ring(RC + .01, FLOOR + .1, a0), p1 = ring(RC + .01, FLOOR + 3.8, a0); if (prj(...p0)) { const ax = PX, ay = PY; if (prj(...p1)) { g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 1; g.beginPath(); g.moveTo(ax, ay); g.lineTo(PX, PY); g.stroke(); } } }
    }
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 72; i++) { const a = i / 72 * TAU, nx = Math.sin(a), nz = Math.cos(a); if ((camX - nx * RC) * nx + (camZ - nz * RC) * nz <= 0) continue; for (const yy of [FLOOR + .15, FLOOR + 3.7]) { const p = ring(RC + .05, yy, a); if (prj(...p)) { const s2 = clamp(F * .35 / PZ, .8, 16); g.globalAlpha = .4; g.drawImage(glowSprite("255,200,140"), PX - s2, PY - s2 * .4, s2 * 2, s2 * .8); g.globalAlpha = 1; } } }
    g.globalCompositeOperation = "source-over";
    // 유리에 비친 실내(아주 옅게)
    const sheen = g.createLinearGradient(0, 0, W, H); sheen.addColorStop(0, "rgba(255,255,255,0)"); sheen.addColorStop(.48, "rgba(255,255,255,0)"); sheen.addColorStop(.5, "rgba(200,210,255,.03)"); sheen.addColorStop(.56, "rgba(255,255,255,0)");
    g.fillStyle = sheen; g.fillRect(0, 0, W, H);
  }
  // ---------- 🏙 63빌딩 60층: 긴 네모 유리방(2D 그림, 3D가 안 되는 기기용) ----------
  function drawRectRoom(t) {
    const F0 = D.floor, CH = D.ceil, hx = D.hx, hz = D.hz, P = (lx, y, lz) => [D.x + lx, y, D.z + lz];
    const quad = (a, b, c, d, col) => poly([...a, ...b, ...c, ...d], col);
    // 천장 · 바닥(어두운 돌, 유리 쪽은 바깥 불빛이 은은하게)
    for (let i = 0; i < 8; i++) { const x0 = -hx + i * hx / 4, x1 = x0 + hx / 4; quad(P(x0, F0 + CH, -hz), P(x1, F0 + CH, -hz), P(x1, F0 + CH, hz), P(x0, F0 + CH, hz), i % 2 ? "#0f0e14" : "#121118");
      if (!D.glass) quad(P(x0, F0, -hz), P(x1, F0, -hz), P(x1, F0, hz), P(x0, F0, hz), i % 2 ? "#17141a" : "#19161d"); }
    if (D.glass) { const [a0, a1, b0, b1] = D.glass; for (const [x0, x1, z0, z1] of [[-hx, hx, -hz, b0], [-hx, hx, b1, hz], [-hx, a0, b0, b1], [a1, hx, b0, b1]]) quad(P(x0, F0, z0), P(x1, F0, z0), P(x1, F0, z1), P(x0, F0, z1), "#18161c");
      g.strokeStyle = "rgba(200,225,255,.35)"; g.lineWidth = 1; for (let x = a0; x <= a1 + .01; x += 1.5) if (prj(...P(x, F0, b0))) { const ax = PX, ay = PY; if (prj(...P(x, F0, b1))) { g.beginPath(); g.moveTo(ax, ay); g.lineTo(PX, PY); g.stroke(); } } for (let z = b0; z <= b1 + .01; z += 1.5) if (prj(...P(a0, F0, z))) { const ax = PX, ay = PY; if (prj(...P(a1, F0, z))) { g.beginPath(); g.moveTo(ax, ay); g.lineTo(PX, PY); g.stroke(); } } }
    g.globalCompositeOperation = "lighter";
    for (let i = -3; i <= 3; i++) for (const lz of [-5, 5]) { const p = P(i * 4.6, F0 + CH - .02, lz); if (prj(...p)) { const s2 = clamp(F * .5 / PZ, 1, 30); g.drawImage(glowSprite("255,214,160"), PX - s2, PY - s2 * .5, s2 * 2, s2); }
      const f = P(i * 4.6, F0 + .02, lz); if (prj(...f)) { const s2 = clamp(F * 1.1 / PZ, 1, 70); g.globalAlpha = .14; g.drawImage(glowSprite("255,200,140"), PX - s2, PY - s2 * .35, s2 * 2, s2 * .7); g.globalAlpha = 1; } }
    g.globalCompositeOperation = "source-over";
    // 유리벽: 턱·위 틀·세로 창틀(1.8m마다)·금빛 유리 빛, 가까운 것부터 늦게
    const items = [];
    const walls = [[[-hx, hz], [hx, hz]], [[hx, hz], [hx, -hz]], [[hx, -hz], [-hx, -hz]], [[-hx, -hz], [-hx, hz]]];
    for (const [a, b] of walls) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.round(L / 1.8); for (let k = 0; k < n; k++) { const u0 = k / n, u1 = (k + 1) / n, x0 = a[0] + (b[0] - a[0]) * u0, z0 = a[1] + (b[1] - a[1]) * u0, x1 = a[0] + (b[0] - a[0]) * u1, z1 = a[1] + (b[1] - a[1]) * u1; items.push([Math.hypot(D.x + (x0 + x1) / 2 - camX, D.z + (z0 + z1) / 2 - camZ), 0, x0, z0, x1, z1]); } }
    telPos().forEach(([x, z]) => items.push([Math.hypot(x - camX, z - camZ), 1, x, z]));
    ridersOf().filter(n => n !== (cfg.nick ? cfg.nick() : "")).slice(0, 6).forEach((nick, i) => { const [x, z] = riderPos(i, t); items.push([Math.hypot(x - camX, z - camZ), 2, x, z, nick]); });
    items.sort((p, q) => q[0] - p[0]);
    for (const it of items) {
      if (it[1] === 0) {
        const [, , x0, z0, x1, z1] = it;
        quad(P(x0, F0, z0), P(x1, F0, z1), P(x1, F0 + .45, z1), P(x0, F0 + .45, z0), "#0b0b12");
        quad(P(x0, F0 + CH - .4, z0), P(x1, F0 + CH - .4, z1), P(x1, F0 + CH, z1), P(x0, F0 + CH, z0), "#0a0a12");
        quad(P(x0, F0 + .45, z0), P(x1, F0 + .45, z1), P(x1, F0 + CH - .4, z1), P(x0, F0 + CH - .4, z0), "rgba(255,196,96,.035)");
        if (prj(...P(x0, F0 + .45, z0))) { const ax = PX, ay = PY, w = Math.max(1.5, F * .12 / PZ); if (prj(...P(x0, F0 + CH - .4, z0))) { g.strokeStyle = "#0c0c15"; g.lineWidth = w; g.beginPath(); g.moveTo(ax, ay); g.lineTo(PX, PY); g.stroke(); g.strokeStyle = "rgba(255,210,150,.08)"; g.lineWidth = 1; g.stroke(); } }
      } else if (it[1] === 1) {
        if (prj(it[2], F0, it[3])) { const ax = PX, ay = PY, w = Math.max(2, F * .1 / PZ); if (prj(it[2], F0 + 1.15, it[3])) { g.strokeStyle = "#2a2a36"; g.lineWidth = w; g.beginPath(); g.moveTo(ax, ay); g.lineTo(PX, PY); g.stroke(); g.fillStyle = "#3a3326"; g.beginPath(); g.ellipse(PX, PY, w * 2.4, w * 1.4, 0, 0, TAU); g.fill(); g.fillStyle = "rgba(255,210,150,.3)"; g.fillRect(PX - w * 2, PY - w * .4, w * 4, w * .5); } }
      } else {
        if (!prj(it[2], F0, it[3])) continue; const fx = PX, fy = PY; if (!prj(it[2], F0 + 1.6, it[3])) continue; const hgt = fy - PY; if (hgt < 5) continue;
        const nick = it[4], hue = (hash(nick.length * 7 + nick.charCodeAt(0)) * 360) | 0;
        g.fillStyle = `hsl(${hue},35%,45%)`; g.beginPath(); g.ellipse(fx, fy - hgt * .32, hgt * .16, hgt * .32, 0, 0, TAU); g.fill();
        g.fillStyle = "#1e1612"; g.beginPath(); g.arc(fx, fy - hgt * .76, hgt * .15, 0, TAU); g.fill();
        g.font = `600 ${clamp(hgt * .13, 9, 14)}px sans-serif`; g.textAlign = "center"; g.textBaseline = "bottom"; g.fillStyle = "rgba(255,240,220,.8)"; g.fillText(nick, fx, fy - hgt * .97);
      }
    }
    // 가운데 엘리베이터 벽: 따뜻한 나무 + 그림 액자
    const cx = D.cx, cz = D.cz;
    for (const [a, b, nx, nz] of [[[-cx, cz], [cx, cz], 0, 1], [[cx, cz], [cx, -cz], 1, 0], [[cx, -cz], [-cx, -cz], 0, -1], [[-cx, -cz], [-cx, cz], -1, 0]]) {
      if ((camX - D.x - nx * (nx ? cx : 0)) * nx + (camZ - D.z - nz * (nz ? cz : 0)) * nz <= 0) continue;
      const shade = .6 + .4 * Math.abs(nx * Math.sin(yaw) + nz * Math.cos(yaw));
      quad(P(a[0], F0, a[1]), P(b[0], F0, b[1]), P(b[0], F0 + CH, b[1]), P(a[0], F0 + CH, a[1]), `rgb(${74 * shade | 0},${52 * shade | 0},${38 * shade | 0})`);
      if (nz) for (let k = -1; k <= 1; k++) { const x0 = k * 3.2 - 1, x1 = k * 3.2 + 1, zz = nz * (cz + .02); quad(P(x0, F0 + 1.2, zz), P(x1, F0 + 1.2, zz), P(x1, F0 + 2.6, zz), P(x0, F0 + 2.6, zz), ["#2c4a6e", "#7a3b4a", "#3d6650"][(k + 1 + (nz > 0 ? 0 : 1)) % 3]); }
    }
    const sheen = g.createLinearGradient(0, 0, W, 0); sheen.addColorStop(0, "rgba(255,190,90,.03)"); sheen.addColorStop(.5, "rgba(255,190,90,0)"); sheen.addColorStop(1, "rgba(255,190,90,.03)"); g.fillStyle = sheen; g.fillRect(0, 0, W, H);
  }
  function landmark(x, z, h, w, col, spire, t) {
    if (!prj(x, 0, z)) return; const bx = PX, by = PY; if (!prj(x, h, z)) return; const tx = PX, ty = PY, half = Math.max(1.5, F * w / 2 / PZ);
    g.globalCompositeOperation = "source-over";
    g.fillStyle = spire ? "#191c34" : "#5a4420"; g.beginPath(); g.moveTo(bx - half, by); g.lineTo(tx - half * (spire ? .12 : .8), ty); g.lineTo(tx + half * (spire ? .12 : .8), ty); g.lineTo(bx + half, by); g.fill();
    g.globalCompositeOperation = "lighter";
    for (let k = 0; k < 22; k++) { const u = k / 22, yy = by + (ty - by) * u, ww = half * (spire ? 1 - u * .88 : 1 - u * .2); g.fillStyle = `rgba(${col},${(spire ? .3 + .5 * u : .5) * (.7 + .3 * Math.sin(t + k))})`; g.fillRect(bx + (tx - bx) * u - ww * .8, yy, ww * 1.6, Math.max(.8, (by - ty) / 44)); }
    const s = F * w * 1.4 / PZ; g.globalAlpha = .6; g.drawImage(glowSprite(col), tx - s, ty - s * .6, s * 2, s * 1.4); g.globalAlpha = 1;
    if (spire && Math.sin(t * 2.2) > .1) g.drawImage(glowSprite("255,70,60"), tx - 5, ty - 7, 10, 10);
  }

  // ---------- 공통: 카메라 · 루프 · 입력 ----------
  function setCam(y, p) {
    const minF = Math.max(W / 2 / Math.tan(40 * RAD), H / 2 / Math.tan(45 * RAD));
    F = minF * zoom; CX = W / 2; CY = H / 2;
    cyw = Math.cos(y); syw = Math.sin(y); cpt = Math.cos(p); spt = Math.sin(p);
  }
  let tNow = 0, fpsAcc = 0, fpsN = 0;
  function frame(now) {
    if (!T.isOpen) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - last) / 1000); last = now; const t = now / 1000; tNow = t;
    // 너무 느리면 해상도를 낮춘다(폰 배터리·발열)
    fpsAcc += dt; fpsN++; if (fpsN >= 60) { const avg = fpsAcc / fpsN; fpsAcc = 0; fpsN = 0; if (avg > .03 && qual > .6) { qual = Math.max(.6, qual - .15); resize(); } else if (avg < .018 && qual < 1) { qual = Math.min(1, qual + .1); resize(); } }
    if (scope) scopeTick(dt);
    if (!drag && performance.now() > idleAt && mode === "cruise" && !skyUp) tYaw += (0 - tYaw) * Math.min(1, dt * .25);
    yaw += (tYaw - yaw) * Math.min(1, dt * (drag ? 12 : 6)); pitch += (tPitch - pitch) * Math.min(1, dt * (drag ? 12 : 5)); zoom += (tZoom - zoom) * Math.min(1, dt * 6);
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (glState === 2) frameGL(t, dt);
    else { g.fillStyle = "#04050d"; g.fillRect(0, 0, W, H); if (mode === "cruise") frameCruise(t, dt); else frameTower(t, dt); }
    if (scope) return drawScope(t);
    // 가장자리 어둡게
    const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .4, W / 2, H / 2, Math.hypot(W, H) * .62);
    v.addColorStop(0, "rgba(2,3,10,0)"); v.addColorStop(1, "rgba(2,3,10,.5)"); g.fillStyle = v; g.fillRect(0, 0, W, H);
  }
  function frameGL(t, dt) {
    g.clearRect(0, 0, W, H);
    let s = 0, yv = yaw, pv = pitch;
    if (mode === "cruise") {
      s = courseS(); camY = 4.05 + Math.sin(t * .95) * .07; camX = 0; camZ = s;
      roll = Math.sin(t * .76) * .6 * RAD + Math.sin(t * .31) * .3 * RAD;
      yv = yaw + Math.sin(t * .16) * 1.1 * RAD; pv = pitch + Math.sin(t * .95 + 1) * .35 * RAD;
      setCam(yv, pv); cruiseHud(s);
    } else {
      walkStep(dt); roll = 0;
      if (rest) { rest.t += dt; tYaw = rest.yaw + Math.sin(rest.t * .045) * 24 * RAD; tPitch = rest.pitch + (Math.sin(rest.t * .027 - 1.2) * .5 + .5) * 18 * RAD; }
      else if (!scope && performance.now() > idleAt + 8000 && !drag && !walking()) tYaw += dt * .6 * RAD;
      setCam(yaw, pitch);
    }
    fwTick(dt);
    nextMet -= dt; if (nextMet < 0) { spawnMeteor(); nextMet = starOn ? .9 + Math.random() * 2 : 7 + Math.random() * 12; }
    const me = cfg.nick ? cfg.nick() : "";
    lastSt = { mode, scope: !!scope, t, W, H, F, dpr: Math.min(window.devicePixelRatio || 1, 1.75) * qual, yaw: yv, pitch: pv, roll, camX, camY, camZ, s, starOn,
      fountainOn: starOn || (Date.now() / 1000) % 60 < 40, bb: bbNow(), boat: boatAt(),
      others: ridersOf().filter(n => n !== me).slice(0, 6), fwNew: glFw.splice(0), metNew: glMet.splice(0) };
    if (deck()) { lastSt.rpos = lastSt.others.map((n, i) => riderPos(i, t)); lastSt.labs = labs(); }
    if (mode === "cruise") camZ = 0;
    try { boardHit = GL.render(lastSt, g); }
    catch (e) { console.warn("tripgl", e); glState = -1; GL.canvas.remove(); pitch = tPitch = basePitch(); }
  }
  // 끌어서 둘러보기(손가락을 따라 장면이 움직임), 두 손가락 확대, 톡 = 별똥별 / 전광판 누르면 사연 창
  const ptrs = new Map(); let drag = false, downAt = 0, moved = 0, pinch0 = 0, zoom0 = 1, mvAt = 0, fv = 0;
  function onDown(e) {
    if (box.classList.contains("on")) { box.classList.remove("on"); return; }
    if (rest) { restOff(); return; }
    ptrs.set(e.pointerId, [e.clientX, e.clientY]); drag = true; downAt = performance.now(); moved = 0; idleAt = performance.now() + 8000;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom0 = tZoom; }
    try { cv.setPointerCapture(e.pointerId); } catch {}
  }
  function onMove(e) {
    if (!T.isOpen || !ptrs.has(e.pointerId)) return;
    const p = ptrs.get(e.pointerId), dx = e.clientX - p[0], dy = e.clientY - p[1]; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0) tZoom = clamp(zoom0 * d / pinch0, zMin(), zMax()); moved += 99; return; }
    moved += Math.abs(dx) + Math.abs(dy); if (scope) scope.auto = false;
    tYaw -= dx / F * 1.15; tPitch += dy / F * 1.15; clampView();
    if (e.pointerType === "touch") { const now = performance.now(), dts = Math.max(8, now - mvAt) / 1000; mvAt = now; fv = fv * .5 + (-dx / F * 1.15 / dts) * .5; } else { yaw = tYaw; pitch = tPitch; }   // 📱 88차: 폰은 프레임마다 보간(아래 dt*6)으로 부드럽게, 놓으면 조금 미끄러짐. PC 그대로
    if (skyUp && tPitch < 30 * RAD) { skyUp = false; syncSky(); }
  }
  function onUp(e) {
    if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); if (ptrs.size) return; drag = false; idleAt = performance.now() + 7000;
    if (e.pointerType === "touch") { if (moved >= 8 && performance.now() - mvAt < 90) { tYaw += clamp(fv, -4, 4) * .2; clampView(); } fv = 0; }
    if (moved < 8 && performance.now() - downAt < 400) {
      const x = e.clientX, y = e.clientY;
      if (scope) return;
      if (boardHit.some(([bx, by, bw, bh]) => x > bx - 6 && x < bx + bw + 6 && y > by - 6 && y < by + bh + 6)) return cfg.isAdmin() ? openAdmin() : openBB();
      if (deck()) for (const [tx, tz, a] of telPos()) { if (prj(tx, D.floor + .9, tz) && PZ < 9 && Math.hypot(PX - x, PY - y) < Math.max(34, F * .7 / PZ)) return scopeOn(a); }
      if (deck() && y > elY(0)) { const f = floorAt(x, y); if (f) walk.to = fitWalk(f[0], f[1]); return; }
      if (y < elY(0)) { const az = yaw + Math.atan((x - W / 2) / F), el = pitch + Math.atan((H / 2 - y) / F); spawnMeteor(az - .12, el + .06); }
    }
  }
  // ---------- 🔭 남산 망원경: 확대 시점으로 서울 명소 찾기 ----------
  // 명소 [키, 이름, 동쪽 x, 겨눌 높이 y, 북쪽 z, 이름표 높이, 한 줄 설명]. 좌표는 이 장면의 지도(남산 = 0,0) 기준
  const SPOTS = [
    ["lotte", "롯데월드타워", 8800, 300, -5900, 560, "높이 555m, 123층. 우리나라에서 가장 높은 건물이에요"],
    ["jamsil", "잠실", 9300, 40, -6300, 60, "롯데월드와 석촌호수가 있는 동네예요"],
    ["gangnam", "강남", 5200, 40, -6500, 60, "테헤란로를 따라 빌딩 불빛이 길게 이어져요"],
    ["banpo", "반포대교 달빛무지개분수", 200, 14, 0, 30, "2008년 세계에서 가장 긴 교량 분수(1,140m)로 기네스에 올랐어요"],
    ["hannam", "한남대교", 1700, 14, 0, 30, "1969년 개통. 강남 개발이 이 다리에서 시작됐어요"],
    ["dongjak", "동작대교", -1300, 14, 0, 30, "지하철 4호선이 다리 위로 달려요"],
    ["hangang", "한강대교", -2600, 14, 0, 30, "1917년 한강에 처음 놓인 인도교 자리예요"],
    ["mapo", "마포대교", -5000, 14, 0, 30, "여의도와 마포를 잇는 다리예요"],
    ["63", "63빌딩", -4300, 130, -3520, 255, "1985년 문을 연 여의도의 금빛 빌딩, 높이 249m"],
    ["yeouido", "여의도", -6400, 40, -2400, 120, "국회의사당과 여의도한강공원이 있는 섬이에요"],
    ["yongsan", "용산공원", -300, 10, -1700, 30, "옛 미군기지 땅이 공원으로 바뀌고 있는 숲이에요"],
    ["seoulst", "서울역", -1500, 20, 400, 40, "1925년 지은 옛 역사는 지금 문화역서울284예요"],
    ["gwanghwa", "광화문 · 경복궁", -600, 20, 3300, 40, "경복궁의 정문. 경복궁은 1395년에 지은 조선의 첫 궁궐이에요"],
    ["ddp", "동대문디자인플라자", 1850, 20, 1700, 40, "2014년 문을 연 은빛 곡선 건물, 밤에도 불빛이 은은해요"],
    ["bukhan", "북한산", 200, 500, 11800, 760, "최고봉 백운대 836m. 서울 북쪽을 감싸는 국립공원이에요"],
    ["gwanak", "관악산", -2400, 380, -9300, 590, "높이 632m, 서울 남쪽의 바위산이에요"],
  ];
  // 🏙 63빌딩 망원경 명소(가까운 여의도·한강 위주). 키 앞에 y- 를 붙여 남산 목록과 따로 모은다
  const SPOTS63 = [
    ["y-namsan", "남산서울타워", 0, 400, 0.01, 500, "남산 꼭대기 전망대. 1980년부터 누구나 올라갈 수 있게 됐어요"],
    ["y-wonhyo", "원효대교", -3900, 14, 0, 30, "63빌딩 바로 옆, 여의도 동쪽 끝과 용산을 이어요"],
    ["y-park", "여의도한강공원", -5100, 3, -3230, 22, "해마다 가을 서울세계불꽃축제가 열리는 강변 공원이에요"],
    ["y-mapo", "마포대교", -5000, 14, 0, 30, "여의도와 마포를 잇는 다리예요"],
    ["y-bamseom", "밤섬", -6150, 6, 0, 28, "철새가 쉬어 가는 한강 속 작은 섬. 2012년 람사르 습지가 됐어요"],
    ["y-assembly", "국회의사당", -6350, 40, -3600, 80, "1975년 완공. 커다란 돔 지붕이 여의도 서쪽 끝에 있어요"],
    ["y-parc1", "파크원", -4950, 200, -3830, 345, "높이 333m. 여의도에서 가장 높은 빌딩이에요"],
    ["y-ifc", "IFC 서울", -5300, 150, -3680, 296, "유리 빌딩 세 동, 가장 높은 동은 284m예요"],
    ["y-seogang", "서강대교", -5900, 30, 0, 62, "가운데 빨간 아치가 밤섬 위를 지나요. 신촌과 여의도를 이어요"],
    ["y-rail", "한강철교", -2830, 18, 0, 30, "1900년 한강에 처음 놓인 다리. 지금은 네 줄 철길로 기차가 오가요"],
    ["y-saet", "샛강", -4500, 2, -4060, 18, "여의도 남쪽을 감싸 흐르는 작은 물길. 그래서 여의도는 섬이에요"],
    ["y-nodeul", "노들섬", -2600, 6, 0, 26, "한강대교 가운데 섬. 2019년 음악·문화 공간으로 다시 열었어요"],
    ["y-yongsan", "용산", -2300, 50, -1500, 110, "한강 건너 용산역 둘레의 높은 빌딩 불빛이에요"],
    ["y-lotte", "롯데월드타워", 8800, 300, -5900, 560, "13km 떨어진 잠실의 555m 빌딩. 여기서도 꼭대기가 보여요"],
    ["y-gwanak", "관악산", -2400, 380, -9300, 590, "높이 632m, 서울 남쪽의 바위산이에요"],
  ];
  // 🌃 서울스카이 망원경 명소(잠실·강남·한강 동쪽). 키 앞에 l-
  const SPOTS123 = [
    ["l-seokchon", "석촌호수", 8900, 3, -6280, 22, "롯데월드타워 바로 아래 두 호수. 봄이면 둘레 벚꽃길로 붐벼요"],
    ["l-world", "롯데월드 매직아일랜드", 8500, 30, -6250, 70, "1989년 문을 연 놀이공원. 호수 위 성이 매직아일랜드예요"],
    ["l-stadium", "잠실종합운동장", 6600, 20, -5100, 60, "1988 서울올림픽 개막식이 열린 주경기장이 있어요"],
    ["l-olympic", "올림픽공원", 10900, 10, -6400, 40, "1986년 문을 연 공원. 백제 때 쌓은 몽촌토성이 남아 있어요"],
    ["l-jamsilbr", "잠실대교", 10200, 14, 0, 30, "잠실과 광진구 자양동을 잇는 다리예요"],
    ["l-cheongdam", "청담대교", 8100, 14, 0, 30, "위로는 차, 아래층으로는 지하철 7호선이 지나는 2층 다리예요"],
    ["l-yeongdong", "영동대교", 6300, 14, 0, 30, "강남 청담동과 성수동을 잇는 다리예요"],
    ["l-gangnam", "강남 테헤란로", 5200, 40, -6500, 60, "삼성역에서 강남역까지 빌딩 불빛이 길게 이어져요"],
    ["l-achasan", "아차산", 11500, 200, 4200, 300, "한강 북쪽 산. 고구려 때 쌓은 보루 유적이 남아 있어요"],
    ["l-namsan", "남산서울타워", 0, 400, 0.01, 500, "서쪽으로 약 10km. 서울 한가운데 남산 꼭대기예요"],
    ["l-63", "63빌딩", -4300, 130, -3520, 255, "서쪽 끝 여의도의 금빛 빌딩, 13km 떨어져 있어요"],
    ["l-bukhan", "북한산", 200, 500, 11800, 760, "최고봉 백운대 836m. 맑은 밤엔 능선이 보여요"],
  ];
  const spots = () => mode === "sky63" ? SPOTS63 : mode === "sky123" ? SPOTS123 : SPOTS;
  const nFound = () => spots().filter(s => scopeFound.has(s[0])).length;
  // 장소 이름표(3D·2D 같이): 전망대마다 조금씩
  const TLAB123 = [["석촌호수", 8900, 20, -6280], ["롯데월드", 8500, 70, -6250], ["잠실종합운동장", 6600, 60, -5100], ["올림픽공원", 10900, 40, -6400], ["남산서울타워", 0, 500, 0.01], ["아차산", 11500, 300, 4200]];
  const TLABLG = [["남산서울타워", 0, 500, 0.01], ["세빛섬", -150, 18, -3290], ["한남대교", 1700, 20, -2800], ["동작대교", -1300, 20, -3060], ["이촌 한강공원", -600, 15, -2560], ["용산", -1300, 110, -1500]];
  const TLAB63 = [["남산서울타워", 0, 500, 0.01], ["밤섬", -6150, 25, 0], ["노들섬", -2600, 25, 0], ["국회의사당", -6350, 70, -3600], ["파크원", -4950, 345, -3830], ["마포", -5300, 40, -1500], ["용산", -2300, 110, -1500], ["샛강", -4500, 12, -4060]];
  function labs() {
    const L = mode === "lounge" ? TLAB.filter(l => l[0] !== "한강" && l[0] !== "반포대교 무지개분수").concat([["반포대교 · 무지개분수", 200, 18, -2950]], TLABLG) : mode === "sky63" ? TLAB.filter(l => !["63빌딩", "여의도", "잠실", "반포대교 무지개분수", "강남"].includes(l[0])).concat(TLAB63) : mode === "sky123" ? TLAB.filter(l => l[0] !== "롯데월드타워" && l[0] !== "잠실" && l[0] !== "북한산").concat(TLAB123) : TLAB;
    return L.map(l => l[3] === 0.01 ? l : l[3] === 0 ? [l[0], l[1], l[2], riverZ(l[1])] : l);
  }
  const BR_SPOT = { 서강대교: 1, 한강철교: 1, 반포대교: 1, 한남대교: 1, 동작대교: 1, 한강대교: 1, 마포대교: 1, 원효대교: 1, 잠실대교: 1, 청담대교: 1, 영동대교: 1 };
  let scope = null, scopeFound = new Set();
  try { scopeFound = new Set(JSON.parse(ls("hn-scope") || "[]")); } catch {}
  const zMin = () => scope ? 2.5 : 1, zMax = () => scope ? 12 : 3;
  const spotXZ = s => [s[2], s[4] || (s[3] < 20 ? riverZ(s[2]) : 0)];   // 다리는 강 위
  const wrapA = a => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  const gy = () => glState === 2 ? 30 : 0;   // 3D 화면은 땅이 해발 30m
  function spotDir(s) { const [x, z] = spotXZ(s), dx = x - camX, dz = z - camZ, dy = s[3] + gy() - camY; return [Math.atan2(dx, dz), Math.atan2(dy, Math.hypot(dx, dz)), Math.hypot(dx, dz)]; }
  const azOf = s => { const [x, z] = spotXZ(s); return Math.atan2(x - D.x, z - D.z); };
  function scopeOn(az) {
    if (!deck()) return;
    let i = 0; const SP = spots();
    if (az != null) { let best = 9; SP.forEach((s, k) => { const d = Math.abs(wrapA(azOf(s) - az)); if (d < best) { best = d; i = k; } }); }
    else { const nf = SP.findIndex(s => !scopeFound.has(s[0])); let best = 9; SP.forEach((s, k) => { const d = Math.abs(wrapA(azOf(s) - yaw)); if (d < best) { best = d; i = k; } }); if (best > 50 * RAD && nf >= 0) i = nf; }
    scope = { i, hold: 0, auto: true }; skyUp = false; syncSky(); walk.to = null;
    root.classList.add("scope"); tZoom = 6; aimSpot(i); scopeCard();
    if (box.classList.contains("on")) box.classList.remove("on");
  }
  T.dbgScope = () => scope && { yaw: yaw / RAD, pitch: pitch / RAD, tYaw: tYaw / RAD, tPitch: tPitch / RAD, camY, camX, camZ, zoom, i: scope.i, dir: spotDir(spots()[scope.i]).map(v => v / RAD) };
  function scopeOff() { if (!scope) return; scope = null; root.classList.remove("scope"); tZoom = glState === 2 ? 1.5 : 1; tPitch = basePitch(); idleAt = performance.now() + 6000; }
  function aimSpot(i) {
    const s = spots()[i], az = azOf(s);
    // 그 방향 창가로(둥근 방은 고리 바깥쪽, 네모 방은 그쪽 유리 앞)
    if (D.room === "ring") { walk.x = Math.sin(az) * RMAX; walk.z = Math.cos(az) * RMAX; }
    else { const sx = Math.sin(az), sz = Math.cos(az), k = Math.min((D.hx - 1.3) / Math.max(1e-3, Math.abs(sx)), (D.hz - 1.3) / Math.max(1e-3, Math.abs(sz))); [walk.x, walk.z] = fitWalk(D.x + sx * k, D.z + sz * k); }
    walk.to = null; placeWalk();
    const [yw, pt] = spotDir(s); tYaw = yaw + wrapA(yw - yaw); tPitch = pt; idleAt = performance.now() + 1e9;
    scope.i = i; scope.hold = 0; scope.auto = true;
  }
  function scopeGo(d) { if (!scope) return; const N = spots().length; aimSpot((scope.i + d + N) % N); scopeCard(); }
  function scopeCard(fresh) {
    const s = spots()[scope.i], c = q("scCard"), n = nFound(), N = spots().length, km = spotDir(s)[2] / 1000;
    c.querySelector("b").innerHTML = `${esc(s[1])}<em>${km < 1 ? Math.round(km * 1000) + "m" : km.toFixed(1) + "km"}</em>`;
    c.querySelector("span").textContent = s[6];
    c.querySelector("small").innerHTML = `${scopeFound.has(s[0]) ? "✓ 찾은 곳" : "가운데에 맞추면 찾은 곳으로 담겨요"} · 🔭 ${n}/${N}<i><u style="width:${n / N * 100}%"></u></i>`;
    if (fresh) { c.classList.remove("new"); void c.offsetWidth; c.classList.add("new"); }
  }
  function scopeTick(dt) {
    if (!deck()) return scopeOff();
    const SPOTS = spots();
    // 끌어서 둘러보다 다른 명소가 가운데 오면 그 이름으로 바뀐다
    let bi = -1, bd = 1e9; const lim = 2.4 * RAD / Math.sqrt(Math.max(1, zoom) / 6);
    SPOTS.forEach((s, k) => { const [yw, pt] = spotDir(s), d = Math.hypot(wrapA(yw - yaw) * Math.cos(pt), pt - pitch); if (d < bd) { bd = d; bi = k; } });
    if (scope.auto) { if (Math.abs(wrapA(tYaw - yaw)) < .6 * RAD && Math.abs(tPitch - pitch) < .6 * RAD) scope.auto = false; else if (bi !== scope.i) bi = -1; }   // ‹ › 로 옮겨 가는 중에는 지나치는 명소로 바뀌지 않게
    if (bi >= 0 && bd < lim) {
      if (bi !== scope.i) { scope.i = bi; scope.hold = 0; scopeCard(); }
      scope.hold += dt;
      const s = SPOTS[bi];
      if (scope.hold > .7 && !scopeFound.has(s[0])) {
        scopeFound.add(s[0]); ls("hn-scope", JSON.stringify([...scopeFound])); scopeCard(true);
        const nf = nFound(), where = mode === "sky63" ? "63빌딩" : mode === "sky123" ? "서울스카이" : "남산";
        if (nf === SPOTS.length) showCap(mode === "sky63" ? "🔭 여의도 야경 탐험가" : mode === "sky123" ? "🔭 잠실 야경 탐험가" : "🔭 서울 야경 탐험가", `${where} 망원경으로 ${SPOTS.length}곳을 모두 찾았어요`);
        else cfg.toast(`🔭 ${s[1]} 찾았어요 · ${nf}/${SPOTS.length}`, 2200);
      }
    } else scope.hold = 0;
  }
  // 망원경 렌즈: 동그란 시야 + 이름표(명소·다리)
  function drawScope(t) {
    const R = Math.min(W * .47, H * .44), cx = W / 2, cy = H / 2;
    g.save(); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip();
    g.textAlign = "center"; g.textBaseline = "bottom";
    const lab = (name, x, y, z, on, found) => {
      if (!prj(x, y, z) || Math.hypot(PX - cx, PY - cy) > R - 10) return;
      const px = PX, py = PY, yy = py - (on ? 26 : 16);
      g.strokeStyle = on ? "rgba(243,217,164,.75)" : "rgba(255,255,255,.35)"; g.lineWidth = 1; g.beginPath(); g.moveTo(px, py - 3); g.lineTo(px, yy); g.stroke();
      g.fillStyle = on ? "#f3d9a4" : "rgba(255,255,255,.7)"; g.beginPath(); g.arc(px, py, on ? 3 : 2, 0, TAU); g.fill();
      g.font = `${on ? 700 : 600} ${on ? 14 : 12}px -apple-system, "Apple SD Gothic Neo", sans-serif`;
      const label = (found ? "✓ " : "") + name, w = g.measureText(label).width + 16;
      g.fillStyle = on ? "rgba(40,30,12,.82)" : "rgba(10,12,30,.62)"; g.beginPath(); (g.roundRect ? g.roundRect(px - w / 2, yy - 22, w, 21, 10) : g.rect(px - w / 2, yy - 22, w, 21)); g.fill();
      g.fillStyle = on ? "#ffe6b0" : "rgba(240,234,255,.9)"; g.fillText(label, px, yy - 5);
    };
    for (const [bx, name] of TB) if (!BR_SPOT[name]) lab(name, bx, 20 + gy(), riverZ(bx), false, false);
    spots().forEach((s, k) => { const [x, z] = spotXZ(s); lab(s[1], x, s[5] + gy(), z, k === scope.i, scopeFound.has(s[0])); });
    g.restore();
    // 렌즈 바깥은 검게, 안쪽 가장자리는 부드럽게 어둡게
    g.fillStyle = "#020309"; g.beginPath(); g.rect(0, 0, W, H); g.arc(cx, cy, R, 0, TAU, true); g.fill("evenodd");
    const v = g.createRadialGradient(cx, cy, R * .72, cx, cy, R); v.addColorStop(0, "rgba(2,3,9,0)"); v.addColorStop(1, "rgba(2,3,9,.85)"); g.fillStyle = v; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    g.strokeStyle = "rgba(243,217,164,.22)"; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, R - .75, 0, TAU); g.stroke();
    // 가운데 조준 표시와 눈금
    g.strokeStyle = "rgba(255,240,220,.4)"; g.lineWidth = 1; g.beginPath();
    for (const [a, b] of [[[-16, 0], [-6, 0]], [[6, 0], [16, 0]], [[0, -16], [0, -6]], [[0, 6], [0, 16]]]) { g.moveTo(cx + a[0], cy + a[1]); g.lineTo(cx + b[0], cy + b[1]); }
    for (let k = 0; k < 72; k++) { const a = k / 72 * TAU, l = k % 6 ? 4 : 9; g.moveTo(cx + Math.cos(a) * (R - 3), cy + Math.sin(a) * (R - 3)); g.lineTo(cx + Math.cos(a) * (R - 3 - l), cy + Math.sin(a) * (R - 3 - l)); }
    g.stroke();
    if (scope.hold > 0 && !scopeFound.has(spots()[scope.i][0])) { g.strokeStyle = "rgba(243,217,164,.9)"; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 22, -Math.PI / 2, -Math.PI / 2 + Math.min(1, scope.hold / .7) * TAU); g.stroke(); }
    g.fillStyle = "rgba(243,217,164,.75)"; g.font = "600 11.5px -apple-system, sans-serif"; g.textAlign = "center"; g.textBaseline = "top";
    g.fillText(`🔭 x${Math.round(zoom * 10) / 10} · 두 손가락으로 확대`, cx, Math.max(cy - R - 22, 8));
  }
  // 📷 사진: 지금 보이는 장면 + 구석에 사이트 이름 (서버에 아무것도 올리지 않음)
  function snap() {
    const fl = q("tFlash"); fl.style.transition = "none"; fl.style.opacity = .7; requestAnimationFrame(() => { fl.style.transition = "opacity .6s"; fl.style.opacity = 0; });
    const c = document.createElement("canvas"); c.width = cv.width; c.height = cv.height; const x = c.getContext("2d");
    if (glState === 2 && lastSt) x.drawImage(GL.capture(Object.assign({}, lastSt, { fwNew: [], metNew: [] })), 0, 0, c.width, c.height);
    x.drawImage(cv, 0, 0);
    const fs = Math.round(13 * DPR); x.font = `600 ${fs}px sans-serif`; x.fillStyle = "rgba(255,255,255,.75)"; x.textAlign = "right"; x.fillText(`${mode === "cruise" ? "🚢 한강 유람선" : D.name.replace(" 전망대", "")} · 밤 한강 돗자리`, c.width - fs, c.height - fs);
    c.toBlob(async b => {
      if (!b) return; const name = `hangang-${mode}-${Date.now()}.png`;
      try { const f = new File([b], name, { type: "image/png" }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f] }); return; } } catch (err) { if (err && err.name === "AbortError") return; }
      const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); cfg.toast("📷 사진을 저장했어요", 2000);
    }, "image/png");
  }
})();
