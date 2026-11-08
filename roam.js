// 🚶 75차 한강 따라 걷기 — 01 돗자리 장면이 그대로 옆으로 이어진다(다른 화면으로 넘어가지 않음)
// 화면 끝에서 조이스틱을 더 밀면 카메라가 나를 따라 옆으로 흐른다: 하늘·별·달은 그대로, 건너편 도시는 천천히, 다리는 중간, 길·나무는 내 걸음만큼.
// 길가에 🚲 따릉이 대여소·🦆 오리배 선착장·🎸 버스킹 무대·🏪 편의점·🚚 분식 트럭·🚢 유람선 선착장(3D 오픈월드 park.js와 같은 지도, 거리는 줄여서).
// index.html의 장면 자료(bg, city, stars, chars, drawBridge …)를 그대로 쓴다 → 01 전용. 3D 오픈월드 사람과는 pk로 서로 보인다.
(() => {
  const R = window.HNRoam = { on: false, sky: false };
  const WD = () => window.HNPark && HNPark.WORLD;
  const PXM = () => 4 * U;                                   // 1m = 4U px(실제보다 줄인 지도: 돗자리→버스킹 약 15초)
  const zOf = wx => 180 + (wx - W / 2) / PXM(), xOf = z => W / 2 + (z - 180) * PXM();
  const mod = (v, p) => ((v % p) + p) % p, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hs = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  let X = 0, mx = 0, my = 0, m = 0, v = 0, dir = 1, auto = false, goal = null, last = 0, lastSend = 0, sentKey = "", near = null, hits = [], vol = 0, dock = null, prevAct = null, strip = null, glowStrip = null, stripW = 0, ui = null, placeT = "";
  const pathY = () => H * (Y.path0 + Y.path1) / 2 + 2 * U, lampSp = () => Math.max(120 * U, W / 3.2);
  const riverY = () => H * (Y.B - .045);
  R.camX = () => X;

  // ---------- 장소(지도 좌표 → 이 장면의 가로 위치) ----------
  const NAME = { bike: "🚲 따릉이", duck: "🦆 오리배", busk: "🎸 버스킹", store: "🏪 편의점", truck: "🚚 분식", cruise: "🚢 유람선", deliv: "🛵 배달존", market: "🏮 야시장" };
  const ACT = { bike: "🚲 자전거 타기", duck: "🦆 오리배 타기", busk: "🎸 무대 앞으로", store: "🏪 들어가기", truck: "🚚 주문하기", cruise: "🚢 유람선 타기", deliv: "🛵 치킨 배달", market: "🏮 야시장 구경" };
  let run = false, fitUI = null;   // 🏃 79차 달리기(걷기의 빠른 버전, 옷이 바뀜)
  const FIT = () => window.HNPark && HNPark.fit ? HNPark.fit() : { col: "#d8f03a", hat: 1, top: 0 };
  function setRun(on) {
    const c = chars.get(me); run = on && !m && R.on;
    if (c) { if (run) { if (c.color0 == null) c.color0 = c.color; const f = FIT(); c.color = f.col; c.runHat = f.hat; } else { if (c.color0 != null) c.color = c.color0; c.color0 = null; c.runHat = 0; } }
    if (!run && fitUI) fitUI.style.display = "none";
  }
  function pois() {
    const w = WD(); if (!w) return [];
    if (pois.c && pois.W === W && pois.U === U) return pois.c;
    const out = [];
    for (const p of w.POI) { if (!NAME[p.k]) continue; let x = xOf(p.z); if (x > -70 * U && x < W + 70 * U) x = x < W / 2 ? -80 * U - out.length * 6 * U : W + 80 * U + out.length * 6 * U; out.push({ ...p, wx: x }); }
    pois.c = out; pois.W = W; pois.U = U; return out;
  }

  // ---------- 들어가기·나가기 ----------
  R.enter = side => {
    if (R.on) return true;
    const c = chars.get(me); if (!WD() || !c || !W) return false;
    R.on = true; mx = c.x; my = clamp(c.y, H * Y.path0 + 2 * U, H * .97); X = 0; m = 0; v = 0; dir = side || 1; auto = false; goal = null; last = performance.now(); prevAct = { state: c.state, act: c.act };
    c.path = []; if (c.state === "sit") c.state = "stand";
    buildUI(); ui.root.style.display = "flex"; sync();
    if (!R.seen) { R.seen = true; toast("한강이 옆으로 계속 이어져요 · 길가에 🚲 따릉이·🦆 오리배·🎸 버스킹", 4200); }
    return true;
  };
  R.exit = () => {
    if (!R.on) return;
    setRun(false); const c = chars.get(me); R.on = false; R.sky = false; X = 0; bOX = 0;
    if (window.HNBusk && HNBusk.listen) HNBusk.listen(0); vol = 0;
    if (ui) { ui.root.style.display = "none"; ui.place.style.display = "none"; }
    if (typeof ws !== "undefined" && ws && ws.readyState === 1) { ws.send(JSON.stringify({ t: "pk", off: 1 })); }
    if (c) { c.path = []; c.state = "stand"; c.x = clamp(mx, 14, W - 14); c.y = clamp(my, H * Y.path0 + 2 * U, H * .97); if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: "go", x: c.x / W, y: Math.max(.5, c.y / H) })); }
  };
  R.goTo = id => { const p = pois().find(q => q.id === id); if (!p || !R.on) return; if (m) dismount(true); goal = p.wx; dir = Math.sign(goal - mx) || 1; toast(`${NAME[p.k]}까지 강변 따라 걸어가요 · 조이스틱을 만지면 멈춰요`, 3000); };

  // ---------- 타기 ----------
  function mount(p) {
    const c = chars.get(me); if (!c) return;
    setRun(false);
    if (p.k === "bike") { m = 1; v = 0; my = pathY(); c.state = "sit"; c.act = "sit"; toast("🚲 옆으로 밀면 달려요 · 🤖 자동이면 알아서 · 🌌 하늘 보며 달리기도", 3600); }
    else if (p.k === "duck") { m = 2; v = 0; dock = p; my = riverY(); c.state = "sit"; c.act = "sit"; auto = true; toast("🦆 오리배 출발 · 유람선처럼 천천히 흘러가요 · 조이스틱으로 직접 몰 수도 있어요", 3600); }
    sync();
  }
  function dismount(quiet) {
    const c = chars.get(me);
    if (m === 2 && dock) { mx = dock.wx; if (!quiet) toast("⚓ 선착장으로 돌아왔어요", 2000); }
    else if (m === 1 && !quiet) toast("🅿 자전거를 세웠어요", 1600);
    m = 0; v = 0; auto = false; R.sky = false; my = pathY(); if (c) { c.state = "stand"; c.act = prevAct ? prevAct.act : c.act; }
    sync();
  }
  function act() {
    if (m) return dismount();
    const p = near; if (!p) return;
    if (p.k === "bike" || p.k === "duck") return mount(p);
    if (p.k === "busk") return window.HNBusk && HNBusk.open();
    if (p.k === "store") return window.HNStore && HNStore.open();
    if (p.k === "truck") return window.HNTruck && HNTruck.open();
    if (p.k === "cruise") return goTrip("cruise");
    if (p.k === "deliv") return window.HNDeliv && HNDeliv.open();
    if (p.k === "market") return window.HNMarket && HNMarket.open();
  }

  // ---------- 움직임(조이스틱은 index.html joyStep이 매 프레임 넘겨준다) ----------
  R.step = ([jx, jy]) => {
    const now = performance.now(), dt = Math.min(.1, (now - last) / 1000); last = now;
    const c = chars.get(me); if (!c) return;
    const w = WD(), xMin = xOf(w.Z0 + 20), xMax = xOf(w.Z1 - 60), walk = 62 * U * 1.7;
    const jOn = Math.hypot(jx, jy) > .2;
    if (jOn) { goal = null; if (m && Math.abs(jx) > .3) auto = false; }
    let vx = 0, vy = 0;
    if (m === 0) {
      const wk = run ? walk * 2.3 : walk;
      if (run && auto && !jOn) { vx = dir * wk * .85; }
      else if (jOn) { vx = jx * wk; vy = jy * wk * .6; my = clamp(my + vy * dt, H * Y.path0 + 2 * U, H * .97); }
      else if (goal != null) { const d = goal - mx; if (Math.abs(d) < 4 * U) { goal = null; } else vx = Math.sign(d) * Math.min(wk * 2.4, Math.abs(d) * 3); }
      v = vx;
    } else {
      const max = m === 1 ? walk * 4.2 : walk * 1.25;
      const want = auto ? dir * max * (m === 2 ? .55 : .8) : jx * max;
      v += (want - v) * Math.min(1, dt * (m === 1 ? 1.6 : .7)); vx = v;
      if (m === 2) { if (jOn) my = clamp(my + jy * 40 * U * dt, H * (Y.P + .045), H * (Y.B - .02)); }
    }
    if (Math.abs(vx) > 1) dir = Math.sign(vx);
    mx = clamp(mx + vx * dt, xMin, xMax);
    if (auto && (mx <= xMin + 1 || mx >= xMax - 1)) dir = -dir;
    if (run) { const dz = Math.abs(vx * dt) / PXM(); R.rkm = (R.rkm || 0) + dz; if (window.HNPark && HNPark.dbg) { const S = HNPark.dbg(); S.rkm = (S.rkm || 0) + dz; } }                      // 끝에 닿으면 돌아온다
    c.x = mx; c.y = my + (m === 2 ? Math.sin(now / 700) * 1.2 * U : 0);
    c.path = m === 0 && Math.hypot(vx, vy) > 2 ? [{ x: mx + vx * .05, y: my + vy * .05 }] : [];   // 방향대로 몸을 돌린다(index.html faceOf)
    if (m && c.state !== "sit") c.state = "sit";
    // 카메라: 돗자리 안에서 걸으면 원래 화면, 밖에선 나를 따라 흐른다
    const inRoom = m === 0 && !run && mx >= 0 && mx <= W;
    const tgt = inRoom ? 0 : mx - W / 2;
    X += (tgt - X) * Math.min(1, dt * (m === 1 ? 5 : 3.2));
    bOX = X * .5;
    if (inRoom && Math.abs(X) < 1.5 && mx > 16 && mx < W - 16 && goal == null) return R.exit();
    // 가까운 장소
    near = null; if (!m) { let bd = 40 * U; for (const p of pois()) { const d = Math.abs(p.wx - mx); if (d < bd) { bd = d; near = p; } } }
    // 버스킹 소리: 무대 가까이 갈수록
    const bk = pois().find(p => p.k === "busk");
    if (bk && window.HNBusk && HNBusk.listen) { const d = Math.abs(bk.wx - mx) / PXM(), nv = d < 45 ? +(.85 * (1 - d / 45)).toFixed(2) : 0; if (Math.abs(nv - vol) > .04 || (nv === 0) !== (vol === 0)) { vol = nv; HNBusk.listen(vol); } }
    // 3D 오픈월드 사람에게도 보이게
    if (now - lastSend > 400 && ws && ws.readyState === 1) {
      const mm = run ? 3 : m, f = FIT(), x = m === 2 ? w.R - 60 : m === 1 ? w.PATH : run ? w.R + 11 : w.R + 22, z = +zOf(mx).toFixed(1), key = `${z},${mm},${dir}`;
      if (key !== sentKey || now - lastSend > 5000) { sentKey = key; lastSend = now; ws.send(JSON.stringify({ t: "pk", x, z, a: dir > 0 ? 0 : 3.14, m: mm, o: run ? f.top * 100 + f.hat : 0 })); }
    }
    sync();
  };

  // ---------- 화면 위 버튼 ----------
  function buildUI() {
    if (ui) return;
    const st = document.createElement("style");
    st.textContent = `#roamUI{position:fixed;right:12px;bottom:calc(max(14px,env(safe-area-inset-bottom)) + 74px);display:none;flex-direction:column;align-items:flex-end;gap:7px;z-index:6}
#roamUI button{font:600 13px system-ui,sans-serif;color:#f4ead8;background:rgba(14,18,40,.62);border:1px solid rgba(255,255,255,.16);border-radius:20px;padding:8px 13px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
#roamUI button.main{background:rgba(243,217,164,.92);color:#2a1d10;border-color:transparent}#roamUI button.on{background:rgba(120,150,255,.38)}#roamUI .hid{display:none}
#roamPlace{position:fixed;left:50%;transform:translateX(-50%);top:calc(max(12px,env(safe-area-inset-top)) + 54px);font:600 12px system-ui,sans-serif;color:rgba(244,234,216,.9);background:rgba(14,18,40,.5);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:5px 12px;white-space:nowrap;pointer-events:none;display:none;z-index:6}`;
    document.head.appendChild(st);
    const root = document.createElement("div"); root.id = "roamUI";
    root.innerHTML = `<button id="rmAct" class="main hid"></button><button id="rmAuto" class="hid">🤖 자동</button><button id="rmRun">🏃 달리기</button><button id="rmFit" class="hid">👕 옷</button><button id="rmSky">🌌 하늘 보기</button><button id="rmHome">🧺 돗자리로</button>`;
    document.body.appendChild(root);
    const place = document.createElement("div"); place.id = "roamPlace"; document.body.appendChild(place);
    fitUI = document.createElement("div"); fitUI.id = "roamFit"; fitUI.style.cssText = "position:fixed;left:12px;bottom:calc(max(14px,env(safe-area-inset-bottom)) + 250px);display:none;z-index:7;padding:10px;border-radius:16px;background:rgba(14,18,40,.88);border:1px solid rgba(255,255,255,.14);max-width:220px;font:600 12px system-ui,sans-serif;color:#efe7d6";
    document.body.appendChild(fitUI); fitUI.addEventListener("pointerdown", e => e.stopPropagation());
    const drawFit = () => { if (!window.HNPark || !HNPark.FIT_TOP) { fitUI.textContent = "잠시 뒤에 다시 눌러 주세요"; return; } const f = FIT();
      fitUI.innerHTML = `<div style="margin-bottom:6px">👕 러닝 옷</div><div style="display:flex;flex-wrap:wrap;gap:6px">${HNPark.FIT_TOP.map(([k, c], i) => `<button data-t="${i}" style="all:unset;cursor:pointer;width:24px;height:24px;border-radius:50%;background:${c};${f.top === i ? "outline:2px solid #f3d9a4;outline-offset:2px" : ""}"></button>`).join("")}</div>
        <div style="display:flex;gap:6px;margin-top:8px">${HNPark.FIT_HATS.map(([n, e], i) => `<button data-h="${i}" title="${n}" style="all:unset;cursor:pointer;padding:4px 7px;border-radius:10px;background:${f.hat === i ? "rgba(243,217,164,.25)" : "rgba(255,255,255,.08)"};font-size:16px">${e}</button>`).join("")}</div>
        <div style="margin-top:8px;color:#b9b0cc;font-weight:500">오늘 달린 거리 ${((HNPark.dbg().rkm || 0) / 1000).toFixed(2)}km</div>`;
      fitUI.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { HNPark.setFit(+b.dataset.t, null); setRun(true); drawFit(); });
      fitUI.querySelectorAll("[data-h]").forEach(b => b.onclick = () => { HNPark.setFit(null, +b.dataset.h); setRun(true); drawFit(); }); };
    ui = { root, place, run: root.querySelector("#rmRun"), fit: root.querySelector("#rmFit"), act: root.querySelector("#rmAct"), auto: root.querySelector("#rmAuto"), sky: root.querySelector("#rmSky"), home: root.querySelector("#rmHome") };
    const stop = e => e.stopPropagation();
    for (const b of root.querySelectorAll("button")) b.addEventListener("pointerdown", stop);
    ui.act.onclick = act;
    ui.run.onclick = () => { if (m) return; setRun(!run); if (!run) auto = false; else toast("🏃 옆으로 밀면 달려요 · 🤖 자동이면 강변을 따라 쭉 · 👕 옷도 바꿀 수 있어요", 3200); sync(); };
    ui.fit.onclick = () => { const on = fitUI.style.display !== "block"; fitUI.style.display = on ? "block" : "none"; if (on) drawFit(); };
    ui.auto.onclick = () => { auto = !auto; if (auto && !v) dir = dir || 1; sync(); };
    ui.sky.onclick = () => { R.sky = !R.sky; if (R.sky && !m) toast("🌌 걸으면서 하늘을 봐요 · 다시 누르면 앞으로", 2200); sync(); };
    ui.home.onclick = () => { if (m) dismount(true); goal = W / 2; dir = Math.sign(goal - mx) || 1; const far = Math.abs(goal - mx) > W * 3; if (far) { mx = goal < mx ? W + 30 * U : -30 * U; X = mx - W / 2; } toast("🧺 돗자리로 돌아가요", 1600); };
  }
  function sync() {
    if (!ui) return;
    const a = m ? (m === 1 ? "🅿 내리기" : "⚓ 선착장으로") : near && !run ? ACT[near.k] : "";
    ui.run.classList.toggle("hid", !!m); ui.run.classList.toggle("on", run); { const rt = run ? "🚶 걷기로" : "🏃 달리기"; if (ui.run.textContent !== rt) ui.run.textContent = rt; } ui.fit.classList.toggle("hid", !run);
    if (ui.act.textContent !== a) ui.act.textContent = a; ui.act.classList.toggle("hid", !a);
    ui.auto.classList.toggle("hid", !m && !run); ui.auto.classList.toggle("on", auto); { const at = auto ? "🤖 자동 중" : "🤖 자동"; if (ui.auto.textContent !== at) ui.auto.textContent = at; }
    ui.sky.classList.toggle("on", R.sky); { const sk = R.sky ? "🌊 앞 보기" : "🌌 하늘 보기"; if (ui.sky.textContent !== sk) ui.sky.textContent = sk; }
    const w = WD(); if (!w) return;
    const z = zOf(mx), home = Math.round(Math.abs(z - 180)), area = w.areaAt ? w.areaAt(z) : "";
    const t = `${m === 1 ? "🚲" : m === 2 ? "🦆" : run ? "🏃" : "🚶"} ${area}${home > 30 ? ` · 🧺 돗자리까지 ${home >= 1000 ? (home / 1000).toFixed(1) + "km" : home + "m"}` : ""}`;
    if (t !== placeT) { placeT = t; ui.place.textContent = t; }
    ui.place.style.display = R.on ? "block" : "none";
  }

  // ---------- 그리기: 먼 풍경(장면 대신) ----------
  function makeStrips() {
    const base = H * Y.S;
    const mk = src => { const [c, g] = canvas(W * 2, base + 2); g.drawImage(src, 0, 0, W, base + 2); g.save(); g.translate(W * 2, 0); g.scale(-1, 1); g.drawImage(src, 0, 0, W, base + 2); g.restore(); return c; };
    strip = mk(city); glowStrip = mk(cityGlow); stripW = W;
  }
  R.scene = (t, dt) => {
    if (!strip || stripW !== W || strip.height !== Math.ceil((H * Y.S + 2) * DPR)) makeStrips();
    const base = H * Y.S, dY = H * Y.D, pY = H * Y.P, bY = H * Y.B;
    cx.drawImage(bg, 0, 0, W, H);
    // 둑·길·잔디를 다시 칠한다(배경에 그려진 가로등은 지우고 아래 ground에서 흐르게 그린다)
    let gr = cx.createLinearGradient(0, base, 0, bY); gr.addColorStop(0, "#151c3e"); gr.addColorStop(1, "#080e26"); cx.fillStyle = gr; cx.fillRect(0, base, W, bY - base);
    cx.fillStyle = "#2b303c"; cx.fillRect(0, bY, W, H * Y.path0 - bY); cx.fillStyle = "rgba(255,255,255,.08)"; cx.fillRect(0, bY, W, 1);
    gr = cx.createLinearGradient(0, H * Y.path0, 0, H); gr.addColorStop(0, "#152620"); gr.addColorStop(1, "#0a140f"); cx.fillStyle = gr; cx.fillRect(0, H * Y.path0, W, H * (1 - Y.path0));
    cx.fillStyle = "#24272d"; cx.fillRect(0, H * Y.path0, W, H * (Y.path1 - Y.path0));
    { const dash = 22 * U, o = mod(-X, dash * 2); cx.fillStyle = "rgba(255,255,255,.07)"; for (let x = o - dash * 2; x < W; x += dash * 2) cx.fillRect(x, H * (Y.path0 + Y.path1) / 2, dash, 1); }
    // 별(먼 하늘은 그대로)
    for (const s of stars) { cx.fillStyle = s.c ? `rgba(${s.c},${s.k * (.55 + .45 * Math.abs(Math.sin(t * s.sp + s.ph)))})` : `rgba(255,255,255,${.25 + .6 * Math.abs(Math.sin(t * s.sp + s.ph))})`; cx.fillRect(s.x - s.s / 2, s.y - s.s / 2, s.s, s.s); }
    for (const c of clouds) { c.x += c.v * dt; if (c.x > W + 20) c.x = -c.w - 20; const span = W + c.w + 40; cx.drawImage(c.c, mod(c.x - X * .04 + c.w + 20, span) - c.w - 20, c.y, c.w, c.h); }
    // 건너편 도시: 천천히 흐른다(거울로 이어 붙여 끝이 없다)
    const ox = mod(X * .22, W * 2);
    cx.drawImage(strip, -ox, 0, W * 2, base + 2); cx.drawImage(strip, W * 2 - ox, 0, W * 2, base + 2);
    cx.globalCompositeOperation = "lighter"; cx.globalAlpha = .45;
    cx.drawImage(glowStrip, -ox, 0, W * 2, base + 2); cx.drawImage(glowStrip, W * 2 - ox, 0, W * 2, base + 2);
    cx.globalCompositeOperation = "source-over"; cx.globalAlpha = .5;
    for (let y = base; y < bY; y += 2) {
      const d = y - base, sy = base - d * 1.15 - 2; if (sy < 0) break;
      const off = Math.sin(t * .8 + y * .45) * (.4 + d * .05) * U * .5;
      cx.drawImage(strip, 0, sy * DPR, W * 2 * DPR, 2 * DPR, off - ox, y, W * 2, 2); cx.drawImage(strip, 0, sy * DPR, W * 2 * DPR, 2 * DPR, off - ox + W * 2, y, W * 2, 2);
    }
    cx.globalAlpha = 1;
    gr = cx.createLinearGradient(0, base, 0, bY); gr.addColorStop(0, "rgba(14,20,48,.1)"); gr.addColorStop(1, "rgba(8,12,34,.75)"); cx.fillStyle = gr; cx.fillRect(0, base, W, bY - base);
    for (const c of cars) { c.x += c.dir * c.v * dt; if (c.x > W + 5) c.x = -5; if (c.x < -5) c.x = W + 5; const x = mod(c.x - X * .22, W + 10) - 5; cx.fillStyle = c.dir > 0 ? "rgba(255,250,230,.9)" : "rgba(255,80,70,.85)"; cx.fillRect(x, base - (c.dir > 0 ? 2.6 : 3.4) * U, 1.3 * U, .9 * U); }
    for (let k = 0; k < 12; k++) { const y = base + 4 * U + k * (bY - base - 8 * U) / 12, w = (3 + k * 1.6) * U * (.5 + .5 * Math.abs(Math.sin(t * 1.4 + k * 1.9))); streak(moon.x + Math.sin(t * .9 + k * 2.3) * (1 + k * .4) * U, y, w, .16 + .1 * Math.sin(t * 2 + k), "255,240,210"); }
    gr = cx.createLinearGradient(0, base - 16 * U, 0, base + 22 * U); const fa = .09 + .03 * Math.sin(t * .2);
    gr.addColorStop(0, "rgba(160,170,210,0)"); gr.addColorStop(.5, `rgba(160,170,210,${fa})`); gr.addColorStop(1, "rgba(160,170,210,0)"); cx.fillStyle = gr; cx.fillRect(0, base - 16 * U, W, 38 * U);
    drawBridge(t, dt, dY, pY, bY);
    drawBoat(t, dt);
    // 가로등 불빛이 물에 비침(흐르는 가로등 자리)
    const sp = lampSp(), k0 = Math.floor((X - W * .12) / sp) - 1;
    for (let k = k0; k < k0 + W / sp + 3; k++) { const lx = W * .12 + k * sp - X; for (let j = 0; j < 6; j++) streak(lx + 5 * U + Math.sin(t * 1.6 + j * 1.3 + k) * 1.5 * U, bY - 3 * U - j * 4 * U, (6 - j * .7) * U * (.6 + .4 * Math.abs(Math.sin(t * 2.2 + j))), .22 - j * .03, "255,210,150"); }
    cx.strokeStyle = "rgba(170,190,255,.05)"; cx.lineWidth = 1;
    for (let k = 0; k < 7; k++) { const yy = pY + (k + 1) * (bY - pY) / 8; cx.beginPath(); for (let x = 0; x <= W; x += 16) cx.lineTo(x, yy + Math.sin((x + X * .6) * .03 + t * (.6 + k * .1) + k) * 1.2); cx.stroke(); }
  };

  // ---------- 그리기: 길 위(내 걸음만큼 흐른다, cx는 -X만큼 옮겨진 상태) ----------
  const L0 = () => X - 70 * U, L1 = () => X + W + 70 * U;
  function lampPost(lx) {
    const p0 = H * Y.path0, p1 = H * Y.path1;
    let gr = cx.createRadialGradient(lx, p1, 0, lx, p1, 120 * U); gr.addColorStop(0, "rgba(255,200,130,.2)"); gr.addColorStop(1, "rgba(255,200,130,0)");
    cx.fillStyle = gr; cx.beginPath(); cx.ellipse(lx, p1, 140 * U, 52 * U, 0, 0, TAU); cx.fill();
    cx.fillStyle = "#2c2f37"; cx.fillRect(lx - 1.2 * U, p0 - 46 * U, 2.4 * U, 46 * U); cx.fillRect(lx - 1.2 * U, p0 - 47 * U, 6 * U, 1.6 * U);
    cx.fillStyle = "#ffe2b0"; cx.beginPath(); cx.arc(lx + 5 * U, p0 - 45 * U, 2.6 * U, 0, TAU); cx.fill();
    gr = cx.createRadialGradient(lx + 5 * U, p0 - 45 * U, 0, lx + 5 * U, p0 - 45 * U, 28 * U); gr.addColorStop(0, "rgba(255,220,160,.32)"); gr.addColorStop(1, "rgba(255,220,160,0)");
    cx.fillStyle = gr; cx.fillRect(lx - 25 * U, p0 - 75 * U, 60 * U, 60 * U);
  }
  function strings(sp, k0, k1, t) {       // 돗자리 밖 가로등 사이 줄전구(돗자리 안은 원래 그림이 그린다)
    cx.save(); cx.beginPath(); cx.rect(L0(), 0, -L0(), H); cx.rect(W, 0, Math.max(0, L1() - W), H); cx.clip();
    const y0 = H * Y.path0 - 44 * U, BC = ["255,214,150", "255,190,140", "255,230,180", "250,200,160"];
    for (let k = k0; k < k1; k++) {
      const ax = W * .12 + k * sp + 5 * U, bx = ax + sp, sag = Math.min(18 * U, sp * .08);
      if (bx > 0 && ax < W) { if (!(ax < 0 || bx > W)) continue; }
      cx.strokeStyle = "rgba(20,16,14,.55)"; cx.lineWidth = .7 * U; cx.beginPath(); cx.moveTo(ax, y0); cx.quadraticCurveTo((ax + bx) / 2, y0 + sag * 2, bx, y0); cx.stroke();
      const n = Math.max(5, Math.round(sp / (11 * U)));
      cx.globalCompositeOperation = "lighter";
      for (let j = 1; j < n; j++) { const u = j / n, x = ax + sp * u, y = y0 + sag * 4 * u * (1 - u) + 1.2 * U, tw = .7 + .3 * Math.sin(t * 1.8 + j * 1.3 + k), c = BC[(j + k) & 3];
        const gl = cx.createRadialGradient(x, y, 0, x, y, 6 * U); gl.addColorStop(0, `rgba(${c},${.32 * tw})`); gl.addColorStop(1, `rgba(${c},0)`); cx.fillStyle = gl; cx.fillRect(x - 6 * U, y - 6 * U, 12 * U, 12 * U);
        cx.fillStyle = `rgba(255,240,215,${.9 * tw})`; cx.beginPath(); cx.arc(x, y, 1.1 * U, 0, TAU); cx.fill(); }
      cx.globalCompositeOperation = "source-over";
    }
    cx.restore();
  }
  const outRoom = (x, pad) => x < -pad || x > W + pad;
  function nearPoi(x) { for (const p of pois()) if (Math.abs(p.wx - x) < 34 * U) return true; return false; }
  function tree(x, y, k, t) {
    const s = scaleAt(y) * 1.15, h = (34 + hs(k * 3.1) * 22) * s, sway = Math.sin(t * .7 + k) * 1.2 * s;
    cx.fillStyle = "rgba(0,0,0,.25)"; cx.beginPath(); cx.ellipse(x, y, 13 * s, 3.5 * s, 0, 0, TAU); cx.fill();
    cx.fillStyle = "#1b130e"; cx.fillRect(x - 1.6 * s, y - h * .55, 3.2 * s, h * .55);
    const hue = [42, 30, 18, 96][Math.floor(hs(k * 7.7) * 4)], lit = 20 + hs(k) * 8;
    for (let j = 0; j < 3; j++) { const bx = x + (j - 1) * 7 * s + sway, by = y - h * (.62 + (j === 1 ? .16 : 0)), r = (10 + hs(k + j) * 4) * s;
      cx.fillStyle = `hsl(${hue},${hue > 90 ? 22 : 55}%,${lit - j * 2}%)`; cx.beginPath(); cx.arc(bx, by, r, 0, TAU); cx.fill(); }
    cx.fillStyle = `hsla(${hue},70%,55%,.16)`; cx.beginPath(); cx.arc(x + sway, y - h * .74, 8 * s, 0, TAU); cx.fill();
  }
  function decor() {   // 돗자리 밖 잔디의 나무·벤치(보이는 칸만, 칸마다 같은 모양)
    const out = [], cw = 46 * U, c0 = Math.floor(L0() / cw), c1 = Math.ceil(L1() / cw);
    for (let k = c0; k <= c1; k++) {
      const r = hs(k), x = k * cw + hs(k + 9) * cw * .7;
      if (!outRoom(x, 30 * U) || nearPoi(x)) continue;
      if (r < .62) out.push({ y: H * (.66 + hs(k * 1.7) * .29), x, k, f: tree });
      if (hs(k * 5.3) < .22) out.push({ y: H * Y.path0 - 1, x: x + 12 * U, k, f: bench });
    }
    return out;
  }
  function bench(x, y) { const s = scaleAt(H * Y.path1) * .9; cx.fillStyle = "#3a2c22"; cx.fillRect(x - 12 * s, y - 7 * s, 24 * s, 2 * s); cx.fillRect(x - 12 * s, y - 12 * s, 24 * s, 2 * s); cx.fillStyle = "#18181c"; cx.fillRect(x - 10 * s, y - 7 * s, 1.5 * s, 7 * s); cx.fillRect(x + 8.5 * s, y - 7 * s, 1.5 * s, 7 * s); }
  function grass() { cx.strokeStyle = "rgba(90,130,100,.22)"; cx.lineWidth = 1; const cw = 9 * U, c0 = Math.floor(L0() / cw), c1 = Math.ceil(L1() / cw); cx.beginPath(); for (let k = c0; k <= c1; k++) { if (hs(k * .7) > .55) continue; const gx = k * cw + hs(k) * cw, gy = H * (Y.path1 + .01) + hs(k * 3.3) * H * .38, gh = (3 + hs(k * 9.1) * 5) * U; cx.moveTo(gx, gy); cx.lineTo(gx + (hs(k * 2) - .5) * 3, gy - gh); } cx.stroke(); }

  // 길가 장소 그림
  function sign(x, y, text, s, hot) {
    cx.font = `700 ${Math.max(10, 9.5 * s)}px system-ui,sans-serif`; cx.textAlign = "center"; const w = cx.measureText(text).width + 12 * s, h = 15 * s;
    cx.fillStyle = hot ? "rgba(243,217,164,.95)" : "rgba(14,18,40,.72)"; cx.beginPath(); cx.roundRect ? cx.roundRect(x - w / 2, y - h, w, h, 7 * s) : cx.rect(x - w / 2, y - h, w, h); cx.fill();
    cx.fillStyle = hot ? "#2a1d10" : "#f4ead8"; cx.fillText(text, x, y - 4 * s); return { x: x - w / 2, y: y - h, w, h };
  }
  function bikeShape(x, y, s, col, rider) {
    cx.strokeStyle = col; cx.lineWidth = 1.6 * s; const r = 6.5 * s;
    cx.beginPath(); cx.arc(x - 9 * s, y - r, r, 0, TAU); cx.moveTo(x + 9 * s + r, y - r); cx.arc(x + 9 * s, y - r, r, 0, TAU); cx.stroke();
    cx.beginPath(); cx.moveTo(x - 9 * s, y - r); cx.lineTo(x - 2 * s, y - r - 9 * s); cx.lineTo(x + 6 * s, y - r - 9 * s); cx.lineTo(x + 9 * s, y - r); cx.moveTo(x - 2 * s, y - r - 9 * s); cx.lineTo(x + 1 * s, y - r); cx.lineTo(x - 9 * s, y - r); cx.moveTo(x + 6 * s, y - r - 9 * s); cx.lineTo(x + 7 * s, y - r - 13 * s); cx.stroke();
  }
  function swan(x, y, s, d, t, front) {
    const bob = Math.sin(t * 1.6 + x * .01) * 1 * s;
    if (!front) { cx.fillStyle = "rgba(255,255,255,.07)"; cx.beginPath(); cx.ellipse(x, y + 3 * s, 26 * s, 3.5 * s, 0, 0, TAU); cx.fill(); return; }
    cx.fillStyle = "#e9e6dd"; cx.beginPath(); cx.moveTo(x - 20 * s * d, y - 4 * s + bob); cx.quadraticCurveTo(x, y + 6 * s + bob, x + 18 * s * d, y - 6 * s + bob); cx.lineTo(x + 16 * s * d, y - 12 * s + bob); cx.lineTo(x - 18 * s * d, y - 12 * s + bob); cx.closePath(); cx.fill();
    cx.strokeStyle = "#e9e6dd"; cx.lineWidth = 3.4 * s; cx.lineCap = "round"; cx.beginPath(); cx.moveTo(x + 15 * s * d, y - 10 * s + bob); cx.quadraticCurveTo(x + 24 * s * d, y - 20 * s + bob, x + 18 * s * d, y - 30 * s + bob); cx.stroke();
    cx.fillStyle = "#e08a2c"; cx.beginPath(); cx.moveTo(x + 18 * s * d, y - 31 * s + bob); cx.lineTo(x + 24 * s * d, y - 29 * s + bob); cx.lineTo(x + 18 * s * d, y - 28 * s + bob); cx.fill();
    cx.fillStyle = "#c9c5ba"; cx.fillRect(x - 14 * s, y - 12 * s + bob, 26 * s, 1.5 * s);
    cx.fillStyle = "rgba(240,240,250,.12)"; cx.fillRect(x - 12 * s, y - 26 * s + bob, 24 * s, 2 * s); cx.fillStyle = "#2a2a32"; cx.fillRect(x - 11 * s, y - 25 * s + bob, 1.2 * s, 13 * s); cx.fillRect(x + 10 * s, y - 25 * s + bob, 1.2 * s, 13 * s);
  }
  function drawPoi(p, t) {
    const x = p.wx, s = scaleAt(H * Y.path1), py0 = H * Y.path0, bY = H * Y.B;
    if (p.k === "market") {   // 🏮 야시장: 줄 천막 셋 + 초롱
      const C = ["#c9483a", "#d69a2f", "#3d7f86"]; for (let i = 0; i < 3; i++) { const sx = x - 44 * s + i * 44 * s; cx.fillStyle = "#2a2124"; cx.fillRect(sx - 18 * s, py0 - 22 * s, 36 * s, 22 * s); cx.fillStyle = "rgba(255,200,130,.75)"; cx.fillRect(sx - 15 * s, py0 - 18 * s, 30 * s, 8 * s); for (let k = 0; k < 4; k++) { cx.fillStyle = k % 2 ? "#f2e6d4" : C[i]; cx.fillRect(sx - 20 * s + k * 10 * s, py0 - 30 * s, 10 * s, 8 * s); } }
      for (let k = 0; k < 12; k++) { const lx = x - 66 * s + k * 12 * s, ly = py0 - 40 * s + Math.sin(k / 11 * Math.PI) * 5 * s, a = .7 + .3 * Math.sin(t * 1.5 + k); cx.fillStyle = `rgba(255,${120 + (k % 3) * 40},70,${a})`; cx.beginPath(); cx.ellipse(lx, ly, 2.4 * s, 3 * s, 0, 0, TAU); cx.fill(); }
      return; }
    if (p.k === "deliv") { cx.fillStyle = "#3a3a2c"; cx.fillRect(x - 1 * s, py0 - 30 * s, 2 * s, 30 * s); cx.fillStyle = "#e8c43a"; cx.fillRect(x - 12 * s, py0 - 36 * s, 24 * s, 9 * s); cx.fillStyle = "rgba(232,196,58,.25)"; cx.fillRect(x - 18 * s, py0 + 1 * s, 36 * s, 6 * s); return; }
    if (p.k === "bike") { for (let i = 0; i < 4; i++) bikeShape(x - 24 * s + i * 16 * s, py0 + 2 * s, s * .8, "rgba(120,190,140,.85)"); cx.fillStyle = "#2a3b30"; cx.fillRect(x - 32 * s, py0 - 1 * s, 64 * s, 2 * s); }
    else if (p.k === "duck" || p.k === "cruise") {
      cx.fillStyle = "#3a2e24"; cx.fillRect(x - 6 * s, bY - 26 * s, 12 * s, 28 * s); cx.fillStyle = "#4a3a2c"; cx.fillRect(x - 30 * s, bY - 30 * s, 60 * s, 5 * s);
      if (p.k === "duck") { for (let i = 0; i < 2; i++) { swan(x - 16 * s + i * 32 * s, bY - 22 * s, s * .7, 1, t, false); swan(x - 16 * s + i * 32 * s, bY - 22 * s, s * .7, 1, t, true); } }
      else { cx.fillStyle = "#d9dde6"; cx.fillRect(x - 40 * s, bY - 50 * s, 80 * s, 14 * s); cx.fillStyle = "#ffd89a"; for (let i = 0; i < 8; i++) cx.fillRect(x - 36 * s + i * 9.5 * s, bY - 47 * s, 5 * s, 4 * s); }
    }
    else if (p.k === "busk") {
      cx.fillStyle = "#26222a"; cx.fillRect(x - 30 * s, py0 - 6 * s, 60 * s, 6 * s);
      cx.globalCompositeOperation = "lighter"; const g = cx.createRadialGradient(x, py0 - 20 * s, 0, x, py0 - 20 * s, 60 * s); g.addColorStop(0, `rgba(255,190,120,${.25 + .05 * Math.sin(t * 3)})`); g.addColorStop(1, "rgba(255,190,120,0)"); cx.fillStyle = g; cx.fillRect(x - 60 * s, py0 - 80 * s, 120 * s, 90 * s);
      for (let i = 0; i < 9; i++) { const lx = x - 32 * s + i * 8 * s, ly = py0 - 46 * s + Math.sin(i / 8 * Math.PI) * 6 * s; cx.fillStyle = `hsla(${(i * 40 + t * 30) % 360},90%,70%,.9)`; cx.beginPath(); cx.arc(lx, ly, 1.3 * s, 0, TAU); cx.fill(); }
      cx.globalCompositeOperation = "source-over";
      const bx = x, by = py0 - 6 * s, bob = Math.sin(t * 4) * .8 * s;   // 버스커
      cx.fillStyle = "#202534"; cx.fillRect(bx - 4 * s, by - 18 * s + bob, 8 * s, 12 * s); cx.fillRect(bx - 3.5 * s, by - 6 * s, 3 * s, 6 * s); cx.fillRect(bx + .5 * s, by - 6 * s, 3 * s, 6 * s);
      cx.fillStyle = "#e8c4a0"; cx.beginPath(); cx.arc(bx, by - 22 * s + bob, 4 * s, 0, TAU); cx.fill(); cx.fillStyle = "#2a1d18"; cx.beginPath(); cx.arc(bx, by - 23.5 * s + bob, 4 * s, Math.PI, 0); cx.fill();
      cx.fillStyle = "#a8642c"; cx.beginPath(); cx.ellipse(bx + 3 * s, by - 11 * s + bob, 5 * s, 3.4 * s, -.5, 0, TAU); cx.fill(); cx.strokeStyle = "#5a3416"; cx.lineWidth = 1.2 * s; cx.beginPath(); cx.moveTo(bx + 5 * s, by - 13 * s + bob); cx.lineTo(bx + 13 * s, by - 20 * s + bob); cx.stroke();
      cx.strokeStyle = "#888"; cx.lineWidth = .8 * s; cx.beginPath(); cx.moveTo(bx - 9 * s, by); cx.lineTo(bx - 9 * s, by - 20 * s); cx.stroke();
      if (vol > 0) { cx.fillStyle = `rgba(255,226,176,${.5 + .4 * Math.sin(t * 3)})`; cx.font = `${10 * s}px sans-serif`; cx.fillText("♪", bx + 14 * s + Math.sin(t * 2) * 3 * s, by - 28 * s - (t * 8 % 10) * s); }
    }
    else if (p.k === "store") { cx.fillStyle = "#1c2230"; cx.fillRect(x - 24 * s, py0 - 30 * s, 48 * s, 30 * s); cx.fillStyle = "rgba(220,240,255,.85)"; cx.fillRect(x - 20 * s, py0 - 24 * s, 40 * s, 16 * s); cx.fillStyle = "#3b7bd6"; cx.fillRect(x - 24 * s, py0 - 34 * s, 48 * s, 5 * s); }
    else if (p.k === "truck") { cx.fillStyle = "#c9573a"; cx.fillRect(x - 26 * s, py0 - 26 * s, 44 * s, 22 * s); cx.fillStyle = "#e0d4b8"; cx.fillRect(x + 18 * s, py0 - 20 * s, 10 * s, 16 * s); cx.fillStyle = "rgba(255,220,150,.9)"; cx.fillRect(x - 22 * s, py0 - 22 * s, 30 * s, 9 * s); cx.fillStyle = "#111"; cx.beginPath(); cx.arc(x - 16 * s, py0 - 3 * s, 4 * s, 0, TAU); cx.arc(x + 16 * s, py0 - 3 * s, 4 * s, 0, TAU); cx.fill(); }
  }
  function others(t, front) {
    if (!window.HNPark || !HNPark.others) return;
    for (const o of HNPark.others().values()) {
      if (o.id === me) continue;
      if (o.rz == null) o.rz = o.tz; o.rz += (o.tz - o.rz) * .08;
      const x = xOf(o.rz); if (x < L0() || x > L1()) continue;
      const y = o.m === 2 ? riverY() - 6 * U : o.m === 1 ? pathY() : H * (Y.path1 + .03), s = scaleAt(y), d = Math.cos(o.ta || 0) >= 0 ? 1 : -1;
      if (o.m === 2) { if (!front) swan(x, y, s * .8, d, t, false); else { person(x, y - 8 * s, s, o.col); swan(x, y + 4 * s, s * 1.3, d, t, true); tag(x, y - 40 * s, o.nick, s); } continue; }
      if (o.m === 4 || o.m === 5) { if (!front) continue; const yy = riverY() - 4 * U; cx.fillStyle = o.m === 4 ? "rgba(230,110,50,.9)" : "rgba(60,190,200,.9)"; cx.beginPath(); cx.ellipse(x, yy + 2 * s, 20 * s, 3 * s, 0, 0, TAU); cx.fill(); person(x, yy - (o.m === 4 ? 4 : 10) * s, s * .9, o.col); tag(x, yy - 36 * s, o.nick, s); continue; }
      if (!front) continue;
      if (o.m === 1) bikeShape(x, y, s * .8, "rgba(200,210,230,.8)");
      person(x, y - (o.m === 1 ? 10 * s : 0), s, o.col); tag(x, y - 34 * s, o.nick, s);
    }
  }
  function person(x, y, s, col) { cx.fillStyle = col || "#8a7"; cx.fillRect(x - 4 * s, y - 16 * s, 8 * s, 11 * s); cx.fillStyle = "#1c1f2a"; cx.fillRect(x - 3.5 * s, y - 5 * s, 3 * s, 5 * s); cx.fillRect(x + .5 * s, y - 5 * s, 3 * s, 5 * s); cx.fillStyle = "#2a2220"; cx.beginPath(); cx.arc(x, y - 20 * s, 4.5 * s, 0, TAU); cx.fill(); }
  function tag(x, y, n, s) { if (!n) return; cx.font = `600 ${Math.max(9, 8.5 * s)}px system-ui,sans-serif`; cx.textAlign = "center"; cx.fillStyle = "rgba(244,234,216,.75)"; cx.fillText(n, x, y); }

  // 🏃 길 위 지나가는 사람들(조깅·자전거·강아지 산책) — 내 화면에서만 그리는 풍경
  const npcs = [];
  function npcTick(dt) {
    const want = 5; while (npcs.length < want) { const k = ["jog", "bike", "dog", "jog", "bike"][npcs.length % 5], d = Math.random() < .5 ? -1 : 1; npcs.push({ k, d, wx: X + (d > 0 ? -60 * U - Math.random() * W : W + 60 * U + Math.random() * W), v: (k === "bike" ? 150 : k === "jog" ? 70 : 38) * U * (.85 + Math.random() * .3), dy: (Math.random() - .5) * H * .022, ph: Math.random() * 9, col: `hsl(${Math.random() * 360 | 0},35%,${45 + Math.random() * 15 | 0}%)` }); }
    for (let i = npcs.length - 1; i >= 0; i--) { const n = npcs[i]; n.wx += n.d * n.v * dt; if (n.wx < X - W * 1.6 || n.wx > X + W * 2.6) npcs.splice(i, 1); }
  }
  function npcDraw(n, t) {
    const y = pathY() + n.dy, s = scaleAt(y), d = n.d, x = n.wx;
    if (n.k === "bike") { bikeShape(x, y + 2 * s, s * .85, "rgba(170,180,200,.85)"); cx.fillStyle = n.col; cx.save(); cx.translate(x - d * 1 * s, y - 20 * s); cx.rotate(d * .35); cx.fillRect(-3.5 * s, -9 * s, 7 * s, 11 * s); cx.restore(); cx.fillStyle = "#2a2220"; cx.beginPath(); cx.arc(x + d * 3 * s, y - 31 * s, 4.2 * s, 0, TAU); cx.fill(); cx.fillStyle = "rgba(255,240,200,.9)"; cx.fillRect(x + d * 14 * s, y - 15 * s, 1.6 * s, 1.6 * s); return; }
    const sw = Math.sin(t * (n.k === "jog" ? 13 : 8) + n.ph) * (n.k === "jog" ? 5 : 3) * s, bob = Math.abs(Math.sin(t * 13 + n.ph)) * (n.k === "jog" ? 1.6 : .6) * s;
    cx.strokeStyle = "#23262f"; cx.lineWidth = 3 * s; cx.lineCap = "round"; cx.beginPath(); cx.moveTo(x, y - 9 * s - bob); cx.lineTo(x + sw, y); cx.moveTo(x, y - 9 * s - bob); cx.lineTo(x - sw, y); cx.stroke();
    cx.fillStyle = n.col; cx.fillRect(x - 3.5 * s, y - 21 * s - bob, 7 * s, 13 * s);
    cx.strokeStyle = n.col; cx.lineWidth = 2.6 * s; cx.beginPath(); cx.moveTo(x, y - 18 * s - bob); cx.lineTo(x - sw * .9, y - 11 * s - bob); cx.stroke();
    cx.fillStyle = "#efcdae"; cx.beginPath(); cx.arc(x + d * .8 * s, y - 25 * s - bob, 4.2 * s, 0, TAU); cx.fill(); cx.fillStyle = "#2a2220"; cx.beginPath(); cx.arc(x - d * .6 * s, y - 26 * s - bob, 4.2 * s, d > 0 ? Math.PI * .6 : -Math.PI * .4, d > 0 ? Math.PI * 1.9 : Math.PI * .9); cx.fill();
    if (n.k === "dog") { const lx = x + d * 18 * s, dy2 = Math.abs(Math.sin(t * 10 + n.ph)) * 1.2 * s; cx.strokeStyle = "rgba(220,200,160,.5)"; cx.lineWidth = .7 * s; cx.beginPath(); cx.moveTo(x - sw * .9, y - 11 * s - bob); cx.lineTo(lx - d * 4 * s, y - 7 * s); cx.stroke();
      cx.fillStyle = "#c79a62"; cx.beginPath(); cx.ellipse(lx, y - 4 * s - dy2, 6 * s, 3 * s, 0, 0, TAU); cx.fill(); cx.beginPath(); cx.arc(lx + d * 6 * s, y - 7 * s - dy2, 2.8 * s, 0, TAU); cx.fill(); cx.fillRect(lx - 4 * s, y - 3 * s - dy2, 1.4 * s, 3 * s + dy2); cx.fillRect(lx + 3 * s, y - 3 * s - dy2, 1.4 * s, 3 * s + dy2);
      cx.strokeStyle = "#c79a62"; cx.lineWidth = 1.2 * s; cx.beginPath(); cx.moveTo(lx - d * 6 * s, y - 5 * s - dy2); cx.lineTo(lx - d * 9 * s, y - 8 * s - dy2 + Math.sin(t * 14) * 1.5 * s); cx.stroke(); }
  }
  let deco = [];
  R.ground = (t, dt) => {
    const sp = lampSp(), k0 = Math.floor((L0() - W * .12) / sp) - 1, k1 = Math.ceil((L1() - W * .12) / sp) + 1;
    grass();
    for (let k = k0; k <= k1; k++) lampPost(W * .12 + k * sp);
    strings(sp, k0, k1, t);
    hits = [];
    for (const p of pois()) if (p.wx > L0() - 60 * U && p.wx < L1() + 60 * U) drawPoi(p, t);
    deco = decor(); const meY = my;
    for (const d of deco) if (d.y <= meY) d.f(d.x, d.y, d.k, t);
    npcTick(dt); for (const n of npcs) if (pathY() + n.dy <= my) npcDraw(n, t);
    others(t, false);
    // 내 탈것(사람보다 뒤)
    const s = scaleAt(my);
    if (m === 1) bikeShape(mx, my + 2 * s, s * .9, "rgba(140,210,160,.95)");
    if (m === 2) swan(mx, my + 4 * s, s * 1.5, dir, t, false);
  };
  R.front = (t, dt) => {
    const s = scaleAt(my);
    if (m === 2) swan(mx, my + 6 * s, s * 1.5, dir, t, true);                             // 오리배는 사람 앞으로 덮는다
    for (const n of npcs) if (pathY() + n.dy > my) npcDraw(n, t);
    others(t, true);
    for (const d of deco) if (d.y > my) d.f(d.x, d.y, d.k, t);
    // 장소 이름표(누르면 걸어가기/타기)
    const ss = scaleAt(H * Y.path1);
    for (const p of pois()) { if (p.wx < L0() || p.wx > L1()) continue; const y = (p.k === "duck" || p.k === "cruise") ? H * Y.B - 56 * ss : H * Y.path0 - 58 * ss; const r = sign(p.wx, y, NAME[p.k], ss, near === p); hits.push({ ...r, p }); }
    // 화면 밖 다음 장소 화살표
    if (!m || true) {
      const vis = p => p.wx > X && p.wx < X + W, R2 = pois().filter(p => !vis(p) && p.wx > X + W).sort((a, b) => a.wx - b.wx)[0], L2 = pois().filter(p => !vis(p) && p.wx < X).sort((a, b) => b.wx - a.wx)[0];
      cx.font = `600 ${11 * Math.max(1, U)}px system-ui,sans-serif`; cx.fillStyle = "rgba(244,234,216,.6)";
      const md = p => { const d = Math.round(Math.abs(p.wx - mx) / PXM()); return d >= 1000 ? (d / 1000).toFixed(1) + "km" : d + "m"; };
      if (R2) { cx.textAlign = "right"; cx.fillText(`${NAME[R2.k]} ${md(R2)} ▶`, X + W - 10, H * .975); }
      if (L2) { cx.textAlign = "left"; cx.fillText(`◀ ${NAME[L2.k]} ${md(L2)}`, X + 10, H * .975); }
      const home = W / 2; if (home < X - 20 || home > X + W + 20) { cx.textAlign = home < X ? "left" : "right"; cx.fillText(home < X ? "◀ 🧺 돗자리" : "🧺 돗자리 ▶", home < X ? X + 10 : X + W - 10, H * .945); }
    }
  };

  R.tap = e => {
    const off = skyK > 0 ? skyOff() : 0, sx = e.clientX, sy = e.clientY - off, wx = sx + X;
    for (const h of hits) if (wx > h.x - 6 && wx < h.x + h.w + 6 && sy > h.y - 6 && sy < h.y + h.h + 6) {
      if (near === h.p) act(); else if (!m) { goal = h.p.wx; dir = Math.sign(goal - mx) || 1; toast(`${NAME[h.p.k]}(으)로 걸어가요`, 1600); }
      return;
    }
    if (onTripBoat(sx, sy)) return goTrip("cruise");
    if (onSky(sx, sy + off) && !off) return sendStar(sx, sy);
    if (!m && sy > H * Y.path0) { goal = wx; dir = Math.sign(goal - mx) || 1; }   // 땅을 누르면 그쪽으로 걸어감
  };
  R.dbg = () => ({ X, mx, my, m, auto, near: near && near.id });
  R.dbgSet = o => { if (o.z != null) { mx = xOf(o.z); X = mx - W / 2; } if (o.m != null) { const p = pois().find(q => q.k === (o.m === 1 ? "bike" : "duck")); if (o.m === 0) dismount(true); else mount(p); } if (o.auto != null) auto = o.auto; if (o.sky != null) R.sky = o.sky; sync(); };
})();
