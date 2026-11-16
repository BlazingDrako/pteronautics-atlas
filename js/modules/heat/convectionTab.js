// Convection: Nusselt-number correlations for a flat plate, a cylinder or sphere in cross-flow and pipe flow, with
// temperature-dependent fluid properties, and the Reynolds (Chilton–Colburn) analogy between friction and heating.
import { h, section, cssVar } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import * as X from '../../solvers/heatTransfer.js';
import { bound, boundSeg, boundSelect, metricsGrid, insightsList, card, put } from '../propulsion/common.js';
import { table } from '../../lib/tabbed.js';

const GEOMS = { plate: 'Flat plate (parallel flow)', cylinder: 'Cylinder in cross-flow', sphere: 'Sphere', pipe: 'Inside a pipe' };
const LAB = { plate: 'Plate length L', cylinder: 'Diameter D', sphere: 'Diameter D', pipe: 'Pipe diameter D' };

export function convectionTab({ keep = o => o } = {}) {
  const S = keep({ geom: 'cylinder', fluid: 'air', V: 25, L: 0.0125, Tinf: 288, Ts: 330, p: 1, bc: 'T' });
  const controls = h('div'), main = h('div', { class: 'cf-main-inner' });
  const metrics = metricsGrid();
  const nCard = card('Nusselt number vs Reynolds number', 'The correlation for this geometry at the current Prandtl number; the dot is the current flow. Flat plate: laminar Nu = 0.664 Re^½ Pr^⅓, then mixed. Cylinder: Churchill–Bernstein. Sphere: Whitaker. Pipe: 3.66/4.36 laminar, Gnielinski turbulent (dashed: Dittus–Boelter).');
  const nPlot = new Plot(nCard, { xlabel: 'Reynolds number', ylabel: 'Nusselt number', xname: 'Re', yname: 'Nu', logx: true, logy: true, xfmt: v => v.toExponential(2), yfmt: v => v.toFixed(2), legendPos: 'bottom' });
  const hCard = card('Heat transfer coefficient vs speed', 'h = Nu·k/L for each fluid at the same geometry and temperatures. Liquids transfer far more heat than gases at the same speed, which is why engines are cooled by liquid propellant or oil, not air.');
  const hPlot = new Plot(hCard, { xlabel: 'speed (m/s)', ylabel: 'h (W/m²K)', xname: 'V', yname: 'h', logx: true, logy: true, xfmt: v => v.toFixed(2) + ' m/s', yfmt: v => v.toFixed(1), legendPos: 'bottom' });
  for (const p of [nPlot, hPlot]) p.wrap.style.height = '260px';
  const pCard = card('Fluid properties at the film temperature', 'Evaluated at T_f = (T_s + T_∞)/2.'); const pEl = h('div'); pCard.append(pEl);
  const insCard = card('Notes'); const insEl = h('div'); insCard.append(insEl);
  main.append(metrics.el, h('div', { class: 'cf-grid2b' }, nCard, hCard), h('div', { class: 'cf-grid2b' }, pCard, insCard));

  const build = () => {
    const s0 = section('Flow');
    put(s0.body,
      boundSelect(S, 'geom', 'Geometry', Object.entries(GEOMS).map(([value, label]) => ({ value, label })), () => { build(); run(); }),
      boundSelect(S, 'fluid', 'Fluid', Object.entries(X.FLUIDS).map(([value, f]) => ({ value, label: f.label })), run),
      bound(S, 'V', S.geom === 'pipe' ? 'Mean velocity' : 'Free-stream velocity', 0.01, 500, { step: 0.01, log: true, digits: 2, unit: 'm/s', onInput: run }),
      bound(S, 'L', LAB[S.geom], 0.0005, 5, { step: 0.0001, log: true, digits: 4, unit: 'm', onInput: run }),
      bound(S, 'Tinf', S.geom === 'pipe' ? 'Bulk fluid temperature' : 'Fluid temperature', 250, 900, { step: 1, digits: 0, unit: 'K', onInput: run }),
      bound(S, 'Ts', 'Surface temperature', 250, 1200, { step: 1, digits: 0, unit: 'K', onInput: run }),
      S.fluid === 'air' || S.fluid === 'hydrogen' ? bound(S, 'p', 'Pressure', 0.01, 100, { step: 0.01, log: true, digits: 2, unit: 'atm', onInput: run }) : null,
      S.geom === 'pipe' ? boundSeg(S, 'bc', 'Wall condition (laminar)', [{ value: 'T', label: 'Constant T (3.66)' }, { value: 'q', label: 'Constant q (4.36)' }], run) : null);
    controls.replaceChildren(s0.el, h('div', { class: 'hint', style: { padding: '0 4px' } }, 'Lecture 19 example: a cylinder in air cross-flow; Churchill–Bernstein holds for Re·Pr > 0.2.'));
  };

  function run() {
    const o = { geom: S.geom, fluid: S.fluid, V: S.V, L: S.L, Tinf: S.Tinf, Ts: S.Ts, p: S.p * 101325, bc: S.bc };
    const C = X.convection(o), c = n => cssVar(n);
    const Res = []; for (let r = 1; r <= 1e7; r *= 1.12) Res.push(r);
    nPlot.setData({ series: [{ x: Res, y: Res.map(r => X.nusselt(S.geom, r, C.Pr, { bc: S.bc }).Nu), color: c('--upper'), label: GEOMS[S.geom] },
      ...(S.geom === 'pipe' ? [{ x: Res.filter(r => r > 1e4), y: Res.filter(r => r > 1e4).map(r => 0.023 * r ** 0.8 * C.Pr ** 0.4), color: c('--lower'), dash: [5, 4], label: 'Dittus–Boelter' }] : []),
      { x: [C.Re], y: [C.Nu], color: c('--text'), line: false, points: true, pointSize: 5, noLegend: true }] });
    const Vs = []; for (let v = 0.01; v <= 500; v *= 1.15) Vs.push(v);
    hPlot.setData({ series: Object.entries(X.FLUIDS).map(([id, f], i) => ({ x: Vs, y: Vs.map(v => X.convection({ ...o, fluid: id, V: v }).h), color: c(['--upper', '--lower', '--warn', '--good'][i]), label: f.label, width: id === S.fluid ? 2.6 : 1.3 })) });
    const P = C.P;
    pEl.replaceChildren(table(['Property', 'value'], [['Film temperature', C.Tf.toFixed(1) + ' K'], ['Density ρ', P.rho.toFixed(4) + ' kg/m³'], ['Viscosity μ', P.mu.toExponential(3) + ' Pa·s'], ['Kinematic viscosity ν', P.nu.toExponential(3) + ' m²/s'], ['Conductivity k', P.k.toFixed(4) + ' W/m·K'], ['cp', P.cp.toFixed(0) + ' J/kg·K'], ['Prandtl number', P.Pr.toFixed(3)], ['Thermal diffusivity α', P.alpha.toExponential(3) + ' m²/s']]));
    metrics.set([
      { k: 'Reynolds number', v: C.Re < 1e5 ? C.Re.toFixed(0) : C.Re.toExponential(3), s: C.regime },
      { k: 'Nusselt number', v: C.Nu.toFixed(2) },
      { k: 'Heat transfer coefficient', v: C.h.toFixed(C.h < 100 ? 2 : 0) + ' W/m²K' },
      { k: 'Heat flux', v: (C.q / 1000).toFixed(3) + ' kW/m²', s: `${(C.Q).toFixed(1)} W ${C.areaNote}` },
      { k: 'Stanton number', v: C.St.toExponential(3), s: `St·Pr^⅔ = ${C.colburn.toExponential(3)}` },
      ...(C.analogy ? [{ k: 'Cf/2 (friction)', v: C.analogy.toExponential(3), s: `analogy ratio ${(C.colburn / C.analogy).toFixed(3)}` }] : []),
    ]);
    const L = [];
    if (S.geom === 'plate') L.push({ type: 'i', t: 'Reynolds analogy check', d: `Chilton–Colburn predicts St·Pr^⅔ = Cf/2. Here ${C.colburn.toExponential(3)} vs ${C.analogy.toExponential(3)}: they agree exactly for the laminar plate, and closely once it is turbulent.` });
    if (S.geom === 'cylinder' && C.Re * C.Pr < 0.2) L.push({ type: 'w', t: 'Outside the correlation range', d: 'Churchill–Bernstein needs Re·Pr > 0.2.' });
    L.push({ type: 'i', t: 'Why the film temperature', d: 'Properties change across the boundary layer, and the mean of wall and free-stream temperatures is a good compromise for most correlations.' });
    insightsList(insEl, L);
  }
  build();
  return { controls, main, show() { run(); } };
}
