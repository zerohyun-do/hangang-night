// 💛 응원 기록(운영자 전용, 01·02 공통): 오늘·이번 주·이번 달·누적 응원 건수, 응원한 사람 수, 고른 금액 합계, 날짜·월별 표, 최근 30건, CSV 내려받기.
// 금액은 응원할 때 고른 칸(3천·5천·1만)이라 실제 입금 확인이 아님 → 세무 자료는 카카오페이 거래내역이 기준. 서버: supLog·supCsv(운영자만)
(() => {
  const H = window.HNLedger = {}; let opt = {}, box = null;
  const F = `system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const won = n => (n || 0).toLocaleString("ko-KR") + "원";
  const kt = t => { const d = new Date(new Date(t).getTime() + 9 * 3600e3); return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`; };
  const css = `
  #lgBox { position: fixed; inset: 0; z-index: 13; display: none; align-items: center; justify-content: center; background: rgba(4,6,20,.7); }
  #lgBox.on { display: flex; }
  #lgBox .in { width: min(440px, calc(100vw - 20px)); max-height: calc(100vh - 20px); overflow: auto; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; padding: 16px 14px; border-radius: 20px; background: #161a33; color: #eef0ff; border: 1px solid rgba(255,210,130,.35); font: 13.5px/1.45 ${F}; }
  #lgBox .hd { display: flex; justify-content: space-between; align-items: center; } #lgBox .hd b { color: #ffd98a; font-size: 16px; }
  #lgBox .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
  #lgBox .grid div { padding: 9px 10px; border-radius: 12px; background: rgba(255,255,255,.06); } #lgBox .grid small { display: block; color: #aeb4dc; font-size: 11.5px; } #lgBox .grid b { font-size: 18px; color: #fff; } #lgBox .grid i { display: block; font-style: normal; font-size: 12px; color: #ffd98a; }
  #lgBox table { width: 100%; border-collapse: collapse; font-size: 12.5px; } #lgBox th, #lgBox td { padding: 5px 6px; border-bottom: 1px solid rgba(255,255,255,.08); text-align: right; } #lgBox th:first-child, #lgBox td:first-child { text-align: left; } #lgBox th { color: #aeb4dc; font-weight: 600; }
  #lgBox h4 { margin: 4px 0 0; font-size: 13px; color: #ffd98a; }
  #lgBox .note { font-size: 12px; color: #c9cdea; padding: 9px 10px; border-radius: 12px; background: rgba(255,200,120,.1); } #lgBox .warn { color: #ffb4a0; }
  #lgBox button { all: unset; cursor: pointer; padding: 6px 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,.25); font-size: 12.5px; text-align: center; } #lgBox .row { display: flex; gap: 8px; justify-content: center; }`;
  function build() {
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    box = document.createElement("div"); box.id = "lgBox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "응원 기록");
    box.onclick = e => { if (e.target === box) return close(); const d = e.target.closest("[data-do]"); if (!d) return; if (d.dataset.do === "close") close(); else if (d.dataset.do === "csv") opt.send({ t: "supCsv" }); else if (d.dataset.do === "re") opt.send({ t: "supLog" }); };
    document.body.appendChild(box);
  }
  const card = (k, x) => `<div><small>${k}</small><b>${x.n}건</b> · ${x.people}명<i>고른 금액 ${won(x.amt)}</i></div>`;
  function render(r) {
    box.innerHTML = `<div class="in"><div class="hd"><b>💛 응원 기록 (운영자)</b><button data-do="close">닫기</button></div>
      <div class="grid">${card("오늘", r.today)}${card("최근 7일", r.week)}${card("이번 달", r.month)}${card("누적" + (r.first ? ` (${kt(r.first).split(" ")[0]}부터)` : ""), r.total)}</div>
      <div class="note">• 건수 = 💛 응원(후원 링크를 연 뒤 응원 폭죽)을 누른 횟수예요. 운영자 시험은 빠져 있어요.<br>• 금액은 응원할 때 고른 칸(3천·5천·1만) 합계라 <b>실제 입금 확인이 아니에요</b>. 세무 신고는 <b>카카오페이 거래내역</b>을 기준으로 하세요.<br>
      ${r.persist ? (r.err ? `<span class="warn">• 영구 저장 문제: ${esc(r.err)}</span>` : "• 서버가 다시 시작돼도 기록이 남아요(Supabase).") : `<span class="warn">• 지금은 서버 메모리·로그에만 있어서 배포·재시작 때 이 카드 숫자는 0부터 다시 세요(로그 [응원기록]에는 남음).</span>`}</div>
      ${r.byMonth.length ? `<h4>월별</h4><table><tr><th>월</th><th>건수</th><th>사람</th><th>고른 금액</th></tr>${r.byMonth.map(x => `<tr><td>${x.m}</td><td>${x.n}</td><td>${x.people}</td><td>${won(x.amt)}</td></tr>`).join("")}</table>` : ""}
      ${r.byDay.length ? `<h4>날짜별 (최근 ${Math.min(14, r.byDay.length)}일)</h4><table><tr><th>날짜</th><th>건수</th><th>사람</th><th>고른 금액</th></tr>${r.byDay.slice(0, 14).map(x => `<tr><td>${x.d.slice(5)}</td><td>${x.n}</td><td>${x.people}</td><td>${won(x.amt)}</td></tr>`).join("")}</table>` : `<div class="note">아직 응원 기록이 없어요</div>`}
      ${r.recent.length ? `<h4>최근 응원</h4><table><tr><th>시간</th><th>닉네임</th><th>채널</th><th>고른 칸</th></tr>${r.recent.map(x => `<tr><td>${kt(x.at)}</td><td>${esc(x.nick)}${x.busk ? " 🎸" : ""}</td><td>${x.ch}</td><td>${x.amt ? won(x.amt) : "-"}</td></tr>`).join("")}</table>` : ""}
      <div class="row"><button data-do="re">새로고침</button><button data-do="csv">📄 CSV 내려받기</button></div></div>`;
  }
  function csv(rows) {
    const head = "시간(UTC),채널,닉네임,고른금액(원·입금확인아님),버스킹\n", body = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + head + body], { type: "text/csv;charset=utf-8" }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "hangang-cheers.csv"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  H.init = o => { opt = o; build(); };
  H.open = () => { if (!box) return; box.innerHTML = `<div class="in"><div class="hd"><b>💛 응원 기록 (운영자)</b><button data-do="close">닫기</button></div><div class="note">불러오는 중…</div></div>`; box.classList.add("on"); opt.send({ t: "supLog" }); };
  function close() { box && box.classList.remove("on"); } H.close = close;
  H.onMsg = m => { if (m.t === "supLog" && box && box.classList.contains("on")) render(m); else if (m.t === "supCsv") csv(m.rows || []); };
})();
