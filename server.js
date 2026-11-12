// 밤 한강 돗자리: 접속한 사람마다 캐릭터 하나. 방 하나에 돗자리 CAP개, 차면 다음 방.
// 들어오면 산책로에 서 있다가, 빈 돗자리를 누르면 그 자리로 간다(먼저 요청이 도착한 사람이 차지).
const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;
const CAP = 30;              // 방 하나의 돗자리 수 (index.html의 SEATS와 같아야 함)
const MAX_ROOMS = 20;        // 최대 600명
const PER_IP = +process.env.PER_IP || 20;          // IP당 동시 접속 (통신사·학교 와이파이는 여러 사람이 IP 하나를 같이 써서 넉넉히)
const EMOJIS = ["❤️", "👍", "😂", "🥺", "👋", "✨", "🌙"];   // 마음(감정) 이모지. 행동(라면·눕기 등)은 ACTS로 따로
const COLORS = ["#e9a87c", "#8fb8de", "#b8d98f", "#e6c76f", "#d79bc4", "#9fd6cf", "#f0f0ea", "#c9a6f2", "#f29b9b", "#7fa3c9"];
const EMO_GAP = 1200;        // 이모지 최소 간격(ms)
const SIT_GAP = 600;         // 자리 옮기기 최소 간격(ms)
const ACTS = ["sit", "lie", "star", "ramen", "chicken", "photo", "stretch", "doze", "kimbap", "oden", "hotdog", "popcorn", "icecream", "tangerine", "cocoa", "juice", "bmilk", "soda", "fish", "lunchbox", "sandwich", "fruit", "tea", "tteokbokki", "tempura", "bungeo", "hotteok", "waffle", "dakkochi", "takoyaki", "tornado", "crepe", "tanghulu", "lemonade"];   // fish = 🎣 낚시(01)
const DRINKS = ["cocoa", "juice", "bmilk", "soda", "tea"];   // 짠! 할 수 있는 마실 것 (술 없음)   // 돗자리 위 행동
const ACT_GAP = 400;
const FW_GAP = 2500;         // 폭죽 최소 간격(ms). 연타로 하늘을 덮지 못하게
const FOUNTAIN_P = +process.env.FOUNTAIN_P || .12;   // 폭죽 1발마다 다리 무지개분수가 켜질 확률
const FOUNTAIN_LEN = 25000, FOUNTAIN_GAP = 60000;   // 쇼 25초, 방마다 끝나고 1분은 다시 안 켜짐
const NICK_GAP = 3000, NICK_MAX = 5;
// 닉네임: 5자까지. 안 정하면 서버가 귀여운 한강 이름(띄어쓰기 없이 5자 이내)을 붙인다. 같은 이름 허용.
const NICK_A = ["졸린", "배부른", "꾸벅", "느긋한", "말랑", "반짝", "수줍은", "멍한", "신난", "포근", "늦잠", "산책"];
const NICK_B = ["수달", "냥이", "오리", "멍멍", "너구리", "토끼", "펭귄", "곰", "부엉", "해달", "고래", "다람"];
const randNick = () => { for (;;) { const n = NICK_A[Math.random() * NICK_A.length | 0] + NICK_B[Math.random() * NICK_B.length | 0]; if ([...n].length <= NICK_MAX) return n; } };
// 욕설·비하·음란어. 비교 전에 띄어쓰기·숫자·기호를 빼고, 영어는 1→i 0→o 같은 바꿔치기를 되돌리고, 같은 글자 반복을 줄인다.
// 자음만 친 경우(ㅅㅂ 등)는 단어의 초성과도 비교한다. 운영자 사칭 단어도 막는다(운영자 본인은 허용).
const BAD = ["시발", "씨발", "씨빨", "씨팔", "시팔", "시바", "십발", "씹", "병신", "븅신", "빙신", "좆", "좃", "존나", "졸라", "개새", "개색", "개세", "새끼", "색기", "섀끼", "미친", "미쳤", "지랄", "썅", "쌍놈", "닥쳐", "꺼져", "엠창", "느금", "니애미", "니미", "애미", "애비", "에미", "한남", "한녀", "김치녀", "된장녀", "틀딱", "급식충", "맘충", "짱깨", "쪽바리", "흑형", "깜둥", "장애", "애자", "찐따", "병자", "죽어", "뒤져", "자살",
  "섹스", "섹", "쎅", "야동", "야사", "보지", "보짓", "자지", "잦이", "꼴려", "꼴림", "발기", "사정", "정액", "자위", "딸딸", "딸치", "오르가", "가슴만", "젖", "유두", "꼭지", "엉덩", "변태", "강간", "몰카", "성기", "음경", "음란", "야한", "벗어", "알몸", "누드", "fuck", "fuk", "shit", "bitch", "sex", "porn", "nigg", "dick", "pussy", "cunt", "asshole", "boob", "tits", "nude", "cock", "penis", "vagina", "horny", "milf", "hentai", "xxx", "slut", "whore", "rape"];
const IMPOSTOR = ["운영", "관리자", "관리인", "어드민", "admin", "매니저", "manager", "개발자", "공식", "official", "staff", "스탭", "스태프"];
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const toCho = w => [...w].map(ch => { const c = ch.charCodeAt(0) - 0xac00; return c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ch; }).join("");
const BAD_CHO = BAD.filter(w => /^[가-힣]{2,}$/.test(w)).map(toCho).concat(["ㅅㅂ", "ㅆㅂ", "ㅂㅅ", "ㅈㄴ", "ㅅㄲ", "ㅁㅊ", "ㅈㄹ", "ㅗ", "ㅄ", "ㅈㅈ", "ㅂㅈ", "ㅅㅅ"]);
function cleanNick(raw, admin, max = NICK_MAX) {
  if (typeof raw !== "string") return null;
  const n = [...raw.normalize("NFC").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\u3164\uffa0]/g, "").replace(/\s+/g, " ").trim()].slice(0, max).join("").trim();
  if (!n) return null;
  if (admin === "free") return n;                                                       // 운영자 글은 거르지 않는다
  const low = n.toLowerCase(), squash = x => x.replace(/[^a-z가-힣ㄱ-ㅎㅏ-ㅣ]/g, "").replace(/(.)\1+/g, "$1");
  const flats = [squash(low.replace(/[1!|]/g, "i").replace(/0/g, "o").replace(/3/g, "e").replace(/[4@]/g, "a").replace(/[5$]/g, "s").replace(/7/g, "t")), squash(low)];   // 숫자를 글자로 / 숫자를 빼고
  const hasJamo = /[ㄱ-ㅎ]/.test(n), cho = hasJamo ? toCho(flats[1]).replace(/[^ㄱ-ㅎ]/g, "") : "";   // 자음을 섞어 친 경우만 초성으로도 비교
  if (flats.some(f => BAD.some(w => f.includes(w))) || (hasJamo && BAD_CHO.some(w => cho.includes(w)))) return false;
  if (!admin && flats.some(f => IMPOSTOR.some(w => f.includes(w)))) return false;
  return n;   // false = 걸러짐
}
// 운영자: Render 환경 변수 ADMIN_KEY와 같은 키로 들어온 사람. 왕관 이름표, 황금 폭죽(1초 간격), 분수·유성우 켜기
const ADMIN_KEY = process.env.ADMIN_KEY || "";
// ✈️ 하늘 비행기 바라는 점: 운영자에게 가는 의견. 메모리 + 파일 + 서버 로그 한 줄. Render 무료는 재시작·배포·잠들 때 디스크가 지워지므로
// 새 글은 접속 중인 운영자 폰으로 바로 보내 폰에 사본을 쌓고(편지함을 열 때마다 합침), 서버가 꺼질 때 남은 글을 로그에 한 번 더 남긴다
const FB_FILE = path.join(__dirname, "feedback.json");
let feedback = []; try { feedback = JSON.parse(fs.readFileSync(FB_FILE, "utf8")); } catch {}
const fbCount = new Map();
const VC_KEYS = ["open", "hear", "skip", "self", "share", "askOpen"];   // 💌·📝 이용 횟수 종류
const fbDone = [];   // ✅ 운영자가 반영 알림을 보낸 것(최근 10개, 메모리 — 재시작 땐 voice.js 기본 목록만)   // IP 해시별 오늘 보낸 수 (rollDay 때 비움)
function saveFeedback(f) {
  f.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  feedback.push(f); if (feedback.length > 500) feedback.shift();
  fs.writeFile(FB_FILE, JSON.stringify(feedback), () => {});
  console.log("[바라는점] " + JSON.stringify(f));
  for (const r of rooms) for (const o of r.users.values()) if (o.admin) send(o.ws, { t: "letter", f, n: feedback.length });
}
const isAdminKey = k => ADMIN_KEY.length >= 8 && typeof k === "string" && k.length === ADMIN_KEY.length && require("crypto").timingSafeEqual(Buffer.from(k), Buffer.from(ADMIN_KEY));
const WISH_MAX = 15, LANTERN_GAP = 15000, HEART_GAP = 1500;   // 소원 풍선 글자 수·간격, 하트 간격
const FW_KINDS = 5, FW_COLORS = 7;   // index.html FW_SHAPES·FW_HUES 길이와 같아야 함

