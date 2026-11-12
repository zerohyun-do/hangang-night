// ✅ 오늘 밤 할 일(01·02 공통): 매일 3개(돗자리에서 하는 것 1 + 아직 안 해 본 기능 2). 숨어 있는 기능을 하나씩 써 보게 한다.
// 기록은 이 폰에만(hn-ms). 내가 보내는 ws 메시지와 ☰ 메뉴 버튼 누름을 보고 센다. 서버에는 다 했을 때 {t:"ms"} 한 번(통계 ms)만 보낸다.
(() => {
  const H = window.HNMission = {}; let opt = {}, S = null, box = null;
  const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const BASIC = ["sit", "lie", "star", "photo", "stretch", "doze", "fish"];
  // [키, 아이콘, 할 일, 확인 방법, 하러 가기(버튼 선택자)]
  const DO = [
    ["fish", "🎣", "물고기 1마리 낚기", m => m.t === "catch", "#fishBtn,#bFish"],
    ["eat", "🍜", "돗자리에서 뭐 먹기", m => m.t === "act" && !BASIC.includes(m.a), "#foodBtn,#bFood"],
    ["fw", "🎆", "폭죽 1발 쏘기", m => m.t === "fw", "[data-fw],#bFw"],
    ["wish", "🎈", "소원 풍선 띄우기", m => m.t === "lantern", "#wishBtn,#bWish"],
    ["emo", "😊", "마음 이모지 보내기", m => m.t === "emo" || m.t === "heart", "#emoBtn,#bEmo"],
    ["lie", "🛌", "누워서 하늘 보기", m => m.t === "act" && m.a === "lie", "#lieBtn,#bLie"],
    ["star", "🌠", "하늘을 눌러 별똥별 만들기", m => m.t === "star", ""],
  ];
  const SEE = [
    ["srMenuBtn", "📖", "열두 밤 한 화 보기"], ["ftMenuBtn", "🍀", "오늘의 운세 보기"], ["tyMenuBtn", "🧪", "밤 한강 유형 테스트"], ["trMenuBtn", "🔮", "타로 할머니에게 카드 뽑기"],
    ["skMenuBtn", "🪨", "물수제비 던지기"], ["qzMenuBtn", "🎯", "한강 퀴즈 풀기"], ["plMenuBtn", "🎨", "같이 그리기에 한 칸 칠하기"], ["hgMenuBtn", "🐶", "한강이 보러 가기"],
    ["bbMenuBtn", "🫧", "비눗방울 불기"], ["bkMenuBtn", "🎸", "버스킹 들으러 가기"], ["stMenuBtn", "🏪", "편의점 들르기"], ["mkMenuBtn", "🏮", "야시장 구경하기"],
    ["tnMenuBtn", "⛺", "내 자리 꾸미기"], ["pkMenuBtn", "🗺", "오픈월드 걸어 보기"], ["cruiseMenuBtn", "🚢", "유람선 타기"], ["towerMenuBtn", "🗼", "남산타워 올라가기"],
    ["rdMenuBtn", "📻", "한강 라디오 듣기"], ["hvMindBtn", "💌", "우체통에 마음 털어놓기"], ["cpMenuBtn", "⏳", "미래의 나에게 편지 쓰기"], ["dvMenuBtn", "🛵", "치킨 배달 시켜 보기"], ["gmMenuBtn", "✊", "한강이랑 가위바위보 한 판"], ["omMenuBtn", "⚫", "한강이랑 오목 한 판"], ["gfMenuBtn", "🎁", "엽서 도감 열어 보기"],
  ];
  const all = () => DO.map(d => ({ k: d[0], e: d[1], t: d[2], ok: d[3], go: d[4] })).concat(SEE.map(s => ({ k: s[0], e: s[1], t: s[2], click: s[0], go: "#" + s[0] })));
  const byK = k => all().find(x => x.k === k);
  function load() { try { S = JSON.parse(localStorage.getItem("hn-ms") || "null"); } catch { S = null; } if (!S || typeof S !== "object") S = { ever: [], nights: 0 }; S.ever = S.ever || []; S.nights = S.nights || 0; }
  function save() { try { localStorage.setItem("hn-ms", JSON.stringify(S)); } catch {} }
  function rnd(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  function pick() {   // 날짜마다 새로 3개: 안 해 본 것 먼저, 같은 날은 모두 같은 순서
    if (S.date === kst() && S.pick && S.pick.length === 3) return;
    const r = rnd(+kst().replace(/-/g, "")), order = a => a.map(x => [S.ever.includes(x.k) ? 1 : 0, r(), x]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[2]);
    const acts = order(all().filter(x => x.ok)), sees = order(all().filter(x => x.click && document.getElementById(x.click)));
    S.date = kst(); S.pick = [acts[0], ...sees.slice(0, 2)].filter(Boolean).map(x => x.k); S.done = []; S.told = false; S.fin = false; save();
  }
  const css = `
  #msBox { position: fixed; inset: 0; z-index: 12; display: none; align-items: center; justify-content: center; background: rgba(4,6,20,.6); }
  #msBox.on { display: flex; }
  #msBox .in { width: min(340px, calc(100vw - 32px)); display: flex; flex-direction: column; gap: 8px; padding: 16px 14px 12px; border-radius: 22px; background: #141a36; color: #eef1ff; border: 1px solid rgba(180,190,255,.3); box-shadow: 0 14px 44px rgba(0,0,0,.55); font: 14px/1.4 system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; }
  #msBox h3 { margin: 0 0 2px; font-size: 16px; text-align: center; } #msBox .sub { margin: 0 0 4px; font-size: 12px; color: #aab3ea; text-align: center; }
  #msBox .r { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 14px; background: rgba(255,255,255,.06); }
  #msBox .r i { font-style: normal; font-size: 22px; width: 28px; text-align: center; } #msBox .r span { flex: 1; } #msBox .r.ok span { color: #9aa3d0; text-decoration: line-through; }
  #msBox button { all: unset; cursor: pointer; padding: 7px 11px; border-radius: 11px; font-weight: 700; font-size: 12.5px; background: linear-gradient(135deg, #ffd27a, #ff9fb6); color: #2a1838; white-space: nowrap; }
  #msBox .r.ok b { color: #8fe3a8; font-size: 18px; padding: 0 8px; }
  #msBox .x { background: rgba(255,255,255,.1); color: #dfe3ff; text-align: center; padding: 10px 0; margin-top: 4px; font-size: 14px; }
  #msBox .foot { font-size: 12px; color: #c9cff5; text-align: center; }`;
  function build() {
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    box = document.createElement("div"); box.id = "msBox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "오늘 밤 할 일");
    box.onclick = e => { if (e.target === box) return close(); const b = e.target.closest("[data-go]"); if (b) return go(b.dataset.go); if (e.target.closest(".x")) close(); };
    document.body.appendChild(box);
  }
  function render() {
    pick(); const n = S.done.length;
    box.innerHTML = `<div class="in"><h3>🌙 오늘 밤 할 일 ${n}/3</h3><p class="sub">${S.fin ? "✨ 오늘 밤 할 일을 다 했어요. 내일 밤엔 새로운 3개!" : "매일 밤 바뀌어요. 하나씩 해 보세요"}</p>` +
      S.pick.map(k => { const x = byK(k); if (!x) return ""; const ok = S.done.includes(k); return `<div class="r${ok ? " ok" : ""}"><i>${x.e}</i><span>${x.t}</span>${ok ? "<b>✓</b>" : `<button data-go="${k}">하러 가기</button>`}</div>`; }).join("") +
      `<div class="foot">${S.nights ? `지금까지 ${S.nights}밤 다 했어요` : "3개를 다 하면 ✨ 완료 도장"}</div><button class="x">닫기</button></div>`;
    const mb = document.getElementById("msMenuBtn"); if (mb) mb.innerHTML = `${S.fin ? "✨" : "✅"}<span>할 일 ${n}/3</span>`;
  }
  function open() { render(); box.classList.add("on"); opt.closeOthers && opt.closeOthers(); }
  function close() { box.classList.remove("on"); }
  function go(k) {
    const x = byK(k); close(); if (!x) return;
    if (k === "star") return opt.toast && opt.toast("🌠 하늘(위쪽 빈 곳)을 눌러 보세요", 3000);
    const b = x.go && document.querySelector(x.go); if (b) b.click();
  }
  function mark(k) {
    pick(); if (!S.pick.includes(k) || S.done.includes(k)) return;
    S.done.push(k); if (!S.ever.includes(k)) S.ever.push(k);
    if (S.done.length >= 3 && !S.fin) { S.fin = true; S.nights++; opt.send && opt.send({ t: "ms" }); setTimeout(() => opt.toast && opt.toast("✨ 오늘 밤 할 일 3개 끝! 내일 밤엔 새로운 할 일이 기다려요", 4500), 1200); }
    else setTimeout(() => opt.toast && opt.toast(`✅ 오늘 밤 할 일 ${S.done.length}/3 · ${byK(k).t}`, 3000), 900);
    save(); render();
  }
  // 내가 보내는 메시지를 엿본다(01·02 어느 화면이든 같은 방법)
  const send0 = WebSocket.prototype.send;
  WebSocket.prototype.send = function (d) { try { if (typeof d === "string" && d[0] === "{" && S && S.pick) { const m = JSON.parse(d); for (const k of S.pick) { const x = byK(k); if (x && x.ok && x.ok(m)) mark(k); } } } catch {} return send0.apply(this, arguments); };
  document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("button[id]"); if (b && S && S.pick && S.pick.includes(b.id)) mark(b.id); }, true);
  H.init = o => {
    opt = o; load(); build();
    setTimeout(() => { pick(); render(); }, 1500);   // ☰ 메뉴가 다 만들어진 뒤에 고른다(그 화면에 있는 기능만)
    setTimeout(() => { pick(); render(); if (S.told || S.fin) return; S.told = true; save(); if (document.querySelector("#msBox.on")) return; open(); }, o.delay || 20000);
    setInterval(() => { if (S.date !== kst()) { pick(); render(); } }, 60000);
    // 🌠 사자자리 유성우 밤 알림(11/12~17 예고, 11/17 18시~11/18 6시 당일). 하루 한 번
    setTimeout(() => { const n = Date.now(), A = Date.parse("2026-11-17T18:00:00+09:00"), B = Date.parse("2026-11-18T06:00:00+09:00"), k = "leo-" + kst() + (n >= A ? "on" : "");
      let seen = ""; try { seen = localStorage.getItem("hn-leo") || ""; } catch {} if (seen === k) return;
      const msg = n >= A && n < B ? "🌠 오늘 밤은 사자자리 유성우! 75초마다 별똥별이 쏟아져요. 실제 하늘에서도 1년 중 가장 많은 밤이에요" : n < A && n > A - 6 * 864e5 ? "🌠 11/17(화) 밤, 한강 하늘에 사자자리 유성우가 쏟아져요. 그날 밤 같이 봐요" : "";
      if (!msg) return; try { localStorage.setItem("hn-leo", k); } catch {} opt.toast && opt.toast(msg, 5500); }, 40000);
  };
  H.open = open; H.close = close;
})();
