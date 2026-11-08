// ☰ 아래 줄 정리 — 01(index.html)과 02(3d.html)가 같이 쓰는 파일.
// 자주 쓰는 5개만 아래 줄에 두고, 나머지는 '☰ 더보기' 판(4칸 격자)으로 옮긴다. 나중에 붙는 버튼(운영자 버튼 등)도 자동으로 판으로 간다.
(function () {
  const css = `
  #moreSheet { position: fixed; left: 50%; transform: translateX(-50%) translateY(10px); bottom: calc(max(14px, env(safe-area-inset-bottom)) + 70px); width: min(360px, calc(100vw - 24px)); max-height: calc(100vh - 200px); overflow: auto; z-index: 7;
    padding: 12px 10px 8px; border-radius: 22px; background: rgba(16,20,46,.92); border: 1px solid rgba(255,255,255,.14); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); box-shadow: 0 12px 36px rgba(0,0,0,.45);
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; opacity: 0; pointer-events: none; transition: opacity .2s, transform .2s; font-family: -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; }
  #moreSheet.on { opacity: 1; pointer-events: auto; transform: translateX(-50%) translateY(0); }
  #moreSheet button { all: unset; cursor: pointer; height: 58px; display: grid; place-items: center; align-content: center; gap: 4px; border-radius: 16px; font-size: 24px; line-height: 1; color: #f3e9d7; text-align: center; }
  #moreSheet button span { font-size: 11.5px; color: #cfc8dc; white-space: nowrap; }
  #moreSheet button:active { transform: scale(.92); background: rgba(255,255,255,.08); }
  #moreSheet button.sel { background: rgba(243,217,164,.2); } #moreSheet button.admin span { color: #f5c84c; }
  #moreSheet .sep { display: none; }
  #moreSheet small { grid-column: 1 / -1; color: #b9b0cc; font-size: 11px; font-weight: 700; letter-spacing: .3px; padding: 8px 6px 2px; border-top: 1px solid rgba(255,255,255,.08); margin-top: 2px; }
  #moreSheet small:first-child { border-top: 0; margin-top: 0; padding-top: 2px; }
  .moreBtn.on { background: rgba(243,217,164,.2) !important; }
  #moreSheet.touch { overscroll-behavior: contain; -webkit-overflow-scrolling: touch; max-height: calc(100vh - 160px); max-height: calc(100dvh - 160px); padding-top: 0; }
  #moreTabs { grid-column: 1 / -1; position: sticky; top: 0; z-index: 1; display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin: 0 -10px 2px; padding: 10px 10px 8px; background: rgba(16,20,46,.98); border-bottom: 1px solid rgba(255,255,255,.08); }
  #moreTabs::-webkit-scrollbar { display: none; }
  #moreTabs b { flex: none; padding: 7px 11px; border-radius: 999px; background: rgba(255,255,255,.08); color: #e9e1d0; font-size: 12.5px; font-weight: 700; white-space: nowrap; cursor: pointer; }
  #moreTabs b.on { background: rgba(243,217,164,.9); color: #2a1d10; }
  #moreSheet.touch small:nth-child(2) { border-top: 0; margin-top: 0; }`;
  window.HNMenu = {
    // bar: 아래 줄, keep: 아래 줄에 남길 버튼인지 판별(btn → true/false), extra: 판 맨 앞에 넣을 [아이콘, 이름, 할 일]
    tidy(bar, keep, extra) {
      if (bar.dataset.tidy) return; bar.dataset.tidy = 1;
      const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
      const sheet = document.createElement("div"); sheet.id = "moreSheet"; sheet.setAttribute("role", "menu"); document.body.appendChild(sheet);
      const moreB = document.createElement("button"); moreB.className = "moreBtn"; moreB.id = "moreBtn"; moreB.innerHTML = "☰<span>더보기</span>"; moreB.setAttribute("aria-label", "더보기");
      const close = () => { sheet.classList.remove("on"); moreB.classList.remove("on"); };
      // 📱 88차: 폰(손가락)에서는 판 맨 위에 묶음 바로가기(🎪 놀 거리 · 🧭 가 볼 곳 …)를 붙여, 길게 내리지 않고 한 번 눌러 그 묶음으로 간다. PC(마우스)는 그대로
      const touch = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);
      let tabs = null, pinK = 0, pinUntil = 0;   // 누른 묶음은 미끄러지는 동안(0.8초) 그대로 켜 둔다
      const tabsSync = () => { if (!tabs) return; const hs = [...sheet.querySelectorAll("small")], y = sheet.scrollTop + tabs.offsetHeight + 12; let k = 0; hs.forEach((h, i) => { if (h.offsetTop <= y) k = i; }); if (sheet.scrollTop + sheet.clientHeight >= sheet.scrollHeight - 4) k = hs.length - 1; if (performance.now() < pinUntil) k = pinK; [...tabs.children].forEach((b, i) => { if (b.classList.contains("on") !== (i === k)) { b.classList.toggle("on", i === k); if (i === k) b.scrollIntoView({ block: "nearest", inline: "nearest" }); } }); };
      const tabsBuild = () => {
        if (!touch) return; sheet.classList.add("touch");
        if (!tabs) { tabs = document.createElement("div"); tabs.id = "moreTabs"; sheet.addEventListener("scroll", tabsSync, { passive: true }); }
        sheet.prepend(tabs);
        const hs = [...sheet.querySelectorAll("small")];
        tabs.innerHTML = hs.map((h, i) => `<b data-i="${i}">${h.textContent}</b>`).join("");
        tabs.querySelectorAll("b").forEach(b => b.onclick = e => { e.stopPropagation(); const h = hs[+b.dataset.i]; pinK = +b.dataset.i; pinUntil = performance.now() + 800; tabsSync(); sheet.scrollTo({ top: Math.max(0, h.offsetTop - tabs.offsetHeight - 2), behavior: "smooth" }); });
        tabs.style.display = hs.length > 1 ? "" : "none";
        sheet.scrollTop = 0; tabsSync();
      };
      moreB.onclick = e => { e.stopPropagation(); const o = !sheet.classList.contains("on"); if (o) tabsBuild(); sheet.classList.toggle("on", o); moreB.classList.toggle("on", o); };
      const head = txt => { const h = document.createElement("small"); h.textContent = txt; sheet.appendChild(h); return h; };
      const HID = window.HNHide || [];   // 🗓 80차: 아직 공개 전인 기능(server.js REVEAL)은 판에서 뺀다
      (extra || []).forEach(e => { if (typeof e === "string") return head(e); const [icon, name, fn, id] = e; if (HID.includes(name)) return; const b = document.createElement("button"); if (id) b.id = id; b.innerHTML = `${icon}<span>${name}</span>`; b.onclick = fn; sheet.appendChild(b); });
      [...sheet.querySelectorAll("small")].forEach(h => { const n = h.nextElementSibling; if (!n || n.tagName === "SMALL") h.remove(); });   // 다 숨겨진 묶음 제목은 지운다
      let matHead = null, admHead = null;
      const place = el => {
        if (el === moreB) return;
        if (el.tagName !== "BUTTON") { if (el.classList.contains("sep")) el.remove(); return; }
        if (keep(el)) return;
        if (el.classList.contains("admin")) { if (!admHead) admHead = head("👑 운영자"); sheet.appendChild(el); return; }
        if (!matHead) matHead = head("🧺 돗자리에서");
        if (admHead) sheet.insertBefore(el, admHead); else sheet.appendChild(el);
      };
      [...bar.children].forEach(place);
      bar.appendChild(moreB);
      new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && n !== moreB) { place(n); if (n.parentNode === bar) bar.appendChild(moreB); } }).observe(bar, { childList: true });
      sheet.addEventListener("click", e => { if (e.target.closest("button")) setTimeout(close, 0); });
      document.addEventListener("pointerdown", e => { if (sheet.classList.contains("on") && !sheet.contains(e.target) && !moreB.contains(e.target)) close(); }, true);
      HNMenu.close = close;
    },
  };
})();