// "나에게 하고 싶은 말"은 서버로 오지 않고 폰 안에서만 거른다. 그래서 욕설·음란어 목록을 페이지에 끼워 준다.
// 마음 글에는 흔히 쓰는 말(사정·벗어나다·젖다·한남대교)과 위기 표현(죽고 싶다·자살 등, 상담 번호를 안내해야 함)은 막지 않는다
const MIND_OK = ["죽어", "뒤져", "자살", "미친", "미쳤", "장애", "병자", "꺼져", "닥쳐", "사정", "벗어", "젖", "한남"];
const MIND_BAD = BAD.filter(w => !MIND_OK.includes(w)), MIND_BAD_CHO = MIND_BAD.filter(w => /^[가-힣]{2,}$/.test(w)).map(toCho).concat(["ㅅㅂ", "ㅆㅂ", "ㅂㅅ", "ㅈㄴ", "ㅅㄲ", "ㅈㄹ", "ㅄ", "ㅈㅈ", "ㅂㅈ", "ㅅㅅ"]);
// 긴 글 거르기(index.html mindBad와 같은 방식): 낱말마다, 띄어 쓴 한 글자 낱말은 이어 붙여 비교
function badText(text) {
  const words = []; let run = "";
  for (const w of text.normalize("NFC").toLowerCase().split(/\s+/)) { if ([...w].length === 1) run += w; else { if (run) words.push(run); run = ""; words.push(w); } }
  if (run) words.push(run);
  const squash = x => x.replace(/[^a-z가-힣ㄱ-ㅎㅏ-ㅣ]/g, "").replace(/(.)\1+/g, "$1");
  return words.some(w => {
    const flats = [squash(w.replace(/[1!|]/g, "i").replace(/0/g, "o").replace(/3/g, "e").replace(/[4@]/g, "a").replace(/[5$]/g, "s").replace(/7/g, "t")), squash(w)];
    const cho = /[ㄱ-ㅎ]/.test(w) ? toCho(flats[1]).replace(/[^ㄱ-ㅎ]/g, "") : "";
    return flats.some(f => MIND_BAD.some(b => f.includes(b))) || (cho && MIND_BAD_CHO.some(b => cho.includes(b)));
  });
}
// 후원 주소(카카오페이 송금 링크 등): Render 환경 변수 DONATE_URL. https 주소만 받는다. 없으면 페이지에 "준비 중"
const DONATE_URL = /^https:\/\/[^\s"'<>\\]+$/.test(process.env.DONATE_URL || "") ? process.env.DONATE_URL : "https://qr.kakaopay.com/Ej7ooGTO1";   // 기본: 운영자 카카오페이 송금 링크
const page = fs.readFileSync(path.join(__dirname, "index.html"), "utf8").replace("/*HN_BAD*/[]", JSON.stringify(MIND_BAD)).replace("/*HN_BAD_CHO*/[]", JSON.stringify(MIND_BAD_CHO)).replace('/*HN_DONATE*/""', JSON.stringify(DONATE_URL));
const ogImage = fs.readFileSync(path.join(__dirname, "og.jpg"));
// 여의도 02(3D 시험 채널): 따로 만든 3d.html + three.js(npm 패키지를 그대로 내려 준다, gzip)
const page3d = fs.readFileSync(path.join(__dirname, "3d.html"), "utf8").replace('/*HN_DONATE*/""', JSON.stringify(DONATE_URL));
const zlib = require("zlib"), vendor = {};
for (const f of ["three.module.js", "three.core.js"]) { try { const b = fs.readFileSync(path.join(__dirname, "node_modules/three/build", f)); vendor[f] = { raw: b, gz: zlib.gzipSync(b, { level: 9 }) }; } catch {} }
// 📦 전송량 줄이기(77차): 글자 파일(html·js·json)은 brotli/gzip으로 줄여 보내고, ETag로 '바뀌지 않았으면 304(빈 응답)'.
// 응답 본문이 같으면 압축 결과를 메모리에 재사용한다(파일은 시작 때 읽어 두므로 몇십 개뿐)
const zc = new Map();
function zipEntry(body) {
  let e = zc.get(body); if (e) return e;
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
  e = { etag: '"' + require("crypto").createHash("sha1").update(buf).digest("base64url").slice(0, 20) + '"', raw: buf,
    br: zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: buf.length > 200000 ? 9 : 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length } }),
    gz: zlib.gzipSync(buf, { level: 9 }) };
  if (zc.size > 300) zc.clear();
  zc.set(body, e); return e;
}
function shrink(req, res) {
  const wh = res.writeHead, end = res.end; let st = 200, hd = null;
  const wr = res.write, restore = () => { res.writeHead = wh; res.end = end; res.write = wr; };
  res.writeHead = function (s, h) { st = s; hd = h; return this; };
  res.write = function () { restore(); wh.call(res, st, hd || undefined); return wr.apply(res, arguments); };   // 흘려 보내는 응답(mp3)은 손대지 않는다
  res.end = function (body) {
    restore();
    const h = hd || {}, ct = h["content-type"] || "", cc = h["cache-control"] || "";
    if (st !== 200 || body == null || h["content-encoding"] || !/text\/|javascript|json/.test(ct) || (body.length || 0) < 1024) { wh.call(res, st, hd || undefined); return end.call(res, body); }
    const fixed = /max-age|no-cache/.test(cc) && !/no-store/.test(cc);   // 바뀌는 숫자(/stats)는 ETag 없이 압축만
    const e = fixed ? zipEntry(body) : null, buf = e ? e.raw : Buffer.from(body), ae = req.headers["accept-encoding"] || "";
    const out = { ...h, vary: "accept-encoding" }; if (e) out.etag = e.etag;
    if (e && (req.headers["if-none-match"] || "").split(/\s*,\s*/).includes(e.etag)) { delete out["content-type"]; wh.call(res, 304, out); return end.call(res); }
    let z = buf;
    if (/\bbr\b/.test(ae)) { z = e ? e.br : zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }); out["content-encoding"] = "br"; }
    else if (/\bgzip\b/.test(ae)) { z = e ? e.gz : zlib.gzipSync(buf); out["content-encoding"] = "gzip"; }
    out["content-length"] = z.length; wh.call(res, 200, out); return end.call(res, req.method === "HEAD" ? undefined : z);
  };
}
// 📊 실제로 내보낸 바이트(HTTP·웹소켓 따로). 매시 [stats-now]에 tx(MB)로 남아 Render 대역폭과 맞춰 볼 수 있다
const txSocks = new Set(); let txDone = { h: 0, w: 0 };
const txNow = () => { const t = { ...txDone }; for (const s of txSocks) t[s.hnWs ? "w" : "h"] += s.bytesWritten - (s.hnBase || 0); return t; };
// 🎵 mp3(라디오·버스킹·배경 소리)는 jsDelivr(무료 CDN, GitHub 공개 저장소)에서 받게 한다. 안 되면 페이지가 이 서버로 돌아온다
const AUDIO_CDN = process.env.AUDIO_CDN != null ? process.env.AUDIO_CDN : "https://cdn.jsdelivr.net/gh/zerohyun-do/hangang-night@main/";
const cdnJs = `<script>(function(){var C=${JSON.stringify(AUDIO_CDN)};if(!C)return;var R=/^\\/?((?:amb|radio|busk)-[a-z0-9]+\\.mp3)(?:\\?v=\\d+)?$/,P=HTMLMediaElement.prototype,D=Object.getOwnPropertyDescriptor(P,"src");
function fix(el,u){var m=typeof u=="string"&&R.exec(u.replace(location.origin,""));if(!m)return u;if(!el.hnCdn){el.hnCdn=1;el.crossOrigin="anonymous";el.addEventListener("error",function(){var s=D.get.call(el);if(s.indexOf(C)!==0)return;var t=el.currentTime,p=el.hnWant||el.autoplay;D.set.call(el,"/"+s.slice(C.length));el.load();if(t)el.addEventListener("loadedmetadata",function(){try{el.currentTime=t}catch(e){}},{once:true});if(p)el.play().catch(function(){})})}return C+m[1]}
var PL=P.play,PA=P.pause;P.play=function(){this.hnWant=1;return PL.apply(this,arguments)};P.pause=function(){this.hnWant=0;return PA.apply(this,arguments)};
Object.defineProperty(P,"src",{configurable:true,enumerable:D.enumerable,get:D.get,set:function(u){D.set.call(this,fix(this,u))}});
var A=window.Audio;window.Audio=function(u){var a=new A();if(u!==undefined)a.src=u;return a};window.Audio.prototype=A.prototype})()</script>`;
// 📦 78차: js·three.js·별 지도도 jsDelivr에서. 배포된 커밋(RENDER_GIT_COMMIT)에 고정해서 '옛 파일' 걱정이 없다.
// CDN이 안 되면 그 자리에서 이 서버 파일로 다시 받는다(script onerror·fetch catch). AUDIO_CDN=""이면 전부 끈다.
const GIT = /^[0-9a-f]{7,40}$/.test(process.env.RENDER_GIT_COMMIT || "") ? process.env.RENDER_GIT_COMMIT : "";
const JS_CDN = AUDIO_CDN && GIT ? AUDIO_CDN.replace(/@main\/$/, "@" + GIT + "/") : "";
let threeVer = ""; try { threeVer = JSON.parse(fs.readFileSync(path.join(__dirname, "node_modules/three/package.json"), "utf8")).version; } catch {}
const THREE_CDN = AUDIO_CDN && threeVer ? `https://cdn.jsdelivr.net/npm/three@${threeVer}/` : "";
const SERVER_ONLY = new Set(["voice.js"]);   // 서버가 내용을 끼워 넣는 파일은 여기서
const isThreePage = h => h.includes("끌어서 360도로 둘러보기");   // 3d.html만 처음부터 three.js를 쓴다
function cdnPage(html) {
  // three.js: CDN이 안 되던 폰은 하루 동안 이 서버(/vendor)에서 받는다(3D 페이지가 import 실패를 보면 표시하고 한 번 새로고침)
  const IM = '<script type="importmap">{ "imports": { "three": "/vendor/three.module.js", "three/addons/": "/vendor/addons/" } }</script>';
  if (THREE_CDN && html.includes(IM)) html = html.replace(IM, `<script>(function(){var n=0;try{n=Date.now()-(+localStorage.getItem("hn-nocdn")||0)<864e5}catch(e){}var m=n?{"three":"/vendor/three.module.js","three/addons/":"/vendor/addons/"}:{"three":"${THREE_CDN}build/three.module.js","three/addons/":"${THREE_CDN}examples/jsm/"};document.write('<script type="importmap">'+JSON.stringify({imports:m})+'<\\/script>')})()</script>`
    + (isThreePage(html) ? `<script type="module">import("three").catch(function(){try{if(!sessionStorage.getItem("hn-cdnre")){sessionStorage.setItem("hn-cdnre","1");localStorage.setItem("hn-nocdn",String(Date.now()));location.reload()}}catch(e){}})</script>` : ""));
  if (!JS_CDN) return html;
  html = html.replace(/<script src="\/([a-z]+\.js)"><\/script>/g, (m, f) => SERVER_ONLY.has(f) ? m : `<script src="${JS_CDN}${f}" onerror="document.write('<script src=/${f}><\\/script>')"></script>`);
  return html.replace("<head>", `<head><script>(function(){var J=${JSON.stringify(JS_CDN)},F=window.fetch;window.HNCDN=J;window.fetch=function(u,o){if(u==="/sky-stars.json")return F(J+"sky-stars.json",o).then(function(r){if(!r.ok)throw 0;return r}).catch(function(){return F(u,o)});return F.apply(this,arguments)}})()</script>`);
}
// 🗓 80·81차 천천히 공개: 큰 기능을 숨겨 두고 날짜가 되면(한국 시각 오후 1시) 몇 개씩 저절로 연다.
// 숨긴 기능은 js 태그를 빼서 아예 안 내려보낸다(첫 접속 용량도 줄어듦). 메뉴 이름은 window.HNHide로 menu.js·trip.js가 가린다.
// 순서표: promo/기능-공개-순서.md. 비상시 Render 환경변수 REVEAL_ALL=1이면 전부 보인다.
const REVEAL = [   // [날짜, 열쇠, js 파일들, 메뉴 이름들(+trip.js 장소 열쇠)] — 83차: 11/4 15개(10개는 배포 즉시), 11/5 오후 1시 11개
  ["2026-11-04", "radio", ["radio.js"], ["라디오"]],
  ["2026-11-04", "skip", ["skip.js"], ["물수제비"]],
  ["2026-11-04", "lounge", [], ["한강 라운지", "lounge"]],
  ["2026-11-04", "tower", [], ["남산타워", "tower"]],
  ["2026-11-04", "place", ["place.js"], ["같이 그리기"]],
  ["2026-11-04", "guest", ["guest.js"], ["손님"]],
  ["2026-11-04", "busk", ["busk.js"], ["버스킹"]],
  ["2026-11-04", "park", ["park.js"], ["오픈월드"]],
  ["2026-11-04", "decks", [], ["63빌딩", "롯데타워", "sky63", "sky123"]],
  ["2026-11-04", "train", ["train.js"], []],
  ["2026-11-05", "deliv", ["deliv.js"], ["치킨 배달"]],
  ["2026-11-05", "focus", ["focus.js"], ["같이 집중"]],
  ["2026-11-05", "market", ["market.js"], ["야시장"]],
  ["2026-11-05", "drone", ["drone.js"], []],
  ["2026-11-05", "tent", ["tent.js"], ["자리 꾸미기"]],
  ["2026-11-04", "bubble", ["bubble.js"], ["비눗방울"]],
  ["2026-11-04", "capsule", ["capsule.js"], ["미래의 나에게"]],
  ["2026-11-04", "store", ["store.js"], ["편의점"]],
  ["2026-11-05", "streak", ["streak.js"], []],
  ["2026-11-04", "subway", ["subway.js"], ["지하철"]],
  ["2026-11-05", "hgi", ["hgi.js"], ["한강이"]],
  ["2026-11-05", "roam", ["roam.js"], ["한강 따라 걷기"]],
  ["2026-11-04", "truck", ["truck.js"], []],
  ["2026-11-05", "quiz", ["quiz.js"], ["한강 퀴즈"]],
  ["2026-11-05", "night", ["night.js"], ["오늘 밤 카드"]],
  ["2026-11-05", "sleep", ["sleep.js"], ["잠들기"]],
].map(([d, k, js, menu]) => ({ at: Date.parse(d + "T13:00:00+09:00"), d, k, js, menu }));
const hiddenNow = () => process.env.REVEAL_ALL === "1" ? [] : REVEAL.filter(r => Date.now() < r.at);
function hidePage(html, hid) {
  for (const r of hid) for (const f of r.js) html = html.replace(`<script src="/${f}"></script>`, "");
  return html.replace("<head>", `<head><script>window.HNHide=${JSON.stringify(hid.flatMap(r => r.menu.concat(r.k)))}</script>`);
}
let pagesMemo = null;
const pages = () => {
  const hid = hiddenNow(), key = hid.map(r => r.k).join();
  if (!pagesMemo || pagesMemo.key !== key) {
    pagesMemo = { key, main: cdnPage(hidePage(page, hid).replace("<head>", "<head>" + cdnJs)), d3: cdnPage(hidePage(page3d, hid).replace("<head>", "<head>" + cdnJs)) };
    if (key !== undefined) console.log(`[공개] 숨김 ${hid.length}개: ${key || "없음"}`);
  }
  return pagesMemo;
};
pages();
const server = http.createServer((req, res) => {
  shrink(req, res);
  { // 📊 경로별 보낸 바이트(진단용, 매시 [stats-now]의 txp에 KB로 상위 10개)
    const sk = req.socket, b0 = sk.bytesWritten, k = req.url.split("?")[0].replace(/^\/(radio|busk|amb)-[a-z0-9]+\.mp3$/, "/$1-*.mp3").slice(0, 40);
    res.on("finish", () => { const P = day.txp || (day.txp = {}); if (P[k] != null || Object.keys(P).length < 60) P[k] = (P[k] || 0) + sk.bytesWritten - b0; });
  }
  // 🤖 UptimeRobot(잠들기 방지 핑)은 첫 화면 전체 대신 짧은 응답만(매 5분 × 하루 288번)
  if (/UptimeRobot/i.test(req.headers["user-agent"] || "")) { res.writeHead(200, { "content-type": "text/plain" }); return res.end("ok"); }
  if (req.url === "/health") { res.writeHead(200); return res.end("ok"); }
  if (req.url === "/admin/feedback") {
    if (!isAdminKey(req.headers["x-admin-key"])) { res.writeHead(403); return res.end("forbidden"); }
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    return res.end(JSON.stringify({ items: feedback.slice().reverse() }));
  }
  if (req.url === "/stats") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ total: total(), rooms: rooms.map(r => r.users.size), rooms3d: rooms3d.map(r => r.users.size), today: summary(day), yesterday: prevDay && summary(prevDay), days: history, since: startedAt }, null, 1));
  }
  if (/^\/3d(\?|$)/.test(req.url)) { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" }); return res.end(pages().d3); }
  const vm = /^\/vendor\/(three\.(?:module|core)\.js)$/.exec(req.url);
  if (vm && vendor[vm[1]]) {
    const v = vendor[vm[1]], gz = /\bgzip\b/.test(req.headers["accept-encoding"] || "");
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=604800", ...(gz ? { "content-encoding": "gzip" } : {}), "vary": "accept-encoding" });
    return res.end(gz ? v.gz : v.raw);
  }
  // 🚢🗼 3D 시점: tripgl.js + three.js 부가 모듈(후처리·물) + 실제 별 지도
  const am3 = /^\/vendor\/addons\/((?:postprocessing|shaders|objects)\/[A-Za-z0-9]+\.js)$/.exec(req.url);
  if (am3) { const f = path.join(__dirname, "node_modules/three/examples/jsm", am3[1]); let b; try { b = addonCache[f] || (addonCache[f] = fs.readFileSync(f)); } catch { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=604800" }); return res.end(b); }
  if (req.url === "/roam.js") { res.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-cache" }); return res.end(roamJs); }   // 🚶 75차 01 한강 따라 걷기(같은 장면이 옆으로 이어짐)
  if (req.url === "/parkgl.js") { res.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-cache" }); return res.end(parkGlJs); }   // 🗺 한강 오픈월드(WebGL)
  if (req.url === "/park.js") { res.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-cache" }); return res.end(parkJs); }
  if (req.url === "/tripgl.js") { res.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-cache" }); return res.end(tripGlJs); }
  if (req.url === "/sky-stars.json" || req.url === "/sky-mw.webp") { res.writeHead(200, { "content-type": req.url.endsWith("json") ? "application/json" : "image/webp", "cache-control": "public, max-age=604800" }); return res.end(skyFiles[req.url]); }
  if (req.url === "/og.jpg" && JS_CDN) { res.writeHead(302, { location: JS_CDN + "og.jpg", "cache-control": "public, max-age=86400" }); return res.end(); }   // 링크 미리보기 그림은 jsDelivr에서
  if (req.url === "/og.jpg") { res.writeHead(200, { "content-type": "image/jpeg", "cache-control": "public, max-age=86400" }); return res.end(ogImage); }
  if (req.url === "/radio.js" || req.url === "/menu.js" || req.url === "/trip.js" || req.url === "/voice.js" || req.url === "/focus.js" || req.url === "/skip.js" || req.url === "/drone.js" || req.url === "/guest.js" || req.url === "/busk.js" || req.url === "/sleep.js" || req.url === "/train.js" || req.url === "/store.js" || req.url === "/wx.js" || req.url === "/truck.js" || req.url === "/quiz.js" || req.url === "/night.js" || req.url === "/bench.js" || req.url === "/place.js" || req.url === "/hgi.js" || req.url === "/streak.js" || req.url === "/calm.js" || req.url === "/bubble.js" || req.url === "/capsule.js" || req.url === "/ledger.js" || req.url === "/subway.js" || req.url === "/deliv.js" || req.url === "/market.js" || req.url === "/tent.js" || req.url === "/story.js" || req.url === "/mission.js" || req.url === "/game.js" || req.url === "/busk.json" || req.url === "/radio.json") { res.writeHead(200, { "content-type": req.url.endsWith("js") ? "text/javascript; charset=utf-8" : "application/json", "cache-control": "no-cache" }); return res.end(req.url === "/radio.js" ? radioJs : req.url === "/menu.js" ? menuJs : req.url === "/trip.js" ? tripJs : req.url === "/voice.js" ? voiceJs : req.url === "/focus.js" ? focusJs : req.url === "/skip.js" ? skipJs : req.url === "/drone.js" ? droneJs : req.url === "/guest.js" ? guestJs : req.url === "/busk.js" ? buskJs : req.url === "/sleep.js" ? sleepJs : req.url === "/train.js" ? trainJs : req.url === "/store.js" ? storeJs : req.url === "/wx.js" ? wxJs : req.url === "/truck.js" ? truckJs : req.url === "/quiz.js" ? quizJs : req.url === "/night.js" ? nightJs : req.url === "/bench.js" ? benchJs : req.url === "/place.js" ? placeJs : req.url === "/hgi.js" ? hgiJs : req.url === "/streak.js" ? streakJs : req.url === "/calm.js" ? calmJs : req.url === "/bubble.js" ? bubbleJs : req.url === "/capsule.js" ? capsuleJs : req.url === "/ledger.js" ? ledgerJs : req.url === "/subway.js" ? subwayJs : req.url === "/deliv.js" ? delivJs : req.url === "/market.js" ? marketJs : req.url === "/tent.js" ? tentJs : req.url === "/story.js" ? storyJs : req.url === "/mission.js" ? missionJs : req.url === "/game.js" ? gameJs : req.url === "/busk.json" ? JSON.stringify(BUSK) : JSON.stringify(RADIO)); }
  const rm = /^\/(radio-\d{1,2}\.mp3)(?:\?v=\d+)?$/.exec(req.url);
  if (rm && RADIO.some(x => x.f === rm[1])) return sendAudio(req, res, path.join(__dirname, rm[1]));
  const bm = /^\/(busk-\d{1,2}\.mp3)(?:\?v=\d+)?$/.exec(req.url);
  if (bm && BUSK.some(x => x.f === bm[1])) return sendAudio(req, res, path.join(__dirname, bm[1]));
  const am = /^\/(amb-(?:river|city|crick)\.mp3)(?:\?v=\d+)?$/.exec(req.url);
  if (am) return sendAudio(req, res, path.join(__dirname, am[1]));
  // 카카오톡·인스타 링크 미리보기는 이미지 주소가 절대 주소여야 해서 요청한 주소를 넣어 준다
  // 🧹 없는 파일(favicon.ico·apple-touch-icon·robots.txt 등)에 첫 화면 전체를 보내던 것 → 짧게 끝낸다(하루 약 180MB가 여기로 나가고 있었음)
  { // 🔮 타로·🏅 등급·📱 홈 화면 추가(app.js)·🍀 운세·🧪 유형 테스트·📖 열두 밤 등: 파일 그대로(js는 페이지가 CDN 먼저, 실패하면 여기)
    const sp = req.url.split("?")[0], f = STATIC[sp];
    if (f) { res.writeHead(200, { "content-type": f.ct, "cache-control": sp === "/sw.js" ? "no-cache" : f.bin ? "public, max-age=604800" : "no-cache" }); return res.end(f.body); }
  }
  if (req.url === "/robots.txt") { res.writeHead(200, { "content-type": "text/plain", "cache-control": "public, max-age=604800" }); return res.end("User-agent: *\nAllow: /\n"); }
  if (/^\/[^?]*\.[A-Za-z0-9]{2,5}(\?|$)/.test(req.url)) { res.writeHead(req.url.startsWith("/favicon") ? 204 : 404, { "cache-control": "public, max-age=2592000" }); return res.end(); }
  const origin = (req.headers["x-forwarded-proto"] || "http") + "://" + (req.headers["x-forwarded-host"] || req.headers.host);
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
  res.end(pages().main.replaceAll("%ORIGIN%", origin));
});

// 배경 소리 (강물·도시·풀벌레 3개). 사파리는 오디오에 Range(206) 응답이 필요하다.
function sendAudio(req, res, AUDIO) {
  let size; try { size = fs.statSync(AUDIO).size; } catch { res.writeHead(404); return res.end(); }
  const head = { "content-type": "audio/mpeg", "accept-ranges": "bytes", "cache-control": "public, max-age=86400" };
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || "");
  if (!m) { res.writeHead(200, { ...head, "content-length": size }); return req.method === "HEAD" ? res.end() : fs.createReadStream(AUDIO).pipe(res); }
  const start = m[1] ? +m[1] : size - +m[2], end = m[1] && m[2] ? Math.min(+m[2], size - 1) : size - 1;
  if (start >= size || start > end) { res.writeHead(416, { "content-range": `bytes */${size}` }); return res.end(); }
  res.writeHead(206, { ...head, "content-range": `bytes ${start}-${end}/${size}`, "content-length": end - start + 1 });
  req.method === "HEAD" ? res.end() : fs.createReadStream(AUDIO, { start, end }).pipe(res);
}

// 오늘(한국 시간) 방문 기록. 메모리에만 있어서 서버가 잠들거나 재시작하면 0부터 다시 센다.
// 그래서 매시 정각과 날짜가 바뀔 때 Render 로그에도 한 줄씩 남긴다.
const kstDate = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const newDay = () => ({ date: kstDate(), tx0: txNow(), visits: 0, people: new Set(), secs: [], peak: 0, sources: {}, back: 0, fish: 0, v: {}, fc: { s: 0, d: 0, min: 0 }, sk: { o: 0, t: 0, sh: 0 } });
const startedAt = new Date().toISOString();   // 이 서버가 켜진 때(숫자는 이때부터 센다)
let day = newDay(), prevDay = null, history = [];   // history: 지난 날 요약(최근 7일, 메모리에만 — 재시작·배포 때 지워지고 Render 로그 [stats] 줄이 남는다)
function summary(d) {
  const s = [...d.secs].sort((a, b) => a - b), mid = s.length ? s[s.length >> 1] : 0;
  return { date: d.date, visits: d.visits, people: d.people.size, finished: s.length,
    avgMin: s.length ? +(s.reduce((a, b) => a + b, 0) / s.length / 60).toFixed(1) : 0, medianMin: +(mid / 60).toFixed(1),
    over5min: s.filter(x => x >= 300).length, peak: d.peak, sources: d.sources, back: d.back || 0, fish: d.fish || 0, v: d.v || {}, fc: d.fc || undefined, sk: d.sk || undefined, dr: d.dr || 0, gs: d.gs || 0, bk: d.bk || 0, bkr: d.bkr || 0, sl: d.sl || undefined, pk: d.pk || undefined, txp: d.txp ? Object.fromEntries(Object.entries(d.txp).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => [k, Math.round(v / 1024)])) : undefined, tx: d.tx0 ? (t => ({ h: +((t.h - d.tx0.h) / 1048576).toFixed(1), w: +((t.w - d.tx0.w) / 1048576).toFixed(1) }))(d.tx1 || txNow()) : undefined, trMax: d.trMax || 0, rm: d.rm || 0, tk: d.tk || 0, qz: d.qz || 0, qzp: d.qzp || 0, px: d.px || 0, hg: d.hg || 0, stk: d.stk || 0, bub: d.bub || 0, cap: d.cap || 0, dv: d.dv || 0, mk: d.mk || 0, tn: d.tn || 0, lg: d.lg || 0, fr: d.fr || 0, tr: d.tr || 0, lvMax: d.lvMax || 0, ft: d.ft || 0, ty: d.ty || 0, tyc: d.tyc || [0, 0, 0, 0, 0, 0, 0, 0], appIn: d.appIn || 0, app: (d.sources && d.sources.app) || 0, rd: d.rd || undefined, ms: d.ms || 0, gm: d.gm || 0, gmb: d.gmb || 0 };
}
function rollDay() { if (day.date !== kstDate()) { fbCount.clear(); const sm = summary(day); console.log("[stats] " + JSON.stringify(sm)); history.unshift(sm); history = history.slice(0, 7); day.tx1 = txNow(); prevDay = day; day = newDay(); } }
setInterval(() => { rollDay(); console.log("[stats-now] " + JSON.stringify(summary(day))); }, 3600e3);   // 한 시간마다 지금까지 숫자를 로그에 남겨 둔다
setInterval(() => { rollDay(); if (new Date().getMinutes() === 0) console.log("[stats] " + JSON.stringify(summary(day))); }, 60000);
// 💛 응원 폭죽: 후원 링크를 연 사람이 '응원 폭죽'을 누르면 01 전체에 알림 + 그 방에 황금 폭죽 3발. 결제 확인은 못 하므로 IP당 10분에 1번
// 01과 02(3D)는 응원 횟수·대어 순위·정각 불꽃 이름을 따로 센다(채널 데이터 분리). IP 10분 제한만 둘이 같이 쓴다
const CH = { "": { cheer: { date: "", n: 0 }, fishTop: { date: "", list: [] }, supRecent: [] }, "3d": { cheer: { date: "", n: 0 }, fishTop: { date: "", list: [] }, supRecent: [] } };
const cheerIp = new Map();
const poolOf = room => room.ch === "3d" ? rooms3d : rooms;
// 🏆 오늘의 대어(모든 01 방, 메모리에만). 물고기별 최대 크기(index.html FISH와 같은 순서)로 터무니없는 값은 거른다
const FISH_MAX = [35, 80, 50, 35, 20, 50, 7, 0, 0, 70, 90, 30, 90, 80, 30, 50, 90, 0, 110, 0];
const todayFishTop = ch => CH[ch].fishTop.date === kstDate() ? CH[ch].fishTop.list : [];
// 최근 1시간 응원 폭죽 닉네임(정각 불꽃놀이 끝에 이름이 황금 불꽃으로 올라간다). 메모리에만
const recentSups = ch => { const now = Date.now(), S = CH[ch]; S.supRecent = S.supRecent.filter(x => now - x.at < 3600e3); return S.supRecent.slice(-5).map(x => ({ nick: x.nick, at: x.at })); };
const cheersToday = ch => CH[ch].cheer.date === kstDate() ? CH[ch].cheer.n : 0;
const ipKey = ip => require("crypto").createHash("sha256").update(ip + day.date).digest("hex").slice(0, 12);  // IP는 저장하지 않고 하루짜리 해시만

const rooms = [];            // [{ no, users: Map<id, user> }]
const rooms3d = [];          // 여의도 02(3D 시험 채널): 01과 사람·데이터가 섞이지 않게 따로 센다
const ips = new Map();
let nextId = 1;
// 고민 풍선(함께 나누기): 쓴 사람이 고를 때만, 이름 없이 같은 방 하늘에 60초 떠 있다. 메모리에만 두고 저장·로그 없음.
// 다른 사람은 정해진 공감 4가지만 보낼 수 있다(자유 댓글 없음). 공감 하나마다 10초 더, 최대 2분
const WORRY_LEN = 60000, WORRY_MAX = 120000, CHEERS = 4;
const CRISIS = /죽고\s*싶|죽을\s*것\s*같|죽어\s*버리|자살|사라지고\s*싶|없어지고\s*싶|살기\s*싫|살고\s*싶지\s*않|그만\s*살|끝내고\s*싶|목숨|뛰어\s*내리|자해|손목/;
let nextWorry = 1;
const pubWorry = (w, now) => ({ id: w.id, text: w.text, left: w.until - now, cheers: w.cheers });
const liveWorries = room => { const now = Date.now(); room.worries = room.worries.filter(w => w.until > now); return room.worries; };
const total = () => [...rooms, ...rooms3d].reduce((n, r) => n + r.users.size, 0);

function pickRoom(ch, want) {
  const pool = ch === "3d" ? rooms3d : rooms, max = ch === "3d" ? 3 : MAX_ROOMS;
  let r = want ? pool.find(r => r.no === want && r.users.size < CAP) : null;   // 👫 친구가 보낸 링크(?with=방 번호)면 그 방으로
  if (!r) r = pool.find(r => r.users.size < CAP);
  if (!r && pool.length < max) { r = { no: pool.length + 1, ch: ch === "3d" ? "3d" : "", users: new Map(), fountainAt: 0, worries: [] }; pool.push(r); }
  return r;
}
const adminHere = room => [...room.users.values()].some(o => o.admin);
const COUNTS = {};   // 오늘 하루 숫자(한국 날짜 바뀌면 0부터)
const todayCount = k => { const d = kstDate(); if (!COUNTS[k] || COUNTS[k].date !== d) COUNTS[k] = { date: d, n: 0 }; return COUNTS[k]; };
function lvRank(ws, u) {   // 지금 접속한 사람 중 내 등급보다 높은 사람 수
  let above = 0, total = 0; const me = u.lv || 0;
  for (const r of rooms.concat(rooms3d)) for (const x of r.users.values()) { if (!x.lv) continue; total++; if (x.lv > me) above++; }
  send(ws, { t: "lvRank", above, total, n: me });
}
const pub = u => ({ id: u.id, seat: u.seat, color: u.color, act: u.act, dir: u.dir, pos: u.seat == null ? u.pos : undefined, nick: u.nick, g: u.g, admin: u.admin || undefined, r: u.radio ? 1 : undefined, trip: u.trip || undefined, fc: u.fc != null ? u.fc : undefined, sl: u.sl ? 1 : undefined, sk: u.sk || undefined, lv: u.lv || undefined, tn: u.tn || undefined });
function send(ws, msg) { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function broadcast(room, msg, except) {
  const s = JSON.stringify(msg);
  for (const u of room.users.values()) if (u.ws !== except && u.ws.readyState === 1) u.ws.send(s);
}
function sendCounts() {
  const t = total();
  rollDay(); const today = day.people.size;   // 👥 지금 접속(01·02 합계) · 오늘(한국 시간 0시부터) 다녀간 사람 수(같은 인터넷 주소는 1명)
  for (const r of [...rooms, ...rooms3d]) broadcast(r, { t: "count", room: r.users.size, total: t, today });
}

// ---------- 📻 한강 라디오: 01·02 모두가 같은 곡을 같은 시각에 듣는다(서버 메모리에만) ----------
// 곡 목록 radio.json(직접 만든 곡). 💛 응원 폭죽을 쏜 사람은 신청곡 1곡 + 사연 20자(30분 안에). 신청곡 줄은 6곡까지
const RADIO = JSON.parse(fs.readFileSync(path.join(__dirname, "radio.json"), "utf8"));
const radioJs = fs.readFileSync(path.join(__dirname, "radio.js"), "utf8");
const menuJs = fs.readFileSync(path.join(__dirname, "menu.js"), "utf8");   // ☰ 아래 줄 정리(01·02 공통)
const voiceJs = fs.readFileSync(path.join(__dirname, "voice.js"), "utf8").replace("/*HN_BAD*/[]", JSON.stringify(MIND_BAD)).replace("/*HN_BAD_CHO*/[]", JSON.stringify(MIND_BAD_CHO));   // 💌 우체통·📝 바라는 점(01·02 공통)
const tripJs = fs.readFileSync(path.join(__dirname, "trip.js"), "utf8");
const focusJs = fs.readFileSync(path.join(__dirname, "focus.js"), "utf8");
const skipJs = fs.readFileSync(path.join(__dirname, "skip.js"), "utf8");
const droneJs = fs.readFileSync(path.join(__dirname, "drone.js"), "utf8");
const guestJs = fs.readFileSync(path.join(__dirname, "guest.js"), "utf8");   
const buskJs = fs.readFileSync(path.join(__dirname, "busk.js"), "utf8");
const bubbleJs = fs.readFileSync(path.join(__dirname, "bubble.js"), "utf8");   // 🫧 비눗방울(01·02 공통)
const capsuleJs = fs.readFileSync(path.join(__dirname, "capsule.js"), "utf8");   // ⏳ 미래의 나에게(01·02 공통, 편지는 폰에만)
const ledgerJs = fs.readFileSync(path.join(__dirname, "ledger.js"), "utf8");   // 💛 응원 기록(운영자 전용 카드)
// 💛 응원 기록: 💛 응원 폭죽(sup)마다 한 줄(운영자 시험 제외). 금액은 사용자가 고른 칸(3천·5천·1만)일 뿐 실제 결제 확인은 아님 → 세무는 카카오페이 거래내역이 기준.
// 디스크가 휘발이라 로그 [응원기록] + (환경 변수 SUPABASE_URL·SUPABASE_KEY가 있으면) Supabase hangang_cheers 표에 영구 저장, 시작할 때 다시 읽는다.
const SUP_AMT = { ramen: 3000, chicken: 5000, tangerine: 10000 };
const SB_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, ""), SB_KEY = process.env.SUPABASE_KEY || "", SB_SECRET = process.env.HANGANG_DB_SECRET || (ADMIN_KEY.length >= 8 ? require("crypto").createHash("sha256").update("hangang-db-v1:" + ADMIN_KEY).digest("hex") : "");   // 비밀값은 ADMIN_KEY에서 만들어 서버 밖으로 안 나감. DB는 처음 들어온 값의 해시만 기억(hangang_claim)   // SECRET이 있으면 공개 키 + 비밀값으로만 열리는 함수(hangang_cheer_add/list)로 저장
let supLog = [], supLoaded = !SB_URL, supPersistErr = "";
function supRecord(u, room, f) {
  const x = { at: new Date().toISOString(), ch: room.ch === "3d" ? "02" : "01", nick: String(u.nick || "").slice(0, 20), amt: SUP_AMT[f] || 0, busk: u.busk ? 1 : 0 };
  supLog.push(x); if (supLog.length > 50000) supLog.shift(); console.log("[응원기록] " + JSON.stringify(x));
  if (SB_URL && SB_KEY) fetch(SB_URL + (SB_SECRET ? "/rest/v1/rpc/hangang_cheer_add" : "/rest/v1/hangang_cheers"), { method: "POST", headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(SB_SECRET ? { p_secret: SB_SECRET, p_at: x.at, p_ch: x.ch, p_nick: x.nick, p_amt: x.amt, p_busk: x.busk } : x) })
    .then(r => { if (!r.ok) { supPersistErr = "저장 실패 " + r.status; console.log("[응원기록 저장실패] " + r.status); } else supPersistErr = ""; }).catch(e => { supPersistErr = "저장 실패"; console.log("[응원기록 저장실패] " + e.message); });
}
async function supLoad() {
  if (!SB_URL || !SB_KEY) return;
  if (SB_SECRET) { try { const r = await fetch(SB_URL + "/rest/v1/rpc/hangang_claim", { method: "POST", headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ p_secret: SB_SECRET }) }); const ok = r.ok && (await r.json()) === true;
    if (!ok) { supPersistErr = "DB 비밀값이 맞지 않아요(ADMIN_KEY를 바꿨다면 hangang_secret 줄을 지워야 해요)"; console.log("[응원기록 연결실패] 비밀값 불일치 " + r.status); return; } console.log("[응원기록] DB 연결됨"); } catch (e) { supPersistErr = "DB 연결 실패"; console.log("[응원기록 연결실패] " + e.message); return; } }
  try { let all = [], from = 0; for (;;) { const H = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, Range: from + "-" + (from + 999) }, r = SB_SECRET ? await fetch(SB_URL + "/rest/v1/rpc/hangang_cheer_list?select=at,ch,nick,amt,busk", { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify({ p_secret: SB_SECRET }) }) : await fetch(SB_URL + "/rest/v1/hangang_cheers?select=at,ch,nick,amt,busk&order=at.asc", { headers: H }); if (!r.ok) throw new Error("HTTP " + r.status); const a = await r.json(); all = all.concat(a); if (a.length < 1000) break; from += 1000; }
    supLog = all.concat(supLog.filter(x => !all.some(y => y.at === x.at && y.nick === x.nick))); supLoaded = true; console.log("[응원기록] 불러옴 " + all.length + "건");
  } catch (e) { supPersistErr = "불러오기 실패"; console.log("[응원기록 불러오기실패] " + e.message); }
}
supLoad();
function supReport() {
  const kd = t => new Date(new Date(t).getTime() + 9 * 3600e3).toISOString().slice(0, 10), today = kstDate(), now = Date.now();
  const sum = arr => ({ n: arr.length, amt: arr.reduce((a, x) => a + (x.amt || 0), 0), people: new Set(arr.map(x => x.nick)).size });
  const wk = kd(now - 6 * 864e5), mo = today.slice(0, 7);
  const days = {}; for (const x of supLog) { const d = kd(x.at); (days[d] = days[d] || []).push(x); }
  const byDay = Object.keys(days).sort().reverse().slice(0, 31).map(d => ({ d, ...sum(days[d]) }));
  const byMonth = {}; for (const x of supLog) { const m = kd(x.at).slice(0, 7); (byMonth[m] = byMonth[m] || []).push(x); }
  return { t: "supLog", today: sum(days[today] || []), week: sum(supLog.filter(x => kd(x.at) >= wk)), month: sum(supLog.filter(x => kd(x.at).startsWith(mo))), total: sum(supLog),
    byDay, byMonth: Object.keys(byMonth).sort().reverse().slice(0, 12).map(m => ({ m, ...sum(byMonth[m]) })), recent: supLog.slice(-30).reverse(),
    first: supLog[0] ? supLog[0].at : null, persist: !!(SB_URL && SB_KEY), loaded: supLoaded, err: supPersistErr };
}
const calmJs = fs.readFileSync(path.join(__dirname, "calm.js"), "utf8");   // 🧘 화면 쉬기(01·02 공통)
const streakJs = fs.readFileSync(path.join(__dirname, "streak.js"), "utf8");   // 🔥 연속 출석 선물(01·02 공통)
const hgiJs = fs.readFileSync(path.join(__dirname, "hgi.js"), "utf8");   // 🐶 같이 키우는 한강이(01·02 공통)
// 🐶 한강이: 01·02 모두가 같이 돌보는 강아지. 새벽 5시에 아기로 다시 태어나 하룻밤 사이에 자란다(메모리만).
// 밥(IP당 10분 1번, +3)·쓰다듬기(1분 1번, +1)·공놀이(5분 1번, +2). 💛 응원 = 이름 붙은 특별 간식(+15). 배고픔은 1분에 1씩 오르고 밥이 30 내린다.
const HG_STAGE = [[0, "아기"], [30, "꼬마"], [90, "개구쟁이"], [180, "듬직이"], [320, "한강 지킴이"]];
const HG_CD = { feed: 600e3, pet: 60e3, ball: 300e3 }, HG_XP = { feed: 3, pet: 1, ball: 2 };
let hg = null; const hgIp = new Map();
function hgDay() { const d = new Date(Date.now() + 4 * 3600e3).toISOString().slice(0, 10); if (!hg || hg.date !== d) { if (hg && hg.xp) console.log("[한강이] 지난 하루 " + hg.xp + "점 · 도운 사람 " + hg.who.size); hg = { date: d, xp: 0, hunger: 40, at: Date.now(), who: new Set(), helpers: [], treats: [], feed: 0, pet: 0, ball: 0 }; hgIp.clear(); }
  const now = Date.now(), mins = Math.floor((now - hg.at) / 60e3); if (mins > 0) { hg.hunger = Math.min(100, hg.hunger + mins); hg.at += mins * 60e3; } return hg; }
