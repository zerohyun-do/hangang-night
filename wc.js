// 🔤 끝말잇기(01·02 공통, 102차) — ☰ 놀이에서 누를 때만 불러온다(첫 접속 용량 0).
// 👥 다같이: 방 사람들이 한 줄을 이어 간다(서버가 첫 글자·중복·욕설 확인, 메모리에만). 🐶 한강이랑: 폰 안에서, 한강이가 못 이으면 내가 이김.
// 사전은 없다(한글 2~6자면 받음). 두음법칙(력→역, 녀→여, 라→나 …) 허용.
(() => {
  const H = window.HNWord = {}; let opt = {}, box = null, mode = "all", ch = [], total = 0, bot = null;
  const F = `system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  const WORDS = ("기차 차표 표정 정원 원숭이 이야기 기린 린스 스키 키위 위로 로봇 봇짐 짐꾼 꾼 사과 과자 자전거 거울 울타리 리본 본드 드럼 럼 바다 다리 리듬 듬뿍 " +
    "나무 무지개 개나리 리더 더위 위성 성탄 탄산 산책 책상 상자 자석 석양 양말 말벌 벌꿀 꿀벌 벌레 레몬 몬스터 터널 널빤지 지구 구름 름 " +
    "하늘 늘보 보물 물결 결혼 혼자 자두 두부 부채 채소 소풍 풍선 선물 물고기 기억 억새 새벽 벽돌 돌다리 리어카 카메라 라면 면도 도시 시계 계단 단풍 풍경 경찰 찰떡 떡볶이 " +
    "이불 불꽃 꽃게 게임 임금 금붕어 어부 부엉이 이름 음악 악어 어린이 이마 마음 음료 요리 이사 사자 자장가 가방 방석 석류 유리 이웃 웃음 " +
    "강물 물감 감자 자유 유람선 선풍기 기타 타조 조개 개구리 리모컨 컨테이너 너구리 구두 두더지 지하철 철새 새우 우산 산호 호수 수박 박수 수건 건물 물병 병원 원두 두꺼비 비누 누나 나비 비행기 " +
    "가로등 등대 대나무 무릎 김밥 밥상 상추 추억 억지 지렁이 이빨 빨래 래퍼 퍼즐 즐거움 움집 집게 게시판 판다 다람쥐 쥐포 포도 도토리 리무진 진주 주머니 니트 트럭 럭비 비둘기 기러기 " +
    "달빛 빛깔 깔때기 별빛 밤하늘 이슬 슬리퍼 퍼레이드 드라마 마술 술래 안경 경주 주스 스웨터 터미널 널뛰기 기적 적금 금요일 일기 기분 분수 수영 영화 화분 분필 필통 통조림 " +
    "인형 형광등 등산 산타 타자기 기와 와플 플루트 트리 리코더 더하기 기침 침대 대문 문어 어묵 묵찌빠 코끼리 리폼 폼 도넛 넛 공원 원피스 스케치북 북극곰 곰인형 형제 제비 비빔밥 " +
    "장미 미소 소나무 무대 대화 화가 가위 위치 치킨 킨 노을 을지로 로켓 켓 다슬기 기념품 품절 절벽 벽화 화요일 일요일 일출 출발 발레 레고 고래 래프팅 벨소리 리플 플라밍고 고구마 마늘 늘보 " +
    "아침 침묵 묵상 상어 어항 항구 구슬 슬픔 픔 우유 유자 자정 정류장 장갑 갑옷 옷걸이 이끼 끼니 니모 모래 빗자루 루비 비밀 밀가루 루돌프 프로 로또 아이스크림 림보 보름달 달걀 걀 " +
    "고양이 이삭 삭발 발자국 국수 수첩 첩보 보리 리그 그네 네잎클로버 버스 스타 타워 워터 터전 전등 등불 불빛 빛 하모니카 카레 레슬링 링 오리 리액션 션 연필 필름 름 " +
    "여행 행복 복숭아 아기 기쁨 쁨 요정 정자 자몽 몽돌 돌고래 래디시 시소 소라 라디오 오징어 어깨 깨소금 금메달 달팽이 이정표 표범 범고래 유령 영웅 웅덩이 이층 층계 계란 란 " +
    "냇물 물레방아 아빠 녹차 차고 고드름 름 낙엽 엽서 서랍 랍스터 터키 키보드 드라이브 브로치 치약 약국 국자 자갈 갈매기 기둥 둥지 지붕 붕어빵 빵집 집중 중력 역사 사랑 부메랑 랑 " +
    "노래 래커 커피 피아노 노트 트램펄린 린넨 넨 뉴스 스펀지 지우개 개미 미역 역도 도마 마차 차례 예술 술잔 잔디 디저트 트로피 피자 자물쇠 쇠고기 기름 름 어머니 니은 은하수 수달 달력 역무원 원반 반지 지도 도깨비 비옷 옷장 장난감 감기 기차역 " +
    "로션 션 이층버스 진달래 래 례 료 녀석 석탄 탄광 광장 장마 마라톤 톤 랭킹 킹 냉면 면봉 봉투 투수 수리 리스 스님 님 녹음 음표 표지판 판소리 리본띠 띠 닭강정 정글 글자 자막 막대 대추 추위 위인 인사 사탕 탕수육 육지 지하 하마 마스크 크레파스 스파게티 티셔츠 츠 " +
    "역 여름 름 영어 어른 른 육교 교실 실내화 화살 살구 구급차 차돌 돌멩이 야구 구멍 멍게 게 율무 무궁화 화장실 실 이별 별 일").split(" ").filter(w => w.length >= 2);
  const SET = [...new Set(WORDS)];
  const HAN = /^[가-힣]{2,6}$/;
  function alts(c) {   // 두음법칙: 끝 글자로 시작할 수 있는 글자들
    const k = c.charCodeAt(0) - 0xac00; if (k < 0 || k > 11171) return [c];
    const ini = k / 588 | 0, med = (k % 588) / 28 | 0, fin = k % 28, mk = i => String.fromCharCode(0xac00 + i * 588 + med * 28 + fin), Y = [2, 6, 12, 17, 20, 7];   // ㅑㅕㅛㅠㅣㅖ
    if (ini === 5) return [c, Y.includes(med) ? mk(11) : mk(2)];   // ㄹ → ㅇ / ㄴ
    if (ini === 2 && Y.includes(med)) return [c, mk(11)];   // ㄴ → ㅇ
    return [c];
  }
  const fits = (prev, w) => !prev || alts(prev.slice(-1)).includes(w[0]);
  const css = `
  #wcBox { position: fixed; inset: 0; z-index: 13; display: none; align-items: center; justify-content: center; background: rgba(4,6,20,.55); }
  #wcBox.on { display: flex; }
  #wcBox .in { width: min(340px, calc(100vw - 28px)); display: flex; flex-direction: column; gap: 9px; padding: 14px 14px 12px; border-radius: 22px; background: #141a36; color: #eef1ff; border: 1px solid rgba(180,190,255,.3); box-shadow: 0 14px 44px rgba(0,0,0,.55); font: 14px/1.4 ${F}; text-align: center; box-sizing: border-box; }
  #wcBox .in > * { flex-shrink: 0; }
  #wcBox h3 { margin: 0; font-size: 16px; } #wcBox .tabs { display: flex; gap: 6px; } #wcBox .tabs b { flex: 1; padding: 7px 0; border-radius: 999px; background: rgba(255,255,255,.08); font-size: 13px; cursor: pointer; } #wcBox .tabs b.on { background: rgba(255,210,122,.9); color: #2a1838; }
  #wcBox .list { display: flex; flex-direction: column; gap: 4px; min-height: 150px; max-height: 210px; overflow: auto; text-align: left; padding: 6px 4px; border-radius: 14px; background: rgba(255,255,255,.04); }
  #wcBox .list div { padding: 4px 9px; border-radius: 10px; font-size: 13px; color: #c9cff5; } #wcBox .list div b { font-size: 16px; color: #fff3d6; margin-left: 4px; } #wcBox .list div.me b { color: #ffd27a; } #wcBox .list .e { color: #7f88b8; text-align: center; padding-top: 50px; }
  #wcBox .need { font-size: 13px; color: #ffd98a; min-height: 18px; } #wcBox .need big { font-size: 22px; font-weight: 800; color: #fff; }
  #wcBox form { display: flex; gap: 6px; margin: 0; } #wcBox input { flex: 1; min-width: 0; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(180,190,255,.35); background: rgba(255,255,255,.08); color: #fff; font: 600 16px ${F}; outline: none; }
  #wcBox button { all: unset; cursor: pointer; padding: 10px 14px; border-radius: 12px; font: 700 14px ${F}; text-align: center; background: linear-gradient(135deg, #ffd27a, #ff9fb6); color: #2a1838; }
  #wcBox .row { display: flex; gap: 8px; } #wcBox .row button { flex: 1; background: rgba(255,255,255,.1); color: #dfe3ff; } #wcBox .st { font-size: 12.5px; color: #aab3ea; min-height: 17px; }`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let status = "";
  function render(keepFocus) {
    const list = mode === "all" ? ch : bot ? bot.ch : [], last = list.length ? list[list.length - 1].w : "", myNick = opt.myNick && opt.myNick();
    const head = mode === "all" ? `👥 이 방 사람들이 이어 가요${total ? ` · 지금 ${total}개째` : ""}` : bot && bot.over ? (bot.win ? "🏆 한강이가 졌어요!" : "😣 내가 졌어요") : "🐶 한강이랑 번갈아 이어요";
    box.innerHTML = `<div class="in"><h3>🔤 끝말잇기</h3><div class="tabs"><b data-m="all" class="${mode === "all" ? "on" : ""}">👥 다같이</b><b data-m="bot" class="${mode === "bot" ? "on" : ""}">🐶 한강이랑</b></div><div class="st">${head}</div>` +
      `<div class="list">${list.length ? list.slice(-30).map(x => `<div class="${x.me || (mode === "all" && x.nick === myNick) ? "me" : ""}">${esc(x.nick)}<b>${esc(x.w)}</b></div>`).join("") : `<div class="e">${mode === "all" ? "첫 단어를 아무거나 넣어 보세요" : "내가 먼저! 아무 단어나 넣어요"}</div>`}</div>` +
      `<div class="need">${last ? `<big>${alts(last.slice(-1)).join(" · ")}</big> (으)로 시작하는 말` : "아무 단어로 시작"}</div>` +
      (mode === "bot" && bot && bot.over ? `<div class="row"><button data-do="again" style="background:linear-gradient(135deg,#ffd27a,#ff9fb6);color:#2a1838">한 판 더</button><button data-do="close">닫기</button></div>`
        : `<form><input maxlength="6" placeholder="한글 2~6자" autocomplete="off" enterkeyhint="send"><button>내기</button></form><div class="st">${esc(status)}</div><div class="row">${mode === "all" ? `<button data-do="new">새로 시작</button>` : `<button data-do="give">못 하겠어요</button>`}<button data-do="close">닫기</button></div>`) + `</div>`;
    const lb = box.querySelector(".list"); lb.scrollTop = lb.scrollHeight;
    const f = box.querySelector("form"); if (f) { f.onsubmit = e => { e.preventDefault(); play(f.querySelector("input").value.trim()); }; if (keepFocus) f.querySelector("input").focus(); }
  }
  function play(w) {
    const list = mode === "all" ? ch : bot.ch, last = list.length ? list[list.length - 1].w : "";
    if (!HAN.test(w)) { status = "한글 2~6자로 써 주세요"; return render(true); }
    if (!fits(last, w)) { status = `'${alts(last.slice(-1)).join("·")}'(으)로 시작해야 해요`; return render(true); }
    if (list.some(x => x.w === w)) { status = "이미 나온 말이에요"; return render(true); }
    status = "";
    if (mode === "all") { opt.send({ t: "wc", w }); status = "보내는 중…"; return render(true); }
    bot.ch.push({ nick: "나", w, me: 1 }); render();
    setTimeout(() => {
      if (!bot || bot.over) return; const used = new Set(bot.ch.map(x => x.w)), ok = SET.filter(x => !used.has(x) && fits(w, x));
      if (!ok.length) { bot.over = 1; bot.win = 1; opt.send({ t: "wcBot", win: 1 }); status = ""; return render(); }
      bot.ch.push({ nick: "🐶 한강이", w: ok[Math.random() * ok.length | 0] }); render(true);
    }, 600 + Math.random() * 700);
  }
  function onClick(e) {
    if (e.target === box) return close();
    const t = e.target.closest("[data-m]"); if (t) { mode = t.dataset.m; status = ""; if (mode === "bot" && !bot) bot = { ch: [] }; if (mode === "all") opt.send({ t: "wcQ" }); return render(true); }
    const d = e.target.closest("[data-do]"); if (!d) return; const k = d.dataset.do;
    if (k === "close") close();
    else if (k === "new") { opt.send({ t: "wcNew" }); }
    else if (k === "give") { bot.over = 1; bot.win = 0; opt.send({ t: "wcBot" }); render(); }
    else if (k === "again") { bot = { ch: [] }; status = ""; render(true); }
  }
  function close() { box.classList.remove("on"); }
  H.open = () => { box.classList.add("on"); opt.closeOthers && opt.closeOthers(); if (mode === "all") opt.send({ t: "wcQ" }); render(); };
  H.onMsg = m => {
    if (!m || typeof m.t !== "string" || m.t.slice(0, 2) !== "wc") return;
    if (m.t === "wcS") { ch = m.ch || []; total = m.n || 0; if (m.reset && box.classList.contains("on")) status = `${m.by || "누군가"}님이 새로 시작했어요`; }
    else if (m.t === "wcW") { ch.push({ nick: m.nick, w: m.w }); ch = ch.slice(-30); total = m.n; if (m.mine) status = ""; }
    else if (m.t === "wcBad") status = { wait: "조금만 천천히(4초에 한 번)", bad: "그 말은 쓸 수 없어요", dup: "이미 나온 말이에요", first: "앞 말의 끝 글자로 시작해야 해요", busy: "누가 방금 새로 시작했어요", form: "한글 2~6자로 써 주세요" }[m.why] || "다시 해 주세요";
    if (box.classList.contains("on") && mode === "all") { const inp = box.querySelector("input"), v = inp ? inp.value : "", foc = document.activeElement === inp; render(foc); const ni = box.querySelector("input"); if (ni) ni.value = m.t === "wcW" && m.mine ? "" : v; }
  };
  H.init = o => {
    opt = o; const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    box = document.createElement("div"); box.id = "wcBox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "끝말잇기"); box.onclick = onClick; document.body.appendChild(box);
  };
})();
