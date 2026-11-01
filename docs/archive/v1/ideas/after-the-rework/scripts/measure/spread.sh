#!/bin/zsh
# $1 = name|proto  $2 = building
name=${1%%|*}; proto=${1#*|}
M=reports/after-the-rework/measure
cd "${0:A:h}/../../../../.."  # the repo root
mkdir -p $M/logs
if [[ -n "$proto" ]]; then p=(--proto "$proto"); else p=(); fi
start=$(date +%s)
npx tsx tools/experiment.ts $p --checks spread --spread-buildings $2 --label "fr-spread-$name-$2" > $M/logs/spread-$name-$2.log 2>&1
echo "$name $2 exit $? $(( $(date +%s) - start ))s" >> $M/logs/done3.txt
