#!/bin/zsh
# $1 = name|proto  $2 = commander
name=${1%%|*}; proto=${1#*|}
S=docs/ideas/after-the-rework/scripts/measure; M=reports/after-the-rework/measure
cd "${0:A:h}/../../../../.."  # the repo root
mkdir -p $M/data $M/logs
start=$(date +%s)
npx tsx $S/fun.ts --proto "$proto" --commander $2 --seeds 60 --runs 200 --out $M/data/$name-$2.json > $M/logs/fun-$name-$2.log 2>&1
echo "$name $2 exit $? $(( $(date +%s) - start ))s" >> $M/logs/done2.txt
