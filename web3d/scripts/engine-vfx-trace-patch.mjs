import {readFileSync,writeFileSync} from 'node:fs';
export function applyVfxTracePatch(file,source){
 if(file!=='interp')return source;
 const put=(a,b)=>{if(!source.includes(a))throw Error('VFX trace context missing: '+a);source=source.replace(a,b)};
 put('for (const u of tg) s.redir[u] = true;', 'for (const u of tg) { s.redir[u] = true; TR({t:"vfx",effect:"redirect",u,src:d.unit,amt:1,sec:s.sec}); }');
 put('b.start += c.n; stat(s,', 'b.start += c.n; TR({t:"vfx",effect:"postpone",u:b.unit,src:d.unit,amt:c.n,end:b.start,sec:s.sec}); stat(s,');
 put('s.sh[u] = 0; s.redir[u] = false;', 'TR({t:"vfx",effect:"strip",u,src:d.unit,amt:had?1:0,sec:s.sec}); s.sh[u] = 0; s.redir[u] = false;');
 put('const yes = c.judge === "exist" ? cnt > thr(c.q) : cnt === 0;', 'const yes = c.judge === "exist" ? cnt > thr(c.q) : cnt === 0; TR({t:"vfx",effect:"condition",u:d.unit,src:d.unit,amt:yes?1:0,sec:s.sec});');
 put('if (cand) { s.stand = s.stand.filter((x) => x !== cand);', 'if (cand) { TR({t:"vfx",effect:"remove",u:cand.unit,src:d.unit,amt:1,sec:s.sec}); s.stand = s.stand.filter((x) => x !== cand);');
 put('const n = s.sts.filter((x) => sideOf(x.unit) === me).length;', 'for(const x of s.sts.filter(x=>sideOf(x.unit)===me)) TR({t:"vfx",effect:"cleanse",u:x.unit,src:d.unit,amt:1,sec:s.sec}); const n = s.sts.filter((x) => sideOf(x.unit) === me).length;');
 put('const c = st.c; if (c.k !== "delay") return;', 'const c = st.c; if (c.k !== "delay") return; TR({t:"vfx",effect:"cash",u:st.unit,src:st.unit,amt:1,sec:s.sec});');
 put('stat(s, `s${sideOf(u)}:redirect`, amt);','TR({t:"vfx",effect:"reflect",u:r.actor,src:u,amt,sec:s.sec}); stat(s, `s${sideOf(u)}:redirect`, amt);');
 put('stat(s, `s${sideOf(u)}:ignored`); continue;', 'TR({t:"vfx",effect:"nullify",u,src:u,amt:1,sec:s.sec}); stat(s, `s${sideOf(u)}:ignored`); continue;');
 put("  let base = amount(s, e.n, r.ctx);",'  let base = amount(s, e.n, r.ctx); if(typeof e.n !== "number") TR({t:"vfx",effect:"quote",u:r.actor,src:r.actor,amt:base,sec:s.sec}); if(e.ignore) TR({t:"vfx",effect:"pierce",u:r.actor,src:r.actor,amt:base,sec:s.sec});');
 return source;
}
if(process.argv.includes('--install')){const p='src/duanju/engine/interp.ts';writeFileSync(p,applyVfxTracePatch('interp',readFileSync(p,'utf8')))}
