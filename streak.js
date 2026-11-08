// 🔥 연속 출석 선물(01·02 공통): 📒 수첩 도장(hn-visit)이 이어지면 선물. 듀오링고: 7일 연속을 만든 사람은 끝까지 할 확률 3.6배, 얼음(하루 쉬어도 이어짐)으로 매일 쓰는 사람 +0.38%.
// 3일 🔥 배지+🧊 얼음 1 · 7일 ⭐ 배지+🧊 1 · 14일 💎 · 30일 🌕. 배지는 내 캐릭터 머리 옆(01)·이름표(02)에 모두에게 보임(서버 stk, 꾸밈만). 얼음은 하루 빠진 날을 자동으로 메움.
(() => {
  const H = window.HNStreak = {}; let opt = {}, S = { ice: 0, got: [], shown: "" }, box = null;
  const TIERS = [[3, "🔥", "불꽃 배지", 1], [7, "⭐", "별 배지", 1], [14, "💎", "보석 배지", 0], [30, "🌕", "보름달 배지", 0]];
  H.badge = k => ["", "🔥", "⭐", "💎", "🌕"][k] || "";
  const F = `system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  const kst = (ms = Date.now()) => new Date(ms + 9 * 3600e3).toISOString().slice(0, 10);
  function load() { try { S = Object.assign(S, JSON.parse(localStorage.getItem("hn-streak") || "{}")); } catch {} }
  function save() { try { localStorage.setItem("hn-streak", JSON.stringify(S)); } catch {} }
  const css = `
  #skBox { position: fixed; inset: 0; z-index: 12; display: none; align-items: center; justify-content: center; background: rgba(4,6,20,.6); }
  #skBox.on { display: flex; }
  #skBox .in { width: min(320px, calc(100vw - 32px)); display: flex; flex-direction: column; gap: 10px; padding: 18px 16px 14px; border-radius: 22px; background: linear-gradient(180deg, #2a1838, #171a38); color: #fff4e6; border: 1px solid rgba(255,190,120,.4); box-shadow: 0 14px 44px rgba(0,0,0,.55); font: 14px/1.5 ${F}; text-align: center; }
  #skBox .big { font-size: 46px; line-height: 1; } #skBox h3 { margin: 0; font-size: 19px; color: #ffcf7a; }
  #skBox .road { display: flex; justify-content: space-between; gap: 4px; }
  #skBox .road div { flex: 1; padding: 7px 2px; border-radius: 12px; background: rgba(255,255,255,.06); font-size: 11.5px; color: #cbbfe0; } #skBox .road div b { display: block; font-size: 20px; filter: grayscale(1) opacity(.45); }
  #skBox .road div.ok { background: rgba(255,200,120,.16); color: #ffe2b0; } #skBox .road div.ok b { filter: none; }
  #skBox .gift { padding: 9px; border-radius: 14px; background: rgba(255,214,140,.14); color: #ffe7bd; font-weight: 700; }
  #skBox .msg { font-size: 12.5px; color: #d8cbe8; } #skBox .msg a { color: #ffd98a; font-weight: 700; text-decoration: underline; cursor: pointer; }
  #skBox .in { max-height: calc(100vh - 16px); overflow: auto; box-sizing: border-box; }
  @media (orientation: landscape) and (max-height: 520px) { #skBox .in { width: min(520px, calc(100vw - 32px)); gap: 6px; padding: 12px 14px; } #skBox .big { font-size: 30px; } #skBox h3 { font-size: 16px; } #skBox .gift { padding: 6px; font-size: 13px; } }
  #skBox button { all: unset; cursor: pointer; padding: 11px; border-radius: 999px; background: #ffcf7a; color: #2a1838; font-weight: 800; text-align: center; }`;
  function build() {
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    box = document.createElement("div"); box.id = "skBox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "연속 출석");
    box.onclick = e => { if (e.target === box) return close(); const d = e.target.closest("[data-do]"); if (!d) return; close(); if (d.dataset.do === "sup") opt.openSup && opt.openSup(); };
    document.body.appendChild(box);
  }
  // 어제가 비었고 그 전날은 왔으면 얼음으로 메운다(빠진 날이 하루일 때만)
  function freeze() {
    const v = opt.visit && opt.visit(); if (!v || !S.ice) return null; v.frozen = v.frozen || [];
    const has = d => v.days.includes(d) || v.frozen.includes(d), y = kst(Date.now() - 864e5), y2 = kst(Date.now() - 2 * 864e5);
    if (!has(y) && has(y2)) { v.frozen.push(y); v.frozen = v.frozen.slice(-30); S.ice--; save(); opt.saveVisit && opt.saveVisit(); return y; }
    return null;
  }
  function open(gift, used) {
    const n = opt.streak ? opt.streak() : 0, nx = TIERS.find(t => n < t[0]);
    box.innerHTML = `<div class="in"><div class="big">${n >= 3 ? H.badge(tier(n)) : "🔥"}</div><h3>${n}일 연속 한강!</h3>
      ${used ? `<div class="gift">🧊 어제 못 왔지만 얼음이 연속을 지켜 줬어요</div>` : ""}
      ${gift ? `<div class="gift">🎁 ${gift}</div>` : ""}
      <div class="road">${TIERS.map(t => `<div class="${n >= t[0] ? "ok" : ""}"><b>${t[1]}</b>${t[0]}일</div>`).join("")}</div>
      <div class="msg">${nx ? `${nx[0] - n}일 더 오면 ${nx[1]} ${nx[2]}${nx[3] ? " + 🧊 얼음" : ""}` : "모든 배지를 모았어요! 한강의 단골이에요"}<br><small>지금 가진 🧊 얼음 ${S.ice}개 · 하루 빠져도 연속을 지켜 줘요</small></div>
      <div class="msg">매일 와 줘서 고마워요. 이 공간이 좋다면 <a data-do="sup">💛 응원하기</a></div>
      <button data-do="close">좋아요</button></div>`;
    box.classList.add("on"); opt.closeOthers && opt.closeOthers();
  }
  function close() { box && box.classList.remove("on"); }
  const tier = n => n >= 30 ? 4 : n >= 14 ? 3 : n >= 7 ? 2 : n >= 3 ? 1 : 0;
  // 접속(도장 찍은 뒤) 때 부름: 얼음 처리 → 새 선물 → 하루 한 번 카드 → 서버에 배지
  let pending = false;
  H.arrive = () => {
    if (!box) { pending = true; return; }
    const used = freeze(), n = opt.streak ? opt.streak() : 0; let gift = "";
    for (const t of TIERS) if (n >= t[0] && !S.got.includes(t[0])) { S.got.push(t[0]); if (t[3]) S.ice = Math.min(3, S.ice + t[3]); gift = `${t[0]}일 선물: ${t[1]} ${t[2]}${t[3] ? " + 🧊 얼음 1개" : ""} (내 캐릭터 옆에 모두에게 보여요)`; }
    save(); opt.send && opt.send({ t: "stk", n });
    const today = kst(); if ((n >= 2 || used) && S.shown !== today) { S.shown = today; save(); setTimeout(() => open(gift, used), 4500); }
  };
  H.init = o => { opt = o; load(); build(); if (pending) { pending = false; H.arrive(); } };
  H.open = () => open("", null); H.close = close;
})();
