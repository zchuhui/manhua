import fs from 'node:fs';
const BASE = 'D:\\projects\\manhua';
const cache = {};
export function chapters(seg) {
  if (cache[seg]) return cache[seg];
  const p = BASE + '\\work\\segments\\seg_' + String(seg).padStart(2,'0') + '.txt';
  const txt = fs.readFileSync(p, 'utf8');
  const re = /^第(\d+)章 [^\n]*$/gm;
  const marks = []; let m;
  while ((m = re.exec(txt))) marks.push({ idx: m.index, title: m[0], n: +m[1] });
  const arr = marks.map((mk,i)=>({ n: mk.n, title: mk.title, body: txt.slice(mk.idx + mk.title.length, i+1<marks.length?marks[i+1].idx:txt.length) }));
  cache[seg] = arr;
  return arr;
}
const TITLE_STOP = /[第章一二三四五六七八九十零百千万（）()？?！!、，,\s]/g;
export function condense(seg, from, to) {
  const arr = chapters(seg).filter(c=>c.n>=from && c.n<=to);
  const out = [];
  for (const c of arr) {
    const paras = c.body.split('\n').map(s=>s.trim()).filter(Boolean);
    const full = paras.join('');
    const head = full.slice(0,130);
    const tail = full.slice(-130);
    const key = c.title.replace(TITLE_STOP,'');
    let mid = '';
    if (key.length >= 2) {
      const cands = [];
      for (let i=0;i<paras.length;i++){
        const pos = paras.slice(0,i).join('').length;
        const frac = pos / Math.max(1, full.length);
        if (frac > 0.15 && frac < 0.85 && paras[i] && paras[i].includes(key.slice(0,3))) cands.push(i);
      }
      if (cands.length) {
        const i = cands[Math.min(cands.length-1, Math.floor(cands.length/2))];
        mid = '[中]' + paras[i].slice(0,110);
      }
    }
    if (!mid) {
      let acc = 0, bi = 0;
      for (let i=0;i<paras.length;i++){ acc += paras[i].length; if (acc >= full.length*0.5){ bi=i; break; } }
      mid = '[中]' + (paras[bi]||'').slice(0,110);
    }
    out.push('== ' + c.title + ' ==\n[头]' + head + '\n' + mid + '\n[尾]' + tail);
  }
  return out.join('\n');
}
export function full(seg, nums) {
  const arr = chapters(seg).filter(c=>nums.includes(c.n));
  return arr.map(c=>'===== ' + c.title + ' =====\n' + c.body.replace(/\n\s*\n/g,'\n').trim()).join('\n\n');
}
export function excerpt(seg, n, pct, len) {
  const c = chapters(seg).find(c=>c.n===n);
  const fullt = c.body.replace(/\s+/g,'');
  const st = Math.max(0, Math.floor(fullt.length * pct) - Math.floor(len/2));
  return '== ' + c.title + ' @' + pct + ' ==\n' + fullt.slice(st, st+len);
}
