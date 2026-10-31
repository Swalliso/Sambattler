"""Aggregate the fun.ts per-battle and per-run records into comparison tables (reference copy, see ../README.md)."""
import json, sys, os, math
import numpy as np

D = os.path.normpath(os.path.dirname(os.path.abspath(__file__)) + '/../../../../../reports/after-the-rework/measure/data')
VARIANTS = sys.argv[1].split(',') if len(sys.argv) > 1 else ['base', 'rework', 'rwB', 'rwbreach', 'rwhb', 'stepB']
CMDRS = ['vesper', 'armilla', 'cordis']
rng = np.random.default_rng(1)


def load(v):
    bs, rs = [], []
    for c in CMDRS:
        p = f'{D}/{v}-{c}.json'
        if not os.path.exists(p):
            continue
        d = json.load(open(p))
        bs += d['battles']
        rs += d['runs']
    return bs, rs


def med_ci(xs):
    xs = np.array([x for x in xs if x is not None and math.isfinite(x)], dtype=float)
    if len(xs) == 0:
        return (float('nan'), float('nan'), float('nan'), 0)
    m = np.median(xs)
    boots = np.median(rng.choice(xs, (400, len(xs))), axis=1)
    return (m, np.percentile(boots, 2.5), np.percentile(boots, 97.5), len(xs))


def mean_ci(xs):
    xs = np.array([x for x in xs if x is not None and math.isfinite(x)], dtype=float)
    if len(xs) == 0:
        return (float('nan'), float('nan'), 0)
    return (xs.mean(), 1.96 * xs.std(ddof=1) / math.sqrt(len(xs)) if len(xs) > 1 else 0, len(xs))


def prop(k, n):
    if n == 0:
        return '—'
    p = k / n
    return f'{100*p:.0f}% ±{196*math.sqrt(p*(1-p)/n):.0f} ({k}/{n})'


def clock(s):
    if s is None or not math.isfinite(s):
        return 'never'
    return f'{int(s//60)}:{int(round(s%60)):02d}' if round(s % 60) < 60 else f'{int(s//60)+1}:00'


def fmt_med(t, f=clock):
    m, lo, hi, n = t
    if not math.isfinite(m):
        return '—'
    return f'{f(m)} [{f(lo)}–{f(hi)}]'


def num(x, d=1):
    return f'{x:.{d}f}'


