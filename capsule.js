// ⏳ 미래의 나에게(01·02 공통): 지금 마음을 편지로 봉인 → 7일·30일·100일 뒤 한강에 다시 오면 열린다. 이 폰에만 저장(hn-capsule), 서버로 안 감.
// 근거: FutureMe(2002년부터 '미래의 나에게' 편지 수백만 통). 열릴 날이 있으면 다시 올 이유가 생긴다.
(() => {
  const H = window.HNCapsule = {}; let opt = {}, L = [], box = null;
  const F = `system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]).replace(/\n/g, "<br>");
  const RISK = /죽고\s*싶|자살|사라지고\s*싶|살기\s*싫|끝내고\s*싶/;
  function load() { try { L = JSON.parse(localStorage.getItem("hn-capsule") || "[]"); } catch { L = []; } }
  function save() { try { localStorage.setItem("hn-capsule", JSON.stringify(L.slice(-30))); } catch {} }
  const ymd = t => { const d = new Date(t + 9 * 3600e3); return `${d.getUTCFullYear()}. ${d.getUTCMonth() + 1}. ${d.getUTCDate()}`; };
  const css = `
  #cpBox { position: fixed; inset: 0; z-index: 12; display: none; align-items: center; justify-content: center; background: rgba(4,6,20,.68); }
  #cpBox.on { display: flex; }
  #cpBox .in { width: min(350px, calc(100vw - 24px)); max-height: calc(100vh - 24px); overflow: auto; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; padding: 18px 16px 14px; border-radius: 22px; background: #f7f0e1; color: #3b2d22; box-shadow: 0 14px 44px rgba(0,0,0,.55); font: 14px/1.6 ${F}; }
  #cpBox h3 { margin: 0; font-size: 17px; text-align: center; color: #7a4a26; } #cpBox .sub { text-align: center; font-size: 12.5px; color: #8a7360; }
  #cpBox textarea { all: unset; box-sizing: border-box; width: 100%; min-height: 130px; padding: 12px; border-radius: 12px; background: repeating-linear-gradient(#fffaf0, #fffaf0 25px, #ecdcc2 26px); font: 15px/26px ${F}; color: #3b2d22; white-space: pre-wrap; }
  #cpBox .when { display: flex; gap: 6px; } #cpBox .when button { flex: 1; }
  #cpBox button { all: unset; cursor: pointer; text-align: center; padding: 10px 6px; border-radius: 12px; font-weight: 800; font-size: 13.5px; background: #ead9bd; color: #5b3d22; }
  #cpBox button.sel { background: #7a4a26; color: #fff4e2; } #cpBox .go { background: #c0573f; color: #fff; border-radius: 999px; } #cpBox .x { background: none; color: #8a7360; font-weight: 600; padding: 4px; }
  #cpBox .letter { padding: 14px; border-radius: 12px; background: #fffaf0; border: 1px dashed #d8bf98; font-size: 15px; white-space: normal; }
  #cpBox .list { font-size: 12.5px; color: #7d6652; text-align: center; } #cpBox .help { font-size: 12.5px; color: #a0412d; text-align: center; font-weight: 700; }
  #cpBox .seal { font-size: 46px; text-align: center; line-height: 1; }`;
  function build() {
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    box = document.createElement("div"); box.id = "cpBox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "미래의 나에게");
    box.onclick = e => { if (e.target === box) return close(); const d = e.target.closest("[data-do]"); if (!d) return; act(d.dataset.do, d.dataset.v); };
    document.body.appendChild(box);
  }
  let days = 30;
  function sealed() { const s = L.filter(x => !x.read && x.open > Date.now()).sort((a, b) => a.open - b.open); return s; }
  function write() {
    const s = sealed();
    box.innerHTML = `<div class="in"><h3>⏳ 미래의 나에게</h3><div class="sub">지금 마음을 적어 봉인해요. 정한 날이 지나 한강에 오면 열려요.<br>이 폰에만 저장되고 누구에게도 안 보여요.</div>
      <textarea id="cpTx" maxlength="600" placeholder="한 달 뒤의 나는 어떻게 지내고 있을까? 지금 고민, 바라는 것, 오늘 한강에서 본 것…"></textarea>
      <div class="when">${[7, 30, 100].map(d => `<button data-do="days" data-v="${d}" class="${d === days ? "sel" : ""}">${d}일 뒤</button>`).join("")}</div>
      <button class="go" data-do="seal">💌 봉인하기</button>
      ${s.length ? `<div class="list">봉인된 편지 ${s.length}통 · 가장 빠른 편지는 ${Math.ceil((s[0].open - Date.now()) / 864e5)}일 뒤에 열려요</div>` : ""}
      <button class="x" data-do="close">닫기</button></div>`;
    box.classList.add("on"); opt.closeOthers && opt.closeOthers(); setTimeout(() => { const t = document.getElementById("cpTx"); t && t.focus(); }, 50);
  }
  function show(x) {
    x.read = Date.now(); save(); const ago = Math.max(1, Math.round((Date.now() - x.at) / 864e5));
    box.innerHTML = `<div class="in"><div class="seal">💌</div><h3>${ago}일 전의 내가 보낸 편지</h3><div class="sub">${ymd(x.at)} 밤 한강에서 쓴 편지예요</div>
      <div class="letter">${esc(x.text)}</div>${RISK.test(x.text) ? `<div class="help">많이 힘들었구나. 지금도 그렇다면 109(자살예방 상담)·1388(청소년)에 전화해 주세요</div>` : ""}
      <div class="sub">그때의 나에게 한마디 해 줄 수 있다면, 새 편지로 남겨 봐요</div>
      <button class="go" data-do="new">✍️ 새 편지 쓰기</button><button class="x" data-do="close">닫기</button></div>`;
    box.classList.add("on");
  }
  function act(k, v) {
    if (k === "close") close();
    else if (k === "days") { days = +v; box.querySelectorAll('[data-do="days"]').forEach(b => b.classList.toggle("sel", +b.dataset.v === days)); }
    else if (k === "new") write();
    else if (k === "seal") { const t = (document.getElementById("cpTx").value || "").trim(); if (t.length < 2) return opt.toast && opt.toast("✍️ 한 줄이라도 적어 주세요", 2000);
      L.push({ at: Date.now(), open: Date.now() + days * 864e5, text: t.slice(0, 600) }); save(); opt.send && opt.send({ t: "cap", d: days });
      box.innerHTML = `<div class="in"><div class="seal">🔒</div><h3>봉인했어요</h3><div class="sub">${ymd(Date.now() + days * 864e5)} 이후에 한강에 오면 열려요.<br>그날의 나에게 잘 전해 줄게요.</div><button class="x" data-do="close">닫기</button></div>`; }
  }
  function close() { box && box.classList.remove("on"); }
  // 들어올 때: 열릴 날이 지난 편지가 있으면 잠시 뒤 보여 줌
  H.arrive = () => { if (!box) return void (H._pending = 1); const due = L.filter(x => !x.read && x.open <= Date.now()).sort((a, b) => a.at - b.at)[0]; if (due) setTimeout(() => { if (!document.querySelector("#skBox.on")) show(due); else setTimeout(() => show(due), 9000); }, 6500); };
  H.init = o => { opt = o; load(); build(); if (H._pending) { H._pending = 0; H.arrive(); } };
  H.open = () => { const due = L.filter(x => !x.read && x.open <= Date.now())[0]; due ? show(due) : write(); };
  H.close = close;
})();
