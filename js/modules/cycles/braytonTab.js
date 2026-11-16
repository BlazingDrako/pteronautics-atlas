// Gas turbines: the Brayton cycle with component efficiencies, a regenerator, intercooling and reheat, on a T–s
// diagram, with efficiency, net work and back-work ratio against pressure ratio.
import { h, section, cssVar } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import * as E from '../../solvers/heatEngines.js';
import { bound, boundSelect, metricsGrid, insightsList, card, put } from '../propulsion/common.js';
import { table } from '../../lib/tabbed.js';

const PRESETS = [
  { id: 'lecture', label: 'Ideal, T₃/T₁ = 1900/300 K (lecture 7)', o: { rp: 25.3, T1: 300, T3: 1900, g: 1.4, etaC: 1, etaT: 1, eps: 0, nC: 1, nT: 1 } },
  { id: 'real', label: 'Real components (ηc 0.80, ηt 0.90)', o: { rp: 12, T1: 300, T3: 1400, g: 1.4, etaC: 0.8, etaT: 0.9, eps: 0, nC: 1, nT: 1 } },
  { id: 'micro', label: 'Recuperated microturbine', o: { rp: 4, T1: 288, T3: 1220, g: 1.4, etaC: 0.78, etaT: 0.84, eps: 0.88, nC: 1, nT: 1 } },
  { id: 'peaker', label: 'Intercooled, reheat and regenerator', o: { rp: 16, T1: 300, T3: 1500, g: 1.4, etaC: 0.86, etaT: 0.9, eps: 0.8, nC: 2, nT: 2 } },
  { id: 'heavy', label: 'Heavy-duty power turbine (H-class)', o: { rp: 23, T1: 288, T3: 1870, g: 1.38, etaC: 0.9, etaT: 0.91, eps: 0, nC: 1, nT: 1 } },
];

