// 🚇 지하철 시점 — 01(index.html)과 02(3d.html)가 같이 쓰는 파일.
// 돗자리에서 보면 강 위 다리로 지하철이 지나간다. 이번엔 그 지하철 안에서 창밖을 본다:
// 다리 기둥이 휙휙 지나가고, 강 건너 우리 돗자리 잔디밭(지금 방 사람들)·산책로 불빛·뒤 건물 조금·평소 같은 밤하늘 + 별.
// 객차 안 광고판 = 오늘 응원해 준 사람들 고마움 광고(누르면 응원). 서버 메시지 없음(화면만).
(function () {
  const H = window.HNSubway = {};
  let nearK = 0, stars2 = null, opt = null, on = false, cv = null, g = null, W = 0, HH = 0, DPR = 1, raf = 0, last = 0, x = 0, stars = null, bld = null, actx = null, clackT = 0, phase = "run", phaseT = 0, adR = null;
  const $ = id => document.getElementById(id);
  const STATIONS = [["당산", "합정"], ["합정", "당산"]];
  const LEN = 2600;   // 한 번 건너는 길이(px, 화면 기준 속도 약 70px/s → 약 37초)
  const css = `
  #swWrap { position: fixed; inset: 0; z-index: 9; display: none; background: #000; user-select: none; -webkit-user-select: none; font-family: system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; }
  #swWrap.on { display: block; } #swWrap canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  #swTop { position: absolute; left: 12px; right: 12px; top: max(12px, env(safe-area-inset-top)); display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; pointer-events: none; }
  #swLed { padding: 6px 12px; border-radius: 10px; background: #120a04; border: 1px solid #3a2410; color: #ff9d2e; font: 700 13px/1.35 ui-monospace, "Apple SD Gothic Neo", monospace; letter-spacing: .5px; max-width: calc(100vw - 150px); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  #swBack { all: unset; pointer-events: auto; cursor: pointer; padding: 9px 13px; border-radius: 999px; background: rgba(20,24,30,.8); border: 1px solid rgba(255,255,255,.22); color: #fff; font-size: 13px; font-weight: 700; white-space: nowrap; }
  #swNear { all: unset; position: absolute; left: 12px; bottom: calc(max(14px, env(safe-area-inset-bottom)) + 4px); cursor: pointer; padding: 8px 12px; border-radius: 999px; background: rgba(20,24,30,.75); color: #dfe6ee; font-size: 13px; font-weight: 700; }
  #swNear.on { background: rgba(255,214,150,.9); color: #2a1c08; }
  #swSnd { all: unset; position: absolute; right: 12px; bottom: calc(max(14px, env(safe-area-inset-bottom)) + 4px); cursor: pointer; padding: 8px 12px; border-radius: 999px; background: rgba(20,24,30,.75); color: #dfe6ee; font-size: 13px; }`;
  function build() {
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    const w = document.createElement("div"); w.id = "swWrap"; w.setAttribute("role", "dialog"); w.setAttribute("aria-label", "지하철 시점");
    w.innerHTML = `<canvas id="swCv"></canvas><div id="swTop"><div id="swLed"></div><button id="swBack">🧺 돗자리로</button></div><button id="swSnd">🔊 덜컹 소리</button><button id="swNear">🔭 창밖 보기</button>`;
    document.body.appendChild(w); cv = $("swCv"); g = cv.getContext("2d");
    $("swBack").onclick = close;
    $("swNear").onclick = () => { H.near = !H.near; $("swNear").classList.toggle("on", H.near); $("swNear").textContent = H.near ? "🪑 자리로" : "🔭 창밖 보기"; };
    $("swSnd").onclick = () => { H.snd = !H.snd; $("swSnd").textContent = H.snd ? "🔊 덜컹 소리" : "🔇 소리 꺼짐"; };
    cv.addEventListener("click", e => { const r = adR; if (r && e.clientX >= r[0] && e.clientX <= r[0] + r[2] && e.clientY >= r[1] && e.clientY <= r[1] + r[3] && opt.openSup) { close(); opt.openSup(); } });
    addEventListener("resize", () => on && size());
    H.snd = true;
  }
  function size() { DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; HH = innerHeight; cv.width = W * DPR; cv.height = HH * DPR; stars = null; stars2 = null; bld = null; mw = null; }
  function clack() {   // 레일 이음새 '덜컹-덜컹'(노이즈 두 번, 작게)
    if (!H.snd) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume();
      for (const d of [0, .11]) {
        const n = actx.createBuffer(1, 2200, actx.sampleRate), a = n.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * Math.exp(-i / 380);
        const src = actx.createBufferSource(), f = actx.createBiquadFilter(), gn = actx.createGain(); src.buffer = n; f.type = "lowpass"; f.frequency.value = 420; gn.gain.value = .22;
        src.connect(f); f.connect(gn); gn.connect(actx.destination); src.start(actx.currentTime + d);
      }
    } catch {}
  }
  function open() {
    if (opt.closeOthers) opt.closeOthers();
    $("swWrap").classList.add("on"); on = true; size(); x = 0; H.near = false; nearK = 0; $("swNear").classList.remove("on"); $("swNear").textContent = "🔭 창밖 보기"; phase = "run"; phaseT = 0; H.leg = (H.leg || 0) + 1;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch {}
    cancelAnimationFrame(raf); last = performance.now();
    const loop = t => { if (!on) return; const dt = Math.min(.05, (t - last) / 1000); last = t; step(dt); draw(t / 1000); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
  }
  function close() { on = false; cancelAnimationFrame(raf); $("swWrap").classList.remove("on"); }
  function step(dt) {
    const st = STATIONS[(H.leg || 0) % 2];
    let v = 0; phaseT += dt;
    if (phase === "run") { v = 70 * Math.min(1, phaseT / 3) * Math.min(1, Math.max(.15, (LEN - x) / 260)); x += v * dt; if (x >= LEN) { phase = "stop"; phaseT = 0; } }
    else if (phase === "stop" && phaseT > 6) { phase = "run"; phaseT = 0; x = 0; H.leg = (H.leg || 0) + 1; }
    nearK = Math.max(0, Math.min(1, nearK + (H.near ? 1 : -1) * dt / .7));
    H.v = v; clackT -= v * dt; if (clackT <= 0) { clackT = 180; if (v > 30) clack(); }
    const led = phase === "stop" ? `이번 역은 ${st[1]}역입니다` : x < LEN * .15 ? `${st[0]} → ${st[1]} · 한강 건너는 중` : x > LEN * .8 ? `다음 역은 ${st[1]}입니다` : `🌉 창밖에 우리 돗자리`;
    if ($("swLed").textContent !== led) $("swLed").textContent = led;
  }
  let mw = null, bright = null;
  // 은하수: 한 번 그려 두고(오프스크린) 창밖에 천천히 흘려보낸다
  function milky(w, h) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; const q = c.getContext("2d");
    let k = 7; const rnd = () => (k = (k * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 48; i++) { const u = rnd(), v = (rnd() - .5) * .5, x = u * w, y = h * (.62 - u * .42) + v * h * .4, r = 24 + rnd() * 70; const g2 = q.createRadialGradient(x, y, 0, x, y, r); g2.addColorStop(0, `rgba(160,170,235,${.05 + rnd() * .06})`); g2.addColorStop(1, "rgba(160,170,235,0)"); q.fillStyle = g2; q.fillRect(x - r, y - r, r * 2, r * 2); }
    for (let i = 0; i < 2800; i++) { const u = rnd(), v = (rnd() + rnd() + rnd()) / 3 - .5, x = u * w, y = h * (.62 - u * .42) + v * h * .55; q.fillStyle = `rgba(${210 + rnd() * 45 | 0},${215 + rnd() * 35 | 0},255,${.1 + rnd() * .3})`; q.beginPath(); q.arc(x, y, rnd() < .07 ? 1.1 : .55, 0, 7); q.fill(); }
    return c;
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }
  function draw(t) {
    const c = g; c.setTransform(DPR, 0, 0, DPR, 0, 0);
    const P = Math.min(W, HH), port = HH > W * 1.2, k = nearK * nearK * (3 - 2 * nearK), L = (a, b) => a + (b - a) * k;   // 창밖 보기: 창문에 붙어 화면 가득
    const fr = { l: L(W * .05, -12), r: L(W * .95, W + 12), t: L(HH * (port ? .25 : .2), -12), b: L(HH * (port ? .76 : .72), HH + 12) };   // 창문
    const hz = fr.t + (fr.b - fr.t) * L(port ? .62 : .52, .66), sc = Math.max(P / 520, (fr.b - fr.t) / 360), skyH = hz - fr.t;   // 건너편 땅(잔디) 높이
    c.fillStyle = "#06070f"; c.fillRect(0, 0, W, HH);
    // ---------- 창밖 ----------
    c.save(); rr(c, fr.l, fr.t, fr.r - fr.l, fr.b - fr.t, 14); c.clip();
    let gr = c.createLinearGradient(0, fr.t, 0, hz); gr.addColorStop(0, "#05061a"); gr.addColorStop(.45, "#141547"); gr.addColorStop(.8, "#2d2360"); gr.addColorStop(1, "#5a3c72"); c.fillStyle = gr; c.fillRect(fr.l, fr.t, fr.r - fr.l, skyH);
    // 은하수(아주 천천히 흐름)
    if (!mw) mw = milky(Math.ceil(W * 1.5), Math.ceil(skyH)); { const mwW = mw.width, ox = ((-x * .012) % mwW + mwW) % mwW; c.globalAlpha = 1; c.drawImage(mw, fr.l - ox, fr.t); c.drawImage(mw, fr.l - ox + mwW, fr.t); c.globalAlpha = 1; }
    // 별 세 겹: 먼 별(많이, 작게) · 중간 · 밝은 별(십자 빛)
    if (!stars) { stars = []; let k = 3; const rnd = () => (k = (k * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 320; i++) stars.push([rnd(), rnd() * .88, rnd() < .25 ? 1.5 : .8, rnd() * 6, rnd()]); bright = []; for (let i = 0; i < 9; i++) bright.push([rnd(), rnd() * .7, 2 + rnd() * 1.2, rnd() * 6, rnd()]); }
    const sw = W * 1.6;
    for (const [a, b, r, p, hue] of stars) { const X = fr.l + ((a * sw - x * .02) % sw + sw) % sw, Y = fr.t + b * skyH; if (X > fr.r) continue; c.globalAlpha = .35 + .5 * (.5 + .5 * Math.sin(t * (1 + hue) + p * 3)); c.fillStyle = hue < .15 ? "#ffd9b0" : hue < .3 ? "#bcd0ff" : "#eef2ff"; c.beginPath(); c.arc(X, Y, r, 0, 7); c.fill(); }
    if (k > 0) { if (!stars2) { stars2 = []; let q = 11; const rnd = () => (q = (q * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 420; i++) stars2.push([rnd(), rnd() * .92, .5 + rnd() * .9, rnd() * 6, rnd()]); }
      for (const [a, b, r, p, hue] of stars2) { const X = fr.l + ((a * sw - x * .02) % sw + sw) % sw, Y = fr.t + b * skyH; if (X > fr.r) continue; c.globalAlpha = k * (.3 + .5 * (.5 + .5 * Math.sin(t * (1.2 + hue) + p * 3))); c.fillStyle = hue < .2 ? "#ffe0b8" : "#dde6ff"; c.beginPath(); c.arc(X, Y, r, 0, 7); c.fill(); } }
    for (const [a, b, r, p, hue] of bright) { const X = fr.l + ((a * sw - x * .02) % sw + sw) % sw, Y = fr.t + b * skyH, tw = .7 + .3 * Math.sin(t * 2 + p); if (X > fr.r) continue;
      gr = c.createRadialGradient(X, Y, 0, X, Y, r * 5); gr.addColorStop(0, `rgba(255,250,235,${.5 * tw})`); gr.addColorStop(1, "rgba(255,250,235,0)"); c.globalAlpha = 1; c.fillStyle = gr; c.fillRect(X - r * 5, Y - r * 5, r * 10, r * 10);
      c.fillStyle = hue < .3 ? "#ffe6c4" : "#f4f6ff"; c.beginPath(); c.arc(X, Y, r * .9, 0, 7); c.fill();
      c.strokeStyle = `rgba(255,255,255,${.35 * tw})`; c.lineWidth = 1; c.beginPath(); c.moveTo(X - r * 4, Y); c.lineTo(X + r * 4, Y); c.moveTo(X, Y - r * 4); c.lineTo(X, Y + r * 4); c.stroke(); }
    c.globalAlpha = 1;
    // 별똥별(9초마다 한 번, 0.8초)
    { const per = 9, ph = t % per, n = Math.floor(t / per); if (ph < .8) { const u = ph / .8, X0 = fr.l + (fr.r - fr.l) * (.15 + (n * 37 % 60) / 100), Y0 = fr.t + skyH * (.08 + (n * 23 % 30) / 100), X = X0 + u * 200 * sc, Y = Y0 + u * 70 * sc, L = 70 * sc;
      gr = c.createLinearGradient(X - L * .94, Y - L * .33, X, Y); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(1, `rgba(255,255,255,${.9 * (1 - u * u)})`); c.strokeStyle = gr; c.lineWidth = 1.6; c.beginPath(); c.moveTo(X - L * .94, Y - L * .33); c.lineTo(X, Y); c.stroke(); } }
    // 달 + 달무리
    { const mx = fr.l + (fr.r - fr.l) * .78 - x * .008, my = fr.t + skyH * .2, mr = P * .026 * (1 + k * .5);
      gr = c.createRadialGradient(mx, my, mr * .9, mx, my, mr * 6); gr.addColorStop(0, "rgba(255,240,215,.22)"); gr.addColorStop(.4, "rgba(255,240,215,.06)"); gr.addColorStop(1, "rgba(255,240,215,0)"); c.fillStyle = gr; c.fillRect(mx - mr * 6, my - mr * 6, mr * 12, mr * 12);
      gr = c.createRadialGradient(mx - mr * .3, my - mr * .3, 0, mx, my, mr); gr.addColorStop(0, "#fffaf0"); gr.addColorStop(1, "#e6dcc0"); c.fillStyle = gr; c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill();
      c.fillStyle = "rgba(180,165,135,.28)"; for (const [a, b, r] of [[-.35, -.2, .22], [.25, .2, .3], [.1, -.45, .14], [-.2, .45, .1]]) { c.beginPath(); c.arc(mx + a * mr, my + b * mr, r * mr, 0, 7); c.fill(); } }
    // 얇은 구름(도시 불빛에 아래가 살짝 밝음)
    for (let i = 0; i < 4; i++) { const cw = (90 + i * 40) * sc, X = fr.l + (((i * 0.31 + .1) * sw - x * .03 - t * 2) % sw + sw) % sw, Y = fr.t + skyH * (.45 + i * .12); if (X - cw > fr.r) continue;
      gr = c.createRadialGradient(X, Y, 0, X, Y, cw); gr.addColorStop(0, "rgba(190,160,200,.1)"); gr.addColorStop(.6, "rgba(160,120,170,.05)"); gr.addColorStop(1, "rgba(160,120,170,0)"); c.fillStyle = gr; c.save(); c.scale(1, .12); c.beginPath(); c.arc(X, Y / .12, cw, 0, 7); c.fill(); c.restore(); }
    // 지평선 빛무리(도시가 하늘을 덥힘)
    gr = c.createLinearGradient(0, hz - 90 * sc, 0, hz); gr.addColorStop(0, "rgba(255,160,110,0)"); gr.addColorStop(1, "rgba(255,160,110,.22)"); c.fillStyle = gr; c.fillRect(fr.l, hz - 90 * sc, fr.r - fr.l, 90 * sc);
    // 뒤 건물(조금만, 잔디밭 뒤로 낮게) + 옥상 경고등
    if (!bld) { bld = []; let bx = 0; while (bx < LEN * .5 + W * 2) { const w = 30 + Math.random() * 50; bld.push([bx, w, 20 + Math.random() * 55, Math.random()]); bx += w + 4; } }
    const bs = x * .45;
    for (const [bx, w, h, k] of bld) { const X = bx - bs; if (X > W || X + w < 0) continue; const top = hz - 14 * sc - h * sc;
      gr = c.createLinearGradient(0, top, 0, hz); gr.addColorStop(0, "#1c1a3e"); gr.addColorStop(1, "#0f0e24"); c.fillStyle = gr; c.fillRect(X, top, w, h * sc + 14 * sc);
      c.fillStyle = "rgba(255,214,150,.6)"; for (let yy = top + 4 * sc; yy < hz - 18 * sc; yy += 7 * sc) for (let xx = X + 4; xx < X + w - 4; xx += 7) if (((xx * 13 + yy * 7 + k * 99) | 0) % 5 < 2) c.fillRect(xx, yy, 2.4, 2.6);
      if (k > .8) { c.fillStyle = `rgba(255,70,70,${.4 + .5 * Math.sin(t * 2 + k * 9)})`; c.beginPath(); c.arc(X + w / 2, top - 2, 1.6, 0, 7); c.fill(); } }
    // 잔디밭 + 돗자리(우리 자리)
    const ss = x * .9;
    gr = c.createLinearGradient(0, hz - 14 * sc, 0, hz + 30 * sc); gr.addColorStop(0, "#163520"); gr.addColorStop(1, "#0b1c12"); c.fillStyle = gr; c.fillRect(0, hz - 14 * sc, W, 44 * sc);
    const people = (opt.people ? opt.people() : []) || [], mats = 16, gap = 120 * sc, start = W * .5;
    for (let i = 0; i < mats; i++) {
      const mx = start + i * gap - ss + (i % 2) * 30; if (mx < -80 || mx > W + 80) continue;
      const my = hz - 4 * sc + (i % 3) * 7 * sc, col = ["#b4392d", "#2f6bc4", "#2c8f58", "#c89a2c"][i % 4];
      c.fillStyle = col; c.globalAlpha = .85; c.beginPath(); c.moveTo(mx - 26 * sc, my + 6 * sc); c.lineTo(mx + 26 * sc, my + 6 * sc); c.lineTo(mx + 20 * sc, my - 2 * sc); c.lineTo(mx - 20 * sc, my - 2 * sc); c.fill(); c.globalAlpha = 1;
      const p = people[i]; if (!p) continue;
      c.fillStyle = p.me ? "#ffd38a" : "#e9d6c5"; c.beginPath(); c.ellipse(mx, my - 4 * sc, 4 * sc, 5.5 * sc, 0, 0, 7); c.fill(); c.fillStyle = "#2a1f1c"; c.beginPath(); c.arc(mx, my - 12 * sc, 3.4 * sc, 0, 7); c.fill();
      c.font = `${p.me ? 700 : 500} ${Math.max(9, 8 * sc)}px system-ui, sans-serif`; c.textAlign = "center"; c.fillStyle = p.me ? "#ffd38a" : "rgba(255,255,255,.8)"; c.fillText(p.me ? "나 · " + p.nick : p.nick, mx, my - 19 * sc);
    }
    { const mx = start - 70 * sc - ss; if (mx > -60 && mx < W + 60) { c.fillStyle = "#c93a2e"; c.fillRect(mx - 6 * sc, hz - 28 * sc, 12 * sc, 20 * sc); c.fillStyle = "#1c1c2e"; c.fillRect(mx - 4 * sc, hz - 16 * sc, 8 * sc, 6 * sc); c.font = `700 ${Math.max(9, 8 * sc)}px system-ui, sans-serif`; c.textAlign = "center"; c.fillStyle = "#ffd38a"; c.fillText("📍 우리 돗자리", mx, hz - 44 * sc); } }
    // 산책로 가로등(잔디 앞) + 줄전구
    for (let i = 0; i < 40; i++) { const X = ((i * 90 - ss) % (90 * 40) + 90 * 40) % (90 * 40) - 90; if (X > W + 20) continue;
      c.fillStyle = "#2a2c33"; c.fillRect(X, hz + 6 * sc, 1.5, 18 * sc); gr = c.createRadialGradient(X, hz + 6 * sc, 0, X, hz + 6 * sc, 14 * sc); gr.addColorStop(0, "rgba(255,220,150,.85)"); gr.addColorStop(1, "rgba(255,220,150,0)"); c.fillStyle = gr; c.fillRect(X - 14 * sc, hz - 8 * sc, 28 * sc, 28 * sc); }
    for (let X = -((ss * 1.1) % 12); X < W; X += 12) { c.fillStyle = `rgba(255,215,150,${.5 + .3 * Math.sin(X * .3 + t * 3)})`; c.fillRect(X, hz + 12 * sc + Math.sin(X * .05) * 2 * sc, 1.4, 1.4); }
    // 강물(빠르게 흐르는 반짝임 + 불빛 기둥 반사)
    const ry = hz + 30 * sc; gr = c.createLinearGradient(0, ry, 0, fr.b); gr.addColorStop(0, "#161b45"); gr.addColorStop(1, "#06081a"); c.fillStyle = gr; c.fillRect(0, ry, W, HH - ry);
    for (let i = 0; i < 40; i++) { const X = ((i * 90 - ss) % (90 * 40) + 90 * 40) % (90 * 40) - 90; if (X > W + 20) continue; gr = c.createLinearGradient(0, ry, 0, ry + 60 * sc); gr.addColorStop(0, "rgba(255,220,150,.22)"); gr.addColorStop(1, "rgba(255,220,150,0)"); c.fillStyle = gr; c.fillRect(X - 3 * sc, ry, 6 * sc, 60 * sc); }
    for (let i = 0; i < 90; i++) { const yy = ry + ((i * 37) % 100) / 100 * (fr.b - ry), sp = 1.2 + (yy - ry) / (fr.b - ry) * 1.6, X = ((i * 173 - x * sp) % (W + 60) + W + 60) % (W + 60) - 30; c.fillStyle = `rgba(255,215,160,${.12 + .22 * Math.sin(t * 2 + i)})`; c.fillRect(X, yy, 10 + (i % 4) * 6, 1.2); }
    // 다리 트러스(가장 가까이, 아주 빠르게 지나감): 어두운 강철 + 가장자리 하이라이트
    const tsp = x * 2.6, tg = 230;
    for (let k = -1; k < W / tg + 2; k++) { const X = k * tg - (tsp % tg), lw = Math.max(5, Math.min(11, 9 * sc));
      c.strokeStyle = "rgba(18,21,28,.96)"; c.lineWidth = lw; c.beginPath(); c.moveTo(X, fr.t); c.lineTo(X, fr.b); c.stroke(); c.lineWidth = lw * .55; c.beginPath(); c.moveTo(X, fr.t); c.lineTo(X + tg, fr.b); c.stroke();
      c.strokeStyle = "rgba(140,150,165,.22)"; c.lineWidth = 1; c.beginPath(); c.moveTo(X - lw / 2 + .5, fr.t); c.lineTo(X - lw / 2 + .5, fr.b); c.stroke(); }
    c.fillStyle = "rgba(18,21,28,.96)"; c.fillRect(0, fr.t, W, 7 * sc); c.fillRect(0, fr.b - 7 * sc, W, 7 * sc);
    // 유리 반사: 실내 형광등이 비침 + 사선 하이라이트
    c.fillStyle = "rgba(255,250,235,.05)"; rr(c, fr.l + 20, fr.t + 10, fr.r - fr.l - 40, 10, 5); c.fill();
    c.fillStyle = "rgba(255,255,255,.035)"; c.beginPath(); c.moveTo(fr.l + W * .55, fr.t); c.lineTo(fr.l + W * .7, fr.t); c.lineTo(fr.l + W * .3, fr.b); c.lineTo(fr.l + W * .15, fr.b); c.fill();
    c.restore();
    // ---------- 객차 안 ----------
    if (k > .95) { adR = null; return; }   // 창문에 붙은 상태: 실내는 안 그림
    gr = c.createLinearGradient(0, 0, 0, HH); gr.addColorStop(0, "#f1f2f3"); gr.addColorStop(.5, "#e3e6e9"); gr.addColorStop(1, "#cfd4d8"); c.fillStyle = gr;
    c.fillRect(0, 0, W, fr.t); c.fillRect(0, fr.b, W, HH - fr.b); c.fillRect(0, 0, fr.l, HH); c.fillRect(fr.r, 0, W - fr.r, HH);
    // 창틀(어두운 금속, 안쪽 하이라이트)
    c.strokeStyle = "#30353b"; c.lineWidth = 8; rr(c, fr.l, fr.t, fr.r - fr.l, fr.b - fr.t, 14); c.stroke(); c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 1; rr(c, fr.l - 5, fr.t - 5, fr.r - fr.l + 10, fr.b - fr.t + 10, 18); c.stroke();
    c.strokeStyle = "rgba(0,0,0,.18)"; c.lineWidth = 1; rr(c, fr.l + 4, fr.t + 4, fr.r - fr.l - 8, fr.b - fr.t - 8, 11); c.stroke();
    // 천장: 형광등 두 줄(은은한 빛) + 천장 봉
    for (const k of [.12, .62]) { const lx = W * (k - .04), lw = W * .34, ly = fr.t * .1; gr = c.createRadialGradient(lx + lw / 2, ly, 0, lx + lw / 2, ly, lw * .7); gr.addColorStop(0, "rgba(255,250,230,.55)"); gr.addColorStop(1, "rgba(255,250,230,0)"); c.fillStyle = gr; c.fillRect(lx - lw * .3, 0, lw * 1.6, fr.t * .5);
      c.fillStyle = "#fffdf4"; rr(c, lx, ly - 3, lw, 6, 3); c.fill(); c.fillStyle = "rgba(0,0,0,.08)"; rr(c, lx, ly + 3, lw, 2, 1); c.fill(); }
    gr = c.createLinearGradient(0, fr.t * .3 - 3, 0, fr.t * .3 + 3); gr.addColorStop(0, "#f5f7f8"); gr.addColorStop(.5, "#9ea6ad"); gr.addColorStop(1, "#5f666c"); c.fillStyle = gr; c.fillRect(0, fr.t * .3 - 3, W, 6);
    const sway = Math.sin(t * 2.2) * (H.v || 0) / 70 * .12;
    for (let i = 0; i < 6; i++) { const hx = W * (.1 + i * .16); c.save(); c.translate(hx, fr.t * .3); c.rotate(sway + Math.sin(t * 1.7 + i) * .02); c.strokeStyle = "#6f777e"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, fr.t * .3); c.stroke(); c.strokeStyle = "#f3f5f6"; c.lineWidth = 2.5; c.beginPath(); c.arc(0, fr.t * .3 + 9, 9, 0, 7); c.stroke(); c.strokeStyle = "rgba(0,0,0,.25)"; c.lineWidth = 1; c.beginPath(); c.arc(0, fr.t * .3 + 9, 10.5, .3, 2.2); c.stroke(); c.restore(); }
    // 좌석: 낮은 차콜 벤치(등받이 한 줄 + 방석), 스테인리스 윗 가로대·팔걸이, 바닥
    { const wallH = 14, bkH = Math.min(HH * .105, 92), cuH = bkH * .42, y0 = fr.b + wallH, swd = fr.r - fr.l, n = Math.max(5, Math.round(swd / 110)), cw = swd / n, fy = y0 + bkH + cuH;
      gr = c.createLinearGradient(0, fy, 0, HH); gr.addColorStop(0, "#3e444a"); gr.addColorStop(.25, "#5a6168"); gr.addColorStop(1, "#6b7279"); c.fillStyle = gr; c.fillRect(0, fy, W, HH - fy);   // 바닥
      for (const k of [.12, .62]) { const lx = W * (k - .04), lw = W * .34; gr = c.createLinearGradient(lx - lw * .3, 0, lx + lw * 1.3, 0); gr.addColorStop(0, "rgba(255,250,230,0)"); gr.addColorStop(.5, "rgba(255,250,230,.09)"); gr.addColorStop(1, "rgba(255,250,230,0)"); c.fillStyle = gr; c.fillRect(lx - lw * .3, fy, lw * 1.6, HH - fy); }   // 바닥에 비친 형광등(부드럽게)
      c.fillStyle = "rgba(0,0,0,.22)"; c.fillRect(fr.l - 8, fy, swd + 16, 6);   // 좌석 아래 그늘
      gr = c.createLinearGradient(0, y0, 0, y0 + bkH); gr.addColorStop(0, "#2f3a4c"); gr.addColorStop(1, "#222a38"); c.fillStyle = gr; rr(c, fr.l, y0, swd, bkH + 3, [9, 9, 0, 0]); c.fill();   // 등받이
      gr = c.createLinearGradient(0, y0 + bkH, 0, fy); gr.addColorStop(0, "#39455a"); gr.addColorStop(1, "#283140"); c.fillStyle = gr; rr(c, fr.l - 3, y0 + bkH, swd + 6, cuH, [3, 3, 7, 7]); c.fill();   // 방석
      c.strokeStyle = "rgba(255,255,255,.13)"; c.lineWidth = 1; for (let i = 1; i < n; i++) { const X = fr.l + i * cw; c.beginPath(); c.moveTo(X, y0 + 6); c.lineTo(X, fy - 3); c.stroke(); }   // 자리 나눔선(박음질)
      c.strokeStyle = "rgba(255,255,255,.05)"; c.beginPath(); c.moveTo(fr.l + 8, y0 + 9); c.lineTo(fr.r - 8, y0 + 9); c.stroke();
      gr = c.createLinearGradient(0, y0 - 3, 0, y0 + 3); gr.addColorStop(0, "#f2f4f5"); gr.addColorStop(.6, "#a9b0b6"); gr.addColorStop(1, "#6a7177"); c.fillStyle = gr; rr(c, fr.l - 2, y0 - 3, swd + 4, 6, 3); c.fill();   // 윗 가로대(스테인리스)
      for (const ex of [fr.l - 9, fr.r + 1]) { gr = c.createLinearGradient(ex, 0, ex + 8, 0); gr.addColorStop(0, "#8f979d"); gr.addColorStop(.5, "#eef1f3"); gr.addColorStop(1, "#8f979d"); c.fillStyle = gr; rr(c, ex, y0 - 2, 8, bkH + cuH + 2, 4); c.fill(); }   // 팔걸이
      for (const k of [.28, .72]) { const px = fr.l + swd * k; gr = c.createLinearGradient(px - 3, 0, px + 3, 0); gr.addColorStop(0, "#7d858c"); gr.addColorStop(.45, "#f4f6f7"); gr.addColorStop(1, "#6f777e"); c.fillStyle = gr; c.fillRect(px - 3, fr.t * .3, 6, fy - fr.t * .3); }   // 기둥(손잡이 봉)
    }
    // 광고판(응원 고마움): 얇은 금색 테두리의 라이트 패널
    const names = (opt.supNames ? opt.supNames() : []).slice(-4), aw = Math.min(W * .62, 300), ah = Math.max(34, fr.t * .32), ax = W / 2 - aw / 2, ay = fr.t * .52;
    c.fillStyle = "rgba(0,0,0,.12)"; rr(c, ax + 2, ay + 3, aw, ah, 6); c.fill();
    gr = c.createLinearGradient(0, ay, 0, ay + ah); gr.addColorStop(0, "#fffdf6"); gr.addColorStop(1, "#f6efdc"); c.fillStyle = gr; rr(c, ax, ay, aw, ah, 6); c.fill(); c.strokeStyle = "#c9a04a"; c.lineWidth = 1.5; rr(c, ax, ay, aw, ah, 6); c.stroke();
    c.fillStyle = "#5c3f0e"; c.textAlign = "center"; c.font = `700 ${Math.min(13, ah * .32)}px system-ui, sans-serif`;
    c.fillText(names.length ? `💛 ${names.join("·")}님, 한강을 응원해 줘서 고마워요` : "💛 이 광고판의 주인공이 되어 주세요", ax + aw / 2, ay + ah * .45, aw - 12);
    c.font = `500 ${Math.min(11, ah * .26)}px system-ui, sans-serif`; c.fillStyle = "#8a6a2a"; c.fillText("밤 한강 돗자리 응원하기 ▶ 누르기", ax + aw / 2, ay + ah * .8, aw - 12);
    adR = k > .5 ? null : [ax, ay, aw, ah];
  }
  H.init = o => { opt = o; build(); };
  H.open = open; H.isOpen = () => on;
})();
