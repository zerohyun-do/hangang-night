// ⛺ 79차 내 자리 꾸미기 — 그늘막·파라솔·원터치 텐트 + 🏮 랜턴 · ✨ 줄전구. 01(index.html)과 02(3d.html)가 같이 쓰는 파일.
// 쉬러 온 사람에게 거슬리지 않게: 소리·알림 없음, 내가 직접 열 때만 창이 뜬다. 다른 사람 것은 기본으로 흐리게(투명) 보이고, 끌 수도 있다.
// 서버: tent{k}(보냄) / tent{id,k}(같은 방에 받음), 사람 정보 pub.tn. k = 모양(0~3) + 8(랜턴) + 16(줄전구). 폰 기록 hn-tent, 흐리게 hn-tent-dim
(function () {
  const H = window.HNTent = {};
  const SHADES = [["none", "🧺", "그대로", "돗자리만"], ["parasol", "⛱", "파라솔", "머리 위 작은 그늘"], ["tarp", "🏕", "그늘막", "네 기둥 타프, 줄무늬 천"], ["dome", "⛺", "원터치 텐트", "뒤쪽에 작은 텐트"]];
  const TAU = Math.PI * 2;
  let opt = { send() {}, set() {}, mine: () => null };
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
  const $ = id => document.getElementById(id);
  let K = +(ls("hn-tent") || 0) || 0;
  H.dim = ls("hn-tent-dim") !== "0";   // 다른 사람 것 흐리게(기본 켬)
  H.hideOthers = ls("hn-tent-hide") === "1";
  H.kind = k => (k || 0) & 7; H.lantern = k => !!((k || 0) & 8); H.lights = k => !!((k || 0) & 16);
  H.mine = () => K;
  // 다른 사람 것을 얼마나 진하게 그릴지(0이면 안 그림)
  H.alpha = mine => mine ? 1 : H.hideOthers ? 0 : H.dim ? .42 : .85;

  const css = `
  #tnWrap { position: fixed; left: 50%; bottom: calc(max(14px, env(safe-area-inset-bottom)) + 76px); transform: translateX(-50%); z-index: 9; width: min(360px, calc(100vw - 24px)); display: none;
    padding: 14px 14px 12px; border-radius: 22px; background: rgba(16,20,46,.94); border: 1px solid rgba(255,255,255,.14); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); box-shadow: 0 12px 36px rgba(0,0,0,.45);
    color: #efe7d6; font: 13.5px/1.45 -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; user-select: none; -webkit-user-select: none; }
  #tnWrap.on { display: block; } #tnWrap button { all: unset; cursor: pointer; box-sizing: border-box; }
  #tnWrap h3 { margin: 0 0 2px; font-size: 15.5px; color: #fff3dc; } #tnWrap .sub { font-size: 12px; color: #b9b0cc; margin-bottom: 10px; }
  #tnWrap .x { position: absolute; right: 10px; top: 8px; padding: 6px 10px; font-size: 17px; color: #bbb3cc; }
  #tnWrap .gr { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  #tnWrap .op { padding: 9px 4px 8px; border-radius: 14px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08); text-align: center; display: grid; gap: 3px; }
  #tnWrap .op i { font-style: normal; font-size: 24px; line-height: 1; } #tnWrap .op b { font-size: 12px; font-weight: 600; } #tnWrap .op small { font-size: 10px; color: #a9a1bd; line-height: 1.25; }
  #tnWrap .op.sel { background: rgba(243,217,164,.18); border-color: rgba(243,217,164,.55); }
  #tnWrap .row { display: flex; gap: 6px; margin-top: 8px; } #tnWrap .row .op { flex: 1; grid-template-columns: auto 1fr; text-align: left; align-items: center; padding: 9px 10px; }
  #tnWrap .row .op i { font-size: 20px; grid-row: span 2; }
  #tnWrap .opt { margin-top: 10px; padding-top: 9px; border-top: 1px solid rgba(255,255,255,.08); display: flex; gap: 8px; align-items: center; font-size: 12px; color: #cfc6e0; }
  #tnWrap .opt button { padding: 6px 10px; border-radius: 999px; background: rgba(255,255,255,.08); font-size: 12px; color: #e9e2f3; } #tnWrap .opt button.sel { background: rgba(243,217,164,.2); color: #ffe2a8; }`;
  function build() {
    if ($("tnWrap")) return;
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    const w = document.createElement("div"); w.id = "tnWrap"; w.setAttribute("role", "dialog"); w.setAttribute("aria-label", "내 자리 꾸미기"); document.body.appendChild(w);
    w.addEventListener("pointerdown", e => e.stopPropagation());
    w.addEventListener("click", e => { const b = e.target.closest("[data-do]"); if (!b) return; act(b.dataset.do, b.dataset.v); });
    document.addEventListener("pointerdown", e => { const el = $("tnWrap"); if (el && el.classList.contains("on") && !el.contains(e.target)) H.close(); }, true);
  }
  function render() {
    const k = H.kind(K);
    $("tnWrap").innerHTML = `<button class="x" data-do="close" aria-label="닫기">✕</button><h3>⛺ 내 자리 꾸미기</h3><div class="sub">앉아 있는 동안 내 자리에만 펼쳐져요. 소리·알림은 없어요.</div>
      <div class="gr">${SHADES.map(([id, ic, n, d], i) => `<button class="op ${k === i ? "sel" : ""}" data-do="kind" data-v="${i}"><i>${ic}</i><b>${n}</b><small>${d}</small></button>`).join("")}</div>
      <div class="row"><button class="op ${H.lantern(K) ? "sel" : ""}" data-do="bit" data-v="8"><i>🏮</i><b>랜턴</b><small>발밑에 따뜻한 불빛</small></button><button class="op ${H.lights(K) ? "sel" : ""}" data-do="bit" data-v="16"><i>✨</i><b>줄전구</b><small>작은 전구가 반짝</small></button></div>
      <div class="opt">다른 사람 것 <button class="${!H.hideOthers && H.dim ? "sel" : ""}" data-do="vis" data-v="dim">흐리게</button><button class="${!H.hideOthers && !H.dim ? "sel" : ""}" data-do="vis" data-v="full">또렷하게</button><button class="${H.hideOthers ? "sel" : ""}" data-do="vis" data-v="hide">안 보기</button></div>`;
  }
  function save() { ls("hn-tent", String(K)); opt.send({ t: "tent", k: K }); const me = opt.mine(); if (me != null) opt.set(me, K); }
  function act(d, v) {
    if (d === "close") return H.close();
    if (d === "kind") { K = (K & ~7) | (+v); save(); }
    else if (d === "bit") { K ^= +v; save(); }
    else if (d === "vis") { H.hideOthers = v === "hide"; H.dim = v === "dim"; ls("hn-tent-hide", H.hideOthers ? "1" : "0"); ls("hn-tent-dim", H.dim ? "1" : "0"); if (opt.refresh) opt.refresh(); }
    render();
  }
  H.open = () => { build(); render(); $("tnWrap").classList.add("on"); if (window.HNMenu && HNMenu.close) HNMenu.close(); };
  H.close = () => { const w = $("tnWrap"); if (w) w.classList.remove("on"); };
  H.isOpen = () => { const w = $("tnWrap"); return !!(w && w.classList.contains("on")); };
  H.init = o => { Object.assign(opt, o); };
  H.onMsg = m => {
    if (m.t === "init") { if (K) opt.send({ t: "tent", k: K }); }   // 다시 접속하면 내 꾸밈을 다시 알린다
    else if (m.t === "tent") opt.set(m.id, m.k);
  };

  // ---------- 01: 2D 캔버스 그림(사람보다 먼저 그린다 = 사람이 그늘 아래 앉은 모습) ----------
  // x, y = 앉은 자리(엉덩이 높이), s = 크기, col = 내 옷 색(파라솔 천)
  H.draw2d = (cx, x, y, s, t, k, col, mine) => {
    const a = H.alpha(mine); if (!a || !k) return;
    const kind = H.kind(k), ph = (x * .013) % TAU;
    cx.save(); cx.globalAlpha = a; cx.lineCap = "round";
    const pole = (x0, y0, x1, y1) => { cx.strokeStyle = "#4a4d57"; cx.lineWidth = Math.max(1, 1.3 * s); cx.beginPath(); cx.moveTo(x0, y0); cx.lineTo(x1, y1); cx.stroke(); };
    let bulbs = null;
    if (kind === 3) {                                                            // ⛺ 원터치 텐트: 등 뒤(강 쪽)에 낮게
      const tx = x + 3 * s, ty = y - 4 * s, w = 25 * s, h = 24 * s;
      cx.fillStyle = "rgba(0,0,0,.2)"; cx.beginPath(); cx.ellipse(tx, ty + 1 * s, w * 1.05, 4 * s, 0, 0, TAU); cx.fill();
      const g = cx.createLinearGradient(tx - w, ty - h, tx + w, ty); g.addColorStop(0, "#5f7fb0"); g.addColorStop(1, "#2f4468");
      cx.fillStyle = g; cx.beginPath(); cx.moveTo(tx - w, ty); cx.quadraticCurveTo(tx - w * .95, ty - h * 1.05, tx, ty - h); cx.quadraticCurveTo(tx + w * .95, ty - h * 1.05, tx + w, ty); cx.closePath(); cx.fill();
      cx.strokeStyle = "rgba(255,255,255,.22)"; cx.lineWidth = Math.max(.7, .8 * s); cx.beginPath(); cx.moveTo(tx - w * .5, ty); cx.quadraticCurveTo(tx - w * .4, ty - h * .9, tx, ty - h); cx.moveTo(tx + w * .5, ty); cx.quadraticCurveTo(tx + w * .4, ty - h * .9, tx, ty - h); cx.stroke();
      cx.fillStyle = "rgba(255,214,150,.18)"; cx.beginPath(); cx.moveTo(tx - 7 * s, ty); cx.quadraticCurveTo(tx, ty - h * .8, tx + 7 * s, ty); cx.fill();   // 안쪽 불빛이 비치는 문
      bulbs = [[tx - w * .9, ty - h * .35], [tx - w * .45, ty - h * .88], [tx, ty - h], [tx + w * .45, ty - h * .88], [tx + w * .9, ty - h * .35]];
    } else if (kind === 2) {                                                     // 🏕 그늘막(타프): 기둥 2개 + 줄무늬 천, 앞이 조금 낮다
      const L = x - 19 * s, Rr = x + 19 * s, top = y - 47 * s, front = y - 41 * s;
      pole(L, y + 2 * s, L, front); pole(Rr, y + 2 * s, Rr, front);
      cx.strokeStyle = "rgba(220,220,230,.25)"; cx.lineWidth = .6 * s; cx.beginPath(); cx.moveTo(L, front); cx.lineTo(L - 7 * s, y + 3 * s); cx.moveTo(Rr, front); cx.lineTo(Rr + 7 * s, y + 3 * s); cx.stroke();
      cx.beginPath(); cx.moveTo(L - 3 * s, front); cx.lineTo(Rr + 3 * s, front); cx.lineTo(Rr + 1 * s, top); cx.lineTo(L - 1 * s, top); cx.closePath();
      cx.save(); cx.clip(); const n = 7, sw = (Rr - L + 6 * s) / n;
      for (let i = 0; i < n; i++) { cx.fillStyle = i % 2 ? "#e9e2d0" : "#3f7a6d"; cx.fillRect(L - 3 * s + i * sw, top - 2 * s, sw + .5, front - top + 4 * s); }
      cx.fillStyle = "rgba(0,0,0,.18)"; cx.fillRect(L - 3 * s, front - 1.6 * s, Rr - L + 6 * s, 1.6 * s); cx.restore();
      for (let i = 0; i < 8; i++) { const u = i / 7, bx = L - 3 * s + u * (Rr - L + 6 * s), wv = Math.sin(t * 1.4 + i + ph) * .5 * s; cx.fillStyle = i % 2 ? "#e9e2d0" : "#3f7a6d"; cx.beginPath(); cx.moveTo(bx - 2.5 * s, front); cx.lineTo(bx + 2.5 * s, front); cx.lineTo(bx, front + 2.6 * s + wv); cx.fill(); }   // 천 끝 깃
      bulbs = []; for (let i = 0; i <= 6; i++) { const u = i / 6; bulbs.push([L + u * (Rr - L), front + 3.5 * s + Math.sin(u * Math.PI) * 2.5 * s]); }
    } else if (kind === 1) {                                                     // ⛱ 파라솔: 조금 기울어진 우산
      const px = x + 12 * s, top = y - 50 * s, cxp = x + 7 * s;
      pole(px, y + 3 * s, cxp, top);
      const R = 23 * s, lean = .12, g = cx.createLinearGradient(cxp - R, top, cxp + R, top); g.addColorStop(0, col || "#d26b5a"); g.addColorStop(1, "#f3ead8");
      cx.save(); cx.translate(cxp, top); cx.rotate(-lean);
      cx.fillStyle = g; cx.beginPath(); cx.moveTo(-R, 3 * s); cx.quadraticCurveTo(0, -12 * s, R, 3 * s); for (let i = 6; i >= 0; i--) { const u = -R + i * R / 3; cx.quadraticCurveTo(u + R / 6, 5.5 * s, u, 3 * s); } cx.closePath(); cx.fill();
      cx.strokeStyle = "rgba(0,0,0,.18)"; cx.lineWidth = .7 * s; cx.beginPath(); for (let i = 1; i < 6; i++) { const u = -R + i * R / 3; cx.moveTo(0, -6 * s); cx.lineTo(u, 3.5 * s); } cx.stroke();
      cx.fillStyle = "#e9e2d0"; cx.beginPath(); cx.arc(0, -7 * s, 1.4 * s, 0, TAU); cx.fill(); cx.restore();
      bulbs = []; for (let i = 0; i <= 6; i++) { const u = -R + i * R / 3, rx = cxp + u * Math.cos(-lean) - 5 * s * Math.sin(-lean), ry = top + u * Math.sin(-lean) + 5 * s * Math.cos(-lean); bulbs.push([rx, ry]); }
    }
    if (H.lights(k)) {                                                           // ✨ 줄전구(모양이 없으면 짧은 기둥 둘 사이)
      if (!bulbs) { const L = x - 17 * s, Rr = x + 17 * s, yy = y - 36 * s; pole(L, y + 2 * s, L, yy); pole(Rr, y + 2 * s, Rr, yy); bulbs = []; for (let i = 0; i <= 6; i++) { const u = i / 6; bulbs.push([L + u * (Rr - L), yy + Math.sin(u * Math.PI) * 4 * s]); } }
      cx.strokeStyle = "rgba(40,40,46,.7)"; cx.lineWidth = .5 * s; cx.beginPath(); bulbs.forEach(([bx, by], i) => i ? cx.lineTo(bx, by) : cx.moveTo(bx, by)); cx.stroke();
      cx.globalCompositeOperation = "lighter";
      bulbs.forEach(([bx, by], i) => { const tw = .55 + .45 * Math.sin(t * 1.6 + i * 1.7 + ph); const c2 = ["255,200,120", "255,170,190", "190,220,255", "255,230,150"][i % 4];
        const g2 = cx.createRadialGradient(bx, by + 1 * s, 0, bx, by + 1 * s, 4.5 * s); g2.addColorStop(0, `rgba(${c2},${.5 * tw})`); g2.addColorStop(1, `rgba(${c2},0)`); cx.fillStyle = g2; cx.fillRect(bx - 5 * s, by - 4 * s, 10 * s, 10 * s);
        cx.fillStyle = `rgba(${c2},${.7 + .3 * tw})`; cx.beginPath(); cx.arc(bx, by + 1 * s, .9 * s, 0, TAU); cx.fill(); });
      cx.globalCompositeOperation = "source-over";
    }
    if (H.lantern(k)) {                                                          // 🏮 랜턴: 자리 왼쪽 앞, 바닥을 따뜻하게
      const lx = x - 14 * s, ly = y + 3 * s, fl = .9 + .1 * Math.sin(t * 7 + ph) * Math.sin(t * 3.1);
      cx.globalCompositeOperation = "lighter";
      const g3 = cx.createRadialGradient(lx, ly - 3 * s, 0, lx, ly - 3 * s, 26 * s); g3.addColorStop(0, `rgba(255,190,110,${.32 * fl})`); g3.addColorStop(1, "rgba(255,190,110,0)"); cx.fillStyle = g3; cx.beginPath(); cx.ellipse(lx, ly - 2 * s, 28 * s, 16 * s, 0, 0, TAU); cx.fill();
      cx.globalCompositeOperation = "source-over";
      cx.fillStyle = "#2b2b31"; cx.fillRect(lx - 2.6 * s, ly - 1.2 * s, 5.2 * s, 1.4 * s); cx.fillRect(lx - 2 * s, ly - 8.5 * s, 4 * s, 1.2 * s);
      cx.fillStyle = `rgba(255,214,140,${.85 * fl})`; cx.fillRect(lx - 1.9 * s, ly - 7.4 * s, 3.8 * s, 6.3 * s);
      cx.strokeStyle = "#2b2b31"; cx.lineWidth = .6 * s; cx.beginPath(); cx.arc(lx, ly - 9 * s, 1.6 * s, Math.PI, TAU); cx.stroke();
    }
    cx.restore();
  };

  // ---------- 02: 3D(three.js) 모형. 사람 몸(root) 기준, 앞(강) = -z ----------
  H.mk3d = (THREE, k, colHex, mine) => {
    const g = new THREE.Group(); if (!k) return g;
    const a = H.alpha(mine), tr = a < 1, M = (c, extra) => new THREE.MeshLambertMaterial(Object.assign({ color: c, transparent: tr, opacity: a, side: THREE.DoubleSide }, extra || {}));
    const pole = (x, z, h) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, h, 6), M(0x4a4d57)); m.position.set(x, h / 2, z); g.add(m); };
    const kind = H.kind(k); let bulbs = null;
    if (kind === 1) {
      pole(.32, .05, 1.35);
      const cv = document.createElement("canvas"); cv.width = 128; cv.height = 16; const x = cv.getContext("2d"); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "#f3ead8" : (colHex || "#d26b5a"); x.fillRect(i * 16, 0, 16, 16); }
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const top = new THREE.Mesh(new THREE.ConeGeometry(.62, .22, 16, 1, true), M(0xffffff, { map: tex })); top.position.set(.28, 1.4, .05); top.rotation.z = .1; g.add(top);
      bulbs = []; for (let i = 0; i < 10; i++) { const an = i / 10 * TAU; bulbs.push([.28 + Math.cos(an) * .6, 1.28, .05 + Math.sin(an) * .6]); }
    } else if (kind === 2) {
      for (const [px, pz, h] of [[-.55, -.4, 1.05], [.55, -.4, 1.05], [-.55, .45, 1.2], [.55, .45, 1.2]]) pole(px, pz, h);
      const cv = document.createElement("canvas"); cv.width = 128; cv.height = 64; const x = cv.getContext("2d"); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "#e9e2d0" : "#3f7a6d"; x.fillRect(i * 16, 0, 16, 64); }
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const geo = new THREE.PlaneGeometry(1.25, 1.0); const cl = new THREE.Mesh(geo, M(0xffffff, { map: tex })); cl.rotation.x = -Math.PI / 2 + .15; cl.position.set(0, 1.13, .03); g.add(cl);
      bulbs = []; for (let i = 0; i <= 8; i++) bulbs.push([-.55 + i * 1.1 / 8, .98 - Math.sin(i / 8 * Math.PI) * .05, -.42]);
    } else if (kind === 3) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(.5, 18, 10, 0, TAU, 0, Math.PI / 2), M(0x4a6a9a)); d.scale.set(1.05, .85, .8); d.position.set(0, 0, .62); g.add(d);
      const door = new THREE.Mesh(new THREE.CircleGeometry(.18, 14, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x8a6a3a, transparent: true, opacity: .55 * a })); door.position.set(0, .0, .22); g.add(door);
      bulbs = []; for (let i = 0; i <= 8; i++) { const an = i / 8 * Math.PI; bulbs.push([Math.cos(an) * .53, Math.sin(an) * .43, .62]); }
    }
    const glowTex = H.glowTex || (H.glowTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.25, "rgba(255,255,255,.45)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })());
    const glow = (x, y, z, col, sz, op) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, opacity: op * a, depthWrite: false, blending: THREE.AdditiveBlending })); s.position.set(x, y, z); s.scale.set(sz, sz, 1); g.add(s); return s; };
    g.userData.tw = [];
    if (H.lights(k)) {
      if (!bulbs) { pole(-.5, -.1, .95); pole(.5, -.1, .95); bulbs = []; for (let i = 0; i <= 8; i++) bulbs.push([-.5 + i / 8, .93 - Math.sin(i / 8 * Math.PI) * .07, -.1]); }
      bulbs.forEach(([x, y, z], i) => g.userData.tw.push(glow(x, y, z, [0xffc878, 0xffaabe, 0xbedcff, 0xffe696][i % 4], .16, .95)));
    }
    if (H.lantern(k)) {
      const lb = new THREE.Mesh(new THREE.BoxGeometry(.09, .13, .09), new THREE.MeshBasicMaterial({ color: 0xffd28c, transparent: tr, opacity: a })); lb.position.set(-.42, .07, -.22); g.add(lb);
      g.userData.lan = glow(-.42, .1, -.22, 0xffbe6e, .9, .55);
    }
    return g;
  };
  H.tick3d = (g, t) => { if (!g || !g.userData.tw) return; g.userData.tw.forEach((s, i) => s.material.opacity = (.55 + .45 * Math.sin(t * 1.6 + i * 1.7)) * (s.userData.a0 || (s.userData.a0 = s.material.opacity))); if (g.userData.lan) g.userData.lan.scale.setScalar(.85 + .08 * Math.sin(t * 7) * Math.sin(t * 3.1)); };
})();
