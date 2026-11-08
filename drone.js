// 🛸 오늘의 한강 게이지와 드론쇼 — 01(index.html)과 02(3d.html)가 같이 쓰는 파일.
// 낚시·물수제비·폭죽·짠·나무·같이 집중·5분 머무르기·응원이 01·02 합쳐 한 게이지에 쌓이고, 다 차면 모두의 하늘에 드론 수백 대가 모양을 만든다.
// (Twitch Plays Pokémon처럼 서로 모르는 사람들이 한 목표를 같이 미는 구조). 서버 메시지: gauge{p,g,r,n,show}, drone{at,n,r,s}
(function () {
  const H = window.HNDrone = {};
  let opt = null, G = { p: 0, g: 150, r: 1, n: 0 }, show = null, cv = null, cx = null, raf = 0, W = 0, HH = 0, DPR = 1, spr = null, lastP = 0;
  const $ = id => document.getElementById(id);
  const css = `
  #drChip { all: unset; position: fixed; right: 12px; z-index: 6; cursor: pointer; display: flex; flex-direction: column; gap: 4px; padding: 6px 10px 7px; border-radius: 14px; min-width: 92px; font: 700 12px/1.1 system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif; color: #e8f1ff; background: rgba(16,22,52,.72); border: 1px solid rgba(150,190,255,.35); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
  #drChip .bar { height: 4px; border-radius: 2px; background: rgba(255,255,255,.14); overflow: hidden; } #drChip .bar i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #7fc8ff, #e9b8ff); transition: width .6s; }
  #drChip.pulse { animation: drPulse .9s ease-out; } @keyframes drPulse { 0% { box-shadow: 0 0 0 rgba(150,190,255,.0); } 40% { box-shadow: 0 0 18px rgba(150,190,255,.7); } 100% { box-shadow: 0 0 0 rgba(150,190,255,0); } }
  #drChip.live { background: rgba(60,40,110,.85); border-color: #e9b8ff; }
  #drBox { position: fixed; left: 50%; top: 44%; transform: translate(-50%, -50%); width: min(330px, calc(100vw - 32px)); z-index: 8; display: none; flex-direction: column; gap: 10px; padding: 18px 16px 14px; border-radius: 22px; background: #121a40; color: #eef2ff; border: 1px solid rgba(150,190,255,.3); box-shadow: 0 14px 44px rgba(0,0,0,.5); font: 14px/1.5 system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; }
  #drBox.on { display: flex; } #drBox h3 { margin: 0; font-size: 17px; } #drBox .big { font-size: 13px; color: #c5d3ff; } #drBox .big b { color: #fff; font-size: 20px; }
  #drBox .bar { height: 8px; border-radius: 4px; background: rgba(255,255,255,.12); overflow: hidden; } #drBox .bar i { display: block; height: 100%; background: linear-gradient(90deg, #7fc8ff, #e9b8ff); }
  #drBox ul { margin: 0; padding: 10px 12px; list-style: none; border-radius: 14px; background: rgba(255,255,255,.05); display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; font-size: 13px; color: #d6defa; } #drBox li span { color: #ffd38a; font-weight: 700; }
  #drBox small { color: #9fb0dc; font-size: 12px; } #drBox .row { display: flex; gap: 8px; }
  #drBox button { all: unset; cursor: pointer; flex: 1; padding: 10px 6px; border-radius: 999px; text-align: center; font-weight: 700; font-size: 14px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.18); color: #eef2ff; }
  #drBox button.adm { background: #f5c84c; color: #3a2a12; border-color: transparent; }
  #drCv { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 5; pointer-events: none; display: none; } #drCv.on { display: block; }`;

  function build() {
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    const chip = document.createElement("button"); chip.id = "drChip"; chip.setAttribute("aria-label", "오늘의 한강 게이지"); chip.style.top = `calc(max(12px, env(safe-area-inset-top)) + ${opt.chipTop || 96}px)`;
    chip.onclick = () => openBox(); document.body.appendChild(chip);
    const box = document.createElement("div"); box.id = "drBox"; box.setAttribute("role", "dialog"); document.body.appendChild(box);
    box.addEventListener("click", e => { const b = e.target.closest("[data-do]"); if (!b) return; if (b.dataset.do === "x") box.classList.remove("on"); if (b.dataset.do === "now") { opt.send({ t: "droneNow" }); box.classList.remove("on"); } });
    cv = document.createElement("canvas"); cv.id = "drCv"; document.body.appendChild(cv); cx = cv.getContext("2d");
    const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d"), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.22, "rgba(255,255,255,.85)"); gr.addColorStop(.5, "rgba(255,255,255,.18)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); spr = c;
    chipUpdate();
  }
  function chipUpdate() {
    const c = $("drChip"); if (!c) return;
    const live = show && Date.now() < show.end, pct = Math.min(100, Math.round(G.p / Math.max(1, G.g) * 100));
    c.classList.toggle("live", !!live);
    c.innerHTML = live ? `🛸 드론쇼 중` : `<span>🛸 드론쇼 ${pct}%</span><div class="bar"><i style="width:${pct}%"></i></div>`;
    if (G.p > lastP && lastP) { c.classList.remove("pulse"); void c.offsetWidth; c.classList.add("pulse"); }
    lastP = G.p;
    const b = $("drBox"); if (b && b.classList.contains("on")) openBox(true);
  }
  function openBox(keep) {
    if (!keep && opt.closeOthers) opt.closeOthers();
    const pct = Math.min(100, Math.round(G.p / Math.max(1, G.g) * 100)), b = $("drBox");
    b.innerHTML = `<h3>🛸 오늘의 한강 게이지 <small>${G.r}번째 판</small></h3>
      <div class="big"><b>${pct}%</b> · ${G.p} / ${G.g} · 이번 판에 <b style="font-size:15px">${G.n}명</b>이 함께 채우는 중</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <small>다 차면 01·3D 모든 사람의 하늘에 드론 수백 대가 떠서 모양을 만들어요. 아래 행동이 01·3D 합쳐 한 게이지에 쌓여요.</small>
      <ul><li>🎣 낚시 <span>+2</span></li><li>🪨 물수제비 <span>+1</span></li><li>🎆 폭죽 <span>+1</span></li><li>🥂 짠 <span>+2</span></li><li>🌱 같이 집중 시작 <span>+2</span></li><li>🌳 나무 심기 <span>+10</span></li><li>⏱ 5분 머무르기 <span>+1</span></li><li>💛 응원 <span>+15</span></li></ul>
      <small>한 사람이 한 판에 넣을 수 있는 건 40점까지예요(응원 제외). 같이 있는 사람이 많을수록 목표도 커져요.</small>
      <div class="row">${opt.isAdmin && opt.isAdmin() ? `<button class="adm" data-do="now">👑 바로 시험</button>` : ""}<button data-do="x">닫기</button></div>`;
    b.classList.add("on");
  }

  // ---------- 드론쇼 ----------
  const rngOf = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
  function sample(kind, txt, n, r) {
    const S = kind === "e" ? 72 : 0, c = document.createElement("canvas"), g = c.getContext("2d");
    if (kind === "e") { c.width = c.height = S; g.font = `${S * .82}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, S / 2, S / 2 + 3); }
    else { c.width = 200; c.height = 56; g.font = `800 40px system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff"; let fs = 40; while (g.measureText(txt).width > 192 && fs > 14) { fs -= 2; g.font = `800 ${fs}px system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`; } g.fillText(txt, 100, 30); }
    const d = g.getImageData(0, 0, c.width, c.height).data, pts = [];
    for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) { const i = (y * c.width + x) * 4; if (d[i + 3] > 140) pts.push({ x: x / c.width - .5, y: (y / c.height - .5) * c.height / c.width, c: kind === "e" ? [d[i], d[i + 1], d[i + 2]] : null }); }
    if (!pts.length) for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push({ x: Math.cos(a) * .35, y: Math.sin(a) * .35, c: null }); }
    const out = []; for (let i = 0; i < n; i++) out.push(pts[Math.floor(r() * pts.length)]);
    return out;
  }
  function startShow(m) {
    const r = rngOf((m.s % 2147483646) + 1), N = Math.min(320, Math.max(160, Math.round(innerWidth * innerHeight / 2600)));
    const forms = [
      { k: "e", t: "🌙", col: [255, 230, 150], ms: 7000 },
      { k: "e", t: "🐋", col: null, ms: 8000 },
      { k: "t", t: "밤 한강", col: [150, 210, 255], ms: 7000 },
      { k: "e", t: "❤️", col: null, ms: 7000 },
      { k: "t", t: `${m.n}명이 함께`, col: [255, 214, 140], ms: 8000 },
      { k: "t", t: "고마워요", col: [233, 184, 255], ms: 8000 },
    ].map(f => ({ ...f, pts: sample(f.k, f.t, N, r) }));
    const ds = Array.from({ length: N }, (_, i) => ({ x: r(), y: .62 + r() * .06, tx: r(), ty: .6, c: [255, 255, 255], tc: [255, 255, 255], ph: r() * 6, sp: .9 + r() * .5 }));
    show = { at: m.at, end: m.at + forms.reduce((a, f) => a + f.ms, 0) + 5000, forms, ds, N, k: -1, n: m.n, test: m.test };
    const wait = m.at - Date.now();
    opt.toast(m.test ? "👑 드론쇼 시험 · 하늘을 보세요" : `🛸 게이지가 다 찼어요! ${Math.max(1, Math.round(wait / 1000))}초 뒤 하늘에 드론쇼`, 3500);
    size(); cv.classList.add("on"); chipUpdate();
    cancelAnimationFrame(raf); const loop = () => { if (!show) return; frame(); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop);
  }
  function size() { DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; HH = innerHeight; cv.width = W * DPR; cv.height = HH * DPR; }
  function frame() {
    const now = Date.now(), s = show; if (!s) return;
    const dt = Math.min(.5, (now - (s.last || now)) / 1000); s.last = now;
    if (W !== innerWidth || HH !== innerHeight) size();
    cx.setTransform(DPR, 0, 0, DPR, 0, 0); cx.clearRect(0, 0, W, HH);
    if (now > s.end) { show = null; cv.classList.remove("on"); chipUpdate(); return; }
    // 지금 몇 번째 모양인지
    let k = -1, acc = s.at; for (let i = 0; i < s.forms.length; i++) { if (now >= acc) k = i; acc += s.forms[i].ms; }
    const ending = now >= acc;
    const land = W > HH, size2 = Math.min(W * .86, HH * (land ? .8 : .5)), cxp = W / 2, cyp = HH * (land ? .3 : .25);
    if (k !== s.k || (ending && s.k !== 99)) {
      s.k = ending ? 99 : k;
      s.ds.forEach((d, i) => {
        if (ending || k < 0) { d.tx = (i / s.N); d.ty = .64; d.tc = [255, 255, 255]; return; }
        const f = s.forms[k], p = f.pts[i]; d.tx = (cxp + p.x * size2) / W; d.ty = (cyp + p.y * size2) / HH;
        d.tc = p.c ? [Math.max(80, p.c[0]), Math.max(80, p.c[1]), Math.max(80, p.c[2])] : f.col || [255, 255, 255];
      });
    }
    const t = now / 1000, a0 = now < s.at ? Math.min(1, (now - (s.at - 6000)) / 2000) : ending ? Math.max(0, 1 - (now - acc) / 4000) : 1;
    cx.globalCompositeOperation = "lighter";
    for (const d of s.ds) {
      const e = 1 - Math.exp(-dt * 2.1 * d.sp * (now < s.at ? .4 : 1)); d.x += (d.tx - d.x) * e; d.y += (d.ty - d.y) * e;
      for (let j = 0; j < 3; j++) d.c[j] += (d.tc[j] - d.c[j]) * Math.min(1, dt * 3);
      const x = d.x * W + Math.sin(t * 1.3 + d.ph) * 1.2, y = d.y * HH + Math.cos(t * 1.1 + d.ph) * 1.2, tw = .75 + .25 * Math.sin(t * 3 + d.ph), z = 7.5;
      cx.globalAlpha = a0 * tw * .95;
      cx.fillStyle = `rgb(${d.c[0] | 0},${d.c[1] | 0},${d.c[2] | 0})`;
      cx.beginPath(); cx.arc(x, y, 1.5, 0, Math.PI * 2); cx.fill();
      cx.globalAlpha = a0 * tw * .55; cx.filter = "none";
      cx.drawImage(tint(d.c), x - z, y - z, z * 2, z * 2);
    }
    cx.globalAlpha = 1; cx.globalCompositeOperation = "source-over";
  }
  // 색마다 빛 번짐 그림을 만들어 둔다(16단계로 묶어 캐시)
  const tintCache = new Map();
  function tint(c) {
    const q = c.map(v => Math.round(v / 32) * 32), key = q.join(",");
    let t = tintCache.get(key); if (t) return t;
    t = document.createElement("canvas"); t.width = t.height = 32; const g = t.getContext("2d"); g.drawImage(spr, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = `rgb(${q[0]},${q[1]},${q[2]})`; g.fillRect(0, 0, 32, 32);
    tintCache.set(key, t); return t;
  }

  H.init = o => { opt = o; build(); };
  H.onMsg = m => {
    if (m.t === "gauge") { G = { p: m.p, g: m.g, r: m.r, n: m.n || 0 }; chipUpdate(); }
    else if (m.t === "drone") startShow(m);
  };
  H.active = () => !!show;
})();
