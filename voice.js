// 💌 마음 우체통(나에게 하고 싶은 말) + 📝 운영자에게 바라는 점 — 01(index.html)과 02(3d.html)가 같이 쓰는 파일.
// 우체통 글은 서버로 가지 않는다(저장 0). 서버에는 "몇 번 열었나/답장 받았나" 같은 횟수만 간다({t:"vc", k}).
// 바라는 점은 {t:"feedback"}로 운영자 함에 간다. 운영자가 ✅ 반영 알림을 보내면 모두에게 짧게 알려 준다({t:"fbDone"}).
// 쓰는 법: HNVoice.init({ send, toast, onLetter, onBoat }) / HNVoice.onMsg(m) / HNVoice.openMind() / HNVoice.openAsk()
(function () {
  const css = `
  .hv { position: fixed; left: 50%; top: 42%; transform: translate(-50%, -50%); width: min(320px, calc(100vw - 32px)); max-height: calc(100vh - 40px); overflow: auto; box-sizing: border-box; padding: 16px; border-radius: 20px; display: none; flex-direction: column; gap: 10px; text-align: center; z-index: 30;
    font-family: -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif; font-size: 14px; box-shadow: 0 12px 40px rgba(0,0,0,.5); user-select: text; -webkit-user-select: text; }
  .hv.on { display: flex; } .hv > * { flex-shrink: 0; }
  .hv button { all: unset; cursor: pointer; box-sizing: border-box; text-align: center; border-radius: 999px; }
  .hv textarea { box-sizing: border-box; width: 100%; font: inherit; resize: none; outline: none; }
  #hvMind, #hvReply { background: #f6eedb; color: #3b2f25; }
  #hvMind b { font-size: 16px; } #hvMind small { color: #7a6a58; font-size: 12px; line-height: 1.5; }
  #hvMind .q { background: #fff8ea; border: 1px solid #ecd9b0; border-radius: 14px; padding: 9px 12px; font-size: 14px; line-height: 1.5; color: #5a4a3a; }
  #hvMind .q em { display: block; font-style: normal; font-size: 11.5px; color: #b0895a; font-weight: 700; margin-bottom: 2px; }
  #hvMind textarea { border-radius: 10px; font-size: 15px; color: #3b2f25; border: 1px solid #e2d5b8; line-height: 28px; padding: 4px 12px; text-align: left;
    background: repeating-linear-gradient(#fffaf0 0 27px, #eadfc6 27px 28px); }
  #hvMind .st { display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; } #hvMind .st button { padding: 5px 10px; background: #efe5cf; color: #5a4a3a; font-size: 12.5px; }
  #hvMind .btns { display: flex; flex-direction: column; gap: 6px; } #hvMind .btns button { min-height: 44px; display: grid; place-items: center; font-size: 15px; background: #e9e0cb; color: #4d4033; }
  #hvMind .btns #hvHear { background: #c94a3f; color: #fff; font-weight: 700; }
  #hvMind .hint { font-size: 11.5px; color: #9a8a76; line-height: 1.5; }
  #hvMind .later { min-height: 28px; font-size: 13px; color: #9a8a76; }
  #hvMind .skip { font-size: 12.5px; color: #a2603f; text-decoration: underline; text-underline-offset: 3px; padding: 2px 0; }
  #hvMind .tones { display: none; flex-direction: column; gap: 8px; } #hvMind.step2 .tones { display: flex; } #hvMind.step2 .write { display: none; }
  #hvMind .write { display: flex; flex-direction: column; gap: 10px; }
  #hvMind .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  #hvMind .grid button { min-height: 52px; background: #fff8ea; color: #3b2f25; font-size: 14.5px; font-weight: 600; border: 1px solid #e2d5b8; border-radius: 14px; display: grid; gap: 2px; place-items: center; }
  #hvMind .grid button em { font-style: normal; font-size: 11px; font-weight: 400; color: #9a8a76; }
  #hvReply { padding: 20px 20px 14px; gap: 12px; opacity: 0; transform: translate(-50%, -50%) scale(.92); transition: opacity .5s, transform .5s; text-align: left; }
  #hvReply.show { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  #hvReply b { font-size: 15px; text-align: center; } #hvReply p { margin: 0; font-size: 15.5px; line-height: 1.75; white-space: pre-wrap; word-break: keep-all; min-height: 5em; }
  #hvReply .sign { text-align: right; color: #8a7a66; font-size: 13px; }
  #hvReply .help { display: none; background: #fff7e6; border: 1px solid #ecd9b0; border-radius: 12px; padding: 10px 12px; font-size: 14px; line-height: 1.6; } #hvReply .help.on { display: block; }
  #hvReply .help a { color: #c94a3f; font-weight: 700; }
  #hvReply .act { display: none; background: #efe5cf; border-radius: 12px; padding: 9px 12px; font-size: 13.5px; line-height: 1.55; color: #5a4a3a; } #hvReply .act.on { display: block; }
  #hvReply .row2 { display: flex; gap: 6px; } #hvReply .row2 button { flex: 1; background: #e9e0cb; color: #4d4033; font-weight: 600; font-size: 13.5px; padding: 10px 4px; }
  #hvReply small { color: #9a8a76; font-size: 11.5px; text-align: center; }
  #hvReply #hvOk { padding: 11px; background: #c94a3f; color: #fff; font-weight: 700; font-size: 15px; }
  #hvBreath { display: none; flex-direction: column; align-items: center; gap: 10px; padding: 6px 0; } #hvBreath.on { display: flex; }
  #hvBreath i { display: block; width: 46px; height: 46px; border-radius: 50%; background: radial-gradient(circle, #f3c9a0, #e0896f); transform: scale(.6); transition: transform 4s ease-in-out; box-shadow: 0 0 24px rgba(224,137,111,.5); }
  #hvBreath span { font-size: 14px; color: #6a5a48; }
  #hvAsk { background: #eef4ff; color: #22304a; }
  #hvAsk b { font-size: 16px; } #hvAsk small { color: #5d6b85; font-size: 12.5px; line-height: 1.55; }
  #hvAsk h4 { margin: 2px 0 -4px; font-size: 12.5px; color: #3d6fd6; text-align: left; }
  #hvAsk .chips { display: flex; flex-wrap: wrap; gap: 5px; } #hvAsk .chips button { padding: 6px 10px; background: #dfe8fb; color: #34466a; font-size: 13px; }
  #hvAsk .chips button.on { background: #3d6fd6; color: #fff; }
  #hvAsk textarea { padding: 10px 12px; border-radius: 12px; border: 1px solid #c9d6ee; background: #fff; color: #22304a; font-size: 15px; line-height: 1.5; text-align: left; }
  #hvAsk .btns { display: flex; gap: 6px; } #hvAsk .btns button { flex: 1; padding: 11px; font-size: 15px; background: #dfe8fb; color: #34466a; } #hvAsk .btns #hvSend { background: #3d6fd6; color: #fff; font-weight: 700; }
  #hvAsk details { text-align: left; background: #e3ecfc; border-radius: 12px; padding: 8px 10px; font-size: 13px; line-height: 1.55; }
  #hvAsk summary { cursor: pointer; font-weight: 700; color: #2c4f9e; list-style: none; } #hvAsk summary::-webkit-details-marker { display: none; }
  #hvAsk ul { margin: 6px 0 2px; padding-left: 4px; list-style: none; } #hvAsk li { margin: 3px 0; } #hvAsk li em { font-style: normal; color: #6a7894; font-size: 12px; }
  .hvDot { position: relative !important; } .hvDot::after { content: ""; position: absolute; top: 6px; right: 10px; width: 8px; height: 8px; border-radius: 50%; background: #ff6b5e; box-shadow: 0 0 6px #ff6b5e; }`;

  const html = `
  <div id="hvMind" class="hv" role="dialog" aria-label="마음 우체통">
    <b>💌 나에게 하고 싶은 말</b>
    <div class="write">
      <div class="q"><em>🌙 오늘의 질문</em><span id="hvQ"></span></div>
      <textarea id="hvEd" maxlength="300" rows="4" aria-label="하고 싶은 말"></textarea>
      <div class="st"><button>오늘 수고한 나에게, </button><button>요즘 마음에 걸리는 건 </button><button>고마운 사람에게, </button><button>사실 나는 </button></div>
      <small>이 글은 폰 밖으로 나가지 않고, 어디에도 저장되지 않아요.</small>
      <div class="btns"><button id="hvHear">💌 답장 받기</button><button id="hvShare">🎈 익명으로 함께 나누기</button><button id="hvSelf">🍃 강물에 흘려보내기</button></div>
      <div class="hint">💌 우체통이 바로 답장 · 🎈 옆 사람들이 이름 없이 공감(1분 뒤 사라짐) · 🍃 답 없이 흘려보내기</div>
      <button class="skip" id="hvSkip">✍️ 쓰기 힘들면, 안 쓰고 한마디만 듣기</button>
      <button class="later" id="hvLater">다음에</button>
    </div>
    <div class="tones"><b style="font-size:14.5px">어떤 말이 듣고 싶어요?</b>
      <div class="grid"><button data-tone="comfort">🤗 위로<em>괜찮다는 말</em></button><button data-tone="cheer">💪 응원<em>힘이 나는 말</em></button><button data-tone="praise">👏 잘했다는 말<em>수고했다는 말</em></button><button data-tone="listen">👂 그냥 들어줘<em>조언 없이</em></button></div>
      <button class="later" id="hvBack">← 다시 쓰기</button></div>
  </div>
  <div id="hvReply" class="hv" role="dialog" aria-label="답장"><b>💌 한강 우체통의 답장</b><p id="hvText"></p><div class="sign">— 한강에서</div><div class="act" id="hvAct"></div>
    <div id="hvBreath"><i></i><span>천천히 들이쉬고…</span></div>
    <div class="help" id="hvHelp">혼자 견디지 않아도 돼요. 지금 바로 이야기를 들어 줄 사람이 있어요.<br>📞 <a href="tel:109">자살예방상담 109</a> (24시간, 무료)<br>💬 청소년이라면 <a href="tel:1388">1388</a></div>
    <div class="row2"><button id="hvAgain">🔄 다른 말 듣기</button><button id="hvBreathBtn">🌬️ 같이 숨 쉬기</button></div><small>이 답장도 어디에도 남지 않아요</small><button id="hvOk">고마워요</button></div>
  <div id="hvAsk" class="hv" role="dialog" aria-label="바라는 점">
    <b>📝 운영자에게 바라는 점</b>
    <small>운영자가 하나하나 직접 읽고 고쳐요. 눌러서 고르기만 해도 돼요.<br>(소원은 🎈 소원 풍선으로 띄워 주세요!)</small>
    <h4>👍 좋았던 것</h4><div class="chips" data-k="👍 좋았던 것"><button>🎣 낚시</button><button>🚢 유람선</button><button>🗼 남산타워</button><button>📻 라디오</button><button>🎆 불꽃놀이</button><button>💌 우체통</button><button>🛌 별 보기</button><button>💬 말 걸기</button></div>
    <h4>😕 아쉬운 것</h4><div class="chips" data-k="😕 아쉬운 것"><button>버튼 찾기 어려워요</button><button>화면이 답답해요</button><button>느리거나 끊겨요</button><button>소리가 별로예요</button><button>사람이 적어요</button><button>할 게 적어요</button></div>
    <textarea id="hvAskEd" maxlength="300" rows="3" aria-label="바라는 점" placeholder="더 하고 싶은 말 (예: 친구랑 같은 방에 들어가고 싶어요)"></textarea>
    <div class="btns"><button id="hvAskNo">다음에</button><button id="hvSend">보내기</button></div>
    <details id="hvDone"><summary>✅ 여러분 의견으로 생긴 것 <span id="hvDoneN"></span> ›</summary><ul id="hvDoneList"></ul></details>
  </div>`;

  // 바라는 점으로 실제로 생긴 것(Render 로그 [바라는점]과 커밋 기록으로 확인한 것만). 운영자 ✅ 알림으로 새로 생긴 건 앞에 붙는다
  const SEED = [["💬 사람 누르면 말 걸기", "친구에게 말 걸기 기능 추가요"], ["🕹️ 움직이기 버튼 숨기기", "움직이기 버튼이 화면을 가려요"], ["💇 3D 긴 머리 턱수염처럼 보이던 것 고침", "여자 캐릭터 뒤돌면 턱수염이 생겨요"],
    ["🕹️ 직접 걸어 다니기", "직접 움직이게 해주세요"], ["🧺 4인 큰 돗자리", "같이 앉을 수 있는 큰 돗자리"], ["🙂 정면 보기(앞모습)", "앞모습을 보고 싶어요"], ["🍽 먹을 것 12가지", "라면 말고 다른 것도 먹고 싶어요"]];
  // 오늘의 질문: 한국 날짜마다 하나(모두 같은 질문)
  const QS = ["오늘 나를 웃게 한 건 뭐였어요?", "요즘 가장 자주 하는 생각은 뭐예요?", "오늘의 나에게 점수를 준다면, 왜 그 점수예요?", "지금 제일 듣고 싶은 말은 뭐예요?", "요즘 나를 버티게 해 주는 건 뭐예요?",
    "1년 전의 나에게 한마디 해 준다면?", "오늘 잘 참은 일 하나만 적어 봐요.", "요즘 고마웠던 사람이 있나요?", "내일의 나에게 부탁하고 싶은 건?", "요즘 마음이 가장 편했던 순간은 언제예요?",
    "누구에게도 못 한 말이 있다면?", "지금 내려놓고 싶은 걱정 하나는?", "어릴 적 나에게 해 주고 싶은 말은?", "오늘 하루를 한 단어로 하면?", "요즘 나 스스로에게 미안한 게 있나요?",
    "이번 주에 나를 위해 해 주고 싶은 작은 일은?", "요즘 설레는 일이 있나요?", "지금 보고 싶은 사람이 있나요?", "요즘 가장 애쓰고 있는 건 뭐예요?", "오늘 밤 잠들기 전 나에게 한마디."];
  const kstDay = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const todayQ = () => QS[Math.floor((Date.now() + 9 * 3600e3) / 86400e3) % QS.length];

  // 욕설·야한 말 거르기: 서버가 목록을 끼워 준다(server.js MIND_BAD). 마음 글은 길어서 낱말마다 본다
  const BAD = /*HN_BAD*/[], BAD_CHO = /*HN_BAD_CHO*/[];
  const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  const toCho = w => [...w].map(ch => { const c = ch.charCodeAt(0) - 0xac00; return c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ch; }).join("");
  function bad(text) {
    const words = []; let run = "";
    for (const w of text.normalize("NFC").toLowerCase().split(/\s+/)) { if ([...w].length === 1) run += w; else { if (run) words.push(run); run = ""; words.push(w); } }
    if (run) words.push(run);
    const squash = x => x.replace(/[^a-z가-힣ㄱ-ㅎㅏ-ㅣ]/g, "").replace(/(.)\1+/g, "$1");
    return words.some(w => {
      const flats = [squash(w.replace(/[1!|]/g, "i").replace(/0/g, "o").replace(/3/g, "e").replace(/[4@]/g, "a").replace(/[5$]/g, "s").replace(/7/g, "t")), squash(w)];
      const cho = /[ㄱ-ㅎ]/.test(w) ? toCho(flats[1]).replace(/[^ㄱ-ㅎ]/g, "") : "";
      return flats.some(f => BAD.some(b => f.includes(b))) || (cho && BAD_CHO.some(b => cho.includes(b)));
    });
  }
  // 답장 = 글의 결에 맞춘 첫 줄(공감) + 고른 말투의 본문 + 지금 해 볼 작은 일 하나. 위험한 말이 보이면 상담 번호를 함께
  const CRISIS = /죽고\s*싶|죽을\s*것\s*같|죽어\s*버리|자살|사라지고\s*싶|없어지고\s*싶|살기\s*싫|살고\s*싶지\s*않|그만\s*살|끝내고\s*싶|목숨|뛰어\s*내리|자해|손목/;
  const MOODS = [
    ["self", /못나|쓸모|자존감|내가\s*싫|나\s*자신이|부족|실패|망했|망쳤|한심|자신\s*없|자신이\s*없|못\s*하겠|잘하는\s*게\s*없|나만\s*왜|비교/],
    ["sad", /슬퍼|슬프|슬픔|울고|울었|울컥|눈물|우울|외로|외롭|혼자|공허|허전|쓸쓸/],
    ["tired", /힘들|힘든|힘드|지쳤|지친|지쳐|피곤|버거|벅차|번아웃|쉬고\s*싶|무기력|버티/],
    ["anxious", /불안|걱정|무서|두려|떨려|떨리|긴장|시험|면접|발표|결과|합격|미래|막막|어떡|어떻게\s*해/],
    ["love", /헤어|이별|보고\s*싶|그리워|그립|짝사랑|좋아하는|좋아해|사랑|연락|싸웠|서운|미안/],
    ["angry", /화나|화가|짜증|억울|열받|분해|분하|답답/],
    ["work", /회사|직장|상사|야근|출근|퇴근|업무|공부|학교|취업|취준|알바|과제|돈/],
    ["happy", /행복|좋았|좋아요|기뻐|기쁘|고마워|고맙|감사|설레|신나|좋은\s*일/],
  ];
  const CRISIS_REPLY = "그런 마음이 들 만큼 정말 많이 힘들었군요.\n여기까지 꺼내 줘서 고마워요. 그 말을 적는 것도 큰 용기였을 거예요.\n오늘 밤은 혼자 버티지 말고, 아래 번호로 이야기해 줘요. 당신은 소중한 사람이에요.";
  const OPEN = {
    tired: ["많이 지쳤군요. 그 말 꺼내기까지 얼마나 버텼을지 느껴져요.", "오늘 하루가 참 무거웠나 봐요.", "힘들다는 말, 여기서는 얼마든지 해도 돼요."],
    sad: ["마음이 많이 아팠군요.", "그 슬픔, 혼자 오래 안고 있었죠.", "적어 준 마음이 조용히 전해졌어요."],
    anxious: ["걱정이 마음을 꽉 채우고 있었군요.", "불안한 밤이네요. 그럴 수 있어요.", "앞이 잘 안 보여서 막막했겠어요."],
    love: ["그 사람 생각이 많이 나는 밤이군요.", "사람 때문에 마음이 많이 흔들렸군요.", "전하지 못한 마음이 있었네요."],
    self: ["스스로에게 많이 실망했나 봐요.", "자꾸 나만 부족한 것 같은 날이 있죠.", "그렇게 생각하게 된 일이 있었군요."],
    angry: ["정말 화날 만했어요.", "억울한 마음이 그대로 느껴져요.", "참느라 속이 많이 답답했겠어요."],
    work: ["일이든 공부든, 오늘도 쉽지 않았군요.", "해야 할 것들에 치여 숨 돌릴 틈도 없었겠어요.", "매일 버티는 자리가 있다는 게 얼마나 힘든지 알아요."],
    happy: ["좋은 일이 있었군요!", "그 기분이 여기까지 전해져요.", "마음이 따뜻해지는 이야기네요."],
    any: ["여기까지 와서 마음을 꺼내 줘서 고마워요.", "누구에게도 못 한 말이었겠죠.", "적어 준 마음, 잘 받았어요."],
    none: ["말하지 않아도 괜찮아요. 오늘 여기까지 온 것만으로 충분해요.", "아무 말 없이 와도 돼요. 한강은 그냥 옆에 있을게요.", "쓰기 힘든 날도 있죠. 그럼 들어만 가요."],
  };
  const BODY = {
    comfort: ["그런 마음이 드는 건 당연해요. 당신이 약해서가 아니에요.", "오늘은 괜찮은 척 안 해도 돼요. 그냥 이대로도 충분해요.", "울고 싶으면 울어도 돼요. 마음도 가끔은 쉬어야 하니까요.", "그 무게를 혼자 다 짊어지지 않아도 돼요. 오늘은 조금 내려놓아요.", "지금 이 마음도 언젠가 지나가요. 강물이 늘 흘러가듯이요.", "오늘 하루 버틴 것만으로도 정말 잘한 거예요.", "생각보다 당신 편이 많아요. 오늘 밤엔 한강도 그중 하나예요.", "천천히 가도 괜찮아요. 늦는 게 아니라 당신의 속도로 가는 거예요."],
    cheer: ["당신은 생각보다 훨씬 단단한 사람이에요. 지금까지 다 버텨 왔잖아요.", "내일의 당신은 오늘보다 조금 더 가벼울 거예요. 진심으로 응원해요.", "딱 한 걸음이면 충분해요. 그 한 걸음이 결국 길이 돼요.", "넘어져도 괜찮아요. 일어나는 법은 이미 알고 있잖아요.", "지금 흔들리는 건 앞으로 나아가고 있다는 뜻이에요.", "당신이 잘될 거라는 데 한강 물 다 걸게요.", "할 수 있어요. 안 되면 쉬었다 다시 하면 돼요. 그것도 하는 거예요.", "오늘의 고민이 언젠가 당신을 더 멋지게 만들 거예요. 파이팅!"],
    praise: ["정말 잘했어요. 여기까지 온 것, 진짜 대단한 거예요.", "아무도 말해 주지 않았다면 제가 말할게요. 오늘 정말 수고했어요.", "그 상황에서 그만큼 해낸 거, 충분히 자랑해도 돼요.", "당신은 오늘도 최선을 다했어요. 그거면 된 거예요.", "마음을 솔직하게 꺼낸 것도 잘한 일이에요. 그건 용기거든요.", "버틴 것도 해낸 거예요. 정말 잘했어요.", "남들이 몰라줘도 당신이 애쓴 시간은 진짜예요. 잘했어요, 정말.", "오늘의 당신에게 큰 박수를 보내요. 👏"],
    listen: ["응, 듣고 있어요. 더 하고 싶은 말이 있으면 또 적어도 돼요.", "그랬구나. 그런 일이 있었구나.", "말해 줘서 고마워요. 아무 말 없이 옆에 있을게요.", "응. 그 마음 그대로 여기 두고 가요.", "많이 하고 싶었던 말이었겠어요. 다 들었어요.", "조용히 다 들었어요. 판단하지 않을게요.", "응, 그럴 수 있어요. 정말 그럴 수 있어.", "여기선 정답 같은 거 없어요. 그냥 들을게요."],
    happy: ["그 행복, 마음껏 누려요. 당신은 그럴 자격이 충분해요.", "좋은 일은 나눌수록 커진대요. 오늘 밤 별처럼 오래 반짝이길!", "이런 날을 위해 그동안 버텨 온 거예요. 정말 축하해요.", "그 기분 잊지 말고 꼭 기억해 둬요. 힘든 날 꺼내 볼 수 있게요."],
  };
  const ACT = ["🌊 10초만 화면 속 강물을 바라봐요. 아무 생각 안 해도 돼요.", "🙆 어깨를 귀까지 올렸다가 툭 떨어뜨려 봐요. 두 번만.", "💧 물 한 잔 마시고 와요. 몸이 편해야 마음도 따라와요.", "🎈 바라는 거 하나, 소원 풍선으로 띄워 봐요.", "🌙 오늘 잘한 일 하나만 떠올려 봐요. 아주 작은 거라도요.", "📱 오늘은 휴대폰을 조금 일찍 내려놓고 자요.", "🌬️ 아래 '같이 숨 쉬기'로 30초만 숨 골라 봐요.", "🛌 돗자리에 앉아 '눕기'를 누르고 잠깐 별을 봐요."];
  const pick = (a, not) => { const b = a.filter(x => !not || !not.includes(x)); return (b.length ? b : a)[Math.random() * (b.length ? b : a).length | 0]; };
  function reply(v, tone, last) {
    if (v && CRISIS.test(v)) return { text: CRISIS_REPLY, crisis: true, act: "" };
    const m = v && MOODS.find(([, re]) => re.test(v)), mood = !v ? "none" : m ? m[0] : "any";
    const body = tone !== "listen" && mood === "happy" ? BODY.happy : BODY[tone] || BODY.comfort;
    return { text: pick(OPEN[mood], last) + "\n" + pick(body, last), crisis: false, act: tone === "listen" ? "" : "지금 해 볼 것 · " + pick(ACT) };
  }

  const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  let o = { send() {}, toast() {} }, now = null, typeT = 0, breathT = 0, done = [];
  const $ = id => document.getElementById(id);
  const count = k => o.send({ t: "vc", k });   // 횟수만(글은 안 보냄)

  function mindText(need) {
    const v = $("hvEd").value.replace(/\s+/g, " ").trim();
    if (!v) { if (need) o.toast("한 줄이라도 적어 주세요", 2000); return need ? null : ""; }
    if (bad(v)) { o.toast("욕설이나 야한 말은 쓸 수 없어요. 고운 말로 적어 주세요", 2800); return null; }
    return v;
  }
  function closeMind() { $("hvMind").classList.remove("on", "step2"); }
  function showReply(text, crisis) {
    let act = "";
    if (text == null) { const r = reply(now.v, now.tone, now.last); now.last = r.text; text = r.text; crisis = r.crisis; act = r.act; }
    const box = $("hvReply"), p = $("hvText"); clearInterval(typeT); p.textContent = ""; stopBreath();
    $("hvHelp").classList.toggle("on", !!crisis); $("hvAct").classList.toggle("on", !!act); $("hvAct").textContent = act;
    $("hvAgain").style.display = now && !crisis ? "" : "none";
    box.classList.add("on"); requestAnimationFrame(() => box.classList.add("show"));
    const chs = [...text]; let i = 0; typeT = setInterval(() => { p.textContent += chs[i++] || ""; if (i >= chs.length) clearInterval(typeT); }, 40);   // 한 글자씩 천천히
  }
  function stopBreath() { clearTimeout(breathT); $("hvBreath").classList.remove("on"); $("hvBreathBtn").textContent = "🌬️ 같이 숨 쉬기"; }
  function renderDone() {
    const all = [...done.map(d => [d.what, d.nick ? d.nick + "님 의견" : ""]), ...SEED.filter(s => !done.some(d => d.what === s[0]))];
    const ul = $("hvDoneList"); if (!ul) return; ul.textContent = "";
    for (const [what, from] of all.slice(0, 12)) { const li = document.createElement("li"); li.textContent = "✅ " + what + " "; if (from) { const e = document.createElement("em"); e.textContent = "← " + (from.endsWith("의견") ? from : `"${from}"`); li.appendChild(e); } ul.appendChild(li); }
    $("hvDoneN").textContent = all.length + "개";
  }

  // 하루 한 번: 오늘의 질문이 와 있다는 작은 표시(☰ 더보기와 💌 칸에 빨간 점). 강제 창은 띄우지 않고, 3분 머물면 토스트 한 줄만
  const unread = () => ls.get("hn-q-seen", "") !== kstDay();
  function syncDot() { const u = unread(); for (const id of ["moreBtn", "hvMindBtn"]) { const b = $(id); if (b) b.classList.toggle("hvDot", u); } }
  function nudge() {
    if (unread() && ls.get("hn-q-nudge", "") !== kstDay()) { ls.set("hn-q-nudge", kstDay()); return o.toast("💌 우체통에 오늘의 질문이 왔어요 · ☰ 더보기", 5000); }
  }
  function nudgeAsk() {   // 10분 넘게 머문 사람에게 사흘에 한 번만. 이미 보낸 적 있으면 안 함
    if (ls.get("hn-ask-sent", "") || Date.now() - +ls.get("hn-ask-nudge", 0) < 3 * 86400e3) return;
    ls.set("hn-ask-nudge", Date.now()); o.toast("📝 뭐가 좋았어요? ☰ › 바라는 점에서 눌러만 줘요", 6000);
  }

  window.HNVoice = {
    init(opts) {
      if ($("hvMind")) return;   // 02는 다시 연결될 때마다 아래 줄을 다시 만들어서 한 번만
      o = Object.assign(o, opts);
      const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
      const wrap = document.createElement("div"); wrap.innerHTML = html; while (wrap.firstElementChild) document.body.appendChild(wrap.firstElementChild);
      $("hvQ").textContent = todayQ(); $("hvEd").placeholder = "질문에 답해도 되고, 아무 말이나 괜찮아요…";
      $("hvMind").querySelectorAll(".st button").forEach(b => b.onclick = () => { const e = $("hvEd"); if (!e.value.startsWith(b.textContent)) e.value = b.textContent + e.value; e.focus(); });
      $("hvLater").onclick = closeMind;
      $("hvHear").onclick = () => { if (mindText(true) != null) $("hvMind").classList.add("step2"); };
      $("hvSkip").onclick = () => { $("hvEd").value = ""; $("hvMind").classList.add("step2"); };
      $("hvBack").onclick = () => $("hvMind").classList.remove("step2");
      $("hvMind").querySelectorAll("[data-tone]").forEach(b => b.onclick = () => {
        const v = mindText(false); if (v == null) return;
        now = { v, tone: b.dataset.tone, last: "" }; $("hvEd").value = ""; closeMind(); count(v ? "hear" : "skip");
        if (o.onLetter) o.onLetter();
        setTimeout(showReply, o.onLetter ? 2300 : 600);
      });
      $("hvSelf").onclick = () => {
        const v = mindText(true); if (v == null) return;
        const crisis = CRISIS.test(v); $("hvEd").value = ""; closeMind(); count("self"); if (o.onBoat) o.onBoat();
        now = null; setTimeout(() => crisis ? showReply(CRISIS_REPLY, true) : o.toast("🍃 강물이 조용히 가져갔어요. 아무 데도 남지 않아요", 4200), o.onBoat ? 1400 : 300);
      };
      $("hvShare").onclick = () => {
        const v = mindText(true); if (v == null) return;
        if (CRISIS.test(v)) { $("hvEd").value = ""; closeMind(); now = null; return showReply(CRISIS_REPLY, true); }   // 위험한 말은 나누지 않고 상담 안내
        if ([...v].length > 120) return o.toast("함께 나누기는 120자까지예요. 조금만 줄여 주세요", 2600);
        o.send({ t: "worry", text: v }); count("share");
      };
      $("hvAgain").onclick = () => { if (now) showReply(); };
      $("hvOk").onclick = () => { clearInterval(typeT); stopBreath(); now = null; $("hvText").textContent = ""; const b = $("hvReply"); b.classList.remove("show"); setTimeout(() => b.classList.remove("on"), 450); };
      $("hvBreathBtn").onclick = () => {   // 4초 들이쉬고 6초 내쉬기 3번(30초)
        if ($("hvBreath").classList.contains("on")) return stopBreath();
        const el = $("hvBreath"), dot = el.querySelector("i"), say = el.querySelector("span"); el.classList.add("on"); $("hvBreathBtn").textContent = "그만하기";
        let n = 0;
        const step = () => {
          if (n >= 6) { say.textContent = "잘했어요. 조금 가벼워졌길 바라요"; dot.style.transitionDuration = "2s"; dot.style.transform = "scale(.8)"; breathT = setTimeout(stopBreath, 3500); return; }
          const inn = n % 2 === 0; dot.style.transitionDuration = inn ? "4s" : "6s"; dot.style.transform = inn ? "scale(1.5)" : "scale(.6)";
          say.textContent = inn ? `천천히 들이쉬고… (${n / 2 + 1}/3)` : "후우… 길게 내쉬고…"; n++; breathT = setTimeout(step, inn ? 4000 : 6000);
        };
        step();
      };
      // 바라는 점: 칩은 눌러서 켜고 끄기(여러 개), 보내기 한 번에 칩+글을 묶어서 보낸다
      $("hvAsk").querySelectorAll(".chips button").forEach(b => b.onclick = () => b.classList.toggle("on"));
      $("hvAskNo").onclick = () => $("hvAsk").classList.remove("on");
      $("hvSend").onclick = () => {
        const parts = [...$("hvAsk").querySelectorAll(".chips")].map(c => { const on = [...c.querySelectorAll("button.on")].map(b => b.textContent); return on.length ? c.dataset.k + ": " + on.join(", ") : ""; }).filter(Boolean);
        const v = $("hvAskEd").value.replace(/\s+/g, " ").trim(); if (v) parts.push(v);
        if (!parts.length) return o.toast("하나만 눌러 주거나 한 줄 적어 주세요", 2200);
        o.send({ t: "feedback", text: parts.join(" / ") });
      };
      renderDone(); syncDot(); setTimeout(nudge, 180e3); setTimeout(nudgeAsk, 600e3);
      new MutationObserver(syncDot).observe(document.body, { childList: true });   // ☰ 더보기 버튼이 나중에 생겨도 점 표시
    },
    openMind() {
      if (o.closeOthers) o.closeOthers();
      $("hvEd").value = ""; $("hvMind").classList.remove("step2"); $("hvMind").classList.add("on"); ls.set("hn-q-seen", kstDay()); syncDot(); count("open");
    },
    openAsk() {
      if (o.closeOthers) o.closeOthers();
      $("hvAskEd").value = ""; $("hvAsk").querySelectorAll(".chips button.on").forEach(b => b.classList.remove("on")); $("hvDone").open = false; $("hvAsk").classList.add("on"); count("askOpen");
    },
    closeMind,
    unread,
    onMsg(m) {
      if (m.t === "init" && m.done) { done = m.done; renderDone(); }
      else if (!$("hvMind")) return;   // 아직 init 전(02는 첫 init 뒤에 아래 줄을 만든다)
      else if (m.t === "worry" && m.mine) { $("hvEd").value = ""; closeMind(); }
      else if (m.t === "feedbackOk") { $("hvAsk").classList.remove("on"); ls.set("hn-ask-sent", "1"); o.toast("📝 운영자에게 꼭 전해 줄게요. 고마워요!", 3800); }
      else if (m.t === "feedbackBad") o.toast(m.why === "bad" ? "욕설이나 야한 말은 쓸 수 없어요. 고운 말로 적어 주세요" : m.why === "wait" ? "1분에 한 번, 하루 다섯 번까지 보낼 수 있어요" : "한 줄이라도 적어 주세요", 2800);
      else if (m.t === "fbDone" && m.d) { done = [m.d, ...done.filter(x => x.what !== m.d.what)].slice(0, 10); renderDone(); o.toast(`✅ 바라는 점 반영: ${m.d.what}`, 6000); }
    },
  };
})();
