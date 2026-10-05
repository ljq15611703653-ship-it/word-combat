#!/bin/bash
# usage: export.sh scene...   (需要在 D:/wc/art_q 下运行 python -m http.server 8731)
CH="C:/Program Files/Google/Chrome/Application/chrome.exe"
for n in "$@"; do
  nn=$(printf %02d $n)
  "$CH" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=1920,1080 --virtual-time-budget=4000 --screenshot="D:/wc/art_q/bgs/s$nn.png" "http://localhost:8731/bgs/gen.html?scene=$n" >/dev/null 2>&1
done
