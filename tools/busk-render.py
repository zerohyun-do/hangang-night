# 🎸 버스킹 곡 만들기: 직접 작곡한 곡을 CC0 실제 악기 샘플(VCSL: 스트럼스틱·카혼·셰이커·업라이트 피아노)로 연주해 mp3로 굽는다.
# radio-render.py의 도구(Inst·Song·finish·chord·melody_bar)를 그대로 쓴다.
# 사용: python3 busk-render.py <VCSL 경로> <출력 폴더>
import sys, os, glob, subprocess, importlib.util
import numpy as np
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("rr", os.path.join(here, "radio-render.py"))
sys.argv = sys.argv[:3]; rr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rr)
SR, VCSL, OUT = rr.SR, rr.VCSL, rr.OUT

class Hit:   # 타악기 한 방(음높이 없음)
    def __init__(self, files, gain=1.0, lp=None):
        self.s = []
        for f in sorted(files):
            a = rr.load(f, 2.0); a /= (np.abs(a).max() + 1e-9)
            if lp: a = rr.lowpass(a, lp)
            self.s.append(a * gain)
        self.i = 0; print("  타악기", len(self.s))
    def note(self, midi, vel, dur, rel=.3):
        self.i = (self.i + 1) % len(self.s); return self.s[self.i] * vel * vel

