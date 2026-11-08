// 🏪 한강 편의점 + 🍜 한강라면 — 01(index.html)과 02(3d.html)가 같이 쓰는 파일. 버스킹 거리 옆 편의점.
// 돗자리의 '🧺 싸 온 음식'(도시락·샌드위치…)과 나눠서, 여기서는 '사 먹는' 것(삼각김밥·핫도그·음료…)을 고른다. 계산은 무료(게임 속 가게).
// 🍜 한강라면: 은박 그릇에 라면 → 기계에 올리고 버튼 → 물·끓이기(진짜 기계는 약 3분, 여기서는 40초) → 토핑 → 젓기 → 돗자리로.
// 산 것은 오늘 하루 '내 봉지'(localStorage hn-bag)에 담겨 먹기 판에 뜬다. 서버: rmDone(보냄) / rmN{n, nick}(받음)
(function () {
  const H = window.HNStore = {};
  const ITEMS = [["kimbap", "🍙", "삼각김밥"], ["hotdog", "🌭", "핫도그"], ["oden", "🍢", "어묵"], ["chicken", "🍗", "치킨"], ["popcorn", "🍿", "팝콘"], ["icecream", "🍦", "아이스크림"],
    ["bmilk", "🥛", "바나나우유"], ["juice", "🧃", "주스"], ["soda", "🥤", "탄산음료"]];
  const NOODLE = [["red", "🌶", "매운 라면"], ["mild", "🍲", "순한 라면"], ["black", "🖤", "짜장 라면"]];
  const TOP = [["egg", "🥚", "계란"], ["cheese", "🧀", "치즈"], ["kimchi", "🥬", "김치"], ["dump", "🥟", "만두"]];
  const BOIL = 40;
  let opt = null, rmN = 0, cart = [], rm = null, tick = null;
  const $ = id => document.getElementById(id);
  const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const ld = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") || d; } catch { return d; } };
  const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const bag = () => { const b = ld("hn-bag", null); return b && b.date === kst() && Array.isArray(b.items) ? b.items : []; };
  const addBag = ids => { const it = bag(); for (const i of ids) if (!it.includes(i)) it.push(i); sv("hn-bag", { date: kst(), items: it }); if (opt.bagChanged) opt.bagChanged(); };
  const F = 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  const css = `
  #stWrap { position: fixed; inset: 0; z-index: 10; display: none; overflow: auto; background: linear-gradient(#f4f8fb, #dfe8ee 62%, #c9d3da); color: #1d2a33; font: 14px/1.45 ${F}; user-select: none; -webkit-user-select: none; }
  #stWrap.on { display: block; }
  #stWrap .in { max-width: 560px; margin: 0 auto; padding: calc(max(12px, env(safe-area-inset-top)) + 4px) 14px calc(max(16px, env(safe-area-inset-bottom)) + 12px); display: flex; flex-direction: column; gap: 12px; }
  #stWrap .hd { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  #stWrap .sign { flex: 1; padding: 10px 14px; border-radius: 16px; background: #2aa86f; border-bottom: 5px solid #f39a1e; color: #fff; font-weight: 800; font-size: 16px; box-shadow: 0 4px 14px rgba(0,0,0,.15); }
  #stWrap .sign small { display: block; font-weight: 500; font-size: 11.5px; opacity: .92; }
  #stWrap button { all: unset; cursor: pointer; box-sizing: border-box; text-align: center; }
  #stWrap .back { padding: 10px 13px; border-radius: 999px; background: #233340; color: #fff; font-weight: 700; font-size: 13px; white-space: nowrap; }
  #stWrap .sec { background: #fff; border-radius: 18px; padding: 12px; box-shadow: 0 3px 12px rgba(30,50,70,.1); display: flex; flex-direction: column; gap: 10px; }
  #stWrap .sec > b { font-size: 15px; display: flex; justify-content: space-between; align-items: baseline; } #stWrap .sec > b small { font-weight: 500; font-size: 12px; color: #5f7480; }
  #stWrap .shelf { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  #stWrap .shelf button { padding: 10px 4px 8px; border-radius: 14px; background: #f1f5f8; border: 2px solid transparent; display: grid; gap: 2px; font-size: 12.5px; color: #33454f; position: relative; }
  #stWrap .shelf button i { font-style: normal; font-size: 30px; line-height: 1.1; } #stWrap .shelf button.sel { border-color: #2aa86f; background: #e6f6ee; }
  #stWrap .shelf button.sel::after { content: "✓"; position: absolute; right: 6px; top: 4px; color: #2aa86f; font-weight: 900; }
  #stWrap .shelf button.had { opacity: .55; }
  #stWrap .pay { padding: 12px; border-radius: 999px; background: #2aa86f; color: #fff; font-weight: 800; font-size: 15px; } #stWrap .pay.off { background: #b6c6cf; pointer-events: none; }
  #stWrap .note { font-size: 12px; color: #5f7480; text-align: center; }
  #stWrap .rm { background: linear-gradient(#2b3540, #1b232b); color: #eef4f8; }
  #stWrap .rm > b small { color: #a9bac6; }
  #stWrap .mach { position: relative; height: 190px; border-radius: 14px; background: #2b333b; overflow: hidden; }
  #stWrap .mach canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  #stWrap .mach .lcd { position: absolute; left: 12px; top: 10px; padding: 3px 8px; border-radius: 6px; background: #0b1f14; color: #7dff9e; font: 700 13px/1.3 ui-monospace, monospace; letter-spacing: 1px; box-shadow: inset 0 0 0 1px #1d4a30, 0 0 10px rgba(125,255,158,.25); }
  #stWrap .mach .tap { position: absolute; left: 50%; top: 22px; width: 18px; height: 26px; margin-left: -9px; border-radius: 4px 4px 2px 2px; background: #cfd6db; }
  #stWrap .mach .water { position: absolute; left: 50%; top: 48px; width: 4px; margin-left: -2px; height: 0; background: rgba(150,210,255,.9); transition: height .3s; } #stWrap .mach.pour .water { height: 44px; }
  #stWrap .mach .plate { position: absolute; left: 50%; bottom: 14px; width: 120px; height: 12px; margin-left: -60px; border-radius: 6px; background: #20262c; box-shadow: inset 0 0 0 2px #8a3b2e; } #stWrap .mach.hot .plate { box-shadow: inset 0 0 0 2px #ff6a3d, 0 0 18px #ff6a3d; }
  #stWrap .mach .bowl { position: absolute; left: 50%; bottom: 26px; width: 84px; height: 40px; margin-left: -42px; border-radius: 6px 6px 30px 30px; background: linear-gradient(#e9eef2, #a9b5bd); display: none; }
  #stWrap .mach .bowl.on { display: block; } #stWrap .mach .bowl span { position: absolute; left: 0; right: 0; top: -14px; text-align: center; font-size: 22px; letter-spacing: -4px; }
  #stWrap .mach .steam { position: absolute; left: 50%; bottom: 66px; margin-left: -30px; width: 60px; height: 50px; opacity: 0; pointer-events: none; } #stWrap .mach.hot .steam { opacity: 1; }
  #stWrap .mach .steam i { position: absolute; bottom: 0; width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,.5); animation: stUp 1.6s infinite ease-out; font-style: normal; }
  @keyframes stUp { from { transform: translateY(0) scale(.6); opacity: .8; } to { transform: translateY(-46px) scale(1.8); opacity: 0; } }
  #stWrap .mach .btn { position: absolute; right: 14px; top: 14px; width: 46px; height: 46px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ff7a6a, #d93a2e 60%, #a3281f); box-shadow: 0 4px 0 #7d1f17, 0 0 14px rgba(255,90,70,.45); color: #fff; font-weight: 900; font-size: 12px; display: grid; place-items: center; }
  #stWrap .mach .btn.off { background: radial-gradient(circle at 35% 30%, #8a949c, #5e6971 60%, #434c53); box-shadow: 0 4px 0 #2b3238; pointer-events: none; }
  #stWrap .done .mach { height: 210px; }
  #stWrap .bar { height: 8px; border-radius: 4px; background: rgba(255,255,255,.12); overflow: hidden; } #stWrap .bar i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #ffb35c, #ff6a3d); transition: width .9s linear; }
  #stWrap .step { font-size: 13.5px; color: #dfe9f0; text-align: center; min-height: 20px; }
  #stWrap .opts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; } #stWrap .opts.t4 { grid-template-columns: repeat(4, 1fr); }
  #stWrap .opts button { padding: 8px 2px; border-radius: 12px; border: 1px solid rgba(255,255,255,.2); display: grid; gap: 1px; font-size: 12px; color: #e8f0f5; } #stWrap .opts button i { font-style: normal; font-size: 22px; }
  #stWrap .opts button.sel { background: rgba(255,180,90,.25); border-color: #ffb35c; }
  #stWrap .go { padding: 12px; border-radius: 999px; background: #ffb35c; color: #3a2100; font-weight: 800; font-size: 15px; }
  #stWrap .done { text-align: center; display: grid; gap: 6px; } #stWrap .done .face { font-size: 54px; line-height: 1; animation: stPop .6s ease-out; }
  @keyframes stPop { from { transform: scale(.3); } 70% { transform: scale(1.15); } to { transform: scale(1); } }
  #stWrap .sup { font-size: 12.5px; color: #ffd98f; } #stWrap .sup a { color: #ffc56b; font-weight: 700; text-decoration: underline; cursor: pointer; }`;

  function build() {
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    const w = document.createElement("div"); w.id = "stWrap"; w.setAttribute("role", "dialog"); w.setAttribute("aria-label", "한강 편의점"); document.body.appendChild(w);
    w.addEventListener("click", e => { const b = e.target.closest("[data-do]"); if (b) act(b.dataset.do, b.dataset.v); });
  }
  function render() {
    const had = bag();
    $("stWrap").innerHTML = `<div class="in">
      <div class="hd"><div class="sign">🏪 한강 편의점<small>버스킹 거리 옆 · 24시 · ${rmN ? `오늘 한강라면 ${rmN}그릇` : "한강라면 기계 있어요"}</small></div><button class="back" data-do="close">🎸 거리로</button></div>
      <div class="sec rm" id="stRm">${rmHTML()}</div>
      <div class="sec"><b>🛒 진열대 <small>골라서 계산하면 오늘 '내 봉지'에</small></b>
        <div class="shelf">${ITEMS.map(([k, e, n]) => `<button data-do="pick" data-v="${k}" class="${cart.includes(k) ? "sel" : ""} ${had.includes(k) ? "had" : ""}"><i>${e}</i>${n}</button>`).join("")}</div>
        <button class="pay ${cart.length ? "" : "off"}" data-do="pay">🧾 ${cart.length ? cart.length + "개 계산하기" : "골라 주세요"}</button>
        <div class="note">게임 속 가게라 계산은 무료예요. 산 건 돗자리 '먹기'에서 꺼내 먹어요.</div></div>
    </div>`;
  }
  function rmHTML() {
    if (!rm) return `<b>🍜 한강라면 끓이기 <small>은박 그릇 + 즉석 조리기</small></b>
      <div class="step">한강 편의점의 명물! 라면을 골라 볼까요?</div>
      <div class="opts">${NOODLE.map(([k, e, n]) => `<button data-do="noodle" data-v="${k}"><i>${e}</i>${n}</button>`).join("")}</div>`;
    const N = NOODLE.find(x => x[0] === rm.k), tops = rm.tops.map(t => TOP.find(x => x[0] === t)[1]).join("");
    const mach = `<div class="mach"><canvas class="rmCv"></canvas><div class="lcd">${rm.st === "boil" ? "⏱ " + rm.left + "s" : rm.st === "ready" ? "READY" : rm.st === "stir" || rm.st === "done" ? "DONE" : "-- --"}</div>
      ${rm.st === "done" ? "" : `<button class="btn ${rm.st === "ready" ? "" : "off"}" data-do="start">조리</button>`}</div>`;
    if (rm.st === "bowl") return `<b>🍜 ${N[2]} <small>1/4</small></b>${mach}<div class="step">봉지를 뜯어 은박 그릇에 넣고 기계에 올려요</div><button class="go" data-do="bowl">🥣 그릇에 넣어 올리기</button>`;
    if (rm.st === "ready") return `<b>🍜 ${N[2]} <small>2/4</small></b>${mach}<div class="step">빨간 <b>조리</b> 버튼을 눌러요. 물이 나오고 바로 끓어요</div>`;
    if (rm.st === "boil") return `<b>🍜 끓는 중 <small>3/4 · 토핑을 넣어도 돼요</small></b>${mach}<div class="bar"><i style="width:${(1 - rm.left / BOIL) * 100}%"></i></div>
      <div class="opts t4">${TOP.map(([k, e, n]) => `<button data-do="top" data-v="${k}" class="${rm.tops.includes(k) ? "sel" : ""}"><i>${e}</i>${n}</button>`).join("")}</div>`;
    if (rm.st === "stir") return `<b>🍜 다 끓었어요 <small>4/4</small></b>${mach}<div class="step">젓가락으로 휘휘 저어요 🥢 (${rm.stir}/5)</div><button class="go" data-do="stir">🥢 젓기</button>`;
    return `<div class="done">${mach}<b style="font-size:17px">${tops ? tops + " 올린 " : ""}${N[2]} 완성!</b>
      <div class="step">한강 보면서 먹으면 더 맛있어요</div>
      <button class="go" data-do="eat">🧺 돗자리로 들고 가기</button><button class="back" style="background:none;color:#a9bac6" data-do="again">한 그릇 더 끓이기</button>
      <div class="sup">편의점이 마음에 들었다면 <a data-do="sup">💛 한강 응원하기</a></div></div>`;
  }
  function rmRender() { const el = $("stRm"); if (el) el.innerHTML = rmHTML(); anim(); }
  // ---------- 🍜 라면 기계 그림(캔버스): 은박 그릇·국물·면·토핑·김·물줄기·젓가락 ----------
  let raf = 0, bub = [], stm = [];
  function anim() { cancelAnimationFrame(raf); const cv = document.querySelector("#stRm .rmCv"); if (!cv || !rm) return;
    const loop = () => { if (!H.isOpen() || !rm || !cv.isConnected) return; drawMach(cv, performance.now() / 1000); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); }
  function drawMach(cv, t) {
    const DPR = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, Hh = cv.clientHeight; if (cv.width !== W * DPR) { cv.width = W * DPR; cv.height = Hh * DPR; }
    const c = cv.getContext("2d"); c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, W, Hh);
    const N = NOODLE.find(x => x[0] === rm.k), st = rm.st, done = st === "done", prog = st === "boil" ? 1 - rm.left / BOIL : st === "bowl" || st === "ready" ? 0 : 1, hot = st === "boil" || st === "stir" || done;
    const cx = W / 2, by = done ? Hh * .66 : Hh * .72, bw = done ? 78 : 60, bh = done ? 30 : 24;   // 그릇 바닥 중심·반지름
    // 기계 몸체(스테인리스) + 상판 + 노즐 + 물받이 그릴
    let g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, "#515c66"); g.addColorStop(.5, "#6c7883"); g.addColorStop(1, "#4b555e"); c.fillStyle = g; c.fillRect(0, 0, W, Hh);
    g = c.createLinearGradient(0, 0, 0, Hh); g.addColorStop(0, "rgba(255,255,255,.08)"); g.addColorStop(.5, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(0,0,0,.25)"); c.fillStyle = g; c.fillRect(0, 0, W, Hh);
    if (!done) { c.fillStyle = "#39424a"; c.fillRect(0, 0, W, 44); c.fillStyle = "rgba(255,255,255,.06)"; c.fillRect(0, 43, W, 1);
      g = c.createLinearGradient(cx - 12, 0, cx + 12, 0); g.addColorStop(0, "#8e979e"); g.addColorStop(.5, "#e3e8ec"); g.addColorStop(1, "#7f888f"); c.fillStyle = g; c.beginPath(); c.roundRect ? c.roundRect(cx - 11, 30, 22, 30, [0, 0, 6, 6]) : c.rect(cx - 11, 30, 22, 30); c.fill();   // 노즐
      c.fillStyle = "#2f373e"; c.fillRect(cx - 7, 58, 14, 4);
      c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(0, Hh - 26, W, 26); c.strokeStyle = "rgba(255,255,255,.14)"; c.lineWidth = 1; for (let x = 10; x < W; x += 9) { c.beginPath(); c.moveTo(x, Hh - 22); c.lineTo(x, Hh - 4); c.stroke(); }   // 물받이 그릴
      // 열판(끓을 때 붉게)
      const glow = hot ? .6 + .4 * Math.sin(t * 3) : 0; if (glow) { g = c.createRadialGradient(cx, by + 4, 0, cx, by + 4, 90); g.addColorStop(0, `rgba(255,90,40,${.35 * glow})`); g.addColorStop(1, "rgba(255,90,40,0)"); c.fillStyle = g; c.fillRect(0, 0, W, Hh); }
      c.fillStyle = "#1a1f24"; c.beginPath(); c.ellipse(cx, by + 6, bw + 26, 10, 0, 0, 7); c.fill(); c.strokeStyle = hot ? `rgba(255,110,60,${.6 + .4 * glow})` : "#6e3a2e"; c.lineWidth = 2.5; c.beginPath(); c.ellipse(cx, by + 6, bw + 20, 7, 0, 0, 7); c.stroke(); }
    // 물줄기(처음 6초)
    if (st === "boil" && rm.left > BOIL - 6) { const p = (BOIL - rm.left) / 6; c.strokeStyle = "rgba(170,220,255,.85)"; c.lineWidth = 3; c.beginPath(); c.moveTo(cx, 62); c.lineTo(cx, by - bh - 4); c.stroke(); c.fillStyle = "rgba(190,230,255,.6)"; for (let i = 0; i < 5; i++) { const a = (t * 2 + i) % 1; c.beginPath(); c.arc(cx + (i - 2) * 7 * a, by - bh - 2 - a * 12, 1.6 + a, 0, 7); c.fill(); } }
    if (st === "bowl") {   // 아직 봉지째: 기계 옆에 라면 봉지
      c.save(); c.translate(cx + 2, by - 24); c.rotate(-.12); c.fillStyle = N[0] === "red" ? "#c8321f" : N[0] === "mild" ? "#e4b35a" : "#2b1d16"; c.beginPath(); c.roundRect ? c.roundRect(-30, -22, 60, 44, 6) : c.rect(-30, -22, 60, 44); c.fill(); c.fillStyle = "rgba(255,255,255,.9)"; c.font = "700 11px system-ui, sans-serif"; c.textAlign = "center"; c.fillText(N[2], 0, 4); c.fillStyle = "rgba(255,255,255,.25)"; c.fillRect(-30, -22, 60, 6); c.fillRect(-30, 16, 60, 6); c.restore();
      c.font = "20px sans-serif"; c.textAlign = "center"; c.fillText("🥣", cx - 54, by - 6); return; }
    // 은박 그릇(위 타원 + 몸통, 구김 선)
    const topY = by - bh * 1.9, rimW = bw * 1.25;
    g = c.createLinearGradient(cx - bw, 0, cx + bw, 0); g.addColorStop(0, "#9aa4ac"); g.addColorStop(.35, "#e6ebee"); g.addColorStop(.7, "#b9c2c8"); g.addColorStop(1, "#8d979f"); c.fillStyle = g;
    c.beginPath(); c.moveTo(cx - rimW, topY); c.lineTo(cx - bw, by); c.quadraticCurveTo(cx, by + bh * .5, cx + bw, by); c.lineTo(cx + rimW, topY); c.closePath(); c.fill();
    c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 1; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(cx + i * rimW * .28, topY + 2); c.lineTo(cx + i * bw * .28, by - 1); c.stroke(); }
    // 그릇 안(국물 + 면 + 토핑): 안쪽 타원
    const inW = rimW - 3, inH = bh * .62, fill = Math.min(1, prog * 1.6);
    c.fillStyle = "#6f7980"; c.beginPath(); c.ellipse(cx, topY, inW, inH, 0, 0, 7); c.fill();
    if (fill <= 0) { c.fillStyle = "#e9c56a"; c.beginPath(); c.ellipse(cx, topY, inW * .72, inH * .72, 0, 0, 7); c.fill(); c.strokeStyle = "#c99a3c"; c.lineWidth = 1; for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(cx - inW * .6, topY + i * inH * .15); c.lineTo(cx + inW * .6, topY + i * inH * .15); c.stroke(); } }   // 마른 면 블록
    else {
      const col = N[0] === "red" ? ["#e24a2a", "#a3261b"] : N[0] === "mild" ? ["#f0d08a", "#c9a35a"] : ["#3b2518", "#1f130c"];
      g = c.createRadialGradient(cx - inW * .2, topY - inH * .3, 2, cx, topY, inW); g.addColorStop(0, col[0]); g.addColorStop(1, col[1]); c.fillStyle = g; c.globalAlpha = .55 + .45 * fill; c.beginPath(); c.ellipse(cx, topY, inW * (.75 + .25 * fill), inH * (.75 + .25 * fill), 0, 0, 7); c.fill(); c.globalAlpha = 1;
      // 면(구불구불): 끓을수록 풀어짐
      c.strokeStyle = N[0] === "black" ? "#d9b26a" : "#f6d47a"; c.lineWidth = 2.2; c.lineCap = "round"; const loose = Math.min(1, prog * 1.3);
      for (let i = 0; i < 7; i++) { c.beginPath(); for (let u = 0; u <= 1; u += .1) { const X = cx - inW * .68 + u * inW * 1.36, Y = topY + (i - 3) * inH * .25 * (.5 + .5 * loose) + Math.sin(u * 9 + i * 1.7 + (st === "stir" ? rm.stir * 2 : t * (hot ? 1.5 : 0))) * inH * .22 * loose; u ? c.lineTo(X, Y) : c.moveTo(X, Y); } c.stroke(); }
      // 기포(끓는 중)
      if (st === "boil" && prog > .15) { if (Math.random() < .35) bub.push({ x: (Math.random() - .5) * inW * 1.3, y: (Math.random() - .5) * inH * 1.2, r: 1 + Math.random() * 2.2, a: 0 }); bub = bub.filter(b => (b.a += .05) < 1); c.fillStyle = "rgba(255,255,255,.55)"; for (const b of bub) { c.beginPath(); c.arc(cx + b.x, topY + b.y, b.r * (1 - b.a * .5), 0, 7); c.fill(); } }
      // 토핑(이모지)
      const tops = rm.tops.map(k => TOP.find(x => x[0] === k)[1]); c.font = `${done ? 20 : 15}px sans-serif`; c.textAlign = "center"; tops.forEach((e, i) => c.fillText(e, cx + (i - (tops.length - 1) / 2) * (done ? 26 : 20), topY + (done ? 7 : 5)));
      // 그릇 테두리 하이라이트
      c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1.5; c.beginPath(); c.ellipse(cx, topY, inW + 1, inH + 1, 0, 0, 7); c.stroke();
    }
    // 젓가락(저을 때·완성)
    if (st === "stir" || done) { const ang = -.5 + (st === "stir" ? rm.stir * .9 : .6); c.save(); c.translate(cx + 10, topY - 4); c.rotate(ang * .15); c.strokeStyle = "#8a5a2b"; c.lineWidth = 3; c.lineCap = "round"; for (const dx of [-3, 4]) { c.beginPath(); c.moveTo(dx, 0); c.lineTo(dx + 26, -48); c.stroke(); } c.restore();
      if (st === "stir") { c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 1.2; c.beginPath(); c.ellipse(cx, topY, inW * .5, inH * .5, 0, rm.stir * 1.1, rm.stir * 1.1 + 2.2); c.stroke(); } }
    // 김(뜨거울 때)
    if (hot) { if (Math.random() < .25) stm.push({ x: (Math.random() - .5) * rimW * 1.2, y: 0, r: 4 + Math.random() * 5, a: 0, dx: (Math.random() - .5) * .4 }); stm = stm.filter(p => (p.a += .012) < 1);
      for (const p of stm) { c.fillStyle = `rgba(255,255,255,${.28 * (1 - p.a)})`; c.beginPath(); c.arc(cx + p.x + Math.sin(p.a * 6) * 6 + p.dx * p.a * 40, topY - 6 - p.a * 70, p.r * (1 + p.a * 1.6), 0, 7); c.fill(); } }
    if (done) { c.font = "16px sans-serif"; c.textAlign = "center"; for (let i = 0; i < 4; i++) { const a = (t * .8 + i / 4) % 1; c.globalAlpha = Math.sin(a * Math.PI); c.fillText("✨", cx + Math.cos(i * 1.6 + t) * (rimW + 28), topY - 30 - a * 20 + Math.sin(i * 2.1) * 20); } c.globalAlpha = 1; }
  }
  function act(d, v) {
    if (d === "close") return close();
    if (d === "pick") { cart = cart.includes(v) ? cart.filter(x => x !== v) : [...cart, v]; return render(); }
    if (d === "pay") { if (!cart.length) return; addBag(cart); const n = cart.length, first = cart[0]; cart = []; render(); opt.toast(`🧾 ${n}개 샀어요! 돗자리 '먹기'에서 꺼내 먹어요`, 3000); if (n === 1 && opt.eat) opt.eat(first, true); return; }
    if (d === "noodle") { rm = { k: v, st: "bowl", tops: [], stir: 0, left: BOIL }; return rmRender(); }
    if (d === "bowl") { rm.st = "ready"; return rmRender(); }
    if (d === "start") { rm.st = "boil"; rm.left = BOIL; rm.end = Date.now() + BOIL * 1000; clearInterval(tick); tick = setInterval(boil, 1000); return rmRender(); }
    if (d === "top") { rm.tops = rm.tops.includes(v) ? rm.tops.filter(x => x !== v) : [...rm.tops, v].slice(-3); return rmRender(); }
    if (d === "stir") { rm.stir++; if (rm.stir >= 5) { rm.st = "done"; opt.send({ t: "rmDone" }); addBag(["ramen"]); } return rmRender(); }
    if (d === "eat") { close(); if (opt.closeBusk) opt.closeBusk(); if (opt.eat) opt.eat("ramen"); rm = null; return; }
    if (d === "again") { rm = null; return rmRender(); }
    if (d === "sup") { close(); if (opt.openSup) opt.openSup(); }
  }
  function boil() {
    if (!rm || rm.st !== "boil") return clearInterval(tick);
    rm.left = Math.max(0, Math.ceil((rm.end - Date.now()) / 1000));
    if (!rm.left) { clearInterval(tick); rm.st = "stir"; if ($("stWrap").classList.contains("on")) rmRender(); return; }
    const box = $("stRm"); if (!box) return;   // 버튼은 그대로 두고 숫자·막대만 바꿈(누르는 중에 버튼이 바뀌지 않게)
    const l = box.querySelector(".lcd"), b = box.querySelector(".bar i");
    if (l) l.textContent = "⏱ " + rm.left + "s"; if (b) b.style.width = (1 - rm.left / BOIL) * 100 + "%";
  }
  function open() { $("stWrap").classList.add("on"); render(); $("stWrap").scrollTop = 0; anim(); }
  H._dbgFinish = () => { if (rm && rm.st === "boil") { rm.end = Date.now(); boil(); } };
  function close() { $("stWrap").classList.remove("on"); }

  H.init = o => { opt = o; build(); };
  H.open = open; H.isOpen = () => $("stWrap") && $("stWrap").classList.contains("on");
  H.bag = bag; H.items = ITEMS;
  H.rmN = () => rmN;
  H.onMsg = m => {
    if (m.t === "init" && m.rmN != null) rmN = m.rmN;
    else if (m.t === "rmN") { rmN = m.n; if (m.nick && opt.toast && !H.isOpen()) opt.toast(`🍜 ${m.nick}님이 한강라면을 끓였어요 (오늘 ${m.n}그릇)`, 2600); }
  };
})();
