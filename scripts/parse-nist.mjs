import fs from 'node:fs';
const SYM = ['H','He','Li','Be','B','C','N','O','F','Ne','Na','Mg','Al','Si','P','S','Cl','Ar','K','Ca','Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn','Ga','Ge','As','Se','Br','Kr','Rb','Sr','Y','Zr','Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn','Sb','Te','I','Xe','Cs','Ba','La','Ce','Pr','Nd','Pm','Sm','Eu','Gd','Tb','Dy','Ho','Er','Tm','Yb','Lu','Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg','Tl','Pb','Bi','Po','At','Rn','Fr','Ra','Ac','Th','Pa','U','Np','Pu','Am','Cm','Bk','Cf','Es','Fm','Md','No','Lr','Rf','Db','Sg','Bh','Hs','Mt','Ds','Rg','Cn','Nh','Fl','Mc','Lv','Ts','Og'];
const clean = (s) => s.replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const num = (s) => { const t = clean(s).replace(/\([^)]*\)/g, '').replace(/[^0-9.]/g, ''); return t === '' ? null : parseFloat(t); };
const out = {};
for (let i = 0; i < 118; i++) {
  const z = i + 1;
  const html = fs.readFileSync(`/tmp/nist/${z}.html`, 'utf8');
  const body = html.slice(html.indexOf('<tbody>'));
  const rows = [];
  let stdWeight = null;
  for (const row of body.split(/<tr[^>]*>/)) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => clean(m[1]));
    for (let c = 0; c + 1 < cells.length; c++) {
      if (/^\d+$/.test(cells[c]) && /^\d+\.\d+/.test(cells[c + 1])) {
        const A = parseInt(cells[c], 10);
        const mass = num(cells[c + 1]);
        const comp = cells[c + 2] !== undefined ? num(cells[c + 2]) : null;
        if (stdWeight === null && c + 3 < cells.length && /^\(?[\d\.\[\], ]+\)?/.test(clean(cells[c + 3])) && /[A-Z]/.test(cells[c + 1]) === false) {
          const w = cells[c + 3];
          if (/^\(?\d+\.\d+/.test(w) || /^\[/.test(w)) stdWeight = clean(w);
        }
        rows.push({ A, mass, abundance: comp });
        break;
      }
    }
  }
  const seen = new Set();
  const isotopes = rows.filter((x) => !seen.has(x.A) && seen.add(x.A));
  out[z] = { symbol: SYM[i], stdWeight, isotopes };
}
fs.writeFileSync('scripts/data/nist-isotopes.json', JSON.stringify(out, null, 1));
fs.writeFileSync('/tmp/nist-isotopes.json', JSON.stringify(out, null, 1));
// report
const empty = [], sums = [];
for (let z = 1; z <= 118; z++) {
  const d = out[z];
  const withAb = d.isotopes.filter((i) => i.comp !== null);
  const s = withAb.reduce((a, b) => a + b.comp, 0);
  if (!d.isotopes.length) empty.push(z + ' ' + d.symbol);
  else if (Math.abs(s - 1) > 0.002 && Math.abs(s - 100) > 0.2) sums.push(`${z} ${d.symbol} sum=${s.toFixed(4)} n=${withAb.length}/${d.isotopes.length}`);
}
console.log('EMPTY:', empty.join(', ') || 'none');
console.log('SUSPECT SUMS:', sums.join(' | ') || 'none');
for (const z of [1, 2, 26, 43, 61, 84, 85, 86, 87, 88, 89, 93, 104, 109, 113, 117, 118]) console.log(z, JSON.stringify(out[z]));
