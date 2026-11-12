// ✊ 둘이 하는 놀이(01·02 공통): 가위바위보·참참참. 사람을 누르면 나오는 '말 걸기' 창에서 신청, 상대가 받으면 3판 2선승.
// 아무도 안 받거나 혼자일 땐 🐶 한강이가 상대(폰 안에서만). 판정은 서버(server.js gmRound), 기록은 저장하지 않는다.
(() => {
  const H = window.HNGame = {}; let opt = {}, box = null, G = null, ask = null, inv = null;
  const K = { rps: ["✊ 가위바위보", [["✊", "바위"], ["✌️", "가위"], ["✋", "보"]]], ccc: ["👉 참참참", [["⬅️", "왼쪽"], ["⬆️", "가운데"], ["➡️", "오른쪽"]]] };
  const F = `system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  const css = `
  #gmBox { position: fixed; inset: 0; z-index: 13; display: none; align-items: center; justify-content: center; background: rgba(4,6,20,.55); }
  #gmBox.on { display: flex; }
  #gmBox .in { width: min(330px, calc(100vw - 32px)); display: flex; flex-direction: column; gap: 10px; padding: 16px 14px 12px; border-radius: 22px; background: #141a36; color: #eef1ff; border: 1px solid rgba(180,190,255,.3); box-shadow: 0 14px 44px rgba(0,0,0,.55); font: 14px/1.4 ${F}; text-align: center; }
  #gmBox h3 { margin: 0; font-size: 16px; } #gmBox .sc { font-size: 26px; font-weight: 800; letter-spacing: 1px; } #gmBox .sc small { display: block; font-size: 11.5px; font-weight: 600; color: #aab3ea; letter-spacing: 0; }
  #gmBox .role { font-size: 13px; color: #ffd98a; min-height: 18px; } #gmBox .st { font-size: 13px; color: #c9cff5; min-height: 38px; } #gmBox .st b { font-size: 26px; }
  #gmBox .pk { display: flex; gap: 8px; } #gmBox .pk button { all: unset; cursor: pointer; flex: 1; padding: 10px 0 8px; border-radius: 16px; background: rgba(255,255,255,.08); font-size: 30px; line-height: 1.1; display: flex; flex-direction: column; align-items: center; gap: 2px; }
  #gmBox .pk button span { font-size: 11.5px; color: #cfc8dc; } #gmBox .pk button.sel { background: rgba(255,210,122,.3); outline: 2px solid #ffd27a; } #gmBox .pk.off button { opacity: .45; pointer-events: none; }
  #gmBox .row { display: flex; gap: 8px; } #gmBox .row button { all: unset; cursor: pointer; flex: 1; padding: 10px 0; border-radius: 13px; font: 700 14px ${F}; text-align: center; background: rgba(255,255,255,.1); color: #dfe3ff; }
  #gmBox .row button.go { background: linear-gradient(135deg, #ffd27a, #ff9fb6); color: #2a1838; }
  #talkBox #gmRow { display: flex; gap: 6px; width: 100%; margin: 6px 0 2px; box-sizing: border-box; }
  #talkBox #gmRow button { all: unset; box-sizing: border-box; cursor: pointer; flex: 1; padding: 9px 0; border-radius: 12px; text-align: center; white-space: nowrap; font: 700 13.5px ${F}; background: rgba(255,210,122,.2); color: #ffe3a6; border: 1px solid rgba(255,210,122,.45); }`;
  const $ = id => document.getElementById(id);
  const say = (m, ms) => opt.toast && opt.toast(m, ms || 2800);
  function show(html) { box.innerHTML = `<div class="in">${html}</div>`; box.classList.add("on"); opt.closeOthers && opt.closeOthers(); }
  function hide() { box.classList.remove("on"); }
  // ---------- 화면 ----------
  function draw(status) {
    const [title, picks] = K[G.k], mine = G.sc[G.mi], theirs = G.sc[1 - G.mi];
    const att = G.k === "ccc" ? (G.n % 2 === 0 ? 0 : 1) === G.mi : null;
    show(`<h3>${title} · ${G.oppNick}</h3><div class="sc">${mine} : ${theirs}<small>나 · ${G.oppNick} (먼저 2판 이기면 승리)</small></div>` +
      `<div class="role">${G.over ? "" : att == null ? "셋 중 하나를 골라요" : att ? "👉 이번엔 내가 공격! 손가락 방향을 골라요" : "🙂 이번엔 수비! 고개 돌릴 방향을 골라요 (같은 쪽이면 져요)"}</div>` +
      `<div class="pk${G.picked != null || G.over ? " off" : ""}">${picks.map((p, i) => `<button data-p="${i}" class="${G.picked === i ? "sel" : ""}">${p[0]}<span>${p[1]}</span></button>`).join("")}</div>` +
      `<div class="st">${status || (G.picked != null ? (G.bot ? "🐶 한강이가 고르는 중…" : `${G.oppNick}님이 고르는 중…`) : G.oppPicked ? `${G.oppNick}님은 골랐어요! 나도 골라요` : "")}</div>` +
      `<div class="row">${G.over ? `<button class="go" data-do="again">한 판 더</button><button data-do="close">닫기</button>` : `<button data-do="quit">그만하기</button>`}</div>`);
  }
  function reveal(myP, opP, winMe) {   // winMe: 1 이김, -1 짐, 0 비김
    const p = K[G.k][1], t = winMe > 0 ? "이겼어요! 🎉" : winMe < 0 ? "졌어요 😣" : "비겼어요, 다시!";
    return `나 <b>${p[myP][0]}</b> vs <b>${p[opP][0]}</b> ${G.oppNick}<br>${t}`;
  }
  function finish(win) {   // win: 1 나, -1 상대, 0 무승부·취소
    G.over = true; G.picked = null;
    draw(win > 0 ? `🏆 이겼어요! (${G.sc[G.mi]} : ${G.sc[1 - G.mi]})` : win < 0 ? `아쉽다! (${G.sc[G.mi]} : ${G.sc[1 - G.mi]}) 한 판 더?` : "놀이가 끝났어요");
  }
  // ---------- 사람과 ----------
  function invite(k) {
    const to = opt.talkTarget && opt.talkTarget(); if (to == null) return;
    if (G && !G.over) return say("지금 놀이 중이에요");
    opt.closeTalk && opt.closeTalk(); opt.send({ t: "gm", to, k });
    const nick = (opt.nick && opt.nick(to)) || "상대"; say(`${K[k][0]} 신청! ${nick}님이 받으면 시작해요`, 3500);
    clearTimeout(ask && ask.t); ask = { to, k, nick, t: setTimeout(() => { ask = null; offerBot(`${nick}님이 지금은 바쁜가 봐요.`, k); }, 14000) };
  }
  function offerBot(why, k) {
    show(`<h3>🐶 한강이랑 할까요?</h3><div class="st">${why}<br>한강이는 언제든 받아 줘요</div><div class="row"><button class="go" data-do="bot" data-k="${k || "rps"}">한강이랑 하기</button><button data-do="close">닫기</button></div>`);
  }
  function onInvite(m) {
    if (G && !G.over) return opt.send({ t: "gmNo", to: m.from });
    inv = m; clearTimeout(onInvite.t); onInvite.t = setTimeout(() => { if (inv === m) { inv = null; opt.send({ t: "gmNo", to: m.from }); if (box.querySelector("[data-do=yes]")) hide(); } }, 12000);
    show(`<h3>${K[m.k][0]}</h3><div class="st">${m.nick}님이 같이 ${K[m.k][0].slice(2)} 하재요!</div><div class="row"><button class="go" data-do="yes">좋아요</button><button data-do="no">다음에</button></div>`);
  }
  // ---------- 🐶 한강이와 ----------
  function startBot(k) {
    G = { k, bot: true, mi: 0, sc: [0, 0], n: 0, picked: null, oppNick: "🐶 한강이" }; opt.send({ t: "gmBot" }); draw();
  }
  function botPick(p) {
    G.picked = p; draw();
    setTimeout(() => {
      if (!G || !G.bot || G.over) return; const q = Math.random() * 3 | 0; let w = 0;
      if (G.k === "rps") { if (p !== q) w = (q - p + 3) % 3 === 1 ? 1 : -1; }
      else { const iAtt = G.n % 2 === 0; w = (p === q) === iAtt ? 1 : -1; }
      G.n++; if (w > 0) G.sc[0]++; else if (w < 0) G.sc[1]++; G.picked = null;
      const st = reveal(p, q, w);
      if (G.sc[0] >= 2 || G.sc[1] >= 2 || G.n >= 9) { draw(st); setTimeout(() => G && finish(G.sc[0] > G.sc[1] ? 1 : -1), 1400); } else draw(st);
    }, 700 + Math.random() * 600);
  }
  // ---------- 버튼 ----------
  function onClick(e) {
    if (e.target === box) { if (!G || G.over) hide(); return; }
    const pb = e.target.closest("[data-p]"); if (pb && G && !G.over && G.picked == null) { const p = +pb.dataset.p; if (G.bot) return botPick(p); G.picked = p; opt.send({ t: "gmPick", p }); return draw(); }
    const d = e.target.closest("[data-do]"); if (!d) return; const k = d.dataset.do;
    if (k === "close") { hide(); if (G && G.over) G = null; }
    else if (k === "bot") startBot(d.dataset.k || "rps");
    else if (k === "pickbot") startBot(d.dataset.k);
    else if (k === "yes" && inv) { opt.send({ t: "gmOk", to: inv.from }); inv = null; show(`<div class="st">준비 중…</div>`); }
    else if (k === "no" && inv) { opt.send({ t: "gmNo", to: inv.from }); inv = null; hide(); }
    else if (k === "quit") { if (G && !G.bot) opt.send({ t: "gmQuit" }); G = null; hide(); }
    else if (k === "again" && G) { if (G.bot) startBot(G.k); else { const o = G.opp, kk = G.k; G = null; hide(); H.inviteTo(o, kk); } }
  }
  H.inviteTo = (id, k) => { const t0 = opt.talkTarget; opt.talkTarget = () => id; invite(k); opt.talkTarget = t0; };
  H.bot = () => show(`<h3>🐶 한강이랑 놀기</h3><div class="st">무엇을 할까요? (3판 2선승)</div><div class="row"><button class="go" data-do="pickbot" data-k="rps">✊ 가위바위보</button><button class="go" data-do="pickbot" data-k="ccc">👉 참참참</button></div><div class="row"><button data-do="close">닫기</button></div>`);
  H.onMsg = m => {
    if (!m || typeof m.t !== "string" || m.t.slice(0, 2) !== "gm") return;
    const me = opt.me && opt.me();
    if (m.t === "gmInv") onInvite(m);
    else if (m.t === "gmNo") { if (ask && ask.to === m.from) { clearTimeout(ask.t); ask = null; offerBot(m.busy ? "그분은 지금 다른 놀이 중이에요." : "이번엔 거절했어요.", null); } }
    else if (m.t === "gmGo") { clearTimeout(ask && ask.t); ask = null; const mi = m.a === me ? 0 : 1; G = { k: m.k, bot: false, mi, opp: mi === 0 ? m.b : m.a, oppNick: (mi === 0 ? m.bn : m.an) || "상대", sc: [0, 0], n: 0, picked: null }; draw(); }
    else if (m.t === "gmWait" && G && !G.bot) { G.oppPicked = true; if (G.picked == null) draw(); }
    else if (m.t === "gmRes" && G && !G.bot) {
      const myP = G.mi === 0 ? m.pa : m.pb, opP = G.mi === 0 ? m.pb : m.pa, w = !m.win ? 0 : m.win === me ? 1 : -1;
      G.sc = m.sc.slice(); G.n = m.n; G.picked = null; G.oppPicked = false; draw(reveal(myP, opP, w));   // sc는 [a, b] 순서(내 점수는 G.sc[G.mi])
    }
    else if (m.t === "gmEnd") {
      if (!G || G.bot) { if (m.cancel && box.querySelector(".st") && /준비 중/.test(box.textContent)) hide(); return; }
      G.sc = m.sc.slice();
      if (m.cancel) { say("시간이 지나 놀이가 끝났어요", 2500); G = null; hide(); return; }
      if (m.quit && m.quit !== me) say(`${G.oppNick}님이 그만했어요`, 2500);
      finish(!m.win ? 0 : m.win === me ? 1 : -1);
    }
  };
  H.init = o => {
    opt = o; const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    box = document.createElement("div"); box.id = "gmBox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "둘이 하는 놀이"); box.onclick = onClick; document.body.appendChild(box);
    const to = $("talkTo"); if (to) { const r = document.createElement("div"); r.id = "gmRow"; r.innerHTML = `<button data-k="rps">✊ 가위바위보</button><button data-k="ccc">👉 참참참</button>`; r.onclick = e => { const b = e.target.closest("[data-k]"); if (b) invite(b.dataset.k); }; to.after(r); }
  };
})();
