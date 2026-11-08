# 한강 라디오 곡 만들기: 직접 작곡한 곡을 CC0 실제 악기 샘플(VCSL)로 연주해 mp3로 굽는다.
# 사용: python3 render.py <VCSL 경로> <출력 폴더>
import sys, os, glob, re, subprocess, json
import numpy as np

SR = 44100
VCSL = sys.argv[1]; OUT = sys.argv[2]
rng = np.random.default_rng(7)
NOTE = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}

def midi_of(name):
    m = re.match(r"([A-G]#?)(-?\d)", name)
    return 12 * (int(m.group(2)) + 1) + NOTE[m.group(1)]

def load(path, maxlen=9.0):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", path, "-t", str(maxlen), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    a = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()
    # 앞쪽 무음 잘라내기
    env = np.abs(a).max(1); thr = env.max() * 0.02
    i = int(np.argmax(env > thr)); i = max(0, i - 40)
    return a[i:]

def f0_cents(a, midi):
    # 이름의 음높이 근처(±80센트)에서 실제 기본음을 찾아 센트 차이를 돌려준다
    x = a[int(0.05 * SR): int(1.05 * SR)].mean(1)
    if len(x) < SR // 2: return 0.0
    x = x * np.hanning(len(x)); n = 1 << 20
    sp = np.abs(np.fft.rfft(x, n)); fr = np.fft.rfftfreq(n, 1 / SR)
    best = None
    for h in (1, 2, 3):   # 기본음이 약한 음역은 배음으로
        f = 440 * 2 ** ((midi - 69) / 12) * h
        lo, hi = f * 2 ** (-80 / 1200), f * 2 ** (80 / 1200)
        m = (fr > lo) & (fr < hi)
        if not m.any(): continue
        k = np.argmax(sp * m); pk = sp[k]
        c = 1200 * np.log2(fr[k] / f)
        if best is None or pk > best[0]: best = (pk, c)
    return best[1] if best else 0.0

class Inst:
    def __init__(self, files, name_re, layer_re=None, gain=1.0, tune=False, maxlen=9.0):
        self.s = {}   # midi -> {layer: (audio, cents)}
        for f in files:
            b = os.path.basename(f); m = re.search(name_re, b)
            if not m: continue
            midi = midi_of(m.group(1)); layer = int(re.search(layer_re, b).group(1)) if layer_re else 1
            a = load(f, maxlen)
            a /= (np.abs(a).max() + 1e-9)
            c = f0_cents(a, midi) if tune else 0.0
            self.s.setdefault(midi, {})[layer] = (a, c)
        self.keys = np.array(sorted(self.s)); self.gain = gain
        self.layers = sorted({l for v in self.s.values() for l in v})
        print("  악기", len(self.keys), "음", self.layers)

    def note(self, midi, vel, dur, rel=0.45):
        k = self.keys[np.argmin(np.abs(self.keys - midi))]
        opts = self.s[k]; ls = sorted(opts)
        layer = ls[0] if vel < 0.55 or len(ls) == 1 else ls[-1]
        a, c = opts[layer]
        ratio = 2 ** ((midi - k) / 12 - c / 1200)
        n_out = int((dur + rel) * SR)
        idx = np.arange(n_out) * ratio
        idx = idx[idx < len(a) - 1]
        y = np.empty((len(idx), 2), np.float32)
        for ch in range(2): y[:, ch] = np.interp(idx, np.arange(len(a)), a[:, ch])
        # 손을 뗄 때 부드럽게 줄이기
        r0 = int(dur * SR)
        if r0 < len(y):
            t = np.arange(len(y) - r0) / SR
            y[r0:] *= np.exp(-t / (rel / 4.5))[:, None]
        y[:64] *= np.linspace(0, 1, min(64, len(y)))[:, None]
        # 세기: 소리 크기 + 부드러움(약하게 칠수록 고음 줄이기 = 간단한 1차 저역 필터)
        amp = self.gain * (0.18 + 0.82 * vel) * (0.55 if layer == ls[-1] and len(ls) > 1 else 1.0)
        return y * amp

