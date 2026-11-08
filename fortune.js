// 🍀 93차 오늘의 운세(01·02 공통, app.js가 누를 때 처음 한 번만 불러옴)
// 생년월일 → 띠(입춘 2월 4일 기준) + 별자리. 날짜·띠·별자리·항목으로 정해지는 값이라 하루 동안 같은 결과, 자정(한국 시각)에 바뀐다.
// 총운 + 재물·연애·건강·일/공부(★1~5) + 행운 색·숫자·시간·한강 장소·간식, 일요일엔 '이번 주 운세'.
// 생일은 이 폰에만(hn-fortune), 서버는 '오늘 본 사람 수'만(t:"ft" → ftN). 재미로 보는 운세임을 화면에 적는다.
(() => {
  const H = window.HNFortune = {}; let opt = {}, box = null, todayN = 0;
  const F = `system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
  const kstD = (ms = Date.now()) => new Date(ms + 9 * 3600e3);
  const kst = ms => kstD(ms).toISOString().slice(0, 10);
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return h >>> 0; };
  const pick = (arr, s) => arr[hash(s) % arr.length];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  const DDI = ["원숭이", "닭", "개", "돼지", "쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양"];   // 연도 % 12
  const DDI_E = { 쥐: "🐭", 소: "🐮", 호랑이: "🐯", 토끼: "🐰", 용: "🐲", 뱀: "🐍", 말: "🐴", 양: "🐑", 원숭이: "🐵", 닭: "🐔", 개: "🐶", 돼지: "🐷" };
  const SIGN = [["염소자리", "♑", 1, 19], ["물병자리", "♒", 2, 18], ["물고기자리", "♓", 3, 20], ["양자리", "♈", 4, 19], ["황소자리", "♉", 5, 20], ["쌍둥이자리", "♊", 6, 21], ["게자리", "♋", 7, 22], ["사자자리", "♌", 8, 22], ["처녀자리", "♍", 9, 22], ["천칭자리", "♎", 10, 23], ["전갈자리", "♏", 11, 22], ["사수자리", "♐", 12, 21]];
  const signOf = (m, d) => { const s = SIGN[m - 1]; return d <= s[3] ? s : SIGN[m % 12]; };
  const ddiOf = (y, m, d) => DDI[((m < 2 || (m === 2 && d < 4)) ? y - 1 : y) % 12];

  // 점수 분포: ★1 4% · ★2 14% · ★3 32% · ★4 32% · ★5 18%
  const score = s => { const r = hash(s) % 100; return r < 4 ? 1 : r < 18 ? 2 : r < 50 ? 3 : r < 82 ? 4 : 5; };
  const TOTAL = {
    5: ["오래 기다린 일이 오늘 풀리는 날이에요. 망설이던 연락, 지금 해 보세요.", "작은 행운이 연달아 오는 날. 오늘은 '왜 이렇게 잘 되지?' 싶을 거예요.", "마음먹은 일에 바람이 등을 밀어 주는 날이에요. 시작하기 딱 좋아요.", "주변 사람 덕을 크게 보는 날. 고맙다는 말 한마디가 더 큰 복이 돼요."],
    4: ["흐름이 좋은 날이에요. 무리하지 않아도 일이 제자리를 찾아가요.", "기분 좋은 소식이 하나 들어올 수 있어요. 메시지를 자주 확인해 보세요.", "평소 하던 대로만 해도 칭찬받는 날이에요.", "새로운 사람과 말이 잘 통하는 날. 먼저 인사해 보세요."],
    3: ["무난하고 편안한 하루예요. 큰일보다 작은 일을 끝내기 좋아요.", "좋은 일도 나쁜 일도 크지 않은 날. 내 속도대로 가면 돼요.", "오늘은 정리의 날이에요. 미뤄 둔 걸 하나만 끝내도 마음이 가벼워져요.", "기대를 조금 낮추면 만족이 커지는 날이에요."],
    2: ["말 한마디가 오해로 번지기 쉬운 날이에요. 중요한 대화는 한 번 더 생각하고요.", "조금 피곤한 하루가 될 수 있어요. 오늘 밤은 일찍 쉬어 가세요.", "계획이 살짝 어긋날 수 있어요. 플랜 B 하나만 준비해 두면 괜찮아요.", "서두르면 놓치는 날. 천천히 가는 게 오히려 빨라요."],
    1: ["오늘은 큰 결정을 하루 미루는 게 좋아요. 쉬는 것도 운을 지키는 방법이에요.", "마음이 무거운 날일 수 있어요. 한강 바람 쐬며 숨 한번 크게 쉬어요.", "작은 실수가 생기기 쉬워요. 물건·약속을 한 번 더 확인하세요.", "운이 잠깐 쉬어 가는 날. 내일은 분명 더 나아요."],
  };
  const CAT = {
    재물: { e: "💰", 5: ["뜻밖의 돈이 들어오거나 아끼던 게 생겨요.", "투자·저축 생각이 잘 맞는 날. 계획을 적어 두세요.", "받을 돈이 있다면 오늘 말해 보세요."], 4: ["작은 이득이 있어요. 할인·쿠폰을 놓치지 마세요.", "지갑이 크게 줄지 않는 날이에요.", "필요한 걸 좋은 값에 살 수 있어요."], 3: ["들어오는 만큼 나가는 날. 큰 지출만 피하면 무난해요.", "충동구매만 조심하면 괜찮아요.", "가계부 정리하기 좋은 날이에요."], 2: ["택배·배달비처럼 작은 돈이 새기 쉬워요.", "빌려주는 돈은 오늘은 미루세요.", "장바구니는 하루 묵혔다가 결제해요."], 1: ["오늘은 지갑을 닫아 두는 게 이득이에요.", "큰 결제는 내일로 미루세요.", "뭔가 사고 싶다면 그건 기분 탓이에요."] },
    연애: { e: "💗", 5: ["마음이 통하는 날이에요. 고백·연락 모두 좋아요.", "가까운 사람이 오늘 유난히 다정하게 느껴져요.", "새 인연이 생길 수 있는 날. 평소 안 가던 길로 가 보세요."], 4: ["대화가 잘 이어지는 날. 먼저 안부를 물어보세요.", "작은 배려가 크게 기억되는 날이에요.", "같이 웃을 일이 생겨요."], 3: ["잔잔한 하루. 특별하지 않아도 편안한 사이가 좋아요.", "혼자만의 시간도 연애운을 채워 줘요.", "오늘은 듣는 쪽이 되면 좋아요."], 2: ["사소한 말투에 서운함이 생기기 쉬워요.", "답장이 늦어도 너무 마음 쓰지 마세요.", "오늘은 밀당보다 솔직함이 나아요."], 1: ["감정이 앞서기 쉬운 날. 중요한 얘기는 내일 해요.", "오늘은 나를 먼저 챙기는 날이에요.", "지난 일은 지난 일로 두는 게 좋아요."] },
    건강: { e: "🌿", 5: ["몸이 가벼운 날! 산책·러닝 하기 딱 좋아요.", "잠이 잘 오고 개운하게 일어나는 날이에요.", "컨디션 최고. 미뤄 둔 운동을 시작해 보세요."], 4: ["물 한 잔 더 마시면 하루가 더 좋아져요.", "가벼운 스트레칭이 잘 맞는 날이에요.", "밥때를 잘 지키면 오후까지 든든해요."], 3: ["평범한 컨디션. 어깨·목을 한번 풀어 주세요.", "화면을 오래 봤다면 눈을 쉬게 해 주세요.", "오늘은 일찍 자는 게 최고의 보약이에요."], 2: ["피로가 쌓여 있어요. 커피보다 물을 드세요.", "찬 바람에 목 조심하세요.", "무리한 야식은 내일 몸이 기억해요."], 1: ["쉬어야 한다는 신호예요. 오늘은 푹 자요.", "몸이 보내는 작은 신호를 무시하지 마세요.", "무리한 일정은 줄이고 따뜻하게 지내요."] },
    "일·공부": { e: "📚", 5: ["집중이 잘 되는 날. 어려운 것부터 해치우세요.", "아이디어가 샘솟는 날이에요. 바로 메모하세요.", "칭찬이나 좋은 평가를 받을 수 있어요."], 4: ["손이 빨라지는 날. 할 일 목록을 시원하게 지워요.", "도움을 청하면 잘 받는 날이에요.", "꾸준히 해 온 게 빛을 보기 시작해요."], 3: ["평소만큼 하면 되는 날. 25분 집중 + 5분 쉬기가 잘 맞아요.", "큰 진도보다 복습이 좋은 날이에요.", "정리·계획 세우기에 좋아요."], 2: ["딴생각이 많아지는 날. 폰을 멀리 두세요.", "실수하기 쉬우니 제출 전 한 번 더 확인해요.", "오늘은 욕심을 줄이고 하나만 끝내요."], 1: ["능률이 안 오르면 과감히 쉬어도 돼요.", "중요한 발표·시험은 컨디션 관리가 먼저예요.", "오늘은 내일을 위한 준비만 해도 충분해요."] },
  };
  const COLOR = [["달빛 노랑", "#f5d38a"], ["한강 파랑", "#5a8de0"], ["벚꽃 분홍", "#f2a7c0"], ["숲 초록", "#6cc28a"], ["노을 주황", "#f39a5b"], ["라벤더 보라", "#b79cf0"], ["밤하늘 남색", "#3a4a9a"], ["구름 하양", "#eef0f6"], ["와인 빨강", "#c9505a"], ["모래 베이지", "#d9c3a0"]];
  const PLACE = ["여의도 한강공원 물빛광장", "반포 달빛무지개분수", "뚝섬 자벌레", "망원 한강공원 잔디밭", "잠실 한강공원 선착장", "이촌 한강공원 갈대밭", "난지 한강공원 캠핑장", "광나루 자전거공원", "양화 선유도 다리", "잠원 한강공원 산책길", "노들섬 잔디마당", "서래섬 유채꽃길"];
  const SNACK = [["🍜", "한강라면"], ["🍗", "치킨"], ["🍢", "떡볶이"], ["🍦", "아이스크림"], ["🍙", "삼각김밥"], ["🧋", "버블티"], ["🍊", "귤"], ["🌭", "핫도그"], ["🥤", "탄산음료"], ["☕", "따뜻한 커피"]];
  const TIME = ["아침 7~9시", "오전 10~12시", "점심 12~2시", "오후 3~5시", "저녁 6~8시", "밤 9~11시", "늦은 밤 11시~1시"];
  const DDI_TIP = ["먼저 웃어 주면 하루가 술술 풀려요.", "작은 약속을 지키는 게 큰 복을 불러요.", "오늘 만나는 사람 중 귀인이 있어요.", "잃어버린 물건을 찾을 수 있는 날이에요.", "익숙한 길 말고 새 길로 가 보세요.", "말보다 행동이 운을 열어요.", "오래된 친구에게 연락하면 좋은 소식이 와요.", "정리정돈이 운을 깨끗하게 해요.", "오늘은 양보가 이기는 날이에요.", "칭찬 한마디가 돌아서 나에게 와요.", "남의 말보다 내 마음을 믿어요.", "오늘 배운 작은 것이 나중에 크게 쓰여요."];
  const SIGN_TIP = ["직감이 잘 맞는 날이에요.", "느긋함이 오늘의 무기예요.", "호기심이 행운을 데려와요.", "따뜻한 말이 관계를 지켜요.", "자신감 있게 나서면 좋아요.", "꼼꼼함이 빛나는 날이에요.", "균형을 잡으면 다 잘 풀려요.", "깊이 생각한 만큼 얻어요.", "멀리 보는 눈이 필요한 날이에요.", "꾸준함이 결국 이겨요.", "남과 다른 생각이 정답이에요.", "상상력이 현실이 되는 날이에요."];
  const WEEK = ["이번 주는 '시작'의 주예요. 월요일에 계획 하나만 세워 두면 주말이 달라져요.", "이번 주는 사람 운이 좋아요. 약속을 피하지 마세요.", "이번 주는 돈 관리가 중요해요. 수요일 전후로 지출을 살펴보세요.", "이번 주는 몸을 챙기는 주예요. 잠을 30분만 늘려 보세요.", "이번 주는 기다리던 답이 오는 주예요. 조급해하지 않아도 돼요.", "이번 주는 정리의 주예요. 버릴 것을 버리면 새 것이 들어와요.", "이번 주는 배움의 주예요. 새로 시작한 건 끝까지 가요.", "이번 주는 작은 행운이 자주 오는 주예요. 감사 일기를 써 보세요."];
  const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

  const css = `
  #hnFt { position: fixed; inset: 0; z-index: 60; display: none; align-items: center; justify-content: center; background: rgba(4,6,18,.55); font-family: ${F}; }
  #hnFt.on { display: flex; }
  #hnFt .bx { width: min(380px, calc(100vw - 24px)); max-height: calc(100vh - 40px); max-height: calc(100dvh - 40px); overflow: auto; overscroll-behavior: contain; padding: 18px 16px 14px; border-radius: 22px; background: linear-gradient(180deg, rgba(26,22,58,.98), rgba(14,18,42,.98)); border: 1px solid rgba(255,255,255,.14); color: #f3e9d7; box-shadow: 0 14px 40px rgba(0,0,0,.5); }
  #hnFt h3 { margin: 0 0 4px; font-size: 19px; } #hnFt .sub { font-size: 12.5px; color: #b9b0cc; margin-bottom: 10px; }
  #hnFt .row { display: flex; gap: 6px; margin: 8px 0; } #hnFt select { flex: 1; min-width: 0; padding: 10px 6px; border-radius: 12px; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.08); color: #f3e9d7; font: 600 15px ${F}; }
  #hnFt select option { color: #111; }
  #hnFt .go { all: unset; box-sizing: border-box; width: 100%; cursor: pointer; display: block; text-align: center; margin-top: 10px; padding: 12px; border-radius: 14px; background: #f3d9a4; color: #2a1d10; font-weight: 800; font-size: 15px; }
  #hnFt .lnk { all: unset; cursor: pointer; display: inline-block; margin: 8px 6px 0 0; padding: 7px 11px; border-radius: 999px; background: rgba(255,255,255,.08); color: #efe6d4; font-size: 12.5px; font-weight: 700; }
  #hnFt .x { all: unset; cursor: pointer; display: block; text-align: center; margin-top: 8px; padding: 8px; color: #b9b0cc; font-size: 13px; }
  #hnFt .who { display: flex; gap: 8px; align-items: center; font-size: 14px; color: #e9e1d0; } #hnFt .who b { font-size: 26px; }
  #hnFt .card { margin-top: 10px; padding: 12px 12px; border-radius: 16px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08); }
  #hnFt .card h4 { margin: 0 0 4px; font-size: 14px; color: #f5d38a; display: flex; justify-content: space-between; }
  #hnFt .card p { margin: 0; font-size: 14px; line-height: 1.6; color: #efe6d4; }
  #hnFt .st { letter-spacing: 1px; color: #f5d38a; font-size: 13px; } #hnFt .st i { color: rgba(255,255,255,.2); font-style: normal; }
  #hnFt .lucky { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 10px; }
  #hnFt .lucky div { padding: 9px 10px; border-radius: 12px; background: rgba(255,255,255,.06); font-size: 12px; color: #b9b0cc; } #hnFt .lucky b { display: block; font-size: 14px; color: #f3e9d7; margin-top: 2px; }
  #hnFt .dot { display: inline-block; width: 11px; height: 11px; border-radius: 50%; vertical-align: -1px; margin-right: 4px; border: 1px solid rgba(255,255,255,.4); }
  #hnFt .gold { margin-top: 10px; padding: 10px 12px; border-radius: 14px; background: linear-gradient(90deg, rgba(245,200,76,.22), rgba(245,200,76,.08)); border: 1px solid rgba(245,200,76,.45); font-size: 13.5px; line-height: 1.55; }
  #hnFt .note { margin-top: 10px; font-size: 11.5px; color: #8f88a6; text-align: center; }`;

  const show = html => {
    if (!box) { const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st); box = document.createElement("div"); box.id = "hnFt"; box.onclick = e => { if (e.target === box) H.close(); }; document.body.appendChild(box); }
    box.innerHTML = `<div class="bx">${html}<button class="x">닫기</button></div>`; box.querySelector(".x").onclick = H.close; box.classList.add("on");
    const bx = box.querySelector(".bx"); bx.scrollTop = 0; return bx;
  };
  H.close = () => box && box.classList.remove("on");
  H.isOpen = () => !!box && box.classList.contains("on");

  const ask = () => {
    const now = kstD().getUTCFullYear(), b = (() => { try { return JSON.parse(ls("hn-fortune") || "null"); } catch { return null; } })() || { y: 2000, m: 1, d: 1 };
    const opts = (a, z, v, f = x => x) => { let s = ""; for (let i = a; i <= z; i++) s += `<option value="${i}"${i === v ? " selected" : ""}>${f(i)}</option>`; return s; };
    const bx = show(`<h3>🍀 오늘의 운세</h3><div class="sub">생일을 넣으면 띠·별자리로 매일 운세를 봐 드려요. 생일은 이 폰에만 저장돼요.</div>
      <div class="row"><select id="ftY">${opts(1940, now - 5, b.y, i => i + "년")}</select><select id="ftM">${opts(1, 12, b.m, i => i + "월")}</select><select id="ftD">${opts(1, 31, b.d, i => i + "일")}</select></div>
      <button class="go">오늘 운세 보기</button><div class="note">양력 기준 · 띠는 입춘(2월 4일) 기준이에요</div>`);
    bx.querySelector(".go").onclick = () => { const y = +bx.querySelector("#ftY").value, m = +bx.querySelector("#ftM").value, d = Math.min(+bx.querySelector("#ftD").value, new Date(Date.UTC(y, m, 0)).getUTCDate()); ls("hn-fortune", JSON.stringify({ y, m, d })); result(); };
  };

  const note = () => `재미로 보는 운세예요 · ${todayN > 1 ? "오늘 " + todayN + "명이 운세를 봤어요 · " : ""}자정에 새 운세`;
  const stars = n => `<span class="st">${"★".repeat(n)}<i>${"★".repeat(5 - n)}</i></span>`;
  const result = () => {
    let b; try { b = JSON.parse(ls("hn-fortune") || "null"); } catch {} if (!b) return ask();
    const day = kst(), dd = kstD(), dow = dd.getUTCDay(), ddi = ddiOf(b.y, b.m, b.d), sg = signOf(b.m, b.d), key = `${day}|${ddi}|${sg[0]}|${b.y % 7}`;
    const tot = score(key + "|t"), cats = Object.keys(CAT).map(k => [k, score(key + "|" + k)]);
    const col = pick(COLOR, key + "|c"), num = hash(key + "|n") % 9 + 1, snack = pick(SNACK, key + "|f");
    const sup = ls("hn-supday") === day;
    const mon = new Date(Date.UTC(dd.getUTCFullYear(), dd.getUTCMonth(), dd.getUTCDate() - ((dow + 6) % 7))).toISOString().slice(0, 10), wkey = `${mon}|${ddi}|${sg[0]}`;
    const best = DAYS[(hash(wkey + "|b") % 7)];
    if (ls("hn-ft-day") !== day) { ls("hn-ft-day", day); opt.send && opt.send({ t: "ft" }); }
    const bx = show(`<h3>🍀 오늘의 운세 <span style="font-size:12px;color:#b9b0cc;font-weight:600">${dd.getUTCMonth() + 1}월 ${dd.getUTCDate()}일 ${DAYS[dow]}요일</span></h3>
      <div class="who"><b>${DDI_E[ddi]}</b><span>${b.y}년생 <b style="font-size:14px">${ddi}띠</b> · ${sg[1]} ${sg[0]}</span></div>
      <div class="card"><h4><span>✨ 총운</span>${stars(tot)}</h4><p>${pick(TOTAL[tot], key + "|tt")}</p></div>
      ${cats.map(([k, s]) => `<div class="card"><h4><span>${CAT[k].e} ${k}</span>${stars(s)}</h4><p>${pick(CAT[k][s], key + "|" + k + "t")}</p></div>`).join("")}
      <div class="card"><h4><span>${DDI_E[ddi]} ${ddi}띠 한마디</span></h4><p>${pick(DDI_TIP, key + "|dt")}</p></div>
      <div class="card"><h4><span>${sg[1]} ${sg[0]} 한마디</span></h4><p>${pick(SIGN_TIP, key + "|st")}</p></div>
      <div class="lucky"><div>행운의 색<b><span class="dot" style="background:${col[1]}"></span>${col[0]}</b></div><div>행운의 숫자<b>${num}</b></div><div>행운의 시간<b>${pick(TIME, key + "|tm")}</b></div><div>행운의 간식<b>${snack[0]} ${snack[1]}</b></div><div style="grid-column:1/-1">행운의 한강 장소<b>📍 ${pick(PLACE, key + "|p")}</b></div></div>
      ${dow === 0 || dow === 1 ? `<div class="card"><h4><span>🗓 이번 주 운세</span></h4><p>${pick(WEEK, wkey)}<br>이번 주 가장 좋은 날: <b style="color:#f5d38a">${best}요일</b></p></div>` : ""}
      ${sup ? `<div class="gold">💛 오늘 한강을 응원해 준 당신께 <b>행운 +1</b>: 총운이 한 칸 밝아지는 '금빛 부적'이 함께해요. 고마워요!</div>` : `<div class="gold">💛 오늘 운이 좋았다면, 한강 서버비 응원으로 행운을 나눠 주세요. 응원한 날엔 금빛 부적이 붙어요.<br><button class="lnk" id="ftSup">💛 응원하기</button></div>`}
      <div><button class="lnk" id="ftShare">📤 친구에게 보내기</button>${opt.openApp && !(window.HNApp && HNApp.standalone && HNApp.standalone()) ? `<button class="lnk" id="ftApp">📱 내일 운세도 아이콘으로 바로</button>` : ""}<button class="lnk" id="ftRe">🎂 생일 바꾸기</button></div>
      <div class="note" id="ftNote">${note()}</div>`);
    if (sup) bx.querySelector(".card .st").innerHTML = `${"★".repeat(Math.min(5, tot + 1))}<i>${"★".repeat(5 - Math.min(5, tot + 1))}</i>`;
    bx.querySelector("#ftRe").onclick = ask;
    const sp = bx.querySelector("#ftSup"); if (sp) sp.onclick = () => { H.close(); opt.openSup && opt.openSup(); };
    const ap = bx.querySelector("#ftApp"); if (ap) ap.onclick = () => { H.close(); opt.openApp(); };
    bx.querySelector("#ftShare").onclick = () => {
      const url = location.origin + "/?from=fortune", text = `🍀 오늘 내 운세: 총운 ${"★".repeat(tot)} · 행운의 색 ${col[0]}\n밤 한강에서 내 운세 보기 🌙`;
      if (navigator.share) navigator.share({ title: "오늘의 운세", text, url }).catch(() => {});
      else (navigator.clipboard ? navigator.clipboard.writeText(text + "\n" + url) : Promise.reject()).then(() => { const s = bx.querySelector("#ftShare"); s.textContent = "✅ 복사했어요"; }, () => {});
    };
  };

  H.open = () => { opt.closeOthers && opt.closeOthers(); opt.send && opt.send({ t: "ftQ" }); ls("hn-fortune") ? result() : ask(); };
  H.onMsg = m => {
    if (m.t === "ftN") { todayN = m.n | 0; const e = box && document.getElementById("ftNote"); if (e) e.textContent = note(); }
    else if (m.t === "sup" && opt.me && m.id === opt.me()) { ls("hn-supday", kst()); if (H.isOpen() && ls("hn-fortune")) result(); }
  };
  H.init = o => { opt = o || {}; };
})();
