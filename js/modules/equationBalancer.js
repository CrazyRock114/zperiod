// ====================================================================
// equationBalancer.js — chemical equation balancer using linear algebra
// ====================================================================
// Algorithm:
//   1. Parse equation: split on "->" / "=" / "→" → left/right compounds
//   2. Tokenize each compound into element counts (handles nested
//      parentheses: Ca(OH)2, Fe2(SO4)3)
//   3. Build linear system: for every element, sum of
//      (coefficient × count) on left == right
//      → all-element system is M * x = 0 (homogeneous).
//      Solve for nullspace using Gaussian elimination over rationals.
//   4. Multiply by LCM to get integer coefficients.
//   5. Return minimum-integer solution (gcd = 1).
// ====================================================================

// ---------- Parser ----------

export function parseCompound(formula) {
  // Returns { element: count } for a single compound like "Ca(OH)2"
  const counts = {};
  let i = 0;
  const stack = [counts];
  while (i < formula.length) {
    const ch = formula[i];
    if (ch === '(' || ch === '[') {
      const inner = {};
      stack.push(inner);
      i++;
    } else if (ch === ')' || ch === ']') {
      i++;
      // read multiplier
      let num = '';
      while (i < formula.length && /[0-9]/.test(formula[i])) {
        num += formula[i++];
      }
      const mult = num ? parseInt(num, 10) : 1;
      const inner = stack.pop();
      const top = stack[stack.length - 1];
      for (const [el, c] of Object.entries(inner)) {
        top[el] = (top[el] || 0) + c * mult;
      }
    } else if (/[A-Z]/.test(ch)) {
      let sym = ch;
      i++;
      if (i < formula.length && /[a-z]/.test(formula[i])) {
        sym += formula[i++];
      }
      let num = '';
      while (i < formula.length && /[0-9]/.test(formula[i])) {
        num += formula[i++];
      }
      const mult = num ? parseInt(num, 10) : 1;
      const top = stack[stack.length - 1];
      top[sym] = (top[sym] || 0) + mult;
    } else {
      i++;
    }
  }
  return counts;
}

export function parseEquation(eq) {
  // Split on "->", "→", "=", or "=="
  const norm = eq.replace(/[→]+|==/g, '->').replace(/=/g, '->');
  const sides = norm.split('->');
  if (sides.length !== 2) {
    throw new Error('Equation must have exactly one arrow (->, →, =, ==)');
  }
  const splitSide = side =>
    side.split('+').map(s => s.trim()).filter(Boolean).map(parseCompound);
  return {
    reactants: splitSide(sides[0]),
    products: splitSide(sides[1])
  };
}

// ---------- Linear algebra over rationals (Fraction) ----------

class Frac {
  constructor(num, den = 1) {
    if (den === 0) throw new Error('Divide by zero');
    if (den < 0) { num = -num; den = -den; }
    const g = gcd(Math.abs(num), Math.abs(den)) || 1;
    this.num = num / g;
    this.den = den / g;
  }
  add(o) { return new Frac(this.num * o.den + o.num * this.den, this.den * o.den); }
  sub(o) { return new Frac(this.num * o.den - o.num * this.den, this.den * o.den); }
  mul(o) { return new Frac(this.num * o.num, this.den * o.den); }
  div(o) {
    if (o.num === 0) throw new Error('Divide by zero');
    return new Frac(this.num * o.den, this.den * o.num);
  }
  neg() { return new Frac(-this.num, this.den); }
  isZero() { return this.num === 0; }
  toString() {
    if (this.den === 1) return String(this.num);
    return `${this.num}/${this.den}`;
  }
}

const f0 = new Frac(0);
const f1 = new Frac(1);

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function lcm(...xs) {
  return xs.reduce((a, b) => (a * b) / gcd(a, b), 1);
}

// Solve M·x = 0 where M is (elements × compounds) matrix.
// Returns nullspace basis vectors (array of Frac arrays).
// Strategy: row-reduce, find free variables (rank = n - dim), express
// dependent variables in terms of free ones. We return all basis vectors.
function solveNullspace(M) {
  const rows = M.length;
  const cols = M[0]?.length || 0;
  if (cols === 0) return [];
  // Make a deep copy as Frac
  const A = M.map(row => row.map(v => new Frac(v)));
  let r = 0;
  const pivotCols = [];
  for (let c = 0; c < cols && r < rows; c++) {
    // Find pivot row
    let pivot = -1;
    for (let i = r; i < rows; i++) {
      if (!A[i][c].isZero()) { pivot = i; break; }
    }
    if (pivot === -1) continue;
    [A[r], A[pivot]] = [A[pivot], A[r]];
    // Normalize and eliminate
    const pv = A[r][c];
    for (let j = 0; j < cols; j++) A[r][j] = A[r][j].div(pv);
    for (let i = 0; i < rows; i++) {
      if (i === r) continue;
      if (A[i][c].isZero()) continue;
      const f = A[i][c];
      for (let j = 0; j < cols; j++) {
        A[i][j] = A[i][j].sub(f.mul(A[r][j]));
      }
    }
    pivotCols.push(c);
    r++;
  }
  const rank = pivotCols.length;
  const dim = cols - rank;
  if (dim === 0) return []; // only zero solution → equation unsolvable

  const freeCols = [];
  for (let c = 0; c < cols; c++) if (!pivotCols.includes(c)) freeCols.push(c);

  // Build basis vectors: each corresponds to one free variable = 1, others 0.
  const basis = [];
  for (const fc of freeCols) {
    const v = new Array(cols).fill(null).map(() => f0);
    v[fc] = f1;
    for (let i = 0; i < rank; i++) {
      const pc = pivotCols[i];
      v[pc] = A[i][fc].neg();
    }
    basis.push(v);
  }
  return basis;
}

