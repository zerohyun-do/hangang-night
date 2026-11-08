// 🏮 79차 한강 밤도깨비 야시장 — 01(index.html)과 02(3d.html)가 같이 쓰는 파일.
// 한강 공원 밤에 열리는 야시장 골목 느낌: 초롱 아래 먹거리 가게 6곳 + 소품 가게 구경(하루 기념품 하나).
// 거슬리지 않게: 소리·전체 알림 없음, 내가 열었을 때만. 게임 속 가게라 값은 없음(유료 판매 없음).
// 산 먹거리 → 오늘 '내 봉지'(hn-bag) → 돗자리 '먹기'. 기념품은 폰에만(hn-souv). 서버: mk{k}(숫자만)
(function () {
  const H = window.HNMarket = {};
  const STALLS = [
    ["dakkochi", "🍡", "닭꼬치", "숯불에 굽는 데리야끼 닭꼬치", "🧑‍🍳", "불 맛 제대로 입혀 줄게요", 5, "#e0743a"],
    ["takoyaki", "🐙", "타코야끼", "가쓰오부시가 춤추는 여덟 알", "👩‍🍳", "동글동글 굴리는 중이에요", 6, "#c9874a"],
    ["tornado", "🥔", "회오리감자", "길게 돌려 깎아 바삭하게", "🧑‍🍳", "치즈 가루 듬뿍 뿌려 줄까요?", 5, "#e8b84a"],
    ["crepe", "🌯", "크레페", "생크림 + 딸기, 종이에 돌돌", "👨‍🍳", "얇게 펴서 금방 말아요", 5, "#e895a8"],
    ["tanghulu", "🍭", "딸기 탕후루", "반짝이는 설탕 옷", "👩‍🍳", "식으면 바삭해요, 조심!", 4, "#e04b5a"],
    ["lemonade", "🍋", "레모네이드", "직접 짠 레몬, 얼음 동동", "🧑‍🍳", "시원하게 한 잔 말아 줄게요", 4, "#f2d14a"],
  ];
  const SOUV = [["🔑", "한강 키링"], ["🌙", "달 모양 배지"], ["🦆", "오리배 미니 자석"], ["🎐", "풍경 소리 장식"], ["🌉", "다리 엽서"], ["🧸", "곰 인형 열쇠고리"], ["🌸", "벚꽃 책갈피"], ["🕯", "작은 향초"], ["📿", "구슬 팔찌"], ["🎈", "미니 풍선 장식"], ["🖼", "야경 엽서"], ["⭐", "별 스티커"]];
  const $ = id => document.getElementById(id);
  const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const ld = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch { return d; } };
  const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const bag = () => { const b = ld("hn-bag", null); return b && b.date === kst() && Array.isArray(b.items) ? b.items : []; };
  const addBag = id => { const it = bag(); if (!it.includes(id)) it.push(id); sv("hn-bag", { date: kst(), items: it }); if (opt.bagChanged) opt.bagChanged(); };
  let opt = {}, cook = null, tick = null, view = "food";
  const F = 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  const css = `
  #mkWrap { position: fixed; inset: 0; z-index: 10; display: none; overflow: auto; background: radial-gradient(130% 60% at 50% 0%, #3a1b2a 0%, #1a0f1c 55%, #0d0910 100%); color: #fbeedd; font: 14px/1.45 ${F}; user-select: none; -webkit-user-select: none; }
  #mkWrap.on { display: block; } body.parkOn #mkWrap, body.tripOn #mkWrap { z-index: 60; }
  #mkWrap .in { max-width: 540px; margin: 0 auto; padding: calc(max(12px, env(safe-area-inset-top)) + 4px) 14px calc(max(16px, env(safe-area-inset-bottom)) + 12px); display: flex; flex-direction: column; gap: 12px; }
  #mkWrap button { all: unset; cursor: pointer; box-sizing: border-box; text-align: center; }
  #mkWrap .lan { position: relative; height: 34px; margin: -4px -14px 0; overflow: hidden; }
  #mkWrap .lan::before { content: ""; position: absolute; left: 0; right: 0; top: 4px; height: 18px; border-bottom: 1px solid rgba(255,220,180,.25); border-radius: 0 0 50% 50%; }
  #mkWrap .lan i { position: absolute; top: 12px; width: 13px; height: 17px; border-radius: 6px; background: radial-gradient(circle at 50% 40%, #ffd08a, #e0582f 70%); box-shadow: 0 0 12px rgba(255,140,70,.55); animation: mkSw 5s ease-in-out infinite; transform-origin: 50% -6px; }
  @keyframes mkSw { 50% { transform: rotate(4deg); } }
  #mkWrap .hd { display: flex; gap: 8px; align-items: center; } #mkWrap .ttl { flex: 1; font-weight: 800; font-size: 18px; letter-spacing: -.3px; } #mkWrap .ttl small { display: block; font-weight: 600; font-size: 11.5px; color: #d6b9a8; }
  #mkWrap .back { padding: 10px 13px; border-radius: 999px; background: rgba(255,255,255,.1); font-weight: 700; font-size: 13px; white-space: nowrap; }
  #mkWrap .tabs { display: flex; gap: 6px; } #mkWrap .tabs button { flex: 1; padding: 9px; border-radius: 999px; background: rgba(255,255,255,.06); font-size: 13px; font-weight: 700; color: #e8d4c4; } #mkWrap .tabs button.sel { background: rgba(255,180,120,.2); color: #ffe0c0; }
  #mkWrap .alley { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  #mkWrap .stall { position: relative; padding: 0 0 10px; border-radius: 14px; overflow: hidden; background: #22161f; border: 1px solid rgba(255,200,160,.14); text-align: left; }
  #mkWrap .stall .awn { height: 16px; background: repeating-linear-gradient(90deg, var(--c) 0 14px, #f4e7d6 14px 28px); opacity: .9; } #mkWrap .stall .glow { position: absolute; left: 0; right: 0; top: 16px; height: 50px; background: radial-gradient(60% 100% at 50% 0%, rgba(255,200,130,.22), transparent); pointer-events: none; }
  #mkWrap .stall .row { display: flex; gap: 8px; align-items: center; padding: 10px 10px 0; } #mkWrap .stall i { font-style: normal; font-size: 30px; } #mkWrap .stall b { display: block; font-size: 14px; } #mkWrap .stall small { display: block; font-size: 11px; color: #cfb4a3; line-height: 1.3; }
  #mkWrap .stall.had b::after { content: " ✓"; color: #9ee6a8; font-size: 12px; }
  #mkWrap .cook { padding: 16px; border-radius: 16px; background: rgba(0,0,0,.32); display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
  #mkWrap .cook .face { font-size: 46px; line-height: 1; } #mkWrap .cook .food { font-size: 40px; animation: mkBob .6s infinite alternate ease-in-out; } @keyframes mkBob { to { transform: translateY(-4px); } }
  #mkWrap .say { padding: 9px 12px; border-radius: 14px; background: #fff3e6; color: #4a2618; font-size: 13.5px; font-weight: 600; }
  #mkWrap .bar { width: 100%; height: 7px; border-radius: 4px; background: rgba(255,255,255,.1); overflow: hidden; } #mkWrap .bar i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #ffc58a, #ff7a4a); transition: width .25s linear; }
  #mkWrap .go { padding: 12px; border-radius: 999px; background: linear-gradient(180deg, #ffcf94, #f2a061); color: #3a1800; font-weight: 800; font-size: 15px; width: 100%; }
  #mkWrap .ghost { padding: 8px; color: #d6b9a8; font-size: 13px; width: 100%; }
  #mkWrap .note { font-size: 12px; color: #bfa392; text-align: center; } #mkWrap .note a { color: #ffcf94; font-weight: 700; text-decoration: underline; cursor: pointer; }
  #mkWrap .souv { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; } #mkWrap .souv button { padding: 10px 4px; border-radius: 12px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); display: grid; gap: 3px; }
  #mkWrap .souv button i { font-style: normal; font-size: 26px; } #mkWrap .souv button small { font-size: 10.5px; color: #d6b9a8; } #mkWrap .souv button.have { border-color: rgba(158,230,168,.45); } #mkWrap .souv button.today { background: rgba(255,200,140,.18); border-color: rgba(255,200,140,.6); }
  #mkWrap .souv button:disabled { cursor: default; }`;
  function build() {
    if ($("mkWrap")) return;
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    const w = document.createElement("div"); w.id = "mkWrap"; w.setAttribute("role", "dialog"); w.setAttribute("aria-label", "한강 밤도깨비 야시장"); document.body.appendChild(w);
    w.addEventListener("click", e => { const b = e.target.closest("[data-do]"); if (b) act(b.dataset.do, b.dataset.v); });
  }
  const st = k => STALLS.find(x => x[0] === k);
  const souv = () => ld("hn-souv", { have: [], day: "", today: null });
  function render() {
    const had = bag(), lan = Array.from({ length: 11 }, (_, i) => `<i style="left:${4 + i * 9}%;animation-delay:${-i * .7}s"></i>`).join("");
    let body = "";
    if (cook) {
      const m = st(cook.k);
      body = !cook.done ? `<div class="cook"><div class="face">${m[4]}</div><div class="say">${m[5]}</div><div class="food">${m[1]}</div><div class="bar"><i id="mkBar" style="width:${cook.p * 100}%"></i></div></div>`
        : `<div class="cook"><div class="food" style="animation:none;font-size:56px">${m[1]}</div><b style="font-size:17px">${m[2]} 나왔어요!</b><div class="note">"한강 바람 맞으면서 먹으면 더 맛있어요"</div>
          <button class="go" data-do="eat">🧺 돗자리로 들고 가기</button><button class="ghost" data-do="more">골목 더 구경하기</button>
          <div class="note">가게 사장님(만든 사람)이 마음에 들었다면 <a data-do="sup">💛 응원하기</a></div></div>`;
    } else if (view === "food") {
      body = `<div class="alley">${STALLS.map(([k, e, n, d, , , , c]) => `<button class="stall ${had.includes(k) ? "had" : ""}" style="--c:${c}" data-do="buy" data-v="${k}"><div class="awn"></div><div class="glow"></div><div class="row"><i>${e}</i><div><b>${n}</b><small>${d}</small></div></div></button>`).join("")}</div>
        <div class="note">게임 속 야시장이라 값은 없어요. 산 건 돗자리 '먹기'의 🛍 사 온 것에 담겨요.</div>`;
    } else {
      const S = souv(), today = S.day === kst();
      body = `<div class="say" style="background:#2a1d26;color:#f1dccb">🧶 소품 가게: 구경하다 마음에 드는 것 <b>하루에 하나</b>를 기념품으로 가져가요. 모은 건 폰에만 남아요.</div>
        <div class="souv">${SOUV.map(([e, n], i) => { const have = S.have.includes(i), t = today && S.today === i; return `<button class="${t ? "today" : have ? "have" : ""}" data-do="souv" data-v="${i}" ${today && !t ? "" : ""}><i>${e}</i><small>${n}${t ? " · 오늘" : have ? " ✓" : ""}</small></button>`; }).join("")}</div>
        <div class="note">${today ? "오늘 기념품은 이미 골랐어요. 내일 또 와요 🌙" : "하나를 눌러 오늘의 기념품으로"} · 모은 기념품 ${S.have.length}/${SOUV.length}</div>`;
    }
    $("mkWrap").innerHTML = `<div class="in"><div class="lan">${lan}</div>
      <div class="hd"><div class="ttl">🏮 한강 밤도깨비 야시장<small>초롱 아래 먹거리 골목 · 천천히 구경해요</small></div><button class="back" data-do="close">✕ 닫기</button></div>
      ${cook ? "" : `<div class="tabs"><button class="${view === "food" ? "sel" : ""}" data-do="tab" data-v="food">🍢 먹거리 골목</button><button class="${view === "souv" ? "sel" : ""}" data-do="tab" data-v="souv">🧶 소품 구경</button></div>`}
      ${body}</div>`;
  }
  function act(d, v) {
    if (d === "close") return close();
    if (d === "tab") { view = v; return render(); }
    if (d === "buy") { const m = st(v); if (!m) return; cook = { k: v, p: 0, t0: Date.now(), dur: m[6] * 1000, done: false }; clearInterval(tick); tick = setInterval(step, 250); render(); $("mkWrap").scrollTop = 0; return; }
    if (d === "eat") { const k = cook && cook.k; cook = null; close(); if (k && opt.eat) opt.eat(k, !!(window.HNPark && HNPark.isOpen)); return; }
    if (d === "more") { cook = null; return render(); }
    if (d === "souv") { const S = souv(); if (S.day === kst()) return; const i = +v; S.day = kst(); S.today = i; if (!S.have.includes(i)) S.have.push(i); sv("hn-souv", S); return render(); }
    if (d === "sup") { close(); if (opt.openSup) opt.openSup(); }
  }
  function step() {
    if (!cook || cook.done) return clearInterval(tick);
    cook.p = Math.min(1, (Date.now() - cook.t0) / cook.dur);
    if (cook.p >= 1) { cook.done = true; clearInterval(tick); addBag(cook.k); if (opt.send) opt.send({ t: "mk", k: cook.k }); render(); return; }
    const b = $("mkBar"); if (b) b.style.width = cook.p * 100 + "%"; else render();
  }
  function open() { build(); if (window.HNMenu && HNMenu.close) HNMenu.close(); $("mkWrap").classList.add("on"); render(); $("mkWrap").scrollTop = 0; }
  function close() { const w = $("mkWrap"); if (w) w.classList.remove("on"); }
  H.init = o => { opt = o; build(); };
  H.open = open; H.close = close; H.isOpen = () => !!($("mkWrap") && $("mkWrap").classList.contains("on"));
  H.onMsg = () => {};
  H.stalls = STALLS;
})();
