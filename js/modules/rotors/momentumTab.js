// Momentum theory: actuator disk, slipstream, propulsive efficiency against the jet-to-flight velocity ratio for
// propellers, turbofans, turbojets and rockets.
import { h, section, cssVar } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import * as X from '../../solvers/rotors.js';
import { bound, metricsGrid, insightsList, card, put, canvasBox } from '../propulsion/common.js';

export function momentumTab({ keep = o => o } = {}) {
  const S = keep({ T: 4000, D: 2.0, V: 50, rho: 1.225 });
  const controls = h('div'), main = h('div', { class: 'cf-main-inner' });
  const metrics = metricsGrid();
  const tube = canvasBox('cf-chart', '230px');
  const tCard = card('Stream tube through the disk', 'The stream tube contracts as the flow accelerates: half of the velocity gain happens ahead of the disk and half behind. Pressure jumps across the disk by Δp = T/A.');
  tCard.append(tube.el);
  const eCard = card('Propulsive efficiency vs jet speed ratio', 'η_p = 2/(1 + uₑ/u) (lecture 1). Bands show where each engine type sits in cruise. Dashed: specific thrust T/(ṁu) = uₑ/u − 1, which rises as efficiency falls: you trade efficiency for compactness.');
  const ePlot = new Plot(eCard, { xlabel: 'uₑ / u', ylabel: 'η_p  ·  T/(ṁu)', xname: 'uₑ/u', yname: '', logx: true, xfmt: v => v.toFixed(2), yfmt: v => v.toFixed(3), legendPos: 'bottom' });
  ePlot.wrap.style.height = '280px';
  const insCard = card('Notes'); const insEl = h('div'); insCard.append(insEl);
  main.append(metrics.el, tCard, h('div', { class: 'cf-grid2b' }, eCard, insCard));

  const build = () => {
    const s = section('Actuator disk');
    put(s.body,
      bound(S, 'T', 'Thrust', 1, 1e6, { step: 1, log: true, digits: 0, unit: 'N', onInput: run }),
      bound(S, 'D', 'Disk diameter', 0.05, 30, { step: 0.01, log: true, digits: 2, unit: 'm', onInput: run }),
      bound(S, 'V', 'Flight speed', 0, 300, { step: 0.5, digits: 1, unit: 'm/s', onInput: run }),
      bound(S, 'rho', 'Air density', 0.01, 1.3, { step: 0.001, digits: 3, unit: 'kg/m³', onInput: run, tip: 'Sea level 1.225; 10 km 0.414; Mars surface about 0.015.' }));
    controls.replaceChildren(s.el);
  };
  function run() {
    const A = X.actuatorDisk(S), c = n => cssVar(n);
    metrics.set([
      { k: 'Induced velocity at the disk', v: A.vi.toFixed(2) + ' m/s', s: `far wake ${A.ue.toFixed(1)} m/s` },
      { k: 'Ideal power', v: A.P >= 1e6 ? (A.P / 1e6).toFixed(2) + ' MW' : (A.P / 1000).toFixed(2) + ' kW', s: S.V > 0 ? `useful T·V ${(S.T * S.V / 1000).toFixed(2)} kW` : 'hover: all of it induced' },
      { k: 'Ideal efficiency', v: S.V > 0 ? (A.eta * 100).toFixed(1) + '%' : '—', s: `uₑ/u = ${S.V > 0 ? (A.ue / S.V).toFixed(3) : '∞'}` },
      { k: 'Disk loading', v: A.diskLoading.toFixed(0) + ' N/m²', s: `Δp across the disk` },
      { k: 'Mass flow through disk', v: (S.rho * A.A * (S.V + A.vi)).toFixed(2) + ' kg/s' },
      { k: 'Far-wake radius', v: (A.Rcontract * 100).toFixed(1) + '%', s: 'of the disk radius' },
    ]);
    const nu = []; for (let x = 1.001; x <= 30; x *= 1.03) nu.push(x);
    const band = (a, b, col) => ({ x0: a, x1: b, color: col });
    ePlot.setData({ series: [{ x: nu, y: nu.map(X.propulsiveEff), color: c('--upper'), label: 'propulsive efficiency', width: 2.4 }, { x: nu, y: nu.map(n => X.thrustRatio(n) / 10), color: c('--lower'), dash: [5, 4], label: 'specific thrust / 10' },
      ...(S.V > 0 ? [{ x: [A.ue / S.V], y: [X.propulsiveEff(A.ue / S.V)], color: c('--text'), line: false, points: true, pointSize: 5, noLegend: true, extra: () => 'this disk' }] : [])],
      vbands: [band(1.02, 1.3, c('--accent-soft')), band(1.3, 1.9, 'rgba(26,127,55,0.10)'), band(2.5, 5, 'rgba(178,106,0,0.10)')] });
    ePlot.setOpts({ ylim: [0, 1.05] });
    insightsList(insEl, [
      { type: 'i', t: 'Where engines sit', d: 'Propellers uₑ/u ≈ 1.02–1.3 (blue band), high-bypass turbofans ≈ 1.3–1.9 (green), turbojets ≈ 2.5–5 (orange). Rockets carry their own propellant, so their uₑ is set by chemistry (2–4.5 km/s) and η_p is only high when flight speed approaches uₑ.' },
      { type: 'i', t: 'Propellers vs windmills', d: 'If uₑ < u the "thrust" is negative and the disk extracts energy from the stream: a wind turbine. A windmilling propeller (engine failed, fixed pitch) does this and adds a lot of drag, which is why propellers are feathered.' },
      { type: 'i', t: 'Lecture 4 result', d: 'With all else fixed, maximum thrust per unit fuel power comes from accelerating the largest possible mass of air by the smallest possible amount, limited in practice by propeller size, tip Mach number and weight.' },
    ]);
    tube.set(({ W, H, g }) => {
      const cx = W * 0.45, cy = H / 2, Rd = Math.min(H * 0.32, 80), Lx = W * 0.4;
      // induced velocity along the axis of an actuator disk: v(x) = vᵢ(1 + x/√(x² + R²)); continuity gives the tube radius
      const R0 = Lx * 0.35;
      const rAt = x => { const v = A.vi * (1 + (x / R0) / Math.sqrt((x / R0) ** 2 + 1)); return Math.min(H * 0.48, Rd * Math.sqrt((S.V + A.vi) / Math.max(S.V + v, 1e-9))); };
      g.strokeStyle = cssVar('--upper'); g.lineWidth = 2;
      for (const sgn of [-1, 1]) { g.beginPath(); for (let x = -Lx; x <= Lx; x += 4) { const y = cy + sgn * rAt(x) ; x === -Lx ? g.moveTo(cx + x, y) : g.lineTo(cx + x, y); } g.stroke(); }
      g.fillStyle = cssVar('--lower'); g.fillRect(cx - 3, cy - Rd, 6, 2 * Rd);
      g.fillStyle = cssVar('--text-2'); g.font = '12px ' + cssVar('--mono'); g.textAlign = 'center';
      g.fillText(`V = ${S.V.toFixed(1)}`, cx - Lx * 0.85, cy);
      g.fillText(`V + vᵢ = ${(S.V + A.vi).toFixed(1)}`, cx, cy + Rd + 16);
      g.fillText(`V + 2vᵢ = ${(S.V + 2 * A.vi).toFixed(1)} m/s`, cx + Lx * 0.75, cy);
    });
  }
  build();
  return { controls, main, show() { run(); } };
}
