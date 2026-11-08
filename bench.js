// 💛 고마운 벤치(01·02 공통): 오늘 💛 응원해 준 사람 이름이 산책로 벤치 명판에 새겨진다(한국 날짜 기준 오늘 하루).
// 근거: 서울시 기부 벤치 '당신의 자리'(명판에 이름·문구), 공원 기부자 이름 새기기. 이름은 서버 supDay(응원 때 쌓임)를 그대로 씀 → 서버 변경 없음.
// 01: HNBench.draw(cx, x, y, s, t) 로 캔버스에 벤치를 그리고 HNBench.hit(px, py)로 누름 판정. 02: ☰ 메뉴·벤치 표지에서 HNBench.open().
(() => {
  const H = window.HNBench = {}; let opt = {}, box = null, last = null;
  const F = `system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const names = () => { try { return (opt.names ? opt.names() : []).filter(n => n && !/\(운영자\)$/.test(n)); } catch { return []; } };
  const css = `
  #bnBox { position: fixed; inset: 0; z-index: 12; display: none; align-items: center; justify-content: center; background: rgba(4,6,20,.66); }
  #bnBox.on { display: flex; }
  #bnBox .in { width: min(340px, calc(100vw - 28px)); max-height: calc(100vh - 40px); overflow: auto; display: flex; flex-direction: column; gap: 10px; padding: 18px 16px 14px; border-radius: 22px; background: #1b1530; color: #f6efe0; border: 1px solid rgba(255,214,140,.35); box-shadow: 0 14px 44px rgba(0,0,0,.55); font: 14px/1.5 ${F}; text-align: center; }
  #bnBox h3 { margin: 0; font-size: 17px; color: #ffd98a; }
  #bnBox .bench { position: relative; margin: 4px auto 2px; width: 100%; max-width: 290px; padding: 14px 10px 22px; border-radius: 10px; background: linear-gradient(#8a5a33, #6d4426); box-shadow: inset 0 -6px 0 #563419, 0 8px 0 -2px #3b2614; }
  #bnBox .bench:before { content: ""; position: absolute; left: 6px; right: 6px; top: 50%; height: 2px; background: rgba(0,0,0,.18); }
  #bnBox .plates { position: relative; display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
  #bnBox .plate { padding: 4px 9px; border-radius: 4px; background: linear-gradient(#f3d48a, #c99a44); color: #3a2608; font: 800 12.5px/1.2 ${F}; box-shadow: inset 0 1px 0 rgba(255,255,255,.6), 0 1px 2px rgba(0,0,0,.4); }
  #bnBox .plate.me { outline: 2px solid #fff; }
  #bnBox .empty { color: #f6e2bd; font-size: 13px; padding: 6px; }
  #bnBox .msg { font-size: 13px; color: #e8dcc6; }
  #bnBox button { all: unset; cursor: pointer; padding: 11px; border-radius: 999px; font: 800 14px ${F}; text-align: center; }
  #bnBox .go { background: linear-gradient(135deg, #ffd27a, #ff9fb6); color: #2a1838; } #bnBox .x { color: #c9bfa8; font-size: 13px; padding: 4px; }`;
  function build() {
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    box = document.createElement("div"); box.id = "bnBox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "고마운 벤치");
    box.onclick = e => { if (e.target === box) return close(); const d = e.target.closest("[data-do]"); if (!d) return; if (d.dataset.do === "sup") { close(); opt.openSup && opt.openSup(); } else close(); };
    document.body.appendChild(box);
  }
  function open() {
    const L = names(), me = opt.myNick ? opt.myNick() : "";
    box.innerHTML = `<div class="in"><h3>💛 고마운 벤치</h3><div class="msg">오늘 한강을 응원해 준 분들의 이름이<br>이 벤치에 새겨져 있어요 (오늘 밤 12시까지)</div>
      <div class="bench"><div class="plates">${L.length ? L.slice().reverse().map(n => `<span class="plate ${n === me ? "me" : ""}">${esc(n)}</span>`).join("") : `<div class="empty">아직 비어 있어요. 오늘 첫 이름이 되어 주세요</div>`}</div></div>
      <div class="msg">${L.length ? `오늘 <b>${L.length}명</b>이 응원했어요. 덕분에 한강 불이 켜져 있어요` : "응원은 이 공간을 계속 여는 데 쓰여요"}</div>
      <button class="go" data-do="sup">💛 응원하고 내 이름 새기기</button><button class="x" data-do="close">닫기</button></div>`;
    box.classList.add("on"); opt.closeOthers && opt.closeOthers();
  }
  function close() { box && box.classList.remove("on"); }
  // 01 캔버스: 등받이 벤치 + 금색 명판(최근 3명) + 명판 수
  H.draw = (cx, x, y, s, t) => {
    const L = names(), w = 34 * s, sh = 4 * s, legH = 7 * s, seatY = y - legH, backY = seatY - 12 * s;
    cx.save();
    cx.fillStyle = "rgba(0,0,0,.28)"; cx.beginPath(); cx.ellipse(x, y + 1 * s, w * .58, 2.6 * s, 0, 0, 7); cx.fill();
    cx.fillStyle = "#3a2a1c"; for (const dx of [-w / 2 + 3 * s, w / 2 - 5 * s]) { cx.fillRect(x + dx, seatY, 2 * s, legH); cx.fillRect(x + dx, backY, 2 * s, 12 * s); }
    cx.fillStyle = "#8a5a33"; cx.fillRect(x - w / 2, seatY - sh, w, sh); cx.fillStyle = "#6d4426"; cx.fillRect(x - w / 2, seatY - 1.2 * s, w, 1.2 * s);
    cx.fillStyle = "#8a5a33"; cx.fillRect(x - w / 2, backY, w, 3.2 * s); cx.fillRect(x - w / 2, backY + 5 * s, w, 3.2 * s);
    const n = Math.min(3, L.length), pw = 9.4 * s, ph = 2.6 * s;
    for (let i = 0; i < n; i++) { const px = x - (n * pw + (n - 1) * 1.2 * s) / 2 + i * (pw + 1.2 * s), py = backY + 5.3 * s;
      cx.fillStyle = "#e9c46f"; cx.fillRect(px, py, pw, ph); cx.fillStyle = "#3a2608"; cx.font = `800 ${2.1 * s}px ${F}`; cx.textAlign = "center"; cx.textBaseline = "middle";
      let nm = L[L.length - 1 - i]; while (cx.measureText(nm).width > pw - .8 * s && nm.length > 1) nm = nm.slice(0, -1); cx.fillText(nm, px + pw / 2, py + ph / 2 + .2 * s); }
    if (L.length) { const g = .55 + .45 * Math.sin(t * 2.4); cx.globalAlpha = g; cx.fillStyle = "#ffd98a"; cx.font = `700 ${3.4 * s}px ${F}`; cx.textAlign = "center"; cx.textBaseline = "alphabetic"; cx.fillText("💛", x + w / 2 + 2 * s, backY - 1 * s); cx.globalAlpha = 1; }
    cx.globalAlpha = window.HNCalm ? HNCalm.a() : 1; cx.fillStyle = "rgba(255,240,210,.85)"; cx.font = `700 ${3.1 * s}px ${F}`; cx.textAlign = "center"; cx.textBaseline = "alphabetic";
    cx.fillText(L.length ? `고마운 벤치 · ${L.length}명` : "고마운 벤치", x, backY - 2.2 * s);
    cx.restore(); last = { x, y, s, w };
  };
  H.hit = (px, py) => !!last && Math.abs(px - last.x) < last.w / 2 + 6 * last.s && py > last.y - 30 * last.s && py < last.y + 4 * last.s;
  H.init = o => { opt = o; build(); };
  H.open = open; H.close = close; H.isOpen = () => !!box && box.classList.contains("on");
})();
