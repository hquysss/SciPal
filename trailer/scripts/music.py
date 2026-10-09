"""Tổng hợp nhạc nền + hiệu ứng cho trailer (không dùng mẫu có bản quyền).

python scripts/music.py  ->  public/music.wav
Mốc thời gian khớp timeline trong src/Trailer.tsx (30 fps, FADE 12).
"""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 44100
FPS = 30
SCENES = [150, 135, 195, 210, 195, 210, 180, 285, 195, 120, 165]  # khớp buildScenes()
FADE = 12
starts, t = [], 0
for d in SCENES:
    starts.append(t)
    t += d - FADE
TOTAL = (starts[-1] + SCENES[-1]) / FPS
N = int(TOTAL * SR) + SR
rng = np.random.default_rng(7)

def sec(frame): return frame / FPS
def tt(n): return np.arange(n) / SR
def lp(x, hz, order=2): return sosfilt(butter(order, hz, 'low', fs=SR, output='sos'), x)
def hp(x, hz, order=2): return sosfilt(butter(order, hz, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def note(m): return 440 * 2 ** ((m - 69) / 12)
def put(buf, x, at):
    i = int(at * SR)
    if i >= len(buf): return
    x = x[: len(buf) - i]
    buf[i:i + len(x)] += x

def saw(f, n, detune=0.0):
    ph = np.cumsum(np.full(n, f * (1 + detune) / SR)) + rng.random()
    return 2 * (ph % 1) - 1

dry = np.zeros(N); wet = np.zeros(N); drums = np.zeros(N); duck = np.ones(N)

T0 = sec(starts[1]) + 0.13          # cú "impact" khi logo bật lên
BEAT = 0.5                           # 120 BPM
END = sec(starts[-1])                # cảnh CTA: nhạc dừng beat, ngân hợp âm

# Hợp âm: Cmaj7 - Am7 - Fmaj7 - G6, mỗi hợp âm 2 nhịp (4 s)
CHORDS = [[48, 55, 59, 64], [45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 55, 59]]
def chord_at(time):
    k = int(max(0, time - T0) // (8 * BEAT)) % 4
    return CHORDS[k]

# --- Pad (cả bài, mở dần) ---
seg = 8 * BEAT
time = T0 - 2 * seg
while time < TOTAL:
    n = int((seg + 1.0) * SR)
    ch = chord_at(max(time, T0))
    x = sum(saw(note(m + 12), n, d) for m in ch for d in (-0.004, 0.004)) / 8
    env = np.minimum(1, tt(n) / 0.6) * np.minimum(1, (n - np.arange(n)) / (0.8 * SR))
    cutoff = 900 if time < T0 else 2200
    x = lp(x * env, cutoff) * (0.10 if time < T0 else 0.13)
    if time + seg < 0: time += seg; continue
    put(wet, x if time >= 0 else x[int(-time * SR):], max(0, time))
    time += seg

# --- Hook: 3 tiếng "pop" khi câu hỏi hiện ---
for i, (fr, m) in enumerate(zip([6, 22, 38], [76, 79, 83])):
    n = int(0.35 * SR); tm = tt(n)
    f = note(m) * (1 + 0.6 * np.exp(-tm * 40))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tm * 11) * 0.35
    put(dry, x, sec(fr) + 0.05); put(wet, x * 0.5, sec(fr) + 0.05)

# --- Riser trước logo ---
rs, re_ = sec(80), T0
n = int((re_ - rs) * SR); tm = tt(n)
noise = rng.standard_normal(n)
sweep = np.concatenate([bp(noise[i:i + 2048], 300 + 6000 * (i / n) ** 2, 800 + 9000 * (i / n) ** 2) for i in range(0, n, 2048)])[:n]
put(dry, sweep * (tm / tm[-1]) ** 2 * 0.25, rs)

# --- Impact khi logo xuất hiện ---
n = int(2.5 * SR); tm = tt(n)
boom = np.sin(2 * np.pi * np.cumsum(90 * np.exp(-tm * 6) + 35) / SR) * np.exp(-tm * 2.2) * 0.9
put(drums, boom, T0)
for m, a in [(84, .18), (88, .14), (91, .12), (96, .08)]:          # chuông
    put(wet, np.sin(2 * np.pi * note(m) * tm) * np.exp(-tm * 1.6) * a, T0)

# --- Beat: kick, clap, hi-hat, bass, arp ---
def kick():
    n = int(0.45 * SR); tm = tt(n)
    f = 45 + 110 * np.exp(-tm * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tm * 7) * 0.85
def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR); tm = tt(n)
    return hp(rng.standard_normal(n), 7000) * np.exp(-tm * (18 if open_ else 70)) * 0.12
def clap():
    n = int(0.25 * SR); tm = tt(n)
    return bp(rng.standard_normal(n), 900, 2600) * np.exp(-tm * 22) * 0.35

b = 0
while T0 + b * BEAT < END:
    at = T0 + b * BEAT
    if at > T0 + 0.01:
        put(drums, kick(), at)
        i = int(at * SR); dl = int(0.22 * SR)
        duck[i:i + dl] = np.minimum(duck[i:i + dl], 0.35 + 0.65 * np.linspace(0, 1, dl) ** 1.5)
    if b % 2 == 1: put(drums, clap(), at); put(wet, clap() * 0.4, at)
    put(drums, hat(b % 4 == 3), at + BEAT / 2)
    if b >= 8: put(drums, hat() * 0.6, at + BEAT / 4); put(drums, hat() * 0.6, at + 3 * BEAT / 4)
    # bass móc 8 nốt
    root = chord_at(at)[0] - 12
    for k, off in enumerate([0, 0.5]):
        n = int(0.24 * SR); tm = tt(n)
        f = note(root + (12 if k else 0))
        x = np.tanh(2 * np.sin(2 * np.pi * f * tm)) * np.minimum(1, tm / 0.005) * np.exp(-tm * 6) * 0.30
        put(dry, lp(x, 600), at + off * BEAT)
    # arp pluck 16 nốt sau cảnh "cấp học"
    if at >= sec(starts[2]) - 0.05:
        ch = chord_at(at)
        seq = [ch[1], ch[2], ch[3], ch[2]]
        for s in range(4):
            n = int(0.3 * SR); tm = tt(n)
            m = seq[s] + 24
            x = (2 * np.abs(2 * ((note(m) * tm) % 1) - 1) - 1) * np.exp(-tm * 14) * 0.07
            put(wet, lp(x, 5000), at + s * BEAT / 4)
    b += 1

# --- Whoosh mỗi lần chuyển cảnh ---
for fr in starts[2:]:
    n = int(0.7 * SR); tm = tt(n)
    noise = rng.standard_normal(n)
    env = np.sin(np.pi * np.clip(tm / 0.7, 0, 1)) ** 2
    x = np.concatenate([bp(noise[i:i + 1024], 400 + 3000 * np.sin(np.pi * i / n), 1200 + 6000 * np.sin(np.pi * i / n)) for i in range(0, n, 1024)])[:n]
    put(dry, x * env * 0.22, sec(fr) - 0.35)

# --- Tiếng tick khi số liệu đếm lên ---
for i in range(3):
    s0 = sec(starts[-2] + 6 + i * 8)
    for k in range(10):
        n = int(0.03 * SR); tm = tt(n)
        put(dry, np.sin(2 * np.pi * (1800 + 200 * i) * tm) * np.exp(-tm * 120) * 0.12, s0 + k * 0.1 * (1 + k * 0.04))

# --- Kết: hợp âm lớn + chuông ở cảnh CTA ---
n = int((TOTAL - END + 0.5) * SR); tm = tt(n)
x = sum(saw(note(m + 12), n, d) for m in [48, 55, 59, 64, 67] for d in (-0.005, 0.005)) / 10
put(wet, lp(x * np.exp(-tm * 0.5), 2600) * 0.2, END)
put(drums, kick() * 1.1, END)
for m, a in [(72, .16), (79, .12), (84, .1), (88, .08)]:
    put(wet, np.sin(2 * np.pi * note(m) * tm) * np.exp(-tm * 1.2) * a, END + 0.02)

# --- Mix ---
ir_n = int(2.0 * SR)
ir = rng.standard_normal(ir_n) * np.exp(-tt(ir_n) * 3.2)
ir = lp(ir, 6000); ir /= np.sqrt(np.sum(ir ** 2))
rev = fftconvolve(wet, ir)[:N]
mix = (dry + wet * 0.8 + rev * 0.35) * duck + drums
mix = hp(mix, 30)
fade = np.ones(N); fe = int(TOTAL * SR); fs = fe - int(1.8 * SR)
fade[fs:fe] = np.linspace(1, 0, fe - fs); fade[fe:] = 0
mix = np.tanh(mix * fade * 1.4) / np.tanh(1.4)
mix = mix[:fe] / np.max(np.abs(mix[:fe])) * 0.89
# stereo nhẹ: lệch reverb 2 kênh
L = mix; R = np.concatenate([mix[:1], mix[:-1]]) * 0.98 + (rev[:fe] * 0.05 * duck[:fe])
R = R / max(1, np.max(np.abs(R)) / 0.89)
wavfile.write('public/music.wav', SR, (np.stack([L, R], 1) * 32767).astype(np.int16))
print(f'public/music.wav {TOTAL:.2f}s')
