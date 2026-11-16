// Component matching: a single-spool turbojet with a choked turbine and nozzle. The turbine pressure ratio is fixed,
// so work and flow compatibility give one running line on the compressor map; the fuel setting (T04/T01) picks the
// point on it, and the nozzle area moves the whole line toward or away from surge.
import { h, section, cssVar } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import * as T from '../../solvers/turboDesign.js';
import { bound, boundSeg, boundToggle, metricsGrid, insightsList, card, put } from './common.js';

export function matchTab({ keep = o => o } = {}) {
  const S = keep({ piD: 8, thetaD: 4.5, theta: 4.5, etaT: 0.88, etaC: 0.86, nozzle: 1, kind: 'axial', mapEff: true, T01: 288.15 });
  const controls = h('div'), main = h('div', { class: 'cf-main-inner' });
  const metrics = metricsGrid();
  const mapCard = card('Compressor map and running line', 'Gray: constant corrected-speed lines; red: surge line. Blue: the running line where compressor and turbine agree on flow and work. Each fuel setting T₀₄/T₀₁ is one point on it (dot). Dashed: the running line with the nozzle area changed.');
  const map = new Plot(mapCard, { xlabel: 'corrected flow ṁ√T₀₁/p₀₁ (design = 1)', ylabel: 'pressure ratio p₀₂/p₀₁', xname: 'ṁ', yname: 'π', xfmt: v => v.toFixed(3), yfmt: v => v.toFixed(2), legendPos: 'bottom' });
  map.wrap.style.height = '380px';
  const lCard = card('Along the running line', 'Pressure ratio, surge margin (at constant corrected speed) and turbine entry temperature ratio against corrected speed.');
  const lPlot = new Plot(lCard, { xlabel: 'corrected speed N/√T₀₁ (design = 1)', ylabel: 'value', xname: 'N', yname: '', xfmt: v => v.toFixed(3), yfmt: v => v.toFixed(3), legendPos: 'bottom' });
  lPlot.wrap.style.height = '260px';
  const insCard = card('How the match works'); const insEl = h('div'); insCard.append(insEl);
  main.append(metrics.el, mapCard, h('div', { class: 'cf-grid2b' }, lCard, insCard));

  const build = () => {
    const s0 = section('Design point');
    put(s0.body,
      bound(S, 'piD', 'Design pressure ratio', 3, 25, { step: 0.1, digits: 1, onInput: run }),
      bound(S, 'thetaD', 'Design T₀₄/T₀₁', 3, 6.5, { step: 0.01, digits: 2, onInput: run }),
      bound(S, 'etaC', 'Compressor efficiency at design', 0.75, 0.92, { step: 0.005, digits: 3, onInput: run }),
      bound(S, 'etaT', 'Turbine efficiency', 0.75, 0.95, { step: 0.005, digits: 3, onInput: run }),
      boundSeg(S, 'kind', 'Compressor', [{ value: 'axial', label: 'Axial' }, { value: 'centrifugal', label: 'Centrifugal' }], run),
      boundToggle(S, 'mapEff', 'Efficiency from the map', run, 'Use the map\'s efficiency islands off design instead of a constant value.'));
    const s1 = section('Operating point');
    put(s1.body,
      bound(S, 'theta', 'Fuel setting T₀₄/T₀₁', 2.2, 6.5, { step: 0.01, digits: 2, onInput: run, tip: 'Throttle: more fuel raises the turbine entry temperature, which moves the point up the running line.' }),
      bound(S, 'nozzle', 'Nozzle area (× design)', 0.8, 1.3, { step: 0.005, digits: 3, onInput: run, tip: 'Opening the nozzle raises the turbine pressure ratio, so the same compressor work needs less temperature: the running line drops away from surge (as when an afterburner opens its nozzle).' }),
      bound(S, 'T01', 'Compressor inlet T₀₁', 200, 330, { step: 1, digits: 0, unit: 'K', onInput: run }));
    controls.replaceChildren(s0.el, s1.el);
  };

  function run() {
    const o = { piD: S.piD, thetaD: S.thetaD, etaT: S.etaT, etaCD: S.etaC, kind: S.kind, useMapEff: S.mapEff };
    const Mt = T.matching({ ...o, nozzle: S.nozzle }), M0 = S.nozzle !== 1 ? T.matching(o) : null, mp = Mt.map;
    const P = Mt.at(S.theta);
    const c = n => cssVar(n);
    const speeds = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.05, 1.1].map(n => ({ n, pts: mp.line(n) }));
    const surge = []; for (let n = 0.45; n <= 1.12; n += 0.01) surge.push([mp.ms(n), mp.ps(n)]);
    const ok = p => p.n > 0.42 && p.n < 1.12 && p.theta > 1.8 && p.m < 1.2 && p.m > 0.25;
    const rl = Mt.line.filter(ok);
    map.setData({ series: [
      ...speeds.map(s => ({ x: s.pts.map(p => p[0]), y: s.pts.map(p => p[1]), color: c('--text-3'), width: 1.2, label: s.n === 1 ? 'speed lines' : '', noLegend: s.n !== 1, extra: () => `N = ${s.n.toFixed(2)}` })),
      { x: surge.map(p => p[0]), y: surge.map(p => p[1]), color: c('--bad'), label: 'surge line', width: 2 },
      ...(M0 ? [{ x: M0.line.filter(ok).map(p => p.m), y: M0.line.filter(ok).map(p => p.pi), color: c('--upper'), dash: [5, 4], label: 'design nozzle' }] : []),
      { x: rl.map(p => p.m), y: rl.map(p => p.pi), color: c('--upper'), width: 2.4, label: 'running line', extra: i => `T₀₄/T₀₁ ${rl[i].theta.toFixed(2)} · SM ${(rl[i].SM * 100).toFixed(1)}%` },
      { x: [P.m], y: [P.pi], color: c('--hl'), line: false, points: true, pointSize: 6, noLegend: true, extra: () => 'operating point' },
      { x: [1], y: [S.piD], color: c('--text'), line: false, points: true, pointSize: 3.5, hollow: [true], noLegend: true, extra: () => 'design point' },
    ] });
    map.setOpts({ xlim: [0.3, 1.2], ylim: [1, S.piD * 1.35] });
    lPlot.setData({ series: [
      { x: rl.map(p => p.n), y: rl.map(p => p.pi / S.piD), color: c('--upper'), label: 'π / π_design' },
      { x: rl.map(p => p.n), y: rl.map(p => p.SM), color: c('--bad'), label: 'surge margin' },
      { x: rl.map(p => p.n), y: rl.map(p => p.theta / S.thetaD), color: c('--warn'), label: 'θ / θ_design' },
      { x: rl.map(p => p.n), y: rl.map(p => p.eta), color: c('--good'), label: 'ηc' },
    ], vlines: [{ x: P.n, color: c('--text-3') }] });
    metrics.set([
      { k: 'Pressure ratio', v: P.pi.toFixed(2), s: `design ${S.piD.toFixed(1)}` },
      { k: 'Corrected speed', v: (P.n * 100).toFixed(1) + '%', s: 'of design N/√T₀₁' },
      { k: 'Corrected flow', v: (P.m * 100).toFixed(1) + '%', s: 'of design' },
      { k: 'Surge margin', v: (P.SM * 100).toFixed(1) + '%', s: 'at constant speed', cls: P.SM < 0.1 ? 'bad' : '' },
      { k: 'Turbine entry T₀₄', v: (P.theta * S.T01).toFixed(0) + ' K', s: `T₀₄/T₀₁ ${P.theta.toFixed(2)}` },
      { k: 'Turbine pressure ratio', v: Mt.PRt.toFixed(3), s: `fixed by choking; ΔT₀/T₀₄ ${Mt.k.toFixed(3)}` },
      { k: 'Compressor efficiency', v: (P.eta * 100).toFixed(1) + '%' },
    ]);
    const L = [];
    L.push({ type: 'i', t: 'Two compatibility conditions', d: '<b>Flow:</b> the choked turbine nozzle guide vanes pass ṁ√T₀₄/p₀₄ = const, so the compressor corrected flow is ∝ π/√(T₀₄/T₀₁). <b>Work:</b> compressor work = turbine work, cp,c(T₀₂ − T₀₁) = cp,t·k·T₀₄, with k fixed because the turbine pressure ratio is fixed by the choked nozzle. Together they leave a single line on the map.' });
    if (P.SM < 0.1) L.push({ type: 'w', t: 'Little surge margin', d: 'At low power the running line of a single-spool high-pressure-ratio compressor approaches surge. Real engines use bleed valves, variable stator vanes or two spools to keep the margin.' });
    L.push({ type: 'i', t: 'Matching procedure (lecture 15)', d: 'Pick a speed line and a point on it, get T₀₄ from the flow condition, check the work balance, and iterate along the speed line (inner loop) and between speeds (outer loop) until both agree. With a choked turbine and nozzle the result collapses to the running line drawn here.' });
    insightsList(insEl, L);
  }
  build();
  return { controls, main, show() { run(); } };
}
