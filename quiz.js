// 🎯 한강 라이브 퀴즈 — 01(index.html)과 02(3d.html)가 같이 쓰는 파일.
// HQ Trivia(정해진 시각에 모두 같이 푸는 퀴즈, 최고 동시 238만 명)처럼 매시 30분(KST)에 5문제. 문제당 12초, 정답 공개 때 몇 명이 뭘 골랐는지.
// 탈락 없이 맞힌 수로 순위. 시간이 되면 진행자 강아지가 걸어 나와 말을 걸고, 누르면 카드가 열림(바로 화면을 가리지 않음). 서버: qa{i,a}·qzNow(운영자) / qzSoon·qzStart·qzQ·qzR·qzEnd·qaOk
(function () {
  const H = window.HNQuiz = {};
  let opt = null, st = { next: 0, on: false, last: null }, cur = null, my = { ok: 0, n: 0 }, min = false, tick = null, hideT = null, dog = null, seen = false, dogT = null;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const hm = t => { const d = new Date(t + 9 * 3600e3); return String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0"); };
  const F = 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  const css = `
  #qzCard { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(max(14px, env(safe-area-inset-bottom)) + 92px); width: min(360px, calc(100vw - 24px)); z-index: 8; display: none; flex-direction: column; gap: 9px; padding: 14px 14px 12px; border-radius: 20px; background: rgba(20,16,44,.94); color: #f3f0ff; border: 1px solid rgba(190,170,255,.35); box-shadow: 0 12px 36px rgba(0,0,0,.5); font: 14px/1.45 ${F}; }
  #qzCard.on { display: flex; } #qzCard .hd { display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; color: #c7bdf0; } #qzCard .hd b { color: #ffd98a; font-size: 13px; }
  #qzCard button { all: unset; cursor: pointer; box-sizing: border-box; }
  #qzCard .min { padding: 2px 8px; border-radius: 999px; border: 1px solid rgba(255,255,255,.2); font-size: 12px; color: #d8d0f7; }
  #qzCard .q { font-size: 16px; font-weight: 800; line-height: 1.4; }
  #qzCard .o { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
  #qzCard .o button { position: relative; overflow: hidden; padding: 10px 8px; border-radius: 12px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.16); font-size: 13.5px; text-align: center; line-height: 1.3; }
  #qzCard .o button i { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: rgba(255,255,255,.1); transition: width .6s; } #qzCard .o button span { position: relative; } #qzCard .o button small { position: relative; display: block; font-size: 11px; color: #c7bdf0; }
  #qzCard .o button.pick { border-color: #ffd98a; background: rgba(255,217,138,.16); }
  #qzCard .o button.ok { border-color: #7fe0a0; background: rgba(127,224,160,.22); } #qzCard .o button.no { border-color: #ff8a8a; background: rgba(255,120,120,.16); }
  #qzCard .o.lock button { pointer-events: none; }
  #qzCard .bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,.1); overflow: hidden; } #qzCard .bar i { display: block; height: 100%; width: 100%; background: linear-gradient(90deg, #ffd98a, #ff8ac6); transition: width .25s linear; }
  #qzCard .msg { text-align: center; font-size: 13px; color: #e6e0ff; } #qzCard .big { text-align: center; font-size: 34px; line-height: 1.1; }
  #qzCard ol { margin: 0; padding: 0 0 0 4px; list-style: none; display: grid; gap: 4px; } #qzCard li { display: flex; justify-content: space-between; padding: 6px 10px; border-radius: 10px; background: rgba(255,255,255,.06); font-size: 13px; } #qzCard li.me { background: rgba(255,217,138,.18); }
  #qzCard .sup { font-size: 12.5px; color: #ffe2a8; text-align: center; } #qzCard .sup a { color: #ffd277; font-weight: 700; text-decoration: underline; cursor: pointer; }
  #qzCard .act { padding: 10px; border-radius: 999px; background: #ffd98a; color: #2a1a00; font-weight: 800; text-align: center; } #qzCard .x { text-align: center; color: #b9b0de; font-size: 13px; padding: 2px; }
  #qzChip { all: unset; position: fixed; left: 12px; top: calc(max(12px, env(safe-area-inset-top)) + var(--qzTop, 92px)); z-index: 6; cursor: pointer; display: none; padding: 5px 10px; border-radius: 999px; font: 700 12.5px/1.2 ${F}; color: #fff3d6; background: rgba(60,30,80,.82); border: 1px solid rgba(255,200,140,.5); white-space: nowrap; }
  #qzChip.on { display: block; }
  #qzDog { all: unset; position: fixed; right: 14px; bottom: calc(max(14px, env(safe-area-inset-bottom)) + 96px); z-index: 7; cursor: pointer; display: none; flex-direction: column; align-items: flex-end; transform: translateX(160%); transition: transform 1.1s cubic-bezier(.3,1.3,.5,1); -webkit-tap-highlight-color: transparent; }
  #qzDog.on { display: flex; } #qzDog.in { transform: translateX(0); }
  #qzDog .say { position: relative; max-width: 190px; margin: 0 6px 6px 0; padding: 8px 12px; border-radius: 16px; background: #fffaf0; color: #3a2a18; font: 800 13.5px/1.35 ${F}; box-shadow: 0 6px 18px rgba(0,0,0,.35); text-align: center; }
  #qzDog .say:after { content: ""; position: absolute; right: 30px; bottom: -7px; border: 8px solid transparent; border-top-color: #fffaf0; border-bottom: 0; }
  #qzDog .say small { display: block; font-weight: 700; font-size: 11.5px; color: #b0662a; margin-top: 2px; }
  #qzDog svg { width: 84px; height: 84px; filter: drop-shadow(0 6px 8px rgba(0,0,0,.4)); animation: qzHop 1.1s ease-in-out infinite; }
  #qzDog .tail { transform-origin: 70px 58px; animation: qzWag .35s ease-in-out infinite alternate; }
  #qzDog .ear { transform-origin: 30px 22px; animation: qzEar 2.2s ease-in-out infinite; }
  @keyframes qzHop { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
  @keyframes qzWag { from { transform: rotate(-18deg); } to { transform: rotate(22deg); } }
  @keyframes qzEar { 0%,85%,100% { transform: rotate(0); } 92% { transform: rotate(-14deg); } }
  @media (orientation: landscape) and (max-height: 520px) { #qzDog { bottom: calc(max(10px, env(safe-area-inset-bottom)) + 70px); } #qzDog svg { width: 66px; height: 66px; } }`;
  function build() {
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    if (opt.chipTop) document.documentElement.style.setProperty("--qzTop", opt.chipTop + "px");
    const c = document.createElement("div"); c.id = "qzCard"; c.setAttribute("role", "dialog"); c.setAttribute("aria-label", "한강 퀴즈"); document.body.appendChild(c);
    const ch = document.createElement("button"); ch.id = "qzChip"; ch.onclick = () => { min = false; if (cur || (st.last && Date.now() - st.last.at < 60e3)) render(); else open(); }; document.body.appendChild(ch);
    dog = document.createElement("button"); dog.id = "qzDog"; dog.setAttribute("aria-label", "퀴즈 강아지 - 눌러서 퀴즈 열기");
    dog.innerHTML = `<div class="say"></div><svg viewBox="0 0 90 90" aria-hidden="true"><ellipse cx="45" cy="84" rx="24" ry="4" fill="rgba(0,0,0,.25)"/>
      <path class="tail" d="M66 58 q14 -6 12 -20" stroke="#d9a066" stroke-width="7" fill="none" stroke-linecap="round"/>
      <ellipse cx="46" cy="64" rx="22" ry="17" fill="#f2c48d"/><ellipse cx="46" cy="69" rx="12" ry="10" fill="#fff1dc"/>
      <rect x="31" y="72" width="8" height="12" rx="4" fill="#f2c48d"/><rect x="53" y="72" width="8" height="12" rx="4" fill="#f2c48d"/>
      <circle cx="44" cy="36" r="21" fill="#f2c48d"/>
      <path class="ear" d="M27 22 q-12 2 -10 22 q8 0 13 -10z" fill="#b97a45"/><path d="M61 22 q12 2 10 22 q-8 0 -13 -10z" fill="#b97a45"/>
      <ellipse cx="44" cy="44" rx="11" ry="8" fill="#fff1dc"/><circle cx="36" cy="34" r="3.2" fill="#2a1a10"/><circle cx="52" cy="34" r="3.2" fill="#2a1a10"/>
      <circle cx="37" cy="33" r="1" fill="#fff"/><circle cx="53" cy="33" r="1" fill="#fff"/><ellipse cx="44" cy="41" rx="3.6" ry="2.6" fill="#2a1a10"/>
      <path d="M40 46 q4 4 8 0" stroke="#2a1a10" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M42.5 47.5 q1.5 5 3 0z" fill="#ff7a8a"/>
      <circle cx="31" cy="42" r="3" fill="#ff9fae" opacity=".6"/><circle cx="57" cy="42" r="3" fill="#ff9fae" opacity=".6"/>
      <path d="M30 54 q16 8 32 0" stroke="#e8505b" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="46" cy="59" r="3.2" fill="#ffd34d"/></svg>`;
    dog.onclick = () => { seen = true; hideDog(); min = false; if (cur) render(); else open(); };
    document.body.appendChild(dog);
    c.addEventListener("click", e => { const b = e.target.closest("[data-do]"); if (b) act(b.dataset.do, b.dataset.v); });
    clearInterval(tick); tick = setInterval(step, 250);
  }
  function showDog(t, sub, ms) {
    if (!dog) return; dog.querySelector(".say").innerHTML = esc(t) + (sub ? `<small>${esc(sub)}</small>` : "");
    if (!dog.classList.contains("on")) { dog.classList.add("on"); requestAnimationFrame(() => requestAnimationFrame(() => dog.classList.add("in"))); }
    clearTimeout(dogT); if (ms) dogT = setTimeout(hideDog, ms);
  }
  function hideDog() { if (!dog) return; clearTimeout(dogT); dog.classList.remove("in"); setTimeout(() => { if (!dog.classList.contains("in")) dog.classList.remove("on"); }, 1100); }
  const dogOn = () => dog && dog.classList.contains("in");
  function chip() {
    const ch = $("qzChip"); if (!ch) return;
    const left = st.next - Date.now();
    let t = "";
    if (cur && min) t = cur.phase === "q" || cur.phase === "r" ? `🎯 퀴즈 ${cur.i + 1}/${cur.n} · 펼치기` : "🎯 퀴즈 진행 중";
    else if (!cur && left > 0 && left < 10 * 60e3) t = `🎯 퀴즈 ${Math.ceil(left / 60e3)}분 뒤`;
    if (dogOn()) t = "";
    ch.classList.toggle("on", !!t); if (t && ch.textContent !== t) ch.textContent = t;
  }
  function step() {
    chip();
    if (!cur || min) return;
    if (cur.phase === "q") { const b = $("qzBar"); if (b) b.style.width = Math.max(0, (cur.ends - Date.now()) / 12000 * 100) + "%"; }
    if (cur.phase === "wait") { const w = $("qzWait"); if (w) w.textContent = Math.max(0, Math.ceil((cur.at - Date.now()) / 1000)); }
  }
  function render() {
    const c = $("qzCard"); if (!c) return;
    if (min && cur) { c.classList.remove("on"); return chip(); }
    if (!cur) { c.classList.remove("on"); return chip(); }
    const hd = `<div class="hd"><b>🎯 한강 퀴즈${cur.test ? " (운영자 시험)" : ""}</b><button class="min" data-do="min">접기</button></div>`;
    if (cur.phase === "wait") c.innerHTML = hd + `<div class="big">⏳ <span id="qzWait">5</span></div><div class="msg">곧 시작해요! ${cur.n}문제, 문제당 12초 · 탈락 없이 맞힌 수로 순위</div>`;
    else if (cur.phase === "q" || cur.phase === "r") {
      const tot = cur.cnt ? cur.cnt.reduce((a, b) => a + b, 0) : 0;
      c.innerHTML = hd + `<div class="msg" style="text-align:left;color:#c7bdf0;font-size:12px">${cur.i + 1} / ${cur.n}${my.ok ? ` · 지금까지 ${my.ok}개 맞힘` : ""}</div><div class="q">${esc(cur.q)}</div>
        <div class="o ${cur.phase === "r" || cur.pick != null ? "lock" : ""}">${cur.o.map((t, k) => { const cls = cur.phase === "r" ? (k === cur.c ? "ok" : k === cur.pick ? "no" : "") : k === cur.pick ? "pick" : ""; const pct = cur.phase === "r" && tot ? Math.round(cur.cnt[k] / tot * 100) : null;
          return `<button class="${cls}" data-do="a" data-v="${k}"><i style="width:${pct != null ? pct : 0}%"></i><span>${esc(t)}</span>${pct != null ? `<small>${cur.cnt[k]}명 · ${pct}%</small>` : ""}</button>`; }).join("")}</div>
        ${cur.phase === "q" ? `<div class="bar"><i id="qzBar"></i></div>` : `<div class="msg">${cur.pick == null ? "이번 문제는 못 골랐어요" : cur.pick === cur.c ? "⭕ 맞혔어요!" : "❌ 아쉬워요"} · ${tot}명 참여</div>`}`;
    } else if (cur.phase === "end") {
      const me = opt.myNick ? opt.myNick() : "";
      c.innerHTML = hd + `<div class="big">🏆</div><div class="msg"><b>나는 ${my.ok}/${cur.n}개</b>${cur.perfect ? ` · 만점 ${cur.perfect}명` : ""}</div>
        ${cur.top.length ? `<ol>${cur.top.map((t, k) => `<li class="${t.nick === me ? "me" : ""}"><span>${["🥇", "🥈", "🥉", "4", "5"][k]} ${esc(t.nick)}</span><b>${t.ok}개</b></li>`).join("")}</ol>` : `<div class="msg">이번엔 맞힌 사람이 없어요</div>`}
        <div class="msg">다음 퀴즈 ${hm(cur.next)} · 매시 30분</div><div class="sup">퀴즈가 재밌었다면 <a data-do="sup">💛 한강 응원하기</a></div><button class="x" data-do="close">닫기</button>`;
    } else if (cur.phase === "idle") {
      const L = st.last;
      c.innerHTML = hd.replace("접기", "닫기").replace('data-do="min"', 'data-do="close"') + `<div class="big">🎯</div><div class="msg">매시 <b>30분</b>에 5문제! 한강·서울·밤하늘 이야기<br>다음 퀴즈 <b>${hm(st.next)}</b> (${Math.max(1, Math.ceil((st.next - Date.now()) / 60e3))}분 뒤)</div>
        ${L && L.top && L.top.length ? `<div class="msg" style="color:#c7bdf0">지난 퀴즈 1등 🥇 ${esc(L.top[0].nick)} (${L.top[0].ok}개)</div>` : ""}
        ${opt.isAdmin && opt.isAdmin() ? `<button class="act" data-do="now">👑 지금 시험으로 시작</button>` : ""}<button class="x" data-do="close">닫기</button>`;
    }
    c.classList.add("on"); chip(); step();
  }
  function act(d, v) {
    if (d === "a" && cur && cur.phase === "q" && cur.pick == null) { cur.pick = +v; opt.send({ t: "qa", i: cur.i, a: cur.pick }); render(); }
    else if (d === "min") { min = true; render(); }
    else if (d === "close") { cur = null; min = false; if (!st.on) seen = false; render(); }
    else if (d === "now") { opt.send({ t: "qzNow" }); }
    else if (d === "sup") { cur = null; render(); if (opt.openSup) opt.openSup(); }
  }
  function open() { if (st.on && cur) { min = false; return render(); } cur = { phase: "idle" }; min = false; render(); }
  H.init = o => { opt = o; build(); };
  H.open = open;
  H.onMsg = m => {
    if (m.t === "init" && m.qz) { st.next = m.qz.next; st.on = m.qz.on; st.last = m.qz.last; }
    else if (m.t === "qzSoon") { st.next = m.at; seen = false; showDog("멍! 1분 뒤에 퀴즈 해요 🎯", "저를 누르면 같이 풀어요", 60e3); }
    else if (m.t === "qzStart") { st.on = true; my = { ok: 0 }; cur = { phase: "wait", at: m.at, n: m.n, test: m.test }; clearTimeout(hideT); if (!seen) { min = true; showDog("멍멍! 퀴즈 시작했어요 🎯", "저를 눌러서 맞혀 봐요"); } else min = false; render(); }
    else if (m.t === "qzQ") { st.on = true; cur = { phase: "q", i: m.i, n: m.n, q: m.q, o: m.o, ends: m.ends, pick: null, test: cur && cur.test }; if (!seen) showDog(`멍! ${m.i + 1}번 문제 나왔어요`, "저를 눌러서 맞혀 봐요"); render(); }
    else if (m.t === "qzR") { if (!cur || cur.i !== m.i) return; cur.phase = "r"; cur.c = m.c; cur.cnt = m.cnt; if (cur.pick === m.c) my.ok++; render(); }
    else if (m.t === "qzEnd") { st.on = false; st.next = m.next; st.last = { top: m.top, at: Date.now() }; cur = { phase: "end", top: m.top, perfect: m.perfect, n: m.n, next: m.next, test: cur && cur.test }; if (!seen) { min = true; showDog("퀴즈 끝! 누가 1등일까요? 🏆", "저를 누르면 결과 보여 줘요", 20000); } else min = false; render(); clearTimeout(hideT); hideT = setTimeout(() => { if (cur && cur.phase === "end") { cur = null; seen = false; render(); } }, 20000); }
  };
})();
