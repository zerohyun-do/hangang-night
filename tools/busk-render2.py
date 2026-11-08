# 🎸 버스킹 곡 2집(7~12번): busk-render.py의 song_busk를 그대로 쓰고, 포크 하프(VCSL, CC0)를 선율 악기로 더한다.
# 사용: python3 busk-render2.py <VCSL 경로> <출력 폴더>  → busk-7~12.mp3, busk.json에 이어 붙임
import sys, os, glob, json, importlib.util
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("bk", os.path.join(here, "busk-render.py"))
bk = importlib.util.module_from_spec(spec); spec.loader.exec_module(bk)
rr, VCSL, OUT = bk.rr, bk.VCSL, bk.OUT
P = lambda *a: glob.glob(os.path.join(VCSL, *a))
print("스트럼스틱"); bk.STR = rr.Inst(P("Chordophones/Composite Chordophones/Strumstick/Finger/*.wav"), r"Main_([A-G]#?\d)_vl", r"_vl(\d)_", gain=.85, tune=True, maxlen=5)
print("카혼"); bk.KICK = bk.Hit(P("Idiophones/Struck Idiophones/Cajon/Cajon_hit2_*.wav"), .9, lp=900); bk.SLAP = bk.Hit(P("Idiophones/Struck Idiophones/Cajon/Cajon_hit1_*_rr*.wav"), .55)
print("셰이커"); bk.SHK = bk.Hit(P("Idiophones/Struck Idiophones/Shaker, Small/Mid_ShakerDouble_*.wav"), .35)
print("업라이트 피아노"); UP = rr.Inst(P("Chordophones/Zithers/Upright Piano, Yamaha/Sustains/*.wav"), r"Sus_([A-G]#?\d)_vl", r"_vl(\d)_", gain=.8, maxlen=8)
print("포크 하프"); HP = rr.Inst(P("Chordophones/Composite Chordophones/Folk Harp/*.wav"), r"Normal_([A-G]#?\d)_v", r"_v(\d)_", gain=.9, maxlen=6)
C, D, E, F, G, A, B = 60, 62, 64, 65, 67, 69, 71
sec = [("I", 4), ("A", 8), ("B", 8), ("A", 8), ("B", 8), ("O", 4)]
out = []
out.append(bk.song_busk("돗자리 위에서", "busk-7", 90, C, False, [(C, "M"), (G - 12, "M"), (A - 12, "m"), (F - 12, "M")], sec, 71, "D-DU-UDU", mel=HP, mel_vel=.55))
out.append(bk.song_busk("늦은 퇴근길", "busk-8", 80, A - 12, True, [(A - 12, "m"), (F - 12, "M"), (C, "M"), (G - 12, "M")], sec, 83, "D--UD-DU", shaker=False, mel=UP, mel_vel=.46))
out.append(bk.song_busk("반짝이는 물결", "busk-9", 104, E - 12, False, [(E - 12, "M"), (B - 12, "M"), (C + 1 - 12, "m"), (A - 12, "M")], sec, 97, "D-DUDUDU", mel=HP, mel_vel=.5))
out.append(bk.song_busk("라면 끓는 소리", "busk-10", 112, G - 12, False, [(G - 12, "M"), (C, "M"), (D, "M"), (G - 12, "M"), (E - 12, "m"), (C, "M"), (D, "M"), (D, "M")], sec, 101, "D-D-UDUD", mel=UP))
out.append(bk.song_busk("여름밤 산책", "busk-11", 94, F - 12, False, [(F - 12, "M"), (C, "M"), (D - 12, "m"), (B - 1 - 12, "M")], sec, 113, "D-DU-UDU", mel=HP, mel_vel=.52))
out.append(bk.song_busk("다시 만나는 밤", "busk-12", 86, D, False, [(D, "M"), (B - 12, "m"), (G - 12, "M"), (A - 12, "M")], [("I", 4), ("A", 8), ("B", 8), ("A", 8), ("B", 8), ("O", 4)], 127, "D--UD-D-", shaker=False, mel=UP, mel_vel=.48))
jp = os.path.join(OUT, "busk.json"); old = json.load(open(jp)) if os.path.exists(jp) else []
old = [x for x in old if x["f"] not in {o["f"] for o in out}] + out
json.dump(old, open(jp, "w"), ensure_ascii=False, indent=1); print(out)