export function braytonTab({ keep = o => o } = {}) {
  const S = keep({ preset: 'lecture', ...PRESETS[0].o });
  const controls = h('div'), main = h('div', { class: 'cf-main-inner' });
  const metrics = metricsGrid();
  const tsCard = card('T–s diagram', 'States: 1 compressor inlet, 2 compressor exit, x after the regenerator, 3 turbine inlet, 4 turbine exit, y regenerator exhaust. Dashed: the ideal cycle between the same temperatures and pressure ratio. Heat addition and rejection run along constant-pressure lines.');
  const ts = new Plot(tsCard, { xlabel: 's − s₁ (J/kg·K)', ylabel: 'T (K)', xname: 's', yname: 'T', xfmt: v => v.toFixed(0), yfmt: v => v.toFixed(0) + ' K', legendPos: 'bottom' });
  ts.wrap.style.height = '320px';
  const eCard = card('Efficiency vs pressure ratio', 'With ideal components efficiency rises with pressure ratio for ever. With real components it peaks; a regenerator raises it at low ratios and stops helping once T₄ < T₂. The dotted line is Carnot (and the Ericsson limit).');
  const ePlot = new Plot(eCard, { xlabel: 'pressure ratio p₂/p₁', ylabel: 'thermal efficiency', xname: 'rp', yname: 'η', logx: true, xfmt: v => v.toFixed(1), yfmt: v => (v * 100).toFixed(1) + '%', legendPos: 'bottom' });
  const wCard = card('Net work vs pressure ratio', 'Net work per unit mass flow, w_net/(cp T₁). For fixed T₃/T₁ it peaks at r_p = (T₃/T₁)^(γ/2(γ−1)) in the ideal cycle, where T₂ = T₄. More work per kg means a smaller, lighter engine for the same power.');
  const wPlot = new Plot(wCard, { xlabel: 'pressure ratio p₂/p₁', ylabel: 'w_net / cp T₁', xname: 'rp', yname: 'w', logx: true, xfmt: v => v.toFixed(1), yfmt: v => v.toFixed(3), legendPos: 'bottom' });
  const bCard = card('Back-work ratio', 'Fraction of the turbine work spent driving the compressor, w_c/w_t. Gas turbines are 40–80%, against a few percent for a steam plant, which is why compressor and turbine efficiencies matter so much.');
  const bPlot = new Plot(bCard, { xlabel: 'pressure ratio p₂/p₁', ylabel: 'w_c / w_t', xname: 'rp', yname: 'bwr', logx: true, xfmt: v => v.toFixed(1), yfmt: v => (v * 100).toFixed(1) + '%', legendPos: 'bottom' });
  for (const p of [ePlot, wPlot, bPlot]) p.wrap.style.height = '240px';
  const cmpCard = card('Step by step: what each improvement buys', 'The same T₁, T₃ and pressure ratio, adding one feature at a time.');
  const cmpEl = h('div'); cmpCard.append(cmpEl);
  const insCard = card('Notes'); const insEl = h('div'); insCard.append(insEl);
  main.append(metrics.el, h('div', { class: 'cf-grid2b' }, tsCard, h('div', {}, cmpCard)), h('div', { class: 'cf-grid2b' }, eCard, wCard), h('div', { class: 'cf-grid2b' }, bCard, insCard));

  const opts = () => ({ rp: S.rp, T1: S.T1, T3: S.T3, g: S.g, etaC: S.etaC, etaT: S.etaT, eps: S.eps, nC: Math.round(S.nC), nT: Math.round(S.nT) });
  const build = () => {
    const s0 = section('Cycle');
    put(s0.body,
      boundSelect(S, 'preset', 'Example', [...PRESETS.map(p => ({ value: p.id, label: p.label })), { value: 'custom', label: 'Custom' }], v => { const p = PRESETS.find(x => x.id === v); if (p) Object.assign(S, p.o); build(); run(); }),
      bound(S, 'rp', 'Pressure ratio p₂/p₁', 1.2, 60, { step: 0.1, log: true, digits: 1, onInput: run }),
      bound(S, 'T1', 'Compressor inlet T₁', 200, 350, { step: 1, digits: 0, unit: 'K', onInput: run }),
      bound(S, 'T3', 'Turbine inlet T₃', 800, 2200, { step: 5, digits: 0, unit: 'K', onInput: run, tip: 'Limited by turbine blade materials and cooling: about 1100 K uncooled, 1900 K+ in modern cooled engines.' }),
      bound(S, 'g', 'γ', 1.3, 1.4, { step: 0.005, digits: 3, onInput: run }));
    const s1 = section('Components');
    put(s1.body,
      bound(S, 'etaC', 'Compressor isentropic efficiency', 0.6, 1, { step: 0.005, digits: 3, onInput: run }),
      bound(S, 'etaT', 'Turbine isentropic efficiency', 0.6, 1, { step: 0.005, digits: 3, onInput: run }),
      bound(S, 'eps', 'Regenerator effectiveness', 0, 1, { step: 0.01, digits: 2, onInput: run, tip: 'ε = (Tx − T₂)/(T₄ − T₂). 0 means no regenerator; real recuperators reach 0.8–0.9.' }),
      bound(S, 'nC', 'Compressor stages (intercooled)', 1, 6, { step: 1, digits: 0, onInput: run, tip: 'Equal pressure ratios with perfect intercooling back to T₁ between them.' }),
      bound(S, 'nT', 'Turbine stages (reheated)', 1, 6, { step: 1, digits: 0, onInput: run, tip: 'Equal expansion ratios with reheat back to T₃ between them.' }));
    controls.replaceChildren(s0.el, s1.el);
  };

  function run() {
    const o = opts(), B = E.brayton(o), I = E.brayton({ ...o, etaC: 1, etaT: 1, eps: 0, nC: 1, nT: 1 });
    const kJ = v => (v / 1000).toFixed(1) + ' kJ/kg';
    metrics.set([
      { k: 'Thermal efficiency', v: (B.eta * 100).toFixed(1) + '%', s: `ideal simple ${(B.etaIdeal * 100).toFixed(1)}%, Carnot ${(B.carnot * 100).toFixed(1)}%` },
      { k: 'Net work', v: kJ(B.wnet), s: `w_net/cpT₁ = ${B.wnetRatio.toFixed(3)}` },
      { k: 'Back-work ratio', v: (B.bwr * 100).toFixed(1) + '%', s: `w_c ${kJ(B.wc)}, w_t ${kJ(B.wt)}` },
      { k: 'Heat added', v: kJ(B.qin), s: `rejected ${kJ(B.qout)}` },
      { k: 'Compressor exit T₂', v: B.T2.toFixed(0) + ' K' },
      { k: 'Turbine exit T₄', v: B.T4.toFixed(0) + ' K', s: B.regenUsed ? `exhaust after regenerator ${B.Ty.toFixed(0)} K` : '' },
      { k: 'Max-work pressure ratio', v: B.rpOpt.toFixed(1), s: `ideal w_max/cpT₁ = (√(T₃/T₁) − 1)² = ${B.wmaxRatio.toFixed(3)}` },
      { k: 'Specific power', v: (B.wnet / 1000).toFixed(0) + ' kW', s: 'per kg/s of air' },
    ]);
    const c = n => cssVar(n);
    ts.setData({ series: [
      { x: I.path.map(p => p.s), y: I.path.map(p => p.T), color: c('--text-3'), dash: [4, 4], label: 'ideal', width: 1.2 },
      { x: B.path.map(p => p.s), y: B.path.map(p => p.T), color: c('--upper'), label: 'this cycle' },
      { x: B.pts.map(p => p.s), y: B.pts.map(p => p.T), color: c('--lower'), line: false, points: true, pointSize: 3.5, noLegend: true, extra: i => B.pts[i].label ? 'state ' + B.pts[i].label : '' },
    ], hlines: [{ y: S.T3, color: c('--warn'), label: 'T₃', labelAt: 0 }] });
    const rps = []; for (let r = 1.2; r <= 80; r *= 1.06) rps.push(r);
    const sw = E.braytonSweep(o, rps), si = E.braytonSweep({ ...o, etaC: 1, etaT: 1, eps: 0, nC: 1, nT: 1 }, rps), sr = E.braytonSweep({ ...o, eps: 0, nC: 1, nT: 1 }, rps);
    const pos = (arr, f) => arr.map(x => { const v = f(x); return x.wnet > 0 ? v : NaN; });
    const cur = [{ x: [S.rp], y: [B.eta], color: c('--text'), line: false, points: true, pointSize: 4, noLegend: true }];
    ePlot.setData({ series: [{ x: rps, y: si.map(x => x.eta), color: c('--text-3'), dash: [4, 4], label: 'ideal simple' }, { x: rps, y: pos(sr, x => x.eta), color: c('--lower'), label: 'real, simple' }, { x: rps, y: pos(sw, x => x.eta), color: c('--upper'), label: 'this configuration' }, ...cur],
      hlines: [{ y: B.carnot, color: c('--good'), dash: [2, 3], label: 'Carnot / Ericsson', labelAt: 0 }] });
    ePlot.setOpts({ ylim: [0, Math.min(1, B.carnot + 0.08)] });
    wPlot.setData({ series: [{ x: rps, y: si.map(x => x.wnetRatio), color: c('--text-3'), dash: [4, 4], label: 'ideal simple' }, { x: rps, y: sr.map(x => x.wnetRatio), color: c('--lower'), label: 'real, simple' }, { x: rps, y: sw.map(x => x.wnetRatio), color: c('--upper'), label: 'this configuration' }, { x: [S.rp], y: [B.wnetRatio], color: c('--text'), line: false, points: true, pointSize: 4, noLegend: true }],
      vlines: [{ x: B.rpOpt, color: c('--good') }] });
    wPlot.setOpts({ ylim: [0, Math.max(...sw.map(x => x.wnetRatio), ...si.map(x => x.wnetRatio)) * 1.08] });
    bPlot.setData({ series: [{ x: rps, y: si.map(x => x.bwr), color: c('--text-3'), dash: [4, 4], label: 'ideal simple' }, { x: rps, y: sw.map(x => x.bwr), color: c('--upper'), label: 'this configuration' }, { x: [S.rp], y: [B.bwr], color: c('--text'), line: false, points: true, pointSize: 4, noLegend: true }] });
    bPlot.setOpts({ ylim: [0, 1.2] });
    // step-by-step comparison
    const steps = [
      ['Ideal simple cycle', { ...o, etaC: 1, etaT: 1, eps: 0, nC: 1, nT: 1 }],
      ['+ real compressor and turbine', { ...o, eps: 0, nC: 1, nT: 1 }],
      ['+ regenerator', { ...o, nC: 1, nT: 1 }],
      ['+ intercooling', { ...o, nT: 1 }],
      ['+ reheat (this cycle)', o],
    ];
    cmpEl.replaceChildren(table(['Configuration', 'η', 'w_net kJ/kg', 'bwr'], steps.map(([n, x]) => { const b = E.brayton(x); return [n, (b.eta * 100).toFixed(1) + '%', (b.wnet / 1000).toFixed(1), (b.bwr * 100).toFixed(0) + '%']; })
      .concat([['Ericsson limit (Carnot)', (B.carnot * 100).toFixed(1) + '%', '—', '—']])));
    const L = [];
    if (B.wnet <= 0) L.push({ type: 'b', t: 'No net work', d: 'The compressor needs more work than the turbine gives. Raise T₃, raise the component efficiencies or lower the pressure ratio.' });
    if (B.regenBlocked) L.push({ type: 'w', t: 'Regenerator cannot help', d: `The turbine exhaust (${B.T4.toFixed(0)} K) is colder than the compressor exit (${B.T2.toFixed(0)} K), so there is no heat to recover. Regenerators suit low pressure ratios.` });
    if (S.rp > B.rpOpt * 1.15 && S.etaC === 1 && S.etaT === 1) L.push({ type: 'i', t: 'Past the maximum-work ratio', d: `Efficiency keeps rising, but each kg of air does less work; at r_p ≈ ${(B.rpOpt ** 2).toFixed(0)} the net work falls to zero as T₂ reaches T₃.` });
    L.push({ type: 'i', t: 'Sensitivity to losses', d: `With a back-work ratio of ${(B.bwr * 100).toFixed(0)}%, a 1-point drop in compressor efficiency costs about ${(E.brayton({ ...o, etaC: S.etaC - 0.01 }).wnet / B.wnet * -100 + 100).toFixed(1)}% of the net work.` });
    insightsList(insEl, L);
  }
  build();
  return { controls, main, show() { run(); } };
}