def battle_table(bs, label):
    out = {}
    n = len(bs)
    out['n'] = n
    out['player win'] = prop(sum(b['winner'] == 'player' for b in bs), n)
    out['Decisions'] = prop(sum(b['by'] == 'decision' for b in bs), n)
    out['median length'] = fmt_med(med_ci([b['len'] for b in bs]))
    ff = [b['firstFlip'] if b['firstFlip'] is not None else float('inf') for b in bs]
    out['first flip (median)'] = clock(float(np.median(ff)))
    out['no flip by 3:00'] = prop(sum(x > 180 for x in ff), n)
    out['first unit death (median)'] = fmt_med(med_ci([b['firstDeath'] for b in bs]))
    out['first building lost (median)'] = fmt_med(med_ci([b['firstBuildingLost'] for b in bs]))
    for s in ['30', '60', '120', '180', '300']:
        vals = [b['field'][s]['player'] + b['field'][s]['enemy'] for b in bs if s in b['field']]
        com = [b['supply'][s]['player'] + b['supply'][s]['enemy'] for b in bs if s in b['supply']]
        u = [b['units'][s]['player'] + b['units'][s]['enemy'] for b in bs if s in b['units']]
        out[f'supply on field @{clock(int(s))} (both; committed incl. waiting)'] = f"{np.median(vals):.0f} ({np.median(com):.0f}); units {np.median(u):.0f}" if vals else '—'
    out['peak field supply (both, median)'] = f"{np.median([b['peakSupply'] for b in bs]):.0f}"
    dpm = [(b['deaths']['player'] + b['deaths']['enemy']) / (b['len'] / 60) for b in bs]
    out['unit deaths per minute (median)'] = num(np.median(dpm))
    out['unit deaths by 2:00 (median)'] = f"{np.median([b['deathsBy2'] for b in bs]):.0f}"
    out['column flips per battle (median)'] = f"{np.median([b['flips'] for b in bs]):.0f}"
    out['column flips by 3:00 (median)'] = f"{np.median([b['flipsBy3'] for b in bs]):.0f}"
    out['merges per battle (median, both)'] = f"{np.median([b['merges'] for b in bs]):.0f}"
    cpm = [b['cmds'] / (b['len'] / 60) for b in bs]
    out['bot commands per minute (median)'] = num(np.median(cpm))
    places = [b['cmdByType'].get('place', 0) / (b['len'] / 60) for b in bs]
    out['bot builds per minute (median)'] = num(np.median(places))
    out['bot power uses per battle (median)'] = f"{np.median([b['powers'] for b in bs]):.0f}"
    out['longest gap between bot commands (median)'] = f"{np.median([b['maxCmdGap'] for b in bs]):.0f} s"
    for s in ['60', '120', '180']:
        g = [b['gold'][s] for b in bs if s in b['gold']]
        out[f'player gold banked @{clock(int(s))} (median)'] = f"{np.median(g):.0f}"
    out['player peak gold banked (median)'] = f"{np.median([b['maxGoldBanked'] for b in bs]):.0f}"
    # lead and comebacks
    lc = [b['leadChanges'] for b in bs]
    out['territory lead changes per battle (mean)'] = num(np.mean(lc), 2)
    out['battles with ≥1 lead change'] = prop(sum(x >= 1 for x in lc), n)
    led = [b for b in bs if b['firstLeader'] is not None]
    out['first side to lead the front wins'] = prop(sum(b['firstLeaderWon'] for b in led), len(led))
    out['first lead taken at (median)'] = clock(float(np.median([b['firstLeadAt'] for b in led]))) if led else '—'
    frac_after = [(b['len'] - b['lastLeadChangeAt']) / b['len'] for b in led]
    out['share of battle after the last lead change (median)'] = f"{100*np.median(frac_after):.0f}%" if led else '—'
    out['last lead change at (median)'] = clock(float(np.median([b['lastLeadChangeAt'] for b in led]))) if led else '—'
    out['winner was behind ≥4 columns at some point'] = prop(sum(b['winnerMaxDeficit'] >= 4 for b in bs if b['winner']), sum(1 for b in bs if b['winner']))
    out['winner was behind ≥8 columns at some point'] = prop(sum(b['winnerMaxDeficit'] >= 8 for b in bs if b['winner']), sum(1 for b in bs if b['winner']))
    # heartcaps
    routs = [b for b in bs if b['by'] == 'rout']
    out['routs'] = f'{len(routs)}'
    out["loser's Heartcap first hit → dead (median)"] = fmt_med(med_ci([b['len'] - b['loserFirstHit'] for b in routs if b['loserFirstHit'] is not None]), lambda x: f'{x:.0f} s')
    out["loser's Heartcap ⅔ → dead (median)"] = fmt_med(med_ci([b['len'] - b['loserTwoThirds'] for b in routs if b['loserTwoThirds'] is not None]), lambda x: f'{x:.0f} s')
    out["loser's first building lost → dead (median)"] = fmt_med(med_ci([b['len'] - b['loserFirstBuildingLost'] for b in routs if b['loserFirstBuildingLost'] is not None]), lambda x: f'{x:.0f} s')
    afh = [b['loserAtFirstHit'] for b in routs if b['loserAtFirstHit']]
    if afh:
        out['loser at its first Heartcap hit: buildings / units / supply (median)'] = f"{np.median([a['buildings'] for a in afh]):.0f} / {np.median([a['units'] for a in afh]):.0f} / {np.median([a['supply'] for a in afh]):.0f} (winner's units {np.median([a['foeUnits'] for a in afh]):.0f}, supply {np.median([a['foeSupply'] for a in afh]):.0f})"
    won = [b for b in bs if b['winner']]
    out["winner's Heartcap untouched"] = prop(sum(b['winnerMinHp'] >= 1 for b in won), len(won))
    out["winner's Heartcap fell to ⅔ (comeback)"] = prop(sum(b['winnerMinHp'] <= 2 / 3 for b in won), len(won))
    out["winner's Heartcap fell to ⅓"] = prop(sum(b['winnerMinHp'] <= 1 / 3 for b in won), len(won))
    out['breach events per battle (mean)'] = num(np.mean([b['breaches'] for b in bs]), 2)
    return out


