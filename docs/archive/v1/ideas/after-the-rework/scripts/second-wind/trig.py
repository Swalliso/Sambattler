import json, statistics as S
rows = []
for c in ('vesper','armilla','cordis'):
    d = json.load(open(f'reports/after-the-rework/second-wind/used-{c}.json')); ix = {k:i for i,k in enumerate(d['cols'])}
    for b in d['battles']: rows.append((b, ix))
def q(xs): 
    if len(xs) < 4: return None
    qs = S.quantiles(xs, n=4); return (round(S.median(xs)), round(qs[0]), round(qs[2]))
for key in ('field','used'):
  for ratio in (0.5, 0.4):
    n=0; lf=0; wf=0; lt=[]; lb=[]; lg=[]; clock=[]; dec_fire=0; dec_n=0
    for b, ix in rows:
        w = b['winner']; 
        if w is None: continue
        L_, W_ = ('E','P') if w=='player' else ('P','E')
        def fire(me, op):
            run_start=None
            for row in b['ts']:
                t=row[ix['t']]
                if t<60: run_start=None; continue
                m=row[ix[key+me]]; o=row[ix[key+op]]
                if o>=10 and m <= ratio*o:
                    if run_start is None: run_start=t
                    if t-run_start>=20: return t,row
                else: run_start=None
            return None,None
        t,row=fire(L_,W_); tw,_=fire(W_,L_)
        if b['by']=='decision':
            dec_n+=1
            if t is not None or tw is not None: dec_fire+=1
            continue
        n+=1
        if t is not None:
            lf+=1; lt.append(b['len']-t); lb.append(row[ix['bld'+L_]]); lg.append(row[ix['gold'+L_]]); clock.append(t)
        if tw is not None: wf+=1
    print(f'{key} <= {ratio}x for 20s: routs {n}, loser fires {lf/n:.0%}, s before end {q(lt)}, clock {q(clock)}, loser bld {q(lb)}, bank {q(lg)}; winner fires {wf/n:.0%}; decisions {dec_n} with any fire {dec_fire}')
# stored share
import itertools
sh=[]
for b, ix in rows:
    for row in b['ts']:
        if row[ix['t']]>=120:
            for s in 'PE':
                u=row[ix['used'+s]]; f=row[ix['field'+s]]
                if u>0: sh.append((u-f)/u)
print('stored share of supplyUsed after 2:00, median/IQR', q([x*100 for x in sh]))
