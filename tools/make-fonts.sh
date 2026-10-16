#!/usr/bin/env bash
# Subsets Inter / Inter Display (SIL Open Font License 1.1) to Latin and writes WOFF files.
# Source: https://github.com/rsms/inter (installed system-wide as OTF). Requires fonttools.
set -euo pipefail
SRC=/usr/share/fonts/opentype/inter
OUT="$(dirname "$0")/../public/fonts"
mkdir -p "$OUT"
UNI="U+0020-007E,U+00A0-00FF,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2022,U+2026,U+2190-2193,U+2197,U+2212,U+00D7,U+2248,U+00B1,U+2713"
for f in InterDisplay-Medium InterDisplay-SemiBold Inter-Regular Inter-Medium; do
  pyftsubset "$SRC/$f.otf" --unicodes="$UNI" --flavor=woff --layout-features='kern,liga,calt,tnum,ss01,cv11' --output-file="$OUT/$f.woff"
done
