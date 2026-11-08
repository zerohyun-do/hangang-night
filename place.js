// 🎨 한강 픽셀 전광판(01·02 공통): 32×20 칸을 접속한 모두가 같이 칠한다(Reddit r/place 2022: 1천만 명 넘게 참여).
// 한 사람 12초에 1칸. 판은 01·02가 같이 쓰고 매일 새벽 5시에 새 판. 서버: pxGet·px{x,y,c}·pxClear(운영자) / pxAll·pxS·pxOk·pxWait
(() => {
  const H = window.HNPlace = {}; let opt = {}, P = null, box = null, cv = null, sel = 7, readyAt = 0, tick = null, hover = -1, thumb = null, thumbDirty = true;
  const COL = ["#0b1030", "#ffffff", "#9aa3b8", "#3b4258", "#ff4d5e", "#ff9a3c", "#ffd84d", "#7ee06a", "#2fb36b", "#48d6e0", "#3d8bff", "#7a5cff", "#ff7ac8", "#a8643a", "#ffe7c2", "#000000"];
  const F = `system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const css = `
  #plBox { position: fixed; inset: 0; z-index: 12; display: none; align-items: center; justify-content: center; background: rgba(4,6,20,.7); }
  #plBox.on { display: flex; }
  #plBox .in { width: min(440px, calc(100vw - 16px)); max-height: calc(100vh - 16px); overflow: auto; display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 20px; background: #151a36; color: #eef1ff; border: 1px solid rgba(160,180,255,.3); box-shadow: 0 14px 44px rgba(0,0,0,.55); font: 13.5px/1.4 ${F}; }
  #plBox .hd { display: flex; justify-content: space-between; align-items: center; } #plBox .hd b { color: #ffd98a; font-size: 15px; }
  #plBox canvas { position: static; inset: auto; display: block; height: auto; width: 100%; aspect-ratio: 32 / 20; image-rendering: pixelated; border-radius: 8px; touch-action: manipulation; cursor: crosshair; background: #0b1030; border: 2px solid #2b3361; box-sizing: border-box; }
  #plBox .pal { display: grid; grid-template-columns: repeat(8, 1fr); gap: 5px; }
  #plBox .pal button { all: unset; cursor: pointer; aspect-ratio: 1; border-radius: 7px; border: 2px solid rgba(255,255,255,.18); box-sizing: border-box; }
  #plBox .pal button.on { border-color: #ffd98a; box-shadow: 0 0 0 2px #ffd98a; }
  #plBox .st { display: flex; justify-content: space-between; font-size: 12.5px; color: #c4cbf2; min-height: 18px; }
  #plBox .x { all: unset; cursor: pointer; padding: 3px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,.2); font-size: 12.5px; }
  #plBox .row { display: flex; gap: 8px; } #plBox .row button { all: unset; cursor: pointer; flex: 1; text-align: center; padding: 8px; border-radius: 12px; font-weight: 700; font-size: 13px; background: rgba(255,255,255,.08); }
  #plBox .sup { font-size: 12px; color: #c9cff5; text-align: center; } #plBox .sup a { color: #ffd98a; font-weight: 700; cursor: pointer; text-decoration: underline; }
  @media (orientation: landscape) and (max-height: 520px) { #plBox .in { flex-direction: row; flex-wrap: wrap; width: min(760px, calc(100vw - 16px)); } #plBox canvas { width: auto; height: calc(100vh - 60px); } #plBox .side { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 8px; } }`;
  function build() {
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    box = document.createElement("div"); box.id = "plBox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "한강 픽셀 전광판");
    box.innerHTML = `<div class="in"><canvas id="plCv" width="320" height="200"></canvas><div class="side">
      <div class="hd"><b>🎨 한강 픽셀 전광판</b><button class="x" data-do="close">닫기</button></div>
      <div class="st"><span id="plMsg">색을 고르고 칸을 눌러요 · 12초에 1칸</span><span id="plN"></span></div>
      <div class="pal">${COL.map((c, i) => `<button data-c="${i}" style="background:${c}" aria-label="색 ${i + 1}"></button>`).join("")}</div>
      <div class="st"><span id="plWho">01·02 모두가 같은 판을 칠해요 · 새벽 5시에 새 판</span></div>
      ${opt.isAdmin && opt.isAdmin() ? `<div class="row"><button data-do="clear">👑 판 전체 지우기</button></div>` : ""}
      <div class="sup">다 같이 그린 그림이 마음에 들면 <a data-do="sup">💛 한강 응원하기</a></div></div></div>`;
    box.onclick = e => { if (e.target === box) return close(); const p = e.target.closest("[data-c]"); if (p) { sel = +p.dataset.c; pal(); return; }
      const d = e.target.closest("[data-do]"); if (!d) return; const k = d.dataset.do;
      if (k === "close") close(); else if (k === "sup") { close(); opt.openSup && opt.openSup(); } else if (k === "clear" && confirm("판 전체를 지울까요?")) opt.send({ t: "pxClear" }); };
    document.body.appendChild(box);
    cv = document.getElementById("plCv");
    const cell = e => { const r = cv.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * 32), y = Math.floor((e.clientY - r.top) / r.height * 20); return x >= 0 && x < 32 && y >= 0 && y < 20 ? { x, y } : null; };
    cv.addEventListener("click", e => { const c = cell(e); if (!c || !P) return; const left = readyAt - Date.now();
      if (left > 0) return msg(`⏳ ${Math.ceil(left / 1000)}초 뒤에 또 칠할 수 있어요`);
      opt.send({ t: "px", x: c.x, y: c.y, c: sel }); readyAt = Date.now() + (opt.isAdmin && opt.isAdmin() ? 0 : P.cd); setCell(c.x, c.y, sel, (opt.myNick && opt.myNick()) || ""); });
    cv.addEventListener("mousemove", e => { const c = cell(e); const k = c ? c.y * 32 + c.x : -1; if (k !== hover) { hover = k; who(); draw(); } });
    cv.addEventListener("mouseleave", () => { hover = -1; who(); draw(); });
  }
  function msg(t) { const m = document.getElementById("plMsg"); if (m) m.textContent = t; }
  function who() { const w = document.getElementById("plWho"); if (!w || !P) return; const nk = hover >= 0 ? P.nicks[hover] : ""; w.textContent = nk ? `이 칸: ${nk}` : "01·02 모두가 같은 판을 칠해요 · 새벽 5시에 새 판"; }
  function pal() { box.querySelectorAll("[data-c]").forEach(b => b.classList.toggle("on", +b.dataset.c === sel)); }
  function setCell(x, y, c, nick) { if (!P) return; const k = y * 32 + x; P.cells = P.cells.slice(0, k) + c.toString(16) + P.cells.slice(k + 1); P.nicks[k] = nick; thumbDirty = true; if (H.isOpen()) draw(); }
  function draw() {
    if (!cv || !P) return; const g = cv.getContext("2d"), s = 10;
    for (let i = 0; i < 640; i++) { g.fillStyle = COL[parseInt(P.cells[i], 16)] || COL[0]; g.fillRect((i % 32) * s, Math.floor(i / 32) * s, s, s); }
    g.strokeStyle = "rgba(255,255,255,.05)"; g.lineWidth = 1; g.beginPath(); for (let x = 1; x < 32; x++) { g.moveTo(x * s + .5, 0); g.lineTo(x * s + .5, 200); } for (let y = 1; y < 20; y++) { g.moveTo(0, y * s + .5); g.lineTo(320, y * s + .5); } g.stroke();
    if (hover >= 0) { g.strokeStyle = "#ffd98a"; g.lineWidth = 2; g.strokeRect((hover % 32) * s + 1, Math.floor(hover / 32) * s + 1, s - 2, s - 2); }
    const n = document.getElementById("plN"); if (n) n.textContent = `오늘 ${P.n || 0}칸`;
  }
  function step() { if (!H.isOpen()) return; const left = readyAt - Date.now(); msg(left > 0 ? `⏳ ${Math.ceil(left / 1000)}초 뒤에 또 칠할 수 있어요` : "색을 고르고 칸을 눌러요 · 12초에 1칸"); }
  function open() { if (!box) return; box.classList.add("on"); pal(); opt.send({ t: "pxGet" }); draw(); opt.closeOthers && opt.closeOthers(); clearInterval(tick); tick = setInterval(step, 500); }
  function close() { box && box.classList.remove("on"); clearInterval(tick); }
  // 01 캔버스용 작은 이젤(전광판 축소판)
  H.drawThumb = (cx, x, y, s, t) => {
    const w = 32 * 1.25 * s / 1.6, h = w * 20 / 32, top = y - 13 * s - h;
    cx.save(); cx.fillStyle = "rgba(0,0,0,.28)"; cx.beginPath(); cx.ellipse(x, y + 1 * s, w * .45, 2.4 * s, 0, 0, 7); cx.fill();
    cx.strokeStyle = "#5b3b22"; cx.lineWidth = 2 * s; cx.beginPath(); cx.moveTo(x - w * .32, y); cx.lineTo(x - w * .12, top); cx.moveTo(x + w * .32, y); cx.lineTo(x + w * .12, top); cx.moveTo(x, y); cx.lineTo(x, top + h); cx.stroke();
    cx.fillStyle = "#2b2140"; cx.fillRect(x - w / 2 - 1.5 * s, top - 1.5 * s, w + 3 * s, h + 3 * s);
    if (P) { if (!thumb) { thumb = document.createElement("canvas"); thumb.width = 32; thumb.height = 20; }
      if (thumbDirty) { const g = thumb.getContext("2d"); for (let i = 0; i < 640; i++) { g.fillStyle = COL[parseInt(P.cells[i], 16)] || COL[0]; g.fillRect(i % 32, Math.floor(i / 32), 1, 1); } thumbDirty = false; }
      cx.imageSmoothingEnabled = false; cx.drawImage(thumb, x - w / 2, top, w, h); }
    else { cx.fillStyle = COL[0]; cx.fillRect(x - w / 2, top, w, h); }
    cx.globalAlpha = window.HNCalm ? HNCalm.a() : 1; cx.fillStyle = "rgba(255,240,210,.85)"; cx.font = `700 ${3.1 * s}px ${F}`; cx.textAlign = "center"; cx.fillText("🎨 같이 그리기", x, top - 3 * s);
    cx.restore(); H._hit = { x, top, w, y };
  };
  H.hit = (px, py) => { const b = H._hit; return !!b && Math.abs(px - b.x) < b.w / 2 + 4 && py > b.top - 14 && py < b.y + 4; };
  H.init = o => { opt = o; build(); };
  H.open = open; H.close = close; H.isOpen = () => !!box && box.classList.contains("on");
  H.onMsg = m => {
    if (m.t === "init" && m.pl) { P = m.pl; thumbDirty = true; }
    else if (m.t === "pxAll") { P = { w: m.w, h: m.h, cd: m.cd, cells: m.cells, nicks: m.nicks, n: m.n }; thumbDirty = true; if (H.isOpen()) draw(); }
    else if (m.t === "pxS") { if (P) P.n = m.n; setCell(m.x, m.y, m.c, m.nick); }
    else if (m.t === "pxWait") { readyAt = Date.now() + m.left; step(); opt.send({ t: "pxGet" }); }
    else if (m.t === "pxOk") { readyAt = Date.now() + m.left; }
  };
})();
