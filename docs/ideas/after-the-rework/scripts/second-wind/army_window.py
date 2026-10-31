import json, sys, statistics as S
base, variant = sys.argv[1], sys.argv[2]
for ratio in (0.5, 0.4, 0.33):
  for hold in (2, 3):
    lt=[]; n=0; lfire=0; wfire=0; wfire_first=0; lbld=[]; lbank=[]
    for c in ('vesper','armilla','cordis'):
        d = json.load(open(f'{base}/ts-{variant}-{c}.json')); ix={k:i for i,k in enumerate(d['cols'])}
        for b in d['battles']:
            if b['by']!='rout': continue
            n+=1; L=b['len']; w=b['winner']
            def fire(me, op):
                run=0
                for row in b['ts']:
                    t=row[ix['t']]
                    if t<60: continue
                    m=row[ix['field'+me]]; o=row[ix['field'+op]]
                    if o>=10 and m <= ratio*o: run+=1
                    else: run=0
                    if run>=hold: return t, row
                return None, None
            L_, W_ = ('E','P') if w=='player' else ('P','E')
            t,row=fire(L_,W_)
            tw,_=fire(W_,L_)
            if t is not None:
                lfire+=1; lt.append(L-t); lbld.append(row[ix['bld'+L_]]); lbank.append(row[ix['gold'+L_]])
            if tw is not None:
                wfire+=1
                if t is None or tw<t: wfire_first+=1
    q=lambda xs:(round(S.median(xs)),round(S.quantiles(xs,n=4)[0]),round(S.quantiles(xs,n=4)[2])) if len(xs)>3 else None
    print(f'{variant} field<= {ratio} x opp for {hold*10}s (opp>=10): routs {n}; loser fires {lfire/n:.0%}, s before end {q(lt)}, loser buildings then {q(lbld)}, bank {q(lbank)}; winner fires {wfire/n:.0%} (first {wfire_first/n:.0%})')
