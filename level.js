// 🏅 한강 등급(01·02 공통): 한강에 머문 시간만큼 경험치가 '천천히' 쌓인다. 돈으로는 못 산다(응원과 무관).
// 경험치 = 화면을 켜 두고 접속해 있는 1분당 1, 하루 최대 180(3시간) → 밤새 켜 두기로 급하게 못 올림.
// 레벨 L까지 누적 분 = 20 × (L-1)^1.8 → Lv5 약 4시간 · Lv10 약 17시간 · Lv15 약 39시간 · Lv20 약 67시간 · Lv30 약 142시간 · Lv40 약 244시간.
// 등급이 오를수록 모두에게 보이는 꾸밈: 🌿 표시 → 🌸 방석 → 🌙 은은한 빛 → 🌠 반짝이 → 🌌 도는 별 → 🌊 물결 후광.
// 🔥 연속 출석(streak.js)은 '며칠 연속', 등급은 '모두 합친 시간'이라 서로 다른 것. 📒 수첩에 한 줄로 이어 붙임.
// 처음 켤 때 수첩의 지난 머문 시간(hn-visit)을 하루 3시간 한도로 옮겨 와서 기존 단골은 바로 등급을 받는다. 서버는 숫자(lv)만 받아 같은 방에 보여 줌.
(() => {
  const H = window.HNLevel = {}; let opt = {}, S = { xp: 0, day: "", today: 0, seeded: 0 }, box = null, tick = 0;
  const F = `system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const kst = (ms = Date.now()) => new Date(ms + 9 * 3600e3).toISOString().slice(0, 10);
  const MAX = 50, DAY_CAP = 180;
  const need = L => Math.round(20 * Math.pow(L - 1, 1.8));
  const levelOf = xp => { let L = 1; while (L < MAX && xp >= need(L + 1)) L++; return L; };
  // [Lv, 글자, 이름, 받는 것, 테두리 금속(밝음,어두움), 보석(밝음,어두움), 빛]
  const GR = [[1, "🌱", "새싹", "한강에 처음 앉은 새싹", ["#c9d6c4", "#6c7a68"], ["#d8f0c8", "#6a9a5a"], "180,220,160"],
    [5, "🌿", "풀잎", "머리 옆 청동 풀잎 휘장", ["#f0b47a", "#7a4a20"], ["#b8f0a0", "#2f8a4a"], "150,230,140"],
    [10, "🌸", "벚꽃", "로즈골드 휘장 + 벚꽃 방석", ["#ffd6c4", "#a8604f"], ["#ffd0e4", "#d0558f"], "255,170,210"],
    [15, "🌙", "달빛", "은빛 휘장 + 달빛 방석 + 은은한 빛", ["#ffffff", "#8a96b8"], ["#d8e6ff", "#4d6fd0"], "170,200,255"],
    [20, "🌠", "별똥별", "금빛 날개 휘장 + 이름표가 모두에게 + 별 반짝이", ["#fff0b0", "#a8761a"], ["#fff6c8", "#e0961c"], "255,215,120"],
    [30, "🌌", "은하수", "자수정 날개 휘장 + 둘레를 도는 별", ["#f4ecff", "#8a76c0"], ["#ecd6ff", "#6a3fc0"], "190,150,255"],
    [40, "🌊", "한강 지기", "오로라 왕관 휘장 + 물결 후광 + 금빛 방석", ["#e8fdff", "#3f9cc0"], ["#c8fff4", "#2a7fd0"], "120,230,255"]];
  const gradeOf = L => { let g = 0; GR.forEach((x, k) => { if (L >= x[0]) g = k; }); return g; };
  H.need = need; H.levelOf = levelOf; H.gradeOf = gradeOf; H.GR = GR;
  H.badge = () => "";   // 02 이름표 글자 대신 휘장 그림(deco3d)을 쓴다
  // ---------- 휘장(엠블럼) 그림: 방패 + 금속 테두리 + 보석 + 글자, 높은 등급은 날개·왕관 ----------
  const EMB = {};
  function emblem(g) {
    if (EMB[g]) return EMB[g]; const S2 = 128, cv = document.createElement("canvas"); cv.width = cv.height = S2; const x = cv.getContext("2d"), G = GR[g], c0 = 64, cy = 66;
    const shield = (r) => { x.beginPath(); x.moveTo(c0, cy - r); x.bezierCurveTo(c0 + r * .55, cy - r * .78, c0 + r * .82, cy - r * .86, c0 + r * .86, cy - r * .7); x.bezierCurveTo(c0 + r * .9, cy + r * .1, c0 + r * .6, cy + r * .66, c0, cy + r); x.bezierCurveTo(c0 - r * .6, cy + r * .66, c0 - r * .9, cy + r * .1, c0 - r * .86, cy - r * .7); x.bezierCurveTo(c0 - r * .82, cy - r * .86, c0 - r * .55, cy - r * .78, c0, cy - r); x.closePath(); };
    const glow = x.createRadialGradient(c0, cy, 8, c0, cy, 62); glow.addColorStop(0, `rgba(${G[6]},.55)`); glow.addColorStop(1, `rgba(${G[6]},0)`); x.fillStyle = glow; x.fillRect(0, 0, S2, S2);
    if (g >= 4) {   // 날개
      const wc = x.createLinearGradient(0, 30, 0, 100); wc.addColorStop(0, G[4][0]); wc.addColorStop(1, G[4][1]); x.fillStyle = wc;
      for (const d of [-1, 1]) for (let k = 0; k < 4; k++) { x.save(); x.translate(c0 + d * 26, cy - 4 + k * 9); x.rotate(d * (-.5 + k * .28)); x.beginPath(); x.ellipse(d * 14, 0, 18 - k * 2.5, 5, 0, 0, 7); x.fill(); x.restore(); }
    }
    if (g >= 6) {   // 왕관
      const cr = x.createLinearGradient(0, 4, 0, 30); cr.addColorStop(0, "#fff6c8"); cr.addColorStop(1, "#d9a440"); x.fillStyle = cr; x.beginPath(); x.moveTo(44, 28); x.lineTo(46, 10); x.lineTo(55, 20); x.lineTo(64, 4); x.lineTo(73, 20); x.lineTo(82, 10); x.lineTo(84, 28); x.closePath(); x.fill();
      x.fillStyle = "#8ff0ff"; [[46, 10], [64, 4], [82, 10]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 3, 0, 7); x.fill(); });
    }
    const rim = x.createLinearGradient(c0 - 40, cy - 44, c0 + 40, cy + 44); rim.addColorStop(0, G[4][0]); rim.addColorStop(.5, G[4][1]); rim.addColorStop(.75, G[4][0]); rim.addColorStop(1, G[4][1]);
    shield(42); x.fillStyle = rim; x.shadowColor = "rgba(0,0,0,.45)"; x.shadowBlur = 6; x.shadowOffsetY = 2; x.fill(); x.shadowColor = "transparent";
    const gem = x.createRadialGradient(c0 - 10, cy - 14, 2, c0, cy, 40); gem.addColorStop(0, G[5][0]); gem.addColorStop(1, G[5][1]); shield(34); x.fillStyle = gem; x.fill();
    x.save(); shield(34); x.clip(); x.fillStyle = "rgba(255,255,255,.28)"; x.beginPath(); x.moveTo(c0 - 40, cy - 40); x.lineTo(c0 + 6, cy - 40); x.lineTo(c0 - 30, cy + 10); x.lineTo(c0 - 40, cy + 10); x.fill(); x.restore();   // 비스듬한 반사
    x.font = "40px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(G[1], c0, cy + 2);
    x.strokeStyle = "rgba(255,255,255,.55)"; x.lineWidth = 1.5; shield(41); x.stroke();
    EMB[g] = cv; return cv;
  }
  H.emblem = emblem;
  const embURL = g => { try { return emblem(g).toDataURL(); } catch { return ""; } };
  const tierText = g => `linear-gradient(90deg, ${GR[g][4][0]}, ${GR[g][5][0]}, ${GR[g][4][0]})`;

  const fmt = m => { m = Math.max(0, Math.round(m)); const h = Math.floor(m / 60); return h ? `${h}시간${m % 60 ? ` ${m % 60}분` : ""}` : `${m}분`; };
  function load() { try { S = Object.assign(S, JSON.parse(localStorage.getItem("hn-level") || "{}")); } catch {} }
  function save() { try { localStorage.setItem("hn-level", JSON.stringify(S)); } catch {} }
  const myL = () => levelOf(S.xp);
  H.level = myL; H.xp = () => S.xp;

  const css = `
  #lvBox { position: fixed; inset: 0; z-index: 12; display: none; align-items: center; justify-content: center; background: rgba(4,6,20,.7); }
  #lvBox.on { display: flex; }
  #lvBox .in { position: relative; width: min(350px, calc(100vw - 24px)); max-height: calc(100vh - 20px); overflow: auto; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; padding: 18px 16px 14px; border-radius: 24px; background: radial-gradient(120% 60% at 50% 0%, rgba(var(--g),.28), transparent 60%), linear-gradient(180deg, #1a2244, #11142c); color: #f2f4ff; border: 1px solid rgba(var(--g),.5); box-shadow: 0 0 40px rgba(var(--g),.18), 0 14px 44px rgba(0,0,0,.6); font: 14px/1.5 ${F}; text-align: center; }
  #lvBox .em { position: relative; width: 132px; height: 132px; margin: 0 auto -4px; }
  #lvBox .em:before { content: ""; position: absolute; inset: -14px; border-radius: 50%; background: conic-gradient(from 0deg, transparent 0 8%, rgba(var(--g),.35) 10%, transparent 12% 33%, rgba(var(--g),.35) 35%, transparent 37% 58%, rgba(var(--g),.35) 60%, transparent 62% 83%, rgba(var(--g),.35) 85%, transparent 87%); -webkit-mask: radial-gradient(circle, #000 30%, transparent 70%); mask: radial-gradient(circle, #000 30%, transparent 70%); animation: lvSpin 14s linear infinite; }
  #lvBox .em img { position: relative; width: 132px; height: 132px; animation: lvFloat 3.2s ease-in-out infinite; }
  @keyframes lvSpin { to { transform: rotate(360deg); } } @keyframes lvFloat { 50% { transform: translateY(-4px); } }
  #lvBox .up { font-size: 12px; font-weight: 800; letter-spacing: .2em; color: rgb(var(--g)); }
  #lvBox h3 { margin: 0; font-size: 24px; font-weight: 900; background: var(--t); -webkit-background-clip: text; background-clip: text; color: transparent; background-size: 200% 100%; animation: lvShine 4s linear infinite; }
  @keyframes lvShine { to { background-position: 200% 0; } }
  #lvBox .sub { font-size: 12.5px; color: #a9b6d8; margin-top: -6px; }
  #lvBox .rank { display: inline-block; margin: 0 auto; padding: 4px 12px; border-radius: 99px; background: rgba(var(--g),.16); border: 1px solid rgba(var(--g),.4); font-size: 12.5px; font-weight: 700; color: #fff; }
  #lvBox .bar { position: relative; height: 12px; border-radius: 99px; background: rgba(255,255,255,.08); overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,.5); }
  #lvBox .bar i { position: relative; display: block; height: 100%; border-radius: 99px; background: var(--t); overflow: hidden; }
  #lvBox .bar i:after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent); transform: translateX(-100%); animation: lvBar 2.4s ease-in-out infinite; } @keyframes lvBar { to { transform: translateX(100%); } }
  #lvBox .lbl { display: flex; justify-content: space-between; font-size: 12px; color: #b8c6e6; margin-bottom: 4px; }
  #lvBox .road { display: flex; flex-direction: column; gap: 5px; text-align: left; }
  #lvBox .road div { display: flex; gap: 9px; align-items: center; padding: 5px 9px; border-radius: 12px; background: rgba(255,255,255,.04); font-size: 12px; color: #8a98b8; }
  #lvBox .road img { width: 34px; height: 34px; flex: none; filter: grayscale(1) brightness(.55); } #lvBox .road div.ok img { filter: none; }
  #lvBox .road div.ok { background: rgba(255,255,255,.07); color: #e6ecff; } #lvBox .road div.now { background: rgba(var(--g),.16); outline: 1.5px solid rgba(var(--g),.8); }
  #lvBox .road span { flex: 1; } #lvBox .road strong { font-size: 13px; } #lvBox .road small { color: #8aa0c8; white-space: nowrap; }
  #lvBox .msg { font-size: 12px; color: #a9b8d8; }
  #lvBox .next { padding: 8px 10px; border-radius: 12px; background: rgba(255,255,255,.05); font-size: 12.5px; color: #dfe6ff; }
  #lvBox button { all: unset; cursor: pointer; padding: 11px; border-radius: 999px; background: var(--t); color: #141a33; font-weight: 900; text-align: center; }
  #lvBox .cf { position: absolute; top: -10px; width: 7px; height: 11px; border-radius: 2px; animation: lvCf 2.6s ease-in forwards; pointer-events: none; } @keyframes lvCf { to { transform: translateY(520px) rotate(720deg); opacity: 0; } }
  #bookBox .lvRow { cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 12px; background: rgba(140,200,255,.12); font-size: 13px; text-align: left; }
  #bookBox .lvRow img { width: 32px; height: 32px; } #bookBox .lvRow span { flex: 1; } #bookBox .lvRow i { display: block; height: 5px; margin-top: 3px; border-radius: 9px; background: rgba(255,255,255,.12); overflow: hidden; } #bookBox .lvRow i em { display: block; height: 100%; background: linear-gradient(90deg, #7fd3ff, #c6a8ff); }`;
  function build() {
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    box = document.createElement("div"); box.id = "lvBox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "한강 등급");
    box.onclick = e => { if (e.target === box || e.target.closest("[data-do]")) close(); };
    document.body.appendChild(box);
  }
  let rank = null;   // 서버: 지금 접속한 사람 중 나보다 높은 사람 수
  function open(up) {
    const L = myL(), g = gradeOf(L), a = need(L), b = L < MAX ? need(L + 1) : a, pct = L < MAX ? Math.min(100, (S.xp - a) / (b - a) * 100) : 100;
    const ng = GR[g + 1], left = ng ? need(ng[0]) - S.xp : 0, todayLeft = Math.max(0, DAY_CAP - (S.day === kst() ? S.today : 0));
    const top = rank && rank.total >= 3 ? Math.max(1, Math.ceil((rank.above + 1) / rank.total * 100)) : 0;
    box.innerHTML = `<div class="in" style="--g:${GR[g][6]};--t:${tierText(g)}">${up ? Array.from({ length: 26 }, (_, k) => `<i class="cf" style="left:${(k * 37) % 100}%;background:${k % 3 ? GR[g][5][0] : GR[g][4][0]};animation-delay:${(k % 7) * .12}s"></i>`).join("") : ""}
      ${up ? `<div class="up">등급 승급</div>` : ""}<div class="em"><img src="${embURL(g)}" alt=""></div>
      <h3>${GR[g][2]}</h3><div class="sub">Lv ${L} · 한강에 머문 시간 ${fmt(S.xp)}</div>
      ${top ? `<div class="rank">지금 한강에 있는 ${rank.total}명 중 상위 ${top}%</div>` : ""}
      <div><div class="lbl"><span>Lv ${L + (L < MAX ? 1 : 0)}까지</span><span>${L < MAX ? fmt(b - S.xp) + " 남음" : "최고 레벨"}</span></div><div class="bar"><i style="width:${Math.max(4, pct).toFixed(1)}%"></i></div></div>
      ${ng ? `<div class="next">다음 등급 <b>${ng[2]}</b>까지 약 ${fmt(left)}<br><small style="color:#a9b8d8">받는 것: ${ng[3]}</small></div>` : `<div class="next">가장 높은 등급이에요. 한강을 지켜 줘서 고마워요</div>`}
      <div class="road">${GR.map((x, k) => `<div class="${k <= g ? "ok" : ""} ${k === g ? "now" : ""}"><img src="${embURL(k)}" alt=""><span><strong>${x[2]}</strong> ${k > g ? "🔒" : ""}<br>${x[3]}</span><small>Lv ${x[0]}</small></div>`).join("")}</div>
      <div class="msg">화면을 켜 두고 머문 1분 = 경험치 1 · 하루 최대 3시간${todayLeft ? ` (오늘 ${fmt(todayLeft)} 더)` : " (오늘은 다 쌓았어요)"}<br>휘장·방석은 같은 방 모두에게 보여요 · 돈으로는 살 수 없어요</div>
      <button data-do="close">${up ? "고마워요!" : "좋아요"}</button></div>`;
    box.classList.add("on"); opt.closeOthers && opt.closeOthers();
    if (!up) opt.send && opt.send({ t: "lvQ" });
  }
  function close() { box && box.classList.remove("on"); }
  const send = () => opt.send && opt.send({ t: "lv", n: myL() });
  function gain() {
    if (document.hidden || !(opt.online && opt.online())) return;
    const d = kst(); if (S.day !== d) { S.day = d; S.today = 0; }
    if (S.today >= DAY_CAP) return;
    const L0 = myL(); S.xp++; S.today++; save(); const L = myL();
    if (L > L0) { send(); const g0 = gradeOf(L0), g = gradeOf(L);
      if (g > g0) setTimeout(() => open(true), 300); else opt.toast && opt.toast(`🏅 레벨 업! Lv ${L} · ${GR[g][1]} ${GR[g][2]}`, 3200); }
  }
  // 📒 수첩에 한 줄(누르면 등급 카드)
  H.book = el => {
    if (!el || !el.parentNode) return; let row = el.parentNode.querySelector(".lvRow");
    if (!row) { row = document.createElement("div"); row.className = "lvRow"; row.onclick = () => { const bb = document.getElementById("bookBox"); if (bb) bb.classList.remove("on"); open(); }; el.after(row); }
    const L = myL(), g = gradeOf(L), a = need(L), b = L < MAX ? need(L + 1) : a + 1, pct = L < MAX ? (S.xp - a) / (b - a) * 100 : 100;
    row.innerHTML = `<img src="${embURL(g)}" alt=""><span><b>${GR[g][2]}</b> · Lv ${L} <small style="color:#a8b8d8">${L < MAX ? `다음 레벨까지 ${fmt(b - S.xp)}` : "최고 레벨"}</small><i><em style="width:${pct.toFixed(1)}%"></em></i></span><small style="color:#a8b8d8">›</small>`;
  };
  // ---------- 01 캔버스: 몸 아래(방석·빛) / 머리 옆(등급 표시) ----------
  const COL = [null, null, ["#ffc6dc", "#f59ac0"], ["#bcd2ff", "#7f9fe6"], ["#d8c8ff", "#a48af0"], ["#9db4ff", "#5c64c8"], ["#ffe6a0", "#d9a440"]];
  H.under = (cx, c, x, y, s, t) => {
    const g = gradeOf(c.lv || 0); if (g < 2) return;
    cx.save();
    if (g >= 3) { const r = (g >= 6 ? 30 : 24) * s, ay = y - 16 * s, gl = cx.createRadialGradient(x, ay, 0, x, ay, r); const cl = g >= 6 ? "120,200,255" : g >= 5 ? "170,150,255" : "160,190,255";
      gl.addColorStop(0, `rgba(${cl},${.2 + .05 * Math.sin(t * 1.8 + (c.phase || 0))})`); gl.addColorStop(1, `rgba(${cl},0)`); cx.globalCompositeOperation = "lighter"; cx.fillStyle = gl; cx.beginPath(); cx.arc(x, ay, r, 0, 7); cx.fill(); cx.globalCompositeOperation = "source-over"; }
    if (c.state === "sit") { const [a, b] = COL[g]; cx.fillStyle = b; cx.beginPath(); cx.ellipse(x, y + 1.6 * s, 12.5 * s, 3.6 * s, 0, 0, 7); cx.fill(); cx.fillStyle = a; cx.beginPath(); cx.ellipse(x, y + .9 * s, 11.5 * s, 3 * s, 0, 0, 7); cx.fill();   // 방석
      if (g >= 6) { cx.strokeStyle = `rgba(150,220,255,${.5 + .3 * Math.sin(t * 2)})`; cx.lineWidth = .8 * s; for (let k = 0; k < 2; k++) { const p = (t * .35 + k * .5) % 1; cx.globalAlpha = 1 - p; cx.beginPath(); cx.ellipse(x, y + 1.5 * s, (13 + p * 10) * s, (3.8 + p * 2.6) * s, 0, 0, 7); cx.stroke(); } cx.globalAlpha = 1; } }   // 🌊 물결
    cx.restore();
  };
  H.over = (cx, c, hx, hy, s, t) => {
    const L = c.lv || 0, g = gradeOf(L), now = performance.now();
    if (c.lvFx && now - c.lvFx < 2600) {   // 🎉 등급이 오른 순간: 빛기둥 + 위로 솟는 반짝이(같은 방 모두에게)
      const p = (now - c.lvFx) / 2600, G = GR[Math.max(1, g)][6]; cx.save(); cx.globalCompositeOperation = "lighter";
      const lg = cx.createLinearGradient(hx, hy - 60 * s, hx, hy + 20 * s); lg.addColorStop(0, `rgba(${G},0)`); lg.addColorStop(.6, `rgba(${G},${.45 * (1 - p)})`); lg.addColorStop(1, `rgba(${G},0)`); cx.fillStyle = lg; cx.fillRect(hx - 9 * s, hy - 60 * s, 18 * s, 80 * s);
      cx.fillStyle = "#fff6d8"; for (let k = 0; k < 14; k++) { const q = (p * 1.4 + k / 14) % 1; cx.globalAlpha = (1 - q) * (1 - p); cx.beginPath(); cx.arc(hx + Math.sin(k * 2.4) * 12 * s, hy + 10 * s - q * 60 * s, (.6 + (k % 3) * .4) * s, 0, 7); cx.fill(); }
      cx.restore();
    }
    if (g < 1) return;
    cx.save(); const sz = Math.max(16, 12 * s), ex = hx + 12 * s, ey = hy - 14 * s, bob = Math.sin(t * 1.6 + (c.phase || 0)) * .8 * s;
    if (g >= 3) { const gl = cx.createRadialGradient(ex, ey + bob, 0, ex, ey + bob, sz * .9); gl.addColorStop(0, `rgba(${GR[g][6]},${.35 + .12 * Math.sin(t * 2.2)})`); gl.addColorStop(1, `rgba(${GR[g][6]},0)`); cx.globalCompositeOperation = "lighter"; cx.fillStyle = gl; cx.fillRect(ex - sz, ey + bob - sz, sz * 2, sz * 2); cx.globalCompositeOperation = "source-over"; }
    cx.drawImage(emblem(g), ex - sz / 2, ey + bob - sz / 2, sz, sz);
    if (g >= 4 && !c.admin && opt.me && c.id !== opt.me() && c.nick) {   // 🌠부터 이름표가 모두에게
      cx.font = `800 ${Math.max(10, 8 * s)}px ${F}`; cx.textAlign = "center"; cx.textBaseline = "alphabetic"; const w = cx.measureText(c.nick).width + 10 * s, ny = hy - 24 * s;
      cx.fillStyle = "rgba(12,14,34,.6)"; cx.beginPath(); cx.roundRect ? cx.roundRect(hx - w / 2, ny - 8.5 * s, w, 11 * s, 5.5 * s) : cx.rect(hx - w / 2, ny - 8.5 * s, w, 11 * s); cx.fill();
      const tg = cx.createLinearGradient(hx - w / 2, 0, hx + w / 2, 0); tg.addColorStop(0, GR[g][4][0]); tg.addColorStop(.5, GR[g][5][0]); tg.addColorStop(1, GR[g][4][0]); cx.fillStyle = tg; cx.fillText(c.nick, hx, ny);
    }
    if (g >= 4) { const ph = c.phase || 0; cx.fillStyle = "#fff6d8"; for (let k = 0; k < (g >= 5 ? 5 : 3); k++) { const a = t * (g >= 5 ? .9 : 0) + k * 2.1 + ph, rr = (g >= 5 ? 17 : 14) * s, px = hx + Math.cos(a) * rr, py = hy - 4 * s + Math.sin(a) * rr * .45, tw = .5 + .5 * Math.sin(t * 3 + k * 1.7 + ph);
      cx.globalAlpha = .35 + .6 * tw; cx.beginPath(); cx.arc(px, py, (.6 + tw * .7) * s, 0, 7); cx.fill(); } }   // 🌠 반짝이 · 🌌 도는 별
    cx.restore();
  };
  // ---------- 02(3D): 방석·빛 ----------
  let glowTex = null;
  H.deco3d = (THREE, c, L) => {
    if (!THREE || !c || !c.root) return; if (c.lvDeco) { clearInterval(c.lvDeco.userData.tk); c.root.remove(c.lvDeco); c.lvDeco = null; }
    const g = gradeOf(L || 0); if (g < 1) return;
    const grp = new THREE.Group(), [a, b] = COL[Math.max(2, g)];
    const em = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(emblem(g)), depthTest: false, transparent: true })); em.scale.set(.3, .3, 1); em.renderOrder = 12; grp.add(em);
    em.onBeforeRender = () => { const l = c.lbl; if (l) { em.visible = l.visible; em.position.set(0, l.position.y + .2 + Math.sin(performance.now() / 600) * .01, 0); } };
    const cush = new THREE.Mesh(new THREE.CylinderGeometry(.19, .21, .035, 28), new THREE.MeshLambertMaterial({ color: a, emissive: b, emissiveIntensity: .25 })); cush.position.y = .018; grp.add(cush);
    if (g >= 3) {
      if (!glowTex) { const cv = document.createElement("canvas"); cv.width = cv.height = 64; const x = cv.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); glowTex = new THREE.CanvasTexture(cv); }
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: g >= 6 ? 0x88d0ff : g >= 5 ? 0xaa99ff : 0x99b8ff, transparent: true, opacity: .32, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.set(.95, .95, 1); sp.position.y = .32; grp.add(sp);
    }
    if (g >= 4) {
      const ring = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: 0xfff2c8 }), n = g >= 5 ? 6 : 3;
      for (let k = 0; k < n; k++) { const st = new THREE.Mesh(new THREE.SphereGeometry(.012, 6, 6), m); const an = k / n * Math.PI * 2; st.position.set(Math.cos(an) * .3, .36 + Math.sin(an * 2) * .05, Math.sin(an) * .3); ring.add(st); }
      grp.add(ring); cush.onBeforeRender = () => { ring.rotation.y = performance.now() / (g >= 5 ? 1400 : 4000); };
    }
    if (g >= 6) { const wv = new THREE.Mesh(new THREE.RingGeometry(.24, .27, 40), new THREE.MeshBasicMaterial({ color: 0x9fdcff, transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false })); wv.rotation.x = -Math.PI / 2; wv.position.y = .01; grp.add(wv);
      const cOld = cush.onBeforeRender; cush.onBeforeRender = (...q) => { cOld && cOld(...q); const p = (performance.now() / 2200) % 1; wv.scale.setScalar(1 + p * 1.2); wv.material.opacity = .5 * (1 - p); }; }
    grp.userData.tk = setInterval(() => { cush.visible = g >= 2 && c.state === "sit"; }, 400); cush.visible = g >= 2 && c.state === "sit";   // 방석은 앉았을 때만
    c.root.add(grp); c.lvDeco = grp;
  };
  H.onMsg = m => {
    if (m.t === "init") setTimeout(send, 900);
    else if (m.t === "lv") { const ch = opt.chars && opt.chars(); const c = ch && ch.get(m.id); if (c) { c.lv = m.n; opt.onLv && opt.onLv(c, m.n); } }
    else if (m.t === "lvUp") { const ch = opt.chars && opt.chars(), c = ch && ch.get(m.id); if (c) c.lvFx = performance.now();
      if (opt.me && m.id !== opt.me() && opt.toast) { const g = gradeOf(m.n); opt.toast(`${GR[g][1]} ${m.nick}님이 '${GR[g][2]}' 등급이 되었어요! 축하해 주세요`, 3800); } }
    else if (m.t === "lvRank") { rank = m; if (H.isOpen()) { const r = box.querySelector(".rank"), top = m.total >= 3 ? Math.max(1, Math.ceil((m.above + 1) / m.total * 100)) : 0; if (top) { if (r) r.textContent = `지금 한강에 있는 ${m.total}명 중 상위 ${top}%`; else { const d = document.createElement("div"); d.className = "rank"; d.textContent = `지금 한강에 있는 ${m.total}명 중 상위 ${top}%`; const sub = box.querySelector(".sub"); sub && sub.after(d); } } } }
  };
  H.init = o => {
    opt = o; load(); build();
    if (!S.seeded) { const v = opt.visit && opt.visit(); if (v) S.xp = Math.max(S.xp, Math.min(Math.floor((v.secs || 0) / 60), (v.days || []).length * DAY_CAP)); S.seeded = 1; save(); }
    clearInterval(tick); tick = setInterval(gain, 60e3);
  };
  H.open = () => open(false); H.close = close; H.isOpen = () => !!box && box.classList.contains("on");
  H.dbgXp = n => { S.xp = n; save(); send(); };   // 시험용: HNLevel.dbgXp(need(15))
})();
