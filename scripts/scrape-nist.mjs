// Scrape NIST isotope compositions for all 118 elements.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const SYM = ['H','He','Li','Be','B','C','N','O','F','Ne','Na','Mg','Al','Si','P','S','Cl','Ar','K','Ca','Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn','Ga','Ge','As','Se','Br','Kr','Rb','Sr','Y','Zr','Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn','Sb','Te','I','Xe','Cs','Ba','La','Ce','Pr','Nd','Pm','Sm','Eu','Gd','Tb','Dy','Ho','Er','Tm','Yb','Lu','Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg','Tl','Pb','Bi','Po','At','Rn','Fr','Ra','Ac','Th','Pa','U','Np','Pu','Am','Cm','Bk','Cf','Es','Fm','Md','No','Lr','Rf','Db','Sg','Bh','Hs','Mt','Ds','Rg','Cn','Nh','Fl','Mc','Lv','Ts','Og'];
if (SYM.length !== 118) throw new Error('sym count ' + SYM.length);

const out = {};
const dir = '/tmp/nist';
fs.mkdirSync(dir, { recursive: true });

const clean = (s) => s.replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

for (let i = 0; i < 118; i++) {
  const file = `${dir}/${i + 1}.html`;
  let html = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (!html) {
    const url = `https://physics.nist.gov/cgi-bin/Compositions/stand_alone.pl?ele=${SYM[i]}&ascii=html&isotype=some`;
    html = execFileSync('curl', ['-sS', '-m', '40', '--retry', '2', url], { maxBuffer: 1 << 24 }).toString();
    fs.writeFileSync(file, html);
  }
  const body = html.slice(html.indexOf('<tbody>'));
  const rows = body.split(/<tr[^>]*>/);
  const isotopes = [];
  let stdWeight = null;
  for (const row of rows) {
    const wm = row.match(/<td\s*>&nbsp;&nbsp;\s*([^<]*?)\s*<\/td>/);
    if (wm && !stdWeight) {
      const v = clean(wm[1]);
      if (/^[\[\(]?[\d\.]+/.test(v)) stdWeight = v;
    }
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => clean(m[1]));
    if (cells.length >= 2 && /^\d+$/.test(cells[0]) && /^\d/.test(cells[1]) && cells[1].includes('.')) {
      const mass = parseFloat(cells[1].replace(/[^0-9.].*$/, ''));
      const ab = cells[2] ? parseFloat(cells[2].replace(/[^0-9.].*$/, '')) : null;
      isotopes.push({ A: parseInt(cells[0], 10), mass, abundance: ab });
    }
  }
  out[i + 1] = { symbol: SYM[i], stdWeight, isotopes };
  if (!isotopes.length) console.error('no isotopes:', SYM[i]);
}
fs.writeFileSync('/tmp/nist-isotopes.json', JSON.stringify(out, null, 1));
console.log('elements:', Object.keys(out).length);
for (const z of [1, 19, 26, 43, 61, 92, 118]) console.log(z, JSON.stringify(out[z]).slice(0, 500));
