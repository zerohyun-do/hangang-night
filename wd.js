// 🧩 오늘의 한강 단어(01·02 공통, 103차) — ☰ 놀이에서 누를 때만 불러온다(첫 접속 용량 0).
// 하루 한 단어(한국 시간 자정에 바뀜), 6번 안에 맞히기. 자모(ㄱ·ㅏ…)마다 🟩 자리까지 맞음 · 🟨 들어 있음 · ⬜ 없음.
// 입력은 폰 기본 한글 자판 그대로. 사전은 없다(자모 개수만 맞으면 받음). 기록은 이 폰 localStorage(hn-wd)만.
// 서버에는 숫자만: wdQ(오늘 맞힌 사람 수 묻기) · wd(끝남, 맞힘 여부·몇 번째) → 통계 wd·wdw.
(() => {
  const H = window.HNWord2 = {}; let opt = {}, box = null, S = null, msg = "", solvers = null;
  const F = `system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`, TRIES = 6;
  // 정답 목록(순서 고정, 하루 하나). 겹자음 받침·겹모음은 둘로 나눠 센다(ㅘ=ㅗ+ㅏ, ㄳ=ㄱ+ㅅ)
  const ANS = ("한강 노을 별빛 야경 분수 낚시 달빛 돗자리 강바람 유람선 라면 치킨 산책 자전거 은하수 불꽃 새벽 " +
    "물결 다리 가로등 풍선 버스킹 강아지 고양이 김밥 떡볶이 소원 엽서 우체통 남산 등대 모래 잔디 " +
    "구름 하늘 이슬 바다 여의도 반포 뚝섬 망원 철새 오리 갈대 억새 단풍 첫눈 겨울 담요 핫초코 " +
    "호떡 붕어빵 목도리 장갑 손난로 트리 산타 눈사람 성탄 연말 새해 달력 일기 추억 친구 " +
    "응원 박수 미소 위로 휴식 잠옷 베개 이불 자장가 라디오 노래 기타 하모니카 야식 컵라면 바람 파도").split(" ");
  const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ", JUNG = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅗㅏ","ㅗㅐ","ㅗㅣ","ㅛ","ㅜ","ㅜㅓ","ㅜㅔ","ㅜㅣ","ㅠ","ㅡ","ㅡㅣ","ㅣ"],
    JONG = ["","ㄱ","ㄲ","ㄱㅅ","ㄴ","ㄴㅈ","ㄴㅎ","ㄷ","ㄹ","ㄹㄱ","ㄹㅁ","ㄹㅂ","ㄹㅅ","ㄹㅌ","ㄹㅍ","ㄹㅎ","ㅁ","ㅂ","ㅂㅅ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
  const jamo = w => { const o = []; for (const c of w) { const k = c.charCodeAt(0) - 0xAC00; if (k < 0 || k > 11171) return null; o.push(CHO[Math.floor(k / 588)], ...JUNG[Math.floor(k % 588 / 28)], ...JONG[k % 28]); } return o; };
  const kst = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
  const DAY0 = Date.UTC(2026, 10, 23);   // 1회 = 2026-11-23
  const no = () => Math.floor((Date.parse(kst() + "T00:00:00Z") - DAY0) / 864e5) + 1;
  const pick = n => { const L = ANS.length, i = ((n - 1) % L + L) % L; return ANS[(i * 37 + 11) % L]; };   // 37은 목록 길이와 서로소 → 하루마다 섞인 순서로 한 바퀴
  const ls = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };
  function load() {
    const d = kst(), s = ls("hn-wd") || {}; S = { d, g: [], done: 0, st: s.st || 0, last: s.last || "", win: s.win || 0, play: s.play || 0, dist: s.dist || [0, 0, 0, 0, 0, 0] };
    if (s.d === d) { S.g = s.g || []; S.done = s.done || 0; }
  }
  const save = () => ls("hn-wd", S);
  function score(g, a) {   // 워들 규칙(같은 자모가 여러 개일 때도 개수만큼만 노랑)
    const r = g.map(() => 0), left = {};
    a.forEach((x, i) => { if (g[i] === x) r[i] = 2; else left[x] = (left[x] || 0) + 1; });
    g.forEach((x, i) => { if (r[i] !== 2 && left[x]) { r[i] = 1; left[x]--; } });
    return r;
  }
  const css = `#wdBox{position:fixed;inset:0;z-index:96;display:none;align-items:center;justify-content:center;background:rgba(4,8,20,.66);font-family:${F}}
#wdBox.on{display:flex}#wdBox .card{width:min(92vw,380px);max-height:92vh;overflow:auto;background:linear-gradient(180deg,#14203f,#0c1430);color:#eef2ff;border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:16px 16px 14px;box-shadow:0 10px 40px rgba(0,0,0,.5)}
#wdBox h3{margin:0 0 4px;font-size:18px}#wdBox .sub{margin:2px 0 8px;font-size:12.5px;color:#aab6dd;line-height:1.5}
#wdBox .rowg{display:flex;align-items:center;gap:4px;margin:4px 0}#wdBox .cell{flex:1;min-width:0;aspect-ratio:1;max-width:44px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:700;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)}
#wdBox .c2{background:#3aa863;border-color:#3aa863}#wdBox .c1{background:#c9a227;border-color:#c9a227}#wdBox .c0{background:#3b4363;border-color:#3b4363;color:#c3c8dc}
#wdBox .w{width:58px;font-size:12px;color:#aab6dd;text-align:right;white-space:nowrap;overflow:hidden}
#wdBox .in{display:flex;gap:6px;margin:10px 0 4px}#wdBox input{flex:1;min-width:0;font:16px ${F};padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;outline:none}
#wdBox button{font:14px ${F};padding:10px 14px;border-radius:10px;border:0;background:rgba(255,255,255,.12);color:#fff;cursor:pointer}#wdBox button.go{background:#ffd34d;color:#2a2200;font-weight:700}
#wdBox .kb{display:flex;flex-wrap:wrap;gap:3px;margin:8px 0 2px}#wdBox .kb span{min-width:22px;padding:3px 0;text-align:center;border-radius:5px;font-size:13px;background:rgba(255,255,255,.08)}
#wdBox .kb .c2,#wdBox .kb .c1,#wdBox .kb .c0{color:#fff}#wdBox .msg{min-height:18px;font-size:13px;color:#ffd34d;margin:2px 0}
#wdBox .row{display:flex;gap:8px;justify-content:flex-end;margin-top:10px;flex-wrap:wrap}#wdBox .dist div{display:flex;align-items:center;gap:6px;font-size:12px;margin:2px 0}#wdBox .dist b{display:block;height:14px;background:#3aa863;border-radius:3px;min-width:4px}`;
  const KEYS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎㅏㅐㅑㅒㅓㅔㅕㅖㅗㅛㅜㅠㅡㅣ".split("");
  function grid(a) {
    let h = ""; const N = a.length;
    for (let r = 0; r < TRIES; r++) {
      const w = S.g[r], j = w ? jamo(w) : null, sc = j ? score(j, a) : null;
      h += `<div class="rowg">${Array.from({ length: N }, (_, i) => `<div class="cell${sc ? " c" + sc[i] : ""}">${j ? j[i] : ""}</div>`).join("")}<div class="w">${w || ""}</div></div>`;
    }
    return h;
  }
  function keyState(a) {
    const best = {}; for (const w of S.g) { const j = jamo(w), sc = score(j, a); j.forEach((x, i) => { best[x] = Math.max(best[x] ?? -1, sc[i]); }); }
    return `<div class="kb">${KEYS.map(k => `<span class="${best[k] != null ? "c" + best[k] : ""}">${k}</span>`).join("")}</div>`;
  }
  function shareText(a) {
    const n = no(), won = S.g[S.g.length - 1] === pick(n);
    const rows = S.g.map(w => score(jamo(w), a).map(x => ["⬜", "🟨", "🟩"][x]).join("")).join("\n");
    return `🧩 오늘의 한강 단어 ${n}회 ${won ? S.g.length : "X"}/${TRIES}\n${rows}\n밤 한강 돗자리에서 같이 풀어요 👉 ${location.origin}/?from=wd&wd=1`;
  }
  function render() {
    const n = no(), ans = pick(n), a = jamo(ans), won = S.g[S.g.length - 1] === ans;
    let h = `<h3>🧩 오늘의 한강 단어 <span style="font-size:13px;color:#aab6dd">${n}회</span></h3>` +
      `<p class="sub">자모 <b>${a.length}개</b>로 된 단어를 ${TRIES}번 안에 맞혀요 · 🟩 자리까지 맞음 🟨 들어 있음 ⬜ 없음<br>겹모음·겹받침은 둘로 세요(ㅘ=ㅗㅏ, ㄳ=ㄱㅅ) · 한강·밤 이야기에 나올 법한 단어</p>` + grid(a);
    if (!S.done) h += `<div class="msg">${msg}</div><form class="in"><input id="wdIn" maxlength="8" autocomplete="off" placeholder="단어 입력 (${S.g.length + 1}/${TRIES})" enterkeyhint="done"><button class="go" type="submit">확인</button></form>` + keyState(a);
    else {
      const mx = Math.max(1, ...S.dist);
      h += `<div class="msg">${won ? ["한 번에! 🎉", "대단해요 ✨", "잘했어요 🌙", "맞혔어요 🌟", "아슬아슬 😮", "휴, 마지막에 🫧"][S.g.length - 1] : `오늘의 단어는 「${ans}」였어요`}</div>` +
        `<p class="sub">${solvers != null ? `오늘 ${solvers}명이 맞혔어요 · ` : ""}연속 ${S.st}일 · 맞힌 날 ${S.win}/${S.play}<br>새 단어는 자정에 와요. 내일 또 와서 연속 기록 이어 가기!</p>` +
        `<div class="dist">${S.dist.map((v, i) => `<div>${i + 1}<b style="width:${v / mx * 70}%"></b>${v}</div>`).join("")}</div>`;
    }
    h += `<div class="row">${S.done ? `<button class="go" data-do="share">결과 공유하기</button>` : ""}<button data-do="close">닫기</button></div>`;
    box.innerHTML = `<div class="card">${h}</div>`;
    const f = box.querySelector("form"); if (f) { f.onsubmit = e => { e.preventDefault(); guess(box.querySelector("#wdIn").value); }; if (matchMedia("(pointer:fine)").matches) setTimeout(() => { const i = box.querySelector("#wdIn"); i && i.focus(); }, 30); }
  }
  function guess(raw) {
    const n = no(), ans = pick(n), a = jamo(ans), w = (raw || "").normalize("NFC").replace(/\s/g, ""), j = w && jamo(w);
    if (S.d !== kst()) { load(); msg = "자정이 지나 새 단어가 왔어요"; return render(); }
    if (!j) msg = "완성된 한글로 써 주세요"; else if (j.length !== a.length) msg = `자모 ${a.length}개여야 해요 (지금 ${j.length}개)`;
    else if (S.g.includes(w)) msg = "이미 써 본 단어예요";
    else {
      msg = ""; S.g.push(w);
      if (w === ans || S.g.length >= TRIES) {
        const ok = w === ans; S.done = 1; S.play++;
        if (ok) { S.win++; S.dist[S.g.length - 1]++; }
        const y = kst(Date.now() - 864e5); S.st = ok ? (S.last === y ? S.st + 1 : 1) : 0; if (ok) S.last = S.d;
        opt.send && opt.send({ t: "wd", ok: ok ? 1 : 0, n: S.g.length });
      }
      save();
    }
    render();
  }
  async function share() {
    const t = shareText(jamo(pick(no())));
    try { if (navigator.share) { await navigator.share({ text: t }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(t); opt.toast && opt.toast("결과를 복사했어요. 친구에게 붙여 넣어 보내요", 2200); }
    catch (e) { const m = box.querySelector(".msg"); if (m) m.innerHTML = `<textarea readonly style="width:100%;height:110px;font-size:12px">${t}</textarea>`; }
  }
  H.onMsg = m => { if (m.t === "wdS" && Number.isInteger(m.w)) H.solvers(m.w); };
  H.solvers = n => { solvers = n; if (box && box.classList.contains("on") && S.done) render(); };
  H.init = o => {
    opt = o || {}; load();
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    box = document.createElement("div"); box.id = "wdBox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "오늘의 한강 단어"); document.body.appendChild(box);
    box.onclick = e => { if (e.target === box) return H.close(); const d = e.target.closest("[data-do]"); if (!d) return; if (d.dataset.do === "close") H.close(); else if (d.dataset.do === "share") share(); };
  };
  H.open = () => { if (S.d !== kst()) load(); opt.closeOthers && opt.closeOthers(); msg = ""; box.classList.add("on"); render(); opt.send && opt.send({ t: "wdQ" }); };
  H.close = () => box.classList.remove("on");
  H.doneToday = () => { const s = ls("hn-wd"); return !!(s && s.d === kst() && s.done); };
  H._t = { jamo, pick, no, score, ANS };   // 테스트용
})();
