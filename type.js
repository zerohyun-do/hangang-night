// 🧪 93차 밤 한강 유형 테스트(01·02 공통, app.js가 누를 때 처음 한 번만 불러옴)
// 12문항 × 3개 고르기 → 8가지 '밤 한강 유형'. 결과 카드(그림)를 폰에서 만들어 저장·공유(서버 저장 없음).
// 근거: 케이테스트 월 500만~1,000만 명, 인기 테스트 각각 1,000만+, 12문항짜리가 가장 퍼짐(하퍼스바자 2022).
// 서버는 오늘 유형별 숫자만 센다(t:"ty" k → tyN {n, c[8]}) → "오늘 테스트한 사람 중 n%".
(() => {
  const H = window.HNType = {}; let opt = {}, box = null, stat = null, last = null;
  const F = `system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };

  // [이모지, 이름, 한 줄, 설명, 강점, 조심, 잘 맞는 유형, 해 볼 것(버튼 id 후보, 이름)]
  const T = [
    ["🌙", "달빛 산책자", "혼자 걸으며 생각을 정리하는 사람", "북적이는 곳보다 조용한 길이 좋은 당신. 걷다 보면 복잡한 마음이 하나씩 풀려요. 남들은 모르는 '나만의 길'이 몇 개쯤 있죠.", "깊은 생각·차분함", "혼자 끙끙 앓기", 3, [["pkMenuBtn", "trMenuBtn"], "🗺 한강 걸어 보기"]],
    ["🎸", "버스킹 관객", "분위기에 제일 먼저 녹아드는 사람", "좋은 노래가 들리면 발이 먼저 멈추는 당신. 처음 보는 사람과도 박수 한 번으로 친해져요. 당신이 있는 자리는 늘 조금 더 따뜻해요.", "공감·친화력", "남 기분에 너무 맞추기", 6, [["bkMenuBtn"], "🎸 버스킹 보러 가기"]],
    ["🎣", "조용한 낚시꾼", "기다릴 줄 아는 사람", "서두르지 않아도 결국 해내는 당신. 남들이 포기할 때 한 번 더 기다려서 대어를 낚아요. 말수는 적어도 믿음직한 사람이에요.", "인내·꾸준함", "기회 앞에서 너무 신중하기", 7, [["fishBtn", "bFish"], "🎣 낚시하러 가기"]],
    ["🌠", "별 헤는 몽상가", "하늘을 보면 이야기가 떠오르는 사람", "별똥별 하나에도 소원을 세 개쯤 비는 당신. 상상력이 풍부해서 평범한 밤도 영화처럼 기억해요. 감성은 당신의 가장 큰 재능이에요.", "상상력·감수성", "현실을 잠깐 잊기", 0, [["lieBtn", "bLie"], "🛌 누워서 별 보기"]],
    ["🍜", "라면 먹는 현실주의자", "행복은 지금 이 한 그릇이라는 사람", "거창한 계획보다 눈앞의 맛있는 것에 행복한 당신. 실속 있고 솔직해서 주변 사람들이 편하게 기대요. 한강에선 역시 라면이죠.", "실속·솔직함", "귀찮으면 미루기", 4, [["stMenuBtn"], "🏪 편의점 가기"]],
    ["💤", "강바람 잠꾸러기", "쉬는 것도 실력이라는 사람", "지치기 전에 쉴 줄 아는 당신. 무리하지 않아서 오래 가요. 강물 소리만 있으면 어디서든 마음이 편해지는 타입이에요.", "회복력·여유", "해야 할 일 미루기", 5, [["slMenuBtn"], "🌙 한강에서 잠들기"]],
    ["🎆", "불꽃놀이 리더", "모두를 신나게 만드는 사람", "조용하던 자리도 당신이 오면 축제가 돼요. 먼저 나서고, 먼저 웃고, 먼저 쏘아 올리는 사람. 에너지가 넘쳐서 같이 있으면 덩달아 힘이 나요.", "추진력·밝음", "혼자 다 하려고 하기", 1, [["bFw", "fwBtn"], "🎆 폭죽 쏘기"]],
    ["📖", "벤치 위 집중러", "목표가 있으면 끝까지 가는 사람", "한강에 와서도 할 일을 챙기는 당신. 계획을 세우고 지키는 힘이 있어요. 오늘 하루를 알차게 쓴 사람은 대개 당신이에요.", "집중력·책임감", "쉬는 걸 죄책감으로 느끼기", 2, [["fcMenuBtn"], "🌱 같이 집중하기"]],
  ];
  // 질문: [질문, [보기, 유형 점수들]×3]
  const Q = [
    ["한강에 도착했다! 제일 먼저 하는 건?", [["일단 강 따라 걷는다", [0, 2]], ["음악 소리 나는 쪽으로 간다", [1, 6]], ["편의점부터 들른다", [4]]]],
    ["돗자리 자리를 고른다면?", [["사람 적은 구석, 강이 잘 보이는 곳", [2, 0]], ["사람 많고 북적이는 가운데", [6, 1]], ["눕기 좋은 평평한 잔디", [5, 3]]]],
    ["친구가 30분 늦는다는 연락이 왔다", [["오히려 좋아, 멍 때린다", [3, 5]], ["그동안 할 일 하나 끝낸다", [7]], ["주변 구경하러 돌아다닌다", [0]]]],
    ["밤하늘에 별똥별이 떨어졌다!", [["소원 빌기 바쁘다", [3]], ["친구들한테 '봤어?' 외친다", [6, 1]], ["사진 찍으려다 놓친다", [4]]]],
    ["한강에서 먹고 싶은 건?", [["한강라면은 못 참지", [4]], ["따뜻한 차 한 잔이면 충분", [0, 5]], ["치킨 시켜서 다 같이", [4, 6]]]],
    ["요즘 나의 가장 큰 고민은?", [["해야 할 게 너무 많다", [7]], ["그냥 좀 쉬고 싶다", [5]], ["앞으로 뭘 해야 할지 모르겠다", [0, 3]]]],
    ["버스킹 공연을 만났다", [["맨 앞에서 박수 친다", [1, 6]], ["멀리서 조용히 듣는다", [2, 0]], ["노래 들으며 눈 감는다", [5, 3]]]],
    ["주말을 보내는 나의 방식은?", [["계획표대로 알차게", [7]], ["약속 잡아서 사람 만나기", [1]], ["집에서 뒹굴뒹굴", [5, 4]]]],
    ["낚싯대가 있다면?", [["대어 낚을 때까지 버틴다", [2]], ["5분 해 보고 다른 거 한다", [6]], ["찌 보면서 생각에 잠긴다", [3, 2]]]],
    ["친구들이 말하는 나는?", [["생각이 깊은 사람", [2, 0]], ["같이 있으면 웃긴 사람", [6, 4]], ["말 잘 들어 주는 사람", [1, 5]]]],
    ["돌아가기 전 마지막으로 하는 건?", [["강 한 번 더 보고 일어난다", [3, 0]], ["오늘 찍은 사진 정리", [4, 7]], ["'다음에 또 오자' 약속 잡기", [1]]]],
    ["한강의 밤을 한 단어로?", [["위로", [5, 3]], ["설렘", [6, 1]], ["다짐", [7, 2]]]],
  ];

  const css = `
  #hnTy { position: fixed; inset: 0; z-index: 60; display: none; align-items: center; justify-content: center; background: rgba(4,6,18,.55); font-family: ${F}; }
  #hnTy.on { display: flex; }
  #hnTy .bx { width: min(380px, calc(100vw - 24px)); max-height: calc(100vh - 40px); max-height: calc(100dvh - 40px); overflow: auto; overscroll-behavior: contain; padding: 18px 16px 14px; border-radius: 22px; background: linear-gradient(180deg, rgba(20,26,64,.98), rgba(12,16,40,.98)); border: 1px solid rgba(255,255,255,.14); color: #f3e9d7; box-shadow: 0 14px 40px rgba(0,0,0,.5); }
  #hnTy h3 { margin: 0 0 6px; font-size: 19px; } #hnTy p { margin: 6px 0; font-size: 14px; line-height: 1.6; color: #d9d1e6; }
  #hnTy .bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,.1); overflow: hidden; margin: 6px 0 12px; } #hnTy .bar i { display: block; height: 100%; background: #f3d9a4; transition: width .25s; }
  #hnTy .q { font-size: 17px; font-weight: 800; line-height: 1.5; margin: 4px 0 12px; min-height: 52px; }
  #hnTy .op { all: unset; cursor: pointer; display: block; box-sizing: border-box; width: 100%; margin: 8px 0; padding: 14px; border-radius: 14px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1); font-size: 15px; color: #f3e9d7; }
  #hnTy .op:active { background: rgba(243,217,164,.25); }
  #hnTy .go { all: unset; box-sizing: border-box; width: 100%; cursor: pointer; display: block; text-align: center; margin-top: 10px; padding: 12px; border-radius: 14px; background: #f3d9a4; color: #2a1d10; font-weight: 800; font-size: 15px; }
  #hnTy .lnk { all: unset; cursor: pointer; display: inline-block; margin: 8px 6px 0 0; padding: 7px 11px; border-radius: 999px; background: rgba(255,255,255,.08); color: #efe6d4; font-size: 12.5px; font-weight: 700; }
  #hnTy .x { all: unset; cursor: pointer; display: block; text-align: center; margin-top: 8px; padding: 8px; color: #b9b0cc; font-size: 13px; }
  #hnTy .big { font-size: 64px; text-align: center; line-height: 1.1; margin-top: 6px; } #hnTy .nm { text-align: center; font-size: 22px; font-weight: 900; color: #f5d38a; } #hnTy .one { text-align: center; color: #cfc8dc; font-size: 13.5px; margin-bottom: 6px; }
  #hnTy .kv { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; } #hnTy .kv div { padding: 9px 10px; border-radius: 12px; background: rgba(255,255,255,.06); font-size: 12px; color: #b9b0cc; } #hnTy .kv b { display: block; font-size: 14px; color: #f3e9d7; margin-top: 2px; }
  #hnTy .pct { margin-top: 8px; font-size: 12.5px; color: #b9b0cc; text-align: center; } #hnTy .back { all: unset; cursor: pointer; font-size: 13px; color: #b9b0cc; }`;
  const show = html => {
    if (!box) { const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st); box = document.createElement("div"); box.id = "hnTy"; box.onclick = e => { if (e.target === box) H.close(); }; document.body.appendChild(box); }
    box.innerHTML = `<div class="bx">${html}<button class="x">닫기</button></div>`; box.querySelector(".x").onclick = H.close; box.classList.add("on");
    const bx = box.querySelector(".bx"); bx.scrollTop = 0; return bx;
  };
  H.close = () => box && box.classList.remove("on");
  H.isOpen = () => !!box && box.classList.contains("on");

  const intro = () => {
    const bx = show(`<h3>🧪 밤 한강 유형 테스트</h3><p>12개 질문으로 알아보는 <b style="color:#f5d38a">나는 어떤 밤 한강 사람?</b><br>8가지 유형 중 하나가 나와요. 1분이면 끝나요.</p>
      <p style="font-size:13px;color:#b9b0cc">${T.map(t => t[0]).join(" ")}</p><button class="go">시작하기</button>${ls("hn-type") ? `<button class="lnk" id="tyLast">지난 결과 보기</button>` : ""}`);
    bx.querySelector(".go").onclick = () => ask(0, new Array(8).fill(0), []);
    const l = bx.querySelector("#tyLast"); if (l) l.onclick = () => result(+ls("hn-type"), false);
  };
  const ask = (i, sc, hist) => {
    if (i >= Q.length) { const top = Math.max(...sc), ks = sc.map((v, j) => v === top ? j : -1).filter(j => j >= 0), lastA = hist[hist.length - 1] || [], pref = ks.filter(j => lastA.includes(j)), pool = pref.length ? pref : ks; return result(pool[Math.floor(Math.random() * pool.length)], true); }
    const [q, ops] = Q[i];
    const bx = show(`<div style="display:flex;justify-content:space-between;align-items:center">${i ? `<button class="back">← 이전</button>` : "<span></span>"}<span style="font-size:12.5px;color:#b9b0cc">${i + 1} / ${Q.length}</span></div><div class="bar"><i style="width:${(i / Q.length) * 100}%"></i></div>
      <div class="q">Q${i + 1}. ${q}</div>${ops.map((o, j) => `<button class="op" data-j="${j}">${o[0]}</button>`).join("")}`);
    bx.querySelectorAll(".op").forEach(b => b.onclick = () => { const add = ops[+b.dataset.j][1], s2 = sc.slice(); add.forEach((t, n) => s2[t] += n ? 1 : 2); ask(i + 1, s2, hist.concat([add])); });
    const bk = bx.querySelector(".back"); if (bk) bk.onclick = () => { const s2 = sc.slice(), add = hist[hist.length - 1]; add.forEach((t, n) => s2[t] -= n ? 1 : 2); ask(i - 1, s2, hist.slice(0, -1)); };
  };
  const result = (k, fresh) => {
    const t = T[k], mate = T[t[6]]; last = k;
    if (fresh) { ls("hn-type", String(k)); opt.send && opt.send({ t: "ty", k }); }
    const pct = stat && stat.n >= 5 ? Math.round((stat.c[k] || 0) / stat.n * 100) : null;
    const bx = show(`<div class="big">${t[0]}</div><div class="nm">${t[1]}</div><div class="one">${t[2]}</div><p>${t[3]}</p>
      <div class="kv"><div>나의 강점<b>${t[4]}</b></div><div>조심할 점<b>${t[5]}</b></div><div style="grid-column:1/-1">잘 맞는 유형<b>${mate[0]} ${mate[1]}</b></div></div>
      <div class="pct" id="tyPct">${pct != null ? `오늘 테스트한 ${stat.n}명 중 <b style="color:#f5d38a">${pct}%</b>가 ${t[1]}예요` : ""}</div>
      <button class="go" id="tyDo">${t[7][1]}</button>
      <div><button class="lnk" id="tyCard">🖼 결과 카드 저장·공유</button><button class="lnk" id="tyShare">📤 친구도 해 보게 하기</button><button class="lnk" id="tyRe">🔁 다시 하기</button></div>`);
    bx.querySelector("#tyRe").onclick = () => ask(0, new Array(8).fill(0), []);
    bx.querySelector("#tyDo").onclick = () => { H.close(); for (const id of t[7][0]) { const b = document.getElementById(id) || (id === "fwBtn" && document.querySelector("[data-fw]")); if (b) { b.click(); return; } } };
    bx.querySelector("#tyShare").onclick = () => {
      const url = location.origin + "/?from=type", text = `🧪 나는 '${t[0]} ${t[1]}'래요. 너는 어떤 밤 한강 사람이야?`;
      if (navigator.share) navigator.share({ title: "밤 한강 유형 테스트", text, url }).catch(() => {});
      else (navigator.clipboard ? navigator.clipboard.writeText(text + "\n" + url) : Promise.reject()).then(() => { bx.querySelector("#tyShare").textContent = "✅ 복사했어요"; }, () => {});
    };
    bx.querySelector("#tyCard").onclick = () => card(k);
  };

  // 결과 카드 1080×1350(인스타 세로) — 폰에서 그려서 공유/저장, 서버로 안 감
  const card = k => {
    const t = T[k], c = document.createElement("canvas"); c.width = 1080; c.height = 1350; const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, 1350); g.addColorStop(0, "#0b1030"); g.addColorStop(.6, "#1d2160"); g.addColorStop(1, "#0d1a42"); x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
    let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(255,250,230,${.3 + r() * .6})`; x.beginPath(); x.arc(r() * 1080, r() * 760, r() * 2.6 + .6, 0, 7); x.fill(); }
    x.fillStyle = "rgba(255,236,180,.95)"; x.beginPath(); x.arc(860, 200, 70, 0, 7); x.fill();
    x.fillStyle = "#0e1c48"; x.fillRect(0, 1060, 1080, 290); x.strokeStyle = "rgba(255,226,160,.55)"; x.lineWidth = 5; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(700 - i * 40, 1085 + i * 24); x.lineTo(960 + i * 30, 1085 + i * 24); x.stroke(); }
    x.textAlign = "center"; x.fillStyle = "#cfc8dc"; x.font = `600 40px ${F}`; x.fillText("나의 밤 한강 유형은", 540, 300);
    x.font = `220px ${F}`; x.fillText(t[0], 540, 560);
    x.fillStyle = "#f5d38a"; x.font = `900 92px ${F}`; x.fillText(t[1], 540, 700);
    x.fillStyle = "#efe6d4"; x.font = `600 42px ${F}`; x.fillText(t[2], 540, 780);
    x.font = `500 36px ${F}`; x.fillStyle = "#d9d1e6"; x.fillText(`강점 ${t[4]}  ·  잘 맞는 유형 ${T[t[6]][0]} ${T[t[6]][1]}`, 540, 870);
    x.fillStyle = "#f3e9d7"; x.font = `700 40px ${F}`; x.fillText("🌙 밤 한강 돗자리", 540, 1250); x.fillStyle = "#b9b0cc"; x.font = `500 32px ${F}`; x.fillText(location.host, 540, 1302);
    c.toBlob(b => {
      if (!b) return; const f = new File([b], "밤한강-유형.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: "밤 한강 유형 테스트", text: `나는 '${t[1]}' 🌙 ${location.origin}/?from=type` }).catch(() => {});
      else { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "밤한강-유형.png"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
    }, "image/png");
  };

  H.open = () => { opt.closeOthers && opt.closeOthers(); opt.send && opt.send({ t: "tyQ" }); intro(); };
  H.onMsg = m => {
    if (m.t !== "tyN") return; stat = { n: m.n | 0, c: Array.isArray(m.c) ? m.c : [] };
    if (last != null && H.isOpen()) { const p = box.querySelector("#tyPct"); if (p && stat.n >= 5) p.innerHTML = `오늘 테스트한 ${stat.n}명 중 <b style="color:#f5d38a">${Math.round((stat.c[last] || 0) / stat.n * 100)}%</b>가 ${T[last][1]}예요`; }
  };
  H.init = o => { opt = o || {}; };
})();
