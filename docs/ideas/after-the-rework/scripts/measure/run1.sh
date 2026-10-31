#!/bin/zsh
# $1 = name|proto  $2 = commander
name=${1%%|*}; proto=${1#*|}
cd "${0:A:h}/../../../../.."  # the repo root
out=reports/after-the-rework/measure/logs
mkdir -p $out
if [[ -n "$proto" ]]; then p=(--proto "$proto"); else p=(); fi
start=$(date +%s)
npx tsx tools/experiment.ts $p --checks engagement,runs --seeds 30 --runs 100 --commander $2 --power-policy auto --label "fr-$name-$2" > $out/$name-$2.log 2>&1
echo "$name $2 exit $? $(( $(date +%s) - start ))s" >> $out/done.txt
