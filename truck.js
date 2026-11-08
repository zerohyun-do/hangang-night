// 🚚 한강 분식 트럭 — 01(index.html)과 02(3d.html)가 같이 쓰는 파일. 버스킹 거리 오른쪽의 포장마차 같은 트럭.
// 편의점(포장된 것을 골라 계산)과 달리 여기는 '주문하면 사장님이 바로 만들어 주는' 곳: 떡볶이·어묵·튀김·붕어빵·호떡·와플.
// 주문 → 조리(냄비가 끓고 김이 남, 5~7초) → "나왔습니다!" → 오늘 '내 봉지'(localStorage hn-bag, 편의점과 같은 봉지) → 돗자리에서 먹기.
// 게임 속 가게라 값은 없음. 서버: tk{k}(보냄) / tkN{n}(받음, 오늘 트럭 주문 수)
(function () {
  const H = window.HNTruck = {};
  const MENU = [["tteokbokki", "🥘", "떡볶이", "쫀득한 쌀떡 + 어묵, 국물 넉넉히", 7], ["oden", "🍢", "어묵 꼬치", "뜨끈한 국물 한 컵 서비스", 5], ["tempura", "🍤", "모둠 튀김", "김말이·새우·고구마, 떡볶이 국물에 콕", 6],
    ["bungeo", "🐟", "붕어빵", "팥 가득, 바삭한 꼬리부터", 6], ["hotteok", "🥞", "호떡", "꿀 흘러요, 종이컵에 쏙", 6], ["waffle", "🧇", "와플", "생크림 + 사과잼", 5]];
  const HELLO = ["어서 와요! 오늘 떡볶이 국물 잘 졸았어요", "버스킹 보다 출출하죠? 골라 봐요", "붕어빵 방금 구웠어요, 따끈해요", "추운 날엔 어묵 국물이 최고예요", "튀김은 떡볶이 국물에 찍어 먹어야 제맛!"];
  let opt = null, tkN = 0, cook = null, tick = null;
  const $ = id => document.getElementById(id);
  const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const bag = () => { try { const b = JSON.parse(localStorage.getItem("hn-bag") || "null"); return b && b.date === kst() && Array.isArray(b.items) ? b.items : []; } catch { return []; } };
  const addBag = id => { const it = bag(); if (!it.includes(id)) it.push(id); try { localStorage.setItem("hn-bag", JSON.stringify({ date: kst(), items: it })); } catch {} if (opt.bagChanged) opt.bagChanged(); };
  const F = 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  const css = `
  #tkWrap { position: fixed; inset: 0; z-index: 10; display: none; overflow: auto; background: radial-gradient(120% 70% at 50% 0%, #4a2412 0%, #1d0f08 60%, #120904 100%); color: #fff3e2; font: 14px/1.45 ${F}; user-select: none; -webkit-user-select: none; }
  #tkWrap.on { display: block; }
  #tkWrap .in { max-width: 540px; margin: 0 auto; padding: calc(max(12px, env(safe-area-inset-top)) + 4px) 14px calc(max(16px, env(safe-area-inset-bottom)) + 12px); display: flex; flex-direction: column; gap: 12px; }
  #tkWrap button { all: unset; cursor: pointer; box-sizing: border-box; text-align: center; }
  #tkWrap .hd { display: flex; gap: 8px; align-items: center; }
  #tkWrap .awn { flex: 1; position: relative; padding: 12px 14px 16px; border-radius: 16px 16px 6px 6px; background: repeating-linear-gradient(90deg, #d7322a 0 22px, #f7efe2 22px 44px); color: #3a1206; font-weight: 900; font-size: 17px; text-shadow: 0 1px 0 #fff; box-shadow: 0 6px 16px rgba(0,0,0,.35); }
  #tkWrap .awn small { display: block; font-weight: 700; font-size: 11.5px; }
  #tkWrap .awn::after { content: ""; position: absolute; left: 0; right: 0; bottom: -8px; height: 10px; background: radial-gradient(circle at 11px 0, #d7322a 10px, transparent 11px) 0 0 / 44px 10px repeat-x, radial-gradient(circle at 33px 0, #f7efe2 10px, transparent 11px) 0 0 / 44px 10px repeat-x; }
  #tkWrap .back { padding: 10px 13px; border-radius: 999px; background: rgba(255,255,255,.12); color: #fff; font-weight: 700; font-size: 13px; white-space: nowrap; }
  #tkWrap .boss { display: flex; gap: 10px; align-items: flex-end; } #tkWrap .boss .face { font-size: 42px; line-height: 1; filter: drop-shadow(0 4px 6px rgba(0,0,0,.4)); }
  #tkWrap .boss .say { flex: 1; position: relative; padding: 10px 12px; border-radius: 14px 14px 14px 4px; background: #fff7ea; color: #4a2410; font-size: 13.5px; font-weight: 600; }
  #tkWrap .board { padding: 12px; border-radius: 16px; background: #2a1a10; border: 3px solid #6b4423; box-shadow: inset 0 0 0 2px #3a2414, 0 8px 20px rgba(0,0,0,.4); display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  #tkWrap .board > b { grid-column: 1 / -1; text-align: center; font-size: 15px; color: #ffd28a; letter-spacing: 1px; }
  #tkWrap .item { padding: 10px 8px; border-radius: 12px; background: rgba(255,240,215,.06); border: 1px solid rgba(255,210,150,.18); display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; text-align: left; align-items: center; }
  #tkWrap .item i { grid-row: span 2; font-style: normal; font-size: 30px; } #tkWrap .item b { font-size: 14px; color: #fff3e2; } #tkWrap .item small { font-size: 11px; color: #d9bf9a; line-height: 1.3; }
  #tkWrap .item.had { border-color: rgba(140,230,160,.4); } #tkWrap .item.had b::after { content: " ✓"; color: #8ce6a0; }
  #tkWrap .cook { padding: 14px; border-radius: 16px; background: rgba(0,0,0,.35); display: flex; flex-direction: column; align-items: center; gap: 8px; }
  #tkWrap .pan { position: relative; width: 170px; height: 74px; margin-top: 30px; }
  #tkWrap .pan .p { position: absolute; left: 0; right: 0; bottom: 0; height: 46px; border-radius: 10px 10px 50px 50px; background: linear-gradient(#5b5f66, #2b2e33); box-shadow: 0 0 22px rgba(255,120,60,.45); }
  #tkWrap .pan .p::before { content: ""; position: absolute; left: 8px; right: 8px; top: 4px; height: 16px; border-radius: 50%; background: var(--sauce, #d8401c); }
  #tkWrap .pan .food { position: absolute; left: 0; right: 0; bottom: 26px; text-align: center; font-size: 30px; letter-spacing: -6px; animation: tkBob .5s infinite alternate ease-in-out; }
  @keyframes tkBob { to { transform: translateY(-3px); } }
  #tkWrap .pan .st { position: absolute; bottom: 52px; width: 14px; height: 14px; border-radius: 50%; background: rgba(255,255,255,.45); animation: tkUp 1.5s infinite ease-out; }
  @keyframes tkUp { from { transform: translateY(0) scale(.5); opacity: .8; } to { transform: translateY(-50px) scale(2); opacity: 0; } }
  #tkWrap .pan .fire { position: absolute; left: 30px; right: 30px; bottom: -10px; height: 10px; border-radius: 50%; background: radial-gradient(#ffd27a, #ff5a1f 60%, transparent 70%); animation: tkFire .2s infinite alternate; }
  @keyframes tkFire { to { transform: scaleX(.9); opacity: .8; } }
  #tkWrap .bar { width: 100%; height: 8px; border-radius: 4px; background: rgba(255,255,255,.1); overflow: hidden; } #tkWrap .bar i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #ffb35c, #ff5a1f); transition: width .25s linear; }
  #tkWrap .go { padding: 12px; border-radius: 999px; background: #ffb35c; color: #3a1a00; font-weight: 800; font-size: 15px; width: 100%; }
  #tkWrap .ghost { padding: 8px; color: #d9bf9a; font-size: 13px; }
  #tkWrap .ready .face { font-size: 56px; animation: tkPop .6s ease-out; } @keyframes tkPop { from { transform: scale(.3) rotate(-20deg); } 70% { transform: scale(1.15); } to { transform: none; } }
  #tkWrap .note { font-size: 12px; color: #c9ab84; text-align: center; } #tkWrap .sup a { color: #ffc56b; font-weight: 700; text-decoration: underline; cursor: pointer; }`;
  function build() {
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    const w = document.createElement("div"); w.id = "tkWrap"; w.setAttribute("role", "dialog"); w.setAttribute("aria-label", "한강 분식 트럭"); document.body.appendChild(w);
    w.addEventListener("click", e => { const b = e.target.closest("[data-do]"); if (b) act(b.dataset.do, b.dataset.v); });
  }
  const item = k => MENU.find(x => x[0] === k);
  function cookHTML() {
    if (!cook) return "";
    const m = item(cook.k);
    if (!cook.done) return `<div class="cook"><div class="pan" style="--sauce:${cook.k === "tteokbokki" || cook.k === "tempura" ? "#d8401c" : cook.k === "oden" ? "#c9a26a" : "#3a3f46"}"><div class="p"></div><div class="food">${m[1]}${m[1]}</div>${[0, 1, 2].map(i => `<div class="st" style="left:${40 + i * 38}px;animation-delay:${i * .45}s"></div>`).join("")}<div class="fire"></div></div>
      <b>${["지글지글…", "보글보글…", "거의 다 됐어요!"][Math.min(2, Math.floor(cook.p * 3))]}</b><div class="bar"><i id="tkBar" style="width:${cook.p * 100}%"></i></div></div>`;
    return `<div class="cook ready"><div class="face">${m[1]}</div><b style="font-size:17px">${m[2]} 나왔습니다!</b><div class="note">"맛있게 먹어요~ 한강 보면서 먹으면 두 배로 맛있어요"</div>
      <button class="go" data-do="eat">🧺 돗자리로 들고 가기</button><button class="ghost" data-do="more">하나 더 주문하기</button>
      <div class="note sup">사장님(만든 사람)이 마음에 들었다면 <a data-do="sup">💛 응원하기</a></div></div>`;
  }
  function render() {
    const had = bag();
    $("tkWrap").innerHTML = `<div class="in">
      <div class="hd"><div class="awn">🚚 한강 분식 트럭<small>버스킹 거리 오른쪽 · ${tkN ? `오늘 주문 ${tkN}개` : "오늘도 영업 중"}</small></div><button class="back" data-do="close">🎸 거리로</button></div>
      <div class="boss"><div class="face">🧑‍🍳</div><div class="say">${cook ? (cook.done ? "자, 여기요! 뜨거우니까 조심해요" : "잠깐만 기다려요, 금방 돼요!") : HELLO[H.hi || 0]}</div></div>
      ${cookHTML()}
      ${cook && !cook.done ? "" : `<div class="board"><b>— 오늘의 메뉴 —</b>${MENU.map(([k, e, n, d]) => `<button class="item ${had.includes(k) ? "had" : ""}" data-do="order" data-v="${k}"><i>${e}</i><b>${n}</b><small>${d}</small></button>`).join("")}</div>
      <div class="note">게임 속 트럭이라 값은 없어요. 산 건 돗자리 '먹기'의 🛍 사 온 것에 담겨요.</div>`}
    </div>`;
  }
  function act(d, v) {
    if (d === "close") return close();
    if (d === "order") { const m = item(v); if (!m) return; cook = { k: v, p: 0, t0: Date.now(), dur: m[4] * 1000, done: false }; clearInterval(tick); tick = setInterval(step, 250); render(); $("tkWrap").scrollTop = 0; return; }
    if (d === "eat") { const k = cook && cook.k; cook = null; close(); if (opt.closeBusk) opt.closeBusk(); if (k && opt.eat) opt.eat(k); return; }
    if (d === "more") { cook = null; H.hi = Math.floor(Math.random() * HELLO.length); return render(); }
    if (d === "sup") { close(); if (opt.openSup) opt.openSup(); }
  }
  function step() {
    if (!cook || cook.done) return clearInterval(tick);
    cook.p = Math.min(1, (Date.now() - cook.t0) / cook.dur);
    if (cook.p >= 1) { cook.done = true; clearInterval(tick); addBag(cook.k); opt.send({ t: "tk", k: cook.k }); render(); return; }
    const b = $("tkBar"); if (b) b.style.width = cook.p * 100 + "%"; else render();
  }
  function open() { H.hi = Math.floor(Math.random() * HELLO.length); $("tkWrap").classList.add("on"); render(); $("tkWrap").scrollTop = 0; }
  function close() { $("tkWrap").classList.remove("on"); }
  H.init = o => { opt = o; build(); };
  H.open = open; H.isOpen = () => $("tkWrap") && $("tkWrap").classList.contains("on");
  H.menu = MENU;
  H.onMsg = m => { if (m.t === "init" && m.tkN != null) tkN = m.tkN; else if (m.t === "tkN") tkN = m.n; };
})();
