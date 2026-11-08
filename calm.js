// 🧘 화면 쉬기(01·02 공통): 이용자 의견 "말 걸기는 좋은데 화면이 답답하다" → 잠깐 손을 떼면(7초) 버튼·칩·안내가 스르르 사라지고 한강만 남는다.
// 화면을 한 번 만지거나 키를 누르면 바로 돌아옴. 흐려진 버튼을 누른 첫 터치는 깨우기만 하고 눌리지 않음(실수 방지).
// 캔버스 글자는 HNCalm.a()(1 → .25)를 곱해서 같이 옅어진다. ☰ 메뉴·대화창 등 창이 열려 있으면 쉬지 않음.
(() => {
  const H = window.HNCalm = {}; let calm = false, last = Date.now(), level = 1, opt = {};
  const IDLE = 7000;
  const FADE = "#top, #acts, #bar, #joy, #toast, #showPill, #hint, #drChip, #fcPill, #qzChip, #rdChip, #trChip, #wxChip, #back, .hn-calmable";
  const OPEN = "#emo.open, #actp.open, #foodp.open, #talkBox.open, #talkBox.on, #supBox.open, #supBox.on, #bookBox.open, #bookBox.on, #wishBox.open, #sayBox.open, #catchBox.on, #catchBox.open, #petBox.open, #worryBox.open, #inbox.open, #moreSheet.on, [role=dialog].on, [role=dialog].open, #qzCard.on";
  const st = document.createElement("style");
  st.textContent = `${FADE.split(",").map(s => s.trim()).join(", ")} { transition: opacity .9s ease; }
  body.hn-calm ${FADE.split(",").map(s => s.trim()).join(", body.hn-calm ")} { opacity: .06 !important; }
  body.hn-calm #acts, body.hn-calm #bar { opacity: .18 !important; }`;
  document.head.appendChild(st);
  const busy = () => { try { return !!document.querySelector(OPEN) || (opt.busy && opt.busy()); } catch { return false; } };
  function wake() { last = Date.now(); if (calm) { calm = false; document.body.classList.remove("hn-calm"); } }
  // 흐릴 때 누른 첫 터치가 흐려진 버튼 위면 깨우기만(눌림 막기)
  document.addEventListener("pointerdown", e => { if (calm && e.target.closest && e.target.closest(FADE)) { e.preventDefault(); e.stopPropagation(); wake(); H._swallow = Date.now(); return; } wake(); }, true);
  document.addEventListener("click", e => { if (H._swallow && Date.now() - H._swallow < 600) { e.preventDefault(); e.stopPropagation(); H._swallow = 0; } }, true);
  for (const ev of ["keydown", "wheel", "touchstart", "mousemove"]) document.addEventListener(ev, e => { if (ev === "mousemove" && !calm && Date.now() - last < 1000) return; wake(); }, { capture: true, passive: true });
  setInterval(() => {
    if (H.off) return;
    if (!calm && Date.now() - last > IDLE && !busy() && !document.hidden) { calm = true; document.body.classList.add("hn-calm"); }
    if (calm && busy()) wake();
  }, 500);
  (function fr() { level += ((calm ? .25 : 1) - level) * .06; requestAnimationFrame(fr); })();
  H.a = () => level; H.isCalm = () => calm; H.wake = wake;
  H.init = o => { opt = o || {}; try { H.off = localStorage.getItem("hn-calm") === "off"; } catch {} };
  H.toggle = () => { H.off = !H.off; try { localStorage.setItem("hn-calm", H.off ? "off" : "on"); } catch {} wake(); return !H.off; };
})();
