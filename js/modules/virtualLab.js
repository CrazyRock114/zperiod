// ====================================================================
// virtualLab.js — simple 2D beaker with water particles
// (No reactions yet — this is a "tilt a beaker" demo, exactly as in
// zperiod.app v3.0.0's Virtual Lab placeholder. Full reaction engine is
// scheduled for v0.3.)
// ====================================================================

export function renderVirtualLabTool(bodyEl) {
  bodyEl.innerHTML = `
    <div class="tool-modal-header">
      <span class="tool-num-badge">4</span>
      <h2>Virtual Lab</h2>
    </div>
    <p style="color:var(--text-secondary);font-size:14px;line-height:1.6;">
      A simple 2D beaker with water particles. Tilt the beaker to see particles
      shift with gravity. (Full reaction engine + custom ion species coming in v0.3.)
    </p>

    <div class="virtual-lab-stage">
      <canvas id="vl-canvas" width="600" height="360"></canvas>
    </div>

    <div class="virtual-lab-controls">
      <div class="slider-group">
        <label for="vl-tilt">Tilt angle</label>
        <input type="range" id="vl-tilt" min="-30" max="30" value="0" step="1">
        <span id="vl-tilt-val">0°</span>
      </div>
      <div class="slider-group">
        <label for="vl-density">Particle density</label>
        <input type="range" id="vl-density" min="20" max="200" value="80" step="5">
        <span id="vl-density-val">80</span>
      </div>
      <div class="slider-group">
        <label for="vl-speed">Motion speed</label>
        <input type="range" id="vl-speed" min="0" max="3" step="0.1" value="1">
        <span id="vl-speed-val">1.0×</span>
      </div>
      <button class="btn-secondary" id="vl-reset">Reset</button>
    </div>
  `;

  const canvas = bodyEl.querySelector('#vl-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // Beaker shape — an outline that the particles stay inside.
  // Define the beaker as a polygon (in local coords) and apply a tilt.
  const BEAKER = {
    cx: W * 0.5,
    cy: H * 0.55,
    topW: 360,
    bottomW: 320,
    height: 280
  };

  let tiltDeg = 0;
  let density = 80;
  let speedMul = 1.0;

  let particles = [];
  function resetParticles() {
    particles = [];
    for (let i = 0; i < density; i++) {
      particles.push({
        x: BEAKER.cx + (Math.random() - 0.5) * BEAKER.bottomW * 0.7,
        y: BEAKER.cy + (Math.random() - 0.3) * BEAKER.height * 0.5,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: 1.5 + Math.random() * 1.5
      });
    }
  }
  resetParticles();

  // Compute beaker polygon vertices (world-space, before tilt).
  function beakerPolygon(tilt) {
    const rad = tilt * Math.PI / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);
    const top = BEAKER.cy - BEAKER.height / 2;
    const bottom = BEAKER.cy + BEAKER.height / 2;
    const verts = [
      { x: -BEAKER.topW / 2, y: top },
      { x:  BEAKER.topW / 2, y: top },
      { x:  BEAKER.bottomW / 2, y: bottom },
      { x: -BEAKER.bottomW / 2, y: bottom }
    ];
    return verts.map(v => {
      const dx = v.x * cosA - v.y * sinA;
      const dy = v.x * sinA + v.y * cosA;
      return { x: BEAKER.cx + dx, y: BEAKER.cy + dy };
    });
  }

  function pointInPolygon(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // Project a particle onto the water surface (top of beaker area).
  function keepInside(p, poly) {
    if (pointInPolygon(p.x, p.y, poly)) return;
    // Naive: push toward center.
    const dx = BEAKER.cx - p.x;
    const dy = BEAKER.cy - p.y;
    const d = Math.hypot(dx, dy) || 1;
    p.x += dx / d * 2;
    p.y += dy / d * 2;
    p.vx *= -0.5;
    p.vy *= -0.5;
  }

  function step() {
    const poly = beakerPolygon(tiltDeg);
    const rad = tiltDeg * Math.PI / 180;
    // Gravity component along the tilted plane
    const gx = Math.sin(rad) * 0.15;
    const gy = Math.cos(rad) * 0.15 - 0.05; // slight upward bias to keep them floating
    for (const p of particles) {
      p.vx += gx * speedMul;
      p.vy += gy * speedMul;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.x += p.vx;
      p.y += p.vy;
      keepInside(p, poly);
    }
    draw(poly);
    requestAnimationFrame(step);
  }

  function draw(poly) {
    ctx.clearRect(0, 0, W, H);
    // Background tint
    ctx.fillStyle = 'rgba(120, 180, 220, 0.05)';
    ctx.fillRect(0, 0, W, H);

    // Beaker outline
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.strokeStyle = '#456';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Water
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = 'rgba(120, 180, 230, 0.18)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Particles
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(80, 140, 200, 0.65)';
      ctx.fill();
    }
  }

  step();

  // Wire controls
  bodyEl.querySelector('#vl-tilt').addEventListener('input', (e) => {
    tiltDeg = parseFloat(e.target.value);
    bodyEl.querySelector('#vl-tilt-val').textContent = `${tiltDeg.toFixed(0)}°`;
  });
  bodyEl.querySelector('#vl-density').addEventListener('input', (e) => {
    density = parseInt(e.target.value, 10);
    bodyEl.querySelector('#vl-density-val').textContent = density;
    resetParticles();
  });
  bodyEl.querySelector('#vl-speed').addEventListener('input', (e) => {
    speedMul = parseFloat(e.target.value);
    bodyEl.querySelector('#vl-speed-val').textContent = `${speedMul.toFixed(1)}×`;
  });
  bodyEl.querySelector('#vl-reset').addEventListener('click', resetParticles);
}