const hgStage = xp => { let i = 0; for (let k = 0; k < HG_STAGE.length; k++) if (xp >= HG_STAGE[k][0]) i = k; return i; };
const hgPub = () => { hgDay(); const st = hgStage(hg.xp), nx = HG_STAGE[st + 1]; return { xp: hg.xp, st, name: HG_STAGE[st][1], next: nx ? nx[0] : 0, base: HG_STAGE[st][0], hunger: hg.hunger, helpers: hg.helpers.slice(-8), treats: hg.treats.slice(-6), n: hg.who.size, feed: hg.feed, pet: hg.pet, ball: hg.ball }; };
function hgAdd(u, k, xp, label) { const before = hgStage(hg.xp); hg.xp += xp; hg[k] = (hg[k] || 0) + 1; if (!u.admin) hg.who.add(u.id);
  const nick = u.admin ? u.nick + "(운영자)" : u.nick; hg.helpers = hg.helpers.filter(n => n !== nick).concat(nick).slice(-8);
  const after = hgStage(hg.xp); if (after > before) console.log("[한강이] " + HG_STAGE[after][1] + "로 자람 " + hg.xp + "점");
  const msg = { t: "hgS", s: hgPub(), ev: { k, nick, grow: after > before ? HG_STAGE[after][1] : undefined, label } }; for (const r of allRooms()) broadcast(r, msg); }
