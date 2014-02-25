#!/bin/bash

# echo commands
set -o xtrace

# kill bg processes on exit
trap "kill 0" EXIT

# serve quietly with python 2 or 3
python -m SimpleHTTPServer 2> /dev/null || python -m http.server 2> /dev/null &
BGPIDS="$BGPIDS $!"

# start fresh
rm main.js

# default browser on mac or linux
URL=http://localhost:8000/
open $URL || xdg-open $URL

# keep on buildin'
tsc game.ts --out main.js --target ES5 --sourcemap --noImplicitAny --watch &
BGPIDS="$BGPIDS $!"

# exit if any bg process has died
set +o xtrace # this part is noisy
while true; do
    for PID in $BGPIDS; do
        kill -0 $PID || exit
    done
    sleep 1
done