def run_table(rs):
    out = {}
    n = len(rs)
    out['runs'] = n
    out['reached the boss'] = prop(sum(r['reachedBoss'] for r in rs), n)
    out['won'] = prop(sum(r['outcome'] == 'victory' for r in rs), n)
    boss = [r for r in rs if r['reachedBoss']]
    out['boss fights won'] = prop(sum(r['outcome'] == 'victory' for r in boss), len(boss))
    for i in [1, 2, 3]:
        played = [r['battles'][i - 1] for r in rs if len(r['battles']) >= i]
        out[f'battle {i} lost (of played)'] = prop(sum(b['winner'] != 'player' for b in played), len(played))
    out['run ended in battle 1'] = prop(sum(r['outcome'] == 'defeat' and r['battleCount'] == 1 for r in rs), n)
    out['run ended by battle 2'] = prop(sum(r['outcome'] == 'defeat' and r['battleCount'] <= 2 for r in rs), n)
    out['battles per run (mean)'] = num(np.mean([r['battleCount'] for r in rs]), 2)
    out['battle minutes per run (mean)'] = num(np.mean([r['minutes'] for r in rs]), 1)
    out['battle minutes when boss reached (median)'] = num(np.median([r['minutes'] for r in boss]), 1) if boss else '—'
    b1 = [r['battles'][0] for r in rs]
    for g in sorted(set(b['general'] for b in b1)):
        gg = [b for b in b1 if b['general'] == g]
        out[f'battle 1 vs {g}: lost'] = prop(sum(b['winner'] != 'player' for b in gg), len(gg))
    allb = [b for r in rs for b in r['battles']]
    out['run battles: median length'] = clock(float(np.median([b['len'] for b in allb])))
    out['run battles: Decisions'] = prop(sum(b['by'] == 'decision' for b in allb), len(allb))
    led = [b for b in allb if b['firstLeader'] is not None]
    out['run battles: first side to lead wins'] = prop(sum(b['firstLeaderWon'] for b in led), len(led))
    out['run battles: ≥1 lead change'] = prop(sum(b['leadChanges'] >= 1 for b in allb), len(allb))
    out['run battles: winner behind ≥4 columns at some point'] = prop(sum(b['winnerMaxDeficit'] >= 4 for b in allb), len(allb))
    lost_nonfatal = [b for r in rs for b in r['battles'] if b['winner'] != 'player' and b['hpAfter'] > 0]
    out['battles lost without ending the run'] = f'{len(lost_nonfatal)}'
    hpw = [r['hp']['hp'] / r['hp']['max'] for r in rs if r['outcome'] == 'victory']
    out['winning runs at full Heartcap'] = prop(sum(h >= 1 for h in hpw), len(hpw))
    return out


def by_general(bs):
    rows = {}
    for g in ['general:scripted', 'general:mother-mold', 'general:lichen-baron', 'general:blightwright']:
        gg = [b for b in bs if b['enemy'] == g]
        if not gg:
            continue
        ff = [b['firstFlip'] if b['firstFlip'] is not None else float('inf') for b in gg]
        led = [b for b in gg if b['firstLeader'] is not None]
        routs = [b for b in gg if b['by'] == 'rout']
        rows[g.split(':')[1]] = {
            'win': f"{100*np.mean([b['winner']=='player' for b in gg]):.0f}%",
            'dec': f"{100*np.mean([b['by']=='decision' for b in gg]):.0f}%",
            'len': clock(float(np.median([b['len'] for b in gg]))),
            'flip': clock(float(np.median(ff))),
            'noflip3': f"{100*np.mean([x>180 for x in ff]):.0f}%",
            's60': f"{np.median([b['field']['60']['player']+b['field']['60']['enemy'] for b in gg]):.0f}",
            's120': f"{np.median([b['field']['120']['player']+b['field']['120']['enemy'] for b in gg if '120' in b['field']]):.0f}",
            's300': f"{np.median([b['field']['300']['player']+b['field']['300']['enemy'] for b in gg if '300' in b['field']]):.0f}",
            'lc': f"{np.mean([b['leadChanges'] for b in gg]):.2f}",
            'flw': f"{100*np.mean([b['firstLeaderWon'] for b in led]):.0f}%",
            'fall': f"{np.median([b['len']-b['loserFirstHit'] for b in routs if b['loserFirstHit'] is not None]):.0f} s" if routs else '—',
            'cpm': f"{np.median([b['cmds']/(b['len']/60) for b in gg]):.1f}",
        }
    return rows


if __name__ == '__main__':
    tables = {}
    for v in VARIANTS:
        bs, rs = load(v)
        if not bs:
            continue
        tables[v] = {'battles': battle_table(bs, v), 'runs': run_table(rs) if rs else {}, 'byGeneral': by_general(bs)}
    vs = list(tables)
    keys = list(next(iter(tables.values()))['battles'].keys())
    print('| Single battles | ' + ' | '.join(vs) + ' |')
    print('|---|' + '---|' * len(vs))
    for k in keys:
        print(f'| {k} | ' + ' | '.join(str(tables[v]['battles'].get(k, '—')) for v in vs) + ' |')
    print()
    rkeys = []
    for v in vs:
        for k in tables[v]['runs']:
            if k not in rkeys:
                rkeys.append(k)
    print('| Runs | ' + ' | '.join(vs) + ' |')
    print('|---|' + '---|' * len(vs))
    for k in rkeys:
        print(f'| {k} | ' + ' | '.join(str(tables[v]['runs'].get(k, '—')) for v in vs) + ' |')
    print()
    print('| Variant | General | Player win | Decisions | Median | First flip | No flip by 3:00 | Supply 1:00 / 2:00 / 5:00 | Lead changes | First leader wins | First hit → dead | Bot cmds/min |')
    print('|---|---|---|---|---|---|---|---|---|---|---|---|')
    for v in vs:
        for g, r in tables[v]['byGeneral'].items():
            print(f"| {v} | {g} | {r['win']} | {r['dec']} | {r['len']} | {r['flip']} | {r['noflip3']} | {r['s60']} / {r['s120']} / {r['s300']} | {r['lc']} | {r['flw']} | {r['fall']} | {r['cpm']} |")
    json.dump(tables, open(os.path.dirname(D) + '/tables.json', 'w'), indent=1, default=str)
