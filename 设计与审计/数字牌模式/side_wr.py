import sys, nc_sim2 as S
over=dict(x.split("=",1) for x in sys.argv[3:])
cfg,res,_=S.run(int(sys.argv[1]),int(sys.argv[2]),over)
d=[r for r in res if r["winner"]>=0]
print("side0 胜 %.1f%% (%d局)"%(100*sum(r["winner"]==0 for r in d)/len(d),len(d)))
