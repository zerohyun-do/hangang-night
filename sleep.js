// 🌙 한강에서 잠들기 — 01(index.html)과 02(3d.html)가 같이 쓰는 파일.
// Calm 'Sleep Stories'(1억 5천만 번 넘게 재생, Publishers Weekly 2019)·Lofi Girl처럼 켜 두고 잠드는 화면.
// 소리(강물·풀벌레 실제 녹음, 빗소리는 브라우저에서 합성) + 타이머(천천히 줄어듦) + 직접 쓴 잠자리 이야기 한 줄씩.
// 잠든 사람은 머리 위(01)·이름표(02)에 💤. 서버 메시지: sl{on}(보냄) / sl{id,on}·slN{n,today}(받음)
(function () {
  const H = window.HNSleep = {};
  const SOUNDS = [["river", "🌊", "강물"], ["rain", "🌧", "빗소리"], ["crick", "🦗", "풀벌레"], ["none", "🔇", "소리 없이"]];
  const MINS = [15, 30, 60, 0];
  const STORY = [
    "오늘도 수고 많았어요.", "이제 아무것도 안 해도 괜찮아요.", "어깨에 힘을 살짝 빼 볼까요.",
    "여기는 밤의 한강이에요.", "물은 아주 천천히, 바다 쪽으로 흘러가요.", "서두르는 물결은 하나도 없어요.",
    "다리 위 불빛이 물에 비쳐 길게 늘어져요.", "불빛도 물결 따라 조금씩 흔들려요.", "멀리서 마지막 지하철이 다리를 건너가요.",
    "덜컹, 덜컹… 소리가 점점 작아져요.", "돗자리는 아직 낮의 햇볕을 조금 품고 있어요.", "따뜻한 쪽으로 몸을 기대어 봐요.",
    "강바람이 이마를 한 번 쓸고 지나가요.", "숨을 들이쉬면 바람이 들어오고", "내쉬면 오늘 하루가 같이 나가요.",
    "들이쉬고… 천천히 내쉬고.", "오늘 못 한 일은 내일의 내가 할 거예요.", "지금의 나는 그냥 쉬기만 하면 돼요.",
    "물 위로 오리 한 마리가 조용히 지나가요.", "오리도 이제 잘 곳을 찾나 봐요.", "구름 사이로 달이 반쯤 얼굴을 내밀어요.",
    "달빛이 강 위에 작은 길을 만들어요.", "그 길은 아무 데도 가지 않아도 되는 길이에요.", "눈꺼풀이 조금씩 무거워져요.",
    "괜찮아요. 무거워지는 대로 두어요.", "한강은 밤새 여기 있을게요.", "물소리도, 불빛도, 바람도.", "잘 자요."
  ];
  let opt = null, pick = { s: "river", m: 30, story: true }, run = null, el = null, rainUrl = null, slN = 0, today = 0, tick = null, cv = null, raf = 0, lastDraw = 0, storyI = 0, storyAt = 0, hideAt = 0;
  const ld = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") || d; } catch { return d; } };
  const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  pick = Object.assign(pick, ld("hn-sleep-pick", {}));
  let log = ld("hn-sleep", { days: {} }); if (!log.days || typeof log.days !== "object") log.days = {};
  const kst = (o = 0) => new Date(Date.now() + 9 * 3600e3 - o * 864e5).toISOString().slice(0, 10);
  const weekN = () => { let n = 0; for (let i = 0; i < 7; i++) if (log.days[kst(i)]) n++; return n; };
  const $ = id => document.getElementById(id);
  const F = 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

  const css = `
  #slView { position: fixed; inset: 0; z-index: 11; display: none; background: #03060d; color: #cfd8ee; font: 14px/1.5 ${F}; user-select: none; -webkit-user-select: none; }
  #slView.on { display: block; } #slView canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  #slView .ui { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px 16px; transition: opacity 1.6s; text-align: center; }
  #slView .ui.dim { opacity: 0; pointer-events: none; }
  #slView .card { width: min(340px, 100%); display: flex; flex-direction: column; gap: 10px; padding: 18px 16px 14px; border-radius: 22px; background: rgba(14,20,40,.86); border: 1px solid rgba(160,180,255,.18); box-shadow: 0 14px 44px rgba(0,0,0,.5); max-height: calc(100vh - 60px); overflow: auto; }
  #slView h3 { margin: 0; font-size: 18px; color: #eef2ff; } #slView .sub { font-size: 12.5px; color: #93a0c4; margin-top: -6px; }
  #slView .live { padding: 8px 12px; border-radius: 14px; background: rgba(160,180,255,.09); font-size: 13px; color: #c4cff0; } #slView .live b { color: #fff; }
  #slView .lbl { font-size: 12px; color: #8d99bd; margin-bottom: -4px; text-align: left; }
  #slView .pick { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  #slView button { all: unset; cursor: pointer; box-sizing: border-box; text-align: center; border-radius: 12px; border: 1px solid rgba(255,255,255,.16); color: #dbe2f7; padding: 8px 4px; font-size: 13px; }
  #slView .pick button { display: grid; gap: 2px; } #slView .pick button i { font-style: normal; font-size: 20px; }
  #slView .pick button.sel { background: rgba(160,180,255,.2); border-color: #a9b8ff; color: #fff; }
  #slView .tg { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #c4cff0; padding: 2px 2px; }
  #slView .tg button { padding: 5px 12px; border-radius: 999px; } #slView .tg button.sel { background: rgba(160,180,255,.2); border-color: #a9b8ff; color: #fff; }
  #slView button.pri { background: #b8c4ff; color: #121a3a; font-weight: 800; border-color: transparent; padding: 12px; font-size: 15px; border-radius: 999px; }
  #slView button.x { border: 0; color: #8d99bd; padding: 4px 12px; align-self: center; }
  #slView .note { font-size: 11.5px; color: #7d89ad; }
  #slView .clock { font-size: 46px; font-weight: 200; letter-spacing: 2px; color: #e9eeff; font-variant-numeric: tabular-nums; text-shadow: 0 0 18px rgba(170,190,255,.35); }
  #slView .left { font-size: 13px; color: #9aa6ca; margin-top: -8px; }
  #slView .story { position: absolute; left: 16px; right: 16px; bottom: 22%; text-align: center; font-size: 17px; line-height: 1.6; color: #dfe6ff; opacity: 0; transition: opacity 2.4s; text-shadow: 0 1px 8px #000; pointer-events: none; }
  #slView .story.on { opacity: .85; }
  #slView .bot { position: absolute; left: 0; right: 0; bottom: calc(max(14px, env(safe-area-inset-bottom)) + 4px); display: flex; justify-content: center; gap: 8px; transition: opacity 1.6s; }
  #slView .bot.dim { opacity: 0; pointer-events: none; } #slView .bot button { padding: 9px 16px; border-radius: 999px; background: rgba(14,20,40,.7); }
  #slView .wake .face { font-size: 50px; line-height: 1; } #slView .wake b { font-size: 17px; color: #fff; }
  #slView .wake .sup { font-size: 12.5px; color: #ffe2a8; } #slView .wake .sup a { color: #ffd277; font-weight: 700; cursor: pointer; text-decoration: underline; }
  #slView .row { display: flex; gap: 8px; } #slView .row button { flex: 1; padding: 10px 6px; border-radius: 999px; }`;

  function build() {
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    const v = document.createElement("div"); v.id = "slView"; v.setAttribute("role", "dialog"); v.setAttribute("aria-label", "한강에서 잠들기");
    v.innerHTML = '<canvas></canvas><div class="ui"></div><div class="story"></div><div class="bot"></div>';
    document.body.appendChild(v); cv = v.querySelector("canvas");
    v.addEventListener("click", e => {
      const b = e.target.closest("[data-do]"); if (b) return act(b.dataset.do, b.dataset.v);
      if (run) { wakeUi(); }
    });
  }
  const ui = () => $("slView").querySelector(".ui"), bot = () => $("slView").querySelector(".bot"), sto = () => $("slView").querySelector(".story");
  const liveTxt = () => slN > (run ? 1 : 0) ? `지금 <b>${run ? slN - 1 : slN}명</b>이 한강에서 같이 잠들어 있어요` : `오늘 한강에서 잠든 사람 <b>${today}명</b>`;

  function render() {
    const u = ui(), b = bot();
    if (run && run.woke) {
      const m = run.wake;
      u.className = "ui"; b.innerHTML = ""; sto().classList.remove("on"); sto().textContent = "";
      u.innerHTML = `<div class="card wake"><div class="face">☀️</div><b>${m >= 1 ? m + "분 동안 한강에서 쉬었어요" : "잘 쉬었어요?"}</b>
        ${weekN() ? `<div class="sub" style="margin-top:0">이번 주 <b style="font-size:14px">${weekN()}번</b> 한강에서 잠들었어요</div>` : ""}
        <div class="sup">오늘 밤 한강이 마음에 들었다면 <a data-do="sup">💛 응원으로 한강 불을 켜 주세요</a></div>
        <div class="row"><button class="pri" data-do="close">고마워요</button></div></div>`;
      return;
    }
    if (run) {
      u.className = "ui" + (performance.now() > hideAt ? " dim" : "");
      const left = run.until ? Math.max(0, (run.until - Date.now()) / 1000) : 0;
      u.innerHTML = `<div class="clock">${new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })}</div>
        <div class="left">${run.until ? "소리가 " + Math.ceil(left / 60) + "분 뒤 천천히 꺼져요" : "깰 때까지 켜 둘게요"}</div>
        <div class="live">${liveTxt()}</div>`;
      b.className = "bot" + (performance.now() > hideAt ? " dim" : "");
      b.innerHTML = `<button data-do="snd">${SOUNDS.find(x => x[0] === pick.s)[1]} 소리 바꾸기</button><button data-do="wake">☀️ 일어나기</button>`;
      return;
    }
    u.className = "ui"; b.innerHTML = "";
    u.innerHTML = `<div class="card"><h3>🌙 한강에서 잠들기</h3><div class="sub">화면을 켜 둔 채 누워요. 손대지 않으면 화면이 어두워져요.</div>
      <div class="live">${liveTxt()}</div>
      <div class="lbl">소리</div><div class="pick">${SOUNDS.map(([k, i, n]) => `<button data-do="s" data-v="${k}" class="${pick.s === k ? "sel" : ""}"><i>${i}</i>${n}</button>`).join("")}</div>
      <div class="lbl">타이머</div><div class="pick">${MINS.map(m => `<button data-do="m" data-v="${m}" class="${pick.m === m ? "sel" : ""}">${m ? m + "분" : "끝까지"}</button>`).join("")}</div>
      <div class="tg">📖 잠자리 이야기 (한 줄씩 천천히)<button data-do="story" class="${pick.story ? "sel" : ""}">${pick.story ? "켜짐" : "꺼짐"}</button></div>
      <button class="pri" data-do="start">🌙 잠들기 시작</button>
      <div class="note">강물·풀벌레는 실제 녹음, 빗소리는 이 화면에서 만든 소리예요. 라디오는 잠시 꺼져요.</div>
      <button class="x" data-do="close">닫기</button></div>`;
  }

  // 🌧 빗소리: 핑크 노이즈 + 빗방울 톡톡을 20초 WAV로 만들어 반복(무료·저작권 없음)
  function makeRain() {
    if (rainUrl) return rainUrl;
    const sr = 22050, n = sr * 20, x = new Float32Array(n); let b0 = 0, b1 = 0, b2 = 0, lp = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b0 = .99765 * b0 + w * .099; b1 = .963 * b1 + w * .2965; b2 = .57 * b2 + w * 1.0527; const p = (b0 + b1 + b2 + w * .1848) * .11; lp += (p - lp) * .35; x[i] = lp * (.85 + .15 * Math.sin(i / sr * .7)); }
    for (let k = 0; k < 1400; k++) { const at = Math.floor(Math.random() * (n - 800)), a = .05 + Math.random() * .12, f = 1800 + Math.random() * 2600; for (let j = 0; j < 700; j++) x[at + j] += a * Math.exp(-j / (40 + Math.random() * 10)) * Math.sin(j / sr * f * 6.283); }
    const fade = sr * 2; for (let i = 0; i < fade; i++) { const t = i / fade; x[i] = x[i] * Math.sqrt(t) + x[n - fade + i] * Math.sqrt(1 - t); }
    const m = n - fade; let pk = 0; for (let i = 0; i < m; i++) pk = Math.max(pk, Math.abs(x[i]));
    const buf = new ArrayBuffer(44 + m * 2), d = new DataView(buf), w = (o, s) => { for (let i = 0; i < s.length; i++) d.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); d.setUint32(4, 36 + m * 2, true); w(8, "WAVEfmt "); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true); d.setUint32(24, sr, true); d.setUint32(28, sr * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, "data"); d.setUint32(40, m * 2, true);
    for (let i = 0; i < m; i++) d.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x[i] / pk * .5)) * 32767, true);
    return rainUrl = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
  }
  function sound(on) {
    if (el) { el.pause(); el = null; }
    if (!on || pick.s === "none") return;
    el = new Audio(pick.s === "rain" ? makeRain() : "/amb-" + pick.s + ".mp3"); el.loop = true; el.volume = .7; el.play().catch(() => {});
  }

  function act(d, v) {
    if (d === "s") { pick.s = v; sv("hn-sleep-pick", pick); render(); }
    else if (d === "m") { pick.m = +v; sv("hn-sleep-pick", pick); render(); }
    else if (d === "story") { pick.story = !pick.story; sv("hn-sleep-pick", pick); render(); }
    else if (d === "start") start();
    else if (d === "snd") { const i = SOUNDS.findIndex(x => x[0] === pick.s); pick.s = SOUNDS[(i + 1) % SOUNDS.length][0]; sv("hn-sleep-pick", pick); sound(true); hideAt = performance.now() + 6000; render(); }
    else if (d === "wake") wake();
    else if (d === "sup") { close(); opt.openSup && opt.openSup(); }
    else if (d === "close") close();
  }
  function start() {
    run = { at: Date.now(), until: pick.m ? Date.now() + pick.m * 60e3 : 0 }; storyI = 0; storyAt = performance.now() + 9000; hideAt = performance.now() + 7000;
    if (window.HNRadio && HNRadio.duck) HNRadio.duck(true);
    sound(true); opt.send({ t: "sl", on: 1 }); render();
  }
  function wake() {
    if (!run || run.woke) return; const m = Math.round((Date.now() - run.at) / 60e3);
    if (m >= 3) { log.days[kst()] = 1; const k = Object.keys(log.days).sort(); while (k.length > 60) delete log.days[k.shift()]; sv("hn-sleep", log); }
    sound(false); opt.send({ t: "sl", on: 0, m }); run.wake = Math.max(m, 0); run.woke = true;
    if (window.HNRadio && HNRadio.duck) HNRadio.duck(false);
    render();
  }
  function wakeUi() { hideAt = performance.now() + 6000; render(); }
  function open() {
    if (opt.closeOthers) opt.closeOthers();
    if (window.HNBusk && HNBusk.isOpen && HNBusk.isOpen()) return opt.toast && opt.toast("버스킹을 먼저 닫아 주세요", 2500);
    $("slView").classList.add("on"); document.body.classList.add("slOn"); render();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    clearInterval(tick); tick = setInterval(step, 1000);
  }
  function close() {
    if (run && !run.woke) wake();
    run = null; sound(false); $("slView").classList.remove("on"); document.body.classList.remove("slOn"); sto().classList.remove("on");
    cancelAnimationFrame(raf); clearInterval(tick);
    if (window.HNRadio && HNRadio.duck) HNRadio.duck(false);
  }
  function step() {
    if (!run || run.woke) return;
    const now = performance.now();
    if (run.until) {   // 마지막 1분 동안 소리를 천천히 줄이고 끔(아이폰은 볼륨을 못 바꿔 마지막에 바로 꺼짐)
      const left = run.until - Date.now();
      if (el && left < 60e3) { try { el.volume = Math.max(0, .7 * left / 60e3); } catch {} }
      if (left <= 0 && el) { el.pause(); el = null; }
    }
    if (pick.story && now > storyAt) {
      const s = sto();
      if (s.classList.contains("on")) { s.classList.remove("on"); storyAt = now + 6000; }
      else if (storyI < STORY.length) { s.textContent = STORY[storyI++]; s.classList.add("on"); storyAt = now + 11000; }
    }
    const u = ui(); if (now > hideAt && !u.classList.contains("dim")) render(); else if (now <= hideAt) render();
  }
  // 밤하늘: 달·별·강물 반짝임(배터리를 위해 초당 약 12번만 그림)
  let stars = null;
  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (t - lastDraw < 83) return; lastDraw = t;
    const W = cv.clientWidth, HH = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(HH * dpr); stars = null; }
    const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const hz = HH * .62, dark = run && !run.woke ? Math.min(1, (Date.now() - run.at) / 120e3) : 0;
    const g = c.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, "#02040a"); g.addColorStop(1, "#0b1530"); c.fillStyle = g; c.fillRect(0, 0, W, hz);
    if (!stars) { stars = []; for (let i = 0; i < 90; i++) stars.push([Math.random() * W, Math.random() * hz * .9, Math.random() * 1.3 + .3, Math.random() * 6]); }
    for (const [x, y, r, p] of stars) { c.globalAlpha = .35 + .35 * Math.sin(t / 1600 + p); c.fillStyle = "#dfe6ff"; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
    c.globalAlpha = 1; const mx = W * .72, my = hz * .3, mr = Math.min(W, HH) * .06;
    const mg = c.createRadialGradient(mx, my, mr * .5, mx, my, mr * 4); mg.addColorStop(0, "rgba(220,228,255,.25)"); mg.addColorStop(1, "rgba(220,228,255,0)"); c.fillStyle = mg; c.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
    c.fillStyle = "#eef1ff"; c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill(); c.fillStyle = "rgba(170,180,215,.35)"; for (const [a, b, r] of [[-.3, -.2, .22], [.25, .1, .16], [-.05, .35, .12], [.3, -.32, .1]]) { c.beginPath(); c.arc(mx + a * mr, my + b * mr, r * mr, 0, 7); c.fill(); }
    c.fillStyle = "#070d1d"; for (let x = 0; x < W; x += 14) { const h = 6 + 20 * Math.abs(Math.sin(x * .037) * Math.cos(x * .011)); c.fillRect(x, hz - h, 13, h); }
    for (let x = 0; x < W; x += 14) { const h = 6 + 20 * Math.abs(Math.sin(x * .037) * Math.cos(x * .011)); if ((x * 7) % 5 < 2) { c.fillStyle = "rgba(255,214,140,.55)"; c.fillRect(x + 4, hz - h + 4, 2, 2); } }
    const rg = c.createLinearGradient(0, hz, 0, HH); rg.addColorStop(0, "#0a1630"); rg.addColorStop(1, "#02050c"); c.fillStyle = rg; c.fillRect(0, hz, W, HH - hz);
    for (let i = 0; i < 26; i++) { const y = hz + 6 + i * i * (HH - hz) / 700, w = (8 + i * 2.2) * (1 + .4 * Math.sin(t / 900 + i)); c.globalAlpha = .25 + .25 * Math.sin(t / 700 + i * 1.7); c.fillStyle = "#dfe6ff"; c.fillRect(mx - w / 2 + Math.sin(t / 1300 + i) * 6, y, w, 1.4); }
    c.globalAlpha = 1;
    if (dark > 0) { c.fillStyle = `rgba(0,0,0,${.55 * dark})`; c.fillRect(0, 0, W, HH); }
  }

  H.init = o => { opt = o; build(); };
  H.open = open; H.isOpen = () => $("slView") && $("slView").classList.contains("on");
  H.count = () => slN;
  H.reconnected = () => { if (run && !run.woke) opt.send({ t: "sl", on: 1 }); };
  H.onMsg = m => {
    if (m.t === "slN") { slN = m.n; today = m.today || 0; if (H.isOpen() && (!run || performance.now() <= hideAt)) render(); }
    else if (m.t === "init" && m.slN) { slN = m.slN.n; today = m.slN.today || 0; }
  };
})();