const placeJs = fs.readFileSync(path.join(__dirname, "place.js"), "utf8");   // 🎨 한강 픽셀 전광판(01·02 공통)
// 🎨 픽셀 전광판: 32×20 칸을 01·02 모두가 같이 칠한다(r/place처럼). 한 사람(IP) 12초에 1칸, 운영자는 제한 없음·전체 지우기. 메모리만(재시작·매일 새벽 5시에 새 판)
const PL_W = 32, PL_H = 20, PL_CD = 12000, PL_COLORS = 16;
let pl = { cells: "0".repeat(PL_W * PL_H), nicks: new Array(PL_W * PL_H).fill(""), date: "", n: 0, who: new Set() };
const plIp = new Map();
function plDay() { const d = new Date(Date.now() + 4 * 3600e3).toISOString().slice(0, 10); if (pl.date !== d) { if (pl.date && pl.n) console.log("[픽셀] 지난 판 " + pl.n + "칸 · " + pl.who.size + "명"); pl = { cells: "0".repeat(PL_W * PL_H), nicks: new Array(PL_W * PL_H).fill(""), date: d, n: 0, who: new Set() }; } return pl; }
const plPub = () => { plDay(); return { w: PL_W, h: PL_H, cd: PL_CD, cells: pl.cells, nicks: pl.nicks, n: pl.n }; };
const STATIC = {};   // 93차 이후 파일들: 시작할 때 읽어 둔다
for (const [u, f, ct] of [["/tarot.js", "tarot.js"], ["/level.js", "level.js"], ["/app.js", "app.js"], ["/fortune.js", "fortune.js"], ["/type.js", "type.js"], ["/sw.js", "sw.js"],
  ["/manifest.webmanifest", "manifest.webmanifest", "application/manifest+json"], ["/app/icon-180.png", "app/icon-180.png", "image/png"], ["/app/icon-192.png", "app/icon-192.png", "image/png"], ["/app/icon-512.png", "app/icon-512.png", "image/png"]]) {
  try { const bin = /png$/.test(f); STATIC[u] = { body: fs.readFileSync(path.join(__dirname, f), bin ? undefined : "utf8"), ct: ct || "text/javascript; charset=utf-8", bin }; } catch (e) { console.log("[static 없음]", f); }
}
const storyJs = fs.readFileSync(path.join(__dirname, "story.js"), "utf8");
const missionJs = fs.readFileSync(path.join(__dirname, "mission.js"), "utf8");
const gameJs = fs.readFileSync(path.join(__dirname, "game.js"), "utf8");   // ✊ 둘이 하는 놀이(01·02 공통)   // ✅ 오늘 밤 할 일(01·02 공통)   // 📖 한강, 열두 밤(01·02 공통, 누를 때만 받음)
const benchJs = fs.readFileSync(path.join(__dirname, "bench.js"), "utf8");   // 💛 고마운 벤치(01·02 공통)
const nightJs = fs.readFileSync(path.join(__dirname, "night.js"), "utf8");   // 🌙 오늘 밤 카드(01·02 공통)
const quizJs = fs.readFileSync(path.join(__dirname, "quiz.js"), "utf8");   // 🎯 한강 라이브 퀴즈(01·02 공통)
const QUIZ = JSON.parse(fs.readFileSync(path.join(__dirname, "quiz.json"), "utf8"));   // 문제 은행(정답이 있어 공개 안 함)
const truckJs = fs.readFileSync(path.join(__dirname, "truck.js"), "utf8");
const delivJs = fs.readFileSync(path.join(__dirname, "deliv.js"), "utf8"), marketJs = fs.readFileSync(path.join(__dirname, "market.js"), "utf8"), tentJs = fs.readFileSync(path.join(__dirname, "tent.js"), "utf8");   // 79차 🛵 치킨 배달 · 🏮 야시장 · ⛺ 그늘막(01·02 공통)   // 🚚 분식 트럭(01·02 공통)
const wxJs = fs.readFileSync(path.join(__dirname, "wx.js"), "utf8");   // 🌦 진짜 한강 날씨(01·02 공통)
const storeJs = fs.readFileSync(path.join(__dirname, "store.js"), "utf8");   // 🏪 편의점·한강라면(01·02 공통)
const subwayJs = fs.readFileSync(path.join(__dirname, "subway.js"), "utf8");   // 🚇 지하철 시점(01·02 공통)
const trainJs = fs.readFileSync(path.join(__dirname, "train.js"), "utf8");   // 🚂 응원 열차(01·02 공통)
const sleepJs = fs.readFileSync(path.join(__dirname, "sleep.js"), "utf8");   // 🌙 한강에서 잠들기(01·02 공통)   // 🎸 버스킹 구역(01·02 공통)
const BUSK = JSON.parse(fs.readFileSync(path.join(__dirname, "busk.json"), "utf8"));   // 직접 만든 버스킹 곡(CC0 악기 샘플, tools/busk-render.py)   // 🐾 한강 손님(01·02 공통)   // 🛸 게이지·드론쇼(01·02 공통)   // 🪨 물수제비(01·02 공통)   // 🌱 같이 집중(01·02 공통)
const roamJs = fs.readFileSync(path.join(__dirname, "roam.js"), "utf8");   // 🚶 75차
const parkJs = fs.readFileSync(path.join(__dirname, "park.js"), "utf8"), parkGlJs = fs.readFileSync(path.join(__dirname, "parkgl.js"), "utf8");   // 🗺 한강 오픈월드(01·02 공통)
// 🗺 오픈월드: 01·02 모두가 같은 한강(여의도~반포)에 있다. 위치는 메모리에만, 0.8초마다 오픈월드에 있는 사람끼리만 주고받는다
const pkUsers = () => allRooms().flatMap(r => [...r.users.values()]).filter(u => u.pk && Date.now() - u.pk.at < 20000);
setInterval(() => {
  const us = pkUsers(); if (!us.length) return;
  const s = JSON.stringify({ t: "pkN", n: us.length, p: us.slice(0, 60).map(u => [u.id, u.nick, u.pk.x, u.pk.z, u.pk.a, u.pk.m, u.pk.o || 0]) });
  for (const u of us) if (u.ws.readyState === 1) u.ws.send(s);
}, 800);
const tripGlJs = fs.readFileSync(path.join(__dirname, "tripgl.js"), "utf8");   // 3D(WebGL) 화면
const skyFiles = { "/sky-stars.json": fs.readFileSync(path.join(__dirname, "sky-stars.json")), "/sky-mw.webp": fs.readFileSync(path.join(__dirname, "sky-mw.webp")) };
const addonCache = {};   // 🚢 유람선 · 🗼 남산타워 시점(01·02 공통)

// 🚢🗼 누가 유람선·남산타워에 있는지(01·02 합쳐서). 바뀌면 1초 모았다가 모두에게
let tripTimer = null;
const tripInfo = () => { const all = [...rooms, ...rooms3d].flatMap(r => [...r.users.values()]), c = all.filter(u => u.trip === "cruise"), w = all.filter(u => u.trip === "tower"), y = all.filter(u => u.trip === "sky63"), l = all.filter(u => u.trip === "sky123"), gg = all.filter(u => u.trip === "lounge");
  return { t: "tripN", cn: c.length, c: c.slice(0, 8).map(u => u.nick), wn: w.length, w: w.slice(0, 8).map(u => u.nick), sn: y.length, s: y.slice(0, 8).map(u => u.nick), ln: l.length, l: l.slice(0, 8).map(u => u.nick), gn: gg.length, g: gg.slice(0, 8).map(u => u.nick) }; };
