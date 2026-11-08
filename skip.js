// 🪨 한강 물수제비 — 01(index.html)과 02(3d.html)가 같이 쓰는 파일. 화면 전체를 덮는 2D 미니 게임.
// 두 번 누르기: ① 물에 닿는 각도(바늘이 흔들림) ② 힘. 각도 20°에 가까울수록 많이 튄다
// (Clanet 외 2004 Nature 실험: 돌이 물에 닿는 각도 약 20°가 가장 잘 튐 — '마법의 각도').
// 오늘 최고 기록 1~5위는 서버 메모리(t:"skip" → t:"skipTop"), 내 기록은 localStorage hn-skip. 결과는 Wordle처럼 글로 자랑하기.
(function () {
  const H = window.HNSkip = {};
  let opt = null, top = [], cv = null, g = null, W = 0, HH = 0, DPR = 1, raf = 0, on = false;
  let st = "aim", aimT0 = 0, inc = 0, pow = 0, fly = null, result = null, ripples = [], splash = [], stars = [], city = [];
  const $ = id => document.getElementById(id);
  const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const ld = () => { try { return JSON.parse(localStorage.getItem("hn-skip") || "null") || {}; } catch { return {}; } };
  const sv = v => { try { localStorage.setItem("hn-skip", JSON.stringify(v)); } catch {} };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let me = ld(); if (me.date !== kst()) { me.date = kst(); me.today = 0; me.n = 0; }
  const ANG_P = 1.7, POW_P = 1.25;   // 바늘 한 번 왕복 시간(초)

  const css = `
  #skWrap { position: fixed; inset: 0; z-index: 9; display: none; background: #050817; touch-action: none; user-select: none; -webkit-user-select: none; font-family: system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; }
  #skWrap.on { display: block; } #skWrap canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  #skTop { position: absolute; left: 12px; right: 12px; top: max(12px, env(safe-area-inset-top)); display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; pointer-events: none; }
  #skTop > * { pointer-events: auto; }
  #skInfo { padding: 8px 12px; border-radius: 16px; background: rgba(14,18,44,.7); border: 1px solid rgba(255,255,255,.14); color: #f3e9d7; font-size: 13px; line-height: 1.45; }
  #skInfo b { font-size: 15px; } #skInfo small { color: #b9b3c9; }
  #skX { all: unset; cursor: pointer; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: rgba(14,18,44,.7); border: 1px solid rgba(255,255,255,.2); color: #fff; font-size: 18px; }
  #skRank { position: absolute; right: 12px; top: calc(max(12px, env(safe-area-inset-top)) + 52px); padding: 8px 12px; border-radius: 14px; background: rgba(14,18,44,.62); border: 1px solid rgba(243,217,164,.3); color: #f3e9d7; font-size: 12.5px; line-height: 1.55; min-width: 120px; pointer-events: none; }
  #skRank b { color: #f3d9a4; } #skRank i { font-style: normal; color: #ffd38a; float: right; margin-left: 10px; } #skRank .mine { color: #c7f59a; }
  #skRes { position: absolute; left: 50%; top: 42%; transform: translate(-50%, -50%); width: min(300px, calc(100vw - 32px)); display: none; flex-direction: column; align-items: center; gap: 8px; padding: 18px 16px 14px; border-radius: 22px; background: rgba(16,22,52,.94); border: 1px solid rgba(243,217,164,.35); color: #fdf3dc; text-align: center; box-shadow: 0 14px 44px rgba(0,0,0,.5); }
  #skRes.on { display: flex; } #skRes .n { font-size: 46px; font-weight: 800; line-height: 1; color: #f3d9a4; } #skRes small { color: #b9b3c9; font-size: 12.5px; }
  #skRes .row { display: flex; gap: 8px; width: 100%; } #skRes button { all: unset; cursor: pointer; flex: 1; padding: 11px 6px; border-radius: 999px; font-weight: 700; font-size: 14px; text-align: center; background: rgba(255,255,255,.1); color: #f3e9d7; border: 1px solid rgba(255,255,255,.18); }
  #skRes button.pri { background: #f3d9a4; color: #3a2a12; border-color: transparent; }
  #skRes .tip { font-size: 12px; color: #c8c0dc; }`;

  function build() {
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    const w = document.createElement("div"); w.id = "skWrap"; w.setAttribute("role", "dialog"); w.setAttribute("aria-label", "한강 물수제비");
    w.innerHTML = `<canvas id="skCv"></canvas><div id="skTop"><div id="skInfo"></div><button id="skX" aria-label="닫기">✕</button></div><div id="skRank"></div>
      <div id="skRes"><div id="skFace" style="font-size:13px;color:#b9b3c9"></div><div class="n" id="skN">0</div><small id="skSub"></small><div class="tip" id="skTip"></div>
      <div class="row"><button id="skShare">📤 자랑하기</button><button class="pri" id="skAgain">🪨 다시 던지기</button></div></div>`;
    document.body.appendChild(w);
    cv = $("skCv"); g = cv.getContext("2d");
    $("skX").onclick = e => { e.stopPropagation(); close(); };
    $("skAgain").onclick = e => { e.stopPropagation(); reset(); };
    $("skShare").onclick = e => { e.stopPropagation(); share(); };
    $("skRes").addEventListener("pointerdown", e => e.stopPropagation());
    $("skTop").addEventListener("pointerdown", e => e.stopPropagation());
    cv.addEventListener("pointerdown", tap);
    addEventListener("keydown", e => { if (on && (e.code === "Space" || e.key === "Enter")) { e.preventDefault(); tap(); } if (on && e.key === "Escape") close(); });
    addEventListener("resize", () => on && size());
  }
  function size() {
    DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; HH = innerHeight;
    cv.width = W * DPR; cv.height = HH * DPR;
    const r = (a => () => (a = (a * 16807) % 2147483647) / 2147483647)(7);
    stars = Array.from({ length: 140 }, () => ({ x: r(), y: r() * .55, s: r() * 1.3 + .3, p: r() * 6 }));
    city = []; let x = 0; while (x < 1.6) { const w = .02 + r() * .05, h = .04 + r() * .16 * (r() < .15 ? 2 : 1); city.push({ x, w, h, win: Array.from({ length: 14 }, () => r() < .35) }); x += w + r() * .006; }
  }
  function info() {
    $("skInfo").innerHTML = `<b>🪨 한강 물수제비</b><br><small>오늘 내 최고 <b style="color:#f3d9a4">${me.today || 0}</b>번 · 평생 ${me.best || 0}번 · ${me.n || 0}번째 돌</small>`;
    $("skRank").innerHTML = `<b>🏆 오늘의 물수제비</b><br>` + (top.length ? top.map((x, i) => `<span class="${opt && x.nick === opt.nick() ? "mine" : ""}">${i + 1}. ${esc(x.nick)}<i>${x.n}번</i></span>`).join("<br>") : `<small style="color:#b9b3c9">아직 아무도 안 던졌어요</small>`);
  }
  function open() {
    if (opt && opt.closeOthers) opt.closeOthers();
    $("skWrap").classList.add("on"); on = true; size(); reset(); info();
    cancelAnimationFrame(raf); let last = performance.now();
    const loop = now => { if (!on) return; const dt = Math.min(.05, (now - last) / 1000); last = now; step(dt, now / 1000); draw(now / 1000); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    if (opt && opt.send) opt.send({ t: "skOpen" });
  }
  function close() { on = false; cancelAnimationFrame(raf); $("skWrap").classList.remove("on"); }
  function reset() { st = "ang"; aimT0 = performance.now() / 1000; fly = null; result = null; ripples = []; splash = []; $("skRes").classList.remove("on"); }
  const tri = (t, p) => { const u = (t / p) % 1; return u < .5 ? u * 2 : 2 - u * 2; };
  function tap() {
    if (!on) return; const t = performance.now() / 1000;
    if (st === "ang") { inc = 4 + tri(t - aimT0, ANG_P) * 52; st = "pow"; aimT0 = t; }
    else if (st === "pow") { pow = .15 + tri(t - aimT0, POW_P) * .85; throwIt(); }
  }
  // 튀기는 계산: 각도가 20°에서 멀수록 속도를 많이 잃고, 24°보다 멀면 바로 퐁당
  function plan(a, p) {
    const d = Math.abs(a - 20), r = Math.random(); let v = 5 + p * 13, vx = v * Math.cos(a * Math.PI / 180), vy = v * Math.sin(a * Math.PI / 180);
    const hops = []; let x = 0;
    const first = { x0: -6, x1: 0, h: 1.6 + p * 1.2 }; // 손에서 첫 닿는 곳까지
    if (d <= 24) while (vx > 2.6 && hops.length < 45) { vy = vy * (0.6 + 0.08 * r); vx *= 0.95 - d * 0.016 - 0.03 * r; if (vx <= 2.6) break; const T = 2 * vy / 9.8, L = vx * T * 3; /* 화면용 거리 3배 */ hops.push({ x0: x, x1: x + L, h: vy * vy / 19.6, T }); x += L; }
    return { first, hops, dist: x, n: hops.length };
  }
  function throwIt() {
    const P = plan(inc, pow);
    fly = { P, i: -1, u: 0, x: -6, y: P.first.h * .55, cam: -6 };
    st = "fly";
  }
  function step(dt) {
    for (const r of ripples) r.age += dt; ripples = ripples.filter(r => r.age < 3.2);
    for (const s of splash) { s.vy -= 9.8 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.age += dt; } splash = splash.filter(s => s.age < 1.4 && s.y > -0.2);
    if (st !== "fly" || !fly) return;
    const P = fly.P;
    const seg = fly.i < 0 ? P.first : P.hops[fly.i];
    const T = fly.i < 0 ? .55 : Math.max(.09, seg.T * .75);
    fly.u += dt / T;
    if (fly.u >= 1) {
      fly.u = 0; const hx = seg.x1; ripples.push({ x: hx, age: 0, big: fly.i < 0 ? 1.2 : 1 });
      for (let k = 0; k < 5; k++) splash.push({ x: hx, y: 0, vx: (Math.random() - .3) * 1.5, vy: 1 + Math.random() * 1.6, age: 0 });
      fly.i++;
      if (fly.i >= P.hops.length) { // 가라앉음
        for (let k = 0; k < 10; k++) splash.push({ x: hx, y: 0, vx: (Math.random() - .5) * 1.2, vy: 1.6 + Math.random() * 2.2, age: 0 });
        fly.sunk = hx; st = "done"; setTimeout(() => finish(P), 700); return;
      }
    }
    const s2 = fly.i < 0 ? P.first : P.hops[fly.i];
    if (fly.i < 0) { fly.x = s2.x0 + (s2.x1 - s2.x0) * fly.u; fly.y = s2.h * (1 - fly.u) + Math.sin(fly.u * Math.PI) * .6; }
    else { fly.x = s2.x0 + (s2.x1 - s2.x0) * fly.u; fly.y = 4 * s2.h * fly.u * (1 - fly.u); }
    fly.cam += (fly.x - fly.cam) * Math.min(1, dt * 3);
  }
  function finish(P) {
    const n = P.n; me.n = (me.n || 0) + 1;
    const newDay = n > (me.today || 0), newBest = n > (me.best || 0);
    if (newDay) me.today = n; if (newBest) me.best = n; sv(me);
    result = { n, dist: P.dist };
    if (opt && opt.send) opt.send({ t: "skip", n });
    const d = Math.round(inc - 20);
    $("skFace").textContent = n ? "물 위를" : "퐁당!";
    $("skN").textContent = n ? `${n}번` : "0번";
    $("skSub").textContent = `${Math.round(P.dist)}m · 닿는 각도 ${Math.round(inc)}° · 힘 ${Math.round(pow * 100)}%` + (newBest && n ? " · 🎉 내 최고 기록!" : newDay && n ? " · 오늘 최고!" : "");
    $("skTip").textContent = Math.abs(d) <= 1 ? "완벽한 각도예요! 힘만 더 세게 ✨" : Math.abs(d) <= 4 ? `거의 다 왔어요. 각도를 ${d > 0 ? "조금 낮게" : "조금 높게"}` : `20°쯤에 맞추면 훨씬 많이 튀어요 (지금 ${d > 0 ? "너무 높아요" : "너무 낮아요"})`;
    $("skRes").classList.add("on"); info();
  }
  function share() {
    const n = me.today || 0;
    const text = `🪨 밤 한강 물수제비 오늘 ${n}번 튀겼어요\n${"〰️".repeat(Math.min(10, Math.max(1, Math.ceil(n / 3))))}🌊\n나보다 많이 튀길 수 있을까?`;
    const url = location.origin + "/?from=skip";
    if (navigator.share) navigator.share({ text, url }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(text + "\n" + url).then(() => opt.toast("📋 복사했어요. 친구에게 붙여 넣어 보내 보세요", 2600)).catch(() => {});
    if (opt && opt.send) opt.send({ t: "skShare" });
  }

  // ---------- 그리기 ----------
  function draw(t) {
    const c = g; c.setTransform(DPR, 0, 0, DPR, 0, 0);
    const wl = HH * .6, PX = Math.min(W, HH * 1.1) / 9;   // 물 높이(y), 1m당 픽셀
    const cam = fly ? fly.cam : -6, ox = W * .3 - cam * PX;
    let gr = c.createLinearGradient(0, 0, 0, wl); gr.addColorStop(0, "#070a22"); gr.addColorStop(.7, "#1a1b4a"); gr.addColorStop(1, "#3a2b5c");
    c.fillStyle = gr; c.fillRect(0, 0, W, wl);
    for (const s of stars) { c.globalAlpha = .5 + .5 * Math.sin(t * 1.3 + s.p); c.fillStyle = "#fff"; c.fillRect(s.x * W, s.y * HH, s.s, s.s); } c.globalAlpha = 1;
    c.fillStyle = "#f6edd0"; c.beginPath(); c.arc(W * .82, HH * .12, 16, 0, Math.PI * 2); c.fill();
    // 건너편 도시(천천히 따라 움직임)
    const par = (cam * PX * .08) % (W * 1.6);
    for (const b of city) { let x = b.x * W - par; while (x < -W * .1) x += W * 1.6; if (x > W) continue; const bw = b.w * W, bh = b.h * Math.min(HH, W * .9) * .75;
      c.fillStyle = "#121633"; c.fillRect(x, wl - bh - 6, bw, bh);
      c.fillStyle = "rgba(255,214,140,.55)"; b.win.forEach((o, i) => { if (o) c.fillRect(x + 3 + (i % 2) * (bw / 2 - 2), wl - bh + 2 + Math.floor(i / 2) * 9, 2.2, 3.2); }); }
    c.fillStyle = "#0d1030"; c.fillRect(0, wl - 7, W, 7);   // 건너편 둑
    gr = c.createLinearGradient(0, wl, 0, HH); gr.addColorStop(0, "#141c46"); gr.addColorStop(1, "#060a1e"); c.fillStyle = gr; c.fillRect(0, wl, W, HH - wl);
    // 물결 줄
    c.strokeStyle = "rgba(160,180,255,.12)"; c.lineWidth = 1;
    for (let i = 0; i < 9; i++) { const y = wl + 10 + i * i * 4.5; const sh = ((cam * PX * (0.6 + i * .08)) % 60); c.beginPath(); for (let x = -60 - sh; x < W + 60; x += 60) { c.moveTo(x, y); c.lineTo(x + 26 + i * 2, y); } c.stroke(); }
    // 달빛 반사
    c.fillStyle = "rgba(246,237,208,.12)"; for (let i = 0; i < 8; i++) { const w2 = 30 - i * 2.5 + Math.sin(t * 2 + i) * 4; c.fillRect(W * .82 - w2 / 2, wl + 6 + i * 9, w2, 2); }
    // 거리 표시(5m마다)
    c.font = "11px system-ui, sans-serif"; c.textAlign = "center";
    for (let m = 0; m < 200; m += 5) { const x = ox + m * PX; if (x < -20 || x > W + 20) continue; c.fillStyle = "rgba(255,255,255,.18)"; c.fillRect(x - .5, wl + 2, 1, 6); if (m % 10 === 0) { c.fillStyle = "rgba(255,255,255,.3)"; c.fillText(m + "m", x, wl + 20); } }
    // 오늘 내 최고 거리 깃발 대신: 오늘 1위 표시 없음(거리 대신 횟수 게임)
    // 이쪽 둑과 던지는 사람
    const bx = ox - 6 * PX;
    c.fillStyle = "#1b2a22"; c.beginPath(); c.moveTo(bx - W, wl - 6); c.lineTo(bx + 18, wl - 6); c.lineTo(bx + 40, HH); c.lineTo(bx - W, HH); c.fill();
    if (bx > -40) { c.fillStyle = "#0b0f22"; c.beginPath(); c.arc(bx - 4, wl - 48, 8, 0, Math.PI * 2); c.fill(); c.fillRect(bx - 10, wl - 40, 12, 30); c.fillRect(bx - 9, wl - 12, 4, 7); c.fillRect(bx - 2, wl - 12, 4, 7);
      const ang = st === "ang" || st === "pow" ? -.6 : .4; c.save(); c.translate(bx, wl - 36); c.rotate(ang); c.fillRect(0, -2, 16, 4); c.restore(); }
    // 물결 동그라미
    for (const r of ripples) { const x = ox + r.x * PX, a = Math.max(0, 1 - r.age / 3.2); for (let k = 0; k < 2; k++) { const rr = (r.age * 26 + k * 9) * r.big; c.strokeStyle = `rgba(200,215,255,${a * (k ? .25 : .55)})`; c.lineWidth = 1.4; c.beginPath(); c.ellipse(x, wl + 2, rr, rr * .22, 0, 0, Math.PI * 2); c.stroke(); } }
    c.fillStyle = "rgba(220,230,255,.8)"; for (const s of splash) c.fillRect(ox + s.x * PX - 1, wl - s.y * PX - 1, 2.2, 2.2);
    // 돌
    if (fly && st === "fly") { const x = ox + fly.x * PX, y = wl - fly.y * PX; c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(x, wl + 3, 6, 1.6, 0, 0, Math.PI * 2); c.fill();
      c.save(); c.translate(x, y); c.rotate(t * 18); c.fillStyle = "#b8b2a6"; c.beginPath(); c.ellipse(0, 0, 6.5, 3.2, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = "#e1dccf"; c.beginPath(); c.ellipse(-1.5, -1, 3, 1.2, 0, 0, Math.PI * 2); c.fill(); c.restore();
      const n = Math.max(0, fly.i); if (n) { c.font = "800 26px system-ui, sans-serif"; c.textAlign = "center"; c.fillStyle = "#f3d9a4"; c.fillText(n + "", W / 2, HH * .3); } }
    // 조준 게이지
    if (st === "ang" || st === "pow") drawGauge(c, t, wl);
  }
  function drawGauge(c, t, wl) {
    const cxp = W / 2, cyp = Math.min(HH - 120, wl + (HH - wl) * .55), R = Math.min(120, W * .3);
    c.save();
    c.fillStyle = "rgba(10,14,36,.72)"; c.beginPath(); c.roundRect ? c.roundRect(cxp - R - 24, cyp - R - 34, (R + 24) * 2, R + 92, 22) : c.rect(cxp - R - 24, cyp - R - 34, (R + 24) * 2, R + 92); c.fill();
    c.font = "700 14px system-ui, sans-serif"; c.textAlign = "center"; c.fillStyle = "#fdf3dc";
    if (st === "ang") {
      c.fillText("① 물에 닿는 각도 · 눌러서 멈추기", cxp, cyp - R - 12);
      const A = a => Math.PI - (a / 60) * Math.PI;   // 0°(오른쪽 수평) ~ 60°
      // 반원 눈금: 0~60°를 반원 위에 펼침, 18~22° 금색
      c.lineWidth = 10; c.strokeStyle = "rgba(255,255,255,.12)"; c.beginPath(); c.arc(cxp, cyp, R, Math.PI, 2 * Math.PI); c.stroke();
      const seg = (a0, a1, col) => { c.strokeStyle = col; c.beginPath(); c.arc(cxp, cyp, R, Math.PI + (a0 / 60) * Math.PI, Math.PI + (a1 / 60) * Math.PI); c.stroke(); };
      seg(14, 26, "rgba(140,230,160,.45)"); seg(18, 22, "#f3d9a4");
      const a = 4 + tri(t - aimT0, ANG_P) * 52, th = Math.PI + (a / 60) * Math.PI;
      c.strokeStyle = "#fff"; c.lineWidth = 3; c.beginPath(); c.moveTo(cxp, cyp); c.lineTo(cxp + Math.cos(th) * (R + 8), cyp + Math.sin(th) * (R + 8)); c.stroke();
      c.font = "800 22px system-ui, sans-serif"; c.fillText(Math.round(a) + "°", cxp, cyp + 30);
      c.font = "12px system-ui, sans-serif"; c.fillStyle = "#c8c0dc"; c.fillText("금색 20° 근처가 제일 잘 튀어요", cxp, cyp + 50);
    } else {
      c.fillText("② 힘 · 눌러서 던지기", cxp, cyp - R - 12);
      const bw = R * 2, bh = 16, x0 = cxp - R, y0 = cyp - R / 2;
      c.fillStyle = "rgba(255,255,255,.12)"; c.fillRect(x0, y0, bw, bh);
      const p = .15 + tri(t - aimT0, POW_P) * .85; gr2(c, x0, y0, bw * p, bh);
      c.font = "800 22px system-ui, sans-serif"; c.fillStyle = "#fdf3dc"; c.fillText(Math.round(p * 100) + "%", cxp, cyp + 4);
      c.font = "12px system-ui, sans-serif"; c.fillStyle = "#c8c0dc"; c.fillText(`각도 ${Math.round(inc)}° · 셀수록 멀리`, cxp, cyp + 26);
    }
    c.restore();
  }
  function gr2(c, x, y, w, h) { const gg = c.createLinearGradient(x, 0, x + w, 0); gg.addColorStop(0, "#7fc8ff"); gg.addColorStop(1, "#f3d9a4"); c.fillStyle = gg; c.fillRect(x, y, w, h); }

  H.init = o => { opt = o; build(); };
  H.open = open;
  H.onMsg = m => {
    if (m.t === "skipTop") { top = m.top || []; if (on) info(); if (m.king && opt && m.king.nick !== opt.nick()) opt.toast(`🪨 ${m.king.nick}님이 물수제비 ${m.king.n}번으로 오늘 1위!`, 3000); }
  };
})();
