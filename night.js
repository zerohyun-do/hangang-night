// 🌙 오늘 밤 카드(01·02 공통): 오늘 한강에서 한 일을 한 장으로 — 머문 시간·먹은 것·낚은 것·퀴즈·손님·응원 → 이미지 저장·공유
// 기록은 이 폰에만(hn-night, 한국 날짜가 바뀌면 새로). 서버 변경 없음, 페이지의 ws 메시지를 보고 센다.
(() => {
  const H = window.HNNight = {}; let opt = {}, N = null, qPick = {}, hinted = false;
  const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const blank = () => ({ date: kst(), secs: 0, eat: [], fish: 0, best: null, quiz: null, guest: 0, sup: 0 });
  function load() { try { N = JSON.parse(localStorage.getItem("hn-night") || "null"); } catch { N = null; } if (!N || N.date !== kst()) N = blank(); }
  function save() { try { localStorage.setItem("hn-night", JSON.stringify(N)); } catch {} }
  function cur() { if (!N || N.date !== kst()) { N = blank(); qPick = {}; } return N; }
  const F = `system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  const css = `
  #ntBox { position: fixed; inset: 0; z-index: 12; display: none; align-items: center; justify-content: center; background: rgba(4,6,20,.72); }
  #ntBox.on { display: flex; }
  #ntBox .in { width: min(380px, calc(100vw - 24px)); max-height: calc(100vh - 24px); display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 22px; background: #141a36; color: #eef1ff; border: 1px solid rgba(180,190,255,.3); box-shadow: 0 14px 44px rgba(0,0,0,.55); font: 14px/1.45 ${F}; text-align: center; }
  #ntBox img { width: 100%; max-height: calc(100vh - 190px); object-fit: contain; border-radius: 14px; background: #0b1030; }
  #ntBox .row { display: flex; gap: 8px; } #ntBox button { all: unset; cursor: pointer; flex: 1; padding: 11px 0; border-radius: 13px; font: 700 14px ${F}; text-align: center; }
  #ntBox .go { background: linear-gradient(135deg, #ffd27a, #ff9fb6); color: #2a1838; } #ntBox .x { background: rgba(255,255,255,.1); color: #dfe3ff; }
  #ntBox .sup { font-size: 12.5px; color: #c9cff5; } #ntBox .sup a { color: #ffd98a; font-weight: 700; cursor: pointer; text-decoration: underline; }
  @media (orientation: landscape) and (max-height: 520px) { #ntBox .in { flex-direction: row; align-items: center; width: min(640px, calc(100vw - 24px)); } #ntBox img { width: auto; height: calc(100vh - 56px); max-height: none; } #ntBox .side { display: flex; flex-direction: column; gap: 10px; flex: 1; } }`;
  function build() {
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    const b = document.createElement("div"); b.id = "ntBox"; b.setAttribute("role", "dialog"); b.setAttribute("aria-label", "오늘 밤 카드");
    b.innerHTML = `<div class="in"><img id="ntImg" alt="오늘 밤 카드"><div class="side"><b>🌙 오늘 밤 카드</b><div class="row"><button class="go" data-do="share">📤 저장·공유</button><button class="x" data-do="close">닫기</button></div><div class="sup">오늘 밤이 좋았다면 <a data-do="sup">💛 한강 응원하기</a></div></div></div>`;
    b.onclick = e => { const d = e.target.closest("[data-do]"); if (e.target === b) return close(); if (!d) return; const k = d.dataset.do; if (k === "close") close(); else if (k === "share") share(); else if (k === "sup") { close(); opt.openSup && opt.openSup(); } };
    document.body.appendChild(b);
    setInterval(() => { if (document.hidden || !(opt.online ? opt.online() : true)) return; const n = cur(); n.secs += 30; save();
      if (!hinted && n.secs >= 20 * 60 && n.secs < 20 * 60 + 30) { hinted = true; opt.toast && opt.toast("🌙 오늘 밤 카드가 만들어졌어요 · ☰ 더보기 → 🌙 오늘 밤 카드", 4500); } }, 30000);
  }
  const fmt = s => { const m = Math.round(s / 60); return m < 60 ? `${Math.max(1, m)}분` : `${Math.floor(m / 60)}시간 ${m % 60 ? (m % 60) + "분" : ""}`.trim(); };
  function rnd(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  function draw() {
    const n = cur(), W = 1080, Hh = 1350, c = document.createElement("canvas"); c.width = W; c.height = Hh; const g = c.getContext("2d");
    const sky = g.createLinearGradient(0, 0, 0, Hh); sky.addColorStop(0, "#0a0f2e"); sky.addColorStop(.45, "#1d1f52"); sky.addColorStop(.62, "#4a2f6b"); sky.addColorStop(.7, "#10183a"); sky.addColorStop(1, "#070b1f");
    g.fillStyle = sky; g.fillRect(0, 0, W, Hh);
    const r = rnd(+n.date.replace(/-/g, "") + (opt.myNick ? [...opt.myNick()].reduce((a, ch) => a + ch.charCodeAt(0), 0) : 0));
    for (let i = 0; i < 260; i++) { const x = r() * W, y = r() * 820, a = .25 + r() * .75, s = r() < .06 ? 2.6 : 1 + r() * 1.2; g.globalAlpha = a; g.fillStyle = r() < .15 ? "#ffe9c4" : "#ffffff"; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    // 달
    const mg = g.createRadialGradient(960, 100, 10, 960, 100, 170); mg.addColorStop(0, "rgba(255,240,200,.35)"); mg.addColorStop(1, "rgba(255,240,200,0)"); g.fillStyle = mg; g.fillRect(760, 0, 320, 300);
    g.fillStyle = "#fff4d6"; g.beginPath(); g.arc(960, 100, 48, 0, 7); g.fill(); g.fillStyle = "#0f1436"; g.beginPath(); g.arc(982, 86, 43, 0, 7); g.fill();
    // 도시 실루엣 + 강
    const by = 880; g.fillStyle = "#0b1030";
    for (let x = 0; x < W;) { const w = 30 + r() * 70, h = 40 + r() * 170 * (x > 560 && x < 700 ? 1.9 : 1); g.fillRect(x, by - h, w, h + 2);
      g.fillStyle = "rgba(255,214,140,.75)"; for (let k = 0; k < h / 22; k++) for (let j = 0; j < w / 18; j++) if (r() < .32) g.fillRect(x + 6 + j * 16, by - h + 10 + k * 20, 6, 8); g.fillStyle = "#0b1030"; x += w + 4; }
    g.fillStyle = "#0e1640"; g.fillRect(0, by, W, Hh - by);
    g.fillStyle = "rgba(255,210,140,.18)"; for (let i = 0; i < 40; i++) { const x = r() * W, y = by + 10 + r() * 80; g.fillRect(x, y, 30 + r() * 60, 2); }
    // 글자
    const nick = opt.myNick ? opt.myNick() || "" : "";
    g.textAlign = "left"; g.fillStyle = "#c9cff5"; g.font = `600 40px ${F}`; g.fillText(n.date.replace(/-/g, ". ") + " · 밤 한강", 80, 130);
    g.fillStyle = "#ffffff"; { const t = nick ? `${nick}의 오늘 밤` : "나의 오늘 밤"; let fs = 76; do { g.font = `800 ${fs}px ${F}`; fs -= 4; } while (g.measureText(t).width > 780 && fs > 40); g.fillText(t, 80, 225); }
    g.font = `800 150px ${F}`; g.fillStyle = "#ffe29a"; g.fillText(fmt(n.secs), 80, 400); g.font = `600 40px ${F}`; g.fillStyle = "#e6e8ff"; g.fillText("한강에 앉아 있었어요", 86, 462);
    const rows = [];
    if (n.eat.length) rows.push(["먹은 것", n.eat.slice(0, 8).join(" ")]);
    if (n.fish) rows.push(["낚시", `${n.fish}마리${n.best ? ` · 제일 큰 ${n.best.e} ${n.best.name} ${n.best.cm}cm` : ""}`]);
    if (n.quiz) rows.push(["퀴즈", `${n.quiz.ok} / ${n.quiz.n} 맞힘`]);
    if (n.guest) rows.push(["손님", `${n.guest}번 사진 찍음`]);
    if (opt.streak) { const s = opt.streak(); if (s > 1) rows.push(["도장", `${s}일 연속 한강`]); }
    if (n.sup) rows.push(["💛", "한강을 응원했어요"]);
    if (!rows.length) rows.push(["오늘", "강물 보면서 쉬었어요"]);
    const RH = 66, bh = rows.length * RH + 40; let y = Hh - 120 - bh + 60; g.fillStyle = "rgba(255,255,255,.07)"; g.beginPath(); g.roundRect ? g.roundRect(60, y - 60, W - 120, bh, 34) : g.rect(60, y - 60, W - 120, bh); g.fill();
    for (const [k, v] of rows) { g.font = `700 36px ${F}`; g.fillStyle = "#aab3ea"; g.fillText(k, 100, y); g.font = `700 40px ${F}`; g.fillStyle = "#ffffff"; let t = v; while (g.measureText(t).width > W - 380 && t.length > 2) t = t.slice(0, -2) + "…"; g.fillText(t, 290, y); y += RH; }
    g.textAlign = "center"; g.font = `600 34px ${F}`; g.fillStyle = "#c9cff5"; g.fillText("🌙 hangang-night.onrender.com", W / 2, Hh - 42);
    return c;
  }
  let canvas = null;
  function open() { canvas = draw(); const img = document.getElementById("ntImg"); img.src = canvas.toDataURL("image/png"); document.getElementById("ntBox").classList.add("on"); opt.closeOthers && opt.closeOthers(); }
  function close() { document.getElementById("ntBox").classList.remove("on"); }
  function share() {
    if (!canvas) return; const name = "hangang-night-" + cur().date + ".png";
    canvas.toBlob(async blob => {
      try { const f = new File([blob], name, { type: "image/png" }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: "밤 한강 돗자리", text: "오늘 밤 한강 🌙 https://hangang-night.onrender.com" }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      opt.toast && opt.toast("🌙 카드를 저장했어요", 2500);
    }, "image/png");
  }
  H.init = o => { opt = o; load(); build(); };
  H.open = open; H.close = close;
  H.onMsg = m => {
    const me = opt.me ? opt.me() : null; const n = cur(); let ch = false;
    if (m.t === "act" && m.id === me && opt.food) { const e = opt.food(m.a); if (e && n.eat[n.eat.length - 1] !== e) { n.eat.push(e); n.eat = n.eat.slice(-12); ch = true; } }
    else if (m.t === "catch" && m.id === me) { n.fish++; ch = true; const f = opt.fish ? opt.fish(m.f) : null; if (f && m.cm && (!n.best || m.cm > n.best.cm)) n.best = { name: f[0], e: f[1], cm: m.cm }; }
    else if (m.t === "guest" && m.id === me) { n.guest++; ch = true; }
    else if (m.t === "sup" && m.id === me) { n.sup++; ch = true; }
    else if (m.t === "qzStart") qPick = { ok: 0, n: m.n };
    else if (m.t === "qaOk") qPick[m.i] = m.a;
    else if (m.t === "qzR") { if (qPick[m.i] === m.c) qPick.ok = (qPick.ok || 0) + 1; }
    else if (m.t === "qzEnd" && qPick.n) { const q = { ok: qPick.ok || 0, n: qPick.n }; if (!n.quiz || q.ok > n.quiz.ok) { n.quiz = q; ch = true; } qPick = {}; }
    if (ch) save();
  };
})();
