// 📻 한강 라디오 — 01(index.html)과 02(3d.html)가 같이 쓰는 파일.
// 서버가 곡 순서와 시작 시각을 정해 모두에게 보내고(t:"radio"), 페이지는 그 시각에 맞춰 같은 곡 같은 부분을 튼다.
// 곡: 한강 돗자리가 직접 만든 곡(CC0 악기 샘플로 연주, README 참고). 💛 응원을 쏘면 신청곡 1곡 + 짧은 사연(20자).
(function () {
  const H = window.HNRadio = {};
  let opt = null, songs = [], st = null, off = 0, el = null, ctx = null, gain = null, ticket = false, listeners = 0;
  let cfg = { on: false, vol: 55 };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem("hn-radio") || "{}")); } catch {}
  const save = () => { try { localStorage.setItem("hn-radio", JSON.stringify(cfg)); } catch {} };
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const now = () => Date.now() + off;

  const css = `
  #rdChip { all: unset; position: fixed; left: 50%; transform: translateX(-50%); top: calc(max(12px, env(safe-area-inset-top)) + 50px); cursor: pointer; display: none; align-items: center; gap: 7px; padding: 6px 13px; border-radius: 999px; font: 600 12.5px/1.2 system-ui, sans-serif; color: #fdf3dc; background: rgba(20,24,52,.72); border: 1px solid rgba(243,217,164,.35); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); max-width: calc(100vw - 150px); white-space: nowrap; }
  #rdChip.on { display: flex; } #rdChip span { overflow: hidden; text-overflow: ellipsis; } #rdChip i { font-style: normal; opacity: .75; font-weight: 500; }
  #rdChip .eq { display: inline-flex; gap: 2px; align-items: flex-end; height: 11px; } #rdChip .eq b { width: 2.5px; background: #f3d9a4; border-radius: 1px; animation: rdEq 1s ease-in-out infinite; }
  #rdChip .eq b:nth-child(2) { animation-delay: -.35s; } #rdChip .eq b:nth-child(3) { animation-delay: -.7s; } #rdChip.idle .eq b { animation: none; height: 3px; }
  #rdChip.idle { color: #e8e2f2; background: rgba(20,24,52,.6); border-color: rgba(255,255,255,.22); font-weight: 600; } #rdChip.idle .eq { display: none; }
  #rdChip:not(.idle) { background: rgba(70,52,20,.78); border-color: rgba(243,217,164,.7); box-shadow: 0 0 14px rgba(243,200,120,.25); }
  #rdChip.pulse { animation: rdPulse 1.6s ease-in-out 4; } @keyframes rdPulse { 0%, 100% { box-shadow: 0 0 0 rgba(243,217,164,0); } 50% { box-shadow: 0 0 16px rgba(243,217,164,.55); } }
  @keyframes rdEq { 0%, 100% { height: 3px; } 50% { height: 11px; } }
  #rdBox { position: fixed; left: 50%; top: 46%; transform: translate(-50%, -50%); width: min(340px, calc(100vw - 32px)); max-height: calc(100vh - 140px); overflow: auto; z-index: 8; display: none; flex-direction: column; gap: 10px; padding: 18px 16px 14px; border-radius: 22px; background: #141a3a; color: #fdf3dc; border: 1px solid rgba(243,217,164,.3); box-shadow: 0 14px 44px rgba(0,0,0,.5); font: 14px/1.45 system-ui, sans-serif; }
  #rdBox.on { display: flex; } #rdBox h3 { margin: 0; font-size: 17px; display: flex; justify-content: space-between; align-items: center; } #rdBox h3 small { font-weight: 500; font-size: 12px; color: #b9b3c9; }
  #rdBox .now { padding: 12px; border-radius: 14px; background: rgba(255,255,255,.06); display: flex; flex-direction: column; gap: 6px; }
  #rdBox .now b { font-size: 16px; } #rdBox .now small, #rdBox .note { color: #b9b3c9; font-size: 12px; }
  #rdBox .bar { height: 4px; border-radius: 2px; background: rgba(255,255,255,.12); overflow: hidden; } #rdBox .bar i { display: block; height: 100%; width: 0; background: #f3d9a4; }
  #rdBox .ded { padding: 8px 10px; border-radius: 10px; background: rgba(243,180,90,.16); color: #ffe2b0; font-size: 13px; }
  #rdBox .row { display: flex; gap: 10px; align-items: center; } #rdBox input[type=range] { flex: 1; accent-color: #f3d9a4; min-width: 0; }
  #rdBox button { all: unset; cursor: pointer; padding: 8px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,.2); color: #e8e2f2; text-align: center; white-space: nowrap; }
  #rdBox button.pri { background: #f3d9a4; color: #3a2a12; font-weight: 700; border-color: transparent; } #rdBox button.sup { background: #e8913a; color: #fff; font-weight: 700; border-color: transparent; }
  #rdBox ol { margin: 0; padding-left: 20px; font-size: 13px; color: #d9d3e6; } #rdBox ol li span { color: #ffd38a; }
  #rdBox .pick { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; } #rdBox .pick button { padding: 8px 6px; font-size: 13px; border-radius: 12px; } #rdBox .pick button.sel { background: rgba(243,217,164,.25); border-color: #f3d9a4; }
  #rdBox input[type=text] { all: unset; padding: 9px 12px; border-radius: 12px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.15); font-size: 14px; }
  #rdBanner { position: fixed; left: 50%; transform: translateX(-50%) translateY(-8px); top: calc(max(12px, env(safe-area-inset-top)) + 84px); z-index: 7; padding: 10px 16px; border-radius: 16px; background: rgba(60,38,14,.88); color: #ffe7bd; border: 1px solid rgba(243,190,110,.55); font: 600 13.5px/1.45 system-ui, sans-serif; text-align: center; max-width: calc(100vw - 32px); opacity: 0; pointer-events: none; transition: opacity .5s, transform .5s; }
  #rdBanner.on { opacity: 1; transform: translateX(-50%) translateY(0); pointer-events: auto; cursor: pointer; } #rdBanner small { display: block; font-weight: 500; color: #f5d6a0; }`;

  function build() {
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    const chip = document.createElement("button"); chip.id = "rdChip"; chip.setAttribute("aria-label", "한강 라디오");
    chip.innerHTML = `<span class="eq"><b></b><b></b><b></b></span><span id="rdChipT">📻 한강 라디오</span>`; chip.onclick = () => { if (cfg.on) return open(); setOn(true); opt.toast("📻 라디오를 켰어요 · 위의 곡 이름을 누르면 끄기·신청곡", 3200); };
    const box = document.createElement("div"); box.id = "rdBox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "한강 라디오");
    const ban = document.createElement("div"); ban.id = "rdBanner"; ban.onclick = () => { ban.classList.remove("on"); open(); };
    if (opt.chipTop) chip.style.top = `calc(max(12px, env(safe-area-inset-top)) + ${opt.chipTop}px)`;
    if (opt.bannerTop) ban.style.top = `calc(max(12px, env(safe-area-inset-top)) + ${opt.bannerTop}px)`;
    const top = document.getElementById("top");   // 곡 표시는 위 줄 바로 뒤에(다른 창보다 아래에 깔리게)
    if (top) top.after(chip); else document.body.append(chip);
    document.body.append(box, ban);
  }

  // ---------- 재생 ----------
  function ensureAudio() {
    if (el) return;
    el = new Audio(); el.preload = "auto"; el.crossOrigin = "anonymous";
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) { try { ctx = new AC(); gain = ctx.createGain(); ctx.createMediaElementSource(el).connect(gain); gain.connect(ctx.destination); } catch { ctx = null; gain = null; } }
    el.addEventListener("ended", () => { if (cfg.on) setTimeout(sync, 1200); });
  }
  const vol = () => (cfg.vol / 100) ** 2 * .9;
  function applyVol() { if (!el) return; if (gain) gain.gain.value = vol(); else el.volume = Math.min(1, vol()); }
  function sync() {
    if (!st || !songs.length) return;
    const s = songs[st.i]; if (!s) return;
    if (!cfg.on) { if (el) el.pause(); return render(); }
    if (H.ducked) { if (el) el.pause(); return render(); }   // 🎸 버스킹 구역에 있는 동안은 라디오를 멈춘다
    ensureAudio(); applyVol();
    if (ctx && ctx.state === "suspended") ctx.resume();
    const pos = (now() - st.at) / 1000;
    if (pos > s.len - 1) return render();                    // 곡 사이 쉬는 틈(서버가 다음 곡을 곧 보낸다)
    const src = "/" + s.f;
    const seek = () => { const p = Math.max(0, (now() - st.at) / 1000); if (p < s.len - 1) { try { el.currentTime = p; } catch {} } };
    if (!el.src.endsWith(src)) { el.src = src; el.addEventListener("loadedmetadata", seek, { once: true }); }
    else if (Math.abs(el.currentTime - pos) > 2.5) seek();
    if (pos < 0) { el.pause(); clearTimeout(sync.t); sync.t = setTimeout(sync, -pos * 1000); }
    else el.play().catch(() => {});
    if ("mediaSession" in navigator) try { navigator.mediaSession.metadata = new MediaMetadata({ title: s.title, artist: "📻 한강 라디오 · 밤 한강 돗자리", album: s.inst }); } catch {}
    render();
  }
  function setOn(on) {
    cfg.on = on; save();
    if (on) { ensureAudio(); if (ctx && ctx.state === "suspended") ctx.resume(); el.play().catch(() => {}); }   // 누른 순간 재생 허락받기(아이폰)
    opt.send({ t: "radio", on });
    sync();
  }

  // ---------- 화면 ----------
  let pickI = null, sleepAt = 0, sleepMin = 0;   // ⏱ 잠들기 예약: 시간이 되면 20초 동안 소리를 줄이고 끈다(이 폰에서만)
  function render() {
    const chip = $("rdChip"); if (!chip || !st) return;
    const s = songs[st.i] || {};
    chip.classList.add("on");
    chip.classList.toggle("idle", !cfg.on);
    const n = Math.max(cfg.on ? 1 : 0, listeners);
    $("rdChipT").innerHTML = cfg.on ? `📻 ${esc(s.title || "")} <i>· 🎧 ${n}</i>` : `📻 라디오 듣기${n >= 2 ? ` <i>· 🎧 ${n}명 듣는 중</i>` : ""}`;
    chip.setAttribute("aria-label", cfg.on ? `한강 라디오 켜짐: ${s.title || ""}` : "한강 라디오 켜기");
    if ($("rdBox").classList.contains("on")) fill();
  }
  function fill() {
    const box = $("rdBox"), s = songs[st.i] || {}, nx = st.q && st.q.length ? st.q : [{ i: (st.i + 1) % songs.length }];
    const pos = Math.max(0, (now() - st.at) / 1000), pct = s.len ? Math.min(100, pos / s.len * 100) : 0;
    const mm = x => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}`;
    const picking = ticket && pickI !== null;
    box.innerHTML = `<h3>📻 한강 라디오 <small>🎧 ${Math.max(cfg.on ? 1 : 0, listeners)}명 같이 듣는 중</small></h3>
      <div class="now"><small>지금 흐르는 곡</small><b>${esc(s.title || "")}</b><small id="rdTime">${esc(s.inst || "")} · ${mm(Math.min(pos, s.len || 0))} / ${mm(s.len || 0)}</small><div class="bar"><i style="width:${pct}%"></i></div>
      ${st.by ? `<div class="ded">💛 ${esc(st.by)}님의 신청곡${st.msg ? `<br>“${esc(st.msg)}”` : ""}</div>` : ""}</div>
      <div class="row"><button id="rdPow" class="${cfg.on ? "" : "pri"}">${cfg.on ? "⏸ 끄기" : "▶ 같이 듣기"}</button><input id="rdVol" type="range" min="0" max="100" value="${cfg.vol}" aria-label="라디오 크기"></div>
      ${st.top && st.top.length ? `<div><small class="note">🏆 오늘 인기 신청곡</small><ol>${st.top.map(x => `<li>${esc((songs[x.i] || {}).title || "")} <span>${x.n}번</span></li>`).join("")}</ol></div>` : ""}
      ${cfg.on ? `<div class="row"><small class="note" style="flex:0 0 auto">⏱ 잠들기 예약</small>${[15, 30, 60].map(mn => `<button data-sl="${mn}" class="${sleepAt && sleepMin === mn ? "pri" : ""}" style="padding:6px 10px;font-size:12.5px">${mn}분</button>`).join("")}</div>${sleepAt ? `<small class="note" id="rdSleep"></small>` : ""}` : ""}
      <div><small class="note">다음 곡</small><ol>${nx.slice(0, 5).map(x => `<li>${esc((songs[x.i] || {}).title || "")}${x.by ? ` <span>💛 ${esc(x.by)}</span>` : ""}</li>`).join("")}</ol></div>
      ${picking ? `<div class="pick">${songs.map((x, i) => `<button data-i="${i}" class="${i === pickI ? "sel" : ""}">${esc(x.title)}</button>`).join("")}</div>
        <input type="text" id="rdMsg" maxlength="20" placeholder="사연 한 줄 (20자, 비워도 돼요)" autocomplete="off" enterkeyhint="send">
        <button id="rdReq" class="sup">💛 이 곡 신청하기</button>`
      : ticket ? `<button id="rdPick" class="sup">💛 신청곡 고르기 (응원 고마워요!)</button>`
      : `<button id="rdSup" class="sup">💛 응원하고 신청곡 틀기</button><small class="note">응원 폭죽을 쏘면 다음 곡으로 원하는 곡과 사연 한 줄을 모두에게 틀어 줄 수 있어요.</small>`}
      <small class="note">모든 곡은 밤 한강 돗자리가 직접 만든 곡이에요.</small>
      <button id="rdClose">닫기</button>`;
    $("rdPow").onclick = () => setOn(!cfg.on);
    $("rdVol").oninput = e => { cfg.vol = +e.target.value; applyVol(); save(); };
    $("rdClose").onclick = () => box.classList.remove("on");
    box.querySelectorAll("[data-sl]").forEach(b => b.onclick = () => { const mn = +b.dataset.sl; if (sleepAt && sleepMin === mn) { sleepAt = 0; opt.toast("⏱ 잠들기 예약을 취소했어요", 1800); } else { sleepAt = Date.now() + mn * 60e3; sleepMin = mn; opt.toast(`⏱ ${mn}분 뒤에 라디오가 천천히 꺼져요. 잘 자요 🌙`, 2600); } fill(); });
    if ($("rdSup")) $("rdSup").onclick = () => { box.classList.remove("on"); opt.openSup(); };
    if ($("rdPick")) $("rdPick").onclick = () => { pickI = (st.i + 1) % songs.length; fill(); };
    box.querySelectorAll(".pick button").forEach(b => b.onclick = () => { const m = $("rdMsg").value; pickI = +b.dataset.i; fill(); $("rdMsg").value = m; });
    if ($("rdReq")) $("rdReq").onclick = () => { opt.send({ t: "req", i: pickI, msg: $("rdMsg").value.replace(/\s+/g, " ").trim() }); };
    if ($("rdMsg")) $("rdMsg").onkeydown = e => { if (e.key === "Enter") $("rdReq").click(); };
  }
  function open() { $("rdBox").classList.add("on"); fill(); }
  function banner(html, ms) { const b = $("rdBanner"); b.innerHTML = html; b.classList.add("on"); clearTimeout(banner.t); banner.t = setTimeout(() => b.classList.remove("on"), ms || 7000); }

  // ---------- 서버 메시지 ----------
  H.onMsg = m => {
    if (m.t === "radio") {
      const prev = st; off = m.now - Date.now(); st = m; if (m.n != null) listeners = m.n;
      const changed = !prev || prev.i !== m.i || prev.at !== m.at;
      if (changed && prev && m.by) {
        const s = songs[m.i] || {};
        banner(`💛 ${esc(m.by)}님의 신청곡 「${esc(s.title || "")}」${m.msg ? `<small>“${esc(m.msg)}”</small>` : ""}${cfg.on ? "" : "<small>📻 눌러서 같이 듣기</small>"}`, 9000);
      } else if (changed && prev && cfg.on) opt.toast(`📻 지금 흐르는 곡: ${(songs[m.i] || {}).title || ""}`, 2600);
      if (m.req) opt.toast(m.req.id === opt.me() ? "💛 신청 완료! 곧 모두에게 흘러가요" : `💛 ${m.req.by}님이 「${(songs[m.req.i] || {}).title || ""}」을 신청했어요`, 3200);
      sync();
    } else if (m.t === "radioN") { listeners = m.n; render(); }
    else if (m.t === "reqOk") { ticket = true; pickI = st ? (st.i + 1) % songs.length : 0; setTimeout(open, 1600); }
    else if (m.t === "reqDone") { ticket = false; pickI = null; if (!cfg.on) setOn(true); fill(); }
    else if (m.t === "reqBad") opt.toast(m.why === "full" ? "신청곡이 꽉 찼어요. 조금 뒤에 다시 해 주세요" : m.why === "bad" ? "사연에 쓸 수 없는 말이 있어요" : "신청곡은 응원 폭죽을 쏜 뒤에 고를 수 있어요 💛", 2800);
  };
  // opt: { send(msg), toast(text, ms), openSup(), me(), chipTop, bannerTop }
  H.start = o => {
    opt = o; build();
    fetch("/radio.json").then(r => r.json()).then(list => {
      songs = list; render(); sync();
      if (cfg.on) opt.send({ t: "radio", on: true });
      else setTimeout(() => { const c = $("rdChip"); if (c && !cfg.on) c.classList.add("pulse"); }, 6000);   // 처음엔 살짝 반짝여서 눈에 띄게
    }).catch(() => {});
    setInterval(() => {   // ⏱ 잠들기 예약
      if (!sleepAt || !cfg.on) return;
      const left = sleepAt - Date.now(), t = $("rdSleep");
      if (t) t.textContent = left > 0 ? `${Math.ceil(left / 60e3)}분 뒤 꺼져요` : "";
      if (left <= 0 && left > -20e3 && el) { const k = 1 + left / 20e3; if (gain) gain.gain.value = vol() * k; else el.volume = Math.min(1, vol() * k); }
      else if (left <= -20e3) { sleepAt = 0; setOn(false); applyVol(); render(); }
    }, 1000);
    setInterval(() => {   // 열려 있으면 진행 막대만 1초마다 (슬라이더·입력은 건드리지 않는다)
      const box = $("rdBox"); if (!box || !box.classList.contains("on") || !st) return;
      const s = songs[st.i] || {}, pos = Math.max(0, Math.min(s.len || 0, (now() - st.at) / 1000)), mm = x => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}`;
      const i = box.querySelector(".bar i"); if (i) i.style.width = (s.len ? pos / s.len * 100 : 0) + "%";
      const t = $("rdTime"); if (t) t.textContent = `${s.inst || ""} · ${mm(pos)} / ${mm(s.len || 0)}`;
    }, 1000);
    // 폰 잠금 해제·탭 복귀 때 다시 맞추기
    document.addEventListener("visibilitychange", () => { if (!document.hidden) sync(); });
  };
  H.open = () => open();
  H.reconnected = () => { if (cfg.on) opt.send({ t: "radio", on: true }); };
  H.isOn = () => cfg.on;
  H.duck = on => { H.ducked = !!on; if (on && el) el.pause(); else sync(); };
  H.state = () => ({ t: el ? el.currentTime : null, paused: el ? el.paused : null, src: el ? el.src : null, pos: st ? (now() - st.at) / 1000 : null });
})();
