"""Combine the experiment tool's per-commander reports (reports/experiments/fr-<variant>-<commander>.json)."""
import json, math, os, sys
R = os.path.normpath(os.path.dirname(os.path.abspath(__file__)) + '/../../../../../reports/experiments')
VARIANTS = ['base', 'rework', 'rwB', 'rwbreach', 'rwhb', 'stepB']
CMDRS = ['vesper', 'armilla', 'cordis']
G = ['general:scripted', 'general:mother-mold', 'general:lichen-baron', 'general:blightwright']


def clock(s):
    if s is None or (isinstance(s, float) and not math.isfinite(s)):
        return 'never'
    m, sec = divmod(round(s), 60)
    return f'{m}:{sec:02d}'


def pm(k, n):
    p = k / n
    return f'{100*p:.0f}% ±{196*math.sqrt(p*(1-p)/n):.0f}'


for v in VARIANTS:
    eng, runs = [], []
    for c in CMDRS:
        p = f'{R}/fr-{v}-{c}.json'
        if not os.path.exists(p):
            continue
        d = json.load(open(p))
        eng += d['engagement']
        runs.append(d['runs'])
    if not eng:
        continue
    print(f'## {v} ({len(eng)} rows)')
    for c in CMDRS:
        rows = [r for r in eng if r.get('commander') == c]
        if not rows:
            continue
        def cells(f):
            return ' / '.join(f(r) for r in rows)
        win = cells(lambda r: '%.0f' % (100 * r['playerWins'] / r['battles']))
        dec = cells(lambda r: '%.0f' % (100 * r['decisions'] / r['battles']))
        ln = cells(lambda r: clock(r['medianSeconds']))
        flip = cells(lambda r: clock(r['firstFlipSeconds']))
        nf = cells(lambda r: '%.0f' % (100 * r['noFlipBy3'] / r['battles']))
        sup = cells(lambda r: '%g·%g·%g' % (r['supplyAt']['60'], r['supplyAt']['120'], r['supplyAt']['300']))
        fall = cells(lambda r: '%.0f' % r['fallSeconds'])
        tt = cells(lambda r: '%.0f' % r['fallFromTwoThirdsSeconds'])
        cpm = cells(lambda r: '%.1f' % r['playerCommandsPerMinute'])
        mg = cells(lambda r: '%g' % r['merges'])
        print(f"  {c}: win {win}% | dec {dec}% | len {ln} | flip {flip} | noflip3 {nf}% | sup@1/2/5 {sup} | fall {fall} s | ⅔→dead {tt} s | cpm {cpm} | merges {mg}")
    n = sum(r['battles'] for r in eng)
    print(f"  all: player wins {pm(sum(r['playerWins'] for r in eng), n)}; Decisions {pm(sum(r['decisions'] for r in eng), n)}; routs {sum(r['routs'] for r in eng)}/{n};"
          f" winner untouched {sum(r['winnerUntouched'] for r in eng)}/{n}; winner fell to ⅔ {sum(r['winnerBreached'] for r in eng)}, to ⅓ {sum(r['winnerBelowThird'] for r in eng)}")
    nr = sum(r['runs'] for r in runs)
    b1 = sum(r['lostAt'].get('1', 0) for r in runs), sum(r['playedAt'].get('1', 0) for r in runs)
    b2 = sum(r['lostAt'].get('2', 0) for r in runs), sum(r['playedAt'].get('2', 0) for r in runs)
    e1 = sum(r['endedInBattle'].get('1', 0) for r in runs)
    boss = sum(r['reachedBoss'] for r in runs)
    won = sum(r['victories'] for r in runs)
    print(f"  runs {nr}: battle 1 lost {b1[0]}/{b1[1]} ({pm(*b1)}), battle 2 lost {b2[0]}/{b2[1]} ({pm(*b2)}), ended in battle 1 {e1} ({pm(e1, nr)}),"
          f" boss {boss} ({pm(boss, nr)}), won {won} ({pm(won, nr)}), boss fights won {won}/{boss}; battle min/run {sum(r['meanBattleMinutes']*r['runs'] for r in runs)/nr:.1f}; cards/battle {sum(r['cardsPerBattle'] for r in runs)/len(runs):.2f}")
    for r in runs:
        print(f"    {r['commander']}: b1 lost {r['lostAt'].get('1',0)}/{r['playedAt'].get('1',0)}, b2 lost {r['lostAt'].get('2',0)}/{r['playedAt'].get('2',0)}, ended b1 {r['endedInBattle'].get('1',0)}, boss {r['reachedBoss']}, won {r['victories']}, min/run {r['meanBattleMinutes']:.1f}")
    print()
