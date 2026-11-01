"""Who's winning, and when is it decided? From fun2.ts time series (10 s samples)."""
import json, os, sys, math
import numpy as np

D = os.path.normpath(os.path.dirname(os.path.abspath(__file__)) + '/../../../../../reports/after-the-rework/measure/data')
VARIANTS = sys.argv[1].split(',') if len(sys.argv) > 1 else ['base', 'rework', 'rwbreach']
CMDRS = ['vesper', 'armilla', 'cordis']
T, LEAD, FP, FE, BP, BE, VP, VE, HP, HE, GP, GE = range(12)


def load(v):
    bs = []
    for c in CMDRS:
        p = f'{D}/ts-{v}-{c}.json'
        if os.path.exists(p):
            bs += json.load(open(p))['battles']
    return [b for b in bs if b['winner']]


def sgn_for_player(row, key):
    if key == 'territory':
        return np.sign(row[LEAD])
    if key == 'field supply':
        return np.sign(row[FP] - row[FE])
    if key == 'building value':
        return np.sign(row[VP] - row[VE])
    if key == 'material (buildings + gold + field×25)':
        return np.sign((row[VP] + row[GP] + 25 * row[FP]) - (row[VE] + row[GE] + 25 * row[FE]))


KEYS = ['territory', 'field supply', 'building value', 'material (buildings + gold + field×25)']


def at(b, t):
    for r in b['ts']:
        if r[T] == t:
            return r
    return None


def main():
    for v in VARIANTS:
        bs = load(v)
        if not bs:
            continue
        print(f'## {v}: {len(bs)} battles with a winner')
        print('| Leader on … predicts the winner at | ' + ' | '.join(f'{t//60}:{t%60:02d}' for t in [60, 120, 180, 240, 300]) + ' |')
        print('|---|' + '---|' * 5)
        for key in KEYS:
            cells = []
            for t in [60, 120, 180, 240, 300]:
                ok = tie = n = 0
                for b in bs:
                    r = at(b, t)
                    if r is None:
                        continue
                    n += 1
                    s = sgn_for_player(r, key)
                    w = 1 if b['winner'] == 'player' else -1
                    if s == 0:
                        tie += 1
                    elif s == w:
                        ok += 1
                cells.append(f'{100*ok/max(1,n-tie):.0f}% (ties {100*tie/max(1,n):.0f}%, n {n})')
            print(f'| {key} | ' + ' | '.join(cells) + ' |')
        # decided: last sample at which the eventual loser was level or ahead on building value / material
        for key in ['territory', 'building value', 'material (buildings + gold + field×25)']:
            doomed = []
            for b in bs:
                w = 1 if b['winner'] == 'player' else -1
                last_ok = 0
                for r in b['ts']:
                    if sgn_for_player(r, key) != w:
                        last_ok = r[T]
                doomed.append((b['len'] - last_ok) / b['len'])
            print(f'- {key}: the eventual winner leads for good over the last {100*np.median(doomed):.0f}% of the battle (median; IQR {100*np.percentile(doomed,25):.0f}–{100*np.percentile(doomed,75):.0f}%)')
        # comebacks in material: the winner was behind by ≥ 30% of the loser's material at some point after 1:00
        cb = 0
        for b in bs:
            w = b['winner']
            for r in b['ts']:
                if r[T] < 60:
                    continue
                mp = r[VP] + r[GP] + 25 * r[FP]
                me = r[VE] + r[GE] + 25 * r[FE]
                mw, ml = (mp, me) if w == 'player' else (me, mp)
                if ml > 0 and mw < 0.7 * ml:
                    cb += 1
                    break
        print(f'- winner was behind by 30%+ in material at some point after 1:00: {cb}/{len(bs)} ({100*cb/len(bs):.0f}%)')
        # field supply swings: number of sign changes of field-supply lead (10 s samples, after 0:30)
        sw = []
        for b in bs:
            last, ch = 0, 0
            for r in b['ts']:
                if r[T] < 30:
                    continue
                s = sgn_for_player(r, 'field supply')
                if s == 0:
                    continue
                if last and s != last:
                    ch += 1
                last = s
            sw.append(ch / max(1, b['len'] / 60))
        print(f'- field-supply lead changes per minute (median): {np.median(sw):.2f}')
        print()


main()
