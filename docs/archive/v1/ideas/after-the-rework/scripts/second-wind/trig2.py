import json, statistics as S
rows = []
for c in ('vesper','armilla','cordis'):
    d = json.load(open(f'reports/after-the-rework/second-wind/used-{c}.json')); ix = {k:i for i,k in enumerate(d['cols'])}
    for b in d['battles']: rows.append((b, ix))
def q(xs):
    qs = S.quantiles(xs, n=4); return (round(S.median(xs)), round(qs[0]), round(qs[2]))
for hold in (2,3):
    lt=[]; n=0; wf=0
    for b, ix in rows:
        if b['by']!='rout': continue
        n+=1; w=b['winner']; L_,W_=('E','P') if w=='player' else ('P','E')
        def fire(me,op):
            run=0
            for row in b['ts']:
                t=row[ix['t']]
                if t%10: continue
                if t<60: continue
                m=row[ix['field'+me]]; o=row[ix['field'+op]]
                run = run+1 if (o>=10 and m<=0.5*o) else 0
                if run>=hold: return t
            return None
        t=fire(L_,W_); tw=fire(W_,L_)
        if t is not None: lt.append(b['len']-t)
        if tw is not None: wf+=1
    print(f'proposer method (10 s samples, {hold} consecutive = {(hold-1)*10} s sustained): s before end {q(lt)}; winner fires {wf/n:.0%}')
