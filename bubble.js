// 🫧 비눗방울(01·02 공통): '후~' 누르면 내 자리에서 비눗방울이 올라가고, 같은 방 사람들 화면에도 보인다. 방울을 누르면 톡 터짐.
// 한강 공원에서 흔히 하는 놀이를 그대로. 서버: bub{} → bub{id,s}(1.2초에 1번). 01은 opt.origin(id)로 캐릭터 머리 위에서, 02는 화면 아래쪽에서 나온다.
(() => {
  const H = window.HNBubble = {}; let opt = {}, cv = null, g = null, list = [], btn = null, on = false, last = 0, popped = 0;
  function rnd(seed) { let s = seed >>> 0 || 7; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  function build() {
    cv = document.createElement("canvas"); cv.id = "bbCv"; cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:4"; document.body.appendChild(cv); g = cv.getContext("2d");
    const st = document.createElement("style"); st.textContent = `
    #bbBtn { all: unset; position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(max(14px, env(safe-area-inset-bottom)) + 92px); z-index: 7; display: none; align-items: center; gap: 8px; cursor: pointer; padding: 10px 18px; border-radius: 999px; background: rgba(20,30,60,.82); color: #eaf6ff; border: 1px solid rgba(170,220,255,.5); font: 800 15px system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif; box-shadow: 0 6px 20px rgba(0,0,0,.35); -webkit-tap-highlight-color: transparent; }
    #bbBtn.on { display: flex; } #bbBtn:active { transform: translateX(-50%) scale(.95); } #bbBtn small { font-weight: 600; font-size: 12px; color: #a9cfee; } #bbBtn i { font-style: normal; margin-left: 6px; padding-left: 10px; border-left: 1px solid rgba(255,255,255,.2); font-size: 13px; color: #c9def5; }`;
    document.head.appendChild(st);
    btn = document.createElement("button"); btn.id = "bbBtn"; btn.className = "hn-calmable"; btn.innerHTML = `🫧 후~ <small>불기</small><i data-x="1">그만</i>`;
    btn.onclick = e => { if (e.target.dataset.x) return stop(); blow(); }; document.body.appendChild(btn);
    const rs = () => { const d = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d; g.setTransform(d, 0, 0, d, 0, 0); }; rs(); addEventListener("resize", rs);
    document.addEventListener("pointerdown", e => { for (let i = list.length - 1; i >= 0; i--) { const b = list[i]; if (!b.pop && Math.hypot(e.clientX - b.x, e.clientY - b.y) < b.r + 6) { b.pop = 1; popped++; break; } } }, true);
    requestAnimationFrame(loop);
  }
  function spawn(id, seed) {
    const r = rnd(seed), o = (opt.origin && opt.origin(id)) || { x: innerWidth * (.3 + r() * .4), y: innerHeight * .78 }, n = 7 + Math.floor(r() * 6);
    for (let i = 0; i < n; i++) list.push({ x: o.x + (r() - .5) * 10, y: o.y - r() * 6, vx: (r() - .3) * 38, vy: -(22 + r() * 40), r: 4 + r() * 10, ph: r() * 6, life: 0, max: 5 + r() * 5, pop: 0, h: r() * 360, d: i * .08 });
    if (list.length > 220) list.splice(0, list.length - 220);
  }
  let prev = 0;
  function loop(ts) {
    const dt = Math.min(.05, (ts - prev) / 1000 || 0); prev = ts; g.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i]; if (b.d > 0) { b.d -= dt; continue; } b.life += dt;
      if (b.pop) { b.pop += dt * 6; if (b.pop > 2) { list.splice(i, 1); continue; }
        g.strokeStyle = `rgba(220,240,255,${.8 * (2 - b.pop) / 2})`; g.lineWidth = 1.2; for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283, r0 = b.r * (.6 + b.pop * .5); g.beginPath(); g.moveTo(b.x + Math.cos(a) * r0, b.y + Math.sin(a) * r0); g.lineTo(b.x + Math.cos(a) * (r0 + 4), b.y + Math.sin(a) * (r0 + 4)); g.stroke(); } continue; }
      if (b.life > b.max || b.y < -30) { b.pop = 1; continue; }
      b.vx += Math.sin(b.life * 1.3 + b.ph) * 6 * dt + 4 * dt; b.vy *= .995; b.x += b.vx * dt; b.y += b.vy * dt;
      const a = Math.min(1, b.life * 3) * Math.min(1, (b.max - b.life) * 1.5);
      const gr = g.createRadialGradient(b.x - b.r * .35, b.y - b.r * .35, b.r * .1, b.x, b.y, b.r);
      gr.addColorStop(0, `rgba(255,255,255,${.06 * a})`); gr.addColorStop(.75, `hsla(${b.h + b.life * 60},90%,75%,${.14 * a})`); gr.addColorStop(1, `hsla(${b.h + 120 + b.life * 60},90%,80%,${.5 * a})`);
      g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 6.283); g.fill();
      g.strokeStyle = `rgba(255,255,255,${.35 * a})`; g.lineWidth = .8; g.stroke();
      g.fillStyle = `rgba(255,255,255,${.75 * a})`; g.beginPath(); g.ellipse(b.x - b.r * .4, b.y - b.r * .45, b.r * .22, b.r * .12, -.6, 0, 6.283); g.fill();
    }
    requestAnimationFrame(loop);
  }
  function blow() { const now = Date.now(); if (now - last < 1200) return; last = now; const s = Math.floor(Math.random() * 1e9); spawn(opt.me ? opt.me() : null, s); opt.send && opt.send({ t: "bub", s }); }
  function start() { on = true; btn.classList.add("on"); opt.closeOthers && opt.closeOthers(); blow(); opt.toast && opt.toast("🫧 '후~'를 누르면 방울이 올라가요. 같은 방 사람들에게도 보여요 · 방울을 누르면 톡!", 3500); }
  function stop() { on = false; btn.classList.remove("on"); if (popped) opt.toast && opt.toast(`🫧 오늘 방울 ${popped}개를 터뜨렸어요`, 2500); }
  H.init = o => { opt = o; build(); };
  H.open = () => on ? stop() : start(); H.stop = stop;
  H.onMsg = m => { if (m.t === "bub" && (!opt.me || m.id !== opt.me())) spawn(m.id, m.s); };
})();
