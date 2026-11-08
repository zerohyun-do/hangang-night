// 🚂 응원 열차 — 01(index.html)과 02(3d.html)가 같이 쓰는 파일.
// 트위치 Hype Train처럼: 15분 안에 💛 응원이 이어지면 열차에 칸이 붙고, 모든 방 화면을 응원한 사람 이름을 단 열차가 지나간다.
// 서버 메시지: train{n, until, nicks, add}(받음). 보내는 것은 없음(기존 sup으로 계산)
(function () {
  const H = window.HNTrain = {};
  let opt = null, st = { n: 0, until: 0, nicks: [] }, tick = null;
  const $ = id => document.getElementById(id);
  const F = 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  const css = `
  #trChip { all: unset; position: fixed; right: 12px; top: calc(max(12px, env(safe-area-inset-top)) + var(--trTop, 146px)); z-index: 6; cursor: pointer; display: none; align-items: center; gap: 6px; padding: 6px 13px; border-radius: 999px; font: 700 13px/1.2 ${F}; color: #fff4d6; background: rgba(70,40,10,.85); border: 1px solid rgba(255,200,110,.6); box-shadow: 0 0 16px rgba(255,190,90,.3); white-space: nowrap; font-variant-numeric: tabular-nums; }
  #trChip.on { display: flex; } #trChip small { font-weight: 500; opacity: .85; font-size: 11.5px; }
  #trRun { position: fixed; left: 0; right: 0; top: 34%; z-index: 7; pointer-events: none; height: 70px; overflow: hidden; display: none; }
  #trRun.on { display: block; }
  #trRun .tr { position: absolute; top: 0; left: 100%; display: flex; align-items: flex-end; gap: 4px; white-space: nowrap; animation: trGo var(--dur, 9s) linear forwards; }
  #trRun .car { display: flex; flex-direction: column; align-items: center; font: 700 11.5px/1.2 ${F}; color: #fff; text-shadow: 0 1px 4px #000; }
  #trRun .car i { font-style: normal; font-size: 34px; line-height: 1; filter: drop-shadow(0 0 8px rgba(255,200,100,.6)); }
  #trRun .car span { max-width: 80px; overflow: hidden; text-overflow: ellipsis; padding: 1px 6px; border-radius: 8px; background: rgba(60,30,0,.55); }
  @keyframes trGo { to { transform: translateX(calc(-100vw - 100%)); } }
  #trBox { position: fixed; left: 50%; top: 45%; transform: translate(-50%, -50%); width: min(320px, calc(100vw - 32px)); z-index: 9; display: none; flex-direction: column; gap: 10px; padding: 18px 16px 14px; border-radius: 22px; background: #2a1a08; color: #fff3dc; border: 1px solid rgba(255,200,110,.35); box-shadow: 0 14px 44px rgba(0,0,0,.5); font: 14px/1.5 ${F}; text-align: center; }
  #trBox.on { display: flex; } #trBox b.t { font-size: 17px; } #trBox .cars { font-size: 24px; letter-spacing: 1px; word-break: break-all; }
  #trBox .who { font-size: 12.5px; color: #e9cfa4; } #trBox small { color: #d6b98a; font-size: 12px; }
  #trBox button { all: unset; cursor: pointer; padding: 11px; border-radius: 999px; font-weight: 800; background: #ffc56b; color: #3a2100; } #trBox button.x { background: none; color: #d6b98a; font-weight: 500; padding: 4px; }`;
  function build() {
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    if (opt.chipTop) document.documentElement.style.setProperty("--trTop", opt.chipTop + "px");
    const c = document.createElement("button"); c.id = "trChip"; c.onclick = open; document.body.appendChild(c);
    const r = document.createElement("div"); r.id = "trRun"; document.body.appendChild(r);
    const b = document.createElement("div"); b.id = "trBox"; b.setAttribute("role", "dialog"); b.setAttribute("aria-label", "응원 열차"); document.body.appendChild(b);
    b.addEventListener("click", e => { const d = e.target.closest("[data-do]"); if (!d) return; b.classList.remove("on"); if (d.dataset.do === "sup" && opt.openSup) opt.openSup(); });
  }
  const left = () => Math.max(0, st.until - Date.now());
  const mmss = ms => { const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  function chip() {
    const c = $("trChip"); if (!c) return;
    const on = st.n >= 2 && left() > 0; c.classList.toggle("on", on);
    if (on) c.innerHTML = `🚂 응원 열차 ${st.n}칸 <small>${mmss(left())}</small>`;
    if (!on) { clearInterval(tick); tick = null; }
  }
  function open() {
    const b = $("trBox"); const on = left() > 0;
    b.innerHTML = `<b class="t">🚂 응원 열차 ${st.n}칸</b><div class="cars">🚂${"🚃".repeat(Math.min(st.n, 12))}</div>
      <div class="who">${st.nicks.slice(-8).map(n => n.replace(/[<>&"]/g, "")).join(" · ")}님이 탔어요</div>
      <small>${on ? `15분 안에 💛 응원이 이어지면 칸이 붙어요. ${mmss(left())} 남았어요.` : "열차가 떠났어요. 다음 응원부터 새 열차가 출발해요."}</small>
      ${on ? `<button data-do="sup">💛 ${st.n + 1}번째 칸 타기</button>` : ""}<button class="x" data-do="x">닫기</button>`;
    b.classList.add("on");
  }
  function run(nicks) {   // 화면을 가로지르는 열차(칸마다 이름)
    const r = $("trRun"), n = Math.min(nicks.length, 12);
    r.innerHTML = `<div class="tr" style="--dur:${8 + n * .8}s"><div class="car"><i>🚂</i><span>응원 열차</span></div>${nicks.slice(-12).map(k => `<div class="car"><i>🚃</i><span>${k.replace(/[<>&"]/g, "")}</span></div>`).join("")}</div>`;
    r.classList.add("on"); clearTimeout(run.t); run.t = setTimeout(() => r.classList.remove("on"), (8 + n * .8) * 1000 + 300);
  }
  H.init = o => { opt = o; build(); chip(); if (st.n >= 2 && left() > 0 && !tick) tick = setInterval(chip, 1000); };
  H.state = () => st;
  H.onMsg = m => {
    if (m.t === "init" && m.train) { st = { n: m.train.n, until: Date.now() + m.train.left, nicks: m.train.nicks || [] }; }
    else if (m.t === "train") {
      st = { n: m.n, until: Date.now() + m.left, nicks: m.nicks || [] };
      if (m.n >= 2) { run(st.nicks); if (opt.toast) opt.toast(m.test ? `🚂 (운영자 시험) 응원 열차 ${m.n}칸!` : `🚂 ${m.nick}님이 응원 열차 ${m.n}번째 칸에 탔어요!`, 3500); }
    } else return;
    chip(); if (st.n >= 2 && !tick) tick = setInterval(chip, 1000);
  };
})();
