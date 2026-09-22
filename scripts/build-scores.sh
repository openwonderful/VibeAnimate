#!/usr/bin/env bash
# Build the three film scores from the best YouTube audio stream.
#
#   scripts/build-scores.sh [SOURCE] [OUT_DIR]
#
# SOURCE defaults to public/audio/source/body-to-body-yt251.webm — YouTube's
# Opus stream (format 251, ~130 kbps, content to 20 kHz). Get it with
#   yt-dlp -f 251 -o public/audio/source/body-to-body-yt251.%(ext)s https://www.youtube.com/watch?v=RBaSiVjtKR4
# The old scores came from a 136 kbps MP3 rip of the same video that
# brickwalled at 16 kHz; the timing is sample-identical (cross-correlated
# 2026-09-22, 0.0 ms offset), so every cue in FILM.md still holds.
#
# Outputs (320 kbps MP3, force-add them — *.mp3 is gitignored):
#   body-to-body.mp3              the whole song, untouched
#   body-to-body-arirang.mp3      truncated at 176.40 (into the gap after the
#                                 Arirang's last hit at 176.00) — see FILM.md
#   body-to-body-arirang-bed.mp3  the same cut, with a wash under the ascension:
#                                 the Arirang's own last 16 s (160–176) slowed
#                                 to 0.85 with pitch kept, low-passed at 750 Hz,
#                                 echoed, ~7 dB down, fading in from 175.0 under
#                                 the live tail, gone by 189.8; padded to 190.0
#
# The wash parameters were fitted to the 2026-08-14 bed (f9bebd9) from its
# tail's spectrum, RMS envelope and autocorrelation signature, so this build
# reproduces it from the better source rather than re-encoding it.
set -euo pipefail
SRC=${1:-public/audio/source/body-to-body-yt251.webm}
OUT=${2:-public/audio}
WASH_GAIN=${WASH_GAIN:-0.567}   # linear (−4.9 dB); fitted so the wash sits at −11.8 dBFS rms over 177–185, like the old bed
CUT=176.40
ENC=(-c:a libmp3lame -b:a 320k -ar 48000)
mkdir -p "$OUT"

ffmpeg -v error -y -i "$SRC" "${ENC[@]}" "$OUT/body-to-body.mp3"
ffmpeg -v error -y -i "$SRC" -af "atrim=0:$CUT" "${ENC[@]}" "$OUT/body-to-body-arirang.mp3"
ffmpeg -v error -y -i "$SRC" -filter_complex "
  [0:a]asplit[live][w];
  [live]atrim=0:$CUT,asetpts=PTS-STARTPTS[cut];
  [w]atrim=160:176,asetpts=PTS-STARTPTS,atempo=0.85,lowpass=f=750,
     aecho=0.8:0.9:400|500|900:0.2|0.3|0.35,
     volume=$WASH_GAIN,afade=t=in:st=0:d=2.5,afade=t=out:st=10.0:d=4.8,
     adelay=175000|175000[wash];
  [cut][wash]amix=inputs=2:normalize=0:dropout_transition=0,apad=whole_dur=190,atrim=0:190[bed]
" -map "[bed]" "${ENC[@]}" "$OUT/body-to-body-arirang-bed.mp3"
for f in body-to-body body-to-body-arirang body-to-body-arirang-bed; do
  printf '%-30s %ss\n' "$f.mp3" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/$f.mp3")"
done
