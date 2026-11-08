// 🌙 한강, 열두 밤 — 매일 밤 10시에 한 화씩 열리는 연애 이야기 (01·02 공통, 누를 때만 불러옴 → 첫 접속 용량 0)
// 저장은 이 폰 localStorage(hn-story)에만. 서버 저장·서버 변경 없음.
// 사용: HNStory.init({ myNick, names, openSup, closeOthers, stat, admin }) 후 HNStory.open()
(() => {
  if (window.HNStory && window.HNStory.ready) return;
  const H = window.HNStory = window.HNStory || {};
  const CH = {
    s: { j: "과", n: "서윤", e: "🎸", col: "#ffb07a", who: "물빛무대 버스커" },
    d: { j: "와", n: "도하", e: "🏪", col: "#8fd3ff", who: "편의점 야간 알바" },
    h: { j: "과", n: "해솔", e: "🚲", col: "#b8f28a", who: "밤마다 지나가는 자전거" },
  };
  // 줄: "@배경|시간·장소"  "n:설명"  "y:내 말"  "s:/d:/h:" 인물  "c:" 이번 이야기 상대
  // 선택: ["?", [보기, 호감도(숫자=상대, {s:8}=특정 인물, {pick:"s"}=상대 고르기), 대답(선택)], ...]
  const EP1 = { t: "처음 마주친 밤", L: [
    "@river|22:47 · 여의도 한강공원",
    "n:오늘도 혼자 나왔다. 돗자리를 펴고 앉으니 강바람이 생각보다 차다.",
    "n:멀리서 기타 소리가 들린다. 오른쪽 편의점 불빛은 아직 환하다.",
    "n:그리고 자전거 한 대가 천천히 내 앞을 지나간다.",
    "h:어, 거기 돗자리 끈 풀렸어요!",
    "n:바람에 돗자리 끝이 펄럭인다.",
    ["?", ["앗, 감사해요!", { h: 5 }, "h:바람 세죠? 꽉 묶어요!"], ["(말없이 고개만 끄덕인다)", { h: 2 }, "n:그 사람은 손을 한 번 흔들고 멀어졌다."], ["알아요, 일부러 그런 거예요.", { h: 8 }, "h:ㅋㅋ 바람이랑 싸우는 중이었구나. 이겨요!"]],
    "@store|23:05 · 편의점",
    "n:따뜻한 게 먹고 싶어서 편의점에 들어갔다.",
    "d:…라면이면 저쪽에서 물 받으시면 돼요.",
    "n:컵라면을 고르는데, 계산대의 그 사람이 내 손에 든 걸 힐끔 본다.",
    "d:그거 매워요. 오늘 같은 날은 이게 나아요.",
    "n:그 사람이 다른 라면 하나를 계산대 위에 올려놓는다.",
    ["?", ["그럼 추천해주신 걸로요.", { d: 8 }, "d:…물은 선까지만 받으세요. 그게 제일 맛있어요."], ["매운 거 좋아해요.", { d: 2 }, "d:…우유는 저기 있어요."], ["둘 다 살게요.", { d: 5 }, "d:(아주 잠깐 웃은 것 같다) 2,700원이요."]],
    "@stage|23:24 · 물빛무대",
    "n:라면을 들고 돌아오는 길, 아까 그 기타 소리의 주인이 보인다.",
    "n:관객은 아무도 없다. 그래도 그 사람은 노래를 멈추지 않는다.",
    "n:마지막 소절이 끝나고, 그 사람이 처음으로 고개를 든다.",
    "s:…계속 서 계셨어요?",
    ["?", ["노래가 좋아서요.", { s: 8 }, "s:…그 말, 오늘 처음 들어요."], ["관객이 없길래 한 명 채워드렸어요.", { s: 5 }, "s:고마운 건지 모르겠네. …고마워요."], ["(말없이 박수를 친다)", { s: 6 }, "n:그 사람이 기타 넥을 쥔 채 꾸벅 고개를 숙였다."]],
    "@river|23:58 · 내 돗자리",
    "n:돗자리로 돌아와 누웠다. 별이 몇 개 보인다.",
    "n:오늘 밤, 가장 마음에 남은 사람은…",
    ["?", ["🎸 서윤 — 노래가 아직 귀에 남아 있다", { pick: "s" }], ["🏪 도하 — 라면이 생각보다 따뜻했다", { pick: "d" }], ["🚲 해솔 — 그 웃음소리가 자꾸 생각난다", { pick: "h" }]],
  ] };
  // 2~12화 (12화는 L 뒤에 엔딩 3종: ok 고백 / mid 여운 / fr 친구)
  const R = {
    s: [
      { t: "다시, 물빛무대", L: [
        "@stage|22:52 · 물빛무대",
        "n:오늘도 그 기타 소리가 들린다. 발이 먼저 그쪽으로 걸어간다.",
        "n:어제와 같은 자리. 관객은 여전히 나 하나.",
        "c:…또 왔네요.",
        "c:어제 그 관객. 오늘은 신청곡 받아요. 한 곡만.",
        ["?", ["오늘 제일 부르고 싶은 노래요.", 8, "c:…그런 신청은 처음인데. 그럼 내 노래 할게요. 아무도 모르는 거."], ["밤에 어울리는 노래요.", 5, "c:밤이야 다 어울리죠. 알겠어요."], ["아무거나요.", 2, "c:아무거나가 제일 어려운 거 알아요?"]],
        "n:노래가 시작되자 강바람이 잠깐 멈춘 것 같았다.",
        "n:노래가 끝나고 그 사람이 기타 케이스를 연다. 안에는 동전 몇 개뿐이다.",
        ["?", ["(케이스에 천 원을 넣는다)", 5, "c:…이러면 내일도 부르러 나와야 하잖아요."], ["내일도 여기서 해요?", 8, "c:비만 안 오면요. 비 와도 할 수도 있고."]],
        "n:돌아오는 길, 아까 그 멜로디를 나도 모르게 흥얼거렸다.",
      ] },
      { t: "이름을 알게 된 밤", L: [
        "@stage|23:40 · 물빛무대",
        "n:버스킹 허가 시간이 끝나는 23시 40분. 그 사람이 장비를 정리하고 있다.",
        "n:앰프는 생각보다 무거워 보인다.",
        ["?", ["제가 하나 들어드릴게요.", 8, "c:…앰프는 무거운데. 그럼 이 보면대만요."], ["(조금 떨어져서 기다린다)", 5, "c:…왜 아직 안 갔어요?"]],
        "n:주차장까지 걷는 짧은 길. 기타 케이스에 스티커가 잔뜩 붙어 있다.",
        "c:서윤이에요. 이름. 매일 오는 사람한테 계속 '저기요' 하기 이상해서.",
        "y:…저는 매일 오는 사람이에요.",
        "c:(처음으로 소리 내서 웃는다) 그건 알아요.",
        ["?", ["서윤. 노래랑 잘 어울리는 이름이에요.", 8, "c:그런 말 하면 나 내일 더 열심히 해야 되잖아요."], ["스티커는 다 무슨 의미예요?", 5, "c:공연한 곳마다 하나씩. 근데 한강 건 아직 없어요. 여기가 제일 오래 있었는데."]],
        "n:서윤이 차 문을 닫기 전에 한 번 손을 흔들었다.",
      ] },
      { t: "비 오는 밤", L: [
        "@rain|22:31 · 물빛무대 그늘막",
        "n:오후부터 내린 비가 그치지 않는다. 설마 하면서도 나와 봤다.",
        "n:무대 옆 그늘막 아래, 서윤이 젖은 기타 케이스를 끌어안고 앉아 있다.",
        "c:…진짜 왔네. 비 오는데.",
        ["?", ["비 와도 할 수도 있다면서요.", 8, "c:그 말 기억했어요? …그럼 해야겠다."], ["우산 같이 써요.", 5, "c:그늘막 있어서 괜찮아요. 근데… 옆에 앉아요."]],
        "n:서윤은 앰프 없이, 빗소리 사이로 아주 작게 노래했다.",
        "n:관객은 나 하나. 오늘은 그게 이상하게 다행이었다.",
        "c:비 오는 날 노래가 제일 잘 돼요. 아무도 안 들으니까.",
        ["?", ["저는 듣고 있는데요.", 8, "c:…그러니까. 오늘은 좀 떨렸어요."], ["왜 아무도 안 들을 때가 좋아요?", 5, "c:틀려도 되니까요. 사람들 앞에선 틀리면 안 되잖아요."]],
        "n:빗소리가 잦아들 때쯤, 서윤의 어깨가 내 어깨에 살짝 닿았다.",
      ] },
      { t: "작은 약속", L: [
        "@stage|23:15 · 물빛무대",
        "n:오늘따라 서윤이 자꾸 시계를 본다.",
        "c:있잖아요. 내일 새 곡 처음 불러요. 아직 아무한테도 안 들려준 거.",
        "c:…내일도 와요?",
        ["?", ["당연하죠. 맨 앞자리 맡아둘게요.", 8, "c:맨 앞자리라고 해봐야 한 자리지만. …좋아요."], ["노력해볼게요.", 2, "c:노력… 그래요. 와주면 좋고."], ["제목이 뭔데요?", 5, "c:그건 내일 알려줄게요. 와야 알 수 있어요."]],
        "n:서윤이 피크 하나를 손바닥에 올려준다. 노란색, 끝이 조금 닳았다.",
        "c:약속 보증금. 내일 와서 돌려줘요.",
        ["?", ["(피크를 꼭 쥔다) 잃어버리면 안 되겠다.", 8, "c:잃어버리면 노래 한 곡 빚지는 걸로."], ["이거 아끼는 거 아니에요?", 5, "c:제일 아끼는 거라서 주는 거예요."]],
        "n:집에 오는 내내 주머니 속 피크를 만지작거렸다.",
      ] },
      { t: "오해한 밤", L: [
        "@stage|22:40 · 물빛무대",
        "n:피크를 들고 일찍 나왔다. 그런데 무대 앞에 처음 보는 사람이 서 있다.",
        "n:서윤이 그 사람과 웃으며 이야기하고 있다. 나한테는 한 번도 안 보여준 표정으로.",
        ["?", ["(그냥 다가가서 인사한다)", 8, "n:서윤이 나를 보고 손을 크게 흔든다."], ["(멀리서 기다린다)", 5, "n:한참 뒤, 서윤이 나를 발견하고 뛰어왔다."], ["(돌아서서 그냥 간다)", 0, "n:몇 걸음 못 가서 등 뒤에서 서윤이 내 이름 대신 '관객님!'을 불렀다."]],
        "c:아까 그 사람? 예전 밴드 같이 하던 형이에요. 오디션 정보 알려주러 왔어요.",
        "c:…혹시 이상하게 생각했어요?",
        ["?", ["조금요. 솔직히.", 8, "c:(웃음을 참는 얼굴) …그거 좀 좋네."], ["아니요, 전혀요.", 3, "c:표정은 전혀가 아니던데."]],
        "n:그날 서윤은 새 곡을 불렀다. 제목은 아직 비밀이라고 했다.",
        "n:노래 중간, 서윤의 눈이 한 번 나를 향했다가 급하게 달아났다.",
      ] },
      { t: "그 사람의 비밀", L: [
        "@river|23:50 · 강가 계단",
        "n:버스킹이 끝나고 처음으로 같이 강가 계단에 앉았다.",
        "c:오디션, 이번이 열두 번째예요. 열한 번 떨어졌어요.",
        "c:이번에도 안 되면 그만두려고요. 그래서 요즘 매일 나와요. 마지막일지 몰라서.",
        ["?", ["그만두지 마요. 저 아직 다 못 들었어요.", 8, "c:…그런 이유로 계속하는 사람도 있을까요."], ["왜 하필 한강에서 불러요?", 5, "c:아빠가 여기서 처음 기타 가르쳐줬어요. 저 계단에서."]],
        "c:아빠가 그랬어요. 한 명이라도 듣고 있으면 끝까지 부르라고.",
        "c:요즘은 그 한 명이 매일 와서… 좀 반칙이에요.",
        ["?", ["반칙이어도 계속 올 거예요.", 8, "c:(고개를 숙이고 한참 웃는다) 진짜 반칙이다."], ["아버지도 노래 들으시면 좋아하실 거예요.", 5, "c:…그랬으면 좋겠다."]],
        "n:강 건너 불빛이 서윤의 젖은 눈가에 번졌다.",
      ] },
      { t: "정각 불꽃놀이", L: [
        "@fire|00:00 · 물빛무대",
        "n:자정. 하늘에서 불꽃이 터지기 시작했다.",
        "n:서윤은 노래를 멈추고 나란히 서서 하늘을 봤다.",
        "c:새 곡 제목, 알려줄까요.",
        "c:'열두 밤'. 처음 관객 생긴 날부터 세고 있었어요.",
        ["?", ["오늘이 몇 번째 밤인데요?", 8, "c:여덟 번째. …관객님 오고 나서부터만 셌어요."], ["좋은 제목이에요.", 5, "c:가사는 더 좋아요. 아직 못 들려주는 부분이 있어서 그렇지."]],
        "n:마지막 불꽃이 길게 꼬리를 끌며 강물로 떨어졌다.",
        ["?", ["(불꽃이 아니라 서윤을 본다)", 8, "c:…불꽃 봐요. 나 말고."], ["(소원을 빈다)", 5, "c:뭐 빌었어요? …아니, 말하지 마요. 나도 안 말할 거니까."]],
      ] },
      { t: "오지 않은 밤", L: [
        "@stage|23:00 · 물빛무대",
        "n:무대가 비어 있다. 기타 소리도, 앰프도 없다.",
        "n:한 시간을 기다렸다. 서윤은 오지 않았다.",
        ["?", ["(조금 더 기다린다)", 8, "n:자정이 넘도록 무대 앞 계단에 앉아 있었다."], ["(무대에 쪽지를 남긴다)", 8, "n:'오늘도 왔어요. 관객 1.' 쪽지를 보면대 다리에 끼워뒀다."], ["(집으로 돌아간다)", 2, "n:돌아가는 길이 유난히 조용했다."]],
        "n:돌아가려는데 무대 옆 계단에 뭔가 반짝인다.",
        "n:노란 피크. 내가 돌려준 그 피크다. 밑에 작은 종이가 깔려 있다.",
        "n:'오디션 연습 가요. 오늘 못 불러서 미안해요. 이거 다시 맡아줘요. — 서윤'",
        ["?", ["(피크를 주머니에 넣는다)", 8, "n:피크가 이상하게 따뜻했다."], ["(종이 뒤에 답장을 쓴다)", 5, "n:'잘하고 와요. 맨 앞자리 비워둘게요.'"]],
      ] },
      { t: "용기 내는 밤", L: [
        "@stage|22:45 · 물빛무대",
        "n:서윤이 돌아왔다. 그런데 기타를 꺼내지 않는다.",
        "c:오디션 망친 것 같아요. 첫 소절에서 목이 잠겼어요.",
        "c:모르는 사람들 앞에선 안 되나 봐요. 여기선 되는데.",
        ["?", ["여기서 지금 불러봐요. 제가 심사위원 할게요.", 8, "c:…심사위원님 표정이 너무 다정해서 실격이에요."], ["아직 결과 안 나왔잖아요.", 5, "c:그쵸. 아직이죠."]],
        "n:서윤이 기타를 꺼내 '열두 밤'을 처음부터 끝까지 불렀다.",
        "n:지난번엔 비어 있던 마지막 구절이 채워져 있었다.",
        "n:'매일 같은 자리에 앉아준 너에게, 열두 번째 밤엔 말할게'",
        ["?", ["마지막 구절, 누구한테 하는 말이에요?", 8, "c:그건… 열두 번째 밤에 알려준다니까요."], ["(크게 박수 친다) 이거면 붙어요.", 5, "c:관객님은 항상 후해요."]],
        "n:노래가 끝나고도 한참, 둘 다 아무 말도 하지 않았다.",
      ] },
      { t: "고백 전날", L: [
        "@river|23:30 · 강가 계단",
        "c:내일 오디션 결과 나와요. 밤 10시에.",
        "c:혼자 보기 무서워서요. …같이 봐줄래요? 여기서.",
        ["?", ["당연하죠. 어떤 결과든 옆에 있을게요.", 8, "c:어떤 결과든… 그 말 믿을게요."], ["붙을 거예요. 축하 준비해 올게요.", 5, "c:떨어지면 축하 대신 라면 사줘요."]],
        "c:그리고 내일, 할 말 있어요. 결과랑 상관없이.",
        "n:서윤이 손가락으로 계단에 숫자를 쓴다. 12.",
        ["?", ["저도 할 말 있어요.", 8, "c:(눈이 커진다) …그럼 내일 누가 먼저 할지 정해야겠네."], ["무슨 말인지 궁금해서 잠 못 자겠다.", 5, "c:나도 못 잘 거예요. 공평하죠."]],
        "n:그날 밤, 정말로 잠이 오지 않았다.",
      ] },
      { t: "열두 번째 밤", L: [
        "@stage|22:00 · 물빛무대",
        "n:밤 10시. 서윤의 휴대폰 화면이 켜졌다.",
        "n:서윤이 화면을 오래 들여다보다가, 천천히 나를 돌아봤다.",
        "c:…붙었어요. 열두 번째에.",
        "n:서윤이 웃는데 눈물이 먼저 떨어졌다.",
        "c:이제 약속한 말 할게요. 아, 아니다. 노래로 할게요. 그게 제일 안 떨리니까.",
        "n:'열두 밤'의 마지막 구절. 서윤이 노래를 멈추고 나를 똑바로 본다.",
        ["?", ["(먼저 말한다) 좋아해요. 첫 소절부터.", 15, "c:…반칙. 그거 내 대사였는데."], ["(끝까지 듣는다)", 10, "c:매일 와줘서 고마워요. 좋아해요."], ["축하해요, 진짜로.", 0, "c:고마워요. …관객님 덕분이에요."]],
      ], ok: [
        "@fire|23:00 · 물빛무대",
        "n:그 밤, 한강 하늘에 늦은 불꽃이 하나 올라갔다.",
        "c:이제 관객님 말고 이름으로 불러도 돼요?",
        "c:그리고… 다음 공연부터는 맨 앞자리 말고 옆자리에 있어줘요.",
        "n:서윤의 기타 케이스에 새 스티커가 붙었다. 한강. 그리고 작은 하트 하나.",
      ], mid: [
        "@river|23:40 · 강가 계단",
        "c:다음 주부터 연습생 숙소 들어가요. 당분간 여기 못 나와요.",
        "c:그러니까 대답은… 다음 시즌에 들을게요. 이 무대에서. 꼭.",
        "n:서윤이 노란 피크를 다시 내 손에 쥐여줬다. 이번엔 돌려달라는 말이 없었다.",
      ], fr: [
        "@stage|23:20 · 물빛무대",
        "c:관객님은 내 첫 번째 팬이에요. 평생 1번.",
        "c:유명해지면 사인 제일 먼저 해줄게요. 친구 할인으로.",
        "n:서윤의 웃음이 처음 만난 밤보다 훨씬 가벼웠다. 그걸로 충분한 밤이었다.",
      ] },
    ],
    d: [
      { t: "선까지만", L: [
        "@store|23:02 · 편의점",
        "n:또 편의점에 왔다. 사실 라면이 먹고 싶었던 건 아니다.",
        "n:계산대 위에 어제 그 라면이 이미 올라와 있다.",
        "c:…어제 그 라면 찾으실 것 같아서요.",
        ["?", ["기억하셨어요?", 8, "c:야간엔 손님이 별로 없어서요. …다 기억해요."], ["오늘은 다른 거 먹을 건데요.", 2, "c:(라면을 슬쩍 내려놓는다) …네."], ["역시 이거죠.", 5, "c:물은 선까지만이에요."]],
        "n:창가 자리에서 라면을 먹는데, 그 사람이 진열대를 정리하면서 자꾸 이쪽을 본다.",
        "n:눈이 마주치자 급하게 삼각김밥 쪽으로 고개를 돌린다.",
        ["?", ["(손을 흔든다)", 8, "n:그 사람이 아주 작게, 한 손가락만 들어 흔들었다."], ["(모른 척 라면을 먹는다)", 5, "n:국물이 유난히 따뜻했다."]],
        "c:…안녕히 가세요. 내일도요.",
        "n:'내일도요'까지 붙이는 편의점 인사는 처음이었다.",
      ] },
      { t: "이름표", L: [
        "@store|01:10 · 편의점 앞 파라솔",
        "n:늦게까지 남아 있었더니, 그 사람이 쉬는 시간이라며 밖으로 나왔다.",
        "n:파라솔 아래, 서로 한 자리 떨어져 앉았다.",
        "c:…매일 오시네요.",
        ["?", ["라면이 맛있어서요.", 5, "c:라면은 어디서 먹어도 맛 똑같아요."], ["라면 끓여주는 사람이 좋아서요.", 8, "c:(사레가 들린다) …끓인 건 손님이잖아요."]],
        "n:조끼의 이름표가 가로등에 반짝인다. '도하'.",
        "y:도하 씨.",
        "c:…이름표 보고 부른 사람 처음이에요. 다들 '저기요'라서.",
        ["?", ["앞으로 계속 이름으로 부를게요.", 8, "c:…네. 그럼 저도 손님 말고 다른 걸로 불러야 되나."], ["이름 예쁘네요.", 5, "c:할머니가 지어줬어요. 물 하(河). 강."]],
        "n:쉬는 시간 5분은 생각보다 금방 끝났다.",
      ] },
      { t: "비 오는 밤", L: [
        "@rain|23:30 · 편의점",
        "n:갑자기 비가 쏟아졌다. 우산이 없다.",
        "n:편의점 처마 밑에서 하늘만 보고 있는데, 문이 열린다.",
        "c:이거 쓰세요.",
        "n:도하가 투명 우산을 내민다. 파는 게 아니라 자기 것인 것 같다.",
        ["?", ["내일 꼭 돌려드릴게요.", 8, "c:…안 돌려줘도 되는데. 그래도 오면 좋고요."], ["도하 씨는요? 퇴근할 때 비 오면?", 8, "c:저 새벽 6시에 끝나요. 그땐 그쳐요. …아마."], ["괜찮아요, 그냥 뛰어갈게요.", 2, "c:감기 걸리면 라면도 못 먹어요."]],
        "n:우산을 받아 들고 몇 걸음 가다 뒤를 돌아봤다.",
        "n:도하가 아직 문 앞에 서 있다. 내가 돌아보자 황급히 안으로 들어간다.",
        ["?", ["(우산을 들어 흔든다)", 8, "n:유리문 너머로 도하가 고개를 꾸벅 숙이는 게 보였다."], ["(그냥 걷는다)", 4, "n:빗소리가 우산 위로 동그랗게 떨어졌다."]],
      ] },
      { t: "목요일의 약속", L: [
        "@store|22:50 · 편의점",
        "n:우산을 돌려주러 왔다. 말린 우산에 작은 쪽지를 붙였다.",
        ["?", ["(쪽지에 '고마워요'라고 쓴다)", 5, "c:…이거 버리지 말아야겠다."], ["(쪽지에 웃는 얼굴을 그린다)", 8, "c:(쪽지를 오래 본다) …저 닮았네요. 무표정만 빼고."]],
        "c:목요일엔 새 삼각김밥 들어와요. 명란 마요.",
        "c:…그때도 와요?",
        ["?", ["도하 씨가 있으면 올게요.", 8, "c:목요일 야간은 저 고정이에요. 고정."], ["명란 마요면 무조건이죠.", 5, "c:하나 빼놓을게요. 금방 나가요, 그거."]],
        "n:계산할 때, 영수증과 함께 작은 사탕 하나가 손바닥에 올라왔다.",
        "c:…서비스 아니에요. 제 거예요.",
      ] },
      { t: "차가운 밤", L: [
        "@store|23:20 · 편의점",
        "n:목요일. 명란 마요를 사러 왔다. 그런데 도하의 얼굴이 굳어 있다.",
        "c:…계산 도와드릴게요.",
        "n:눈도 안 마주친다. 삼각김밥도 빼놓지 않았다.",
        ["?", ["무슨 일 있어요?", 8, "c:…아니에요. 그냥 오늘 좀."], ["(아무 말 없이 계산하고 나간다)", 2, "n:문이 닫히는 소리가 이상하게 컸다."], ["(창가에서 끝날 때까지 기다린다)", 8, "n:한 시간쯤 지나, 도하가 캔커피 두 개를 들고 나왔다."]],
        "c:아까 취한 손님이 소리를 질러서요. 점장님한테도 혼나고.",
        "c:그런 날은 아무 표정도 안 지어야 버텨져요. …손님한테까지 그래서 미안해요.",
        ["?", ["오늘은 손님 말고 친구로 앉아 있을게요.", 8, "c:…친구. (캔커피를 따준다) 그럼 이건 친구 거."], ["고생했어요, 진짜.", 5, "c:그 말 들으려고 버틴 것 같아요."]],
        "n:가방 안에서 명란 마요가 하나 나왔다. 빼놓은 거, 잊지 않았던 거다.",
      ] },
      { t: "스케치북", L: [
        "@store|01:30 · 편의점 앞 파라솔",
        "n:쉬는 시간. 도하가 계산대 밑에서 낡은 스케치북을 꺼냈다.",
        "n:한강 다리들이 빼곡하다. 원효대교, 마포대교, 한강철교. 선이 섬세하다.",
        "c:낮엔 건축 공부해요. 다리 설계하고 싶어서. 밤엔 여기서 일하고.",
        ["?", ["이거 도하 씨가 다 그린 거예요?", 5, "c:손님 없을 때만요. 야간이 그래서 좋아요."], ["언젠가 도하 씨가 만든 다리 건너보고 싶어요.", 8, "c:…그 말 진짜 오래 기억할 것 같아요."]],
        "n:스케치북 마지막 장에 다리가 아닌 그림이 있다.",
        "n:강가에 펼쳐진 작은 돗자리. 거기 앉은 사람의 뒷모습.",
        ["?", ["이거… 저예요?", 8, "c:(스케치북을 덮는다) …다리 그리다가 손이 미끄러졌어요."], ["(못 본 척 넘긴다)", 4, "n:도하의 귀가 빨개져 있었다."]],
      ] },
      { t: "계산대 밖의 불꽃", L: [
        "@fire|00:00 · 편의점 앞",
        "n:자정. 불꽃놀이가 시작되자 도하가 처음으로 계산대 밖으로 나왔다.",
        "c:불꽃, 늘 유리문 너머로만 봤어요. 계산하느라.",
        ["?", ["오늘은 같이 제대로 봐요.", 8, "c:…네. 오늘은 손님 와도 잠깐만 기다리라고 할래요."], ["점장님한테 혼나는 거 아니에요?", 5, "c:5분은 괜찮아요. 아마."]],
        "n:불꽃이 터질 때마다 도하의 얼굴이 색깔을 바꿨다.",
        "c:…혹시 소원 빌어요?",
        ["?", ["도하 씨 다리가 꼭 지어지게요.", 8, "c:남의 소원 빌어주는 사람이 어딨어요. …고마워요."], ["비밀이에요.", 5, "c:그럼 저도 비밀. 근데 제 건 아마 같은 거예요."]],
        "n:마지막 불꽃이 질 때, 도하의 새끼손가락이 내 손등을 스쳤다. 실수는 아닌 것 같았다.",
      ] },
      { t: "다른 사람이 서 있던 밤", L: [
        "@store|23:10 · 편의점",
        "n:계산대에 처음 보는 사람이 서 있다.",
        "y:혹시… 도하 씨는요?",
        "n:'아, 도하 형이요? 시험 기간이라 일주일 쉰대요. 그리고 이거, 매일 오는 분 오면 주라고.'",
        "n:봉투 안에 스케치 한 장. 돗자리 그림이 완성돼 있다. 옆에 작은 글씨.",
        "n:'말도 안 하고 쉬어서 미안해요. 시험 끝나면 라면 사줄게요. 이번엔 제가.'",
        ["?", ["(편의점에 응원 쪽지를 맡긴다)", 8, "n:'시험 잘 봐요. 물은 선까지만.' 알바생이 웃으며 받아갔다."], ["(스케치를 소중히 넣는다)", 5, "n:종이에서 희미하게 연필 냄새가 났다."], ["(괜히 서운하다)", 2, "n:말해주고 가지. 그런 생각을 하는 내가 조금 낯설었다."]],
        "n:혼자 먹는 라면은 생각보다 맛이 없었다.",
        ["?", ["(다음 주 목요일을 달력에 표시한다)", 8, "n:명란 마요 그림까지 그려 넣었다."], ["(그래도 매일 온다)", 8, "n:알바생이 '오늘도 오셨네요' 하고 웃었다."]],
      ] },
      { t: "용기 내는 밤", L: [
        "@store|22:58 · 편의점",
        "n:목요일. 문을 열자 익숙한 목소리가 들린다.",
        "c:…어서 오세요.",
        "n:도하다. 눈 밑이 퀭한데 웃고 있다.",
        ["?", ["시험은요?", 5, "c:끝났어요. 쪽지 덕분에 물 조절 실수 안 했어요."], ["보고 싶었어요.", 8, "c:(삼각김밥을 떨어뜨린다) …저, 저도요."]],
        "c:약속한 라면이요. 오늘은 제가 끓일게요.",
        "n:도하가 라면 두 개에 물을 붓는다. 정확히 선까지.",
        "c:있잖아요. 다음 주가 마지막 야간이에요. 낮에 설계사무소 인턴 붙어서.",
        ["?", ["축하해요! …근데 그럼 이제 못 봐요?", 8, "c:그래서 하는 말이에요. …계산대 밖에서 봐도 돼요?"], ["드디어 꿈 쪽으로 가네요.", 5, "c:손님이 다리 건너보고 싶다고 해서 힘냈어요."]],
      ] },
      { t: "마지막 야간 전날", L: [
        "@store|01:00 · 편의점 앞 파라솔",
        "c:내일이 진짜 마지막이에요. 새벽 6시에 끝나요.",
        "c:…끝나고 해 뜨는 거 같이 볼래요? 야간 하면서 매일 봤는데, 혼자라서.",
        ["?", ["새벽 6시, 여기서 기다릴게요.", 8, "c:졸리면 안 와도 돼요. …아니, 와줘요."], ["밤새울 자신 있어요.", 5, "c:라면 무한 제공할게요. 마지막 날이니까."]],
        "n:도하가 스케치북을 펼친다. 새 그림. 다리 위에 두 사람이 서 있다.",
        "c:이건 아직 다 못 그렸어요. 내일 완성하려고요.",
        ["?", ["두 사람이 누군데요?", 8, "c:…내일 알려줄게요. 해 뜨면."], ["완성되면 저 주는 거예요?", 5, "c:원래 그러려고 그렸어요."]],
      ] },
      { t: "열두 번째 밤", L: [
        "@dawn|05:58 · 한강 둔치",
        "n:새벽 6시. 조끼를 벗은 도하가 편의점 문을 나선다.",
        "n:처음 보는 모습. 계산대 없이 서 있는 도하.",
        "c:…진짜 기다렸네요.",
        "n:강 너머로 하늘이 주황색으로 물들기 시작한다.",
        "c:그림 완성했어요. 다리 위 두 사람.",
        "c:하나는 저예요. 하나는… 매일 선까지만 물 받던 사람.",
        ["?", ["(도하 손을 잡는다) 이제 계산대 밖이네요.", 15, "c:…네. 이제 손님 아니에요."], ["저도 그림 속에 있고 싶었어요.", 10, "c:처음부터 있었어요. 마지막 장에."], ["그림 정말 예뻐요.", 0, "c:…고마워요. 가져가요."]],
      ], ok: [
        "@dawn|06:20 · 한강 둔치",
        "c:좋아해요. 라면 고를 때부터.",
        "c:언젠가 진짜 다리 지으면, 제일 먼저 같이 건너요.",
        "n:해가 완전히 떠올랐다. 우리 그림자가 다리처럼 길게 이어졌다.",
      ], mid: [
        "@dawn|06:15 · 한강 둔치",
        "c:인턴 끝나면 지방 현장으로 가요. 진짜 다리 짓는 데로.",
        "c:다 지으면 보여주러 올게요. 그때 대답해줘요. 다음 시즌에.",
        "n:도하가 건넨 그림 뒤에 날짜 하나가 적혀 있었다. 아직 오지 않은 날짜.",
      ], fr: [
        "@dawn|06:10 · 한강 둔치",
        "c:손님 덕분에 야간이 덜 외로웠어요. 진짜로.",
        "c:가끔 연락해요. 라면 친구.",
        "n:도하가 처음으로 활짝 웃었다. 해보다 그게 더 밝았다.",
      ] },
    ],
    h: [
      { t: "오늘은 괜찮네요", L: [
        "@path|23:31 · 자전거길",
        "n:어제 그 시간. 저 멀리서 자전거 불빛이 다가온다.",
        "c:오, 오늘은 돗자리 멀쩡하네요!",
        "n:이번엔 지나가지 않고 내 앞에 끼익 멈춘다.",
        ["?", ["어제 덕분에 꽉 묶었어요.", 8, "c:역시 내가 한 건 했네! 칭찬해주세요."], ["매일 이 시간에 지나가요?", 5, "c:11시 반, 반포에서 출발해서 여기 찍고 돌아가요. 매일."]],
        "c:근데 혼자 나와서 뭐 해요? 맨날 하늘 보던데.",
        ["?", ["별 세요. 오늘은 여섯 개.", 8, "c:(하늘을 보며 손가락을 접는다) 일곱 개! 나 이겼다."], ["그냥 멍때려요.", 5, "c:그게 제일 어려운 건데. 고수네."]],
        "c:내일도 지나갈 테니까 손 흔들어줘요. 그럼 더 빨리 달려지거든요.",
        "n:불빛이 멀어지는 동안, 나도 모르게 손을 흔들고 있었다.",
      ] },
      { t: "이름을 알게 된 밤", L: [
        "@path|23:33 · 자전거길",
        "n:손을 흔들었더니 자전거가 또 멈췄다. 오늘은 자전거에서 아예 내린다.",
        "c:해솔이에요. 해 + 소나무. 이름은 해인데 밤에만 나와요.",
        ["?", ["그럼 저는 밤에만 해 보는 거네요.", 8, "c:와, 그거 오늘 들은 말 중에 제일 좋다."], ["해솔. 밝은 이름이다.", 5, "c:이름값 하려고 맨날 웃어요."]],
        "n:해솔이 물병을 꺼내 마시고 내 옆에 털썩 앉았다.",
        "c:원래 안 멈추는데. 여기서 멈추면 기록이 늦어져요.",
        "c:근데 요즘 기록보다 여기 멈추는 게 더 재밌어요.",
        ["?", ["그럼 내일도 멈춰요.", 8, "c:그럼 1분 일찍 출발해야겠다."], ["기록이 그렇게 중요해요?", 5, "c:음… 그건 나중에 말해줄게요. 좀 긴 얘기라."]],
      ] },
      { t: "비 오는 밤", L: [
        "@rain|23:40 · 그늘막",
        "n:비가 오는데도 그 시간에 불빛이 보였다. 해솔이 자전거를 끌고 오고 있다.",
        "n:온몸이 젖었는데 웃고 있다.",
        "c:비 와도 달려요. 하루라도 거르면 안 되거든요!",
        ["?", ["(수건을 건넨다) 감기 걸려요.", 8, "c:헐, 수건 왜 갖고 다녀요? …나 때문에?"], ["바보 아니에요?", 5, "c:들켰다. 근데 비 맞으면 기분 좋아요. 해봐요."]],
        "n:그늘막 아래 나란히 앉았다. 해솔의 머리에서 빗물이 똑똑 떨어진다.",
        "c:있잖아요. 비 오는 날 누가 기다려준 거, 처음이에요.",
        ["?", ["기다린 거 아니에요. …조금만요.", 8, "c:조금만도 좋아요. (웃음이 커진다)"], ["다음엔 우산 들고 올게요.", 5, "c:우산 쓰고 자전거 못 타요. 그냥 수건으로 해줘요."]],
      ] },
      { t: "같이 달리는 약속", L: [
        "@path|23:20 · 따릉이 대여소",
        "c:오늘은 같이 달려요! 따릉이 빌려요, 내가 쏠게.",
        ["?", ["(따릉이에 올라탄다) 천천히 가요?", 8, "c:오늘은 기록 버림. 대신 수다 기록 세우자."], ["저 자전거 잘 못 타요.", 5, "c:그럼 내가 뒤에서 잡아줄게요. 진짜로."]],
        "n:강바람을 가르며 나란히 달렸다. 해솔은 계속 뒤를 돌아본다.",
        "n:여의도에서 반포까지. 해솔의 매일을 처음 같이 달렸다.",
        "c:내일도 같이 달려요. 11시 반. 늦으면 벌칙.",
        ["?", ["벌칙은요?", 5, "c:늦는 사람이 라면 사기. 근데 나는 안 늦음."], ["약속.", 8, "c:(새끼손가락을 내민다) 도장까지 찍어요."]],
        "n:헤어질 때 다리가 후들거렸다. 그게 자전거 때문만은 아닌 것 같았다.",
      ] },
      { t: "늦은 밤", L: [
        "@path|23:45 · 따릉이 대여소",
        "n:11시 반. 해솔이 안 온다. 15분이 지났다.",
        "n:멀리서 해솔이 보인다. 모르는 사람 자전거 앞에 쭈그려 앉아 있다.",
        ["?", ["(다가가서 같이 돕는다)", 8, "c:어! 체인 빠졌대서. 같이 잡아줘요!"], ["(멀리서 기다린다)", 4, "n:한참 뒤, 기름 묻은 손으로 해솔이 뛰어왔다."], ["(서운해서 먼저 출발한다)", 0, "n:얼마 못 가서 뒤에서 해솔이 숨차게 쫓아왔다."]],
        "c:미안해요! 늦어서. 그냥 지나칠 수가 없어서요.",
        "c:벌칙, 내가 라면 살게요. 두 개.",
        ["?", ["그래서 해솔 씨가 좋아요.", 8, "c:(멈칫한다) …방금 뭐라고 했어요? 한 번만 더."], ["다음엔 꼭 연락해요.", 5, "c:번호 모르는데요? …아, 알려줘야겠다."]],
        "n:그날 라면은 기름 냄새가 조금 났다. 그래도 맛있었다.",
      ] },
      { t: "매일 달리는 이유", L: [
        "@river|00:10 · 강가 벤치",
        "n:달리기가 끝나고 해솔이 오래 말이 없다.",
        "c:기록이 왜 중요하냐고 물었죠. 사실 기록이 아니라 '매일'이 중요해요.",
        "c:작년에 많이 아팠어요. 수술도 크게 하고. 의사 선생님이 매일 조금씩 움직이래서 시작했어요.",
        "c:하루도 안 거르는 게, 아, 나 아직 괜찮구나 하는 확인 같아서.",
        ["?", ["(말없이 손을 잡는다)", 8, "c:…따뜻하다. 이러면 안 울려고 했는데."], ["말해줘서 고마워요.", 5, "c:아무한테도 안 했어요. 맨날 웃으니까 다들 모르더라고요."]],
        "c:그래서 사실 무서웠어요. 누구랑 친해지는 거. 내가 갑자기 없어지면 어떡하나.",
        ["?", ["해솔 씨 매일, 저도 같이 셀게요.", 8, "c:…그 말이 제일 듣고 싶었나 봐요."], ["안 없어져요. 이렇게 잘 달리는데.", 5, "c:그쵸? 나 빠르죠?"]],
      ] },
      { t: "멈춘 자전거", L: [
        "@fire|00:00 · 마포대교 위",
        "n:자정. 다리 위에서 불꽃놀이가 시작됐다.",
        "n:해솔이 처음으로, 달리다가 자전거를 완전히 세웠다.",
        "c:달리면서 보는 불꽃은 늘 뒤로 지나갔어요. 오늘은 멈춰서 볼래요.",
        ["?", ["오늘은 기록 말고 이거 기억해요.", 8, "c:응. 오늘은 이걸로 매일 도장 찍을래요."], ["멈추니까 어때요?", 5, "c:생각보다 안 무서워요. 옆에 누가 있어서."]],
        "n:불꽃이 터질 때마다 해솔이 아이처럼 손가락으로 가리켰다.",
        "c:저거 하트 모양이다! …봤어요? 진짜 하트였는데.",
        ["?", ["봤어요. 하트.", 8, "c:그럼 그거 우리 거 해요."], ["그냥 동그라미던데요.", 4, "c:마음으로 봐야 보이는 하트예요."]],
      ] },
      { t: "지나가지 않은 밤", L: [
        "@path|23:31 · 자전거길",
        "n:11시 31분. 자전거 불빛이 오지 않는다.",
        "n:11시 50분. 자정. 해솔은 '매일'을 어긴 적이 없다.",
        ["?", ["(해솔의 코스를 거꾸로 걸어간다)", 8, "n:반포 쪽으로 한참을 걸었다. 자전거는 보이지 않았다."], ["(그 자리에서 기다린다)", 8, "n:새벽 1시까지 자전거길만 바라봤다."], ["(무슨 일 있겠어, 하고 돌아간다)", 2, "n:돌아가는 길, 자꾸 뒤를 돌아봤다."]],
        "n:휴대폰이 울린다. 지난번에 교환한 번호.",
        "n:'오늘 정기검진이라 병원에서 자요. 별일 아니에요! 매일 깨서 미안. 내일 갈게요.'",
        ["?", ["'내일 맨 앞에서 손 흔들게요.'", 8, "n:답장이 바로 왔다. '그럼 더 빨리 달려야겠다 ㅎㅎ'"], ["'걱정했잖아요.'", 8, "n:한참 뒤 답장. '…걱정해주는 사람 있으니까 좋다.'"]],
      ] },
      { t: "용기 내는 밤", L: [
        "@path|23:28 · 자전거길",
        "n:11시 28분. 평소보다 3분 일찍, 불빛이 다가온다.",
        "c:검진 결과 괜찮대요! 다 괜찮대요!",
        "n:해솔이 자전거를 던지듯 세우고 달려온다.",
        ["?", ["(꽉 안아준다)", 8, "c:…헉. 숨 막혀요. 아니, 더 해줘요."], ["다행이다. 진짜 다행이다.", 5, "c:울어요? 왜 울어요, 내가 울려고 했는데."]],
        "n:한참 그렇게 서 있었다. 해솔의 심장 소리가 크게 들렸다.",
        "c:어제 병원에서 생각했어요. 다음 검진 때도 이 사람이 기다려주면 좋겠다고.",
        ["?", ["다음에도, 그다음에도 기다릴게요.", 8, "c:…그거 약속이에요. 무를 수 없어요."], ["다음엔 병원 앞에서 기다릴게요.", 5, "c:그건 좀 부끄러운데. …좋다."]],
      ] },
      { t: "1년 전날", L: [
        "@river|00:20 · 강가 벤치",
        "c:내일이 처음 달리기 시작한 지 딱 1년 되는 날이에요.",
        "c:365일 중에 어제 하루 빼고 다 달렸어요. 아깝다.",
        ["?", ["어제는 제가 대신 기다렸으니까 친 걸로 해요.", 8, "c:오, 대리 출석 인정! 그럼 365일 만점."], ["364일도 엄청난 거예요.", 5, "c:그쵸? 칭찬 더 해줘요."]],
        "c:내일, 처음 출발한 반포에서 여의도까지 같이 달려줄래요?",
        "c:그리고… 도착하면 할 말 있어요.",
        ["?", ["저도 도착하면 할 말 있어요.", 8, "c:헐. 그럼 누가 먼저 도착하는지 내기해요."], ["무슨 말인데요? 지금 해요.", 4, "c:안 돼요. 1주년 기념 특별 발언이라."]],
        "n:해솔의 자전거 바구니에 작은 리본이 묶여 있었다. 내일을 위한 것 같았다.",
      ] },
      { t: "열두 번째 밤", L: [
        "@path|23:30 · 반포 출발점",
        "n:11시 30분. 1년 전 해솔이 처음 출발한 곳.",
        "c:준비됐어요? 오늘은 기록 재요. 우리 둘 기록.",
        "n:강바람을 가르며 함께 달렸다. 해솔은 오늘은 뒤를 돌아보지 않는다. 바로 옆에 있으니까.",
        "@river|00:00 · 여의도 도착",
        "n:여의도. 처음 만난 밤, 내 돗자리가 있던 자리.",
        "c:1년 전엔 그냥 살려고 달렸어요. 요즘은 여기 오려고 달려요.",
        ["?", ["(먼저 말한다) 해솔 씨 매일에 저도 넣어줘요.", 15, "c:…반칙. 그거 내가 할 말이었는데!"], ["(해솔의 말을 기다린다)", 10, "c:좋아해요. 돗자리 끈 풀린 날부터."], ["1주년 축하해요!", 0, "c:고마워요! 덕분에 완주했어요."]],
      ], ok: [
        "@fire|00:10 · 여의도",
        "n:늦은 불꽃 하나가 하늘에서 하트 모양으로 터졌다. 이번엔 진짜였다.",
        "c:봤죠? 이번엔 진짜 하트.",
        "c:내일부터 기록표에 이름 하나 더 쓸게요. 우리 둘.",
        "n:해솔의 바구니 리본이 내 손목에 묶였다.",
      ], mid: [
        "@river|00:20 · 여의도",
        "c:다음 달에 부산 해안길 달리기 대회 나가요. 1년 동안 준비한 거.",
        "c:완주하고 오면, 그때 대답 들을래요. 다음 시즌에.",
        "n:해솔이 리본을 풀어 내 손에 쥐여줬다. '돌아올 때까지 맡아줘요.'",
      ], fr: [
        "@river|00:15 · 여의도",
        "c:1년 동안 제일 고마운 사람이에요. 진짜로.",
        "c:앞으로도 러닝메이트 해줘요. 평생 계약.",
        "n:해솔이 하이파이브를 하자 손바닥이 찡 울렸다. 기분 좋은 아픔이었다.",
      ] },
    ],
  };
  const OK_AT = 145, MID_AT = 115;   // 엔딩 기준: 최고 183, 전부 중간 선택 약 118, 전부 아쉬운 선택 약 90. 12화에서 마음을 안 전하면 고백 엔딩은 없음

  // ── 저장(이 폰에만) ──
  const KEY = "hn-story";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  let S = load();   // { ep: 다음 볼 화(1~12), r: 상대, h:{s,d,h}, at: 다음 화 열리는 시각, ends:{s:"ok"} }
  if (!S.ep) S = { ep: 1, h: { s: 0, d: 0, h: 0 }, at: 0, ends: S.ends || {} };
  // 다음 밤 10시(한국 시간)
  const next22 = t => { const k = t + 9 * 3600e3, d = new Date(k), day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); let o = day + 22 * 3600e3; if (k >= o) o += 86400e3; return o - 9 * 3600e3; };
  const left = () => Math.max(0, (S.at || 0) - Date.now());
  const hhmmss = ms => { const s = Math.ceil(ms / 1000); return [s / 3600 | 0, (s / 60 | 0) % 60, s % 60].map(v => String(v).padStart(2, "0")).join(":"); };

  // ── 화면 ──
  let opt = {}, box, cv, cx, raf, scene = "river", sub = "", who = null, timer;
  const F = `-apple-system, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const css = `
  #stBox{position:fixed;inset:0;z-index:30;display:none;background:#070a1c;color:#f6efe0;font:15px/1.6 ${F};-webkit-user-select:none;user-select:none}
  #stBox.on{display:block}
  #stBox canvas{position:absolute;inset:0;width:100%;height:100%}
  #stBox .ui{position:absolute;inset:0;display:flex;flex-direction:column;max-width:520px;margin:0 auto;padding:max(14px,env(safe-area-inset-top)) 14px max(16px,env(safe-area-inset-bottom))}
  #stBox .top{display:flex;align-items:center;gap:8px;font-size:13px;color:#f3d9a4}
  #stBox .top .t{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #stBox .pill{background:rgba(0,0,0,.45);border-radius:999px;padding:4px 10px;white-space:nowrap}
  #stBox .x{all:unset;cursor:pointer;width:34px;height:34px;display:grid;place-items:center;border-radius:50%;background:rgba(0,0,0,.45);font-size:16px}
  #stBox .sub{margin-top:6px;font-size:12px;color:#e9c4a3;opacity:.85;min-height:18px}
  #stBox .sp{flex:1}
  #stBox .nm{align-self:flex-start;padding:4px 12px;border-radius:10px 10px 0 0;font-weight:800;font-size:14px;color:#1b1330}
  #stBox .msg{min-height:96px;padding:14px 16px;border-radius:0 16px 16px 16px;background:rgba(9,12,32,.88);border:1px solid rgba(243,217,164,.32);font-size:16px;line-height:1.65;cursor:pointer;position:relative}
  #stBox .msg.nar{border-radius:16px;color:#e8e1d2;font-style:normal}
  #stBox .msg .go{position:absolute;right:12px;bottom:8px;font-size:11px;opacity:.55;animation:stb 1.2s infinite}
  @keyframes stb{50%{transform:translateY(3px)}}
  #stBox .chs{display:flex;flex-direction:column;gap:8px;margin-top:10px}
  #stBox .chs button{all:unset;cursor:pointer;padding:12px 14px;border-radius:14px;background:rgba(26,35,80,.86);border:1px solid rgba(243,217,164,.42);font-size:15px;line-height:1.45;animation:stin .3s both}
  #stBox .chs button:active{transform:scale(.98);background:rgba(60,50,110,.9)}
  #stBox .chs b{color:#f5c84c;margin-right:6px}
  @keyframes stin{from{opacity:0;transform:translateY(8px)}}
  #stBox .card{margin:auto 0;padding:22px 18px;border-radius:22px;background:rgba(9,12,32,.95);border:1px solid rgba(243,217,164,.32);text-align:center;display:flex;flex-direction:column;gap:10px}
  #stBox .card h2{margin:0;font-size:26px;color:#f3d9a4}
  #stBox .card p{margin:0;color:#e9c4a3;font-size:14px}
  #stBox .ppl{display:flex;gap:8px;justify-content:center;margin:6px 0}
  #stBox .ppl div{flex:1;max-width:110px;padding:10px 6px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(243,217,164,.25);font-size:13px}
  #stBox .ppl span{display:block;font-size:30px}
  #stBox .ppl small{display:block;color:#cfc3ad;font-size:11px;line-height:1.35}
  #stBox .ppl .me{border-color:#f5c84c;background:rgba(245,200,76,.14)}
  #stBox .big{all:unset;cursor:pointer;padding:13px;border-radius:999px;background:linear-gradient(135deg,#ffd27a,#ff9fb6);color:#2a1838;font-weight:800;font-size:16px;text-align:center}
  #stBox .ghost{all:unset;cursor:pointer;padding:8px;color:#c9bfa8;font-size:13px;text-align:center}
  #stBox .sup{padding:12px;border-radius:16px;background:rgba(245,200,76,.12);border:1px solid rgba(245,200,76,.5);font-size:13px;color:#f3d9a4}
  #stBox .sup button{all:unset;cursor:pointer;display:block;margin:8px auto 0;padding:9px 18px;border-radius:999px;background:#f5c84c;color:#3a2a10;font-weight:800}
  #stBox .heart{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);font-size:22px;font-weight:800;color:#ff9fb6;pointer-events:none;animation:sth 1.3s forwards;text-shadow:0 2px 10px rgba(0,0,0,.6)}
  @keyframes sth{0%{opacity:0;transform:translate(-50%,-30%) scale(.7)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}100%{opacity:0;transform:translate(-50%,-140%) scale(1)}}
  #stBox .cred{height:96px;overflow:hidden;position:relative;font-size:13px;color:#f3d9a4;-webkit-mask-image:linear-gradient(transparent,#000 25%,#000 75%,transparent);mask-image:linear-gradient(transparent,#000 25%,#000 75%,transparent)}
  #stBox .cred div{animation:stc 14s linear infinite}
  @keyframes stc{from{transform:translateY(96px)}to{transform:translateY(-100%)}}
  #stBox .end{font-size:40px}`;

  function build() {
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    box = document.createElement("div"); box.id = "stBox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "한강, 열두 밤");
    box.innerHTML = `<canvas></canvas><div class="ui"></div>`;
    document.body.appendChild(box);
    cv = box.querySelector("canvas"); cx = cv.getContext("2d");
    addEventListener("resize", size); size();
  }
  function size() { if (!cv) return; const r = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * r; cv.height = innerHeight * r; cx.setTransform(r, 0, 0, r, 0, 0); }
  const ui = () => box.querySelector(".ui");

  // ── 배경 그리기(이미지 파일 없음) ──
  const rnd = (i => () => (i = (i * 16807) % 2147483647) / 2147483647)(7);
  const STARS = Array.from({ length: 90 }, () => [rnd(), rnd() * .55, rnd() * 1.4 + .4, rnd() * 6]);
  const BLD = Array.from({ length: 40 }, () => [rnd(), rnd()]);
  const RAIN = Array.from({ length: 120 }, () => [rnd(), rnd(), .6 + rnd() * .6]);
  let bursts = [];
  function draw(t) {
    const W = innerWidth, Hh = innerHeight, hz = Hh * .56; t /= 1000;
    const pal = { river: ["#070a1c", "#1a2350"], stage: ["#0a0820", "#2a1a48"], store: ["#070b1c", "#18284a"], path: ["#060a18", "#162248"], rain: ["#0b0f1c", "#1c2333"], fire: ["#05061a", "#1b1440"], dawn: ["#2a2d5c", "#f0a070"] }[scene] || ["#070a1c", "#1a2350"];
    let g = cx.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]); cx.fillStyle = g; cx.fillRect(0, 0, W, hz);
    if (scene !== "rain") for (const [x, y, r, p] of STARS) { cx.globalAlpha = (scene === "dawn" ? .25 : .5) + .5 * Math.sin(t * 1.3 + p) * .5; cx.fillStyle = "#fff"; cx.fillRect(x * W, y * Hh, r, r); }
    cx.globalAlpha = 1;
    if (scene !== "rain") { const mx = W * .8, my = Hh * .13; cx.shadowColor = "rgba(243,217,164,.6)"; cx.shadowBlur = 30; cx.fillStyle = scene === "dawn" ? "rgba(255,240,220,.5)" : "#f3d9a4"; cx.beginPath(); cx.arc(mx, my, 20, 0, 7); cx.fill(); cx.shadowBlur = 0; }
    // 도시
    for (let i = 0; i < BLD.length; i++) { const [a, b] = BLD[i], w = W / BLD.length + 2, x = i * W / BLD.length, h = 20 + b * Hh * .14; cx.fillStyle = scene === "dawn" ? "#3a3050" : "#111735"; cx.fillRect(x, hz - h, w, h);
      if (scene !== "dawn") { cx.fillStyle = "rgba(255,214,140,.55)"; for (let k = 0; k < 4; k++) if ((a * 97 + k * 13 | 0) % 3 === 0) cx.fillRect(x + 3 + (k % 2) * (w / 2 - 2), hz - h + 6 + (k >> 1) * 10, 2, 3); } }
    // 강
    g = cx.createLinearGradient(0, hz, 0, Hh); g.addColorStop(0, scene === "dawn" ? "#c98a6a" : "#0e1a3a"); g.addColorStop(1, scene === "dawn" ? "#2a2440" : "#060b1e"); cx.fillStyle = g; cx.fillRect(0, hz, W, Hh - hz);
    cx.fillStyle = scene === "dawn" ? "rgba(255,220,170,.35)" : "rgba(255,214,140,.22)";
    for (let i = 0; i < 26; i++) { const y = hz + 6 + (i * 37 % 100) / 100 * (Hh - hz) * .5, x = ((i * 53 % 100) / 100 * W + Math.sin(t * .6 + i) * 6), w = 10 + (i % 5) * 6; cx.fillRect(x, y, w, 1.5); }
    // 장면 소품
    if (scene === "stage") { g = cx.createRadialGradient(W / 2, hz + 10, 5, W / 2, hz + 10, W * .45); g.addColorStop(0, "rgba(255,190,120,.35)"); g.addColorStop(1, "rgba(255,190,120,0)"); cx.fillStyle = g; cx.fillRect(0, 0, W, Hh); cx.fillStyle = "#23183a"; cx.fillRect(W * .2, hz - 4, W * .6, 8); }
    if (scene === "store") { const x = W * .58, y = hz - 70, w = Math.min(150, W * .36); cx.shadowColor = "rgba(160,220,255,.7)"; cx.shadowBlur = 40; cx.fillStyle = "#dff3ff"; cx.fillRect(x, y + 18, w, 52); cx.shadowBlur = 0; cx.fillStyle = "#2b7de0"; cx.fillRect(x, y + 10, w, 8); cx.fillStyle = "#33c46b"; cx.fillRect(x, y + 6, w, 4); cx.fillStyle = "#ff8a3a"; cx.fillRect(x + w - 30, y - 20, 26, 22); cx.fillStyle = "#fff"; cx.font = `800 13px ${F}`; cx.textAlign = "center"; cx.fillText("24", x + w - 17, y - 4); cx.fillStyle = "rgba(40,60,90,.55)"; cx.fillRect(x + 8, y + 26, w * .3, 36); cx.fillRect(x + w * .55, y + 26, w * .35, 36); }
    if (scene === "path") for (let i = 0; i < 5; i++) { const x = W * (.1 + i * .2), y = hz + 4; cx.fillStyle = "#1c2244"; cx.fillRect(x, y - 46, 2, 46); g = cx.createRadialGradient(x, y - 46, 1, x, y - 46, 40); g.addColorStop(0, "rgba(255,230,170,.55)"); g.addColorStop(1, "rgba(255,230,170,0)"); cx.fillStyle = g; cx.fillRect(x - 40, y - 86, 80, 80); }
    if (scene === "rain") { cx.strokeStyle = "rgba(180,200,230,.35)"; cx.lineWidth = 1; cx.beginPath(); for (const [x, y, s] of RAIN) { const yy = ((y + t * s) % 1) * Hh, xx = x * W; cx.moveTo(xx, yy); cx.lineTo(xx - 3, yy + 14); } cx.stroke(); }
    if (scene === "fire") { if (Math.random() < .03 || bursts.length === 0) bursts.push({ x: W * (.2 + Math.random() * .6), y: Hh * (.12 + Math.random() * .25), t, c: ["#ffd27a", "#ff9fb6", "#8fd3ff", "#b8f28a"][Math.random() * 4 | 0] }); bursts = bursts.filter(b => t - b.t < 2.2);
      for (const b of bursts) { const k = (t - b.t) / 2.2, r = 10 + k * 70; cx.globalAlpha = 1 - k; cx.fillStyle = b.c; for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; cx.beginPath(); cx.arc(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r + k * k * 20, 2, 0, 7); cx.fill(); } } cx.globalAlpha = 1; }
    // 말하는 사람 실루엣
    if (who && CH[who]) { const c = CH[who], x = W / 2, y = hz + 2, bob = Math.sin(t * 1.6) * 1.5;
      g = cx.createRadialGradient(x, y - 50, 4, x, y - 50, 120); g.addColorStop(0, c.col + "55"); g.addColorStop(1, c.col + "00"); cx.fillStyle = g; cx.fillRect(x - 120, y - 170, 240, 240);
      cx.fillStyle = "#0b0d22"; cx.beginPath(); cx.arc(x, y - 92 + bob, 17, 0, 7); cx.fill(); cx.beginPath(); cx.moveTo(x - 26, y); cx.quadraticCurveTo(x - 28, y - 66 + bob, x, y - 70 + bob); cx.quadraticCurveTo(x + 28, y - 66 + bob, x + 26, y); cx.fill();
      cx.strokeStyle = c.col; cx.globalAlpha = .7; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(x, y - 92 + bob, 17, 0, 7); cx.stroke(); cx.globalAlpha = 1;
      cx.font = `30px ${F}`; cx.textAlign = "center"; cx.fillText(c.e, x + 34, y - 30 + bob); }
  }
  function loop(t) { draw(t); raf = requestAnimationFrame(loop); }

  // ── 진행 ──
  let L = [], i = 0, typing = null;
  const epData = () => S.ep === 1 ? EP1 : R[S.r][S.ep - 2];
  const nameOf = k => k === "y" ? (opt.myNick && opt.myNick() || "나") : CH[k] ? CH[k].n : "";
  function top(extra) {
    const d = epData(); const hv = S.r ? `${CH[S.r].e} ♡ ${S.h[S.r]}` : "♡";
    return `<div class="top"><span class="t">🌙 ${S.ep}화 · ${esc(d ? d.t : "")}</span><span class="pill">${hv}</span><button class="x" data-do="close" aria-label="닫기">✕</button></div><div class="sub">${esc(sub)}</div>${extra || ""}`;
  }
  function play() { const d = epData(); L = d.L.slice(); i = 0; opt.stat && opt.stat(S.ep === 1 ? "rs" : "re"); step(); }
  function step() {
    clearInterval(typing);
    if (i >= L.length) return finish();
    const ln = L[i++];
    if (Array.isArray(ln)) return choose(ln);
    const k = ln[0], body = ln.slice(2);
    if (k === "@") { const [s, c] = body.split("|"); scene = s; sub = c || ""; who = null; return step(); }
    const sp = k === "c" ? S.r : k;
    who = sp === "n" || sp === "y" ? who : sp;
    const isN = sp === "n", nm = isN ? "" : nameOf(sp), col = sp === "y" ? "#f3d9a4" : CH[sp] ? CH[sp].col : "";
    ui().innerHTML = top(`<div class="sp"></div>${isN ? "" : `<div class="nm" style="background:${col}">${esc(nm)}</div>`}<div class="msg ${isN ? "nar" : ""}" data-do="next"><span class="tx"></span><span class="go">▼</span></div>`);
    const tx = ui().querySelector(".tx"), full = isN ? body : body; let n = 0;
    typing = setInterval(() => { n += 2; tx.textContent = full.slice(0, n); if (n >= full.length) { clearInterval(typing); typing = null; } }, 28);
    tx.dataset.full = full;
    box._last = { isN, nm, col, full };
  }
  function choose(ln) {
    const opts = ln.slice(1);
    const l = box._last;
    const ctx = l ? `${l.isN ? "" : `<div class="nm" style="background:${l.col}">${esc(l.nm)}</div>`}<div class="msg ${l.isN ? "nar" : ""}">${esc(l.full)}</div>` : "";
    ui().innerHTML = top(`<div class="sp"></div>${ctx}<div class="chs">${opts.map((o, k) => `<button data-do="ch" data-k="${k}" style="animation-delay:${k * .07}s"><b>${"①②③"[k]}</b>${esc(o[0])}</button>`).join("")}</div>`);
    box._ch = opts;
  }
  function pick(k) {
    const o = box._ch[k], v = o[1];
    if (v && typeof v === "object" && v.pick) { S.r = v.pick; }
    else if (typeof v === "number") { if (S.ep === 12) S.last = v; S.h[S.r] = (S.h[S.r] || 0) + v; if (v > 0) pop(`${CH[S.r].e} ♡ +${v}`); }
    else if (v) for (const c in v) { S.h[c] = (S.h[c] || 0) + v[c]; if (v[c] > 0) pop(`${CH[c].e} ♡ +${v[c]}`); }
    save();
    if (o[2]) L.splice(i, 0, o[2]);
    step();
  }
  function pop(t) { const e = document.createElement("div"); e.className = "heart"; e.textContent = t; box.appendChild(e); setTimeout(() => e.remove(), 1300); }
  function finish() {
    const d = epData();
    if (S.ep === 12 && !box._ending) {   // 엔딩 가르기
      const sc = S.h[S.r] || 0, k = sc >= OK_AT && S.last !== 0 ? "ok" : sc >= MID_AT ? "mid" : "fr";
      box._ending = k; L = d[k].slice(); i = 0; return step();
    }
    if (S.ep === 12) { const k = box._ending; box._ending = null; S.ends[S.r] = k; opt.stat && opt.stat("rd_" + k); S.done = S.r; S.ep = 13; save(); return ending(k); }
    S.ep++; S.at = opt.admin && opt.admin() ? 0 : next22(Date.now()); save(); who = S.ep === 2 ? S.r : who; cover();
  }
  const ENDS = { ok: ["💞", "고백 성공"], mid: ["🌙", "여운 — 다음 시즌에 계속"], fr: ["🤝", "좋은 친구"] };
  function credits() {
    let L2 = []; try { L2 = (opt.names ? opt.names() : []).filter(n => n && !/\(운영자\)$/.test(n)); } catch {}
    return L2.length ? `<div class="cred"><div>오늘 한강을 응원해 주신 분들<br><br>${L2.map(esc).join("<br>")}<br><br>고맙습니다 💛</div></div>` : "";
  }
  function supBox(msg) { return `<div class="sup">💛 ${msg}<button data-do="sup">응원하기</button></div>`; }
  function ending(k) {
    const c = CH[S.r], e = ENDS[k]; scene = k === "ok" ? "fire" : "river"; who = S.r; sub = "";
    const seen = Object.keys(S.ends).length;
    ui().innerHTML = `<div class="top"><span class="t">🌙 한강, 열두 밤 · 엔딩</span><button class="x" data-do="close" aria-label="닫기">✕</button></div>
      <div class="card"><div class="end">${e[0]}</div><h2>${esc(c.n)} · ${e[1]}</h2><p>열두 밤 동안 ${c.e} ♡ ${S.h[S.r]}</p>
      ${credits()}
      ${supBox("이 이야기가 시즌 2까지 이어지도록 응원해주세요. 응원이 모이면 다음 이야기를 써요.")}
      <p style="font-size:12px">본 엔딩 ${seen}/3명 · ${seen < 3 ? "다른 사람의 열두 밤도 있어요" : "세 사람 이야기를 모두 봤어요"}</p>
      <button class="big" data-do="restart">${seen < 3 ? "다른 사람 이야기 보기" : "처음부터 다시 보기"}</button><button class="ghost" data-do="close">닫기</button></div>`;
  }
  function cover() {
    clearInterval(timer);
    if (S.ep > 12) return ending(S.ends[S.done] || "fr");
    const d = epData(), wait = left(); who = S.r && S.ep > 1 ? S.r : null; scene = "river"; sub = "";
    const ppl = Object.keys(CH).map(k => `<div class="${S.r === k ? "me" : ""}"><span>${CH[k].e}</span>${CH[k].n}<small>${CH[k].who}</small>${S.ends[k] ? `<small>${ENDS[S.ends[k]][0]}</small>` : ""}</div>`).join("");
    ui().innerHTML = `<div class="top"><span class="t">📖 한강 이야기</span><button class="x" data-do="close" aria-label="닫기">✕</button></div>
      <div class="card"><h2>🌙 한강, 열두 밤</h2><p>매일 밤 10시, 한 화씩 열려요</p>
      ${S.ep === 1 ? `<div class="ppl">${ppl}</div>` : `<p>${CH[S.r].e} <b>${CH[S.r].n}</b>${CH[S.r].j}의 이야기 · ♡ ${S.h[S.r]}</p>`}
      <p><b style="color:#f6efe0">${S.ep}화 「${esc(d.t)}」</b> · 약 3분</p>
      ${wait > 0 ? `<p>🔔 ${S.ep}화까지 <b class="cd" style="color:#f5c84c">${hhmmss(wait)}</b></p><p style="font-size:12px">밤 10시에 다시 와 주세요. 그 사람도 그때 나와요.</p>${S.ep > 2 ? supBox("이야기가 좋았다면 한강을 응원해주세요. 응원자 이름은 엔딩 크레딧에 흘러가요.") : ""}` : `<button class="big" data-do="play">${S.ep === 1 ? "이야기 시작하기" : "이어서 보기"}</button>`}
      <p style="font-size:12px;opacity:.7">진행은 이 폰에만 저장돼요 · 1~12화 무료</p></div>`;
    if (wait > 0) timer = setInterval(() => { const w = left(), el = box.querySelector(".cd"); if (w <= 0) return cover(); if (el) el.textContent = hhmmss(w); }, 1000);
  }
  function onClick(e) {
    const el = e.target.closest("[data-do]"); if (!el) return; const a = el.dataset.do;
    if (a === "close") return close();
    if (a === "play") return play();
    if (a === "next") { const tx = el.querySelector(".tx"); if (typing) { clearInterval(typing); typing = null; tx.textContent = tx.dataset.full; return; } return step(); }
    if (a === "ch") return pick(+el.dataset.k);
    if (a === "sup") { opt.stat && opt.stat("rsup"); close(); return opt.openSup && opt.openSup(); }
    if (a === "restart") { S = { ep: 1, h: { s: 0, d: 0, h: 0 }, at: 0, ends: S.ends }; save(); return cover(); }
  }
  function open() { if (!box) { build(); box.addEventListener("click", onClick); } box.classList.add("on"); opt.closeOthers && opt.closeOthers(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); cover(); }
  function close() { if (!box) return; box.classList.remove("on"); cancelAnimationFrame(raf); clearInterval(timer); clearInterval(typing); }
  H.init = o => { opt = o || {}; };
  H.open = open; H.close = close; H.isOpen = () => !!box && box.classList.contains("on");
  H.ready = true;
  H._test = { S: () => S, R, EP1, next22 };
  if (H._pending) { const p = H._pending; H._pending = null; H.init(p); open(); }
})();
