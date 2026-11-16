// Conduction: layered plane, cylindrical or spherical walls between fixed temperatures or fluids, with optional
// radiation from the outer surface; temperature profile and the thermal resistance network.
import { h, section, select, cssVar } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import * as X from '../../solvers/heatTransfer.js';
import { bound, boundSeg, boundSelect, boundToggle, metricsGrid, insightsList, card, put } from '../propulsion/common.js';
import { table } from '../../lib/tabbed.js';

const MATS = Object.entries(X.MATERIALS).map(([value, m]) => ({ value, label: `${m.label} (k ${m.k})` }));
const EX = [
  { id: 'slab', label: 'Copper slab, both faces held (lecture 18)', o: { geom: 'plane', layers: [{ mat: 'copper', k: 372, t: 0.01 }], inBC: 'T', Tin: 400, outBC: 'T', Tout: 300 } },
  { id: 'compound', label: 'Two-layer wall: copper + steel', o: { geom: 'plane', layers: [{ mat: 'copper', k: 372, t: 0.005 }, { mat: 'steel', k: 50, t: 0.005 }], inBC: 'T', Tin: 500, outBC: 'T', Tout: 300 } },
  { id: 'tube', label: 'Copper tube, fixed wall temperatures', o: { geom: 'cyl', r0: 0.01, layers: [{ mat: 'copper', k: 372, t: 0.002 }], inBC: 'T', Tin: 400, outBC: 'T', Tout: 300 } },
  { id: 'nozzle', label: 'Regeneratively cooled nozzle wall', o: { geom: 'plane', layers: [{ mat: 'zirconia', k: 1.5, t: 0.0002 }, { mat: 'copper', k: 372, t: 0.001 }], inBC: 'h', Tin: 3400, hin: 20000, outBC: 'h', Tout: 150, hout: 100000, rad: false } },
  { id: 'pipe', label: 'Insulated steam pipe', o: { geom: 'cyl', r0: 0.05, layers: [{ mat: 'steel', k: 50, t: 0.005 }, { mat: 'fiberglass', k: 0.04, t: 0.04 }], inBC: 'h', Tin: 450, hin: 5000, outBC: 'h', Tout: 293, hout: 10, rad: true, eps: 0.8 } },
  { id: 'tile', label: 'Shuttle tile over aluminum skin', o: { geom: 'plane', layers: [{ mat: 'tile', k: 0.05, t: 0.05 }, { mat: 'aluminum', k: 205, t: 0.003 }], inBC: 'T', Tin: 1500, outBC: 'h', Tout: 300, hout: 5, rad: false } },
];
const clone = o => JSON.parse(JSON.stringify(o));

