// Fluid Flow Sandbox › Viscous flows: exact solutions of the Navier–Stokes equations where the convective term
// vanishes. Couette–Poiseuille flow between plates, Hagen–Poiseuille pipe flow, start-up Couette flow, and Stokes'
// first and second problems, each drawn as the moving walls and an animated velocity profile.
import { h, section, select, field, segmented } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import * as Fl from '../../solvers/flow.js';
import { FLUIDS, fluidOptions, metricsGrid, insightsList, card, bound, put, css, fmt, canvasBox, PI } from './fieldCommon.js';

const PROBLEMS = [
  { value: 'couette', label: 'Couette–Poiseuille (plates)' },
  { value: 'pipe', label: 'Pipe flow (Hagen–Poiseuille)' },
  { value: 'startup', label: 'Start-up Couette flow' },
  { value: 'stokes1', label: 'Stokes\' 1st problem (plate jerked into motion)' },
  { value: 'stokes2', label: 'Stokes\' 2nd problem (oscillating plate)' },
];

export function viscousTab({ keep = o => o } = {}) {
  const S = keep({
    problem: 'couette', fluid: 'oil',
    c: { U: 1, h: 0.01, G: 0 },            // Couette–Poiseuille: wall speed m/s, gap m, −dp/dx Pa/m
    p: { R: 0.005, G: 2000 },               // pipe: radius m, −dp/dx Pa/m
    s: { U: 1, h: 0.01, t: 0.02 },          // start-up: wall speed, gap, time s
    s1: { U: 1, t: 1 },                     // Stokes 1: plate speed, time s
    s2: { U: 1, f: 1 },                     // Stokes 2: amplitude m/s, frequency Hz
  });
  let fl = FLUIDS.find(f => f.id === S.fluid) || FLUIDS[0];
  const controls = h('div'), main = h('div', { class: 'cf-main-inner' });
  const metrics = metricsGrid();
  const cv = canvasBox('cf-chart fl-visc', '300px');
  const vCard = card('The flow', 'Walls are drawn gray; a moving wall has an arrow. The arrows across the gap are the velocity profile; the dots drift at the local speed.');
  vCard.append(cv.el);
  const pCard = card('Velocity profile', '');
  const plot = new Plot(pCard, { xlabel: 'u (m/s)', ylabel: 'y', legendPos: 'above' });
  plot.wrap.style.height = '280px';
  const sCard = card('Shear stress', 'τ = μ du/dy across the flow.');
  const splot = new Plot(sCard, { xlabel: 'τ (Pa)', ylabel: 'y' });
  splot.wrap.style.height = '280px';
  const insCard = card('Notes'); const insEl = h('div'); insCard.append(insEl);
  main.append(metrics.el, vCard, h('div', { class: 'cf-grid2b' }, pCard, sCard), insCard);

  let playing = true, simT = 0, raf = 0, visible = false, last = 0;
  function build() {
    const sec = section('Problem');
    const sel = select(PROBLEMS, S.problem, v => { S.problem = v; simT = 0; build(); update(); });
    const fsel = select(fluidOptions(), S.fluid, v => { S.fluid = v; fl = FLUIDS.find(f => f.id === v); update(); });
    put(sec.body, field('Flow', sel), field('Fluid', fsel, 'Density and viscosity at 20 °C. The kinematic viscosity ν = μ/ρ sets how fast momentum diffuses.'));
    const sp = section('Parameters'), on = () => update();
    if (S.problem === 'couette') put(sp.body,
      bound(S.c, 'U', 'Upper wall speed U', -5, 5, { step: 0.01, digits: 2, unit: 'm/s', onInput: on }),
      bound(S.c, 'h', 'Gap h', 0.5, 50, { log: true, digits: 4, unit: 'mm', scale: 1e-3, onInput: on }),
      bound(S.c, 'G', 'Pressure gradient −dp/dx', -2e5, 2e5, { step: 100, digits: 0, unit: 'Pa/m', onInput: on, tip: 'Positive pushes the fluid along +x. With an adverse gradient (negative) and a moving wall, the flow near the fixed wall can reverse.' }));
    if (S.problem === 'pipe') put(sp.body,
      bound(S.p, 'R', 'Pipe radius R', 0.5, 100, { log: true, digits: 4, unit: 'mm', scale: 1e-3, onInput: on }),
      bound(S.p, 'G', 'Pressure gradient −dp/dx', 1, 1e6, { log: true, digits: 0, unit: 'Pa/m', onInput: on }));
    if (S.problem === 'startup') put(sp.body,
      bound(S.s, 'U', 'Lower wall speed U', 0.01, 5, { step: 0.01, digits: 2, unit: 'm/s', onInput: on }),
      bound(S.s, 'h', 'Gap h', 0.5, 50, { log: true, digits: 4, unit: 'mm', scale: 1e-3, onInput: on }),
      bound(S.s, 't', 'Time after the start t', 0, 1, { step: 0.0005, digits: 4, unit: 's', onInput: () => { playing = false; update(); } }));
    if (S.problem === 'stokes1') put(sp.body,
      bound(S.s1, 'U', 'Plate speed U', 0.01, 5, { step: 0.01, digits: 2, unit: 'm/s', onInput: on }),
      bound(S.s1, 't', 'Time after the start t', 0.001, 100, { log: true, digits: 3, unit: 's', onInput: () => { playing = false; update(); } }));
    if (S.problem === 'stokes2') put(sp.body,
      bound(S.s2, 'U', 'Plate speed amplitude U', 0.01, 5, { step: 0.01, digits: 2, unit: 'm/s', onInput: on }),
      bound(S.s2, 'f', 'Frequency f', 0.01, 100, { log: true, digits: 2, unit: 'Hz', onInput: on }));
    const pb = h('button', { type: 'button', class: 'btn sm' }, playing ? 'Pause' : 'Play');
    pb.addEventListener('click', () => { playing = !playing; pb.textContent = playing ? 'Pause' : 'Play'; loop(); });
    if (S.problem === 'startup' || S.problem === 'stokes1' || S.problem === 'stokes2') put(sp.body, h('div', { class: 'row' }, pb, h('span', { class: 'hint', style: { margin: 0 } }, S.problem === 'stokes2' ? 'Animates the oscillation.' : 'Runs time forward from the start.')));
    controls.replaceChildren(sec.el, sp.el);
  }

  // current solution: profile y[] (wall-normal), u[], tau[], and what to draw
  function solve() {
    const mu = fl.mu, rho = fl.rho, nu = mu / rho;
    if (S.problem === 'couette') {
      const r = Fl.couette({ ...S.c, mu });
      return { r, y: r.y, u: r.u, tau: r.y.map(y => mu * S.c.U / S.c.h + S.c.G * (S.c.h / 2 - y)), H: S.c.h, top: S.c.U, bot: 0, ylab: 'y (mm)', ys: 1e3, nu, rho, mu };
    }
    if (S.problem === 'pipe') {
      const r = Fl.pipe({ ...S.p, mu, rho });
      return { r, y: r.r, u: r.u, tau: r.r.map(y => -S.p.G * y / 2), H: 2 * S.p.R, pipe: true, ylab: 'r (mm)', ys: 1e3, nu, rho, mu };
    }
    if (S.problem === 'startup') {
      const t = S.s.t, r = Fl.startupCouette({ U: S.s.U, h: S.s.h, nu, t });
      const tau = r.y.map((y, k) => { const a = r.u[Math.max(0, k - 1)], b = r.u[Math.min(r.u.length - 1, k + 1)], dy = r.y[Math.min(r.u.length - 1, k + 1)] - r.y[Math.max(0, k - 1)]; return mu * (b - a) / dy; });
      return { r, y: r.y, u: r.u, tau, H: S.s.h, top: 0, bot: S.s.U, ylab: 'y (mm)', ys: 1e3, nu, rho, mu, t };
    }
    if (S.problem === 'stokes1') {
      const t = S.s1.t, d = 4 * Math.sqrt(nu * t), H = Math.max(d * 1.4, 1e-6), y = [], u = [], tau = [];
      for (let k = 0; k <= 120; k++) { const yy = H * k / 120; y.push(yy); u.push(Fl.stokes1(yy, t, S.s1.U, nu)); tau.push(-mu * S.s1.U / Math.sqrt(PI * nu * t) * Math.exp(-yy * yy / (4 * nu * t))); }
      return { y, u, tau, H, bot: S.s1.U, open: true, ylab: 'y (mm)', ys: 1e3, nu, rho, mu, t, d99: 3.64 * Math.sqrt(nu * t) };
    }
    const w = 2 * PI * S.s2.f, k = Math.sqrt(w / (2 * nu)), H = 6 / k, y = [], u = [], tau = [];
    const t = simT;
    for (let i = 0; i <= 160; i++) { const yy = H * i / 160; y.push(yy); u.push(Fl.stokes2(yy, t, S.s2.U, nu, w)); tau.push(mu * S.s2.U * k * Math.exp(-k * yy) * (Math.sin(w * t - k * yy) - Math.cos(w * t - k * yy))); }
    return { y, u, tau, H, bot: S.s2.U * Math.cos(w * t), open: true, ylab: 'y (mm)', ys: 1e3, nu, rho, mu, t, k, w };
  }

  // drifting tracer dots for the picture
  const dots = Array.from({ length: 90 }, () => ({ s: Math.random(), x: Math.random() }));
  let sol = null;
  function draw() {
    cv.set(({ W, H, g }) => {
      if (!sol) return;
      const pad = 34, top = sol.open ? 18 : 40, bot = H - 40, L = pad, R = W - pad;
      const umax = Math.max(1e-12, ...sol.u.map(Math.abs), Math.abs(sol.top || 0), Math.abs(sol.bot || 0));
      const yPx = s => bot - s * (bot - top); // s in [0,1] across the gap
      // walls
      g.fillStyle = css('--bg-sunk'); g.strokeStyle = css('--text-2'); g.lineWidth = 2;
      g.fillRect(L, bot, R - L, 14); g.beginPath(); g.moveTo(L, bot); g.lineTo(R, bot); g.stroke();
      if (!sol.open) { g.fillRect(L, top - 14, R - L, 14); g.beginPath(); g.moveTo(L, top); g.lineTo(R, top); g.stroke(); }
      const wallArrow = (y, u, label) => {
        if (Math.abs(u) < 1e-9) return;
        const x0 = (L + R) / 2, len = 70 * u / umax;
        g.strokeStyle = g.fillStyle = css('--warn'); g.lineWidth = 2.5; g.beginPath(); g.moveTo(x0 - len / 2, y); g.lineTo(x0 + len / 2, y); g.stroke();
        const s = Math.sign(len); g.beginPath(); g.moveTo(x0 + len / 2, y); g.lineTo(x0 + len / 2 - 8 * s, y - 5); g.lineTo(x0 + len / 2 - 8 * s, y + 5); g.closePath(); g.fill();
        g.font = `12px ${css('--font')}`; g.textAlign = 'left'; g.fillText(label, x0 + Math.abs(len) / 2 + 10, y + 4);
      };
      wallArrow(bot + 7, sol.bot || 0, `wall ${fmt(sol.bot || 0, 2)} m/s`);
      if (!sol.open) wallArrow(top - 7, sol.top || 0, `wall ${fmt(sol.top || 0, 2)} m/s`);
      // profile arrows at the left third
      const x0 = L + (R - L) * 0.22, sc = (R - L) * 0.32 / umax, n = sol.y.length;
      g.strokeStyle = css('--text-3'); g.lineWidth = 1; g.beginPath(); g.moveTo(x0, top); g.lineTo(x0, bot); g.stroke();
      const sN = k => sol.pipe ? (sol.y[k] - sol.y[0]) / (sol.y[n - 1] - sol.y[0]) : sol.y[k] / sol.H;
      for (let k = 0; k < n; k += Math.max(1, Math.round(n / 16))) {
        const y = yPx(sN(k)), len = sol.u[k] * sc;
        if (Math.abs(len) < 1) continue;
        g.strokeStyle = g.fillStyle = css('--accent'); g.lineWidth = 1.6; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + len, y); g.stroke();
        const s = Math.sign(len); g.beginPath(); g.moveTo(x0 + len, y); g.lineTo(x0 + len - 6 * s, y - 3.5); g.lineTo(x0 + len - 6 * s, y + 3.5); g.closePath(); g.fill();
      }
      g.strokeStyle = css('--accent'); g.lineWidth = 2.2; g.beginPath();
      for (let k = 0; k < n; k++) { const X = x0 + sol.u[k] * sc, Y = yPx(sN(k)); k ? g.lineTo(X, Y) : g.moveTo(X, Y); }
      g.stroke();
      // drifting dots
      g.fillStyle = css('--text-2');
      for (const d of dots) {
        const k = Math.min(n - 1, Math.round(d.s * (n - 1)));
        const X = L + d.x * (R - L), Y = yPx(sN(k));
        g.globalAlpha = 0.7; g.beginPath(); g.arc(X, Y, 2, 0, 2 * PI); g.fill();
      }
      g.globalAlpha = 1;
      g.fillStyle = css('--text-2'); g.font = `11px ${css('--font')}`; g.textAlign = 'right';
      g.fillText(sol.pipe ? `diameter ${fmt(sol.H * 1e3, 2)} mm` : sol.open ? `shown to y = ${fmt(sol.H * 1e3, 3)} mm` : `gap ${fmt(sol.H * 1e3, 3)} mm`, R, bot + 30);
      if (sol.t !== undefined) { g.textAlign = 'left'; g.fillText(`t = ${fmt(sol.t, 4)} s`, L, bot + 30); }
    });
  }
  function moveDots(dt) {
    if (!sol) return;
    const umax = Math.max(1e-12, ...sol.u.map(Math.abs)), n = sol.y.length;
    for (const d of dots) { const k = Math.min(n - 1, Math.round(d.s * (n - 1))); d.x += 0.25 * dt * sol.u[k] / umax; if (d.x > 1) d.x -= 1; if (d.x < 0) d.x += 1; }
  }

  function update() {
    sol = solve();
    const ys = sol.ys, Y = sol.y.map(v => v * ys);
    const series = [{ x: sol.u, y: Y, color: css('--accent'), label: 'u(y)', width: 2.4 }];
    if (S.problem === 'startup') {
      for (const f of [0.02, 0.1, 0.3]) { const tt = f * S.s.h ** 2 / sol.nu; if (tt < sol.t * 0.98) { const r = Fl.startupCouette({ U: S.s.U, h: S.s.h, nu: sol.nu, t: tt }); series.push({ x: r.u, y: r.y.map(v => v * ys), color: css('--text-3'), dash: [4, 3], width: 1.2, label: `νt/h² = ${f}`, noHover: true }); } }
      series.push({ x: [S.s.U, 0], y: [0, S.s.h * ys], color: css('--good'), dash: [6, 4], width: 1.2, label: 'steady', noHover: true });
    }
    if (S.problem === 'stokes2') { const env = sol.y.map(y => S.s2.U * Math.exp(-sol.k * y)); series.push({ x: env, y: Y, color: css('--text-3'), dash: [4, 3], width: 1, label: 'envelope ±U e^(−ky)', noHover: true }, { x: env.map(v => -v), y: Y, color: css('--text-3'), dash: [4, 3], width: 1, noHover: true }); }
    plot.setOpts({ ylabel: sol.ylab, yname: sol.pipe ? 'r' : 'y', xname: 'u', xfmt: v => fmt(v, 4) + ' m/s', yfmt: v => fmt(v, 4) + ' mm', ylim: [Math.min(...Y), Math.max(...Y)] });
    plot.setData({ series, vlines: [{ x: 0, color: css('--text-3') }] });
    splot.setOpts({ ylabel: sol.ylab, yname: sol.pipe ? 'r' : 'y', xname: 'τ', xfmt: v => fmt(v, 4) + ' Pa', yfmt: v => fmt(v, 4) + ' mm', ylim: [Math.min(...Y), Math.max(...Y)] });
    splot.setData({ series: [{ x: sol.tau, y: Y, color: css('--lower'), label: 'τ = μ du/dy', width: 2.2 }], vlines: [{ x: 0, color: css('--text-3') }] });
    panels();
    draw();
  }

  function panels() {
    const L = [], nu = sol.nu;
    if (S.problem === 'couette') {
      const r = sol.r, Re = fl.rho * Math.abs(r.ubar) * S.c.h / fl.mu;
      metrics.set([
        { k: 'Flow rate Q′', v: fmt(r.Q * 1e3, 4) + ' L/s·m', s: `mean speed ${fmt(r.ubar, 4)} m/s`, tip: 'Volume flow per meter of width: Q′ = Uh/2 + G h³/(12μ).' },
        { k: 'Wall shear, lower', v: fmt(r.tau0, 4) + ' Pa', s: 'τ = μU/h + Gh/2' },
        { k: 'Wall shear, upper', v: fmt(r.tauh, 4) + ' Pa', s: 'τ = μU/h − Gh/2', tip: 'Stress μ du/dy at the upper wall; the force on the upper plate per unit area is minus this.' },
        { k: 'Pressure parameter P', v: fmt(r.P, 3), s: r.backflow ? 'backflow near the fixed wall' : 'no backflow', cls: r.backflow ? 'warn' : '', tip: 'P = −(h²/2μU) dp/dx = Gh²/(2μU). Backflow near the fixed wall starts at P < −1 (an adverse gradient).' },
        { k: 'Reynolds number', v: fmt(Re, 1), s: Re < 1500 ? 'laminar' : 'may be turbulent', cls: Re > 1500 ? 'warn' : '' },
      ]);
      L.push({ type: 'i', t: 'Linear plus parabolic', d: 'With dp/dx = 0 the moving wall drags the fluid into a straight-line profile (plain Couette flow: a journal bearing, a lubricated slider). A pressure gradient adds a parabola. Both satisfy μ d²u/dy² = dp/dx, the whole of the Navier–Stokes equations in this geometry.' });
      if (r.backflow) L.push({ type: 'w', t: 'Reversed flow near the fixed wall', d: 'An adverse pressure gradient strong enough to push the slow fluid backward. This is the same thing that separates a boundary layer on an airfoil.' });
    } else if (S.problem === 'pipe') {
      const r = sol.r;
      metrics.set([
        { k: 'Flow rate Q', v: fmt(r.Q * 1e3, 4) + ' L/s', s: 'Q = πGR⁴/(8μ)', tip: 'Hagen–Poiseuille: halving the radius cuts the flow 16-fold at the same pressure gradient.' },
        { k: 'Center-line speed', v: fmt(r.umax, 4) + ' m/s', s: `mean ${fmt(r.ubar, 4)} m/s (half)` },
        { k: 'Wall shear τw', v: fmt(r.tauw, 4) + ' Pa', s: 'τw = GR/2' },
        { k: 'Reynolds number', v: fmt(r.Re, 0), s: r.laminar ? 'laminar (< 2300)' : 'turbulent in practice: this solution no longer applies', cls: r.laminar ? 'good' : 'bad' },
        { k: 'Friction factor f', v: fmt(r.f, 4), s: `64/Re = ${fmt(64 / r.Re, 4)}` },
      ]);
      L.push({ type: 'i', t: 'A parabola in a pipe', d: 'The pressure drop along the pipe is balanced by the wall shear; with constant viscosity the profile is a paraboloid whose peak is twice the mean speed. Real pipe flow stays like this up to Re ≈ 2300, then turns turbulent and its profile flattens.' });
      if (!r.laminar) L.push({ type: 'b', t: 'Too fast for laminar flow', d: 'Lower the pressure gradient or the radius, or pick a more viscous fluid.' });
    } else if (S.problem === 'startup') {
      const tc = S.s.h ** 2 / nu;
      metrics.set([
        { k: 'Time scale h²/ν', v: fmt(tc, 4) + ' s', s: 'momentum crosses the gap' },
        { k: 'νt/h²', v: fmt(sol.t / tc, 4), s: sol.t / tc > 0.5 ? 'nearly steady' : 'still developing' },
        { k: 'Diffusion depth √(νt)', v: fmt(Math.sqrt(nu * sol.t) * 1e3, 4) + ' mm', s: `gap ${fmt(S.s.h * 1e3, 3)} mm` },
        { k: 'Kinematic viscosity ν', v: fmt(nu, 4) + ' m²/s' },
      ]);
      L.push({ type: 'i', t: 'Momentum diffuses like heat', d: 'The wall starts at speed U and the fluid next to it follows at once, but the motion reaches further out only as fast as viscous diffusion allows: a depth of about √(νt). After about h²/ν the profile is the steady straight line. The series is a sum of decaying sine modes, the highest ones dying fastest.' });
    } else if (S.problem === 'stokes1') {
      metrics.set([
        { k: '99% thickness', v: fmt(sol.d99 * 1e3, 4) + ' mm', s: 'δ ≈ 3.64 √(νt)' },
        { k: 'Wall shear τw', v: fmt(-sol.tau[0], 4) + ' Pa', s: 'μU/√(πνt): falls as 1/√t' },
        { k: 'Kinematic viscosity ν', v: fmt(nu, 4) + ' m²/s' },
      ]);
      L.push({ type: 'i', t: 'Stokes\' first problem', d: 'A plate in still fluid is jerked to speed U. The profile is u = U erfc(y/2√(νt)): always the same shape, stretched as √t. Replace t by x/U∞ and it is a rough model of a boundary layer growing along a plate, δ ∝ √(νx/U∞).' });
    } else {
      metrics.set([
        { k: 'Penetration depth 1/k', v: fmt(1e3 / sol.k, 4) + ' mm', s: 'k = √(ω/2ν)' },
        { k: 'Wavelength 2π/k', v: fmt(2 * PI * 1e3 / sol.k, 4) + ' mm' },
        { k: 'Wall shear amplitude', v: fmt(fl.mu * S.s2.U * sol.k * Math.SQRT2, 4) + ' Pa', s: 'leads the plate by 45°' },
      ]);
      L.push({ type: 'i', t: 'Stokes\' second problem', d: 'An oscillating plate sends damped shear waves into the fluid, u = U e^(−ky) cos(ωt − ky). They die out within a few 1/k = √(2ν/ω): faster oscillations reach less far. The same physics sets the thin oscillating boundary layer in pulsating flows.' });
    }
    insightsList(insEl, L);
  }

  function loop() {
    cancelAnimationFrame(raf); last = performance.now();
    const step = now => {
      if (!visible) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (playing) {
        if (S.problem === 'startup') { const tc = S.s.h ** 2 / (fl.mu / fl.rho); S.s.t = Math.min(tc * 0.8, S.s.t + dt * tc / 6); if (S.s.t >= tc * 0.8) S.s.t = 0; update(); }
        else if (S.problem === 'stokes1') { S.s1.t = S.s1.t * Math.exp(dt * 0.6); if (S.s1.t > 100) S.s1.t = 0.001; update(); }
        else if (S.problem === 'stokes2') { simT += dt / (2 * S.s2.f); simT %= 1000 / S.s2.f; update(); }
      }
      moveDots(dt); draw();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  build();
  return {
    controls, main,
    show() { visible = true; update(); loop(); },
    hide() { visible = false; cancelAnimationFrame(raf); },
    destroy() { visible = false; cancelAnimationFrame(raf); },
  };
}
