#!/usr/bin/env bash
# Render bản cuối. VI: tái dùng khung 0..1190 từ bản cũ, render từ cảnh 3D (1191) rồi nối; EN: render toàn bộ.
set -e
cd "$(dirname "$0")/.."
CUT=1191
for id in vi-tall vi-wide; do
  cp out/scipal-trailer-$id.mp4 out/prev-$id.mp4
  npx remotion render src/index.ts trailer-$id out/tail-$id.mp4 --frames=$CUT-1919 --muted --codec h264 --crf 16 --concurrency 6 >/dev/null 2>&1
  ffmpeg -y -loglevel error -i out/prev-$id.mp4 -i out/tail-$id.mp4 -i public/music.wav \
    -filter_complex "[0:v]trim=end_frame=$CUT,setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0[v]" \
    -map "[v]" -map 2:a -c:v libx264 -crf 22 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart out/scipal-trailer-$id.mp4
  echo "READY $id"
done
for id in en-wide en-tall; do
  npx remotion render src/index.ts trailer-$id out/scipal-trailer-$id.mp4 --codec h264 --crf 22 --concurrency 6 >/dev/null 2>&1
  echo "READY $id"
done
