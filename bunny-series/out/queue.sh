#!/bin/bash
cd /home/user/izamino/bunny-series
while pgrep -f "render.mjs ep2" > /dev/null; do sleep 10; done
for e in ep3 ep4 ep5 ep1; do node tools/render.mjs $e --workers 4 > out/render-$e.txt 2>&1; node /tmp/claude-0/-home-user-izamino/2c9bbac5-9466-5f63-b14e-97ae20a56470/scratchpad/air.mjs out/$e.mp4 1390 >> out/air.txt 2>&1; done
node /tmp/claude-0/-home-user-izamino/2c9bbac5-9466-5f63-b14e-97ae20a56470/scratchpad/air.mjs out/ep2.mp4 1390 >> out/air.txt 2>&1
echo ALLDONE >> out/air.txt
