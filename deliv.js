// 🛵 79차 한강 치킨 배달 — 01(index.html)과 02(3d.html)가 같이 쓰는 파일.
// 한강 공원 배달존에서 받아 오는 치킨. 쉬러 온 사람에게 거슬리지 않게: 소리·전체 알림 없음, 내가 연 창과 내 화면 구석의 작은 표시만.
// 주문 → 확인 → 조리 → 라이더 이동(약 1분) → 배달존 도착 → 받아서 돗자리로 → '먹기'의 🍗 치킨(술은 없음: 콜라·사이다로 짠).
// 게임 속 배달이라 값은 없음. 주문 상태는 폰에만(hn-dlv), 받은 것은 오늘 '내 봉지'(hn-bag). 서버: dv(받은 수 숫자만)
(function () {
  const H = window.HNDeliv = {};
  const MENU = [["fried", "🍗", "후라이드", "바삭한 기본, 한강엔 역시"], ["yangnyeom", "🌶", "양념", "달콤 매콤 빨간 양념"], ["half", "🍗", "반반", "후라이드 반 + 양념 반"], ["soy", "🍯", "간장", "짭조름한 간장 마늘"], ["boneless", "🍖", "순살", "뼈 없이 한 입씩"]];
  const DRINK = [["cola", "🥤", "콜라"], ["cider", "🫧", "사이다"], ["zero", "🥤", "제로 콜라"], ["none", "🚫", "음료 없이"]];
  const STEPS = [[0, "주문 확인", "가게에서 주문을 받았어요"], [.12, "튀기는 중", "기름 온도 딱 좋을 때 바삭하게"], [.5, "라이더 출발", "한강 공원 쪽으로 가는 중"], [.88, "거의 다 왔어요", "배달존 앞이에요"]];
  const $ = id => document.getElementById(id);
  const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const ld = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch { return d; } };
  const sv = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const bag = () => { const b = ld("hn-bag", null); return b && b.date === kst() && Array.isArray(b.items) ? b.items : []; };
  const addBag = id => { const it = bag(); if (!it.includes(id)) it.push(id); sv("hn-bag", { date: kst(), items: it }); if (opt.bagChanged) opt.bagChanged(); };
  let opt = {}, pick = { m: "fried", d: "cola" }, tick = null;
  let O = ld("hn-dlv", null);   // 진행 중 주문 { t0, dur, m, d }
  const prog = () => O ? Math.min(1, (Date.now() - O.t0) / O.dur) : 0;
  const F = 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  const css = `
  #dvWrap { position: fixed; inset: 0; z-index: 10; display: none; overflow: auto; background: radial-gradient(120% 70% at 50% 0%, #1f2a4a 0%, #0f1428 60%, #0a0d1c 100%); color: #f1ead9; font: 14px/1.45 ${F}; user-select: none; -webkit-user-select: none; }
  #dvWrap.on { display: block; } body.parkOn #dvWrap, body.tripOn #dvWrap { z-index: 60; }
  #dvWrap .in { max-width: 520px; margin: 0 auto; padding: calc(max(12px, env(safe-area-inset-top)) + 4px) 14px calc(max(16px, env(safe-area-inset-bottom)) + 12px); display: flex; flex-direction: column; gap: 12px; }
  #dvWrap button { all: unset; cursor: pointer; box-sizing: border-box; text-align: center; }
  #dvWrap .hd { display: flex; gap: 8px; align-items: center; } #dvWrap .ttl { flex: 1; font-weight: 800; font-size: 17px; } #dvWrap .ttl small { display: block; font-weight: 600; font-size: 11.5px; color: #aab3d4; }
  #dvWrap .back { padding: 10px 13px; border-radius: 999px; background: rgba(255,255,255,.1); font-weight: 700; font-size: 13px; white-space: nowrap; }
  #dvWrap .card { padding: 12px; border-radius: 16px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); }
  #dvWrap .card > b { display: block; font-size: 13px; color: #ffd9a0; margin-bottom: 8px; }
  #dvWrap .gr { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; } #dvWrap .gr4 { grid-template-columns: repeat(4, 1fr); }
  #dvWrap .op { padding: 10px 8px; border-radius: 12px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); display: grid; grid-template-columns: auto 1fr; gap: 1px 8px; text-align: left; align-items: center; }
  #dvWrap .op i { grid-row: span 2; font-style: normal; font-size: 26px; } #dvWrap .op b { font-size: 13.5px; } #dvWrap .op small { font-size: 11px; color: #aab3d4; line-height: 1.3; }
  #dvWrap .gr4 .op { grid-template-columns: 1fr; text-align: center; } #dvWrap .gr4 .op i { grid-row: auto; font-size: 22px; } #dvWrap .gr4 .op b { font-size: 12px; }
  #dvWrap .op.sel { background: rgba(255,200,120,.16); border-color: rgba(255,200,120,.6); }
  #dvWrap .go { padding: 13px; border-radius: 999px; background: linear-gradient(180deg, #ffd38a, #f0a94e); color: #3a2000; font-weight: 800; font-size: 15px; width: 100%; }
  #dvWrap .ghost { padding: 8px; color: #aab3d4; font-size: 13px; width: 100%; }
  #dvWrap .note { font-size: 12px; color: #9aa3c4; text-align: center; } #dvWrap .note a { color: #ffd38a; font-weight: 700; text-decoration: underline; cursor: pointer; }
  #dvWrap .map { position: relative; height: 120px; border-radius: 14px; overflow: hidden; background: linear-gradient(180deg, #13204a 0 42%, #23283a 42% 48%, #142418 48%); }
  #dvWrap .map .rv { position: absolute; left: 0; right: 0; top: 18%; height: 2px; background: rgba(160,190,255,.25); }
  #dvWrap .map .rd { position: absolute; left: 6%; right: 6%; top: 74%; height: 3px; border-radius: 2px; background: repeating-linear-gradient(90deg, rgba(255,255,255,.25) 0 8px, transparent 8px 14px); }
  #dvWrap .map .shop, #dvWrap .map .zone, #dvWrap .map .bk { position: absolute; top: 74%; transform: translate(-50%, -100%); font-size: 22px; line-height: 1; } #dvWrap .map .shop { left: 6%; } #dvWrap .map .zone { left: 94%; }
  #dvWrap .map .bk { transition: left .9s linear; font-size: 24px; } #dvWrap .map small { position: absolute; top: 80%; font-size: 10.5px; color: #aab3d4; transform: translateX(-50%); white-space: nowrap; }
  #dvWrap .steps { display: grid; gap: 6px; margin-top: 10px; } #dvWrap .st { display: flex; gap: 8px; align-items: center; font-size: 13px; color: #6f789a; } #dvWrap .st i { font-style: normal; width: 18px; text-align: center; }
  #dvWrap .st.on { color: #f1ead9; } #dvWrap .st.on small { color: #aab3d4; } #dvWrap .st small { font-size: 11.5px; margin-left: auto; }
  #dvWrap .bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,.08); overflow: hidden; margin-top: 10px; } #dvWrap .bar i { display: block; height: 100%; background: linear-gradient(90deg, #ffd38a, #f0a94e); }
  #dvWrap .got { text-align: center; padding: 16px 12px; } #dvWrap .got .face { font-size: 54px; line-height: 1.1; } #dvWrap .got b { display: block; font-size: 17px; margin: 6px 0 2px; }
  #dvChip { position: fixed; left: 12px; top: calc(max(12px, env(safe-area-inset-top)) + 148px); z-index: 6; display: none; padding: 5px 11px; border-radius: 999px; background: rgba(14,18,40,.55); border: 1px solid rgba(255,255,255,.12); color: #e9e1d0;
    font: 600 12px ${F}; cursor: pointer; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
  #dvChip.on { display: block; } #dvChip.ok { border-color: rgba(255,200,120,.6); color: #ffe2b0; animation: dvSoft 3s ease-in-out infinite; } @keyframes dvSoft { 50% { box-shadow: 0 0 12px rgba(255,200,120,.35); } }
  body.parkOn #dvChip, body.tripOn #dvChip { z-index: 61; }`;
  function build() {
    if ($("dvWrap")) return;
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    const w = document.createElement("div"); w.id = "dvWrap"; w.setAttribute("role", "dialog"); w.setAttribute("aria-label", "한강 치킨 배달"); document.body.appendChild(w);
    w.addEventListener("click", e => { const b = e.target.closest("[data-do]"); if (b) act(b.dataset.do, b.dataset.v); });
    const c = document.createElement("div"); c.id = "dvChip"; c.setAttribute("role", "button"); c.onclick = () => open(); document.body.appendChild(c);
  }
  const it = (L, k) => L.find(x => x[0] === k) || L[0];
  function render() {
    const w = $("dvWrap"); if (!w) return;
    const p = prog(), done = O && p >= 1;
    let body;
    if (!O) body = `
      <div class="card"><b>1. 치킨 고르기</b><div class="gr">${MENU.map(([k, e, n, d]) => `<button class="op ${pick.m === k ? "sel" : ""}" data-do="m" data-v="${k}"><i>${e}</i><b>${n}</b><small>${d}</small></button>`).join("")}</div></div>
      <div class="card"><b>2. 마실 것</b><div class="gr gr4">${DRINK.map(([k, e, n]) => `<button class="op ${pick.d === k ? "sel" : ""}" data-do="d" data-v="${k}"><i>${e}</i><b>${n}</b></button>`).join("")}</div>
        <div class="note" style="margin-top:8px">여긴 술 없이, 콜라·사이다로 옆 사람과 짠!</div></div>
      <div class="card"><b>3. 받는 곳</b><div style="font-size:13px">📍 가까운 한강공원 <b style="color:#ffd9a0">배달존</b> · 약 1분 뒤 도착하면 화면 구석에 작게 알려 줘요(소리 없음)</div></div>
      <button class="go" data-do="order">🛵 주문하기</button>
      <div class="note">게임 속 배달이라 값은 없어요. 받은 건 돗자리 '먹기'의 🛍 사 온 것에 담겨요.</div>`;
    else if (!done) {
      const si = STEPS.reduce((a, s, i) => p >= s[0] ? i : a, 0), m = it(MENU, O.m), d = it(DRINK, O.d), left = Math.max(0, Math.ceil((1 - p) * O.dur / 1000));
      body = `<div class="card"><b>🛵 ${m[2]} 치킨${O.d !== "none" ? " + " + d[2] : ""}</b>
        <div class="map"><div class="rv"></div><div class="rd"></div><div class="shop">🏪</div><small style="left:6%">가게</small><div class="zone">📍</div><small style="left:94%">배달존</small>
          <div class="bk" id="dvBk" style="left:${6 + 88 * Math.max(0, (p - .5) / .5)}%">${p < .5 ? "" : "🛵"}</div></div>
        <div class="steps">${STEPS.map((s, i) => `<div class="st ${i <= si ? "on" : ""}"><i>${i < si ? "✓" : i === si ? "●" : "○"}</i>${s[1]}<small>${i === si ? s[2] : ""}</small></div>`).join("")}</div>
        <div class="bar"><i id="dvBar" style="width:${p * 100}%"></i></div><div class="note" style="margin-top:6px" id="dvLeft">도착까지 약 ${left}초 · 창을 닫고 쉬고 있어도 돼요</div></div>
      <button class="ghost" data-do="close">닫고 기다리기</button><button class="ghost" data-do="cancel" style="font-size:12px;opacity:.7">주문 취소</button>`;
    } else {
      const m = it(MENU, O.m), d = it(DRINK, O.d);
      body = `<div class="card got"><div class="face">🛵🍗</div><b>배달존에 도착했어요</b><div class="note">"${m[2]} 치킨${O.d !== "none" ? "이랑 " + d[2] : ""} 나왔습니다. 맛있게 드세요!"</div></div>
      <button class="go" data-do="take">🧺 받아서 돗자리로</button>
      <div class="note">만든 사람이 마음에 들었다면 <a data-do="sup">💛 응원하기</a></div>`;
    }
    w.innerHTML = `<div class="in"><div class="hd"><div class="ttl">🛵 한강 치킨 배달<small>배달존에서 받아 오는 치킨 · 조용히 기다려요</small></div><button class="back" data-do="close">✕ 닫기</button></div>${body}</div>`;
  }
  function chip() {
    const c = $("dvChip"); if (!c) return;
    const open2 = $("dvWrap").classList.contains("on");
    if (!O || open2) { c.classList.remove("on"); return; }
    const p = prog();
    c.classList.add("on"); c.classList.toggle("ok", p >= 1);
    c.textContent = p >= 1 ? "🛵 배달존 도착 · 받기" : `🛵 ${Math.max(0, Math.ceil((1 - p) * O.dur / 1000))}초`;
  }
  function loop() {
    clearInterval(tick); if (!O) return chip();
    tick = setInterval(() => {
      if (!O) { clearInterval(tick); return chip(); }
      const w = $("dvWrap"), p = prog();
      if (w && w.classList.contains("on")) { const b = $("dvBar"); if (p >= 1 || !b) render(); else { b.style.width = p * 100 + "%"; const bk = $("dvBk"); if (bk) { bk.style.left = 6 + 88 * Math.max(0, (p - .5) / .5) + "%"; bk.textContent = p < .5 ? "" : "🛵"; } const l = $("dvLeft"); if (l) l.textContent = `도착까지 약 ${Math.max(0, Math.ceil((1 - p) * O.dur / 1000))}초 · 창을 닫고 쉬고 있어도 돼요`; const si = STEPS.reduce((a, s, i) => p >= s[0] ? i : a, 0); if (w.dataset.si != si) { w.dataset.si = si; render(); } } }
      chip(); if (p >= 1) clearInterval(tick);
    }, 1000);
  }
  function act(d, v) {
    if (d === "close") return close();
    if (d === "m") { pick.m = v; return render(); }
    if (d === "d") { pick.d = v; return render(); }
    if (d === "order") { O = { t0: Date.now(), dur: (55 + Math.random() * 30) * 1000, m: pick.m, d: pick.d }; sv("hn-dlv", O); render(); loop(); return; }
    if (d === "cancel") { O = null; sv("hn-dlv", null); render(); chip(); return; }
    if (d === "take") { const dr = O && O.d; O = null; sv("hn-dlv", null); addBag("chicken"); if (dr && dr !== "none") addBag("soda"); if (opt.send) opt.send({ t: "dv" }); close(); if (window.HNPark && HNPark.isOpen) { if (opt.eat) opt.eat("chicken", true); return; } if (opt.eat) opt.eat("chicken"); return; }
    if (d === "sup") { close(); if (opt.openSup) opt.openSup(); }
  }
  function open() { build(); if (window.HNMenu && HNMenu.close) HNMenu.close(); $("dvWrap").classList.add("on"); render(); $("dvWrap").scrollTop = 0; chip(); }
  function close() { const w = $("dvWrap"); if (w) w.classList.remove("on"); chip(); }
  H.init = o => { opt = o; build(); if (O && Date.now() - O.t0 > 3 * 3600e3) { O = null; sv("hn-dlv", null); } loop(); chip(); };   // 3시간 지난 주문은 버린다
  H.open = open; H.close = close; H.isOpen = () => !!($("dvWrap") && $("dvWrap").classList.contains("on"));
  H.onMsg = () => {};
  H.dbgFast = () => { if (O) { O.t0 = Date.now() - O.dur + 1500; sv("hn-dlv", O); loop(); } };
})();
