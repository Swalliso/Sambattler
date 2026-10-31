#!/bin/zsh
# kind name|proto arg
S=docs/ideas/after-the-rework/scripts/measure; M=reports/after-the-rework/measure
kind=$1; name=${2%%|*}; proto=${2#*|}
cd "${0:A:h}/../../../../.."  # the repo root
mkdir -p $M/data $M/logs
start=$(date +%s)
if [[ $kind == ts ]]; then
  npx tsx $S/fun2.ts --proto "$proto" --commander $3 --seeds 60 --out $M/data/ts-$name-$3.json > $M/logs/ts-$name-$3.log 2>&1
else
  if [[ -n "$proto" ]]; then p=(--proto "$proto"); else p=(); fi
  npx tsx tools/experiment.ts $p --checks spread --spread-buildings $3 --label "fr-spread-$name-$3" > $M/logs/spread-$name-$3.log 2>&1
fi
echo "$kind $name $3 exit $? $(( $(date +%s) - start ))s" >> $M/logs/done3.txt
