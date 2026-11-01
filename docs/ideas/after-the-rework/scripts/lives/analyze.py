import json, glob, os, statistics as st, collections, sys
D = os.path.normpath(os.path.dirname(os.path.abspath(__file__)) + '/../../../../../reports/after-the-rework/lives')
labels = sys.argv[1:] or sorted({os.path.basename(f).split('-')[0] for f in glob.glob(D + '/v*-*.json')})
def pct(a, b): return f"{100*a/b:.0f}%" if b else '-'
for lab in labels:
    runs, bats, groves, per = [], [], [], {}
    proto = sched = None
    for c in ['vesper', 'armilla', 'cordis']:
        p = f"{D}/{lab}-{c}.json"
        if not os.path.exists(p): continue
        j = json.load(open(p)); proto, sched = j['proto'], j['sched']
        runs += j['runs']; bats += j['battles']; groves += j['groves']
        rw = sum(r['outcome'] == 'victory' for r in j['runs'])
        b1 = [b for b in j['battles'] if b['index'] == 1]
        b1l = sum(b['winner'] != 'player' for b in b1)
        end1 = sum(r['outcome'] == 'defeat' and r['battles'] == 1 for r in j['runs'])
        per[c] = (len(j['runs']), rw, b1l, end1)
    n = len(runs)
    if not n: continue
    won = sum(r['outcome'] == 'victory' for r in runs)
    boss = [b for b in bats if b['kind'] == 'boss']
    bossw = sum(b['winner'] == 'player' for b in boss)
    b1 = [b for b in bats if b['index'] == 1]; b1l = sum(b['winner'] != 'player' for b in b1)
    end1 = sum(r['outcome'] == 'defeat' and r['battles'] == 1 for r in runs)
    mins = [r['ticks'] / 20 / 60 for r in runs]
    wonmins = [r['ticks'] / 20 / 60 for r in runs if r['outcome'] == 'victory']
    bpr = st.mean(r['battles'] for r in runs)
    absorbed = sum(1 for b in bats if b['winner'] != 'player' and b['kind'] != 'boss' and b['hpAfter'] > 0)
    deaths = collections.Counter(r['battles'] for r in runs if r['outcome'] == 'defeat')
    deathkind = collections.Counter('boss' if any(b['seed']==r['seed'] and b['kind']=='boss' for b in []) else '' for r in runs)
    bossin = [r['bossHpIn'] for r in runs if r['bossHpIn'] >= 0]
    bossin_low = sum(x < 0.5 for x in bossin)
    # boss win rate split by entry HP
    seedkey = lambda b: (b['seed'], b['hpMax'])
    rep = sum(g == 'repair' for g in groves)
    hurt_start = sum(b['hpBefore'] < b['hpMax'] for b in bats)
    # losses that were near misses: enemy Heartcap ever below 2/3 in a lost battle
    lost = [b for b in bats if b['winner'] != 'player']
    near = sum(b['minEnemy'] < 0.67 for b in lost)
    print(f"== {lab}: {proto} lives={sched}  n={n}")
    print(f"  runs won {pct(won,n)} | reached boss {pct(len(boss),n)} | boss won {bossw}/{len(boss)} {pct(bossw,len(boss))} | battle1 lost {pct(b1l,len(b1))} | run over in b1 {pct(end1,n)}")
    print(f"  battles/run {bpr:.2f} | battle min/run mean {st.mean(mins):.1f} | won-run battle min median {st.median(wonmins) if wonmins else 0:.1f}")
    print(f"  losses survived {absorbed} ({absorbed/n:.2f}/run) | run deaths by battles played {dict(sorted(deaths.items()))}")
    if bossin: print(f"  HP entering boss: median {st.median(bossin):.2f}, <50%: {pct(bossin_low,len(bossin))}, full: {pct(sum(x>=0.999 for x in bossin),len(bossin))}")
    print(f"  groves repair {rep}/{len(groves)} | battles starting hurt {pct(hurt_start,len(bats))} | lost battles where enemy HC fell below 2/3: {near}/{len(lost)}")
    print("  per commander (runs, won, b1 lost, ended b1):", {c: (v[0], pct(v[1],v[0]), pct(v[2],v[0]), pct(v[3],v[0])) for c, v in per.items()})