def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x)
    # 블록 단위로 하면 느리니 FFT로 1차 필터 응답 근사
    n = len(x); N = 1 << int(np.ceil(np.log2(n + 1)))
    H = (1 - a) / (1 - a * np.exp(-2j * np.pi * np.fft.rfftfreq(N)))
    for ch in range(x.shape[1]): y[:, ch] = np.fft.irfft(np.fft.rfft(x[:, ch], N) * H, N)[:n]
    return y

def highpass(x, fc):
    return x - lowpass(x, fc)

def reverb(x, secs=2.6, wet=0.22, pre=0.025):
    n_ir = int(secs * SR); t = np.arange(n_ir) / SR
    ir = np.zeros((n_ir, 2), np.float32)
    for ch in range(2):
        noise = rng.standard_normal(n_ir).astype(np.float32)
        ir[:, ch] = noise * np.exp(-t * 6.9 / secs)
    ir = lowpass(ir, 3800); ir[: int(pre * SR)] = 0
    ir /= np.sqrt((ir ** 2).sum(0, keepdims=True))
    n = len(x) + n_ir; N = 1 << int(np.ceil(np.log2(n)))
    out = np.zeros((n, 2), np.float32)
    for ch in range(2):
        out[:, ch] = np.fft.irfft(np.fft.rfft(x[:, ch], N) * np.fft.rfft(ir[:, ch], N), N)[:n]
    dry = np.zeros_like(out); dry[: len(x)] = x
    return dry * (1 - wet * 0.5) + out * wet

class Song:
    def __init__(self, bpm, beats=4):
        self.spb = 60 / bpm; self.beats = beats; self.ev = []
    def add(self, inst, midi, beat, dur_beats, vel, rel=0.5):
        self.ev.append((inst, midi, beat, dur_beats, vel, rel))
    def render(self, tempo_curve=None):
        # tempo_curve(beat) -> 배수(1=그대로, 1.2=느리게)
        def bt(b):
            if not tempo_curve: return b * self.spb
            # 박마다 적분
            whole = int(b); s = sum(tempo_curve(i) for i in range(whole)) + (b - whole) * tempo_curve(whole)
            return s * self.spb
        total = max(bt(b + d) for _, _, b, d, _, _ in self.ev) + 9
        mix = np.zeros((int(total * SR), 2), np.float32)
        for inst, midi, b, d, vel, rel in self.ev:
            t0 = bt(b) + rng.normal(0, 0.008); dur = bt(b + d) - bt(b)
            y = inst.note(midi, float(np.clip(vel + rng.normal(0, 0.04), 0.05, 1)), dur, rel)
            i = max(0, int(t0 * SR)); mix[i: i + len(y)] += y[: len(mix) - i]
        return mix