const tripChanged = () => { if (tripTimer) return; tripTimer = setTimeout(() => { tripTimer = null; const m = tripInfo(); for (const r of [...rooms, ...rooms3d]) broadcast(r, m); }, 1000); };
// 💛 오늘 응원해 준 사람 이름(01·02 합쳐서, 중복 없이 최대 30명): 유람선·남산타워 전광판과 마주 오는 배 현수막에 뜬다
const supDay = { date: "", list: [] };
const supToday = () => { if (supDay.date !== kstDate()) { supDay.date = kstDate(); supDay.list = []; } return supDay.list; };
// 💌 전광판 사연: 쓰면 바로 순서대로 올라가 24시간(42차부터 운영자 확인·번호·가격 없음, 후원은 자율). 운영자는 내리기·바로 띄우기만
// 디스크가 휘발이라 메모리 + 로그([전광판게시])에만 남긴다. BB_PRICE 환경 변수는 이제 쓰지 않는다
const BB_PRICE = (process.env.BB_PRICE || "").slice(0, 20);
const BB_LIFE = 24 * 3600e3, bb = { pend: [], live: [] }, bbIp = new Map();
const bbLive = () => { const now = Date.now(); bb.live = bb.live.filter(x => x.until > now); return bb.live.map(x => ({ id: x.id, text: x.text, by: x.by, until: x.until })); };
const bbAll = () => { const m = { t: "bb", live: bbLive() }; for (const r of [...rooms, ...rooms3d]) broadcast(r, m); };
const bbAdmins = () => { const m = { t: "bbPend", list: bb.pend }; for (const r of [...rooms, ...rooms3d]) for (const o of r.users.values()) if (o.admin) send(o.ws, m); };
const contactLike = t => /(\d[\s.-]?){8,}|https?:|www\.|\.(com|kr|net|io)\b|카톡|오픈채팅|open\.kakao|@\w{3,}/i.test(t);
const RADIO_GAP = 2500, REQ_MAX = 6;
const reqDay = { date: "", n: {} };   // 오늘(한국 날짜) 곡별 신청 수 → 🏆 오늘 인기 신청곡
const reqTop = () => reqDay.date === kstDate() ? Object.entries(reqDay.n).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([i, n]) => ({ i: +i, n })) : [];
const radio = { i: Math.floor(Math.random() * RADIO.length), at: Date.now(), by: null, msg: null, q: [], timer: null };
const allRooms = () => [...rooms, ...rooms3d];
const radioListeners = () => { let n = 0; for (const r of allRooms()) for (const u of r.users.values()) if (u.radio) n++; return n; };
const radioPub = extra => ({ t: "radio", i: radio.i, at: radio.at, by: radio.by || undefined, msg: radio.msg || undefined, q: radio.q.map(x => ({ i: x.i, by: x.by })), top: reqTop(), n: radioListeners(), now: Date.now(), ...extra });
function radioAll(extra) { const msg = radioPub(extra); for (const r of allRooms()) broadcast(r, msg); }
function radioNext() {
  const nx = radio.q.shift();
  if (nx) { radio.i = nx.i; radio.by = nx.by; radio.msg = nx.msg; console.log("[신청곡] " + nx.by + " " + RADIO[nx.i].title); }
  else { radio.i = (radio.i + 1) % RADIO.length; radio.by = radio.msg = null; }
  radio.at = Date.now() + RADIO_GAP; radioPlan(); radioAll();
}
function radioPlan() { clearTimeout(radio.timer); radio.timer = setTimeout(radioNext, Math.max(1000, radio.at + RADIO[radio.i].len * 1000 - Date.now())); }
radio.at = Date.now() - Math.random() * RADIO[radio.i].len * 600; radioPlan();   // 서버가 켜지면 아무 곡 중간부터
let radioNT = null;
// 🌱 같이 집중: 지금 집중 중인 사람 수(01·02 합계)와 오늘 다 같이 심은 나무 수
const TRAIN_GAP = 15 * 60e3, train = { n: 0, until: 0, nicks: [] };   // 🚂 응원 열차: 15분 안에 응원이 이어지면 칸이 붙음(01·02 합산)
const trainPub = () => ({ n: Date.now() < train.until ? train.n : 0, left: Math.max(0, train.until - Date.now()), nicks: Date.now() < train.until ? train.nicks : [] });
let wx = null;   // 🌦 여의도 실제 날씨(Open-Meteo, 무료·키 없음, CC BY 4.0). 10분마다. 테스트: WEATHER_MOCK="61,8.5,12"(코드,기온,바람)
async function fetchWx() {
  try {
    let n;
    if (process.env.WEATHER_MOCK) { const [c, tt, w] = process.env.WEATHER_MOCK.split(",").map(Number); n = { code: c, temp: tt, wind: w || 0 }; }
    else { if (typeof fetch !== "function") return; const r = await fetch("https://api.open-meteo.com/v1/forecast?latitude=37.528&longitude=126.932&current=temperature_2m,weather_code,wind_speed_10m&timezone=Asia%2FSeoul", { signal: AbortSignal.timeout(8000) }); if (!r.ok) return; const j = await r.json(); const c = j.current || {}; if (c.weather_code == null) return; n = { code: c.weather_code, temp: c.temperature_2m, wind: c.wind_speed_10m }; }
    const changed = !wx || wx.code !== n.code || Math.round(wx.temp) !== Math.round(n.temp);
    wx = { ...n, at: Date.now() };
    if (changed) { console.log("[날씨] " + JSON.stringify(n)); const msg = { t: "wx", ...wx }; for (const r of allRooms()) broadcast(r, msg); }
  } catch (e) { console.log("[날씨실패] " + (e && e.message)); }
}
setTimeout(fetchWx, 3000); setInterval(fetchWx, 10 * 60e3);
// 🎯 한강 라이브 퀴즈: 매시 30분(KST)에 5문제, 01·02 모두 같이. 문제당 12초 + 정답 공개 4초. HQ Trivia식 '정해진 시각' 약속
const QZ_N = 5, QZ_ASK = 12000, QZ_SHOW = 4000, QZ_ANS_MAX = QZ_ASK + 600;
const qz = { on: false, hour: "", i: -1, list: [], ans: new Map(), score: new Map(), timer: null, used: { date: "", s: new Set() }, last: null };
const qzAll = m => { for (const r of allRooms()) broadcast(r, m); };
function qzStart(byAdmin) {
  if (qz.on) return; const d = kstDate(); if (qz.used.date !== d) { qz.used.date = d; qz.used.s = new Set(); }
  let pool = QUIZ.map((_, i) => i).filter(i => !qz.used.s.has(i)); if (pool.length < QZ_N) { qz.used.s = new Set(); pool = QUIZ.map((_, i) => i); }
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  qz.list = pool.slice(0, QZ_N); qz.list.forEach(i => qz.used.s.add(i)); qz.on = true; qz.i = -1; qz.score = new Map(); qz.test = !!byAdmin;
  console.log("[퀴즈] 시작" + (byAdmin ? " (운영자 시험)" : "")); qzAll({ t: "qzStart", n: QZ_N, at: Date.now() + 5000, test: qz.test });
  qz.timer = setTimeout(qzNext, 5000);
}
function qzNext() {
  qz.i++; if (qz.i >= QZ_N) return qzEnd();
  const [q, o] = QUIZ[qz.list[qz.i]]; qz.ans = new Map(); qz.askAt = Date.now();
  qzAll({ t: "qzQ", i: qz.i, n: QZ_N, q, o, ends: Date.now() + QZ_ASK });
  qz.timer = setTimeout(qzReveal, QZ_ASK);
}
function qzReveal() {
  const c = QUIZ[qz.list[qz.i]][2], cnt = [0, 0, 0, 0];
  for (const [k, v] of qz.ans) { cnt[v.a]++; if (v.a === c) { const s = qz.score.get(k) || { nick: v.nick, ok: 0, ms: 0 }; s.ok++; s.ms += v.ms; s.nick = v.nick; qz.score.set(k, s); } }
  qzAll({ t: "qzR", i: qz.i, c, cnt });
  qz.timer = setTimeout(qzNext, QZ_SHOW);
}
function qzEnd() {
  const top = [...qz.score.values()].sort((a, b) => b.ok - a.ok || a.ms - b.ms).slice(0, 5).map(s => ({ nick: s.nick, ok: s.ok }));
  const perfect = [...qz.score.values()].filter(s => s.ok === QZ_N).length;
  qz.on = false; qz.last = { top, perfect, at: Date.now() }; if (!qz.test) { day.qz = (day.qz || 0) + 1; day.qzp = (day.qzp || 0) + qz.score.size; }
  console.log("[퀴즈] 끝 · 맞힌 사람 " + qz.score.size + " · 만점 " + perfect + (top[0] ? " · 1등 " + top[0].nick : ""));
  qzAll({ t: "qzEnd", top, perfect, n: QZ_N, next: qzNextAt() });
}
const qzNextAt = () => { const k = new Date(Date.now() + 9 * 3600e3); const m = k.getUTCMinutes(), s = k.getUTCSeconds(); let add = (30 - m) * 60 - s; if (add <= 0) add += 3600; return Date.now() + add * 1000; };
setInterval(() => {
  const k = new Date(Date.now() + 9 * 3600e3), key = k.toISOString().slice(0, 13);
  if (k.getUTCMinutes() === 29 && k.getUTCSeconds() < 10 && qz.warn !== key) { qz.warn = key; qzAll({ t: "qzSoon", at: qzNextAt() }); }
  if (k.getUTCMinutes() === 30 && qz.hour !== key && !qz.on) { qz.hour = key; if (allRooms().some(r => r.users.size)) qzStart(false); }
}, 5000);
let slNT = null;   // 🌙 지금 잠든 사람 수(01·02 합산)·오늘 잠든 사람 수
const slPub = () => { let n = 0; for (const r of allRooms()) for (const u of r.users.values()) if (u.sl) n++; return { t: "slN", n, today: day.sl ? day.sl.s : 0 }; };
const slCount = () => { if (slNT) return; slNT = setTimeout(() => { slNT = null; const msg = slPub(); for (const r of allRooms()) broadcast(r, msg); }, 1500); };
let fcNT = null;
const fcPub = () => { let n = 0; for (const r of allRooms()) for (const u of r.users.values()) if (u.fc != null) n++; return { t: "fcN", n, trees: day.fc ? day.fc.d : 0 }; };
const fcCount = () => { if (fcNT) return; fcNT = setTimeout(() => { fcNT = null; const msg = fcPub(); for (const r of allRooms()) broadcast(r, msg); }, 1500); };
// 🛸 오늘의 한강 게이지(01·02 합계): 낚시·물수제비·폭죽·짠·나무·같이 집중·5분 머무르기·응원이 쌓이고, 다 차면 모두의 하늘에 드론쇼.
// 한 사람이 한 판에 넣을 수 있는 점수는 40점까지(응원 제외). 운영자 점수는 안 들어가고 운영자는 바로 띄우기로 시험.
const DRONE_LEN = 52000;
const gauge = { p: 0, g: 150, r: 1, by: new Set(), showUntil: 0, shows: 0 };
let gaugeT = null;
const gaugeGoal = () => Math.max(120, Math.min(500, 60 + total() * 6));
const gaugePub = () => ({ t: "gauge", p: Math.min(gauge.p, gauge.g), g: gauge.g, r: gauge.r, n: gauge.by.size, show: gauge.showUntil > Date.now() ? gauge.showUntil : undefined });
const gaugeAll = () => { if (gaugeT) return; gaugeT = setTimeout(() => { gaugeT = null; const m = gaugePub(); for (const r of allRooms()) broadcast(r, m); }, 2000); };
function droneShow(byAdmin) {
  const now = Date.now(), n = gauge.by.size;
  gauge.showUntil = now + 6000 + DRONE_LEN; gauge.shows++;
  if (!byAdmin) { console.log("[드론쇼] " + gauge.r + "번째 · " + n + "명 · 목표 " + gauge.g); day.dr = (day.dr || 0) + 1; }
  const m = { t: "drone", at: now + 6000, n: byAdmin ? Math.max(n, 1) : n, r: gauge.r, s: Math.floor(Math.random() * 1e9), test: byAdmin || undefined };
  for (const r of allRooms()) broadcast(r, m);
  if (!byAdmin) { gauge.r++; gauge.p = 0; gauge.by = new Set(); gauge.g = gaugeGoal(); }
  gaugeAll();
}
function gaugeAdd(u, pts, free) {
  if (u.admin || gauge.showUntil > Date.now()) return;
  if (u.gR !== gauge.r) { u.gR = gauge.r; u.gP = 0; }
  if (!free) { if (u.gP >= 40) return; pts = Math.min(pts, 40 - u.gP); }
  u.gP += pts; gauge.p += pts; gauge.by.add(u.id);
  if (gauge.p >= gauge.g) droneShow(); else gaugeAll();
}
setInterval(() => { const now = Date.now(); for (const r of allRooms()) for (const u of r.users.values()) { u.stayM = (u.stayM || 0) + 1; if (u.stayM % 5 === 0) gaugeAdd(u, 1); } }, 60000);   // 5분 머무를 때마다 1점
// 🎸 버스킹 구역: 01·02가 같은 무대 하나를 본다. 곡 순서·시작 시각은 서버가 정하고(라디오와 같은 방식), 곡 사이 9초는 버스커 멘트.
// 박수(무료)·신청곡(무료, 한 사람 10분에 1곡, 줄 5곡)·💛 응원(구역 안에서 쏘면 기타 케이스에 하트가 들어감).
const BUSK_GAP = 9000;
const busk = { i: Math.floor(Math.random() * BUSK.length), at: Date.now(), q: [], by: null, timer: null, claps: 0, sups: 0, date: "", clapBuf: 0, clapT: null, songs: 0 };
const buskAud = () => { const a = []; for (const r of allRooms()) for (const u of r.users.values()) if (u.busk) a.push(u); return a; };
const buskDay = () => { if (busk.date !== kstDate()) { busk.date = kstDate(); busk.claps = 0; busk.sups = 0; } };
const buskPub = () => { buskDay(); const a = buskAud(); return { t: "busk", i: busk.i, at: busk.at, by: busk.by || undefined, q: busk.q.map(x => ({ i: x.i, by: x.by })), n: a.length, aud: a.slice(0, 40).map(u => ({ id: u.id, nick: u.nick, g: u.g })), claps: busk.claps, sups: busk.sups, songs: busk.songs, now: Date.now() }; };
const buskSend = m => { for (const u of buskAud()) send(u.ws, m); };
let buskPT = null; const buskAll = () => { if (buskPT) return; buskPT = setTimeout(() => { buskPT = null; buskSend(buskPub()); const m = { t: "bkN", n: buskAud().length }; for (const r of allRooms()) broadcast(r, m); }, 600); };
function buskNext() {
  const nx = busk.q.shift(); busk.songs++;
  if (nx) { busk.i = nx.i; busk.by = nx.by; } else { busk.i = (busk.i + 1) % BUSK.length; busk.by = null; }
  busk.at = Date.now() + BUSK_GAP; buskPlan(); buskSend(buskPub());
}
function buskPlan() { clearTimeout(busk.timer); busk.timer = setTimeout(buskNext, Math.max(1000, busk.at + BUSK[busk.i].len * 1000 - Date.now())); }
busk.at = Date.now() - Math.random() * BUSK[busk.i].len * 500; buskPlan();
// 🪨 물수제비 오늘(한국 시간) 1~5위: 한 사람(닉네임) 최고 기록만, 운영자 제외. 메모리에만
let skipB = { date: "", top: [] };
const skipTop = () => { if (skipB.date !== kstDate()) skipB = { date: kstDate(), top: [] }; return skipB.top; };
const radioCount = () => { if (radioNT) return; radioNT = setTimeout(() => { radioNT = null; const msg = { t: "radioN", n: radioListeners() }; for (const r of allRooms()) broadcast(r, msg); }, 2000); };

