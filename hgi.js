// 🐶 같이 키우는 한강이(01·02 공통): 접속한 모두가 같이 돌보는 강아지. 새벽 5시에 아기로 다시 태어나 하룻밤 사이에 자란다.
// 다마고치(누적 1억 대 넘게 판매, 반다이)처럼 '돌봐야 할 대상'이 다시 들를 이유가 된다. 💛 응원 = 이름 붙은 특별 간식.
// 서버: hg{k: feed|pet|ball} / hgS{s, ev}·hgOk·hgWait. 01은 HNHgi.draw(cx,x,y,s,t)로 벤치 옆에 그리고 HNHgi.hit()로 누름.
(() => {
  const H = window.HNHgi = {}; let opt = {}, S = null, box = null, cd = { feed: 0, pet: 0, ball: 0 }, tick = null, log = [], img = {}, anim = null;
  const F = `system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const SC = [.72, .84, .96, 1.08, 1.2];
  function svg(st, sad) {
    const eye = sad ? `<path d="M32 35 q4 -3 8 0" stroke="#2a1a10" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M48 35 q4 -3 8 0" stroke="#2a1a10" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
      : `<circle cx="36" cy="34" r="3.4" fill="#2a1a10"/><circle cx="52" cy="34" r="3.4" fill="#2a1a10"/><circle cx="37" cy="33" r="1.1" fill="#fff"/><circle cx="53" cy="33" r="1.1" fill="#fff"/>`;
    const mouth = sad ? `<path d="M40 48 q4 -3 8 0" stroke="#2a1a10" stroke-width="1.6" fill="none" stroke-linecap="round"/>` : `<path d="M40 46 q4 4 8 0" stroke="#2a1a10" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M42.5 47.5 q1.5 5 3 0z" fill="#ff7a8a"/>`;
    const acc = (st >= 1 ? `<path d="M30 54 q16 8 32 0" stroke="#e8505b" stroke-width="4" fill="none" stroke-linecap="round"/>` : "")
      + (st >= 2 ? `<path d="M34 56 l12 10 l12 -10z" fill="#4aa3ff"/><circle cx="46" cy="60" r="1.6" fill="#fff"/>` : "")
      + (st >= 3 ? `<circle cx="46" cy="59" r="3.4" fill="#ffd34d" stroke="#c9952a"/>` : "")
      + (st >= 4 ? `<path d="M33 18 l4 -9 l5 6 l4 -8 l4 8 l5 -6 l4 9z" fill="#ffd34d" stroke="#c9952a" stroke-width="1"/>` : "");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 90"><ellipse cx="45" cy="84" rx="24" ry="4" fill="rgba(0,0,0,.25)"/>
      <path d="M66 58 q14 -6 12 -20" stroke="#d9a066" stroke-width="7" fill="none" stroke-linecap="round"/>
      <ellipse cx="46" cy="64" rx="22" ry="17" fill="#f2c48d"/><ellipse cx="46" cy="69" rx="12" ry="10" fill="#fff1dc"/>
      <rect x="31" y="72" width="8" height="12" rx="4" fill="#f2c48d"/><rect x="53" y="72" width="8" height="12" rx="4" fill="#f2c48d"/>
      <circle cx="44" cy="36" r="21" fill="#f2c48d"/><path d="M27 22 q-12 2 -10 22 q8 0 13 -10z" fill="#b97a45"/><path d="M61 22 q12 2 10 22 q-8 0 -13 -10z" fill="#b97a45"/>
      <ellipse cx="44" cy="44" rx="11" ry="8" fill="#fff1dc"/>${eye}<ellipse cx="44" cy="41" rx="3.6" ry="2.6" fill="#2a1a10"/>${mouth}
      <circle cx="31" cy="42" r="3" fill="#ff9fae" opacity=".6"/><circle cx="57" cy="42" r="3" fill="#ff9fae" opacity=".6"/>${acc}</svg>`;
  }
  function imgOf(st, sad) { const k = st + (sad ? "s" : ""); if (!img[k]) { const i = new Image(); i.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg(st, sad)); img[k] = i; } return img[k]; }
  const css = `
  #hgBox { position: fixed; inset: 0; z-index: 12; display: none; align-items: center; justify-content: center; background: rgba(4,6,20,.66); }
  #hgBox.on { display: flex; }
  #hgBox .in { width: min(350px, calc(100vw - 24px)); max-height: calc(100vh - 24px); overflow: auto; display: flex; flex-direction: column; gap: 9px; padding: 16px 14px 12px; border-radius: 22px; background: #1a1834; color: #f3efff; border: 1px solid rgba(255,214,150,.3); box-shadow: 0 14px 44px rgba(0,0,0,.55); font: 13.5px/1.45 ${F}; text-align: center; }
  #hgBox .hd { display: flex; justify-content: space-between; align-items: center; } #hgBox .hd b { color: #ffd98a; font-size: 16px; }
  #hgBox .x { all: unset; cursor: pointer; padding: 3px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,.2); font-size: 12.5px; }
  #hgBox .pup { position: relative; height: 130px; padding-top: 28px; box-sizing: border-box; display: flex; align-items: flex-end; justify-content: center; background: radial-gradient(ellipse at 50% 90%, rgba(120,200,120,.25), transparent 60%); }
  #hgBox .pup img { transition: width .6s; animation: hgHop 1.4s ease-in-out infinite; } #hgBox .pup.joy img { animation: hgJoy .5s ease-in-out 3; }
  #hgBox .say { position: absolute; top: 2px; left: 50%; transform: translateX(-50%); padding: 4px 10px; border-radius: 12px; background: #fffaf0; color: #3a2a18; font-weight: 800; font-size: 12.5px; white-space: nowrap; }
  @keyframes hgHop { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } } @keyframes hgJoy { 0%,100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-14px) rotate(-6deg); } }
  #hgBox .lv { font-size: 13px; color: #d7d0f5; } #hgBox .lv b { color: #fff; }
  #hgBox .bar { height: 8px; border-radius: 4px; background: rgba(255,255,255,.1); overflow: hidden; } #hgBox .bar i { display: block; height: 100%; border-radius: 4px; transition: width .5s; }
  #hgBox .lbl { display: flex; justify-content: space-between; font-size: 11.5px; color: #bdb6e2; margin-bottom: 2px; }
  #hgBox .acts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
  #hgBox .acts button { all: unset; cursor: pointer; text-align: center; padding: 9px 4px; border-radius: 13px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.15); font-weight: 800; font-size: 13px; line-height: 1.25; }
  #hgBox .acts button small { display: block; font-weight: 600; font-size: 11px; color: #c2bbe8; } #hgBox .acts button.wait { opacity: .5; }
  #hgBox .treat { all: unset; cursor: pointer; text-align: center; padding: 10px; border-radius: 999px; background: linear-gradient(135deg, #ffd27a, #ff9fb6); color: #2a1838; font-weight: 800; }
  @media (orientation: landscape) and (max-height: 520px) { #hgBox .in { width: min(560px, calc(100vw - 24px)); display: grid; grid-template-columns: 170px 1fr; gap: 7px 12px; padding: 12px; text-align: left; } #hgBox .hd, #hgBox .log, #hgBox .who, #hgBox .treat, #hgBox .acts { grid-column: 1 / -1; } #hgBox .pup { grid-row: span 3; height: 112px; } #hgBox .log, #hgBox .who { text-align: center; } #hgBox .log { min-height: 0; } }
  #hgBox .log { font-size: 12px; color: #cfc8ef; min-height: 34px; } #hgBox .who { font-size: 11.5px; color: #a9a2d2; }`;
  function build() {
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    box = document.createElement("div"); box.id = "hgBox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "같이 키우는 한강이");
    box.onclick = e => { if (e.target === box) return close(); const d = e.target.closest("[data-do]"); if (!d) return; const k = d.dataset.do;
      if (k === "close") close(); else if (k === "treat") { close(); opt.openSup && opt.openSup(); }
      else if (cd[k] > Date.now()) { const w = Math.ceil((cd[k] - Date.now()) / 1000); say(`${w >= 60 ? Math.ceil(w / 60) + "분" : w + "초"} 뒤에 또 해 줘요`); }
      else opt.send({ t: "hg", k }); };
    document.body.appendChild(box);
  }
  const sad = () => S && S.hunger >= 70;
  function say(t) { const e = box && box.querySelector(".say"); if (e) e.textContent = t; }
  function render() {
    if (!box || !S) return; const pct = S.next ? Math.round((S.xp - S.base) / (S.next - S.base) * 100) : 100, full = 100 - S.hunger, sz = Math.round(96 * SC[S.st]);
    const left = k => { const w = Math.ceil((cd[k] - Date.now()) / 1000); return w > 0 ? (w >= 60 ? Math.ceil(w / 60) + "분 뒤" : w + "초 뒤") : ""; };
    box.innerHTML = `<div class="in"><div class="hd"><b>🐶 같이 키우는 한강이</b><button class="x" data-do="close">닫기</button></div>
      <div class="pup"><span class="say">${sad() ? "배고파요… 🍚" : S.st >= 4 ? "한강은 내가 지킬게요!" : "멍! 같이 놀아요"}</span><img alt="한강이" width="${sz}" height="${sz}" src="${imgOf(S.st, sad()).src}"></div>
      <div class="lv">오늘의 한강이 · <b>${esc(S.name)}</b> (${S.st + 1}/5단계)</div>
      <div><div class="lbl"><span>자라기</span><span>${S.next ? `${S.xp} / ${S.next}` : `${S.xp} · 다 자랐어요`}</span></div><div class="bar"><i style="width:${pct}%;background:linear-gradient(90deg,#7ee06a,#48d6e0)"></i></div></div>
      <div><div class="lbl"><span>배부름</span><span>${full}%</span></div><div class="bar"><i style="width:${full}%;background:${full < 30 ? "#ff7a7a" : "#ffd27a"}"></i></div></div>
      <div class="acts"><button data-do="feed" class="${left("feed") ? "wait" : ""}">🍚 밥<small>${left("feed") || "10분에 1번"}</small></button><button data-do="pet" class="${left("pet") ? "wait" : ""}">🤚 쓰다듬기<small>${left("pet") || "1분에 1번"}</small></button><button data-do="ball" class="${left("ball") ? "wait" : ""}">🎾 공놀이<small>${left("ball") || "5분에 1번"}</small></button></div>
      <button class="treat" data-do="treat">💛 응원하고 특별 간식 주기</button>
      <div class="log">${log.slice(-2).map(esc).join("<br>") || "다 같이 돌보면 밤사이에 쑥쑥 자라요"}</div>
      <div class="who">${S.n ? `오늘 ${S.n}명이 돌봤어요` : ""}${S.treats && S.treats.length ? ` · 간식 준 분: ${S.treats.slice(-4).map(esc).join(", ")}` : ""}<br>새벽 5시에 다시 아기로 태어나요</div></div>`;
  }
  function open() { if (!box) return; render(); box.classList.add("on"); opt.closeOthers && opt.closeOthers(); clearInterval(tick); tick = setInterval(() => { if (H.isOpen()) render(); }, 1000); }
  function close() { box && box.classList.remove("on"); clearInterval(tick); }
  // 01 캔버스: 벤치 옆에 앉은 한강이 + 이름표, 배고프면 말풍선
  H.draw = (cx, x, y, s, t) => {
    if (!S) return; const sz = 22 * s * SC[S.st], im = imgOf(S.st, sad()), now = performance.now() / 1000, hop = anim && now - anim < 1.5 ? Math.abs(Math.sin((now - anim) * 9)) * 5 * s : Math.abs(Math.sin(t * 2.2)) * .8 * s;
    if (im.complete && im.naturalWidth) cx.drawImage(im, x - sz / 2, y - sz + 1 * s - hop, sz, sz);
    cx.save(); cx.textAlign = "center"; cx.font = `700 ${3 * s}px ${F}`; cx.globalAlpha = window.HNCalm ? HNCalm.a() : 1; cx.fillStyle = "rgba(255,240,210,.9)"; cx.fillText(`한강이 · ${S.name}`, x, y - sz - 1.5 * s);
    if (sad()) { const bx = x + sz * .45, by = y - sz * .95; cx.fillStyle = "#fffaf0"; cx.beginPath(); cx.arc(bx, by, 4.4 * s, 0, 7); cx.fill(); cx.font = `${4.4 * s}px ${F}`; cx.textBaseline = "middle"; cx.fillText("🍚", bx, by + .3 * s); }
    cx.restore(); H._hit = { x, y, sz };
  };
  H.hit = (px, py) => { const b = H._hit; return !!b && Math.abs(px - b.x) < b.sz * .6 && py > b.y - b.sz - 6 && py < b.y + 4; };
  H.init = o => { opt = o; build(); };
  H.open = open; H.close = close; H.isOpen = () => !!box && box.classList.contains("on");
  const LBL = { feed: "밥을 줬어요 🍚", pet: "쓰다듬었어요 🤚", ball: "공을 던져 줬어요 🎾", treat: "특별 간식을 줬어요 💛" };
  H.onMsg = m => {
    if (m.t === "init" && m.hg) S = m.hg;
    else if (m.t === "hgS") { S = m.s; const e = m.ev; if (e) { log.push(`${e.nick}님이 ${LBL[e.k] || ""}`); log = log.slice(-6); anim = performance.now() / 1000;
        if (e.grow && opt.toast) opt.toast(`🐶 한강이가 '${e.grow}'(으)로 자랐어요! 다 같이 돌본 덕분이에요`, 4000);
        else if (e.k === "treat" && opt.toast) opt.toast(`🐶 ${e.nick}님이 한강이에게 특별 간식을 줬어요 💛`, 3500); }
      if (H.isOpen()) { render(); const p = box.querySelector(".pup"); if (p && e) p.classList.add("joy"); } }
    else if (m.t === "hgOk") cd[m.k] = Date.now() + m.left;
    else if (m.t === "hgWait") { cd[m.k] = Date.now() + m.left; if (H.isOpen()) render(); }
  };
})();
