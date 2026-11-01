import json, sys, statistics as S
base = sys.argv[1]
variant = sys.argv[2]
res = {}
for frac in (0.8, 0.7, 0.6, 0.5, 0.4):
    lead_loser = []; winner_trig = 0; loser_trig = 0; n = 0; loser_bank = []; loser_field=[]; winner_field=[]
    for c in ('vesper','armilla','cordis'):
        d = json.load(open(f'{base}/ts-{variant}-{c}.json'))
        cols = d['cols']; ix = {k:i for i,k in enumerate(cols)}
        for b in d['battles']:
            if b['by'] != 'rout': continue
            n += 1
            ts = b['ts']; L = b['len']
            w = b['winner']
            lk, wk = ('bldE','bldP') if w=='player' else ('bldP','bldE')
            lg = 'goldE' if w=='player' else 'goldP'
            lf, wf = ('fieldE','fieldP') if w=='player' else ('fieldP','fieldE')
            def trig(key):
                peak = 0
                for row in ts:
                    v = row[ix[key]]; peak = max(peak, v)
                    if peak >= 3 and v <= frac*peak:
                        return row[ix['t']], row
                return None, None
            t, row = trig(lk)
            if t is not None:
                loser_trig += 1; lead_loser.append(L - t); loser_bank.append(row[ix[lg]]); loser_field.append(row[ix[lf]]); winner_field.append(row[ix[wf]])
            tw, _ = trig(wk)
            if tw is not None: winner_trig += 1
    q = lambda xs: (round(S.median(xs)), round(S.quantiles(xs,n=4)[0]), round(S.quantiles(xs,n=4)[2])) if xs else None
    print(f'{variant} frac<={frac}: routs {n}; loser triggers {loser_trig} ({loser_trig/n:.0%}), winner triggers {winner_trig} ({winner_trig/n:.0%}); s before end median/IQR {q(lead_loser)}; loser bank {q(loser_bank)}; field loser/winner {q(loser_field)} / {q(winner_field)}')