export function conductionTab({ keep = o => o } = {}) {
  const S = keep({ ex: 'pipe', ...clone(EX[4].o), r0: 0.05, Tsur: 293, eps: 0.8, hin: 5000, hout: 10, rad: true });
  const controls = h('div'), main = h('div', { class: 'cf-main-inner' });
  const metrics = metricsGrid();
  const pCard = card('Temperature through the wall', 'Linear in a plane layer, logarithmic in a cylinder, 1/r in a sphere. The slope in each layer is inversely proportional to its conductivity: insulation takes the big drop.');
  const plot = new Plot(pCard, { xlabel: 'position (mm)', ylabel: 'T (K)', xname: 'x', yname: 'T', xfmt: v => v.toFixed(2) + ' mm', yfmt: v => v.toFixed(1) + ' K', legendPos: 'above' });
  plot.wrap.style.height = '300px';
  const rCard = card('Thermal resistance network', 'Resistances in series, from the inner fluid to the outer surroundings. Heat flow Q = ΔT_total / ΣR; each resistance takes a share of ΔT proportional to its size.');
  const rEl = h('div'); rCard.append(rEl);
  const insCard = card('Notes'); const insEl = h('div'); insCard.append(insEl);
  main.append(metrics.el, pCard, h('div', { class: 'cf-grid2b' }, rCard, insCard));

  const build = () => {
    const s0 = section('Geometry');
    put(s0.body,
      boundSelect(S, 'ex', 'Example', [...EX.map(e => ({ value: e.id, label: e.label })), { value: 'custom', label: 'Custom' }], v => { const e = EX.find(x => x.id === v); if (e) Object.assign(S, clone(e.o)); build(); run(); }),
      boundSeg(S, 'geom', 'Wall shape', [{ value: 'plane', label: 'Plane' }, { value: 'cyl', label: 'Cylinder' }, { value: 'sph', label: 'Sphere' }], () => { S.ex = 'custom'; build(); run(); }),
      S.geom !== 'plane' ? bound(S, 'r0', 'Inner radius', 0.001, 2, { step: 0.0005, log: true, digits: 4, unit: 'm', onInput: run }) : null);
    const secs = [s0.el];
    S.layers.forEach((l, i) => {
      const s = section(`Layer ${i + 1} (from inside)`);
      put(s.body, h('div', { class: 'field' }, select(MATS, l.mat, v => { l.mat = v; l.k = X.MATERIALS[v].k; S.ex = 'custom'; build(); run(); })),
        bound(l, 'k', 'Conductivity k', 0.01, 500, { step: 0.01, log: true, digits: 3, unit: 'W/m·K', onInput: () => { S.ex = 'custom'; run(); } }),
        bound(l, 't', 'Thickness', 0.0001, 0.5, { step: 0.0001, log: true, digits: 4, unit: 'm', onInput: () => { S.ex = 'custom'; run(); } }));
      if (S.layers.length > 1) { const b = h('button', { class: 'btn sm', type: 'button' }, 'Remove layer'); b.addEventListener('click', () => { S.layers.splice(i, 1); build(); run(); }); s.body.append(b); }
      secs.push(s.el);
    });
    if (S.layers.length < 4) { const b = h('button', { class: 'btn sm', type: 'button', style: { width: '100%' } }, '+ Add a layer outside'); b.addEventListener('click', () => { S.layers.push({ mat: 'fiberglass', k: 0.04, t: 0.02 }); S.ex = 'custom'; build(); run(); }); secs.push(h('div', { class: 'section' }, h('div', { class: 'section-body' }, b))); }
    const s2 = section('Boundary conditions');
    put(s2.body,
      boundSeg(S, 'inBC', 'Inside', [{ value: 'T', label: 'Fixed surface T' }, { value: 'h', label: 'Fluid (convection)' }], () => { build(); run(); }),
      bound(S, 'Tin', S.inBC === 'T' ? 'Inner surface temperature' : 'Inner fluid temperature', 20, 4000, { step: 1, digits: 0, unit: 'K', onInput: run }),
      S.inBC === 'h' ? bound(S, 'hin', 'Inner h', 1, 1e5, { step: 1, log: true, digits: 0, unit: 'W/m²K', onInput: run }) : null,
      boundSeg(S, 'outBC', 'Outside', [{ value: 'T', label: 'Fixed surface T' }, { value: 'h', label: 'Fluid (convection)' }], () => { build(); run(); }),
      bound(S, 'Tout', S.outBC === 'T' ? 'Outer surface temperature' : 'Outer fluid temperature', 20, 4000, { step: 1, digits: 0, unit: 'K', onInput: run }),
      S.outBC === 'h' ? bound(S, 'hout', 'Outer h', 0.5, 2e5, { step: 0.5, log: true, digits: 1, unit: 'W/m²K', onInput: run }) : null,
      S.outBC === 'h' ? boundToggle(S, 'rad', 'Outer surface also radiates', () => { build(); run(); }) : null,
      S.outBC === 'h' && S.rad ? bound(S, 'eps', 'Emissivity', 0.02, 1, { step: 0.01, digits: 2, onInput: run }) : null,
      S.outBC === 'h' && S.rad ? bound(S, 'Tsur', 'Surroundings temperature', 3, 1000, { step: 1, digits: 0, unit: 'K', onInput: run }) : null);
    controls.replaceChildren(...secs, s2.el);
  };

  function run() {
    const R = X.conduction({ geom: S.geom, r0: S.geom === 'plane' ? 0 : S.r0, layers: S.layers.map(l => ({ k: l.k, t: l.t })),
      inner: S.inBC === 'T' ? { T: S.Tin } : { Tinf: S.Tin, h: S.hin },
      outer: S.outBC === 'T' ? { T: S.Tout } : { Tinf: S.Tout, h: S.hout, ...(S.rad ? { eps: S.eps, Tsur: S.Tsur } : {}) } });
    const unit = S.geom === 'plane' ? 'W/m²' : S.geom === 'cyl' ? 'W per m' : 'W';
    const c = n => cssVar(n), cols = ['--lower', '--upper', '--good', '--turb'];
    const x0 = S.geom === 'plane' ? 0 : S.r0;
    plot.setData({ series: S.layers.map((l, i) => { const p = R.prof.filter(q => q.layer === i); return { x: p.map(q => (q.r - x0) * 1000), y: p.map(q => q.T), color: c(cols[i]), label: X.MATERIALS[l.mat]?.label || 'layer', width: 2.4 }; }),
      hlines: [...(S.inBC === 'h' ? [{ y: S.Tin, color: c('--text-3'), label: 'inner fluid', labelAt: 0 }] : []), ...(S.outBC === 'h' ? [{ y: S.Tout, color: c('--text-3'), label: 'outer fluid', labelAt: 1 }] : [])] });
    const Rs = [...(S.inBC === 'h' ? [['inner convection', R.Rin]] : []), ...S.layers.map((l, i) => [`${X.MATERIALS[l.mat]?.label || 'layer'} conduction`, R.Rl[i]]), ...(S.outBC === 'h' ? [[S.rad ? 'outer convection + radiation' : 'outer convection', R.Rout]] : [])];
    const tot = Rs.reduce((a, r) => a + r[1], 0);
    rEl.replaceChildren(table(['Resistance', 'R (K/' + unit.replace('W', 'W') + ')', 'share of ΔT'], Rs.map(([n, r]) => ({ cells: [n, r.toExponential(3), (r / tot * 100).toFixed(1) + '%'], hl: r / tot > 0.5 }))));
    metrics.set([
      { k: 'Heat flow', v: Math.abs(R.Q) >= 1e5 ? (R.Q / 1000).toFixed(1) + ' k' + unit : R.Q.toFixed(R.Q < 10 ? 3 : 1) + ' ' + unit },
      { k: 'Heat flux, inside', v: (R.q_in / 1000).toFixed(3) + ' kW/m²', s: S.geom === 'plane' ? '' : `outside ${(R.q_out / 1000).toFixed(3)} kW/m²` },
      { k: 'Inner surface', v: R.T[0].toFixed(1) + ' K' },
      { k: 'Outer surface', v: R.T[R.T.length - 1].toFixed(1) + ' K' },
      ...R.T.slice(1, -1).map((t, i) => ({ k: `Interface ${i + 1}–${i + 2}`, v: t.toFixed(1) + ' K' })),
      ...(S.rad && S.outBC === 'h' ? [{ k: 'Radiation h_r', v: R.hr.toFixed(2) + ' W/m²K', s: `vs convection ${S.hout} W/m²K` }] : []),
    ]);
    const L = [];
    const big = Rs.reduce((a, b) => (b[1] > a[1] ? b : a));
    L.push({ type: 'i', t: `Controlled by: ${big[0]}`, d: `It is ${(big[1] / tot * 100).toFixed(0)}% of the total resistance. Improving any other part barely changes the heat flow.` });
    if (isFinite(R.rCrit) && S.outBC === 'h') { const ro = R.radii[R.radii.length - 1]; L.push({ type: ro < R.rCrit ? 'w' : 'i', t: `Critical radius of insulation: ${(R.rCrit * 1000).toFixed(1)} mm`, d: ro < R.rCrit ? 'The outer radius is below it, so adding insulation would <i>increase</i> heat loss: the extra surface area outweighs the extra conduction resistance (why thin wires are cooled, not insulated, by their sheath).' : 'The outer radius is above it, so more insulation reduces heat loss.' }); }
    if (S.ex === 'slab') L.push({ type: 'i', t: 'Lecture check', d: 'q = kΔT/L = 372 × 100 / 0.01 = 3.72 MW/m².' });
    insightsList(insEl, L);
  }
  build();
  return { controls, main, show() { run(); } };
}