def finish(mix, name, title, rev=(2.6, 0.22), lp=None):
    mix = highpass(mix, 70)                 # 강한 저음 빼기
    if lp: mix = lowpass(mix, lp)
    mix = reverb(mix, *rev)
    # 끝 무음 자르고 페이드
    env = np.abs(mix).max(1); last = len(env) - int(np.argmax(env[::-1] > env.max() * 0.004))
    mix = mix[: min(len(mix), last + SR)]
    f = int(3 * SR); mix[-f:] *= np.linspace(1, 0, f)[:, None] ** 2
    mix[: 2000] *= np.linspace(0, 1, 2000)[:, None]
    wav = os.path.join(OUT, name + ".wav")
    pk = np.abs(mix).max(); mix = mix / pk * 0.89
    subprocess.run(["ffmpeg", "-v", "quiet", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", wav], input=mix.astype(np.float32).tobytes())
    # 라우드니스 -20 LUFS로 맞춘 뒤 mp3 (모노 64kbps: 곡당 약 1MB)
    mp3 = os.path.join(OUT, name + ".mp3")
    subprocess.run(["ffmpeg", "-v", "quiet", "-y", "-i", wav, "-af", "loudnorm=I=-20:TP=-2:LRA=11", "-ac", "1", "-ar", "44100", "-b:a", "64k",
                    "-metadata", f"title={title}", "-metadata", "artist=한강 라디오", "-metadata", "copyright=CC0 1.0", mp3])
    d = len(mix) / SR
    print(f"  {name}: {d:.1f}초, {os.path.getsize(mp3)/1e6:.2f}MB")
    return d

# ---------- 화성/선율 도구 ----------
def chord(root, kind):
    iv = {"M": [0, 4, 7], "m": [0, 3, 7], "M7": [0, 4, 7, 11], "m7": [0, 3, 7, 10], "7": [0, 4, 7, 10], "sus2": [0, 2, 7], "add9": [0, 4, 7, 14], "m9": [0, 3, 7, 10, 14], "6": [0, 4, 7, 9]}[kind]
    return [root + i for i in iv]

def near(pcs, target, lo, hi):
    c = [m for m in range(lo, hi + 1) if m % 12 in pcs]
    return min(c, key=lambda m: abs(m - target))

def melody_bar(scale_pcs, chord_pcs, prev, rhythm, lo, hi, rs, contour=0):
    """한 마디 선율: 강박은 화음음, 약박은 음계음(순차 진행 위주)."""
    out = []; cur = prev
    for i, (b, d) in enumerate(rhythm):
        strong = (b % 1 == 0) and (b % 2 == 0 or d >= 1)
        pool = chord_pcs if strong else scale_pcs
        step = rs.choice([-2, -1, 1, 2, 0, 3, -3], p=[.18, .24, .24, .16, .06, .06, .06]) + contour
        tgt = cur + step * 2
        cands = [m for m in range(lo, hi + 1) if m % 12 in pool]
        n = min(cands, key=lambda m: (abs(m - tgt), rs.random()))
        out.append((b, d, n)); cur = n
    return out, cur

RHY = [  # 한 마디(4박) 리듬 꼴
    [(0, 1.5), (1.5, .5), (2, 2)],
    [(0, 1), (1, 1), (2, 1.5), (3.5, .5)],
    [(0, 2), (2, 1), (3, 1)],
    [(0, .5), (.5, .5), (1, 1), (2, 2)],
    [(0, 3), (3, 1)],
    [(0, 1), (1, .5), (1.5, .5), (2, 2)],
    [(0, 4)],
]
RHY3 = [  # 3박
    [(0, 2), (2, 1)], [(0, 1), (1, 1), (2, 1)], [(0, 1.5), (1.5, .5), (2, 1)], [(0, 3)], [(0, 1), (1, 2)],
]

def compose(song, prog, scale_pcs, sections, inst_mel, inst_acc, seed, mel_lo=67, mel_hi=86, acc="arp8", bass_inst=None, beats=4, mel_vel=.62, acc_vel=.34, chords_inst=None):
    """sections: 'I'(전주,반주만) 'A' 'B' 'O'(후주). prog: 마디별 (root, kind). 선율은 A 구간 모티프를 반복·변형."""
    rs = np.random.default_rng(seed)
    bar = 0; motifs = {}; prev = (mel_lo + mel_hi) // 2
    rh = RHY if beats == 4 else RHY3
    for sec, nbars in sections:
        for k in range(nbars):
            root, kind = prog[(bar) % len(prog)]
            ch = chord(root, kind); pcs = {c % 12 for c in ch}
            B = bar * beats
            # --- 반주 ---
            bass = near({root % 12}, 43, 36, 50)
            last_outro = sec == "O" and k == nbars - 1
            bi = bass_inst or inst_acc
            if last_outro:
                bi and song.add(bi, bass, B, beats * 2, acc_vel + .05, 2.5)
                for j, m in enumerate(sorted({near({p}, 60 + i * 4, 55, 72) for i, p in enumerate(sorted(pcs))})):
                    song.add(inst_acc, m, B + j * .18, beats * 2, acc_vel, 2.5)
            else:
                song.add(bi, bass, B, beats, acc_vel + .06, .9)
                tones = sorted({near({p}, 57 + i * 5, 50, 74) for i, p in enumerate(sorted(pcs, key=lambda p: (p - root) % 12))})
                if acc == "arp8":   # 8분음표 펼침화음
                    pat = [bass + 7 if (bass + 7) % 12 in pcs else tones[0]] + tones + tones[::-1][1:-1]
                    for i in range(1, beats * 2):
                        m = pat[i % len(pat)]
                        song.add(inst_acc, m, B + i * .5, beats - i * .5, acc_vel * (0.9 if i % 2 else 1), .8)
                elif acc == "block":   # 2박마다 화음
                    for j in range(0, beats, 2):
                        for m in tones: song.add(inst_acc, m, B + j + .02 * tones.index(m), 2, acc_vel, 1.0)
                elif acc == "waltz":
                    for j in (1, 2):
                        for m in tones[:3]: song.add(inst_acc, m, B + j, 1, acc_vel * .9, .6)
                elif acc == "harp":   # 위로 쓸어 올리는 하프
                    up = sorted({near({p}, 50 + i * 4, 48, 84) for i, p in enumerate(list(pcs) * 3)})
                    for i, m in enumerate(up[:7]): song.add(inst_acc, m, B + i * (beats / 7), beats - i * (beats / 7) + .5, acc_vel, 1.2)
                elif acc == "kal":   # 칼림바 엇박 반복
                    seq = [tones[0], tones[-1], tones[1 % len(tones)], tones[-1]] * beats
                    for i in range(beats * 2):
                        if i % 4 == 3 and rs.random() < .4: continue
                        song.add(inst_acc, seq[i] + 12 * (i % 4 == 1), B + i * .5, .5, acc_vel * (1 if i % 2 == 0 else .8), .9)
                if chords_inst:   # 아주 작게 받쳐 주는 긴 화음
                    for m in tones[:3]: song.add(chords_inst, m + 12, B, beats, .22, 1.4)
            # --- 선율 ---
            if sec in ("A", "B") or (sec == "O" and k < nbars - 1):
                key = (sec, k % 4)
                if sec == "A" and key in motifs and rs.random() < .7:
                    notes = motifs[key]    # 앞서 나온 모티프 되풀이(외우기 쉬운 선율)
                    # 화음에 안 맞는 강박만 고치기
                    fixed = []
                    for b, d, n in notes:
                        if b % 2 == 0 and n % 12 not in pcs: n = near(pcs, n, mel_lo, mel_hi)
                        fixed.append((b, d, n))
                    notes = fixed
                else:
                    r = rh[rs.integers(len(rh))] if not (k % 4 == 3) else rh[-1 if beats == 4 else 3]
                    contour = 0.5 if sec == "B" and k < 2 else (-.4 if k % 4 == 3 else 0)
                    notes, prev = melody_bar(scale_pcs, pcs, prev, r, mel_lo + (3 if sec == "B" else 0), mel_hi, rs, contour)
                    if sec == "A": motifs.setdefault(key, notes)
                for b, d, n in notes:
                    v = mel_vel * (1.06 if b == 0 else .92) * (1.08 if sec == "B" else 1)
                    song.add(inst_mel, n, B + b, d * 1.05, v, .7)
                if notes: prev = notes[-1][2]
            bar += 1
    return bar

def tempo_rit(total_beats, last=8, amount=.55):
    return lambda b: 1 + amount * max(0, (b - (total_beats - last)) / last) ** 1.6

# ---------- 곡 ----------
if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    only = sys.argv[3].split(",") if len(sys.argv) > 3 else None
    P = os.path.join(VCSL, "Chordophones/Zithers/Grand Piano, Steinway B/Sus")
    print("피아노"); piano = Inst(glob.glob(P + "/*.wav"), r"Close_([A-G]#?\d)_vl", r"_vl(\d)_", gain=.9, maxlen=12)
    print("하프"); harp = Inst(glob.glob(os.path.join(VCSL, "Chordophones/Composite Chordophones/Concert Harp/*.wav")), r"KSHarp_([A-G]#?\d)_", gain=.8, tune=True, maxlen=8)
    print("비브라폰"); vib = Inst(glob.glob(os.path.join(VCSL, "Idiophones/Struck Idiophones/Vibraphone/Soft Mallets/*.wav")), r"soft_([A-G]#?\d)_v", r"_v(\d)_", gain=.8, tune=True, maxlen=8)
    print("칼림바"); kal = Inst(glob.glob(os.path.join(VCSL, "Idiophones/Plucked Idiophones/Kalimba, Tanzania/*.wav")), r"Main_([A-G]#?\d)_k", gain=.75, tune=True, maxlen=5)
    C, D, E, F, G, A, B = 60, 62, 64, 65, 67, 69, 71
    meta = []
    def S(sec): return sum(n for _, n in sec)

    if not only or "1" in only:   # 1. 달빛 산책 — 피아노, C장조, 68
        sec = [("I", 2), ("A", 8), ("A", 8), ("B", 8), ("A", 8), ("O", 4)]
        prog = [(C, "M"), (G - 12, "M"), (A - 12, "m"), (E - 12, "m"), (F - 12, "M"), (C, "M"), (F - 12, "M"), (G - 12, "M")]
        s = Song(68); compose(s, prog, {0, 2, 4, 7, 9}, sec, piano, piano, 11, acc="arp8")
        d = finish(s.render(tempo_rit(S(sec) * 4)), "radio-1", "달빛 산책"); meta.append(("radio-1", "달빛 산책", "피아노", d))
    if not only or "2" in only:   # 2. 강바람 — 하프 + 피아노 선율, F장조, 72
        sec = [("I", 2), ("A", 8), ("A", 8), ("B", 8), ("A", 8), ("O", 4)]
        prog = [(F - 12, "M7"), (A - 12, "m7"), (58 - 12, "M7"), (C, "sus2"), (D - 12, "m7"), (A - 12, "m7"), (58 - 12, "M7"), (C, "M")]
        s = Song(72); compose(s, prog, {5, 7, 9, 0, 2}, sec, piano, harp, 23, acc="harp", bass_inst=harp, acc_vel=.36, mel_vel=.58)
        d = finish(s.render(tempo_rit(S(sec) * 4)), "radio-2", "강바람"); meta.append(("radio-2", "강바람", "하프·피아노", d))
    if not only or "3" in only:   # 3. 별 세는 밤 — 비브라폰 + 피아노 블록화음, 60
        sec = [("I", 2), ("A", 8), ("A", 8), ("B", 8), ("O", 4)]
        prog = [(F - 12, "M7"), (E - 12, "m7"), (D - 12, "m7"), (C, "M7"), (A - 12 - 12 + 12, "m7"), (D - 12, "m7"), (G - 12, "7"), (C, "M7")]
        s = Song(60); compose(s, prog, {0, 2, 4, 7, 9}, sec, vib, piano, 37, mel_lo=64, mel_hi=81, acc="block", acc_vel=.3, mel_vel=.6)
        d = finish(s.render(tempo_rit(S(sec) * 4)), "radio-3", "별 세는 밤", rev=(3.0, .26)); meta.append(("radio-3", "별 세는 밤", "비브라폰·피아노", d))
    if not only or "4" in only:   # 4. 칼림바 자장가 — G장조 5음계, 76
        sec = [("I", 2), ("A", 8), ("A", 8), ("B", 8), ("A", 8), ("O", 4)]
        prog = [(G - 12, "M"), (E - 12, "m"), (C, "M"), (D - 12, "M")]
        s = Song(76); compose(s, prog, {7, 9, 11, 2, 4}, sec, kal, kal, 41, mel_lo=67, mel_hi=84, acc="kal", bass_inst=harp, acc_vel=.3, mel_vel=.62)
        d = finish(s.render(tempo_rit(S(sec) * 4)), "radio-4", "칼림바 자장가", rev=(2.2, .2)); meta.append(("radio-4", "칼림바 자장가", "칼림바·하프", d))
    if not only or "5" in only:   # 5. 새벽 두 시 — 피아노 3박 왈츠, A단조, 84(3/4)
        sec = [("I", 4), ("A", 8), ("A", 8), ("B", 8), ("A", 8), ("B", 8), ("A", 8), ("O", 4)]
        prog = [(A - 12, "m"), (F - 12, "M7"), (C, "M"), (G - 12, "M"), (D - 12, "m7"), (A - 12, "m"), (E - 12, "sus2"), (E - 12, "M")]
        s = Song(84, 3); compose(s, prog, {9, 11, 0, 2, 4, 5, 7}, sec, piano, piano, 53, beats=3, acc="waltz", mel_lo=64, mel_hi=84, acc_vel=.28, mel_vel=.6)
        d = finish(s.render(tempo_rit(S(sec) * 3, 6)), "radio-5", "새벽 두 시"); meta.append(("radio-5", "새벽 두 시", "피아노", d))
    if not only or "6" in only:   # 6. 물비늘 — 하프 펼침 + 비브라폰 선율, D장조, 66
        sec = [("I", 2), ("A", 8), ("A", 8), ("B", 8), ("A", 8), ("O", 4)]
        prog = [(D - 12, "add9"), (B - 24, "m7"), (G - 12, "M7"), (A - 12, "sus2"), (D - 12, "M"), (F + 1 - 12, "m7"), (G - 12, "M7"), (A - 12, "7")]
        s = Song(66); compose(s, prog, {2, 4, 6, 9, 11}, sec, vib, harp, 67, mel_lo=64, mel_hi=81, acc="harp", bass_inst=harp, acc_vel=.33, mel_vel=.6)
        d = finish(s.render(tempo_rit(S(sec) * 4)), "radio-6", "물비늘", rev=(3.0, .25)); meta.append(("radio-6", "물비늘", "하프·비브라폰", d))
    if not only or "7" in only:   # 7. 가로등 아래 — 피아노 블록화음 + 비브라폰, E♭장조, 64
        Eb, Ab, Bb = 63, 68, 70
        sec = [("I", 2), ("A", 8), ("A", 8), ("B", 8), ("A", 8), ("O", 4)]
        prog = [(Eb - 12, "M7"), (C - 12, "m7"), (Ab - 12, "M7"), (Bb - 12, "sus2"), (F - 12, "m7"), (Bb - 12, "7"), (Eb - 12, "M7"), (Ab - 12, "M7")]
        s = Song(64); compose(s, prog, {3, 5, 7, 10, 0}, sec, vib, piano, 71, mel_lo=63, mel_hi=82, acc="block", acc_vel=.28, mel_vel=.58)
        d = finish(s.render(tempo_rit(S(sec) * 4)), "radio-7", "가로등 아래", rev=(2.8, .24)); meta.append(("radio-7", "가로등 아래", "비브라폰·피아노", d))
    if not only or "8" in only:   # 8. 마지막 지하철 — 피아노 8분음표, D단조, 70
        sec = [("I", 2), ("A", 8), ("A", 8), ("B", 8), ("A", 8), ("O", 4)]
        prog = [(D - 12, "m"), (58 - 12, "M7"), (F - 12, "M"), (C, "M"), (G - 12, "m7"), (D - 12, "m"), (A - 12, "sus2"), (A - 12, "M")]
        s = Song(70); compose(s, prog, {2, 4, 5, 7, 9, 10, 0}, sec, piano, piano, 83, acc="arp8", mel_lo=65, mel_hi=84, acc_vel=.3)
        d = finish(s.render(tempo_rit(S(sec) * 4)), "radio-8", "마지막 지하철"); meta.append(("radio-8", "마지막 지하철", "피아노", d))
    if not only or "9" in only:   # 9. 반딧불 — 칼림바 + 하프 펼침, A장조 5음계, 80
        sec = [("I", 2), ("A", 8), ("A", 8), ("B", 8), ("A", 8), ("O", 4)]
        prog = [(A - 12, "M"), (F + 1 - 12, "m"), (D - 12, "M"), (E - 12, "sus2")]
        s = Song(80); compose(s, prog, {9, 11, 1, 4, 6}, sec, kal, harp, 97, mel_lo=69, mel_hi=86, acc="harp", bass_inst=harp, acc_vel=.3, mel_vel=.64)
        d = finish(s.render(tempo_rit(S(sec) * 4)), "radio-9", "반딧불", rev=(2.4, .2)); meta.append(("radio-9", "반딧불", "칼림바·하프", d))
    if not only or "10" in only:   # 10. 돗자리 왈츠 — 하프 선율 + 피아노 왈츠, G장조 3박, 90
        sec = [("I", 4), ("A", 8), ("A", 8), ("B", 8), ("A", 8), ("B", 8), ("A", 8), ("O", 4)]
        prog = [(G - 12, "M"), (D - 12, "M"), (E - 12, "m"), (B - 24, "m"), (C, "M"), (G - 12, "M"), (A - 12, "m7"), (D - 12, "7")]
        s = Song(90, 3); compose(s, prog, {7, 9, 11, 0, 2, 4, 6}, sec, harp, piano, 101, beats=3, acc="waltz", mel_lo=67, mel_hi=86, acc_vel=.26, mel_vel=.66)
        d = finish(s.render(tempo_rit(S(sec) * 3, 6)), "radio-10", "돗자리 왈츠"); meta.append(("radio-10", "돗자리 왈츠", "하프·피아노", d))
    if not only or "11" in only:   # 11. 구름 사이 달 — 비브라폰 + 하프, B♭장조, 62
        Bb = 70
        sec = [("I", 2), ("A", 8), ("B", 8), ("A", 8), ("B", 8), ("O", 4)]
        prog = [(Bb - 12, "M7"), (G - 12, "m7"), (E + 3 - 12, "M7"), (F - 12, "sus2"), (D - 12, "m7"), (G - 12, "m7"), (E + 3 - 12, "M7"), (F - 12, "7")]
        s = Song(62); compose(s, prog, {10, 0, 2, 5, 7}, sec, vib, harp, 113, mel_lo=65, mel_hi=82, acc="harp", bass_inst=harp, acc_vel=.3, mel_vel=.6)
        d = finish(s.render(tempo_rit(S(sec) * 4)), "radio-11", "구름 사이 달", rev=(3.0, .26)); meta.append(("radio-11", "구름 사이 달", "비브라폰·하프", d))
    if not only or "12" in only:   # 12. 잘 자요, 한강 — 피아노 아주 느리게, F장조, 56
        sec = [("I", 2), ("A", 8), ("A", 8), ("B", 8), ("A", 8), ("O", 4)]
        prog = [(F - 12, "M"), (C, "M"), (D - 12, "m7"), (58 - 12, "M7"), (F - 12, "M"), (A - 12, "m7"), (58 - 12, "M7"), (C, "sus2")]
        s = Song(56); compose(s, prog, {5, 7, 9, 0, 2}, sec, piano, piano, 127, acc="arp8", mel_lo=65, mel_hi=81, acc_vel=.26, mel_vel=.55)
        d = finish(s.render(tempo_rit(S(sec) * 4, 10, .8)), "radio-12", "잘 자요, 한강"); meta.append(("radio-12", "잘 자요, 한강", "피아노", d))
    json.dump(meta, open(os.path.join(OUT, "meta%s.json" % ("-" + "-".join(only) if only else "")), "w"), ensure_ascii=False)
