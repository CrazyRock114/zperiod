/**
 * Flame Studio - Particle Flame Simulation & Laboratory Stage Engine
 * Real-time combustion physics, spectral color blending, and optical cobalt filter.
 * Zero-CJK compliant.
 */

export class FlameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = window.devicePixelRatio || 1;

    // Simulation parameters
    this.airHole = 1.0; // 0.0 (safety) to 1.0 (roaring)
    this.gasFlow = 1.0;
    this.activeIon = null; // object from METAL_DATA or null
    this.ionBlend = 0.0; // 0.0 (pure gas flame) to 1.0 (full ion emission)
    this.isCobaltActive = false;

    // Loop state
    this.loopState = "bench"; // "bench" | "acid" | "sample" | "flame"
    this.loopSampleId = null;
    this.loopProgress = 0; // interpolation factor
    this.wireHeat = 0.0; // 0.0 (cold) to 1.0 (glowing red-hot)

    // Particles
    this.particles = [];
    this.sparks = [];
    this.maxParticles = 280;
    this.lastTime = performance.now();
    this.animId = null;

    this.initResize();
  }

  initResize() {
    this.resize = this.resize.bind(this);
    window.addEventListener("resize", this.resize);
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setAirHole(val) {
    this.airHole = Math.max(0, Math.min(1, val));
  }

  setGasFlow(val) {
    this.gasFlow = Math.max(0, Math.min(1.5, val));
  }

  setActiveIon(ionData) {
    this.activeIon = ionData;
    this.ionBlend = ionData ? 1.0 : 0.0;
  }

  setCobaltGlass(active) {
    this.isCobaltActive = !!active;
  }

  setLoopPosition(state, sampleId = null) {
    this.loopState = state;
    if (sampleId !== undefined) this.loopSampleId = sampleId;
  }

  start() {
    if (this.animId) return;
    this.lastTime = performance.now();
    const loop = (now) => {
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;
      this.update(dt);
      this.draw();
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    window.removeEventListener("resize", this.resize);
  }

  update(dt) {
    // 1. Decay ion blend if burning
    if (this.loopState === "flame" && this.activeIon) {
      // Wire heats up to 1.0
      this.wireHeat = Math.min(1.0, this.wireHeat + dt * 1.5);
      // Sample gradually burns off over duration
      const decayRate = 1.0 / (this.activeIon.durationMs / 1000);
      this.ionBlend = Math.max(0, this.ionBlend - dt * decayRate);
      if (this.ionBlend <= 0.001) {
        this.activeIon = null;
        this.loopSampleId = null;
      }
    } else {
      // Cool down wire
      this.wireHeat = Math.max(0, this.wireHeat - dt * 0.8);
    }

    // 2. Spawn flame particles
    const burnerTipX = this.width * 0.5;
    const burnerTipY = this.height * 0.64;

    const spawnCount = Math.floor(6 + this.gasFlow * 6);
    for (let i = 0; i < spawnCount; i++) {
      if (this.particles.length < this.maxParticles) {
        this.particles.push(this.createParticle(burnerTipX, burnerTipY));
      }
    }

    // 3. Spawn sparks when ion is burning
    if (this.activeIon && this.ionBlend > 0.1 && Math.random() < 0.35) {
      this.sparks.push(this.createSpark(burnerTipX, burnerTipY));
    }

    // 4. Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      const progress = p.life / p.maxLife;
      p.y -= p.vy * dt;
      p.x += Math.sin(p.life * 8 + p.seed) * p.vx * dt;
      p.radius = p.baseRadius * (1 + progress * 2.2);
    }

    // 5. Update sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life += dt;
      if (s.life >= s.maxLife) {
        this.sparks.splice(i, 1);
        continue;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy -= 120 * dt; // gravity / upward draft
    }
  }

  createParticle(tipX, tipY) {
    const isRoaring = this.airHole > 0.5;
    const speed = (280 + Math.random() * 200) * (0.8 + this.airHole * 0.5) * this.gasFlow;
    return {
      x: tipX + (Math.random() - 0.5) * (14 - this.airHole * 6),
      y: tipY,
      vx: 12 + Math.random() * 24,
      vy: speed,
      baseRadius: 7 + Math.random() * 10,
      radius: 8,
      life: 0,
      maxLife: 0.35 + Math.random() * 0.45,
      seed: Math.random() * Math.PI * 2,
      isCore: Math.random() < (isRoaring ? 0.45 : 0.2)
    };
  }

  createSpark(tipX, tipY) {
    return {
      x: tipX + (Math.random() - 0.5) * 16,
      y: tipY - 40 - Math.random() * 60,
      vx: (Math.random() - 0.5) * 60,
      vy: -150 - Math.random() * 120,
      radius: 1.2 + Math.random() * 1.5,
      life: 0,
      maxLife: 0.4 + Math.random() * 0.4,
      color: this.activeIon ? this.activeIon.hexPrimary : "#ffffff"
    };
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const burnerX = this.width * 0.5;
    const burnerY = this.height * 0.64;

    // 1. Ambient darkness & lab backdrop glow
    this.drawLabBackground(ctx);

    // 2. Draw Bunsen Burner base & barrel
    this.drawBurner(ctx, burnerX, burnerY);

    // 3. Draw Flame Particles (Additive Blending)
    this.drawFlameParticles(ctx, burnerX, burnerY);

    // 4. Draw Platinum / Nichrome Wire Loop
    this.drawWireLoop(ctx, burnerX, burnerY);

    // 5. Draw Cobalt Blue Glass Overlay if active
    if (this.isCobaltActive) {
      this.drawCobaltFilter(ctx);
    }
  }

  drawLabBackground(ctx) {
    // Dark laboratory background with subtle floor line
    const bgGrad = ctx.createRadialGradient(
      this.width * 0.5, this.height * 0.5, 50,
      this.width * 0.5, this.height * 0.5, this.width * 0.75
    );
    bgGrad.addColorStop(0, "#0f172a");
    bgGrad.addColorStop(1, "#020617");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Lab bench surface
    const benchY = this.height * 0.88;
    const benchGrad = ctx.createLinearGradient(0, benchY, 0, this.height);
    benchGrad.addColorStop(0, "#1e293b");
    benchGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = benchGrad;
    ctx.fillRect(0, benchY, this.width, this.height - benchY);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, benchY);
    ctx.lineTo(this.width, benchY);
    ctx.stroke();
  }

  drawBurner(ctx, x, y) {
    const barrelWidth = 22;
    const barrelHeight = 110;
    const baseWidth = 84;
    const baseHeight = 22;

    const baseTopY = y + barrelHeight;

    // Radiant flame glow reflection on burner top
    if (this.activeIon && this.ionBlend > 0.05) {
      const glowGrad = ctx.createRadialGradient(x, y + 20, 5, x, y + 20, 70);
      glowGrad.addColorStop(0, this.activeIon.hexGlow);
      glowGrad.addColorStop(1, "transparent");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(x - 60, y - 10, 120, 100);
    }

    // Heavy Cast-Iron Base
    const baseGrad = ctx.createLinearGradient(x - baseWidth / 2, 0, x + baseWidth / 2, 0);
    baseGrad.addColorStop(0, "#334155");
    baseGrad.addColorStop(0.3, "#64748b");
    baseGrad.addColorStop(0.7, "#475569");
    baseGrad.addColorStop(1, "#1e293b");

    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.roundRect(x - baseWidth / 2, baseTopY, baseWidth, baseHeight, [4, 4, 8, 8]);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.stroke();

    // Metallic Barrel (Brass / Chrome)
    const barrelGrad = ctx.createLinearGradient(x - barrelWidth / 2, 0, x + barrelWidth / 2, 0);
    barrelGrad.addColorStop(0, "#64748b");
    barrelGrad.addColorStop(0.2, "#cbd5e1");
    barrelGrad.addColorStop(0.5, "#f1f5f9");
    barrelGrad.addColorStop(0.8, "#94a3b8");
    barrelGrad.addColorStop(1, "#475569");

    ctx.fillStyle = barrelGrad;
    ctx.fillRect(x - barrelWidth / 2, y, barrelWidth, barrelHeight);

    // Air Hole Collar (Rotatable band near base)
    const collarY = y + barrelHeight - 34;
    const collarH = 20;
    ctx.fillStyle = "#334155";
    ctx.fillRect(x - (barrelWidth + 4) / 2, collarY, barrelWidth + 4, collarH);

    // Air holes (visualizing closed vs open air vent)
    const holeWidth = 8 * this.airHole;
    if (holeWidth > 1) {
      ctx.fillStyle = "#020617";
      ctx.beginPath();
      ctx.roundRect(x - holeWidth / 2, collarY + 4, holeWidth, 12, 2);
      ctx.fill();
    }

    // Burner Nozzle Top Lip
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(x - (barrelWidth + 2) / 2, y - 2, barrelWidth + 2, 4);
  }

  drawFlameParticles(ctx, x, y) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // Base flame color calculation
    let baseR, baseG, baseB;
    if (this.airHole < 0.3) {
      // Safety flame (Luminous yellow-orange)
      baseR = 255;
      baseG = Math.floor(140 + this.airHole * 100);
      baseB = 10;
    } else {
      // Medium to Roaring flame (Electric Blue / Cyan)
      const t = (this.airHole - 0.3) / 0.7;
      baseR = Math.floor(40 - t * 20);
      baseG = Math.floor(130 + t * 50);
      baseB = 255;
    }

    // Blend with active metal ion color
    let r = baseR;
    let g = baseG;
    let b = baseB;

    if (this.activeIon && this.ionBlend > 0) {
      const blend = this.ionBlend;
      const [ir, ig, ib] = this.activeIon.rgb;

      // When cobalt glass is active, sodium yellow (589nm) is absorbed!
      if (this.isCobaltActive && this.activeIon.id === "na") {
        // Yellow absorbed, leaving dim faint grey/blue residue
        r = Math.floor((ir * 0.15) * blend + baseR * (1 - blend));
        g = Math.floor((ig * 0.15) * blend + baseG * (1 - blend));
        b = Math.floor((ib * 0.35 + 40) * blend + baseB * (1 - blend));
      } else {
        r = Math.floor(ir * blend + baseR * (1 - blend));
        g = Math.floor(ig * blend + baseG * (1 - blend));
        b = Math.floor(ib * blend + baseB * (1 - blend));
      }
    }

    // Draw radiant atmospheric back-glow
    const glowRadius = 80 + this.airHole * 40;
    const radialGlow = ctx.createRadialGradient(x, y - 60, 10, x, y - 60, glowRadius);
    radialGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.35)`);
    radialGlow.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.12)`);
    radialGlow.addColorStop(1, "transparent");
    ctx.fillStyle = radialGlow;
    ctx.fillRect(x - glowRadius, y - 60 - glowRadius, glowRadius * 2, glowRadius * 2);

    // Draw all particles
    for (const p of this.particles) {
      const progress = p.life / p.maxLife;
      const alpha = Math.max(0, 1 - progress) * (0.45 + (1 - progress) * 0.35);

      let pr = r;
      let pg = g;
      let pb = b;

      // Inner core of roaring flame is intense bright cyan/white
      if (p.isCore && this.airHole > 0.4 && (!this.activeIon || this.ionBlend < 0.5)) {
        pr = 180;
        pg = 240;
        pb = 255;
      }

      ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw sparks
    for (const s of this.sparks) {
      const alpha = 1 - s.life / s.maxLife;
      ctx.fillStyle = s.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawWireLoop(ctx, burnerX, burnerY) {
    ctx.save();

    // Determine loop tip position based on loopState
    let targetX, targetY;
    if (this.loopState === "flame") {
      targetX = burnerX - 6;
      targetY = burnerY - 50; // base of the hot non-luminous zone
    } else if (this.loopState === "acid") {
      targetX = this.width * 0.22;
      targetY = this.height * 0.85;
    } else if (this.loopState === "sample") {
      targetX = this.width * 0.38;
      targetY = this.height * 0.85;
    } else {
      // Resting on lab bench
      targetX = this.width * 0.72;
      targetY = this.height * 0.82;
    }

    // Glass / Insulated handle
    const handleStartX = targetX + 160;
    const handleStartY = targetY + 45;
    const handleEndX = targetX + 80;
    const handleEndY = targetY + 22;

    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#475569";
    ctx.beginPath();
    ctx.moveTo(handleStartX, handleStartY);
    ctx.lineTo(handleEndX, handleEndY);
    ctx.stroke();

    // Nichrome / Platinum Wire Shaft
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.moveTo(handleEndX, handleEndY);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();

    // Loop Circle at Tip (2.5mm circular loop)
    const loopRadius = 6;
    ctx.beginPath();
    ctx.arc(targetX - loopRadius, targetY, loopRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Glowing wire heat (incandescence)
    if (this.wireHeat > 0.05) {
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(255, ${Math.floor(100 + this.wireHeat * 155)}, 0, ${this.wireHeat * 0.9})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(targetX - loopRadius, targetY, loopRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Sample crystal / salt droplet on tip if loaded
    if (this.loopSampleId && this.loopState !== "flame") {
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.arc(targetX - loopRadius, targetY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawCobaltFilter(ctx) {
    ctx.save();
    // High-tech optical cobalt blue glass viewport overlay
    const filterGrad = ctx.createRadialGradient(
      this.width * 0.5, this.height * 0.5, 100,
      this.width * 0.5, this.height * 0.5, this.width * 0.85
    );
    filterGrad.addColorStop(0, "rgba(26, 43, 150, 0.55)");
    filterGrad.addColorStop(0.7, "rgba(15, 23, 100, 0.72)");
    filterGrad.addColorStop(1, "rgba(5, 10, 48, 0.88)");

    ctx.fillStyle = filterGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Glass border reflection
    ctx.strokeStyle = "rgba(147, 197, 253, 0.35)";
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, this.width - 24, this.height - 24);

    // Cobalt Glass HUD badge in top right
    ctx.fillStyle = "rgba(147, 197, 253, 0.85)";
    ctx.font = "12px sans-serif";
    ctx.fillText("COBALT BLUE GLASS FILTER ACTIVE (ABSORBS 589nm Na YELLOW)", 24, 32);

    ctx.restore();
  }
}
