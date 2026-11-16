// Propeller by blade element momentum theory: performance at one condition, the C_T, C_P and η maps against
// advance ratio for several pitches, and the load and angle of attack along the blade.
import { h, section, cssVar } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import * as X from '../../solvers/rotors.js';
import { bound, boundSelect, metricsGrid, insightsList, card, put, canvasBox } from '../propulsion/common.js';

const DEG = Math.PI / 180;
const PRESETS = [
  { id: 'c172', label: 'Cessna 172 fixed-pitch (75 in)', o: { D: 1.905, B: 2, c75: 0.13, taper: 0.55, PD: 0.75, rpm: 2400, V: 55 } },
  { id: 'cs', label: 'Turboprop, 4 blades (ATR-like)', o: { D: 3.93, B: 6, c75: 0.2, taper: 0.6, PD: 1.6, rpm: 1200, V: 140 } },
  { id: 'drone', label: 'Drone propeller 10 × 4.5 in', o: { D: 0.254, B: 2, c75: 0.022, taper: 0.5, PD: 0.45, rpm: 6000, V: 0 } },
  { id: 'racer', label: 'Race drone 5 × 4.3 in', o: { D: 0.127, B: 3, c75: 0.013, taper: 0.6, PD: 0.86, rpm: 25000, V: 20 } },
];

