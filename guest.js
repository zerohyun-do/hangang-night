// 🐾 한강 손님 — 01(index.html)과 02(3d.html)가 같이 쓰는 파일. (Neko Atsume 방식: 간식을 놓아두면 손님이 찾아오고, 도감을 채운다)
// 간식을 놓으면 화면을 켜 둔 동안 2.5~6분마다 손님이 와서 75초 머문다. 그때 📸 담기를 누르면 도감에 들어가고 반짝돌을 준다.
// 자리를 비운 사이에도 최대 2마리가 다녀가 반짝돌만 두고 간다(사진은 있어야 찍힘 → 켜 두고 기다리는 재미).
// 반짝돌로 좋은 간식을 사면 드문 손님이 잘 온다. 돈은 쓰지 않는다. 저장: localStorage hn-guest. 서버: t:"guest"{k}(드문 손님은 같은 방에 알림, 게이지 +2)
(function () {
  const H = window.HNGuest = {};
  // [이모지, 이름, 등급(0 흔함·1 가끔·2 드묾·3 전설), 좋아하는 간식들, 한 줄]
  const G = [
    ["🕊️", "비둘기", 0, "b", "빵 부스러기면 어디든 와요"],
    ["🐦", "참새", 0, "b", "짹짹, 셋이 같이 다녀요"],
    ["🦆", "청둥오리", 0, "bf", "물에서 막 올라와 털을 털어요"],
    ["🐱", "길고양이", 0, "f", "멀찍이 앉아 눈을 깜빡여요"],
    ["🦗", "귀뚜라미", 0, "w", "밤새 노래하는 손님"],
    ["🐌", "달팽이", 1, "w", "아주 천천히, 그래도 왔어요"],
    ["🐞", "무당벌레", 1, "w", "돗자리 끝에 살짝 앉았어요"],
    ["🐈", "치즈냥", 1, "f", "골골송을 불러 줘요"],
    ["🐸", "참개구리", 1, "w", "개굴! 한 번 울고 가요"],
    ["🐿️", "청설모", 1, "a", "도토리를 볼에 가득"],
    ["🦇", "박쥐", 1, "w", "가로등 불빛 사이를 날아요"],
    ["🦝", "너구리", 2, "af", "밤에만 나오는 산책 손님"],
    ["🦀", "참게", 2, "f", "옆으로 옆으로 걸어왔어요"],
    ["🐢", "남생이", 2, "w", "등딱지에 달빛이 비쳐요"],
    ["🦉", "수리부엉이", 3, "af", "커다란 눈으로 한참 바라봐요"],
    ["🦦", "수달", 3, "f", "멸치를 들고 물 위에 동동"],
  ];
  const TREATS = { b: ["🍞", "빵 부스러기", 0, 3], f: ["🐟", "멸치", 2, 3], a: ["🌰", "도토리", 2, 3], w: ["🍉", "수박 한 조각", 3, 3] };   // [이모지, 이름, 반짝돌 값, 손님 수]
  const TIERW = [10, 4, 1.1, .28], TIERN = ["흔함", "가끔", "드묾", "전설"], TIERC = ["#c9d3e6", "#9fe0b0", "#8fc8ff", "#f3c86a"];
  let opt = null, S = null, cur = null, nextT = null, leaveT = null;
  const $ = id => document.getElementById(id);
  const jong = w => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 > 0; };
  const ga = w => w + (jong(w) ? "이" : "가"), rul = w => w + (jong(w) ? "을" : "를");
  const load = () => { try { return JSON.parse(localStorage.getItem("hn-guest") || "null"); } catch { return null; } };
  const save = () => { try { localStorage.setItem("hn-guest", JSON.stringify(S)); } catch {} };
  S = Object.assign({ seen: {}, stones: 0, treat: null, left: 0, last: 0, visits: 0 }, load() || {});

  const css = `
  #gsBub { position: fixed; right: 12px; bottom: calc(max(14px, env(safe-area-inset-bottom)) + 84px); z-index: 6; display: none; align-items: center; gap: 10px; padding: 10px 12px 10px 10px; border-radius: 20px; background: rgba(20,28,40,.88); border: 1px solid rgba(255,230,170,.45); color: #fdf3dc; box-shadow: 0 8px 26px rgba(0,0,0,.4); font: 13px/1.35 system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif; max-width: min(300px, calc(100vw - 150px)); }
  #gsBub.on { display: flex; animation: gsIn .5s ease-out; } @keyframes gsIn { from { transform: translateY(16px); opacity: 0; } }
  #gsBub .e { font-size: 40px; line-height: 1; animation: gsBob 1.6s ease-in-out infinite; } @keyframes gsBob { 50% { transform: translateY(-4px) rotate(-4deg); } }
  #gsBub b { display: block; font-size: 14px; } #gsBub small { color: #cbbfa6; }
  #gsBub button { all: unset; cursor: pointer; padding: 8px 12px; border-radius: 999px; background: #f3d9a4; color: #3a2a12; font-weight: 800; white-space: nowrap; }
  #gsBox { position: fixed; left: 50%; top: 46%; transform: translate(-50%, -50%); width: min(350px, calc(100vw - 28px)); max-height: calc(100vh - 140px); overflow: auto; z-index: 8; display: none; flex-direction: column; gap: 10px; padding: 18px 14px 14px; border-radius: 22px; background: #1b1d2c; color: #fdf3dc; border: 1px solid rgba(255,230,170,.28); box-shadow: 0 14px 44px rgba(0,0,0,.5); font: 14px/1.45 system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; }
  #gsBox.on { display: flex; } #gsBox h3 { margin: 0; font-size: 17px; display: flex; justify-content: space-between; align-items: baseline; } #gsBox h3 small { font-size: 12.5px; color: #f3d9a4; font-weight: 700; }
  #gsBox .now { padding: 10px 12px; border-radius: 14px; background: rgba(255,230,170,.08); font-size: 13px; color: #e9dcc0; }
  #gsBox .tr { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  #gsBox .tr button { all: unset; cursor: pointer; display: grid; gap: 1px; place-items: center; padding: 8px 2px; border-radius: 14px; border: 1px solid rgba(255,255,255,.16); font-size: 11.5px; color: #e9dcc0; text-align: center; }
  #gsBox .tr button i { font-style: normal; font-size: 24px; } #gsBox .tr button em { font-style: normal; color: #f3d9a4; font-size: 11px; } #gsBox .tr button.off { opacity: .4; } #gsBox .tr button.sel { background: rgba(243,217,164,.18); border-color: #f3d9a4; }
  #gsBox .dex { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  #gsBox .dex div { border-radius: 14px; padding: 8px 2px 6px; text-align: center; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); font-size: 11px; color: #cfc6b2; }
  #gsBox .dex div i { display: block; font-style: normal; font-size: 26px; line-height: 1.2; } #gsBox .dex div.no i { filter: brightness(0); opacity: .35; } #gsBox .dex div.no { color: #77705f; }
  #gsBox .dex div u { text-decoration: none; display: block; font-size: 10px; }
  #gsBox .tip { font-size: 12px; color: #a99f8a; text-align: center; } #gsBox .x { all: unset; cursor: pointer; align-self: center; padding: 4px 14px; color: #a99f8a; font-size: 13px; }
  #gsBox .info { display: none; padding: 10px 12px; border-radius: 14px; background: rgba(255,255,255,.07); font-size: 13px; } #gsBox .info.on { display: block; }`;

  function build() {
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    const bub = document.createElement("div"); bub.id = "gsBub"; bub.setAttribute("role", "status"); document.body.appendChild(bub);
    const box = document.createElement("div"); box.id = "gsBox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "한강 손님"); document.body.appendChild(box);
    bub.addEventListener("click", e => { if (e.target.closest("button")) snap(); else open(); });
    box.addEventListener("click", e => {
      const b = e.target.closest("[data-t]"); if (b) return place(b.dataset.t);
      const d = e.target.closest("[data-g]"); if (d) { const g = G[+d.dataset.g], i = $("gsInfo"); i.innerHTML = S.seen[d.dataset.g] ? `${g[0]} <b>${g[1]}</b> · <span style="color:${TIERC[g[2]]}">${TIERN[g[2]]}</span> · ${S.seen[d.dataset.g]}번 만남<br>${g[4]}<br><small style="color:#a99f8a">좋아하는 간식: ${[...g[3]].map(k => TREATS[k][0] + " " + TREATS[k][1]).join(", ")}</small>` : `❔ 아직 못 만난 <span style="color:${TIERC[g[2]]}">${TIERN[g[2]]}</span> 손님이에요.<br><small style="color:#a99f8a">좋아하는 간식: ${[...g[3]].map(k => TREATS[k][0]).join(" ")}</small>`; i.classList.add("on"); return; }
      if (e.target.closest("[data-x]")) box.classList.remove("on");
    });
  }
  const seenN = () => Object.keys(S.seen).length;
  function render() {
    const box = $("gsBox"); if (!box) return;
    const t = S.treat && S.left > 0 ? TREATS[S.treat] : null;
    const now = t ? (cur ? `${G[cur.k][0]} <b>${ga(G[cur.k][1])}</b> 지금 와 있어요! 오른쪽 아래에서 📸 담기` : `${t[0]} ${rul(t[1])} 놓아뒀어요 · 손님 ${S.left}번 더 · 화면을 켜 두면 몇 분 안에 찾아와요`) : `간식을 골라 돗자리 옆에 놓아 보세요. 손님이 찾아와요.`;
    box.innerHTML = `<h3>🐾 한강 손님 <small>✨ 반짝돌 ${S.stones}</small></h3><div class="now">${now}</div>
      <div class="tr">${Object.entries(TREATS).map(([k, v]) => `<button data-t="${k}" class="${S.treat === k && S.left > 0 ? "sel" : ""} ${v[2] > S.stones ? "off" : ""}"><i>${v[0]}</i>${v[1].split(" ")[0]}<em>${v[2] ? "✨" + v[2] : "무료"}</em></button>`).join("")}</div>
      <h3 style="font-size:15px">📖 손님 도감 <small>${seenN()} / ${G.length}</small></h3>
      <div class="dex">${G.map((g, i) => `<div data-g="${i}" class="${S.seen[i] ? "" : "no"}"><i>${g[0]}</i>${S.seen[i] ? g[1] : "???"}<u style="color:${TIERC[g[2]]}">${TIERN[g[2]]}</u></div>`).join("")}</div>
      <div class="info" id="gsInfo"></div>
      <div class="tip">손님이 왔을 때 📸 담기를 누르면 도감에 들어가요. 자리를 비우면 반짝돌만 두고 가요.</div>
      <button class="x" data-x="1">닫기</button>`;
  }
  function open() { if (opt.closeOthers) opt.closeOthers(); render(); $("gsBox").classList.add("on"); }
  function place(k) {
    const t = TREATS[k]; if (!t) return;
    if (S.treat === k && S.left > 0) return opt.toast(`${t[0]} 이미 놓아뒀어요. 손님을 기다려 봐요`, 2000);
    if (t[2] > S.stones) return opt.toast(`✨ 반짝돌이 ${t[2] - S.stones}개 모자라요. 손님을 담으면 받아요`, 2400);
    S.stones -= t[2]; S.treat = k; S.left = t[3]; S.last = Date.now(); save(); render(); plan(true);
    opt.toast(`${t[0]} ${rul(t[1])} 놓았어요. 화면을 켜 두면 손님이 찾아와요 🐾`, 2600);
  }
  function pick() {
    const tk = S.treat || "b", w = G.map(g => TIERW[g[2]] * (g[3].includes(tk) ? 3 : .25));
    let r = Math.random() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < G.length; i++) { r -= w[i]; if (r <= 0) return i; } return 0;
  }
  function plan(first) {
    clearTimeout(nextT); if (!S.treat || S.left <= 0 || cur) return;
    const ms = (first ? 70 + Math.random() * 110 : 150 + Math.random() * 210) * 1000;   // 처음엔 1~3분, 그다음 2.5~6분
    nextT = setTimeout(arrive, ms);
  }
  function arrive() {
    if (!S.treat || S.left <= 0 || cur) return;
    const k = pick(); cur = { k, at: Date.now() };
    const g = G[k], b = $("gsBub");
    b.innerHTML = `<span class="e">${g[0]}</span><span><b>${ga(g[1])} 왔어요!</b><small>${g[4]}</small></span><button>📸 담기</button>`;
    b.classList.add("on"); render();
    if (g[2] >= 2) opt.toast(`${g[0]} 와, ${TIERN[g[2]]} 손님 ${ga(g[1])} 왔어요! 오른쪽 아래 📸`, 3200);
    clearTimeout(leaveT); leaveT = setTimeout(leave, 75000);
  }
  function eat() { S.left--; S.visits++; S.last = Date.now(); if (S.left <= 0) { S.treat = null; setTimeout(() => opt.toast("🍽 간식을 다 먹었어요. ☰ 더보기 → 🐾 손님에서 새로 놓아 주세요", 3200), 2600); } }
  function snap() {
    if (!cur) return; const k = cur.k, g = G[k], first = !S.seen[k];
    S.seen[k] = (S.seen[k] || 0) + 1; const gift = [1, 2, 4, 8][g[2]] + (first ? 1 : 0); S.stones += gift; eat(); save();
    cur = null; clearTimeout(leaveT); $("gsBub").classList.remove("on");
    opt.toast(`${g[0]} ${g[1]}${first ? " 도감에 새로 담았어요!" : " 또 만났어요"} · ✨ 반짝돌 +${gift}${seenN() === G.length && first ? " · 🏅 한강 손님 도감 완성!" : ""}`, 3000);
    opt.send({ t: "guest", k, r: g[2] });
    render(); plan();
  }
  function leave() {
    if (!cur) return; const g = G[cur.k]; cur = null; S.stones += 1; eat(); save(); $("gsBub").classList.remove("on");
    opt.toast(`${g[0]} ${ga(g[1])} 반짝돌 1개를 두고 떠났어요 🐾`, 2600); render(); plan();
  }
  function away() {   // 자리를 비운 사이 다녀간 손님(사진 없이 반짝돌만)
    if (!S.treat || S.left <= 0 || !S.last) return;
    const n = Math.min(2, S.left, Math.floor((Date.now() - S.last) / (20 * 60e3))); if (n <= 0) return;
    for (let i = 0; i < n; i++) { S.stones += 1; eat(); }
    save(); setTimeout(() => opt.toast(`🐾 자리를 비운 사이 손님 ${n}마리가 다녀갔어요 · ✨ 반짝돌 +${n}`, 3200), 4000);
  }

  H.init = o => {
    opt = o; build(); away(); plan(true);
    setInterval(() => { if (S.treat && S.left > 0 && !document.hidden) { S.last = Date.now(); save(); } }, 30000);   // 켜 둔 동안은 '비운 시간'으로 안 셈
  };
  H.open = open;
  H.dbgArrive = () => { if (!S.treat) { S.treat = "b"; S.left = 3; } cur = null; arrive(); };
  H.onMsg = m => { if (m.t === "guest" && m.nick && opt.me && m.id !== opt.me()) { const g = G[m.k]; if (g) opt.toast(`${g[0]} ${m.nick}님 돗자리에 ${TIERN[g[2]]} 손님 ${ga(g[1])} 왔어요!`, 3000); } };
})();
