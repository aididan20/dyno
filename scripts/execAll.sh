#!/bin/bash

servers=("titan" "atlas" "pandora" "hype" "prom" "janus" "sinope" "narvi" "gany" "europa" "elara" "metis")

for s in "${servers[@]}"
do
        ssh dyno@"$s".dyno.lan $*
done