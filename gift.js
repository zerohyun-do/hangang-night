// 🎁 머문 시간 선물(01·02 공통): 이번 접속에서 1·3·5·10·20·30분, 그 뒤로 15분마다 한강 엽서 한 장. 60장 도감.
// 화면을 보고 있을 때만 시간이 간다(다른 탭이면 멈춤, 처음부터 다시 아님). 엽서는 이 폰에만(hn-gift). 서버엔 받을 때 {t:"gf"}만(통계 gf).
// 강제 팝업 없음: 왼쪽 위 작은 칩이 남은 시간을 보여 주고, 엽서가 오면 칩이 반짝 + 토스트. 눌러야 열린다.
(() => {
  const H = window.HNGift = {}; let opt = {}, S = null, box = null, chip = null, sec = 0, idx = 0, ready = [], last = 0;
  const F = `system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  const STEPS = [1, 3, 5, 10, 20, 30];   // 분. 그 뒤로는 15분마다
  const stepAt = i => (i < STEPS.length ? STEPS[i] : 30 + (i - STEPS.length + 1) * 15) * 60;
  const rareP = i => [0.04, 0.06, 0.08, 0.15, 0.3, 0.5][i] ?? 0.3;
  // [아이콘, 이름, 한 줄, 반짝(1)]
  const CARDS = [
    ["🌉", "반포대교 달빛무지개", "밤 8시, 다리 옆구리에서 물줄기가 춤춰요"], ["🌙", "여의도의 반달", "구름 사이로 반쯤 웃는 달"], ["🚲", "따릉이 한 바퀴", "강바람 맞으며 페달 열 번"], ["🍜", "편의점 라면", "강변에서 먹으면 두 배 맛있는 그 라면"],
    ["🐕", "산책 나온 강아지", "꼬리가 쉬지 않는 밤 산책"], ["🪁", "멈춘 연", "바람이 쉬는 사이 걸려 있는 연"], ["🎸", "버스킹 첫 소절", "모르는 노래인데 발이 박자를 타요"], ["🌊", "잔물결", "가로등 불빛이 물 위에서 흔들려요"],
    ["🦆", "밤 오리", "자는 척하며 떠다니는 오리 한 마리"], ["🍗", "치킨 한 마리", "돗자리 위 반반 무 많이"], ["🧺", "빈 돗자리", "누군가 곧 앉으러 올 자리"], ["🚇", "당산철교 지하철", "강 위를 지나는 불 켜진 창문들"],
    ["🌃", "63빌딩 금빛", "해가 져도 금색으로 남는 빌딩"], ["🏃", "밤 러너", "숨소리만 남기고 지나간 사람"], ["🍦", "녹은 아이스크림", "말하다 보니 손에 흘렀어요"], ["🎈", "날아간 풍선", "누군가의 소원을 싣고 위로"],
    ["⛲", "분수 물보라", "바람이 불면 얼굴까지 닿아요"], ["🌸", "벚꽃길 기억", "봄밤 윤중로에서 떨어진 꽃잎"], ["🍂", "가을 낙엽", "밟으면 바스락, 그 소리 하나"], ["❄️", "첫눈 강변", "아무도 안 밟은 하얀 산책로"],
    ["🛶", "카약 한 척", "노 젓는 소리가 조용히 멀어져요"], ["📻", "작은 라디오", "누군가 틀어 둔 옛날 노래"], ["🕯️", "랜턴 불빛", "돗자리 가운데 작은 동그라미"], ["🐈", "산책로 고양이", "벤치 밑에서 눈만 반짝"],
    ["🧃", "빨대 꽂은 주스", "친구랑 하나씩 나눠 든 밤"], ["🎆", "불꽃 하나", "펑, 하고 나면 모두 위를 봐요"], ["🌌", "은하수 흉내", "도시 불빛 사이 희미한 별 몇 개"], ["🚢", "유람선 불빛", "천천히 강을 미끄러지는 배"],
    ["🗼", "남산타워 빛", "오늘 미세먼지 색을 알려 주는 탑"], ["🛸", "드론쇼 한 장면", "점들이 모여 하트가 됐어요"], ["🎤", "모르는 사람의 노래", "박수 세 번, 그걸로 충분해요"], ["🍙", "삼각김밥", "포장 뜯기 성공한 날"],
    ["🌧️", "비 오는 다리 밑", "빗소리 들으며 기다리는 중"], ["🦢", "물 위의 새", "어디서 왔는지 모를 하얀 새"], ["🪑", "고마운 벤치", "다리 쉬어 가라고 늘 그 자리"], ["🔭", "망원경 동전", "100원 넣고 보는 1분짜리 서울"],
    ["🐟", "물고기 점프", "퐁, 물결만 남기고 사라졌어요"], ["🎒", "퇴근길 가방", "내려놓으니 어깨가 가벼워요"], ["☕", "식은 커피", "얘기하다 보니 다 식었네요"], ["🌬️", "강바람", "머리카락 정리 포기한 밤"],
    ["🍉", "여름밤 수박", "씨 멀리 뱉기 내기"], ["🎐", "풍경 소리", "바람이 지나간 걸 알려 줘요"], ["🛴", "킥보드 불빛", "초록 불이 스쳐 지나가요"], ["💬", "말 없는 대화", "옆에 앉아만 있어도 괜찮은 사이"],
    ["🌠", "별똥별", "소원 빌기 전에 지나갔어요", 1], ["🌕", "보름달 한강", "물 위에 달이 하나 더 떴어요", 1], ["🌈", "밤 무지개 분수", "일곱 색이 한꺼번에 쏟아져요", 1], ["🎇", "세계불꽃축제", "하늘이 꽃밭이 되는 하루", 1],
    ["🐋", "한강 고래(전설)", "아무도 믿어 주지 않는 그 그림자", 1], ["👑", "한강의 주인공", "오늘 밤 가장 오래 앉아 있던 사람", 1], ["💌", "강물에 띄운 편지", "언젠가 누가 읽어 줄 거예요", 1], ["🌅", "강변의 해돋이", "밤을 다 새우고 만난 첫 빛", 1],
    ["🦋", "밤 나비", "가로등 주위를 맴도는 한 마리", 1], ["🎑", "한가위 달맞이", "가장 크고 둥근 달에 소원 하나", 1], ["🪐", "토성 보이는 밤", "망원경 속 작은 고리", 1], ["🐉", "강 위의 용 구름", "잠깐 보였다 사라진 모양", 1],
    ["🔥", "모닥불 이야기", "불 앞에서는 다 솔직해져요", 1], ["🧚", "반딧불이 한 쌍", "도시에선 보기 힘든 작은 빛", 1], ["🕊️", "새벽 비둘기", "첫차보다 먼저 일어난 새", 1], ["💎", "반짝 돌멩이", "강변에서 주운 유난히 빛나는 돌", 1],
  ];
  const hue = i => (i * 47) % 360;
  const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  function load() { try { S = JSON.parse(localStorage.getItem("hn-gift") || "null"); } catch { S = null; } if (!S || typeof S !== "object") S = {}; S.got = Array.isArray(S.got) ? S.got.filter(n => Number.isInteger(n) && n >= 0 && n < CARDS.length) : []; S.total = S.total || 0; S.best = S.best || 0; }
  function save() { try { localStorage.setItem("hn-gift", JSON.stringify(S)); } catch {} }
  const css = `
  #gfChip { all: unset; position: fixed; left: 12px; top: calc(max(12px, env(safe-area-inset-top)) + var(--gfTop, 126px)); z-index: 6; cursor: pointer; padding: 5px 10px; border-radius: 999px; font: 700 12.5px/1.2 ${F}; color: #fff3d6; background: rgba(30,40,80,.82); border: 1px solid rgba(255,220,150,.45); white-space: nowrap; font-variant-numeric: tabular-nums; }
  #gfChip.hot { background: linear-gradient(135deg, #ffd27a, #ff9fb6); color: #2a1838; animation: gfPulse 1.2s ease-in-out infinite; }
  #gfChip.hide { display: none; }
  @keyframes gfPulse { 50% { transform: scale(1.08); box-shadow: 0 0 18px rgba(255,210,122,.8); } }
  #gfBox { position: fixed; inset: 0; z-index: 12; display: none; align-items: center; justify-content: center; background: rgba(4,6,20,.62); }
  #gfBox.on { display: flex; }
  #gfBox .in { width: min(350px, calc(100vw - 28px)); max-height: calc(100vh - 60px); max-height: calc(100dvh - 60px); display: flex; flex-direction: column; gap: 10px; padding: 16px 14px 12px; border-radius: 22px; background: #141a36; color: #eef1ff; border: 1px solid rgba(180,190,255,.3); box-shadow: 0 14px 44px rgba(0,0,0,.55); font: 14px/1.4 ${F}; text-align: center; box-sizing: border-box; }
  #gfBox .in > * { flex-shrink: 0; }
  #gfBox h3 { margin: 0; font-size: 16px; } #gfBox .sub { margin: 0; font-size: 12px; color: #aab3ea; }
  #gfBox .card { position: relative; margin: 2px auto; width: 230px; aspect-ratio: 3 / 2; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,.45); overflow: hidden; animation: gfIn .6s cubic-bezier(.2,1.4,.4,1); }
  #gfBox .card i { font-style: normal; font-size: 46px; line-height: 1; filter: drop-shadow(0 3px 6px rgba(0,0,0,.35)); } #gfBox .card b { font-size: 16px; text-shadow: 0 1px 3px rgba(0,0,0,.5); } #gfBox .card span { font-size: 12px; opacity: .92; padding: 0 12px; text-shadow: 0 1px 3px rgba(0,0,0,.5); }
  #gfBox .card em { position: absolute; top: 8px; right: 10px; font-style: normal; font-size: 11px; font-weight: 800; color: #2a1838; background: #ffe08a; padding: 2px 7px; border-radius: 999px; }
  #gfBox .card.rare::after { content: ""; position: absolute; inset: 0; background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.45) 45%, transparent 60%); background-size: 250% 100%; animation: gfShine 2.4s linear infinite; }
  @keyframes gfIn { from { transform: scale(.4) rotate(-8deg); opacity: 0; } } @keyframes gfShine { from { background-position: 120% 0; } to { background-position: -120% 0; } }
  #gfBox .grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; overflow: auto; flex-shrink: 1 !important; min-height: 120px; padding: 2px; }
  #gfBox .grid button { all: unset; cursor: pointer; aspect-ratio: 1; border-radius: 10px; display: grid; place-items: center; font-size: 21px; background: rgba(255,255,255,.06); }
  #gfBox .grid button.no { font-size: 13px; color: #59608a; cursor: default; } #gfBox .grid button.r { outline: 1.5px solid #ffe08a; }
  #gfBox .bar { height: 6px; border-radius: 6px; background: rgba(255,255,255,.1); overflow: hidden; } #gfBox .bar div { height: 100%; background: linear-gradient(90deg, #ffd27a, #ff9fb6); }
  #gfBox .row { display: flex; gap: 8px; } #gfBox .row button { all: unset; cursor: pointer; flex: 1; padding: 10px 0; border-radius: 13px; font: 700 14px ${F}; text-align: center; background: rgba(255,255,255,.1); color: #dfe3ff; }
  #gfBox .row button.go { background: linear-gradient(135deg, #ffd27a, #ff9fb6); color: #2a1838; }`;
  const fmt = s => (s = Math.floor(s), `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
  const cardHtml = (n, isNew) => { const c = CARDS[n], h = hue(n); return `<div class="card${c[3] ? " rare" : ""}" style="background:linear-gradient(150deg,hsl(${h} 55% 42%),hsl(${(h + 60) % 360} 60% 22%))">${c[3] ? "<em>✨ 반짝</em>" : isNew ? "<em>NEW</em>" : ""}<i>${c[0]}</i><b>${c[1]}</b><span>${c[2]}</span></div>`; };
  function show(html) { box.innerHTML = `<div class="in">${html}</div>`; box.classList.add("on"); opt.closeOthers && opt.closeOthers(); }
  function hide() { box.classList.remove("on"); }
  function nextLeft() { return Math.max(0, stepAt(idx) - sec); }
  function paint() {
    if (!chip) return; const hid = opt.hidden && opt.hidden(); chip.classList.toggle("hide", !!hid);
    if (ready.length) { chip.classList.add("hot"); chip.textContent = `🎁 엽서 ${ready.length > 1 ? ready.length + "장 " : ""}도착! 열어 보기`; return; }
    chip.classList.remove("hot"); chip.textContent = S.got.length >= CARDS.length ? `🎁 ${CARDS.length}장 다 모음` : `🎁 다음 엽서 ${fmt(nextLeft())}`;
  }
  function draw(i) {   // i번째 선물: 아직 없는 엽서 중에서, 오래 있을수록 반짝 확률 ↑
    const left = CARDS.map((c, n) => n).filter(n => !S.got.includes(n)); if (!left.length) return null;
    const rare = left.filter(n => CARDS[n][3]), nor = left.filter(n => !CARDS[n][3]);
    const pool = rare.length && (Math.random() < rareP(i) || !nor.length) ? rare : nor.length ? nor : rare;
    return pool[Math.random() * pool.length | 0];
  }
  function earn() {
    const i = idx++, n = draw(i), mins = Math.round(stepAt(i) / 60);
    if (n == null) { paint(); return; }
    S.got.push(n); S.total++; if (mins > S.best) S.best = mins; save(); ready.push({ n, mins });
    opt.send && opt.send({ t: "gf", n: S.got.length });
    opt.toast && opt.toast(`🎁 ${mins}분 선물! 한강 엽서가 왔어요 (왼쪽 위 눌러서 보기)`, 3500);
    paint();
  }
  function openNew() {
    const r = ready.shift(); if (!r) return album(); const c = CARDS[r.n], nx = Math.round(stepAt(idx) / 60);
    show(`<h3>🎁 ${r.mins}분 선물</h3>${cardHtml(r.n, true)}<p class="sub">${c[3] ? "✨ 반짝 엽서예요! 오래 머물수록 잘 나와요" : `${nx}분이 되면 다음 엽서${nx >= 20 ? " · 반짝 엽서 확률 ↑" : ""}`}</p>` +
      `<div class="row">${ready.length ? `<button class="go" data-do="next">다음 엽서 (${ready.length})</button>` : `<button class="go" data-do="album">엽서 도감 ${S.got.length}/${CARDS.length}</button>`}<button data-do="close">닫기</button></div>`);
    paint();
  }
  function album(sel) {
    const have = S.got.length, rareN = S.got.filter(n => CARDS[n][3]).length, s = sel != null && S.got.includes(sel) ? sel : S.got[S.got.length - 1];
    show(`<h3>🎁 한강 엽서 도감 ${have}/${CARDS.length}</h3><p class="sub">이번 접속 ${fmt(Math.floor(sec))} · 1·3·5·10·20·30분, 그 뒤로 15분마다 한 장 · ✨반짝 ${rareN}/${CARDS.filter(c => c[3]).length}</p>` +
      `<div class="bar"><div style="width:${have / CARDS.length * 100}%"></div></div>` + (s != null ? cardHtml(s) : `<p class="sub" style="padding:18px 0">아직 엽서가 없어요. 1분만 머물면 첫 엽서가 와요</p>`) +
      `<div class="grid">${CARDS.map((c, n) => S.got.includes(n) ? `<button data-n="${n}" class="${c[3] ? "r" : ""}" title="${c[1]}">${c[0]}</button>` : `<button class="no">?</button>`).join("")}</div>` +
      `<p class="sub">${have >= CARDS.length ? "🏆 다 모았어요! 한강 엽서 수집가" : `다음 엽서까지 ${fmt(nextLeft())} · 화면을 켜 둔 동안만 시간이 가요`}</p><div class="row"><button data-do="close">닫기</button></div>`);
  }
  function onClick(e) {
    if (e.target === box) return hide();
    const g = e.target.closest("[data-n]"); if (g) return album(+g.dataset.n);
    const d = e.target.closest("[data-do]"); if (!d) return; const k = d.dataset.do;
    if (k === "close") hide(); else if (k === "next") openNew(); else if (k === "album") album();
  }
  function tick() {
    const now = performance.now(), dt = Math.min(5, (now - last) / 1000); last = now;
    if (document.visibilityState === "visible" && (!opt.online || opt.online())) sec += dt;
    while (sec >= stepAt(idx) && S.got.length < CARDS.length) earn();
    paint();
  }
  H.init = o => {
    opt = o; load(); if (o.chipTop) document.documentElement.style.setProperty("--gfTop", o.chipTop + "px");
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    box = document.createElement("div"); box.id = "gfBox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "한강 엽서"); box.onclick = onClick; document.body.appendChild(box);
    chip = document.createElement("button"); chip.id = "gfChip"; chip.setAttribute("aria-label", "머문 시간 선물"); chip.onclick = () => ready.length ? openNew() : album(); document.body.appendChild(chip);
    last = performance.now(); paint(); setInterval(tick, 1000);
  };
  H.open = () => ready.length ? openNew() : album();
  H.count = () => (S ? S.got.length : 0) + "/" + CARDS.length;
  H.dbg = s => { sec = s; tick(); };   // 테스트: HNGift.dbg(59) → 1초 뒤 첫 엽서
})();
