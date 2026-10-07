import fs from 'node:fs';
import assert from 'node:assert/strict';
const base='public/duanju/story/';
const c=JSON.parse(fs.readFileSync(base+'curriculum.json','utf8'));
const d=JSON.parse(fs.readFileSync(base+'dialog.json','utf8'));
const p=JSON.parse(fs.readFileSync(base+'panels.json','utf8'));
assert.equal(c.beats.length,14);assert.equal(d.length,14);
assert.equal(new Set(p.panels.filter(x=>x.level===0).map(x=>x.page)).size,4);
for(const x of p.panels){assert(fs.existsSync(base+'panels/'+x.image),'Missing '+x.image);assert(x.lines.every(l=>l.text.length>0&&l.text.length<=100));}
for(let n=1;n<=14;n++)for(const when of ['pre','post'])assert.equal(p.panels.filter(x=>x.level===n&&x.when===when).length,4);
for(const b of c.beats){assert(p.panels.some(x=>x.level===b.beat&&x.when==='pre'));assert(p.panels.some(x=>x.level===b.beat&&x.when==='post'));assert(b.foeNames.every(x=>!['叶晴','阿豆','童乔','老蔡'].includes(x)));}
assert(!p.assets);assert(p.panels.every(x=>!x.pop&&!x.sfxText&&!x.blocks.length));
const reference=JSON.parse(fs.readFileSync('../art/story-v2/layout-reference.json','utf8'));
for(const original of reference.frames){
 const actual=p.panels.find(x=>x.level===original.level&&x.when===original.when&&x.page===original.page&&x.slot===original.slot);
 assert(actual);
 for(const key of ['layout','slot','ratio','polygon','z','safe','camera'])assert.deepEqual(actual[key],original[key],`Storyboard changed: ${actual.id} ${key}`);
 assert(actual.image.startsWith(`v2-L${actual.level}-`),'Missing individually cropped shot');
}
console.log('All 112 main-story frames retain original geometry, order and camera');
assert.deepEqual(c.beats[0].meNames,['叶栖','叶晴','侦察机']);assert.deepEqual(c.beats[1].meNames,['叶栖','老蔡','童乔']);
const beforeReveal=JSON.stringify(p.panels.filter(x=>x.level<15));
for(const leak of ['亲手杀','真实战场','死亡时间','你们早就知道','公司伪造'])assert(!beforeReveal.includes(leak),'Early reveal: '+leak);
const after=JSON.stringify(p.panels.filter(x=>x.level===15));assert(after.includes('叶栖快回来了'));assert(after.includes('没有回复'));assert(!after.includes('做公司的狗'));
console.log('Story assets, 14 beats, 4 background pages, text lengths and spoiler boundaries OK');
for(const name of ['ye_qing','a_dou','lao_cai','tong_qiao'])for(const suffix of ['','_masked']){
 const path='public/duanju/art/story_'+name+suffix+'/rig/';const rig=JSON.parse(fs.readFileSync(path+'rig.json','utf8'));
 assert.equal(Object.keys(rig.parts).length,16);assert(fs.existsSync(path+'atlas.png'));for(const part of Object.values(rig.parts))assert(rig.bones[part.bone]);
}
assert(c.beats.slice(0,2).every(b=>b.meArt[0]==='ye_qi'&&b.meArt.every(a=>!a.includes('_masked'))));
assert.deepEqual(c.beats[10].foeArt,['story_ye_qing_masked','story_a_dou_masked','mask']);
console.log('Eight character rig variants, 16 parts each; protagonist and early allies unmasked OK');
