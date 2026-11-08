// 🎸 버스킹 존 — 01(index.html)과 02(3d.html)가 같이 쓰는 파일. 한강 공원 한쪽의 작은 버스킹 무대(화면 전체 2D 장면).
// 조용한 쪽(돗자리)과 나뉜 '시끌벅적한 쪽'. 01·02 사람이 같은 무대를 같이 본다. 곡은 직접 만든 곡(CC0 실제 악기 샘플, tools/busk-render.py).
// 👏 박수(무료) · 🎵 신청곡(무료, 10분에 1곡) · 💛 버스커 응원(후원 링크 → 기타 케이스에 하트, 관객 모두에게 이름).
// 버스커는 실제 사람이 아닌 그림 캐릭터. 서버 메시지: bkIn, clap, bkReq / busk, claps, bkReqOk, bkReqBad, bkSup, bkN
(function () {
  const H = window.HNBusk = {};
  let opt = null, songs = [], st = null, off = 0, on = false, el = null, raf = 0, cv = null, g = null, W = 0, HH = 0, DPR = 1;
  let storeR = null, truckR = null, walkers = null, crowd = null;
  let claps = [], hearts = [], notes = [], say = null, lastSay = -1, caseN = 0, audN = 0, picking = false;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const now = () => Date.now() + off;
  const LINES = ["들어 주셔서 고마워요 🙂", "다음 곡은 조금 신나는 걸로 갈게요", "좋았으면 👏 박수 한 번 부탁해요!", "🎵 신청곡도 받아요, 아래에서 골라 주세요", "오늘 한강 바람 좋네요", "버스킹은 여러분 응원으로 계속돼요 💛", "멀리서 들어 주는 분들도 고마워요", "잠깐 숨 고르고… 갑니다!"];
  const css = `
  #bkWrap { position: fixed; inset: 0; z-index: 9; display: none; background: #060818; user-select: none; -webkit-user-select: none; font-family: system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; }
  #bkWrap.on { display: block; } #bkWrap canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  #bkTop { position: absolute; left: 12px; right: 12px; top: max(12px, env(safe-area-inset-top)); display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
  #bkInfo { padding: 8px 12px; border-radius: 16px; background: rgba(20,14,36,.72); border: 1px solid rgba(255,200,140,.3); color: #fdf3dc; font-size: 13px; line-height: 1.45; }
  #bkInfo b { font-size: 15px; } #bkInfo small { color: #d8c6a8; }
  #bkBack { all: unset; cursor: pointer; padding: 9px 13px; border-radius: 999px; background: rgba(20,14,36,.72); border: 1px solid rgba(255,255,255,.22); color: #fff; font-size: 13px; font-weight: 700; white-space: nowrap; }
  #bkSong { position: absolute; left: 50%; transform: translateX(-50%); top: calc(max(12px, env(safe-area-inset-top)) + 62px); padding: 7px 14px; border-radius: 999px; background: rgba(60,36,16,.8); border: 1px solid rgba(255,200,140,.5); color: #ffe7bd; font-size: 13px; font-weight: 700; white-space: nowrap; max-width: calc(100vw - 32px); overflow: hidden; text-overflow: ellipsis; }
  #bkBar { position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(max(14px, env(safe-area-inset-bottom)) + 6px); display: flex; gap: 8px; padding: 8px; border-radius: 24px; background: rgba(20,14,36,.8); border: 1px solid rgba(255,255,255,.14); }
  #bkBar button { all: unset; cursor: pointer; min-width: 58px; height: 54px; padding: 0 8px; display: grid; place-items: center; align-content: center; gap: 2px; border-radius: 16px; font-size: 24px; line-height: 1; color: #fdf3dc; text-align: center; }
  #bkBar button span { font-size: 11.5px; color: #e6d8c0; } #bkBar button:active { transform: scale(.92); background: rgba(255,255,255,.1); }
  #bkBar button.sup span { color: #ffd277; font-weight: 700; } #bkBar button.clap { background: rgba(255,200,140,.14); }
  #bkPick { position: absolute; left: 50%; bottom: calc(max(14px, env(safe-area-inset-bottom)) + 84px); transform: translateX(-50%); width: min(330px, calc(100vw - 24px)); display: none; flex-direction: column; gap: 6px; padding: 14px; border-radius: 20px; background: rgba(28,20,44,.95); border: 1px solid rgba(255,200,140,.35); color: #fdf3dc; }
  body.bkOn #supBox, body.bkOn #toast, body.bkOn #treatBox, body.bkOn #notice, body.bkOn #rdBanner { z-index: 12 !important; }
  #bkPick.on { display: flex; } #bkPick b { font-size: 15px; } #bkPick small { color: #c9b9a0; font-size: 12px; }
  #bkPick .g { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; } #bkPick button { all: unset; cursor: pointer; padding: 9px 6px; border-radius: 12px; border: 1px solid rgba(255,255,255,.18); text-align: center; font-size: 13px; }
  #bkPick button.cur { opacity: .45; } #bkPick .x { border: 0; color: #c9b9a0; }`;

  function build() {
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    const w = document.createElement("div"); w.id = "bkWrap"; w.setAttribute("role", "dialog"); w.setAttribute("aria-label", "버스킹 존");
    w.innerHTML = `<canvas id="bkCv"></canvas><div id="bkTop"><div id="bkInfo"></div><button id="bkBack">🌊 조용한 쪽으로</button></div><div id="bkSong"></div>
      <div id="bkPick"></div>
      <div id="bkBar"><button class="clap" id="bkClap">👏<span>박수</span></button><button id="bkReqB">🎵<span>신청곡</span></button><button class="sup" id="bkSupB">💛<span>응원</span></button><button id="bkStoreB">🏪<span>편의점</span></button><button id="bkTruckB">🚚<span>분식</span></button></div>`;
    document.body.appendChild(w); cv = $("bkCv"); g = cv.getContext("2d");
    $("bkBack").onclick = () => close();
    $("bkClap").onclick = () => { opt.send({ t: "clap" }); addClap(true); };
    $("bkReqB").onclick = () => { picking = !picking; pick(); };
    $("bkSupB").onclick = () => { if (opt.openSup) opt.openSup(); };
    $("bkStoreB").onclick = () => { if (window.HNStore) HNStore.open(); };
    $("bkTruckB").onclick = () => { if (window.HNTruck) HNTruck.open(); };
    const inR = (r, e) => r && e.clientX >= r[0] && e.clientX <= r[0] + r[2] && e.clientY >= r[1] && e.clientY <= r[1] + r[3];
    cv.addEventListener("click", e => { if (inR(storeR, e) && window.HNStore) HNStore.open(); else if (inR(truckR, e) && window.HNTruck) HNTruck.open(); });
    $("bkPick").addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (b) { opt.send({ t: "bkReq", i: +b.dataset.i }); picking = false; pick(); } else if (e.target.closest(".x")) { picking = false; pick(); } });
    addEventListener("resize", () => on && size());
    fetch("/busk.json").then(r => r.json()).then(j => { songs = j; info(); }).catch(() => {});
  }
  function pick() {
    const p = $("bkPick"); p.classList.toggle("on", picking); if (!picking) return;
    p.innerHTML = `<b>🎵 신청곡 고르기</b><small>무료예요 · 10분에 한 곡 · 지금 줄 ${st ? st.q.length : 0}/5</small><div class="g">${songs.map((x, i) => `<button data-i="${i}" class="${st && st.i === i ? "cur" : ""}">${esc(x.title)}</button>`).join("")}</div><button class="x">닫기</button>`;
  }
  function size() { DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; HH = innerHeight; cv.width = W * DPR; cv.height = HH * DPR; H.sit = null; }
  function info() {
    if (!$("bkInfo")) return;
    const s = st && songs[st.i];
    $("bkInfo").innerHTML = `<b>🎸 버스킹 존</b><br><small>관객 ${audN}명 · 오늘 👏 ${st ? st.claps : 0} · 💛 ${caseN}</small>`;
    const pos = st ? (now() - st.at) / 1000 : 0;
    $("bkSong").textContent = !s ? "🎸 준비 중" : pos < 0 ? `🎤 곡 사이 쉬는 중 · 다음 곡 「${s.title}」${st.by ? ` · 💛 ${st.by}님 신청` : ""}` : `🎵 「${s.title}」${st.by ? ` · ${st.by}님 신청곡` : ""}${st.q.length ? ` · 다음 ${st.q.length}곡 대기` : ""}`;
  }
  function open() {
    if (opt.closeOthers) opt.closeOthers();
    $("bkWrap").classList.add("on"); document.body.classList.add("bkOn"); on = true; $("bkTruckB").style.display = window.HNTruck ? "" : "none"; const tt = $("toast"); if (tt) tt.classList.remove("on"); size(); opt.send({ t: "bkIn", on: true });
    if (window.HNRadio && HNRadio.duck) HNRadio.duck(true);
    if (!el) { el = new Audio(); el.preload = "auto"; el.volume = .8; el.addEventListener("ended", () => {}); }
    el.play().catch(() => {});   // 누른 순간에 재생 허락(아이폰)
    sync(); info();
    cancelAnimationFrame(raf); let last = performance.now();
    const loop = t => { if (!on) return; const dt = Math.min(.05, (t - last) / 1000); last = t; draw(t / 1000, dt); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    clearInterval(H.iv); H.iv = setInterval(() => { info(); sync(); }, 1000);
  }
  function close() {
    on = false; cancelAnimationFrame(raf); clearInterval(H.iv); $("bkWrap").classList.remove("on"); document.body.classList.remove("bkOn"); picking = false; pick();
    if (el) el.pause(); opt.send({ t: "bkIn", on: false });
    if (window.HNRadio && HNRadio.duck) HNRadio.duck(false);
  }
  function sync() {
    if (!(on || lis) || !st || !songs.length || !el) return;
    const s = songs[st.i]; if (!s) return;
    const pos = (now() - st.at) / 1000, src = "/" + s.f;
    if (pos < 0 || pos > s.len - .5) { if (!el.paused) el.pause(); return; }
    const seek = () => { const p = (now() - st.at) / 1000; if (p >= 0 && p < s.len - 1) try { el.currentTime = p; } catch {} };
    if (!el.src.endsWith(src)) { el.src = src; el.addEventListener("loadedmetadata", seek, { once: true }); }
    else if (Math.abs(el.currentTime - pos) > 2.5) seek();
    if (el.paused) el.play().catch(() => {});
    if ("mediaSession" in navigator) try { navigator.mediaSession.metadata = new MediaMetadata({ title: s.title, artist: "🎸 한강 버스킹 · 밤 한강 돗자리" }); } catch {}
  }
  function addClap(mine) { claps.push({ x: mine ? .5 + (Math.random() - .5) * .2 : .15 + Math.random() * .7, y: 1, vy: .18 + Math.random() * .1, age: 0, mine }); if (claps.length > 80) claps.shift(); }
  function addHeart(nick) { hearts.push({ x: .5, y: .5, age: 0, nick }); }

  // ---------- 그리기 ----------
  function draw(t, dt) {
    const c = g; c.setTransform(DPR, 0, 0, DPR, 0, 0);
    const hz = HH * .4, sx = W / 2, sy = HH * .56, U = Math.min(W / 340, HH / 520);   // 무대 가운데
    let gr = c.createLinearGradient(0, 0, 0, hz); gr.addColorStop(0, "#090a24"); gr.addColorStop(1, "#2b2350"); c.fillStyle = gr; c.fillRect(0, 0, W, hz);
    // 별·달 + 멀리 다리 위로 지나가는 지하철(돗자리 쪽에서 보던 그 다리)
    if (!H.stars) { H.stars = []; for (let i = 0; i < 120; i++) H.stars.push([Math.random(), Math.random() * .9, Math.random() * 1.3 + .3, Math.random() * 6]); }
    for (const [a, b, r, p] of H.stars) { c.globalAlpha = .4 + .4 * Math.sin(t * 1.2 + p * 3); c.fillStyle = "#e9eeff"; c.beginPath(); c.arc(a * W, b * (hz - 60 * U), r, 0, Math.PI * 2); c.fill(); } c.globalAlpha = 1;
    { const mx = W * .78, my = Math.max(hz * .24, 66 + 14 * U), mr = 11 * U;   // 달: 부드러운 달무리(폰에선 오른쪽 위 버튼 아래로)
      gr = c.createRadialGradient(mx, my, mr * .8, mx, my, mr * 5); gr.addColorStop(0, "rgba(255,240,210,.2)"); gr.addColorStop(.5, "rgba(255,240,210,.05)"); gr.addColorStop(1, "rgba(255,240,210,0)"); c.fillStyle = gr; c.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
      gr = c.createRadialGradient(mx - mr * .3, my - mr * .3, 0, mx, my, mr); gr.addColorStop(0, "#fffaf0"); gr.addColorStop(1, "#eadfc2"); c.fillStyle = gr; c.beginPath(); c.arc(mx, my, mr, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(190,175,140,.26)"; for (const [a, b, r] of [[-.35, -.2, .22], [.25, .2, .3], [.1, -.45, .14]]) { c.beginPath(); c.arc(mx + a * mr, my + b * mr, r * mr, 0, Math.PI * 2); c.fill(); } }
    // 건너편 불빛과 강
    c.fillStyle = "#151638"; for (let i = 0; i < 26; i++) { const x = (i / 26) * W, h = (18 + ((i * 53) % 40)) * U; c.fillRect(x, hz - h, W / 26 - 2, h); }
    c.fillStyle = "rgba(255,210,140,.5)"; for (let i = 0; i < 90; i++) { const x = ((i * 97) % 1000) / 1000 * W, y = hz - ((i * 37) % 40) * U * .8 - 4; if ((i * 7 + Math.floor(t / 3)) % 11) c.fillRect(x, y, 1.6, 2); }
    gr = c.createLinearGradient(0, hz, 0, hz + 40 * U); gr.addColorStop(0, "#1a1d48"); gr.addColorStop(1, "#0d0f2a"); c.fillStyle = gr; c.fillRect(0, hz, W, 40 * U);
    { const bY = hz + 8 * U; c.fillStyle = "#1b1a3c"; c.fillRect(0, bY, W, 4 * U); for (let i = 0; i < 9; i++) c.fillRect(i * W / 8 - 2 * U, bY, 4 * U, 32 * U);
      const tp = ((t % 24) / 24) * (W + 260 * U) - 200 * U; if (tp < W + 10) { c.fillStyle = "#d9dee6"; c.fillRect(tp, bY - 9 * U, 170 * U, 9 * U); c.fillStyle = "#3aa660"; c.fillRect(tp, bY - 3.5 * U, 170 * U, 1.6 * U); c.fillStyle = "rgba(255,240,190,.95)"; for (let k = 0; k < 16; k++) c.fillRect(tp + 4 * U + k * 10.4 * U, bY - 7.5 * U, 6 * U, 3 * U); } }
    // 광장 바닥
    gr = c.createLinearGradient(0, hz + 40 * U, 0, HH); gr.addColorStop(0, "#1d1a2a"); gr.addColorStop(1, "#0b0a12"); c.fillStyle = gr; c.fillRect(0, hz + 40 * U, W, HH);
    street(c, t, dt, hz, sx, sy, U);
    c.strokeStyle = "rgba(255,255,255,.035)"; c.lineWidth = 1; for (let y = hz + 50 * U; y < HH; y += 13 * U) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }   // 광장 포석
    // 무대 조명(따뜻한 빛 웅덩이)
    gr = c.createRadialGradient(sx, sy, 0, sx, sy, 160 * U); gr.addColorStop(0, "rgba(255,190,120,.35)"); gr.addColorStop(1, "rgba(255,190,120,0)"); c.fillStyle = gr; c.beginPath(); c.ellipse(sx, sy, 190 * U, 70 * U, 0, 0, Math.PI * 2); c.fill();
    // 줄전구
    for (let k = 0; k < 2; k++) { const y0 = sy - (120 + k * 26) * U; c.strokeStyle = "rgba(60,50,70,.9)"; c.lineWidth = 1; c.beginPath(); for (let i = 0; i <= 30; i++) { const x = sx - 170 * U + i * 340 * U / 30, y = y0 + Math.sin(i / 30 * Math.PI) * 26 * U; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
      for (let i = 0; i <= 30; i += 2) { const x = sx - 170 * U + i * 340 * U / 30, y = y0 + Math.sin(i / 30 * Math.PI) * 26 * U + 3; c.fillStyle = `rgba(255,${210 + (i % 4) * 8},150,${.7 + .3 * Math.sin(t * 2 + i)})`; c.beginPath(); c.arc(x, y, 2.4 * U, 0, Math.PI * 2); c.fill(); } }
    // 앰프·마이크 스탠드
    c.fillStyle = "#1c1c22"; c.fillRect(sx + 46 * U, sy - 30 * U, 26 * U, 30 * U); c.fillStyle = "#333"; c.beginPath(); c.arc(sx + 59 * U, sy - 15 * U, 8 * U, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "#555"; c.lineWidth = 2 * U; c.beginPath(); c.moveTo(sx - 30 * U, sy); c.lineTo(sx - 30 * U, sy - 62 * U); c.lineTo(sx - 18 * U, sy - 70 * U); c.stroke();
    // 기타 케이스(오늘 응원 수만큼 하트)
    const cx0 = sx - 8 * U, cy0 = sy + 26 * U;
    c.fillStyle = "#2a1a12"; c.beginPath(); c.ellipse(cx0, cy0, 40 * U, 13 * U, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = "#7a2b3a"; c.beginPath(); c.ellipse(cx0, cy0, 35 * U, 10 * U, 0, 0, Math.PI * 2); c.fill();
    c.font = `${10 * U}px sans-serif`; c.textAlign = "center"; for (let i = 0; i < Math.min(caseN, 18); i++) c.fillText("💛", cx0 - 26 * U + (i % 6) * 10.5 * U, cy0 - 2 * U + Math.floor(i / 6) * 5 * U);
    c.fillStyle = "#ffd9a0"; c.font = `600 ${8.5 * U}px system-ui, sans-serif`; c.fillText(caseN ? `오늘 응원 ${caseN}번` : "버스커 응원", cx0, cy0 + 22 * U);
    // 버스커(그림 캐릭터): 의자에 앉아 기타 치기
    const playing = st && now() >= st.at, bpm = 96, beat = playing ? Math.sin(t * Math.PI * 2 * bpm / 60 / 2) : 0;
    const bx = sx, by = sy - 6 * U;
    c.fillStyle = "#3a2f3f"; c.fillRect(bx - 12 * U, by - 8 * U, 24 * U, 4 * U); c.fillRect(bx - 10 * U, by - 4 * U, 3 * U, 14 * U); c.fillRect(bx + 7 * U, by - 4 * U, 3 * U, 14 * U);
    c.fillStyle = "#2e4a6a"; c.beginPath(); c.roundRect ? c.roundRect(bx - 11 * U, by - 40 * U, 22 * U, 32 * U, 8 * U) : c.rect(bx - 11 * U, by - 40 * U, 22 * U, 32 * U); c.fill();
    c.fillStyle = "#f2d2b6"; c.beginPath(); c.arc(bx, by - 50 * U + beat * .6 * U, 11 * U, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#2a1d1a"; c.beginPath(); c.arc(bx, by - 54 * U + beat * .6 * U, 11.5 * U, Math.PI, 2 * Math.PI); c.fill(); c.fillRect(bx - 11.5 * U, by - 55 * U + beat * .6 * U, 4 * U, 9 * U);
    c.fillStyle = "#222"; c.fillRect(bx - 5 * U, by - 50 * U + beat * .6 * U, 2.2 * U, 2.2 * U); c.fillRect(bx + 3 * U, by - 50 * U + beat * .6 * U, 2.2 * U, 2.2 * U);
    c.save(); c.translate(bx + 2 * U, by - 18 * U); c.rotate(-.35); c.fillStyle = "#b5733a"; c.beginPath(); c.ellipse(0, 0, 13 * U, 9 * U, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = "#3a2210"; c.beginPath(); c.arc(1 * U, 0, 3 * U, 0, Math.PI * 2); c.fill(); c.fillStyle = "#6b4423"; c.fillRect(10 * U, -2 * U, 30 * U, 4 * U); c.restore();
    c.strokeStyle = "#f2d2b6"; c.lineWidth = 3 * U; c.lineCap = "round"; c.beginPath(); c.moveTo(bx + 8 * U, by - 34 * U); c.lineTo(bx + 4 * U, by - 20 * U + beat * 3 * U); c.stroke();
    // 음표
    if (playing && Math.random() < dt * 2.2) notes.push({ x: bx + (Math.random() - .3) * 30 * U, y: by - 60 * U, age: 0, ch: "♪♫♬"[Math.floor(Math.random() * 3)] });
    c.font = `${12 * U}px sans-serif`; notes = notes.filter(n => (n.age += dt) < 3); for (const n of notes) { c.globalAlpha = Math.max(0, 1 - n.age / 3); c.fillStyle = "#ffe0a8"; c.fillText(n.ch, n.x + Math.sin(n.age * 3) * 6 * U, n.y - n.age * 22 * U); } c.globalAlpha = 1;
    // 말풍선(곡 사이 멘트)
    const pos = st ? (now() - st.at) / 1000 : 1;
    if (st && pos < 0 && pos > -8.5) { if (lastSay !== st.at) { lastSay = st.at; say = LINES[Math.floor(Math.random() * LINES.length)]; if (st.by) say = `${st.by}님 신청곡 갈게요 🎵`; else if ((st.songs || 0) % 3 === 2) say = LINES[5]; } bubble(c, bx, by - 72 * U, say, U); }
    // 관객(실제 이 구역에 있는 사람들)
    // 자리: 무대 아래부터 아래 줄 위까지 4줄, 한 줄에 이름이 안 겹칠 만큼만(이름은 한 칸씩 높낮이를 달리함)
    const aud = (st && st.aud) || [], spots = audSpots(sx, sy, U);
    plaza(c, t, hz, sx, sy, U, spots.slice(0, aud.length));
    aud.forEach((p, i) => { const sp = spots[i]; if (!sp) return; person(c, sp[0], sp[1], (1 + sp[2] * .14) * U, p, t, opt.me && p.id === opt.me(), sp[3]); });
    // 박수·하트
    c.font = `${16 * U}px sans-serif`; claps = claps.filter(k => (k.age += dt) < 1.6); for (const k of claps) { c.globalAlpha = Math.max(0, 1 - k.age / 1.6); c.fillText("👏", k.x * W, HH * (.82 - k.age * k.vy * 1.6)); } c.globalAlpha = 1;
    hearts = hearts.filter(h => (h.age += dt) < 3.2); for (const h of hearts) { const u = Math.min(1, h.age / 1.1), x = W * .5 + (cx0 - W * .5) * u, y = HH * .9 + (cy0 - HH * .9) * u - Math.sin(u * Math.PI) * 80 * U; c.font = `${(22 - u * 8) * U}px sans-serif`; c.globalAlpha = h.age > 2.4 ? (3.2 - h.age) / .8 : 1; c.fillText("💛", x, y); c.font = `700 ${11 * U}px system-ui, sans-serif`; c.fillStyle = "#ffe2a8"; c.fillText(`${h.nick}님 응원 고마워요!`, cx0, cy0 - 40 * U - h.age * 6 * U); } c.globalAlpha = 1;
  }
  // 🏙 거리 꾸미기: 왼쪽 편의점(누르면 들어감)·라면 먹는 테이블, 오른쪽 푸드트럭, 지나가는 사람·서서 보는 사람(그림, 숫자로 세지 않음)
  function street(c, t, dt, hz, sx, sy, U) {
    const by = hz + 50 * U, sw = Math.min(W * .3, 112 * U), sh = 64 * U, x0 = 4;
    // 편의점 건물
    c.fillStyle = "#2a3038"; c.fillRect(x0, by - sh - 14 * U, sw, sh + 14 * U);
    let gr = c.createLinearGradient(0, by - sh, 0, by); gr.addColorStop(0, "#f6fff9"); gr.addColorStop(1, "#cfeee0"); c.fillStyle = gr; c.fillRect(x0 + 4 * U, by - sh + 6 * U, sw - 8 * U, sh - 8 * U);
    c.fillStyle = "#2aa86f"; c.fillRect(x0, by - sh - 14 * U, sw, 13 * U); c.fillStyle = "#f39a1e"; c.fillRect(x0, by - sh - 3 * U, sw, 3 * U);
    c.fillStyle = "#fff"; c.font = `800 ${8.5 * U}px system-ui, sans-serif`; c.textAlign = "center"; c.fillText("🏪 한강 편의점", x0 + sw / 2, by - sh - 4.5 * U);
    c.fillStyle = "#b9c9d2"; for (let i = 0; i < 3; i++) c.fillRect(x0 + 8 * U, by - sh + (14 + i * 14) * U, sw * .5, 2 * U);   // 진열대
    c.font = `${7 * U}px sans-serif`; ["🍙🥤🍫", "🍜🧃🍪", "🌭🥛🍦"].forEach((r, i) => c.fillText(r, x0 + 8 * U + sw * .25, by - sh + (12 + i * 14) * U));
    c.fillStyle = "rgba(40,60,70,.35)"; c.fillRect(x0 + sw * .66, by - sh + 8 * U, sw * .26, sh - 10 * U);   // 문
    c.fillStyle = "#3b4a55"; c.beginPath(); c.arc(x0 + sw * .62, by - 14 * U + Math.sin(t * 1.3) * .6 * U, 4 * U, 0, Math.PI * 2); c.fill(); c.fillRect(x0 + sw * .62 - 4 * U, by - 10 * U, 8 * U, 9 * U);   // 안의 손님
    gr = c.createRadialGradient(x0 + sw / 2, by, 0, x0 + sw / 2, by, sw); gr.addColorStop(0, "rgba(220,255,235,.22)"); gr.addColorStop(1, "rgba(220,255,235,0)"); c.fillStyle = gr; c.fillRect(x0 - 10, by - 10 * U, sw + 40 * U, 50 * U);
    // 편의점 앞 파라솔 테이블: 한강라면 먹는 두 사람(김 모락모락)
    const tx = x0 + sw * .5, ty = by + 22 * U;
    c.fillStyle = "#c0392b"; c.beginPath(); c.moveTo(tx - 26 * U, ty - 30 * U); c.lineTo(tx, ty - 42 * U); c.lineTo(tx + 26 * U, ty - 30 * U); c.fill(); c.fillStyle = "#ddd"; c.fillRect(tx - .8 * U, ty - 30 * U, 1.6 * U, 26 * U);
    c.fillStyle = "#e9edf0"; c.fillRect(tx - 16 * U, ty - 6 * U, 32 * U, 3 * U); c.fillRect(tx - 1.5 * U, ty - 3 * U, 3 * U, 10 * U);
    for (const [dx, col, ph] of [[-20, "#e2a35a", 0], [20, "#7aa0d8", 1.7]]) { const slurp = Math.max(0, Math.sin(t * 1.4 + ph)) * 1.5 * U; c.fillStyle = col; c.beginPath(); c.ellipse(tx + dx * U, ty - 6 * U, 6 * U, 7 * U, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = "#2a1f1c"; c.beginPath(); c.arc(tx + dx * U * .95, ty - 17 * U + slurp, 5 * U, 0, Math.PI * 2); c.fill(); }
    c.font = `${7 * U}px sans-serif`; c.fillText("🍜", tx - 7 * U, ty - 7 * U); c.fillText("🍜", tx + 7 * U, ty - 7 * U);
    c.fillStyle = "rgba(255,255,255,.35)"; for (let i = 0; i < 4; i++) { const a = (t * .6 + i / 4) % 1; c.globalAlpha = (1 - a) * .5; c.beginPath(); c.arc(tx + (i % 2 ? 7 : -7) * U + Math.sin(a * 6 + i) * 2 * U, ty - 12 * U - a * 16 * U, (1.5 + a * 3) * U, 0, Math.PI * 2); c.fill(); } c.globalAlpha = 1;
    storeR = [x0, by - sh - 14 * U, sw, sh + 14 * U + 30 * U];
    if (Math.floor(t * 1.2) % 2) { c.fillStyle = "rgba(255,255,255,.85)"; c.font = `700 ${7.5 * U}px system-ui, sans-serif`; c.fillText("들어가기 ▶", x0 + sw / 2, by + 36 * U); }
    // 오른쪽 푸드트럭(분식)
    const fx = W - 4 - sw, fy = by;
    c.fillStyle = "#f2c14e"; c.beginPath(); c.roundRect ? c.roundRect(fx, fy - 44 * U, sw * .95, 38 * U, 6 * U) : c.rect(fx, fy - 44 * U, sw * .95, 38 * U); c.fill();
    c.fillStyle = "#3a2a14"; c.fillRect(fx + 8 * U, fy - 38 * U, sw * .55, 16 * U); c.fillStyle = "#ffe9b0"; c.fillRect(fx + 9 * U, fy - 37 * U, sw * .55 - 2 * U, 14 * U);
    c.font = `${8 * U}px sans-serif`; c.fillText("🍢 🌭 🧇", fx + 8 * U + sw * .275, fy - 27 * U); c.fillStyle = "#222"; for (const k of [.2, .75]) { c.beginPath(); c.arc(fx + sw * k, fy - 5 * U, 5 * U, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = "#c0392b"; c.font = `800 ${7.5 * U}px system-ui, sans-serif`; c.fillText("분식 트럭", fx + sw * .47, fy - 47 * U);
    truckR = [fx, fy - 54 * U, sw * .95, 56 * U];
    if (window.HNTruck && Math.floor(t * 1.2 + 1) % 2) { c.fillStyle = "rgba(255,255,255,.85)"; c.font = `700 ${7.5 * U}px system-ui, sans-serif`; c.fillText("주문하기 ▶", fx + sw * .47, fy + 12 * U); }
    // 지나가는 사람들(산책로)
    if (!walkers) { walkers = []; for (let i = 0; i < 9; i++) walkers.push({ x: Math.random(), v: (Math.random() < .5 ? -1 : 1) * (.012 + Math.random() * .018), y: Math.random(), c: ["#4a4060", "#3d5266", "#5a4a44", "#455a4a"][i % 4], ph: Math.random() * 6, dog: i === 3 }); }
    for (const w of walkers) { w.x += w.v * dt; if (w.x > 1.1) w.x = -.1; if (w.x < -.1) w.x = 1.1;
      const x = w.x * W, y = hz + 44 * U + w.y * 10 * U, s = .8 * U, step = Math.sin(t * 6 + w.ph) * 2 * s;
      c.fillStyle = w.c; c.fillRect(x - 3 * s + step * .5, y - 8 * s, 2.4 * s, 8 * s); c.fillRect(x + .6 * s - step * .5, y - 8 * s, 2.4 * s, 8 * s);
      c.beginPath(); c.ellipse(x, y - 14 * s, 5 * s, 7 * s, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(x, y - 24 * s, 4.2 * s, 0, Math.PI * 2); c.fill();
      if (w.dog) { c.fillStyle = "#b08a5a"; c.fillRect(x + (w.v > 0 ? 8 : -16) * s, y - 5 * s, 8 * s, 4 * s); c.beginPath(); c.arc(x + (w.v > 0 ? 17 : -17) * s, y - 6 * s, 2.6 * s, 0, Math.PI * 2); c.fill(); } }
    // 서서 보는 사람들(무대 양옆, 휴대폰 불빛)
    if (!crowd) { crowd = []; for (let i = 0; i < 16; i++) { const left = i % 2 === 0; crowd.push({ a: left ? Math.random() * .3 : .7 + Math.random() * .3, y: Math.random(), c: ["#2c2638", "#262d3a", "#33292a"][i % 3], ph: Math.random() * 6, phone: Math.random() < .35 }); } }
    for (const p of crowd) { const x = W * (.04 + p.a * .92), y = sy - 6 * U + p.y * 18 * U, s = (.95 + p.y * .25) * U, sway = Math.sin(t * 1.8 + p.ph) * 1.2 * s;
      if (Math.abs(x - sx) < 70 * U) continue;
      c.fillStyle = p.c; c.beginPath(); c.ellipse(x + sway * .3, y - 12 * s, 7 * s, 13 * s, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(x + sway, y - 29 * s, 6 * s, 0, Math.PI * 2); c.fill();
      if (p.phone) { c.fillStyle = `rgba(200,230,255,${.7 + .3 * Math.sin(t * 3 + p.ph)})`; c.fillRect(x + 6 * s + sway, y - 40 * s, 3.5 * s, 6 * s); } }
  }
  function bubble(c, x, y, text, U) {
    c.font = `600 ${11 * U}px system-ui, sans-serif`; const w = Math.min(W - 24, c.measureText(text).width + 22 * U), h = 26 * U, x0 = Math.max(12, Math.min(W - 12 - w, x - w / 2));
    c.fillStyle = "rgba(255,248,236,.95)"; c.beginPath(); c.roundRect ? c.roundRect(x0, y - h, w, h, 12 * U) : c.rect(x0, y - h, w, h); c.fill();
    c.beginPath(); c.moveTo(x - 5 * U, y); c.lineTo(x + 5 * U, y); c.lineTo(x, y + 7 * U); c.fill();
    c.fillStyle = "#3a2a20"; c.textAlign = "center"; c.fillText(text, x0 + w / 2, y - h / 2 + 4 * U);
  }
  function audSpots(sx, sy, U) {
    const r0 = sy + 58 * U, r1 = HH - 100, per = Math.max(5, Math.min(13, Math.floor(W * .86 / (44 * U)))), spots = [];
    for (let r = 0; r < 4; r++) { const y = r0 + (r1 - r0) * r / 3; for (let i = 0; i < per; i++) { const a = (i + .5) / per, x = W * (.07 + a * .86) + (r % 2 ? 14 * U : 0); if (r <= 1 && Math.abs(x - sx) < 62 * U) continue; /* 무대·기타 케이스 글자 자리는 비움 */ spots.push([x, y, r, i % 2]); } }
    return spots;
  }
  // 🪑 광장 채우기: 바닥 포석, 앉아서 보는 그림 관객(실제 사람 자리는 비움), 가로등, 맨 앞 화단
  function plaza(c, t, hz, sx, sy, U, used) {
    if (!H.sit) { H.sit = []; let k = 1; const rnd = () => (k = (k * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < Math.max(10, Math.min(26, Math.round(W / 55))); i++) H.sit.push({ a: .03 + rnd() * .94, r: rnd(), c: ["#2b2538", "#25303a", "#352a2c", "#2a3330"][i % 4], ph: rnd() * 6, phone: rnd() < .3, mat: rnd() < .35, mc: ["#5a2a2a", "#243b5a", "#2f4a33"][i % 3], ribbon: rnd() < .3 }); }
    const r0 = sy + 66 * U, r1 = HH - 90;
    for (const p of H.sit) { const x = W * p.a, y = r0 + (r1 - r0) * p.r, s = (.78 + p.r * .34) * U;
      if (Math.abs(x - sx) < 70 * U && y < sy + 110 * U) continue;
      if (used.some(q => Math.abs(q[0] - x) < 24 * U && Math.abs(q[1] - y) < 34 * U)) continue;
      if (p.mat) { c.fillStyle = p.mc; c.globalAlpha = .7; c.beginPath(); c.ellipse(x, y + 3 * s, 16 * s, 5 * s, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
      const sway = Math.sin(t * 1.3 + p.ph) * .8 * s;
      c.fillStyle = "rgba(0,0,0,.3)"; c.beginPath(); c.ellipse(x, y + 2 * s, 10 * s, 2.6 * s, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = p.c; c.beginPath(); c.ellipse(x, y - 7 * s, 8 * s, 9 * s, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(x + sway * .5, y - 20 * s, 6.5 * s, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(255,200,140,.13)"; c.beginPath(); c.arc(x + sway * .5, y - 21.5 * s, 5 * s, Math.PI, 2 * Math.PI); c.fill();   // 무대 불빛이 머리 위에 닿음
      if (p.ribbon) { c.fillStyle = "#8a4a5c"; c.beginPath(); c.arc(x + 4 * s + sway * .5, y - 25 * s, 2 * s, 0, Math.PI * 2); c.fill(); }
      if (p.phone) { c.fillStyle = `rgba(200,230,255,${.5 + .3 * Math.sin(t * 2.5 + p.ph)})`; c.fillRect(x + 5 * s, y - 16 * s, 3 * s, 5 * s); } }
    // 가로등 두 개(광장 양옆)
    for (const lx of [W * .06, W * .94]) { const ly = r0 + (r1 - r0) * .45, lh = 70 * U;
      gr = c.createRadialGradient(lx, ly - lh, 0, lx, ly - lh, 60 * U); gr.addColorStop(0, "rgba(255,214,150,.28)"); gr.addColorStop(1, "rgba(255,214,150,0)"); c.fillStyle = gr; c.fillRect(lx - 60 * U, ly - lh - 60 * U, 120 * U, 120 * U);
      c.fillStyle = "#2a2a34"; c.fillRect(lx - 1.3 * U, ly - lh, 2.6 * U, lh); c.fillRect(lx - 5 * U, ly - 2 * U, 10 * U, 2.5 * U);
      c.fillStyle = "#ffe8b8"; c.beginPath(); c.arc(lx, ly - lh, 3.6 * U, 0, Math.PI * 2); c.fill(); }
    // 맨 앞 화단(어두운 수풀)과 바닥 어둡게
    c.fillStyle = "#101018"; for (const [fx, fw] of [[0, .22], [.78, .22]]) { for (let i = 0; i < 7; i++) { const x = W * (fx + fw * i / 6), r = (12 + (i * 7 % 9)) * U; c.beginPath(); c.arc(x, HH + 2 * U, r, Math.PI, 2 * Math.PI); c.fill(); } }
    gr = c.createLinearGradient(0, HH - 60 * U, 0, HH); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.45)"); c.fillStyle = gr; c.fillRect(0, HH - 60 * U, W, 60 * U);
  }
  let gr = null;
  function person(c, x, y, s, p, t, me, lift) {
    const col = p.g === "f" ? "#d98aa8" : p.g === "m" ? "#6c8fd6" : "#8fb59a", bob = Math.sin(t * 2 + p.id) * .8 * s;
    c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(x, y + 2 * s, 11 * s, 3 * s, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = col; c.beginPath(); c.ellipse(x, y - 8 * s, 9 * s, 10 * s, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#2a1f1c"; c.beginPath(); c.arc(x, y - 23 * s + bob, 8 * s, 0, Math.PI * 2); c.fill();   // 뒷모습(무대를 봄)
    if (p.g === "f") { c.fillStyle = "#e35a7a"; c.beginPath(); c.arc(x + 5 * s, y - 29 * s + bob, 2.6 * s, 0, Math.PI * 2); c.fill(); }
    // 이름표: 어두운 알약 위에, 옆 사람과 높이를 어긋나게 해서 안 겹침
    const name = me ? "나 · " + p.nick : p.nick, fs = Math.max(9, 8 * s), ny = y - 36 * s + bob - (lift ? 12 * s : 0);
    c.font = `${me ? 700 : 500} ${fs}px system-ui, sans-serif`; c.textAlign = "center"; const tw = c.measureText(name).width + 10;
    c.fillStyle = me ? "rgba(60,40,10,.7)" : "rgba(10,8,20,.55)"; c.beginPath(); c.roundRect ? c.roundRect(x - tw / 2, ny - fs * .85, tw, fs * 1.4, 6) : c.rect(x - tw / 2, ny - fs * .85, tw, fs * 1.4); c.fill();
    c.fillStyle = me ? "#ffd38a" : "rgba(255,255,255,.88)"; c.fillText(name, x, ny);
  }

  H.init = o => { opt = o; build(); };
  H.open = open; H.close = () => on && close();
  H.isOpen = () => on;
  // 🚶 2D 산책길(trail.js)에서 무대 근처를 지날 때: 창을 열지 않고 소리만, 거리에 따라 작게(0이면 멈춤)
  let lis = false, lisT = 0;
  H.listen = vol => {
    if (on) return; const want = vol > .01;
    if (want && !el) { el = new Audio(); el.preload = "auto"; }
    if (!el) return;
    if (want !== lis) { lis = want; if (!want) { el.pause(); return; } sync(); }
    if (want) { el.volume = Math.max(0, Math.min(.8, vol)); if (performance.now() - lisT > 1000) { lisT = performance.now(); sync(); } }
  };
  H.song = () => { const s = st && songs[st.i]; const pos = st ? (now() - st.at) / 1000 : -1; return s && pos >= 0 ? s.title : ""; };
  H.count = () => audN;
  H.onMsg = m => {
    if (m.t === "busk") { st = m; off = m.now - Date.now(); audN = m.n; caseN = m.sups || 0; info(); sync(); if (picking) pick(); }
    else if (m.t === "bkN") { audN = m.n; }
    else if (m.t === "claps") { if (st) st.claps = m.total; for (let i = 0; i < Math.min(8, m.k); i++) setTimeout(() => addClap(false), i * 90); info(); }
    else if (m.t === "bkReqOk") { opt.toast(`🎵 ${m.by}님이 「${(songs[m.i] || {}).title || ""}」 신청했어요`, 2600); }
    else if (m.t === "bkReqBad") opt.toast(m.why === "full" ? "신청곡 줄이 꽉 찼어요. 조금 뒤에 다시 해 주세요" : `신청곡은 10분에 한 곡이에요 (${m.left}분 남음)`, 2600);
    else if (m.t === "bkSup") { caseN = m.sups || caseN + 1; addHeart(m.nick); info(); }
  };
})();
