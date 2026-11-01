import json, os, sys, collections, statistics as st
D=os.path.normpath(os.path.dirname(os.path.abspath(__file__))+'/../../../../../reports/after-the-rework/lives')
for lab in sys.argv[1:]:
    runs=[];bats=[]
    for c in ['vesper','armilla','cordis']:
        j=json.load(open(f'{D}/{lab}-{c}.json')); 
        for r in j['runs']: r['c']=c
        for b in j['battles']: b['c']=c
        runs+=j['runs']; bats+=j['battles']
    byidx=collections.defaultdict(lambda:[0,0])
    for b in bats:
        if b['kind']=='boss': continue
        byidx[b['index']][0]+=1; byidx[b['index']][1]+= b['winner']!='player'
    defeats=[r for r in runs if r['outcome']=='defeat']
    bossdef=0
    for r in defeats:
        last=[b for b in bats if b['seed']==r['seed'] and b['c']==r['c']][-1]
        bossdef+= last['kind']=='boss'
    b1lost_then_won=0; b1lost=0
    for r in runs:
        bs=[b for b in bats if b['seed']==r['seed'] and b['c']==r['c']]
        if bs and bs[0]['winner']!='player':
            b1lost+=1; b1lost_then_won+= r['outcome']=='victory'
    winhp=[r['hp']/r['max'] for r in runs if r['outcome']=='victory']
    elite=[b for b in bats if b['kind']=='elite']; reg=[b for b in bats if b['kind']=='battle' and b['index']>=2]
    print(f"{lab}: non-boss loss rate by battle index", {k:f"{v[1]}/{v[0]} {100*v[1]/v[0]:.0f}%" for k,v in sorted(byidx.items())})
    print(f"   defeats {len(defeats)}, at the boss {bossdef} ({100*bossdef/max(1,len(defeats)):.0f}%) | lost battle 1 then won the run {b1lost_then_won}/{b1lost} | winners' final HP median {st.median(winhp) if winhp else 0:.2f}")
    print(f"   elite lost {sum(b['winner']!='player' for b in elite)}/{len(elite)} vs battle(2+) lost {sum(b['winner']!='player' for b in reg)}/{len(reg)}")