export function bemtTab({ keep = o => o } = {}) {
  const S = keep({ preset: 'c172', ...PRESETS[0].o, rho: 1.225, Clmax: 1.3, Cd0: 0.012 });
  const controls = h('div'), main = h('div', { class: 'cf-main-inner' });
  const metrics = metricsGrid();
  const view = canvasBox('cf-chart', '220px');
  const vCard = card('Blade and the flow at 75% radius', 'Left: blade planform (chord to scale along the radius, stalled sections red). Right: the velocity triangle at 0.75R: axial inflow V + vᵢ, tangential Ωr − u_t/2, the resulting inflow angle φ, the blade pitch β and the angle of attack α = β − φ.');
  vCard.append(view.el);
  const mCard = card('Propeller map', 'C_T (blue), C_P (red) and efficiency η = J·C_T/C_P (green) against advance ratio J = V/(nD), for the current pitch (solid) and ±0.25 P/D (dashed, dotted). Past the point where C_T crosses zero the propeller is windmilling.');
  const mPlot = new Plot(mCard, { xlabel: 'advance ratio J = V/(nD)', ylabel: 'η  ·  10 C_T  ·  10 C_P', xname: 'J', yname: '', xfmt: v => v.toFixed(3), yfmt: v => v.toFixed(3), legendPos: 'above' });
  const sCard = card('Along the blade', 'Thrust per unit radius and angle of attack along the span. Tip loss drives the load to zero at the tip; a well-matched pitch keeps α near the airfoil\'s best value everywhere.');
  const sPlot = new Plot(sCard, { xlabel: 'r / R', ylabel: 'dT/dr (scaled) · α (°)', xname: 'r/R', yname: '', xfmt: v => v.toFixed(3), yfmt: v => v.toFixed(2), legendPos: 'bottom' });
  for (const p of [mPlot, sPlot]) p.wrap.style.height = '270px';
  const insCard = card('Notes'); const insEl = h('div'); insCard.append(insEl);
  main.append(metrics.el, vCard, h('div', { class: 'cf-grid2b' }, mCard, sCard), insCard);

  const af = () => ({ Clmax: S.Clmax, Cd0: S.Cd0 });
  const geo = (dPD = 0, N = 40) => X.bladeGeometry({ D: S.D, B: Math.round(S.B), c75: S.c75, taper: S.taper, pitch: (S.PD + dPD) * S.D }, N);
  const build = () => {
    const s0 = section('Propeller');
    put(s0.body,
      boundSelect(S, 'preset', 'Example', [...PRESETS.map(p => ({ value: p.id, label: p.label })), { value: 'custom', label: 'Custom' }], v => { const p = PRESETS.find(x => x.id === v); if (p) Object.assign(S, p.o); build(); run(); }),
      bound(S, 'D', 'Diameter', 0.05, 6, { step: 0.001, log: true, digits: 3, unit: 'm', onInput: () => { S.preset = 'custom'; run(); } }),
      bound(S, 'B', 'Blades', 2, 8, { step: 1, digits: 0, onInput: () => { S.preset = 'custom'; run(); } }),
      bound(S, 'c75', 'Chord at 0.75R', 0.005, 0.5, { step: 0.001, log: true, digits: 3, unit: 'm', onInput: () => { S.preset = 'custom'; run(); } }),
      bound(S, 'taper', 'Tip/0.75R chord ratio', 0.3, 1.2, { step: 0.01, digits: 2, onInput: () => { S.preset = 'custom'; run(); } }),
      bound(S, 'PD', 'Pitch/diameter P/D', 0.2, 2.5, { step: 0.01, digits: 2, onInput: () => { S.preset = 'custom'; run(); }, tip: 'Geometric pitch: the advance per revolution if the blade moved through the air like a screw through wood. A variable-pitch propeller changes it in flight.' }));
    const s1 = section('Operating condition');
    put(s1.body,
      bound(S, 'rpm', 'Speed', 300, 40000, { step: 10, log: true, digits: 0, unit: 'rpm', onInput: run }),
      bound(S, 'V', 'Flight speed', 0, 250, { step: 0.5, digits: 1, unit: 'm/s', onInput: run }),
      bound(S, 'rho', 'Air density', 0.01, 1.3, { step: 0.001, digits: 3, unit: 'kg/m³', onInput: run }),
      bound(S, 'Clmax', 'Section C_l,max', 0.8, 1.8, { step: 0.01, digits: 2, onInput: run }),
      bound(S, 'Cd0', 'Section minimum C_d', 0.005, 0.04, { step: 0.001, digits: 3, onInput: run }));
    controls.replaceChildren(s0.el, s1.el);
  };

  // the map re-solves ~150 operating points, so it waits until the controls stop moving
  let mapTimer = null;
  function scheduleMap(r) {
    clearTimeout(mapTimer);
    mapTimer = setTimeout(() => drawMap(r), 120);
  }
  function drawMap(r) {
    const c = x => cssVar(x), n = S.rpm / 60;
    const Js = []; for (let j = 0.02; j <= 2.6 * S.PD / 1.4 + 0.4; j += 0.04) Js.push(j);
    const series = [];
    [[0, null], [-0.25, [5, 4]], [0.25, [1.5, 3]]].forEach(([d, dash]) => {
      const g2 = geo(d, 20); if (S.PD + d <= 0.05) return;
      const res = Js.map(J => X.bemt(g2, { V: J * n * S.D, rpm: S.rpm, rho: S.rho, af: af() }));
      const lab = d === 0 ? '' : ` (P/D ${(S.PD + d).toFixed(2)})`;
      series.push({ x: Js, y: res.map(q => q.CT * 10), color: c('--upper'), dash, label: '10 C_T' + lab, noLegend: d !== 0 });
      series.push({ x: Js, y: res.map(q => q.CP * 10), color: c('--lower'), dash, label: '10 C_P' + lab, noLegend: d !== 0 });
      series.push({ x: Js, y: res.map(q => (q.T > 0 && q.eta > 0 && q.eta < 1 ? q.eta : NaN)), color: c('--good'), dash, label: 'η' + lab, noLegend: d !== 0 });
    });
    series.push({ x: [r.J], y: [S.V > 0 && r.eta > 0 && r.eta < 1 ? r.eta : r.CT * 10], color: c('--text'), line: false, points: true, pointSize: 5, noLegend: true });
    mPlot.setData({ series });
    mPlot.setOpts({ ylim: [-0.5, 1.6] });
  }
  function run() {
    const G = geo(), n = S.rpm / 60;
    const r = X.bemt(G, { V: S.V, rpm: S.rpm, rho: S.rho, af: af() });
    const kW = v => Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(2) + ' MW' : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(2) + ' kW' : v.toFixed(1) + ' W';
    metrics.set([
      { k: 'Thrust', v: Math.abs(r.T) >= 1e3 ? (r.T / 1e3).toFixed(2) + ' kN' : r.T.toFixed(1) + ' N', s: `${(r.T / 4.448).toFixed(0)} lbf`, cls: r.T < 0 ? 'bad' : '' },
      { k: 'Shaft power', v: kW(r.P), s: `${(r.P / 745.7).toFixed(1)} hp` },
      { k: 'Efficiency', v: S.V > 0 && r.T > 0 ? (r.eta * 100).toFixed(1) + '%' : '—', s: S.V > 0 ? '' : `figure of merit ${r.FM.toFixed(3)}` },
      { k: 'Advance ratio J', v: r.J.toFixed(3) },
      { k: 'C_T, C_P', v: `${r.CT.toFixed(4)}, ${r.CP.toFixed(4)}`, s: `C_Q ${r.CQ.toFixed(5)}` },
      { k: 'Tip Mach (helical)', v: (Math.hypot(r.tipSpeed, S.V) / 340.3).toFixed(3), s: `tip speed ${r.tipSpeed.toFixed(0)} m/s`, cls: Math.hypot(r.tipSpeed, S.V) / 340.3 > 0.85 ? 'bad' : '' },
    ]);
    const c = x => cssVar(x);
    scheduleMap(r);
    const mx = Math.max(...r.span.map(e => Math.abs(e.dTdr)));
    sPlot.setData({ series: [{ x: r.span.map(e => e.x), y: r.span.map(e => e.dTdr / mx * 10), color: c('--upper'), label: 'dT/dr (max = 10)' }, { x: r.span.map(e => e.x), y: r.span.map(e => e.alpha / DEG), color: c('--lower'), label: 'α (°)' }, { x: r.span.map(e => e.x), y: r.span.map(e => e.beta / DEG / 5), color: c('--text-3'), dash: [4, 4], label: 'β/5 (°)' }] });
    const st = r.span.filter(e => e.stalled).length;
    const L = [];
    if (S.V === 0) L.push({ type: 'i', t: `Static thrust: figure of merit ${r.FM.toFixed(2)}`, d: `An ideal actuator disk would need ${kW(X.actuatorDisk({ T: Math.max(r.T, 0), D: S.D, rho: S.rho }).Phover)} for this thrust; FM = ideal/actual. At V = 0 a high-pitch propeller has its blades stalled.` });
    if (st) L.push({ type: 'w', t: `${st} of ${r.span.length} sections stalled`, d: 'The angle of attack is past C_l,max there (common at take-off with a high-pitch fixed propeller, or when climbing slowly).' });
    if (r.T < 0) L.push({ type: 'b', t: 'Windmilling', d: 'J is so high that the blades meet the air at a negative angle of attack: the propeller is extracting power from the airstream and making drag.' });
    L.push({ type: 'i', t: 'Model', d: 'Blade element momentum theory with Prandtl tip loss, swirl from the torque balance, a linear-lift airfoil with a stall plateau and a parabolic drag polar. No compressibility, hub or nacelle effects.' });
    insightsList(insEl, L);
    // drawing
    view.set(({ W, H, g }) => {
      const R = S.D / 2, x0 = 20, x1 = W * 0.55 - 10, sc = (x1 - x0) / R, cy = H / 2;
      g.fillStyle = cssVar('--bg-sunk'); g.strokeStyle = cssVar('--text-2'); g.lineWidth = 1.5;
      g.beginPath(); g.arc(x0, cy, Math.max(4, 0.12 * R * sc), 0, 7); g.fill(); g.stroke();
      const cmax = Math.max(...r.span.map(e => e.c)), cs = Math.min(sc, (H * 0.7) / cmax);
      for (const e of r.span) { g.fillStyle = e.stalled ? cssVar('--bad') : cssVar('--upper'); g.globalAlpha = 0.6; const w = (e.c * cs); g.fillRect(x0 + e.r * sc - (R * sc / r.span.length) / 2, cy - w / 2, R * sc / r.span.length + 0.5, w); }
      g.globalAlpha = 1;
      // triangle at 0.75R
      const e = r.span.reduce((a, b) => (Math.abs(b.x - 0.75) < Math.abs(a.x - 0.75) ? b : a));
      const ua = S.V + e.vi, ut = 2 * Math.PI * S.rpm / 60 * e.r - e.ut / 2;
      const ox = W * 0.62, oy = H - 24, ts = Math.min((W - ox - 24) / ut, (H - 50) / Math.max(ua, 1));
      const arr = (ax, ay, bx, by, col) => { g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); const a = Math.atan2(by - ay, bx - ax); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - 7 * Math.cos(a - 0.4), by - 7 * Math.sin(a - 0.4)); g.lineTo(bx - 7 * Math.cos(a + 0.4), by - 7 * Math.sin(a + 0.4)); g.fill(); };
      arr(ox, oy, ox + ut * ts, oy, cssVar('--text-3'));
      arr(ox + ut * ts, oy, ox + ut * ts, oy - ua * ts, cssVar('--upper'));
      arr(ox, oy, ox + ut * ts, oy - ua * ts, cssVar('--lower'));
      // blade chord line at pitch β
      const L2 = Math.min(ut * ts * 0.6, 90);
      g.strokeStyle = cssVar('--text'); g.lineWidth = 3; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + L2 * Math.cos(e.beta), oy - L2 * Math.sin(e.beta)); g.stroke();
      g.fillStyle = cssVar('--text-2'); g.font = '11px ' + cssVar('--mono'); g.textAlign = 'left';
      g.fillText(`φ ${(e.phi / DEG).toFixed(1)}°  β ${(e.beta / DEG).toFixed(1)}°  α ${(e.alpha / DEG).toFixed(1)}°`, ox, 16);
      g.fillText(`Ωr ${ut.toFixed(0)} m/s`, ox, oy + 16);
      g.fillText(`V+vᵢ ${ua.toFixed(1)}`, ox + ut * ts - 70, oy - ua * ts - 6);
    });
  }
  build();
  return { controls, main, show() { run(); }, hide() { clearTimeout(mapTimer); }, destroy() { clearTimeout(mapTimer); } };
}