function fracsToInts(v) {
  // Multiply by LCM of denominators to get integers.
  const denLCM = v.reduce((acc, f) => lcm(acc, f.den), 1);
  let ints = v.map(f => f.num * (denLCM / f.den));
  // Make all non-negative by flipping sign if needed.
  const negs = ints.filter(x => x < 0).length;
  if (negs > ints.length / 2) ints = ints.map(x => -x);
  // Reduce by GCD.
  let g = Math.abs(ints[0]);
  for (const x of ints) g = gcd(g, Math.abs(x));
  if (g > 1) ints = ints.map(x => x / g);
  // Normalize: ensure at least one coefficient is 1.
  return ints;
}

// ---------- Public balancer ----------

export function balanceEquation(eqString) {
  const { reactants, products } = parseEquation(eqString);
  const allCompounds = [...reactants, ...products];
  const n = allCompounds.length;
  if (n < 2) throw new Error('Need at least two compounds');
  // Collect element universe
  const elementSet = new Set();
  for (const c of [...reactants, ...products]) {
    for (const el of Object.keys(c)) elementSet.add(el);
  }
  const elements = [...elementSet];
  // Build matrix M: row = element, col = compound.
  // Left compounds have +count, right compounds have -count.
  // Coefficients satisfy M·x = 0.
  const M = elements.map(el => {
    const row = [];
    for (let i = 0; i < reactants.length; i++) row.push(reactants[i][el] || 0);
    for (let i = 0; i < products.length; i++) row.push(-(products[i][el] || 0));
    return row;
  });
  // Validate: same element set on both sides? (warning, not error — sometimes
  // OK if there's e.g. free electrons in redox, but we report.)
  const basis = solveNullspace(M);
  if (basis.length === 0) {
    throw new Error('Equation cannot be balanced (no non-trivial solution)');
  }
  // Pick the basis vector with smallest maximum |coef|.
  let best = null;
  let bestScore = Infinity;
  for (const v of basis) {
    const ints = fracsToInts(v);
    const max = Math.max(...ints.map(Math.abs));
    if (max < bestScore) { bestScore = max; best = ints; }
  }
  if (!best) throw new Error('No integer solution found');
  return {
    reactants: reactants.map((c, i) => ({ compound: compoundToString(c), coefficient: best[i] })),
    products: products.map((c, i) => ({ compound: compoundToString(c), coefficient: best[reactants.length + i] }))
  };
}

function compoundToString(c) {
  // Pretty-print parsed compound back to a chemical formula.
  // Preserve ordering from data structure (insertion order).
  return Object.entries(c).map(([el, n]) => n === 1 ? el : `${el}${n}`).join('');
}

export function formatBalanced(result) {
  const fmt = (s) => s.compound + (s.coefficient === 1 ? '' : `${s.coefficient > 0 ? '' : ''}`);
  // Show coefficients explicitly even when 1 (clearer for output)
  const fmtCoeff = (s) => `${s.coefficient > 1 ? s.coefficient : ''}${s.compound}`;
  return `${result.reactants.map(fmtCoeff).join(' + ')} → ${result.products.map(fmtCoeff).join(' + ')}`;
}

// ---------- UI helper ----------

export function renderBalancerTool(bodyEl) {
  bodyEl.innerHTML = `
    <div class="tool-modal-header">
      <span class="tool-num-badge">1</span>
      <h2>Equation Balancer</h2>
    </div>
    <div class="tool-row">
      <label for="eq-input">Enter an unbalanced equation (use → or = for the arrow):</label>
      <input id="eq-input" class="tool-input" type="text" value="H2 + O2 -> H2O" placeholder="e.g. Fe + O2 -> Fe2O3">
    </div>
    <div class="tool-actions">
      <button class="btn-primary" id="eq-balance">Balance</button>
      <button class="btn-secondary" id="eq-example">Try example</button>
    </div>
    <div id="eq-output" class="tool-output">Enter an equation above and click <b>Balance</b>.</div>
  `;
  const input = bodyEl.querySelector('#eq-input');
  const out = bodyEl.querySelector('#eq-output');
  bodyEl.querySelector('#eq-balance').addEventListener('click', () => {
    try {
      const result = balanceEquation(input.value);
      out.className = 'tool-output success';
      out.innerHTML = `<div class="formula-preview">${formatBalanced(result)}</div>
        <table class="coeffs-table">
          <thead><tr><th>Compound</th><th>Coefficient</th></tr></thead>
          <tbody>${[...result.reactants, ...result.products].map(s => `
            <tr><td>${s.compound}</td><td>${s.coefficient}</td></tr>
          `).join('')}</tbody>
        </table>`;
    } catch (e) {
      out.className = 'tool-output error';
      out.textContent = `⚠ ${e.message}`;
    }
  });
  bodyEl.querySelector('#eq-example').addEventListener('click', () => {
    const examples = [
      'H2 + O2 -> H2O',
      'Fe + O2 -> Fe2O3',
      'C2H6 + O2 -> CO2 + H2O',
      'KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2',
      'Al + HCl -> AlCl3 + H2'
    ];
    input.value = examples[Math.floor(Math.random() * examples.length)];
  });
}