const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 8192 });   // 운영자 긴 글 때문에 넉넉히, 일반 사용자는 아래에서 256바이트로 자른다
// 운영자 글(말풍선·공지)은 길이 제한 없이(안전상 2000자), 줄바꿈은 살리고 제어 문자만 뺀다
const ADMIN_TEXT_MAX = 2000;
const freeText = raw => typeof raw !== "string" ? "" : [...raw.normalize("NFC").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, "").replace(/\n{3,}/g, "\n\n")].slice(0, ADMIN_TEXT_MAX).join("").trim();
// ✊ 둘이 하는 놀이: 가위바위보(rps)·참참참(ccc). 둘 다 고르면 판정, 먼저 2판 이기면 끝(최대 9판). 메모리에만
function gmRound(g, room) {
  const pa = g.p[g.a], pb = g.p[g.b]; let win = 0;
  if (g.k === "rps") { if (pa !== pb) win = (pb - pa + 3) % 3 === 1 ? g.a : g.b; }   // 0 바위 · 1 가위 · 2 보
  else { const att = g.n % 2 === 0 ? g.a : g.b, def = att === g.a ? g.b : g.a; win = g.p[att] === g.p[def] ? att : def; }   // 공격과 같은 쪽으로 고개를 돌리면 공격 승
  g.n++; if (win) g.sc[win]++; g.p = {}; g.at = Date.now();
  const msg = { t: "gmRes", pa, pb, win, sc: [g.sc[g.a], g.sc[g.b]], n: g.n };
  for (const id of [g.a, g.b]) { const x = room.users.get(id); if (x) send(x.ws, msg); }
  if (g.sc[g.a] >= 2 || g.sc[g.b] >= 2 || g.n >= 9) { g.fin = 1; setTimeout(() => gmEnd(g, room, {}), 1600); }
}
function gmEnd(g, room, why) {
  if (g.over) return; g.over = 1; clearInterval(g.timer);
  const A = room.users.get(g.a), B = room.users.get(g.b); if (A && A.gm === g) A.gm = null; if (B && B.gm === g) B.gm = null;
  const win = why.cancel ? 0 : why.quit ? (why.quit === g.a ? g.b : g.a) : g.sc[g.a] > g.sc[g.b] ? g.a : g.sc[g.b] > g.sc[g.a] ? g.b : 0;
  const msg = { t: "gmEnd", a: g.a, b: g.b, k: g.k, win, sc: [g.sc[g.a], g.sc[g.b]], quit: why.quit, cancel: why.cancel ? 1 : undefined };
  for (const x of [A, B]) if (x) send(x.ws, msg);
  if (win && room.users.has(win)) broadcast(room, { t: "emo", id: win, e: "✨" });   // 이긴 사람 머리 위 반짝(방 모두에게)
}
let lastNotice = null;   // 운영자 공지: 메모리에만, 10분 동안 새로 들어온 사람에게도 보여 준다
wss.on("connection", (ws, req) => {
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  if ((ips.get(ip) || 0) >= PER_IP) { send(ws, { t: "full", why: "ip" }); return ws.close(); }
  const ch = /[?&]ch=3d\b/.test(req.url) ? "3d" : "";
  let byNick = ""; try { byNick = decodeURIComponent((/[?&]by=([^&]{1,120})/.exec(req.url) || [])[1] || "").slice(0, 20); } catch {}
  const inviterOf = () => { if (!byNick) return null; for (const r of (ch === "3d" ? rooms3d : rooms)) for (const o of r.users.values()) if (o.nick === byNick) return [r, o]; return null; };
  const inv0 = inviterOf();   // 👫 친구 부르기 링크(?by=부른 사람 닉네임): 부른 사람이 지금 있는 방으로(서버가 재시작돼 방 번호가 바뀌어도)
  const room = pickRoom(ch, inv0 ? inv0[0].no : +((/[?&]with=(\d{1,2})(?:&|$)/.exec(req.url) || [])[1] || 0));
  if (!room) { send(ws, { t: "full", why: "rooms" }); return ws.close(); }
  ips.set(ip, (ips.get(ip) || 0) + 1);
  rollDay();
  const from = (/[?&]from=([\w-]{1,20})/.exec(req.url) || [, "direct"])[1], since = Date.now();
  day.visits++; if (/[?&]rv=1(?:&|$)/.test(req.url)) day.back++; day.people.add(ipKey(ip)); day.sources[from] = (day.sources[from] || 0) + 1;

  const u = { id: nextId++, seat: null, color: COLORS[Math.floor(Math.random() * COLORS.length)], ws, lastEmo: 0, lastSit: 0, act: "sit", dir: "river", lastDir: 0, lastAct: 0, lastFw: 0, lastNick: 0, nick: null };
  let asked = null; try { asked = decodeURIComponent((/[?&]nick=([^&]{1,120})/.exec(req.url) || [])[1] || ""); } catch {}
  let key = null; try { key = decodeURIComponent((/[?&]admin=([^&]{1,200})/.exec(req.url) || [])[1] || ""); } catch {}
  u.admin = isAdminKey(key);
  u.g = (/[?&]g=([mf])(?:&|$)/.exec(req.url) || [])[1];   // 캐릭터 성별(남 m·여 f, 없으면 선택 안 함)
  u.nick = (u.admin ? cleanNick(asked, "free", 12) : cleanNick(asked)) || randNick();   // 운영자 닉네임은 12자까지, 거르지 않음
  const inv = inv0 && inv0[0] === room && room.users.has(inv0[1].id) && inv0[1].nick !== u.nick ? inv0[1] : null;
  room.users.set(u.id, u);
  ws.alive = true;
  send(ws, { t: "init", you: u.id, admin: u.admin, letters: u.admin ? feedback.length : undefined, notice: lastNotice && Date.now() - lastNotice.at < 600000 ? lastNotice.text : undefined, adminHere: adminHere(room) || u.admin, room: room.no, cap: CAP, emojis: EMOJIS, cheers: cheersToday(room.ch), done: fbDone, sups: recentSups(room.ch), train: trainPub(), wx: wx || undefined, rmN: day.rm || 0, qz: { next: qzNextAt(), on: qz.on, last: qz.last }, pl: plPub(), hg: hgPub(), tkN: day.tk || 0, slN: { n: slPub().n, today: day.sl ? day.sl.s : 0 }, bb: bbLive(), supDay: supToday().slice(-30), trips: tripInfo(), fishTop: todayFishTop(room.ch), users: [...room.users.values()].map(pub), worries: liveWorries(room).map(w => pubWorry(w, Date.now())), fountain: Date.now() - room.fountainAt < FOUNTAIN_LEN ? (Date.now() - room.fountainAt) / 1000 : null });
  send(ws, radioPub());
  send(ws, fcPub());
  send(ws, { t: "skipTop", top: skipTop() });
  send(ws, gaugePub());
  send(ws, { t: "bkN", n: buskAud().length });
  broadcast(room, { t: "join", user: pub(u) }, ws);
  if (inv) { day.fr = (day.fr || 0) + 1; send(inv.ws, { t: "friendIn", id: u.id, nick: u.nick }); send(ws, { t: "friendOf", id: inv.id, nick: inv.nick }); }   // 👫 서로 친구 표시 + 옆자리 앉기(앉기는 들어온 쪽이 알아서)
  if (u.admin) broadcast(room, { t: "adminHere", on: true, nick: u.nick }, ws);
  sendCounts();
  day.peak = Math.max(day.peak, total());

  ws.on("pong", () => { ws.alive = true; });
  ws.on("message", raw => {
    if (!u.admin && raw.length > 256) return;
    ws.alive = true;
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === "emo" && EMOJIS.includes(m.e)) {
      const now = Date.now();
      if (now - u.lastEmo < EMO_GAP) return;
      u.lastEmo = now;
      broadcast(room, { t: "emo", id: u.id, e: m.e });
    } else if (m.t === "act" && ACTS.includes(m.a) && m.a !== u.act) {
      const now = Date.now();
      if (now - u.lastAct < ACT_GAP) return;
      u.lastAct = now; u.act = m.a;
      broadcast(room, { t: "act", id: u.id, a: u.act });
    } else if (m.t === "dir" && (m.d === "river" || m.d === "front") && m.d !== u.dir) {   // 앉는 방향: 한강 보기 / 정면 보기
      const now = Date.now();
      if (now - u.lastDir < 700) return;
      u.lastDir = now; u.dir = m.d;
      broadcast(room, { t: "dir", id: u.id, d: u.dir });
    } else if (m.t === "admin" && u.admin && (m.do === "fountain" || m.do === "meteor")) {
      // 운영자 버튼: 분수는 쉬는 시간 무시하고 바로, 유성우는 22초
      const now = Date.now();
      if (now - (u.lastAdmin || 0) < 3000) return;
      u.lastAdmin = now;
      if (m.do === "fountain") { room.fountainAt = now; broadcast(room, { t: "fountain" }); }
      else broadcast(room, { t: "meteor" });
    } else if (m.t === "lantern") {
      // 소원 풍선: 한 줄 소원(15자, 욕설·음란어는 글 없이 풍선만). 운영자가 방에 있으면 금빛
      const now = Date.now();
      if (!u.admin && now - (u.lastLantern || 0) < LANTERN_GAP) return;
      u.lastLantern = now;
      const w = !m.w ? "" : u.admin ? cleanNick(m.w, "free", 40) || "" : cleanNick(m.w, true, WISH_MAX) || "";
      broadcast(room, { t: "lantern", id: u.id, w, gold: adminHere(room) || undefined });
    } else if (m.t === "heart" && Number.isInteger(m.to) && m.to !== u.id && room.users.has(m.to)) {
      const now = Date.now();
      if (!u.admin && now - (u.lastHeart || 0) < HEART_GAP) return;
      u.lastHeart = now;
      broadcast(room, { t: "heart", from: u.id, to: m.to, e: EMOJIS.includes(m.e) ? m.e : undefined });
    } else if (m.t === "talk" && Number.isInteger(m.to) && m.to !== u.id && room.users.has(m.to) && typeof m.text === "string") {   // 01·02: 친구에게 말 걸기(30자, 저장 안 함)
      const now = Date.now(); if (!u.admin && now - (u.lastTalk || 0) < 3000) return send(ws, { t: "talkBad", why: "wait" });
      const text = [...freeText(m.text).replace(/\n/g, " ")].slice(0, 30).join("").trim(); if (!text) return;
      if (!u.admin && badText(text)) return send(ws, { t: "talkBad", why: "bad" });
      u.lastTalk = now; broadcast(room, { t: "talk", from: u.id, to: m.to, text });
    } else if (m.t === "catch" && u.act === "fish" && Number.isInteger(m.f) && m.f >= 0 && m.f < 30) {   // 🎣 낚은 것 자랑(모양만, 저장 없음)
      const now = Date.now(); if (now - (u.lastCatch || 0) < 3000) return;
      u.lastCatch = now; day.fish++; gaugeAdd(u, 2);
      const cm = typeof m.cm === "number" && m.cm > 0 && m.cm < 200 ? Math.round(m.cm) : 0;
      if (FISH_MAX[m.f] != null && cm > FISH_MAX[m.f]) return;
      broadcast(room, { t: "catch", id: u.id, f: m.f, cm });
      if (cm) {
        const S = CH[room.ch]; if (S.fishTop.date !== kstDate()) S.fishTop = { date: kstDate(), list: [] }; const fishTop = S.fishTop;
        const L = fishTop.list, old = L.find(x => x.nick === u.nick);
        if (old && old.cm >= cm) return;
        if (L.length >= 5 && cm <= L[L.length - 1].cm && !old) return;
        fishTop.list = L.filter(x => x !== old).concat({ nick: u.nick, f: m.f, cm }).sort((a, b) => b.cm - a.cm).slice(0, 5);
        const rank = fishTop.list.findIndex(x => x.nick === u.nick && x.cm === cm) + 1;
        for (const r of poolOf(room)) broadcast(r, { t: "fishTop", list: fishTop.list, id: u.id, here: r === room, nick: u.nick, f: m.f, cm, rank });
      }
    } else if (m.t === "sup" && u.admin) {   // 👑 운영자 테스트: 결제 없이 써 볼 수 있다. 남에게는 '(운영자)'로 보이고 응원 횟수·정각 이름·오늘의 응원·로그 [응원]에 안 들어간다
      const now = Date.now(); if (now - (u.lastSupT || 0) < 3000) return; u.lastSupT = now;
      const f = ["tangerine", "ramen", "chicken"].includes(m.f) ? m.f : undefined, nick = u.nick + "(운영자)";
      console.log("[운영자테스트] 응원" + (f ? " 한턱 " + f : "") + (room.ch === "3d" ? " 02" : ""));
      if (u.busk) buskSend({ t: "bkSup", nick, sups: busk.sups });
      { const tp = trainPub(), nn = Math.max(2, tp.n + 1); send(ws, { t: "train", test: true, nick, n: nn, left: TRAIN_GAP, nicks: [...(tp.n ? tp.nicks : ["응원"]), nick].slice(-12) }); setTimeout(() => send(ws, { t: "train", ...trainPub() }), 20000); }   // 👑 시험: 나에게만 보이고 실제 열차는 안 바뀜
      for (const r of poolOf(room)) broadcast(r, { t: "sup", id: u.id, nick, admin: true, room: room.no, here: r === room, n: CH[room.ch].cheer.date === kstDate() ? CH[room.ch].cheer.n : 0, s: Math.floor(Math.random() * 1e9), f: r === room ? f : undefined });
      { hgDay(); hg.hunger = Math.max(0, hg.hunger - 50); hgAdd(u, "treat", 15, f || ""); }   // 🐶 운영자 시험 간식
      u.reqAt = now; send(ws, { t: "reqOk" });
    } else if (m.t === "sup") {
      const now = Date.now(); if (now - (cheerIp.get(ip) || 0) < 600000) return send(ws, { t: "supBad" });
      cheerIp.set(ip, now); if (cheerIp.size > 5000) cheerIp.clear();
      const S = CH[room.ch], cheer = S.cheer;
      if (cheer.date !== kstDate()) { cheer.date = kstDate(); cheer.n = 0; } cheer.n++;
      console.log("[응원] " + (room.ch === "3d" ? "02 " : "") + kstDate() + " #" + cheer.n); gaugeAdd(u, 15, true);
      if (u.busk) { buskDay(); busk.sups++; console.log("[버스킹응원] " + u.nick); buskSend({ t: "bkSup", nick: u.nick, sups: busk.sups }); }
      if (now >= train.until) { train.n = 0; train.nicks = []; } train.n++; train.until = now + TRAIN_GAP; train.nicks.push(u.nick); if (train.nicks.length > 12) train.nicks.shift();
      if (train.n >= 2) { console.log("[응원열차] " + train.n + "칸"); day.trMax = Math.max(day.trMax || 0, train.n); }
      { const msg = { t: "train", nick: u.nick, ...trainPub() }; for (const r of allRooms()) broadcast(r, msg); }
      S.supRecent.push({ nick: u.nick, at: now }); if (S.supRecent.length > 50) S.supRecent.shift();
      const f = ["tangerine", "ramen", "chicken"].includes(m.f) ? m.f : undefined;   // 🍜 한턱
      supRecord(u, room, f);   // 💛 응원 기록(운영자 카드·세무 참고용): 같은 방 모두에게 간식(고른 금액 칩 기준, 결제 확인은 안 함)
      if (f) console.log("[한턱] " + f + " " + (room.users.size - 1) + "명");
      for (const r of poolOf(room)) broadcast(r, { t: "sup", id: u.id, nick: u.nick, room: room.no, here: r === room, n: cheer.n, s: Math.floor(Math.random() * 1e9), f: r === room ? f : undefined });
      u.reqAt = now; send(ws, { t: "reqOk" });   // 📻 고마움의 표시: 신청곡 1곡(30분 안에)
      const sl = supToday(); if (!sl.includes(u.nick)) { sl.push(u.nick); if (sl.length > 30) sl.shift(); }
      { hgDay(); hg.hunger = Math.max(0, hg.hunger - 50); hg.treats = hg.treats.concat(u.nick).slice(-12); hgAdd(u, "treat", 15, f || ""); }   // 🐶 응원 = 한강이 특별 간식
      if (room.ch === "3d") for (const r of rooms) broadcast(r, { t: "supName", nick: u.nick }); else for (const r of rooms3d) broadcast(r, { t: "supName", nick: u.nick });
    } else if (m.t === "pk") {   // 🗺 오픈월드 내 위치(x 강 가로, z 강 따라, a 방향, m 0 걷기 1 자전거 2 오리배)
      const now = Date.now(); if (now - (u.pkAt || 0) < 250) return; u.pkAt = now;
      if (m.off) { u.pk = null; return; }
      const x = +m.x, z = +m.z, a = +m.a, mm = [0, 1, 2, 3, 4, 5].includes(m.m) ? m.m : 0, fit = Number.isInteger(m.o) && m.o >= 0 && m.o < 1000 ? m.o : 0;   // 3 달리기 4 카약 5 패들보드, o = 러닝 옷(숫자 3자리)
      if (![x, z, a].every(Number.isFinite) || Math.abs(x) > 2000 || z < -3000 || z > 12000) return;
      if (!u.pk) { day.pk = day.pk || { o: 0, b: 0, d: 0 }; day.pk.o++; }
      if (mm && !(u.pkK || (u.pkK = new Set())).has(mm)) { u.pkK.add(mm); day.pk = day.pk || { o: 0, b: 0, d: 0 }; const kk = ["", "b", "d", "r", "k", "s"][mm]; day.pk[kk] = (day.pk[kk] || 0) + 1; }
      u.pk = { x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, a: Math.round(a * 100) / 100, m: mm, o: fit, at: now };
    } else if (m.t === "trip") {   // 🚢 유람선 / 🗼 남산타워에 들어감·나옴
      const v = ["cruise", "tower", "sky63", "sky123", "lounge"].includes(m.v) ? m.v : ""; if ((u.trip || "") !== v) { if (v === "lounge") day.lg = (day.lg || 0) + 1; u.trip = v; broadcast(room, { t: "trip", id: u.id, v }); tripChanged(); }
    } else if (m.t === "bbReq" && typeof m.text === "string") {   // 💌 전광판 사연: 신청하면 바로 순서대로 올라간다(24시간). 후원은 자율
      const now = Date.now(), text = [...freeText(m.text).replace(/\n/g, " ")].slice(0, 30).join("").trim();
      if (!text) return send(ws, { t: "bbBad", why: "empty" });
      if (!u.admin && (badText(text) || contactLike(text))) return send(ws, { t: "bbBad", why: "bad" });
      if (!u.admin && now - (bbIp.get(ip) || 0) < 600000) return send(ws, { t: "bbBad", why: "wait" });
      bbIp.set(ip, now); if (bbIp.size > 5000) bbIp.clear();
      bbLive(); if (bb.live.length >= 60) bb.live.shift();
      const x = { id: "u" + now.toString(36), text, by: u.admin ? u.nick + "(운영자)" : u.nick, at: now, until: now + BB_LIFE }; bb.live.push(x);
      console.log((u.admin ? "[운영자테스트] 전광판 " : "[전광판게시] ") + JSON.stringify({ text, by: u.nick }));
      send(ws, { t: "bbOk", n: bb.live.length }); bbAll();
    } else if (m.t === "bbDo" && u.admin && typeof m.id === "string") {   // 👑 운영자: 확인하고 띄우기 / 거절
      const i = bb.pend.findIndex(x => x.id === m.id); if (i < 0) return;
      const [x] = bb.pend.splice(i, 1);
      if (m.ok) { bb.live.push({ ...x, until: Date.now() + BB_LIFE }); console.log("[전광판게시] " + JSON.stringify(x)); bbAll(); }
      bbAdmins();
    } else if (m.t === "bbPut" && u.admin && typeof m.text === "string") {   // 👑 운영자가 바로 띄우는 한 줄
      const text = [...freeText(m.text).replace(/\n/g, " ")].slice(0, 40).join("").trim(); if (!text) return;
      bb.live.push({ id: "a" + Date.now().toString(36), text, by: "", at: Date.now(), until: Date.now() + BB_LIFE }); console.log("[전광판게시] " + JSON.stringify({ text, admin: 1 })); bbAll();
    } else if (m.t === "bbDel" && u.admin && typeof m.id === "string") {
      bb.live = bb.live.filter(x => x.id !== m.id); bbAll();
    } else if (m.t === "radio") {   // 📻 라디오 켬/끔(같이 듣는 사람 수)
      const on = !!m.on; if (!!u.radio !== on) { u.radio = on; radioCount(); broadcast(room, { t: "rad", id: u.id, on }); }   // 🎧 듣는 사람 머리 위에 헤드폰
    } else if (m.t === "req" && Number.isInteger(m.i) && m.i >= 0 && m.i < RADIO.length) {   // 📻 신청곡 + 사연
      const now = Date.now();
      if (!u.admin && !(u.reqAt && now - u.reqAt < 1800e3)) return send(ws, { t: "reqBad", why: "ticket" });
      if (radio.q.length >= REQ_MAX) return send(ws, { t: "reqBad", why: "full" });
      const msg = typeof m.msg === "string" ? [...freeText(m.msg).replace(/\n/g, " ")].slice(0, 20).join("").trim() : "";
      if (msg && !u.admin && badText(msg)) return send(ws, { t: "reqBad", why: "bad" });
      const by = u.admin ? u.nick + "(운영자)" : u.nick;   // 운영자 신청은 인기곡 순위에 안 넣는다
      u.reqAt = 0; radio.q.push({ i: m.i, by, msg });
      if (!u.admin) { if (reqDay.date !== kstDate()) { reqDay.date = kstDate(); reqDay.n = {}; } reqDay.n[m.i] = (reqDay.n[m.i] || 0) + 1; }
      send(ws, { t: "reqDone" });
      radioAll({ req: { id: u.id, by, i: m.i } });
    } else if (m.t === "say" && u.admin && typeof m.text === "string") {
      // 말풍선은 운영자만 (길이 제한 없음, 길면 말풍선이 여러 쪽으로 넘어간다)
      const text = freeText(m.text); if (text) broadcast(room, { t: "say", id: u.id, text });
    } else if (m.t === "notice" && u.admin && typeof m.text === "string") {
      // 운영자 공지: 모든 방 모든 사람 화면 위에 배너. 빈 글이면 공지를 내린다
      const text = freeText(m.text); lastNotice = text ? { text, at: Date.now() } : null;
      for (const r of rooms) broadcast(r, { t: "notice", text });
    } else if (m.t === "feedback" && typeof m.text === "string") {
      // 바라는 점(하늘 비행기): 누구나 300자까지, 1분에 하나·IP당 하루 5개, 욕설·음란어는 돌려보냄. 운영자만 게임 안 편지함에서 본다
      const now = Date.now(), k = ipKey(ip), used = fbCount.get(k) || 0;
      if (!u.admin && (now - (u.lastFb || 0) < 60000 || used >= 5)) return send(ws, { t: "feedbackBad", why: "wait" });
      const text = [...m.text.normalize("NFC").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, " ").replace(/\s+/g, " ").trim()].slice(0, 300).join("");
      if (!text) return send(ws, { t: "feedbackBad", why: "empty" });
      if (badText(text)) return send(ws, { t: "feedbackBad", why: "bad" });
      u.lastFb = now; fbCount.set(k, used + 1);
      saveFeedback({ at: new Date().toISOString(), nick: u.nick, room: room.no, text, ch: room.ch === "3d" ? "3d" : undefined });
      day.v.askSent = (day.v.askSent || 0) + 1;
      send(ws, { t: "feedbackOk" });
    } else if (m.t === "fc") {   // 🌱 같이 집중 시작/끝 → 머리 위 📖💻📚🌙 표시
      const now = Date.now(); if (now - (u.lastFc || 0) < 1500) return; u.lastFc = now;
      const k = m.on && Number.isInteger(m.k) && m.k >= 0 && m.k <= 3 ? m.k : null;
      if (k === u.fc || (k == null && u.fc == null)) return;
      if (k != null && u.fc == null) { day.fc.s++; gaugeAdd(u, 2); }
      u.fc = k; broadcast(room, { t: "fc", id: u.id, k }); fcCount();
    } else if (m.t === "tree" && [25, 50, 90].includes(m.m)) {   // 🌳 끝까지 채움(한 사람 20분에 한 그루까지)
      const now = Date.now(); if (now - (u.treeAt || 0) < 20 * 60e3) return; u.treeAt = now;
      day.fc.d++; day.fc.min += m.m; gaugeAdd(u, 10);
      console.log("[나무] " + m.m + "분 · 오늘 " + day.fc.d + "그루");
      broadcast(room, { t: "tree", id: u.id, nick: u.nick, m: m.m }); fcCount();
    } else if (m.t === "tk" && ["tteokbokki", "oden", "tempura", "bungeo", "hotteok", "waffle"].includes(m.k)) {   // 🚚 분식 트럭 주문 완료(한 사람 4초에 1번)
      const now = Date.now(); if (now - (u.tkAt || 0) < 4000) return; u.tkAt = now;
      if (!u.admin) day.tk = (day.tk || 0) + 1; gaugeAdd(u, 1);
      { const msg = { t: "tkN", n: day.tk || 0 }; for (const r of allRooms()) broadcast(r, msg); }
    } else if (m.t === "dv") {   // 🛵 치킨 배달 받음(숫자만, 한 사람 20초에 1번)
      const now = Date.now(); if (now - (u.dvAt || 0) < 20e3) return; u.dvAt = now; if (!u.admin) day.dv = (day.dv || 0) + 1; gaugeAdd(u, 1);
    } else if (m.t === "mk" && ["dakkochi", "takoyaki", "tornado", "crepe", "tanghulu", "lemonade"].includes(m.k)) {   // 🏮 야시장에서 산 것(숫자만)
      const now = Date.now(); if (now - (u.mkAt || 0) < 3000) return; u.mkAt = now; if (!u.admin) day.mk = (day.mk || 0) + 1; gaugeAdd(u, 1);
    } else if (m.t === "tent" && Number.isInteger(m.k) && m.k >= 0 && m.k < 32) {   // ⛺ 내 자리 그늘막·랜턴(꾸밈만, 같은 방에 보임)
      const now = Date.now(); if (now - (u.tnAt || 0) < 800) return; u.tnAt = now; if ((u.tn || 0) === m.k) return;
      if (m.k && !u.tn) day.tn = (day.tn || 0) + 1; u.tn = m.k; broadcast(room, { t: "tent", id: u.id, k: m.k });
    } else if (m.t === "qa" && qz.on && m.i === qz.i && Number.isInteger(m.a) && m.a >= 0 && m.a < 4) {   // 🎯 퀴즈 답(문제당 한 번)
      if (qz.ans.has(u.id) || Date.now() - qz.askAt > QZ_ANS_MAX) return;
      qz.ans.set(u.id, { a: m.a, ms: Date.now() - qz.askAt, nick: u.admin ? u.nick + "(운영자)" : u.nick }); if (m.a === QUIZ[qz.list[qz.i]][2]) gaugeAdd(u, 1);
      send(ws, { t: "qaOk", i: m.i, a: m.a });
    } else if (m.t === "qzNow" && u.admin) { qzStart(true);
    } else if (m.t === "pxGet") { send(ws, { t: "pxAll", ...plPub() });
    } else if (m.t === "px" && Number.isInteger(m.x) && Number.isInteger(m.y) && Number.isInteger(m.c) && m.x >= 0 && m.x < PL_W && m.y >= 0 && m.y < PL_H && m.c >= 0 && m.c < PL_COLORS) {   // 🎨 한 칸 칠하기
      const now = Date.now(); if (!u.admin && now - (plIp.get(ip) || 0) < PL_CD - 300) return send(ws, { t: "pxWait", left: PL_CD - (now - (plIp.get(ip) || 0)) });
      if (!u.admin) { plIp.set(ip, now); if (plIp.size > 5000) plIp.clear(); }
      plDay(); const k = m.y * PL_W + m.x, ch = m.c.toString(16); if (pl.cells[k] === ch) return send(ws, { t: "pxOk", left: u.admin ? 0 : PL_CD });
      pl.cells = pl.cells.slice(0, k) + ch + pl.cells.slice(k + 1); pl.nicks[k] = u.admin ? u.nick + "(운영자)" : u.nick;
      if (!u.admin) { pl.n++; pl.who.add(u.id); day.px = (day.px || 0) + 1; if (pl.n % 10 === 0) gaugeAdd(u, 1); }
      send(ws, { t: "pxOk", left: u.admin ? 0 : PL_CD });
      const msg = { t: "pxS", x: m.x, y: m.y, c: m.c, nick: pl.nicks[k], n: pl.n }; for (const r of allRooms()) broadcast(r, msg);
    } else if (m.t === "hg" && (m.k === "feed" || m.k === "pet" || m.k === "ball")) {   // 🐶 한강이 돌보기
      const now = Date.now(), key = ip + ":" + m.k, last = hgIp.get(key) || 0; hgDay();
      if (!u.admin && now - last < HG_CD[m.k]) return send(ws, { t: "hgWait", k: m.k, left: HG_CD[m.k] - (now - last) });
      if (!u.admin) hgIp.set(key, now); if (hgIp.size > 20000) hgIp.clear();
      if (m.k === "feed") hg.hunger = Math.max(0, hg.hunger - 30);
      if (!u.admin) day.hg = (day.hg || 0) + 1; gaugeAdd(u, 1);
      send(ws, { t: "hgOk", k: m.k, left: u.admin ? 0 : HG_CD[m.k] });
      hgAdd(u, m.k, HG_XP[m.k]);
    } else if (m.t === "pxClear" && u.admin) {   // 👑 운영자: 판 전체 지우기(이상한 그림 대응)
      plDay(); pl.cells = "0".repeat(PL_W * PL_H); pl.nicks.fill(""); console.log("[픽셀] 운영자가 판을 지움");
      { const msg = { t: "pxAll", ...plPub() }; for (const r of allRooms()) broadcast(r, msg); }
    } else if (m.t === "rmDone") {   // 🍜 한강라면 완성(한 사람 1분에 한 그릇까지)
      const now = Date.now(); if (now - (u.rmAt || 0) < 60e3) return; u.rmAt = now;
      if (!u.admin) day.rm = (day.rm || 0) + 1; gaugeAdd(u, 2);
      { const msg = { t: "rmN", n: day.rm || 0, nick: u.admin ? u.nick + "(운영자)" : u.nick }; for (const r of allRooms()) broadcast(r, msg); }
    } else if (m.t === "supLog" && u.admin) { send(ws, supReport());   // 💛 운영자: 응원 기록 카드
    } else if (m.t === "supCsv" && u.admin) { send(ws, { t: "supCsv", rows: supLog.map(x => [x.at, x.ch, x.nick, x.amt, x.busk]) });
    } else if (m.t === "bub") {   // 🫧 비눗방울(같은 방에 보임, 1.2초 1번)
      const now = Date.now(); if (now - (u.bubAt || 0) < 1100) return; u.bubAt = now; day.bub = (day.bub || 0) + 1;
      broadcast(room, { t: "bub", id: u.id, s: Number.isInteger(m.s) ? m.s % 1e9 : 1 });
    } else if (m.t === "cap") {   // ⏳ 미래의 나에게 봉인(내용은 서버로 안 옴, 숫자만)
      const now = Date.now(); if (now - (u.capAt || 0) < 30e3) return; u.capAt = now; day.cap = (day.cap || 0) + 1;
    } else if (m.t === "stk" && Number.isInteger(m.n) && m.n >= 0 && m.n <= 400) {   // 🔥 연속 출석 배지(폰 기록 기준, 꾸밈만): 3일 1·7일 2·14일 3·30일 4
      const k = m.n >= 30 ? 4 : m.n >= 14 ? 3 : m.n >= 7 ? 2 : m.n >= 3 ? 1 : 0; if ((u.sk || 0) === k) return; u.sk = k;
      if (k >= 2) day.stk = Math.max(day.stk || 0, m.n);
      broadcast(room, { t: "stk", id: u.id, k });
    } else if (m.t === "lv" && Number.isInteger(m.n) && m.n >= 0 && m.n <= 50) {   // 🏅 한강 등급(폰에서 계산, 서버는 숫자만 같은 방에 보여 줌)
      const prev = u.lv || 0; if (prev === m.n) return lvRank(ws, u); u.lv = m.n; day.lvMax = Math.max(day.lvMax || 0, m.n);
      broadcast(room, { t: "lv", id: u.id, n: m.n }); if (prev > 0 && m.n > prev) broadcast(room, { t: "lvUp", id: u.id });
      lvRank(ws, u);
    } else if (m.t === "lvQ") { lvRank(ws, u);
    } else if (m.t === "tarot" || m.t === "trQ") {   // 🔮 타로: 오늘 본 횟수만
      const S = todayCount("tr"); if (m.t === "tarot") { S.n++; day.tr = (day.tr || 0) + 1; } send(ws, { t: "trN", n: S.n });
    } else if (m.t === "ft" || m.t === "ftQ") {   // 🍀 오늘의 운세: 오늘 본 사람 수만
      const S = todayCount("ft"); if (m.t === "ft") { S.n++; day.ft = (day.ft || 0) + 1; } send(ws, { t: "ftN", n: S.n });
    } else if (m.t === "ty" || m.t === "tyQ") {   // 🧪 유형 테스트: 오늘 유형별 숫자만
      const S = todayCount("ty"); if (!S.c) S.c = [0, 0, 0, 0, 0, 0, 0, 0];
      if (m.t === "ty" && Number.isInteger(m.k) && m.k >= 0 && m.k < 8) { S.n++; S.c[m.k]++; day.ty = (day.ty || 0) + 1; (day.tyc || (day.tyc = [0, 0, 0, 0, 0, 0, 0, 0]))[m.k]++; }
      send(ws, { t: "tyN", n: S.n, c: S.c });
    } else if (m.t === "appIn") { day.appIn = (day.appIn || 0) + 1;
    } else if (m.t === "rd" && /^r[sed](_ok|_mid|_fr|up)?$|^rsup$/.test(String(m.k || ""))) { const D = day.rd || (day.rd = {}); D[m.k] = (D[m.k] || 0) + 1;   // 📖 열두 밤 통계(시작·화 완료·엔딩·응원 누름)
    } else if (m.t === "sl") {   // 🌙 잠들기 시작/일어남 → 머리 위 💤
      const now = Date.now(); if (now - (u.lastSl || 0) < 1500) return; u.lastSl = now;
      const on = !!m.on; if (!!u.sl === on) return; u.sl = on;
      if (!day.sl) day.sl = { s: 0, min: 0 };
      if (on && !u.admin) day.sl.s++;
      if (!on && !u.admin && Number.isInteger(m.m) && m.m > 0) day.sl.min += Math.min(m.m, 600);
      broadcast(room, { t: "sl", id: u.id, on }); slCount();
    } else if (m.t === "bkIn") {   // 🎸 버스킹 구역 들어감/나감
      const on = !!m.on; if (!!u.busk === on) return; u.busk = on;
      if (on) { day.bk = (day.bk || 0) + 1; send(ws, buskPub()); }
      buskAll();
    } else if (m.t === "clap" && u.busk) {   // 👏 박수: 1초에 한 번, 모아서 0.8초마다 알림
      const now = Date.now(); if (now - (u.lastClap || 0) < 900) return; u.lastClap = now; buskDay();
      if (!u.admin) busk.claps++; busk.clapBuf++; u.clapN = (u.clapN || 0) + 1; if (u.clapN % 10 === 0) gaugeAdd(u, 1);
      if (!busk.clapT) busk.clapT = setTimeout(() => { busk.clapT = null; buskSend({ t: "claps", k: busk.clapBuf, total: busk.claps }); busk.clapBuf = 0; }, 800);
    } else if (m.t === "bkReq" && u.busk && Number.isInteger(m.i) && m.i >= 0 && m.i < BUSK.length) {   // 🎵 신청곡(무료)
      const now = Date.now();
      if (!u.admin && now - (u.bkReqAt || 0) < 600000) return send(ws, { t: "bkReqBad", why: "wait", left: Math.ceil((600000 - (now - u.bkReqAt)) / 60000) });
      if (busk.q.length >= 5) return send(ws, { t: "bkReqBad", why: "full" });
      u.bkReqAt = now; busk.q.push({ i: m.i, by: u.nick }); day.bkr = (day.bkr || 0) + 1;
      buskSend({ t: "bkReqOk", by: u.nick, i: m.i }); buskAll();
    } else if (m.t === "guest" && Number.isInteger(m.k) && m.k >= 0 && m.k < 16) {   // 🐾 손님을 도감에 담음: 게이지 +2, 드문 손님(11번부터)은 같은 방에 알림
      const now = Date.now(); if (now - (u.lastGuest || 0) < 20000) return; u.lastGuest = now;
      day.gs = (day.gs || 0) + 1; gaugeAdd(u, 2);
      if (m.k >= 11) { console.log("[손님] " + m.k + " " + u.nick); broadcast(room, { t: "guest", id: u.id, nick: u.nick, k: m.k }); }
    } else if (m.t === "droneNow" && u.admin) {   // 👑 운영자: 드론쇼 바로 시험(게이지·통계에는 안 들어감)
      if (gauge.showUntil > Date.now()) return; console.log("[운영자테스트] 드론쇼"); droneShow(true);
    } else if (m.t === "skOpen" || m.t === "skShare") {   // 🪨 물수제비 연 횟수·자랑하기 횟수(한 사람 30번까지)
      u.skc = (u.skc || 0) + 1; if (u.skc <= 60) { if (m.t === "skOpen") day.sk.o++; else day.sk.sh++; }
    } else if (m.t === "skip" && Number.isInteger(m.n) && m.n >= 0 && m.n <= 45) {   // 🪨 던진 결과
      const now = Date.now(); if (now - (u.lastSkip || 0) < 2500) return; u.lastSkip = now; day.sk.t++; if (m.n > 0) gaugeAdd(u, 1);
      if (u.admin || !m.n) return;
      const tp = skipTop(), old = tp[0], e = tp.find(x => x.nick === u.nick);
      if (e && e.n >= m.n) return;
      if (e) e.n = m.n; else tp.push({ nick: u.nick, n: m.n });
      tp.sort((a, b) => b.n - a.n); tp.splice(5);
      if (!tp.some(x => x.nick === u.nick)) return;
      const king = tp[0].nick === u.nick && (!old || old.nick !== u.nick || old.n < m.n) && m.n >= 8 ? { nick: u.nick, n: m.n } : undefined;
      if (king) console.log("[물수제비1위] " + u.nick + " " + m.n);
      const msg = { t: "skipTop", top: tp, king }; for (const r of allRooms()) broadcast(r, msg);
    } else if (m.t === "vc" && VC_KEYS.includes(m.k)) {
      // 💌 우체통·📝 바라는 점 이용 횟수만 센다(글은 안 옴). 한 사람이 한 종류를 30번 넘게 세지 않게
      u.vc = u.vc || {}; if ((u.vc[m.k] = (u.vc[m.k] || 0) + 1) <= 30) day.v[m.k] = (day.v[m.k] || 0) + 1;
    } else if (m.t === "gm" && (m.k === "rps" || m.k === "ccc") && Number.isInteger(m.to) && m.to !== u.id && room.users.has(m.to)) {   // ✊ 둘이 하는 놀이(game.js): 신청
      const now = Date.now(); if (u.gm || now - (u.lastGm || 0) < 4000) return; u.lastGm = now;
      const o = room.users.get(m.to); if (o.gm) return send(ws, { t: "gmNo", from: o.id, busy: 1 });
      u.gmAsk = { to: o.id, k: m.k, at: now }; send(o.ws, { t: "gmInv", from: u.id, nick: u.nick, k: m.k });
    } else if (m.t === "gmOk" && Number.isInteger(m.to) && room.users.has(m.to)) {
      const o = room.users.get(m.to);
      if (!o.gmAsk || o.gmAsk.to !== u.id || Date.now() - o.gmAsk.at > 20000 || o.gm || u.gm) return send(ws, { t: "gmEnd", cancel: 1 });
      const g = { a: o.id, b: u.id, k: o.gmAsk.k, sc: { [o.id]: 0, [u.id]: 0 }, n: 0, p: {}, at: Date.now() }; o.gmAsk = null; o.gm = u.gm = g; day.gm = (day.gm || 0) + 1;
      g.timer = setInterval(() => { if (Date.now() - g.at > 25000) gmEnd(g, room, { cancel: 1 }); }, 5000);   // 25초 동안 아무도 안 고르면 끝
      const msg = { t: "gmGo", a: g.a, b: g.b, k: g.k, an: o.nick, bn: u.nick }; send(o.ws, msg); send(ws, msg);
    } else if (m.t === "gmNo" && Number.isInteger(m.to) && room.users.has(m.to)) {
      const o = room.users.get(m.to); if (o.gmAsk && o.gmAsk.to === u.id) { o.gmAsk = null; send(o.ws, { t: "gmNo", from: u.id }); }
    } else if (m.t === "gmPick" && u.gm && !u.gm.fin && [0, 1, 2].includes(m.p) && u.gm.p[u.id] == null) {
      const g = u.gm; g.p[u.id] = m.p; g.at = Date.now(); const o = room.users.get(g.a === u.id ? g.b : g.a); if (o) send(o.ws, { t: "gmWait" });
      if (g.p[g.a] != null && g.p[g.b] != null) gmRound(g, room);
    } else if (m.t === "gmQuit" && u.gm) {
      gmEnd(u.gm, room, { quit: u.id });
    } else if (m.t === "gmBot" && !u.gmBot) {   // 🐶 한강이랑 한 판(폰 안에서만, 통계용 접속당 1번)
      u.gmBot = 1; day.gmb = (day.gmb || 0) + 1;
    } else if (m.t === "ms" && !u.ms) {   // ✅ 오늘 밤 할 일 3개를 다 함(mission.js, 접속당 1번)
      u.ms = 1; day.ms = (day.ms || 0) + 1;
    } else if (m.t === "fbDone" && u.admin && typeof m.what === "string") {
      // 운영자 ✅ 반영 알림: 모든 방(01·02)에 한 줄 토스트, 바라는 점 창의 "생긴 것" 목록 맨 앞에. 메모리 + 로그
      const what = [...freeText(m.what).replace(/\n/g, " ")].slice(0, 40).join("").trim(); if (!what) return;
      const f = feedback.find(x => x.id === m.id), d = { what, nick: f ? f.nick : undefined, at: Date.now() };
      fbDone.unshift(d); fbDone.splice(10); if (f) f.done = what;
      console.log("[반영] " + JSON.stringify(d));
      for (const r of [...rooms, ...rooms3d]) broadcast(r, { t: "fbDone", d });
    } else if (m.t === "worry" && typeof m.text === "string") {
      const now = Date.now();
      if (!u.admin && now - (u.lastWorry || 0) < 180000) return send(ws, { t: "worryBad", why: "wait" });
      const text = [...m.text.normalize("NFC").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, " ").replace(/\s+/g, " ").trim()].slice(0, 120).join("");
      if (!text) return send(ws, { t: "worryBad", why: "empty" });
      if (badText(text)) return send(ws, { t: "worryBad", why: "bad" });
      if (CRISIS.test(text)) return send(ws, { t: "worryBad", why: "crisis" });
      u.lastWorry = now;
      const list = liveWorries(room); if (list.length >= 6) list.shift();
      const w = { id: nextWorry++, text, until: now + WORRY_LEN, at: now, cheers: Array(CHEERS).fill(0), by: new Set(), owner: u.id };
      list.push(w);
      for (const o of room.users.values()) send(o.ws, { t: "worry", w: pubWorry(w, now), mine: o.id === u.id || undefined });
    } else if (m.t === "cheer" && Number.isInteger(m.w) && Number.isInteger(m.k) && m.k >= 0 && m.k < CHEERS) {
      const now = Date.now(), w = liveWorries(room).find(x => x.id === m.w);
      if (!w || w.owner === u.id || w.by.has(u.id) || now - (u.lastCheer || 0) < 1500) return;
      u.lastCheer = now; w.by.add(u.id); w.cheers[m.k]++; w.until = Math.min(w.at + WORRY_MAX, w.until + 10000);
      broadcast(room, { t: "cheer", w: w.id, k: m.k, left: w.until - now });
    } else if (m.t === "star" && typeof m.x === "number" && typeof m.y === "number" && m.x >= 0 && m.x <= 1 && m.y >= 0 && m.y <= 1) {
      // 별똥별 신호: 하늘을 누르면 같은 방 모두에게 그 자리에서 별똥별이 떨어진다. 10초에 한 번
      const now = Date.now(); if (now - (u.lastStar || 0) < 10000) return; u.lastStar = now;
      broadcast(room, { t: "star", id: u.id, x: Math.round(m.x * 1000) / 1000, y: Math.round(m.y * 1000) / 1000, d: Math.random() < .5 ? -1 : 1 });
    } else if (m.t === "nick") {
      const now = Date.now();
      if (!u.admin && now - u.lastNick < NICK_GAP) return send(ws, { t: "nickbad", why: "wait" });
      const n = u.admin ? cleanNick(m.n, "free", 12) : cleanNick(m.n);
      if (!n) return send(ws, { t: "nickbad", why: n === false ? "bad" : "empty" });
      u.lastNick = now; u.nick = n;
      broadcast(room, { t: "nick", id: u.id, n });
    } else if (m.t === "fw" && typeof m.p === "number" && m.p >= 0 && m.p <= 1) {
      // 폭죽: 모양·색·씨앗은 서버가 정해서 모두의 화면에 같은 불꽃이 터지게 한다
      const now = Date.now();
      if (now - u.lastFw < (u.admin ? 1000 : FW_GAP)) return;
      u.lastFw = now; gaugeAdd(u, 1);
      const r = n => Math.floor(Math.random() * n);
      if (now - room.fountainAt > FOUNTAIN_LEN + FOUNTAIN_GAP && Math.random() < FOUNTAIN_P) { room.fountainAt = now + 1600; setTimeout(() => broadcast(room, { t: "fountain" }), 1600); }   // 폭죽이 터질 즈음 켠다
      const x = typeof m.x === "number" && m.x >= 0 && m.x <= 1 ? Math.round(m.x * 1000) / 1000 : undefined;   // 조준한 가로 위치(화면 비율)
      broadcast(room, { t: "fw", id: u.id, p: Math.round(m.p * 100) / 100, x, k: r(FW_KINDS), h: r(FW_COLORS), h2: r(FW_COLORS), s: r(1e9), gold: u.admin || undefined });
    } else if (m.t === "go" && typeof m.x === "number" && typeof m.y === "number" && m.x >= 0 && m.x <= 1 && m.y >= .5 && m.y <= 1) {   // 바닥을 눌러 걸어가기(자리에서 일어남)
      const now = Date.now();
      if (now - (u.lastGo || 0) < 400) return;
      u.lastGo = now; u.seat = null; u.act = "sit"; u.pos = { x: Math.round(m.x * 1e4) / 1e4, y: Math.round(m.y * 1e4) / 1e4 };
      broadcast(room, { t: "go", id: u.id, x: u.pos.x, y: u.pos.y });
    } else if (m.t === "cheers" && Number.isInteger(m.to) && m.to !== u.id && room.users.has(m.to)) {   // 옆 사람과 짠
      const now = Date.now();
      if (now - (u.lastCheers || 0) < 2500) return;
      u.lastCheers = now; gaugeAdd(u, 2);
      const o = room.users.get(m.to);
      broadcast(room, { t: "cheers", from: u.id, to: m.to, a: DRINKS.includes(u.act) ? u.act : "cocoa", b: DRINKS.includes(o.act) ? o.act : "cocoa" });
    } else if (m.t === "sit" && Number.isInteger(m.seat) && m.seat >= 0 && m.seat < CAP && m.seat !== u.seat) {
      const now = Date.now();
      if (now - u.lastSit < SIT_GAP) return;
      u.lastSit = now;
      for (const o of room.users.values()) if (o.seat === m.seat) return send(ws, { t: "taken", seat: m.seat });
      u.seat = m.seat;
      broadcast(room, { t: "seat", id: u.id, seat: u.seat });
    }
  });
  ws.on("close", () => {
    if (day.secs.length < 20000) day.secs.push(Math.round((Date.now() - since) / 1000));
    room.users.delete(u.id);
    if (u.gm) gmEnd(u.gm, room, { quit: u.id });
    const n = ips.get(ip) - 1; n > 0 ? ips.set(ip, n) : ips.delete(ip);
    broadcast(room, { t: "leave", id: u.id });
    if (u.radio) radioCount();
    if (u.fc != null) fcCount();
    if (u.sl) slCount();
    if (u.busk) buskAll();
    if (u.trip) tripChanged();
    if (u.admin && !adminHere(room)) broadcast(room, { t: "adminHere", on: false });
    sendCounts();
  });
});

