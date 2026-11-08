// 🌦 진짜 한강 날씨 — 01(index.html)과 02(3d.html)가 같이 쓰는 파일.
// 서버가 10분마다 여의도(37.528, 126.932)의 실제 날씨를 Open-Meteo(무료, CC BY 4.0)에서 받아 모두에게 보낸다.
// 비·이슬비·소나기 → 빗줄기, 눈 → 눈송이, 안개 → 옅은 안개, 뇌우 → 가끔 번쩍. 화면 위에 겹치는 투명 캔버스라 장면 코드는 그대로.
// 왼쪽 위 칩(🌧 8° 비) → 누르면 지금 날씨 + 날씨에 맞는 한 줄(비 오면 편의점 라면 등). 서버 메시지: wx{code,temp,wind,at}
(function () {
  const H = window.HNWx = {};
  let opt = null, wx = null, cv = null, g = null, W = 0, HH = 0, DPR = 1, raf = 0, drops = [], flash = 0, last = 0;
  const $ = id => document.getElementById(id);
  const F = 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  const kind = c => c == null ? null : c === 0 ? ["clear", "🌙", "맑음"] : c <= 2 ? ["cloud", "🌤", "구름 조금"] : c === 3 ? ["cloud", "☁️", "흐림"] : c === 45 || c === 48 ? ["fog", "🌫", "안개"]
    : c >= 51 && c <= 57 ? ["drizzle", "🌦", "이슬비"] : (c >= 61 && c <= 67) || (c >= 80 && c <= 82) ? ["rain", "🌧", c >= 80 ? "소나기" : "비"] : (c >= 71 && c <= 77) || c === 85 || c === 86 ? ["snow", "🌨", "눈"] : c >= 95 ? ["storm", "⛈", "뇌우"] : ["cloud", "☁️", "흐림"];
  const LINE = { clear: "별 보기 좋은 밤이에요. 🛌 눕기로 하늘을 올려다봐요", cloud: "구름 낀 밤, 📻 라디오 켜 두기 좋아요", fog: "안개 낀 한강, 건너편 불빛이 번져 보여요",
    drizzle: "보슬비 오는 밤엔 🏪 편의점 한강라면이 제일이죠", rain: "비 오는 밤엔 🏪 편의점에서 한강라면 끓여 먹어요", snow: "눈 오는 한강! ☕ 보온병 코코아 어때요", storm: "천둥 치는 밤, 오늘은 화면 속 한강에서 안전하게 쉬어요" };
  const css = `
  #wxCv { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 3; pointer-events: none; display: none; }
  #wxChip { all: unset; position: fixed; left: 12px; top: calc(max(12px, env(safe-area-inset-top)) + var(--wxTop, 58px)); z-index: 6; cursor: pointer; display: none; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 999px; font: 700 12.5px/1.2 ${F}; color: #eef3ff; background: rgba(16,22,44,.72); border: 1px solid rgba(170,190,255,.35); white-space: nowrap; }
  #wxChip.on { display: flex; } #wxChip small { font-weight: 500; opacity: .85; }
  #wxBox { position: fixed; left: 50%; top: 42%; transform: translate(-50%, -50%); width: min(310px, calc(100vw - 32px)); z-index: 9; display: none; flex-direction: column; gap: 8px; padding: 18px 16px 14px; border-radius: 22px; background: #141a33; color: #eef3ff; border: 1px solid rgba(170,190,255,.3); box-shadow: 0 14px 44px rgba(0,0,0,.5); font: 14px/1.5 ${F}; text-align: center; }
  #wxBox.on { display: flex; } #wxBox .big { font-size: 46px; line-height: 1.1; } #wxBox b { font-size: 17px; } #wxBox small { color: #a9b4d6; font-size: 11.5px; }
  #wxBox .line { padding: 9px 12px; border-radius: 14px; background: rgba(170,190,255,.1); font-size: 13.5px; }
  #wxBox button { all: unset; cursor: pointer; padding: 10px; border-radius: 999px; font-weight: 800; background: #9fb3ff; color: #121a3a; } #wxBox button.x { background: none; color: #a9b4d6; font-weight: 500; padding: 4px; }`;
  function build() {
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    if (opt.chipTop) document.documentElement.style.setProperty("--wxTop", opt.chipTop + "px");
    cv = document.createElement("canvas"); cv.id = "wxCv"; document.body.appendChild(cv); g = cv.getContext("2d");
    const c = document.createElement("button"); c.id = "wxChip"; c.setAttribute("aria-label", "지금 한강 날씨"); c.onclick = openBox; document.body.appendChild(c);
    const b = document.createElement("div"); b.id = "wxBox"; b.setAttribute("role", "dialog"); b.setAttribute("aria-label", "한강 날씨"); document.body.appendChild(b);
    b.addEventListener("click", e => { const d = e.target.closest("[data-do]"); if (!d) return; b.classList.remove("on"); if (d.dataset.do === "store" && window.HNStore) HNStore.open(); });
    addEventListener("resize", size); size();
  }
  function size() { if (!cv) return; DPR = Math.min(1.5, devicePixelRatio || 1); W = innerWidth; HH = innerHeight; cv.width = W * DPR; cv.height = HH * DPR; }
  function openBox() {
    const k = kind(wx && wx.code); if (!k) return;
    const mins = Math.max(0, Math.round((Date.now() - (wx.at || Date.now())) / 60e3));
    $("wxBox").innerHTML = `<div class="big">${k[1]}</div><b>지금 여의도 ${Math.round(wx.temp)}° · ${k[2]}</b><small>바람 ${Math.round(wx.wind || 0)}km/h · ${mins ? mins + "분 전" : "방금"} 받은 실제 날씨</small>
      <div class="line">${LINE[k[0]]}</div>${["rain", "drizzle", "snow"].includes(k[0]) && window.HNStore ? `<button data-do="store">🏪 편의점 가기</button>` : ""}
      <small>날씨 정보: Open-Meteo.com (CC BY 4.0)</small><button class="x" data-do="x">닫기</button>`;
    $("wxBox").classList.add("on");
  }
  function apply() {
    const k = kind(wx && wx.code), c = $("wxChip"); if (!c) return;
    c.classList.toggle("on", !!k); if (k) c.innerHTML = `${k[1]} ${Math.round(wx.temp)}° <small>${k[2]}</small>`;
    const fx = k && ["rain", "drizzle", "snow", "storm", "fog"].includes(k[0]);
    cv.style.display = fx ? "block" : "none"; cancelAnimationFrame(raf); drops = [];
    if (fx) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }
  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (t - last) / 1000); last = t;
    if (opt.hidden && opt.hidden()) { g.clearRect(0, 0, cv.width, cv.height); return; }
    const k = kind(wx.code)[0], c = g; c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, W, HH);
    const want = k === "rain" ? 160 : k === "storm" ? 220 : k === "drizzle" ? 70 : k === "snow" ? 110 : 0, wind = Math.min(1, (wx.wind || 0) / 30);
    while (drops.length < want) drops.push({ x: Math.random() * W * 1.2 - W * .1, y: Math.random() * HH, z: .4 + Math.random() * .6, ph: Math.random() * 6 });
    if (k === "snow") {
      c.fillStyle = "rgba(255,255,255,.85)";
      for (const d of drops) { d.y += (24 + 30 * d.z) * dt; d.x += (Math.sin(t / 900 + d.ph) * 14 + wind * 30) * dt; if (d.y > HH + 4) { d.y = -4; d.x = Math.random() * W; } c.globalAlpha = .4 + .5 * d.z; c.beginPath(); c.arc(d.x, d.y, 1.2 + 2 * d.z, 0, 7); c.fill(); }
    } else if (want) {
      const sp = k === "drizzle" ? 380 : 700, len = k === "drizzle" ? 7 : 14, sl = .12 + wind * .35;
      c.strokeStyle = "rgba(190,210,255,.5)"; c.lineWidth = 1; c.beginPath();
      for (const d of drops) { d.y += sp * d.z * dt; d.x += sp * d.z * sl * dt; if (d.y > HH) { d.y = -len; d.x = Math.random() * W * 1.2 - W * .2; } c.moveTo(d.x, d.y); c.lineTo(d.x - len * d.z * sl, d.y - len * d.z); }
      c.stroke();
    }
    c.globalAlpha = 1;
    if (k === "fog") { const gr = c.createLinearGradient(0, HH * .3, 0, HH * .75); gr.addColorStop(0, "rgba(180,190,215,0)"); gr.addColorStop(.5, `rgba(180,190,215,${.16 + .04 * Math.sin(t / 2000)})`); gr.addColorStop(1, "rgba(180,190,215,0)"); c.fillStyle = gr; c.fillRect(0, 0, W, HH); }
    if (k === "storm") { if (flash <= 0 && Math.random() < dt / 9) flash = .35; if (flash > 0) { c.fillStyle = `rgba(230,235,255,${flash * .5})`; c.fillRect(0, 0, W, HH); flash -= dt; } }
  }
  H.init = o => { opt = o; build(); apply(); };
  H.now = () => wx && kind(wx.code);
  H.onMsg = m => {
    if ((m.t === "init" && m.wx) || m.t === "wx") { wx = m.t === "wx" ? m : m.wx; if (opt) apply(); }
  };
})();
