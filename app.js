// 📱 93차 홈 화면에 추가 + 🍀 오늘의 운세·🧪 밤 한강 유형 테스트 불러오기(01·02 공통)
// - 홈 화면 추가: manifest·아이콘을 이 파일이 붙인다(공개 전에는 이 파일이 안 내려가서 아무것도 안 생김). 알림은 보내지 않는다.
//   안드로이드 크롬은 '설치' 창을 바로 띄우고, 아이폰·카카오톡 안 브라우저는 따라 하는 방법을 보여 준다.
// - 운세·테스트 파일은 첫 접속에 받지 않고, 누를 때 처음 한 번만 받는다(window.HNCDN = jsDelivr, 실패하면 이 서버).
(() => {
  const A = window.HNApp = {}; let opt = {}, deferred = null, box = null;
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
  const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const F = `system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const inApp = /KAKAOTALK|Instagram|FBAN|FBAV|NAVER\(inapp|Line\/|everytimeApp|DaumApps|Threads|Barcelona/i.test(ua);
  const standalone = () => (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  const touch = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);

  // ---------- manifest·아이콘 ----------
  const add = (tag, at) => { const e = document.createElement(tag); for (const k in at) e.setAttribute(k, at[k]); document.head.appendChild(e); };
  if (!document.querySelector('link[rel="manifest"]')) {
    add("link", { rel: "manifest", href: "/manifest.webmanifest" });
    add("link", { rel: "apple-touch-icon", href: "/app/icon-180.png" });
    add("meta", { name: "apple-mobile-web-app-capable", content: "yes" });
    add("meta", { name: "mobile-web-app-capable", content: "yes" });
    add("meta", { name: "apple-mobile-web-app-title", content: "밤 한강" });
    add("meta", { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" });
  }
  if ("serviceWorker" in navigator && location.protocol === "https:") window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; });
  window.addEventListener("appinstalled", () => { ls("hn-app-done", "1"); deferred = null; opt.send && opt.send({ t: "appIn" }); toast("📱 홈 화면에 생겼어요. 다음엔 아이콘으로 바로 와요"); });

  // ---------- 화면 ----------
  const css = `
  #hnApp { position: fixed; inset: 0; z-index: 60; display: none; align-items: center; justify-content: center; background: rgba(4,6,18,.55); font-family: ${F}; }
  #hnApp.on { display: flex; }
  #hnApp .bx { width: min(360px, calc(100vw - 32px)); max-height: calc(100vh - 60px); overflow: auto; padding: 20px 18px 16px; border-radius: 22px; background: rgba(16,20,46,.97); border: 1px solid rgba(255,255,255,.14); color: #f3e9d7; box-shadow: 0 14px 40px rgba(0,0,0,.5); }
  #hnApp h3 { margin: 0 0 6px; font-size: 18px; } #hnApp p { margin: 6px 0; font-size: 14px; line-height: 1.6; color: #d9d1e6; }
  #hnApp ol { margin: 8px 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #efe6d4; } #hnApp b { color: #f5d38a; }
  #hnApp .go { all: unset; box-sizing: border-box; width: 100%; cursor: pointer; display: block; text-align: center; margin-top: 12px; padding: 12px; border-radius: 14px; background: #f3d9a4; color: #2a1d10; font-weight: 800; font-size: 15px; }
  #hnApp .x { all: unset; cursor: pointer; display: block; text-align: center; margin-top: 8px; padding: 8px; color: #b9b0cc; font-size: 13px; }
  #hnApp img { width: 64px; height: 64px; border-radius: 16px; float: right; margin: 0 0 6px 10px; }
  #hnAppChip { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(max(14px, env(safe-area-inset-bottom)) + 76px); z-index: 8; display: flex; gap: 8px; align-items: center; padding: 8px 8px 8px 14px; border-radius: 999px; background: rgba(16,20,46,.92); border: 1px solid rgba(255,255,255,.16); color: #f3e9d7; font: 600 13px ${F}; box-shadow: 0 8px 24px rgba(0,0,0,.4); white-space: nowrap; }
  #hnAppChip button { all: unset; cursor: pointer; padding: 6px 10px; border-radius: 999px; background: rgba(243,217,164,.9); color: #2a1d10; font-weight: 800; }
  #hnAppChip i { all: unset; cursor: pointer; padding: 4px 6px; color: #b9b0cc; font-style: normal; }
  #hnAppToast { position: fixed; left: 50%; top: 18%; transform: translateX(-50%); z-index: 61; padding: 10px 16px; border-radius: 14px; background: rgba(16,20,46,.95); color: #f3e9d7; font: 600 14px ${F}; border: 1px solid rgba(255,255,255,.14); }`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const toast = t => { const o = document.getElementById("hnAppToast"); if (o) o.remove(); const e = document.createElement("div"); e.id = "hnAppToast"; e.textContent = t; document.body.appendChild(e); setTimeout(() => e.remove(), 3500); };
  const close = () => box && box.classList.remove("on");
  const show = html => {
    if (!box) { box = document.createElement("div"); box.id = "hnApp"; box.onclick = e => { if (e.target === box) close(); }; document.body.appendChild(box); }
    box.innerHTML = `<div class="bx">${html}<button class="x">닫기</button></div>`; box.querySelector(".x").onclick = close;
    box.classList.add("on"); return box;
  };
  A.open = () => {
    opt.closeOthers && opt.closeOthers();
    const chip = document.getElementById("hnAppChip"); if (chip) chip.remove();
    const head = `<img src="/app/icon-192.png" alt=""><h3>📱 홈 화면에 추가</h3><p>폰 바탕화면에 <b>밤 한강</b> 아이콘이 생겨서, 다음부터 한 번 눌러 바로 와요. 알림은 보내지 않아요.</p>`;
    if (standalone()) return show(`${head}<p>✅ 지금 홈 화면 아이콘으로 열려 있어요. 이미 끝났어요!</p>`);
    if (deferred) {
      const b = show(`${head}<button class="go">홈 화면에 추가하기</button>`);
      b.querySelector(".go").onclick = async () => { const d = deferred; deferred = null; close(); try { d.prompt(); const r = await d.userChoice; if (r && r.outcome === "accepted") ls("hn-app-done", "1"); } catch {} };
      return;
    }
    if (inApp) {
      const ka = /KAKAOTALK/i.test(ua);
      return show(`${head}<p>지금은 ${ka ? "카카오톡" : "앱"} 안 화면이라 바로 추가가 안 돼요.</p><ol>${ka ? "<li>오른쪽 아래(또는 위) <b>⋮ / 공유</b> 누르기</li><li><b>다른 브라우저로 열기</b>(아이폰은 Safari)</li>" : "<li>오른쪽 위 <b>⋯</b> 누르기</li><li><b>브라우저에서 열기</b>(아이폰은 Safari)</li>"}<li>열린 화면에서 ☰ 더보기 → <b>📱 홈 화면에 추가</b></li></ol><button class="go">주소 복사하기</button>`).querySelector(".go").onclick = () => { const u = location.origin + "/?from=app"; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast("주소를 복사했어요. 브라우저 주소창에 붙여 넣어요"), () => toast(u)); };
    }
    if (isIOS) return show(`${head}<ol><li>Safari 아래쪽 <b>공유 버튼</b>(네모에 ↑) 누르기</li><li>내려서 <b>홈 화면에 추가</b> 누르기</li><li>오른쪽 위 <b>추가</b></li></ol><p style="font-size:12.5px;color:#b9b0cc">Safari가 아닌 앱(크롬 등)이면 주소창 오른쪽 공유 버튼에서 같은 메뉴를 찾을 수 있어요.</p>`);
    if (touch) return show(`${head}<ol><li>브라우저 오른쪽 위 <b>⋮</b> 누르기</li><li><b>홈 화면에 추가</b> 또는 <b>앱 설치</b> 누르기</li></ol><p style="font-size:12.5px;color:#b9b0cc">삼성 인터넷은 아래쪽 ☰ → <b>현재 페이지 추가</b> → 홈 화면이에요.</p>`);
    return show(`${head}<p>PC에서는 주소창 오른쪽의 <b>설치(⊕)</b> 아이콘이나 브라우저 메뉴의 <b>앱 설치</b>를 누르면 바탕화면에 생겨요. 폰에서 열면 폰 바탕화면에도 추가할 수 있어요.</p>`);
  };

  // 조용한 안내: 폰에서, 두 번째로 온 날, 90초 머문 뒤 아래쪽에 작은 칩 한 번만(닫으면 다시 안 뜸)
  const chipLater = () => {
    if (!touch || standalone() || ls("hn-app-done") || ls("hn-app-chip")) return;
    const days = (ls("hn-app-days") || "").split(",").filter(Boolean), t = kst();
    if (!days.includes(t)) { days.push(t); ls("hn-app-days", days.slice(-5).join(",")); }
    if (days.length < 2) return;
    setTimeout(() => {
      if (document.getElementById("hnAppChip") || ls("hn-app-chip") || standalone()) return; ls("hn-app-chip", "1");
      const c = document.createElement("div"); c.id = "hnAppChip"; c.innerHTML = `📱 다음엔 아이콘으로 바로 와요 <button>홈 화면에 추가</button><i aria-label="닫기">✕</i>`;
      c.querySelector("button").onclick = () => { c.remove(); A.open(); }; c.querySelector("i").onclick = () => c.remove();
      document.body.appendChild(c); setTimeout(() => c.remove(), 15000);
    }, 90e3);
  };

  // ---------- 운세·테스트: 누를 때 처음 한 번만 받기 ----------
  const MODS = { fortune: ["fortune.js", "HNFortune"], type: ["type.js", "HNType"] }, loading = {};
  const loadJs = f => new Promise((ok, no) => {
    const go = (src, last) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => last ? no() : go("/" + f, true); document.head.appendChild(s); };
    go(window.HNCDN ? window.HNCDN + f : "/" + f, !window.HNCDN);
  });
  A.load = (k, ...args) => {
    const [f, g] = MODS[k] || []; if (!f) return;
    if (window[g] && window[g].inited) return window[g].open(...args);
    if (loading[k]) return; loading[k] = 1; toast("잠깐만요…");
    loadJs(f).then(() => { loading[k] = 0; const M = window[g]; if (!M) return; if (!M.inited) { M.inited = true; M.init(Object.assign({ openApp: A.open }, opt)); } const o = document.getElementById("hnAppToast"); if (o) o.remove(); M.open(...args); }, () => { loading[k] = 0; toast("불러오지 못했어요. 잠시 뒤 다시 눌러 주세요"); });
  };
  A.onMsg = m => { for (const k in MODS) { const M = window[MODS[k][1]]; if (M && M.inited && M.onMsg) M.onMsg(m); } };
  A.init = o => { opt = o || {}; chipLater(); };
  A.standalone = standalone;
})();
