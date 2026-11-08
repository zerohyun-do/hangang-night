// 🌱 같이 집중 — 01(index.html)과 02(3d.html)가 같이 쓰는 파일.
// 공부·일·독서·쉬기를 25/50/90분 정해 두고 한강에 같이 앉아 있는 기능(열품타·Forest·'study with me' 방식).
// 끝까지 채우면 내 숲에 나무 1그루(localStorage hn-forest) + 서버의 '오늘 함께 심은 나무' 1그루.
// 집중 중인 사람은 머리 위(01)·이름표(02)에 📖💻📚🌙 표시. 서버 메시지: fc(시작/끝), tree(완료), fcN(지금 집중 중인 수·오늘 나무 수)
(function () {
  const H = window.HNFocus = {};
  const KINDS = [["📖", "공부"], ["💻", "일"], ["📚", "독서"], ["🌙", "쉬기"]];
  const MINS = [25, 50, 90];
  const TREE = { 25: "🌿", 50: "🌳", 90: "🌲" };
  let opt = null, run = null, fcN = 0, trees = 0, pick = { k: 0, m: 25 }, tick = null;
  let forest = { trees: [], days: {} };
  const ld = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") || d; } catch { return d; } };
  const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  forest = ld("hn-forest", forest); if (!Array.isArray(forest.trees)) forest.trees = []; if (!forest.days || typeof forest.days !== "object") forest.days = {};
  run = ld("hn-focus-run", null);
  pick = Object.assign(pick, ld("hn-focus-pick", {}));
  const $ = id => document.getElementById(id);
  const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const mmss = s => { s = Math.max(0, Math.ceil(s)); const m = Math.floor(s / 60); return (m >= 60 ? Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0") : m) + ":" + String(s % 60).padStart(2, "0"); };
  const todayMin = () => forest.days[kst()] || 0;
  const addMin = m => { const d = kst(); forest.days[d] = (forest.days[d] || 0) + m; const keys = Object.keys(forest.days).sort(); while (keys.length > 60) delete forest.days[keys.shift()]; sv("hn-forest", forest); };
  const weekMin = () => { let n = 0; for (let i = 0; i < 7; i++) n += forest.days[new Date(Date.now() + 9 * 3600e3 - i * 864e5).toISOString().slice(0, 10)] || 0; return n; };
  const streak = () => { let n = 0; for (let i = 0; i < 400; i++) { const d = new Date(Date.now() + 9 * 3600e3 - i * 864e5).toISOString().slice(0, 10); if (forest.days[d]) n++; else if (i > 0) break; } return n; };

  const css = `
  #fcPill { all: unset; position: fixed; right: 12px; top: calc(max(12px, env(safe-area-inset-top)) + 58px); z-index: 6; cursor: pointer; display: none; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; font: 700 13px/1.2 system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif; color: #e9ffe9; background: rgba(18,52,36,.82); border: 1px solid rgba(140,230,160,.55); box-shadow: 0 0 14px rgba(120,220,150,.22); font-variant-numeric: tabular-nums; }
  #fcPill.on { display: flex; } #fcPill small { font-weight: 500; opacity: .8; font-size: 11.5px; }
  #fcBox { position: fixed; left: 50%; top: 46%; transform: translate(-50%, -50%); width: min(340px, calc(100vw - 32px)); max-height: calc(100vh - 150px); overflow: auto; z-index: 8; display: none; flex-direction: column; gap: 10px; padding: 18px 16px 14px; border-radius: 22px; background: #10261d; color: #effbef; border: 1px solid rgba(140,230,160,.3); box-shadow: 0 14px 44px rgba(0,0,0,.5); font: 14px/1.45 system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; }
  #fcBox.on { display: flex; } #fcBox h3 { margin: 0; font-size: 17px; display: flex; justify-content: space-between; align-items: baseline; gap: 8px; } #fcBox h3 small { font-weight: 500; font-size: 12px; color: #a9cdb2; }
  #fcBox .live { padding: 9px 12px; border-radius: 14px; background: rgba(140,230,160,.1); color: #c9f2d2; font-size: 13px; }
  #fcBox .live b { color: #fff; }
  #fcBox .lbl { font-size: 12px; color: #a9cdb2; margin-bottom: -4px; }
  #fcBox .pick { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; } #fcBox .pick.m { grid-template-columns: repeat(3, 1fr); }
  #fcBox button { all: unset; cursor: pointer; padding: 8px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,.2); color: #e2efe4; text-align: center; white-space: nowrap; }
  #fcBox .pick button { padding: 8px 4px; border-radius: 12px; font-size: 13px; display: grid; gap: 2px; } #fcBox .pick button i { font-style: normal; font-size: 20px; }
  #fcBox .pick button.sel { background: rgba(140,230,160,.22); border-color: #8ce6a0; color: #fff; }
  #fcBox button.pri { background: #8ce6a0; color: #0f2a1b; font-weight: 800; border-color: transparent; padding: 11px 14px; font-size: 15px; }
  #fcBox .row { display: flex; gap: 8px; justify-content: center; } #fcBox .row button { flex: 1; }
  #fcBox .big { text-align: center; padding: 6px 0 2px; } #fcBox .big b { display: block; font-size: 40px; font-variant-numeric: tabular-nums; letter-spacing: 1px; } #fcBox .big small { color: #a9cdb2; }
  #fcBox .bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,.1); overflow: hidden; } #fcBox .bar i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #5fcf86, #c7f59a); }
  #fcBox .wood { padding: 10px 12px; border-radius: 14px; background: rgba(255,255,255,.05); display: flex; flex-direction: column; gap: 6px; }
  #fcBox .wood .t { font-size: 20px; line-height: 1.25; letter-spacing: 1px; word-break: break-all; } #fcBox .wood .t:empty::before { content: "아직 나무가 없어요. 첫 그루를 심어 볼까요?"; font-size: 12.5px; color: #8fb39a; letter-spacing: 0; }
  #fcBox .stats { display: flex; justify-content: space-between; font-size: 12px; color: #b9d8c0; } #fcBox .stats b { color: #fff; font-size: 14px; }
  #fcBox .note { font-size: 12px; color: #93b79d; text-align: center; } #fcBox .x { align-self: center; border: 0; color: #93b79d; padding: 4px 12px; font-size: 13px; }
  #fcBox .sup { font-size: 12.5px; color: #ffe2a8; text-align: center; } #fcBox .sup a { color: #ffd277; font-weight: 700; cursor: pointer; text-decoration: underline; }
  #fcDone { position: fixed; left: 50%; top: 40%; transform: translate(-50%, -50%) scale(.96); width: min(310px, calc(100vw - 32px)); z-index: 9; display: none; flex-direction: column; align-items: center; gap: 8px; padding: 20px 16px 14px; border-radius: 22px; background: #f2fff1; color: #173a24; text-align: center; box-shadow: 0 16px 48px rgba(0,0,0,.5); font: 14px/1.45 system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif; transition: transform .25s; }
  #fcDone.on { display: flex; transform: translate(-50%, -50%) scale(1); } #fcDone .face { font-size: 54px; line-height: 1; animation: fcGrow 1.2s ease-out; } #fcDone b { font-size: 17px; } #fcDone small { color: #4c6b55; }
  @keyframes fcGrow { 0% { transform: scale(.2) translateY(20px); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } }
  #fcDone .row { display: flex; gap: 8px; width: 100%; } #fcDone button { all: unset; cursor: pointer; flex: 1; padding: 10px 6px; border-radius: 999px; font-weight: 700; font-size: 14px; text-align: center; background: #e1f3df; color: #24533a; }
  #fcDone button.pri { background: #2f9a5c; color: #fff; } #fcDone .sup { font-size: 12.5px; color: #8a5a12; } #fcDone .sup a { color: #c06d00; font-weight: 700; cursor: pointer; text-decoration: underline; }`;

  function build() {
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    const pill = document.createElement("button"); pill.id = "fcPill"; pill.setAttribute("aria-label", "같이 집중 타이머"); pill.onclick = () => open(); document.body.appendChild(pill);
    const box = document.createElement("div"); box.id = "fcBox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "같이 집중"); document.body.appendChild(box);
    const done = document.createElement("div"); done.id = "fcDone"; done.setAttribute("role", "dialog"); document.body.appendChild(done);
    box.addEventListener("click", e => { const b = e.target.closest("[data-do]"); if (!b) return; act(b.dataset.do, b.dataset.v); });
    done.addEventListener("click", e => { const b = e.target.closest("[data-do]"); if (!b) return; act(b.dataset.do, b.dataset.v); });
  }

  function liveLine() {
    const others = Math.max(0, fcN - (run ? 1 : 0));
    const a = run ? (others ? `나 말고 <b>${others}명</b>이 지금 같이 하고 있어요` : `지금은 나 혼자예요. 누군가 곧 같이 앉을 거예요`) : (fcN ? `지금 <b>${fcN}명</b>이 한강에서 집중하고 있어요` : `지금 집중하는 사람이 없어요. 첫 번째로 앉아 볼까요?`);
    return `<div class="live">🌱 ${a}<br>🌳 오늘 다 같이 심은 나무 <b>${trees}그루</b></div>`;
  }
  function woodHTML() {
    const t = forest.trees.slice(-60).map(x => x.e).join("");
    return `<div class="wood"><div class="stats"><span>오늘 <b>${todayMin()}분</b></span><span>이번 주 <b>${weekMin()}분</b></span><span>연속 <b>${streak()}일</b></span><span>나무 <b>${forest.trees.length}</b></span></div><div class="t">${t}</div></div>`;
  }
  function render() {
    const box = $("fcBox"); if (!box) return;
    if (run) {
      const left = (run.end - Date.now()) / 1000, all = run.m * 60, k = KINDS[run.k] || KINDS[0];
      box.innerHTML = `<h3>🌱 같이 집중 <small>${k[0]} ${k[1]} · ${run.m}분</small></h3>${liveLine()}
        <div class="big"><b id="fcLeft">${mmss(left)}</b><small>끝나면 ${TREE[run.m] || "🌳"} 나무가 내 숲에 심어져요</small></div>
        <div class="bar"><i id="fcBar" style="width:${Math.min(100, (1 - left / all) * 100).toFixed(1)}%"></i></div>
        <div class="note">다른 앱으로 가도 시간은 흘러요. 끝나면 다시 들어와 확인해 주세요.</div>
        ${radioRow()}
        <div class="row"><button data-do="close">계속하기</button><button data-do="stop">그만하기</button></div>`;
    } else {
      box.innerHTML = `<h3>🌱 같이 집중 <small>한강에 같이 앉아서</small></h3>${liveLine()}
        <div class="lbl">무엇을 할까요?</div>
        <div class="pick">${KINDS.map((k, i) => `<button data-do="k" data-v="${i}" class="${i === pick.k ? "sel" : ""}"><i>${k[0]}</i>${k[1]}</button>`).join("")}</div>
        <div class="lbl">얼마나?</div>
        <div class="pick m">${MINS.map(m => `<button data-do="m" data-v="${m}" class="${m === pick.m ? "sel" : ""}"><i>${TREE[m]}</i>${m}분</button>`).join("")}</div>
        <button class="pri" data-do="start">시작하기</button>
        ${woodHTML()}
        <div class="note">내 머리 위에 ${KINDS[pick.k][0]} 표시가 떠서, 다른 사람도 같이 하는 걸 알 수 있어요.</div>
        <button class="x" data-do="close">닫기</button>`;
    }
  }
  function radioRow() {
    if (!window.HNRadio || !HNRadio.isOn || HNRadio.isOn()) return "";
    return `<div class="row"><button data-do="radio">📻 라디오 같이 켜기</button></div>`;
  }
  function pillUpdate() {
    const p = $("fcPill"); if (!p) return;
    if (!run) { p.classList.remove("on"); return; }
    const k = KINDS[run.k] || KINDS[0];
    p.innerHTML = `${k[0]} ${mmss((run.end - Date.now()) / 1000)}${fcN > 1 ? `<small>· ${fcN}명</small>` : ""}`;
    p.classList.add("on");
    const l = $("fcLeft"), b = $("fcBar");
    if (l) l.textContent = mmss((run.end - Date.now()) / 1000);
    if (b) b.style.width = Math.min(100, (1 - (run.end - Date.now()) / 1000 / (run.m * 60)) * 100).toFixed(1) + "%";
  }
  function loop() {
    clearInterval(tick); if (!run) return;
    tick = setInterval(() => { if (!run) return clearInterval(tick); if (Date.now() >= run.end) finish(); else pillUpdate(); }, 1000);
    pillUpdate();
  }
  function start() {
    const m = MINS.includes(+pick.m) ? +pick.m : 25;
    run = { k: pick.k, m, start: Date.now(), end: Date.now() + m * 60e3 };
    sv("hn-focus-run", run); sv("hn-focus-pick", pick);
    opt.send({ t: "fc", on: true, k: run.k });
    fcN++; render(); loop(); close();
    opt.toast(`${KINDS[run.k][0]} ${m}분 시작! 끝나면 ${TREE[m]} 나무가 자라요`, 2600);
  }
  function stop() {
    if (!run) return;
    const used = Math.floor((Date.now() - run.start) / 60e3);
    if (used >= 1) addMin(Math.min(used, run.m));
    run = null; sv("hn-focus-run", null); clearInterval(tick);
    opt.send({ t: "fc", on: false }); fcN = Math.max(0, fcN - 1);
    pillUpdate(); render();
    opt.toast(used >= 1 ? `${used}분 함께했어요. 나무는 끝까지 채우면 자라요 🌱` : "다음에 또 같이 해요 🌱", 2600);
  }
  function finish() {
    if (!run) return;
    const r = run; run = null; sv("hn-focus-run", null); clearInterval(tick);
    const late = Date.now() - r.end > 3 * 3600e3;   // 세 시간 넘게 지나서 열었으면 나무 대신 시간만
    addMin(r.m);
    let e = TREE[r.m] || "🌳";
    if (!late && (forest.trees.length + 1) % 10 === 0) e = "🌸";   // 열 번째 그루마다 벚나무
    if (!late) { forest.trees.push({ e, m: r.m, d: kst() }); if (forest.trees.length > 500) forest.trees.splice(0, forest.trees.length - 500); sv("hn-forest", forest); opt.send({ t: "tree", m: r.m }); }
    opt.send({ t: "fc", on: false }); fcN = Math.max(0, fcN - 1);
    pillUpdate(); render();
    const d = $("fcDone"), k = KINDS[r.k] || KINDS[0];
    let ask = "";
    const sday = ld("hn-fc-ask", ""); if (!late && sday !== kst() && forest.trees.length >= 2 && opt.openSup) { ask = `<div class="sup">여기서 집중이 잘 됐다면 <a data-do="sup">💛 한강 응원하기</a></div>`; sv("hn-fc-ask", kst()); }
    d.innerHTML = `<div class="face">${late ? "⏰" : e}</div><b>${late ? `${r.m}분 다 채웠어요` : `${k[0]} ${r.m}분 완료! ${e === "🌸" ? "벚나무" : "나무"} 1그루`}</b>
      <small>${late ? "오래 지나서 열어서 나무는 못 심었어요. 시간은 기록했어요." : `내 숲 ${forest.trees.length}그루 · 오늘 ${todayMin()}분`}</small>
      <div class="row"><button data-do="rest">☕ 5분 쉬기</button><button class="pri" data-do="again">한 번 더</button></div>${ask}
      <button data-do="doneX" style="flex:none;background:none;color:#6c8a74;font-weight:500;font-size:13px">닫기</button>`;
    d.classList.add("on");
  }
  function open() { if (opt && opt.closeOthers) opt.closeOthers(); render(); $("fcBox").classList.add("on"); }
  function close() { const b = $("fcBox"); if (b) b.classList.remove("on"); }
  let restT = null;
  function act(what, v) {
    if (what === "k") { pick.k = +v; render(); }
    else if (what === "m") { pick.m = +v; render(); }
    else if (what === "start") start();
    else if (what === "stop") stop();
    else if (what === "close") close();
    else if (what === "radio") { if (window.HNRadio) HNRadio.open(); close(); }
    else if (what === "doneX") $("fcDone").classList.remove("on");
    else if (what === "again") { $("fcDone").classList.remove("on"); start(); }
    else if (what === "rest") { $("fcDone").classList.remove("on"); clearTimeout(restT); opt.toast("☕ 5분 쉬어요. 끝나면 알려 드릴게요", 2400); restT = setTimeout(() => opt.toast("🌱 쉬는 시간 끝! 한 번 더 해 볼까요? (☰ 더보기 → 같이 집중)", 4200), 5 * 60e3); }
    else if (what === "sup") { $("fcDone").classList.remove("on"); close(); opt.openSup && opt.openSup(); }
  }

  H.init = o => {
    opt = o; build();
    if (o.pillTop) $("fcPill").style.top = `calc(max(12px, env(safe-area-inset-top)) + ${o.pillTop}px)`;
    if (run && (!MINS.includes(run.m) || !(run.end > 0))) { run = null; sv("hn-focus-run", null); }
    if (run) { if (Date.now() >= run.end) setTimeout(finish, 1500); else loop(); }
    document.addEventListener("visibilitychange", () => { if (!document.hidden && run && Date.now() >= run.end) finish(); });
    // 한 번도 안 써 본 사람에게 3분 뒤 한 번만 안내
    if (!forest.trees.length && !run && !ld("hn-fc-nudge", 0)) setTimeout(() => { if (run) return; sv("hn-fc-nudge", 1); opt.toast(fcN ? `🌱 지금 ${fcN}명이 한강에서 집중 중이에요 · ☰ 더보기 → 같이 집중` : "🌱 공부·일하는 중이라면 ☰ 더보기 → 같이 집중", 4200); }, 180e3);
  };
  H.open = open;
  H.dbgEnd = () => { if (run) run.end = Date.now() + 1200; };   // 테스트용: 곧 끝나게
  H.dbgTrees = n => { trees = n; };
  H.close = close;
  H.active = () => !!run;
  H.trees = () => trees;
  H.kind = k => (KINDS[k] || [""])[0];
  // 연결(또는 다시 연결)되면 서버에 '집중 중'을 다시 알려 머리 위 표시가 이어지게
  H.reconnected = () => { if (run && Date.now() < run.end) opt.send({ t: "fc", on: true, k: run.k }); };
  H.onMsg = m => {
    if (m.t === "fcN") { fcN = m.n || 0; trees = m.trees || 0; pillUpdate(); if ($("fcBox") && $("fcBox").classList.contains("on")) { const l = $("fcBox").querySelector(".live"); if (l) l.outerHTML = liveLine(); } }
    else if (m.t === "tree" && m.nick && opt && opt.me && m.id !== opt.me()) opt.toast(`🌳 ${m.nick}님이 ${m.m}분 집중하고 나무를 심었어요`, 2600);
  };
})();
