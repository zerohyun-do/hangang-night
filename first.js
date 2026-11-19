// 🧭 101차 처음 1분(01·02 공통): 들어오면 바로 앉히고, 처음 온 사람에게 "해 볼 것 하나"씩 3단계로 안내
// ① 🎣 낚싯대 던지기(첫 입질은 빨리) → ② 🎆 내 이름 폭죽 → ③ 오늘 도장 + 내일 또 올 이유 + 👫 친구 부르기
// 저장은 이 폰 localStorage(hn-first)만. 서버에는 단계 숫자만 보냄(통계 fs)
(function () {
  const H = window.HNFirst = {}; let opt = {}, box = null, step = 0, sent = {}, fwT = 0;
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch {} return null; };
  const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  let days = []; try { days = JSON.parse(ls("hn-visit") || "{}").days || []; } catch {}
  // 처음 온 사람: 코치를 끝낸 적 없고, 오늘 말고 다른 날 온 기록이 없음
  const NEW = !ls("hn-first") && !days.some(d => d !== kst());
  H.isNew = () => NEW && !ls("hn-first");
  H.fast = () => step === 1 || step === 1.5;   // 코치 1단계 동안은 첫 입질을 빨리
  const css = `
  #hnFirst { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(max(14px, env(safe-area-inset-bottom)) + 84px); z-index: 9; width: min(360px, calc(100vw - 32px)); box-sizing: border-box; padding: 12px 14px 6px; border-radius: 18px; background: rgba(16,20,46,.95); border: 1px solid rgba(255,222,160,.35); color: #f3e9d7; font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; box-shadow: 0 12px 34px rgba(0,0,0,.45); animation: hnFirstIn .35s ease-out; }
  @keyframes hnFirstIn { from { opacity: 0; transform: translate(-50%, 14px); } to { opacity: 1; transform: translate(-50%, 0); } }
  #hnFirst small.k { display: block; font-size: 11.5px; color: #c9b993; letter-spacing: .02em; }
  #hnFirst b.t { display: block; margin: 2px 0 3px; font-size: 15.5px; line-height: 1.35; color: #fff4dc; }
  #hnFirst p { margin: 0 0 8px; font-size: 13px; line-height: 1.5; color: #d9d1e6; }
  #hnFirst ul { margin: 0 0 10px; padding: 0; list-style: none; font-size: 13.5px; line-height: 1.7; color: #efe6d4; }
  #hnFirst button { all: unset; box-sizing: border-box; cursor: pointer; display: block; width: 100%; text-align: center; padding: 10px; border-radius: 13px; background: linear-gradient(90deg, #ffd99a, #ffb3a0); color: #2a1d10; font-weight: 800; font-size: 15px; }
  #hnFirst button.s { margin-top: 7px; padding: 10px; background: rgba(255,255,255,.1); color: #f3e9d7; font-weight: 700; font-size: 14px; }
  #hnFirst i.x { display: block; text-align: center; margin-top: 2px; padding: 6px; font-style: normal; font-size: 12.5px; color: #a79fbd; cursor: pointer; }
  #hnFirst .dots { float: right; font-size: 11px; color: #8f87a8; letter-spacing: 2px; }
  #hnFirst .wait { display: flex; gap: 8px; align-items: center; padding: 10px 12px; border-radius: 12px; background: rgba(255,255,255,.07); font-size: 13.5px; }
  #hnFirst .wait span { animation: hnFirstBob 1.2s ease-in-out infinite; display: inline-block; }
  @keyframes hnFirstBob { 50% { transform: translateY(4px); } }
  #hnFirst.mini { top: calc(max(12px, env(safe-area-inset-top)) + 96px); bottom: auto; padding: 8px 12px 2px; }
  #hnFirst.mini b.t { font-size: 14px; } #hnFirst.mini .wait { padding: 6px 10px; font-size: 13px; }
  @media (orientation: landscape) and (max-height: 520px) { #hnFirst { bottom: 70px; padding: 10px 14px 6px; } #hnFirst p, #hnFirst ul { margin-bottom: 6px; } }`;
  function mount() {
    if (box) return box;
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    box = document.createElement("div"); box.id = "hnFirst"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "처음 왔다면");
    document.body.appendChild(box); return box;
  }
  const say = k => { if (sent[k]) return; sent[k] = 1; opt.send && opt.send({ t: "fs", k }); };
  const dots = n => `<span class="dots">${[1, 2, 3].map(i => i <= n ? "●" : "○").join("")}</span>`;
  function finish(open) {
    ls("hn-first", "1"); step = 9; clearTimeout(fwT);
    if (box) { box.remove(); box = null; }
    if (open && window.HNMission && HNMission.open) setTimeout(() => { if (!document.querySelector("#msBox.on")) HNMission.open(); }, 1200);
  }
  function render() {
    const b = mount(); b.classList.toggle("mini", step === 1.5); const skip = `<i class="x">괜찮아요, 혼자 둘러볼게요</i>`;
    if (step === 1) b.innerHTML = `${dots(1)}<small class="k">처음 왔다면 이것부터</small><b class="t">🎣 한강에 낚싯대 던져 볼까요?</b><p>찌가 쏙 들어가면 <b>❗ 챔질</b>을 눌러요. 물고기 ${opt.dexN || 20}종 도감이 있어요.</p><button class="go">🎣 낚싯대 던지기</button>${skip}`;
    else if (step === 1.5) b.innerHTML = `${dots(1)}<small class="k">처음 왔다면 이것부터</small><b class="t">찌를 보고 있어요…</b><div class="wait"><span>🎣</span>아래에 <b>❗ 챔질!</b>이 뜨면 바로 눌러요</div>${skip}`;
    else if (step === 2) b.innerHTML = `${dots(2)}<small class="k">첫 물고기 축하해요!</small><b class="t">🎆 이번엔 내 이름 폭죽</b><p>쏘면 지금 접속한 모두의 하늘에 <b>${esc(opt.nick ? opt.nick() : "")}</b> 이름이 떠요.</p><button class="go">🎆 폭죽 쏘기</button>${skip}`;
    else if (step === 2.5) b.innerHTML = `${dots(2)}<small class="k">거의 다 왔어요</small><b class="t">🎆 하늘을 눌러 쏘세요</b><div class="wait"><span>👆</span>밤하늘 아무 곳이나 톡</div>${skip}`;
    else if (step === 3) {
      const app = window.HNApp && HNApp.open && matchMedia("(pointer: coarse)").matches && !matchMedia("(display-mode: standalone)").matches;
      b.innerHTML = `${dots(3)}<small class="k">오늘 밤 첫 도장 쾅! 📒</small><b class="t">🌙 내일 밤 또 오면</b><ul><li>✅ 새 <b>오늘 밤 할 일</b> 3개 (매일 바뀌어요)</li><li>🏆 <b>오늘의 대어</b> 순위가 자정에 새로 시작</li><li>🔥 <b>3일 연속</b>이면 불꽃 배지가 내 옆에</li></ul><button class="go">👫 친구를 내 옆자리로 부르기</button>${app ? `<button class="s ap">📱 홈 화면에 추가 (다음엔 바로)</button>` : ""}<button class="s ok">좋아요, 오늘 할 일 보기</button>`;
    }
    const go = b.querySelector(".go"), x = b.querySelector(".x"), ok = b.querySelector(".ok"), ap = b.querySelector(".ap");
    if (x) x.onclick = () => finish(true);
    if (ok) ok.onclick = () => { say(4); finish(true); };
    if (ap) ap.onclick = () => { say(4); finish(false); HNApp.open(); };
    if (go && step === 1) go.onclick = () => { step = 1.5; render(); opt.fish && opt.fish(); };
    if (go && step === 2) go.onclick = () => { const aim = opt.fw && opt.fw(); if (aim) { step = 2.5; render(); clearTimeout(fwT); fwT = setTimeout(() => H.step("fw"), 20000); } };
    if (go && step === 3) go.onclick = () => { say(5); say(4); opt.invite && opt.invite(); finish(false); };
  }
  const esc = v => String(v).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c]);
  // 페이지가 부름: 앉았을 때(seated) · 내가 물고기를 낚았을 때(fish) · 내 폭죽이 떴을 때(fw)
  H.step = what => {
    if (what === "seated" && step === 0 && H.isNew()) { step = -1; setTimeout(() => { if (step !== -1) return; step = 1; say(1); render(); }, 2200); }
    else if (what === "fish" && (step === 1 || step === 1.5)) { say(2); step = 0.5; setTimeout(() => { step = 2; render(); }, 2600); }
    else if (what === "fw" && (step === 2 || step === 2.5)) { say(3); clearTimeout(fwT); step = 2.9; setTimeout(() => { step = 3; render(); }, 2200); }
  };
  H.init = o => { opt = o || {}; };
})();