def song_busk(title, name, bpm, key_root, minor, prog, sections, seed, strum_pat, cajon=True, shaker=True, mel=None, mel_vel=.5):
    rs = np.random.default_rng(seed); s = rr.Song(bpm)
    scale = [0, 2, 3, 5, 7, 8, 10] if minor else [0, 2, 4, 5, 7, 9, 11]
    scale_pcs = {(key_root + i) % 12 for i in scale}
    bar = 0; prev = 72; motifs = {}
    for sec, nb in sections:
        for k in range(nb):
            root, kind = prog[bar % len(prog)]; ch = rr.chord(root, kind); pcs = {c % 12 for c in ch}; B = bar * 4
            last = sec == "O" and k == nb - 1
            voic = sorted({rr.near({p}, 52 + i * 4, 50, 69) for i, p in enumerate(sorted(pcs, key=lambda p: (p - root) % 12))})
            bass = rr.near({root % 12}, 40, 36, 47)
            if last:
                s.add(STR, bass, B, 6, .6, 3)
                for j, m in enumerate(voic): s.add(STR, m, B + j * .05, 6, .55, 3)
                bar += 1; continue
            # 베이스: 1·3박(전주·후주는 1박만)
            s.add(STR, bass, B, 2, .62, .8)
            if sec != "I": s.add(STR, bass + (7 if (bass + 7) % 12 in pcs else 0), B + 2, 2, .5, .8)
            # 스트럼: 8분 격자, 'D' 아래로(낮은 줄→높은 줄), 'U' 위로, 줄 사이 14~20ms
            if sec != "I" or k % 2 == 1:
                for i, c in enumerate(strum_pat):
                    if c == "-": continue
                    order = voic if c == "D" else voic[::-1]
                    v = (.5 if c == "D" else .36) * (1.1 if i == 0 else 1) * (.85 if sec == "I" else 1)
                    for j, m in enumerate(order[:4] if c == "D" else order[:3]):
                        s.add(STR, m, B + i * .5 + j * (.017 * bpm / 60), .5 + (.4 if i % 2 == 0 else .1), v, .25)
            # 카혼·셰이커(A·B 구간)
            if sec in ("A", "B") and cajon:
                for b in (0, 2.5): s.add(KICK, 0, B + b, .5, .55, .2)
                for b in (1, 3): s.add(SLAP, 0, B + b, .5, .5, .2)
                if sec == "B" and k % 4 == 3: s.add(SLAP, 0, B + 3.5, .5, .38, .2)
            if sec in ("A", "B") and shaker:
                for i in range(8): s.add(SHK, 0, B + i * .5, .5, .3 if i % 2 else .22, .2)
            # 선율: A·B 구간에 업라이트 피아노(모티프 되풀이)
            if sec in ("A", "B") and mel is not None:
                key = (sec, k % 4)
                if sec == "A" and key in motifs and rs.random() < .7:
                    notes = [(b, d, n if (b % 2 or n % 12 in pcs) else rr.near(pcs, n, 64, 84)) for b, d, n in motifs[key]]
                else:
                    r = rr.RHY[rs.integers(len(rr.RHY))] if k % 4 != 3 else rr.RHY[-1]
                    notes, prev = rr.melody_bar(scale_pcs, pcs, prev, r, 64 + (3 if sec == "B" else 0), 84, rs, .5 if sec == "B" and k < 2 else (-.4 if k % 4 == 3 else 0))
                    if sec == "A": motifs.setdefault(key, notes)
                for b, d, n in notes: s.add(mel, n, B + b, d * 1.05, mel_vel * (1.06 if b == 0 else .92), .6)
                if notes: prev = notes[-1][2]
            bar += 1
    mix = s.render(rr.tempo_rit(bar * 4, 4, .35))
    d = rr.finish(mix, name, title, rev=(1.6, .16))
    return {"f": name + ".mp3", "title": title, "len": round(d, 2)}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    print("스트럼스틱"); STR = rr.Inst(glob.glob(os.path.join(VCSL, "Chordophones/Composite Chordophones/Strumstick/Finger/*.wav")), r"Main_([A-G]#?\d)_vl", r"_vl(\d)_", gain=.85, tune=True, maxlen=5)
    print("카혼"); KICK = Hit(glob.glob(os.path.join(VCSL, "Idiophones/Struck Idiophones/Cajon/Cajon_hit2_*.wav")), .9, lp=900); SLAP = Hit(glob.glob(os.path.join(VCSL, "Idiophones/Struck Idiophones/Cajon/Cajon_hit1_*_rr*.wav")), .55)
    print("셰이커"); SHK = Hit(glob.glob(os.path.join(VCSL, "Idiophones/Struck Idiophones/Shaker, Small/Mid_ShakerDouble_*.wav")), .35)
    print("업라이트 피아노"); UP = rr.Inst(glob.glob(os.path.join(VCSL, "Chordophones/Zithers/Upright Piano, Yamaha/Sustains/*.wav")), r"Sus_([A-G]#?\d)_vl", r"_vl(\d)_", gain=.8, maxlen=8)
    D, E, Fs, G, A, B, Cs = 62, 64, 66, 67, 69, 71, 73
    sec = [("I", 4), ("A", 8), ("B", 8), ("A", 8), ("B", 8), ("O", 4)]
    out = []
    out.append(song_busk("여의도 버스킹", "busk-1", 96, D, False, [(D, "M"), (A - 12, "M"), (B - 12, "m"), (G - 12, "M")], sec, 11, "D-DU-UDU", mel=UP))
    out.append(song_busk("자전거 타는 밤", "busk-2", 108, G - 12, False, [(G - 12, "M"), (D, "M"), (E - 12, "m"), (D - 12 + 12, "M"), (G - 12, "M"), (D, "M"), (A - 12, "m7"), (D, "M")], sec, 23, "D-DUDUDU", mel=UP))
    out.append(song_busk("편의점 앞 벤치", "busk-3", 84, B - 12, True, [(B - 12, "m"), (G - 12, "M"), (D, "M"), (A - 12, "M")], sec, 37, "D--UD-DU", shaker=False, mel=UP, mel_vel=.46))
    out.append(song_busk("강 건너 불빛", "busk-4", 92, D, False, [(D, "M"), (Fs - 12, "m"), (G - 12, "M"), (A - 12, "M"), (B - 12, "m"), (G - 12, "M"), (E - 12, "m7"), (A - 12, "M")], sec, 41, "D-DU-UDU", mel=UP))
    out.append(song_busk("마지막 지하철", "busk-5", 100, E - 12, True, [(E - 12, "m"), (Cs - 12 - 1, "M"), (G - 12, "M"), (D, "M")], sec, 53, "D-D-UDUD", mel=UP))
    out.append(song_busk("우리 노래", "busk-6", 88, A - 12, False, [(A - 12, "M"), (E - 12, "M"), (Fs - 12, "m"), (D, "M")], [("I", 4), ("A", 8), ("B", 8), ("A", 8), ("O", 4)], 67, "D--UD-D-", cajon=True, shaker=False, mel=UP, mel_vel=.48))
    import json; json.dump(out, open(os.path.join(OUT, "busk.json"), "w"), ensure_ascii=False, indent=1); print(out)
