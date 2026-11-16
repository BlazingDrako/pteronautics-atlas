// Solid motors: grain cross-section burnback (distance from the initial port), burning area and Kn against web
// burned, and the internal ballistics r = a·Pcⁿ that turn them into chamber pressure and thrust against time.
import { h, section, cssVar, icon } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import * as X from '../../solvers/rocketSystems.js';
import { bound, boundSeg, boundSelect, boundToggle, metricsGrid, insightsList, card, put, heat } from './common.js';
import { canvasBox } from '../propulsion/common.js';

export function solidTab({ keep = o => o } = {}) {
  const S = keep({ preset: 'tactical', ...X.MOTORS[1], amb: 'sl', etaF: 0.95, view: 0.3, rRef: null, nExp: null, off: 0.012 });
  const controls = h('div'), main = h('div', { class: 'cf-main-inner' });
  const metrics = metricsGrid();
  const xs = canvasBox('cf-chart', '300px');
  const xsCard = card('Grain cross-section', 'Propellant colored by when it burns (blue early, yellow last). The burning surface moves outward at the same speed everywhere, so every front is a curve of constant distance from the initial port. Drag the slider to burn the grain.');
  const yS = h('input', { type: 'range', min: 0, max: 1000, value: S.view * 1000, style: { width: '100%' }, 'aria-label': 'web burned' });
  const play = h('button', { class: 'btn sm', type: 'button' }, icon('play', 14), ' Burn');
  xsCard.append(h('div', { class: 'row', style: { gap: '8px', marginBottom: '6px' } }, play, yS), xs.el);
  const pCard = card('Chamber pressure and thrust', 'Quasi-steady ballistics: mass burned = mass leaving the throat, ρₚ·r·A_b = Pc·At/c*, with r = a·Pcⁿ, gives Pc = (Kn ρₚ a c*)^(1/(1−n)). Because n < 1 the motor is stable; the 1/(1−n) power makes Pc very sensitive to Kn.');
  const pPlot = new Plot(pCard, { xlabel: 'time (s)', ylabel: 'Pc (MPa) · thrust (scaled)', xname: 't', yname: '', xfmt: v => v.toFixed(2) + ' s', yfmt: v => v.toFixed(3), legendPos: 'bottom' });
  const kCard = card('Burning area ratio Kn vs web burned', 'Kn = A_b/A_t. Rising: progressive; flat: neutral; falling: regressive. A tube burning only inside is progressive, a star roughly neutral until its points burn out, leaving slivers.');
  const kPlot = new Plot(kCard, { xlabel: 'web burned (mm)', ylabel: 'Kn', xname: 'y', yname: 'Kn', xfmt: v => v.toFixed(1) + ' mm', yfmt: v => v.toFixed(0) });
  for (const p of [pPlot, kPlot]) p.wrap.style.height = '250px';
  const insCard = card('Notes'); const insEl = h('div'); insCard.append(insEl);
  main.append(metrics.el, h('div', { class: 'cf-grid2b' }, xsCard, insCard), h('div', { class: 'cf-grid2b' }, pCard, kCard));

  const geo = () => ({ grain: S.grain, D: S.D, L: S.L, rp: S.rp, ro: S.ro, nPts: Math.round(S.nPts), rs: S.rs, w: S.w, off: S.off, ends: S.ends });
  let B = null, M = null, geoKey = '';
  const build = () => {
    syncRates();
    const s0 = section('Motor');
    put(s0.body,
      boundSelect(S, 'preset', 'Example motor', [...X.MOTORS.map(m => ({ value: m.id, label: m.label })), { value: 'custom', label: 'Custom' }], v => { const m = X.MOTORS.find(x => x.id === v); if (m) { Object.assign(S, m, { rRef: null, nExp: null, amb: v === 'finocyl' ? 'vac' : 'sl' }); } build(); run(); }, 'Approximate geometries chosen to show each grain type; the SRB-like booster is a single star grain, not the real four-segment motor.'),
      boundSelect(S, 'prop', 'Propellant', Object.entries(X.SOLID_PROPS).map(([value, p]) => ({ value, label: p.label })), () => { S.rRef = null; S.nExp = null; build(); run(); }),
      bound(S, '_r', 'Burn rate at 6.9 MPa', 1, 40, { step: 0.1, digits: 1, unit: 'mm/s', onInput: v => { S.rRef = v / 1000; run(); } }),
      bound(S, '_n', 'Pressure exponent n', 0.1, 0.8, { step: 0.01, digits: 2, onInput: v => { S.nExp = v; run(); }, tip: 'Saint-Robert / Vieille law r = a·Pcⁿ. n must be below 1 for stable burning; low n makes the motor less sensitive to Kn and temperature.' }),
      boundSeg(S, 'amb', 'Ambient', [{ value: 'sl', label: 'Sea level' }, { value: 'vac', label: 'Vacuum' }], run));
    const s1 = section('Grain');
    const g = S.grain;
    put(s1.body,
      boundSelect(S, 'grain', 'Port shape', Object.entries(X.GRAINS).map(([value, label]) => ({ value, label })), () => { S.preset = 'custom'; build(); run(); }),
      bound(S, 'D', 'Grain outer diameter', 0.02, 4, { step: 0.001, log: true, digits: 3, unit: 'm', onInput: () => { S.preset = 'custom'; run(); } }),
      bound(S, 'L', 'Grain length', 0.05, 50, { step: 0.01, log: true, digits: 2, unit: 'm', onInput: () => { S.preset = 'custom'; run(); } }),
      g !== 'end' ? bound(S, 'rp', g === 'star' ? 'Star valley radius' : 'Port radius', 0.001, S.D / 2 * 0.9, { step: 0.0005, digits: 4, unit: 'm', onInput: () => { S.preset = 'custom'; run(); } }) : null,
      g === 'star' ? bound(S, 'ro', 'Star point radius', 0.002, S.D / 2 * 0.95, { step: 0.0005, digits: 4, unit: 'm', onInput: () => { S.preset = 'custom'; run(); } }) : null,
      g === 'star' || g === 'finocyl' ? bound(S, 'nPts', g === 'star' ? 'Star points' : 'Slots', 3, 14, { step: 1, digits: 0, onInput: () => { S.preset = 'custom'; run(); } }) : null,
      g === 'finocyl' ? bound(S, 'rs', 'Slot tip radius', 0.002, S.D / 2 * 0.95, { step: 0.0005, digits: 4, unit: 'm', onInput: () => { S.preset = 'custom'; run(); } }) : null,
      g === 'finocyl' ? bound(S, 'w', 'Slot width', 0.001, S.D / 4, { step: 0.0005, digits: 4, unit: 'm', onInput: () => { S.preset = 'custom'; run(); } }) : null,
      g === 'moon' ? bound(S, 'off', 'Port offset from center', 0, S.D / 2 * 0.8, { step: 0.0005, digits: 4, unit: 'm', onInput: () => { S.preset = 'custom'; run(); } }) : null,
      g !== 'end' ? boundToggle(S, 'ends', 'Ends burning (uninhibited)', () => { S.preset = 'custom'; run(); }, 'Both grain ends burn as well, so the grain also gets shorter. BATES grains do this deliberately to stay nearly neutral.') : null);
    const s2 = section('Nozzle');
    put(s2.body,
      bound(S, 'Dt', 'Throat diameter', 0.002, 2, { step: 0.0005, log: true, digits: 4, unit: 'm', onInput: () => { S.preset = 'custom'; run(); } }),
      bound(S, 'eps', 'Expansion ratio Ae/At', 1.5, 80, { step: 0.1, log: true, digits: 1, onInput: run }),
      bound(S, 'etaF', 'Thrust efficiency (two-phase, divergence)', 0.85, 1, { step: 0.005, digits: 3, onInput: run }));
    controls.replaceChildren(s0.el, s1.el, s2.el);
  };

  function run() {
    const P = X.SOLID_PROPS[S.prop];
    const k = JSON.stringify(geo());
    if (k !== geoKey) { B = X.grainBurnback(geo(), 241); geoKey = k; }
    M = X.solidMotor({ ...geo(), prop: S.prop, rRef: S.rRef ?? P.rRef, n: S.nExp ?? P.n, Dt: S.Dt, eps: S.eps, etaF: S.etaF, pa: S.amb === 'vac' ? 0 : 101325, burnback: B });
    const ttl = v => v >= 1e6 ? (v / 1e6).toFixed(2) + ' MN' : v >= 1e3 ? (v / 1e3).toFixed(2) + ' kN' : v.toFixed(1) + ' N';
    const imp = v => v >= 1e6 ? (v / 1e6).toFixed(2) + ' MN·s' : v >= 1e3 ? (v / 1e3).toFixed(2) + ' kN·s' : v.toFixed(1) + ' N·s';
    metrics.set([
      { k: 'Total impulse', v: imp(M.I), s: M.I < 4e5 ? `motor class ${M.cls}` : '' },
      { k: 'Burn time', v: M.tb.toFixed(M.tb < 10 ? 2 : 1) + ' s', s: `web ${(M.webMax * 1000).toFixed(1)} mm` },
      { k: 'Average thrust', v: ttl(M.Favg), s: `peak ${ttl(M.Fmax)}` },
      { k: 'Max chamber pressure', v: (M.Pmax / 1e6).toFixed(2) + ' MPa', s: `${(M.Pmax / 6894.76).toFixed(0)} psi`, cls: M.Pmax > 15e6 ? 'bad' : '' },
      { k: 'Delivered Isp', v: M.Isp.toFixed(0) + ' s', s: S.amb === 'vac' ? 'vacuum' : 'sea level' },
      { k: 'Propellant mass', v: M.mp0 >= 1000 ? (M.mp0 / 1000).toFixed(2) + ' t' : M.mp0.toFixed(M.mp0 < 10 ? 3 : 1) + ' kg', s: `volumetric loading ${((1 - B.Aport0 / B.Acase) * 100).toFixed(0)}%` },
      { k: 'Kn (start → 85%)', v: `${M.Kn0.toFixed(0)} → ${M.KnEnd.toFixed(0)}`, s: M.shape },
      { k: 'Port-to-throat area', v: B.end ? '—' : M.minPortRatio.toFixed(2), s: 'erosive burning below ~2', cls: !B.end && M.minPortRatio < 2 ? 'bad' : '' },
    ]);
    const c = n => cssVar(n), Fs = Math.max(...M.Pc) / Math.max(...M.F, 1);
    pPlot.setData({ series: [{ x: M.t, y: M.Pc.map(p => p / 1e6), color: c('--lower'), label: 'Pc (MPa)' }, { x: M.t, y: M.F.map(f => f * Fs / 1e6), color: c('--upper'), label: `thrust (peak ${ttl(M.Fmax)})`, extra: i => 'F = ' + ttl(M.F[i]) }] });
    pPlot.setOpts({ yZero: true });
    kPlot.setData({ series: [{ x: M.y.map(y => y * 1000), y: M.Kn, color: c('--good'), label: 'Kn' }] });
    kPlot.setOpts({ yZero: true });
    const L = [];
    if (M.Pmax > 15e6) L.push({ type: 'b', t: 'Pressure too high', d: 'Above ~15 MPa the case becomes very heavy. Increase the throat or reduce the burning area.' });
    if (!B.end && M.minPortRatio < 2) L.push({ type: 'w', t: 'Erosive burning likely', d: `The port is only ${M.minPortRatio.toFixed(2)}× the throat area, so the gas races along the surface and scrubs it, raising the burn rate near the aft end (the pressure spike at ignition is larger than predicted here).` });
    L.push({ type: 'i', t: `Burn rate ${(M.r[0] * 1000).toFixed(2)} mm/s at ignition`, d: `a = ${M.a.toExponential(3)} m/s·Pa⁻ⁿ, n = ${M.n.toFixed(2)}. Doubling Kn would multiply Pc by 2^(1/(1−n)) = ${(2 ** (1 / (1 - M.n))).toFixed(2)}.` });
    L.push({ type: 'i', t: 'Model limits', d: 'Quasi-steady (no ignition transient or gas storage), uniform burn rate (no erosive burning or temperature sensitivity), constant throat, fixed c*. The cross-section is burned back on a 241 × 241 grid.' });
    insightsList(insEl, L);
    drawXS();
  }
  // cross-section
  let img = null, imgKey = '';
  function drawXS() {
    xs.set(({ W, H, g }) => {
      const y = S.view * M.webMax;
      const size = Math.min(W, H) - 16, x0 = (W - size) / 2, y0 = (H - size) / 2;
      if (B.end) {
        g.fillStyle = cssVar('--text-2'); g.font = '12px ' + cssVar('--font'); g.textAlign = 'center';
        const Lb = S.L * (1 - S.view), w = Math.min(W - 40, 360), sc = w / S.L, hh = S.D * sc;
        g.fillStyle = cssVar('--bg-sunk'); g.fillRect(20, H / 2 - hh / 2, w, hh);
        g.fillStyle = `rgb(${heat(0.4).join(',')})`; g.fillRect(20, H / 2 - hh / 2, Lb * sc, hh);
        g.fillStyle = cssVar('--warn'); g.fillRect(20 + Lb * sc - 2, H / 2 - hh / 2, 3, hh);
        g.fillStyle = cssVar('--text-2'); g.fillText('end burner: side view, burning face moves forward', W / 2, H - 10);
        return;
      }
      const N = B.N, key = geoKey;
      if (key !== imgKey) {
        img = new ImageData(N, N); imgKey = key;
      }
      const d = img.data;
      for (let k = 0; k < N * N; k++) {
        const v = B.dist[k];
        let col;
        if (v < 0) col = [0, 0, 0, 0];
        else if (B.mask[k] || v <= y) col = [30, 30, 36, 255];
        else { const c2 = heat(v / B.web); col = [c2[0], c2[1], c2[2], 255]; }
        d[k * 4] = col[0]; d[k * 4 + 1] = col[1]; d[k * 4 + 2] = col[2]; d[k * 4 + 3] = col[3];
      }
      const off = document.createElement('canvas'); off.width = N; off.height = N; off.getContext('2d').putImageData(img, 0, 0);
      g.imageSmoothingEnabled = true; g.drawImage(off, x0, y0, size, size);
      g.strokeStyle = cssVar('--text-2'); g.lineWidth = 2; g.beginPath(); g.arc(W / 2, H / 2, size / 2, 0, 7); g.stroke();
      g.fillStyle = cssVar('--text-2'); g.font = '12px ' + cssVar('--mono'); g.textAlign = 'left';
      const i = Math.min(M.y.length - 1, Math.round(S.view * (M.y.length - 1)));
      g.fillText(`t ${M.t[i].toFixed(2)} s`, 8, 16); g.fillText(`web ${(y * 1000).toFixed(1)} mm`, 8, 32); g.fillText(`Pc ${(M.Pc[i] / 1e6).toFixed(2)} MPa`, 8, 48);
    });
  }
  yS.addEventListener('input', () => { S.view = yS.value / 1000; drawXS(); });
  let raf = null;
  play.addEventListener('click', () => {
    cancelAnimationFrame(raf); S.view = 0; let last = performance.now();
    const step = t => { S.view = Math.min(1, S.view + (t - last) / 6000); last = t; yS.value = S.view * 1000; drawXS(); if (S.view < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  });
  // the burn-rate sliders show the propellant's value until edited
  function syncRates() { const P = X.SOLID_PROPS[S.prop]; S._r = (S.rRef ?? P.rRef) * 1000; S._n = S.nExp ?? P.n; }
  build();
  return { controls, main, show() { build(); run(); }, hide() { cancelAnimationFrame(raf); }, destroy() { cancelAnimationFrame(raf); } };
}