// 끊긴 연결 정리 (30초마다 ping, 응답 없으면 종료)
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) { ws.terminate(); continue; }
    ws.alive = false; ws.ping();
  }
}, 30000);

// Render가 새 버전을 올리며 서버를 끌 때: 모두에게 알리고 닫는다. 페이지는 바로 다시 붙고 자리·행동·닉네임을 되찾는다
process.on("SIGTERM", () => {
  console.log("[stats 보관] " + JSON.stringify(summary(day)));                           // 배포로 꺼지기 직전 오늘 숫자
  for (const f of feedback) console.log("[바라는점 보관] " + JSON.stringify(f));        // 디스크가 지워지기 전에 로그에 한 번 더
  for (const x of bb.pend) console.log("[전광판신청 보관] " + JSON.stringify(x));
  for (const x of bb.live) console.log("[전광판게시 보관] " + JSON.stringify(x));
  for (const r of rooms) broadcast(r, { t: "restart" });
  setTimeout(() => { for (const c of wss.clients) c.close(1012, "restart"); setTimeout(() => process.exit(0), 300); }, 200);
});
server.on("connection", s => { txSocks.add(s); s.on("close", () => { txSocks.delete(s); txDone[s.hnWs ? "w" : "h"] += s.bytesWritten - (s.hnBase || 0); }); });
server.on("upgrade", (req, s) => { if (s.hnWs) return; txDone.h += s.bytesWritten - (s.hnBase || 0); s.hnBase = s.bytesWritten; s.hnWs = 1; });
server.listen(PORT, () => console.log("listening on", PORT));
