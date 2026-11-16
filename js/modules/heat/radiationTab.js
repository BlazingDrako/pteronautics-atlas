// Radiation: the Planck spectrum with Wien's peak and band fractions, two-surface gray enclosures with radiation
// shields (the Apollo command-module example), radiative equilibrium, and view factors.
import { h, section, cssVar } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import * as X from '../../solvers/heatTransfer.js';
import { bound, boundSeg, boundSelect, metricsGrid, insightsList, card, put } from '../propulsion/common.js';
import { table } from '../../lib/tabbed.js';

export function radiationTab({ keep = o => o } = {}) {
  const S = keep({ T: 5800, lam1: 0.4, lam2: 0.7, cfg: 'plates', T1: 300, T2: 125, eps1: 0.2, eps2: 0.9, r1: 1, r2: 1.2, nS: 0, epsS: 0.05, vf: 'disks', a: 1, b: 1, L: 1, r1v: 0.5, r2v: 0.5, qin: 1361, eq: 0.9, alpha: 0.3 });
  const controls = h('div'), main = h('div', { class: 'cf-main-inner' });
  const metrics = metricsGrid();
  const sCard = card('Blackbody spectrum', 'Spectral emissive power E_bλ on log axes for the chosen temperature and a few reference temperatures. Dots mark Wien\'s peak λ_max = 2898 µm·K / T. The shaded band is the wavelength range on the left.');
  const sPlot = new Plot(sCard, { xlabel: 'wavelength (µm)', ylabel: 'E_bλ (W/m²·µm)', xname: 'λ', yname: 'E', logx: true, logy: true, xfmt: v => v.toFixed(3) + ' µm', yfmt: v => v.toExponential(2), legendPos: 'bottom' });
  sPlot.wrap.style.height = '300px';
  const eCard = card('Two-surface exchange', 'Net radiation between two diffuse gray surfaces, with optional thin shields between them.'); const eEl = h('div'); eCard.append(eEl);
  const vCard = card('View factor', ''); const vEl = h('div'); vCard.append(vEl);
  const tCard = card('Emissivities', 'Total hemispherical emissivity of common surfaces (approximate).');
  tCard.append(table(['Surface', 'ε'], X.EMISSIVITY.map(([n, e]) => [n, e.toFixed(2)])));
  const insCard = card('Notes'); const insEl = h('div'); insCard.append(insEl);
  main.append(metrics.el, sCard, h('div', { class: 'cf-grid2b' }, eCard, vCard), h('div', { class: 'cf-grid2b' }, insCard, tCard));

  const build = () => {
    const s0 = section('Spectrum');
    put(s0.body,
      bound(S, 'T', 'Temperature', 50, 10000, { step: 1, log: true, digits: 0, unit: 'K', onInput: run }),
      bound(S, 'lam1', 'Band from', 0.05, 100, { step: 0.01, log: true, digits: 2, unit: 'µm', onInput: run }),
      bound(S, 'lam2', 'Band to', 0.05, 200, { step: 0.01, log: true, digits: 2, unit: 'µm', onInput: run, tip: '0.4–0.7 µm is visible light.' }));
    const s1 = section('Two surfaces');
    put(s1.body,
      boundSeg(S, 'cfg', 'Arrangement', [{ value: 'plates', label: 'Parallel plates' }, { value: 'cylinders', label: 'Long concentric cylinders' }, { value: 'spheres', label: 'Concentric spheres' }], () => { build(); run(); }),
      bound(S, 'T1', 'T₁ (inner / first)', 3, 3000, { step: 1, digits: 0, unit: 'K', onInput: run }),
      bound(S, 'T2', 'T₂ (outer / second)', 3, 3000, { step: 1, digits: 0, unit: 'K', onInput: run }),
      bound(S, 'eps1', 'ε₁', 0.01, 1, { step: 0.01, digits: 2, onInput: run }),
      bound(S, 'eps2', 'ε₂', 0.01, 1, { step: 0.01, digits: 2, onInput: run }),
      S.cfg !== 'plates' ? bound(S, 'r1', 'Inner radius r₁', 0.01, 10, { step: 0.01, digits: 2, unit: 'm', onInput: run }) : null,
      S.cfg !== 'plates' ? bound(S, 'r2', 'Outer radius r₂', 0.02, 20, { step: 0.01, digits: 2, unit: 'm', onInput: run }) : null,
      bound(S, 'nS', 'Radiation shields between', 0, 30, { step: 1, digits: 0, onInput: run, tip: 'Thin foils of low emissivity, as in multilayer insulation (MLI).' }),
      S.nS > 0 ? bound(S, 'epsS', 'Shield emissivity', 0.01, 1, { step: 0.01, digits: 2, onInput: run }) : null);
    const s2 = section('Radiative equilibrium');
    put(s2.body,
      bound(S, 'qin', 'Incident flux (sunlight 1361 at Earth)', 0, 1e6, { step: 1, log: false, digits: 0, unit: 'W/m²', onInput: run }),
      bound(S, 'alpha', 'Absorptivity α (solar)', 0.02, 1, { step: 0.01, digits: 2, onInput: run }),
      bound(S, 'eq', 'Emissivity ε (infrared)', 0.02, 1, { step: 0.01, digits: 2, onInput: run }));
    const VF = X.VIEW_FACTORS[S.vf];
    const s3 = section('View factor');
    const lab = { r1: 'Radius of surface 1', r2: 'Radius of surface 2', L: 'Separation L', a: S.vf === 'perp' ? 'Common edge length' : 'Side a', b: S.vf === 'perp' ? 'Width of surface 1' : 'Side b' };
    put(s3.body, boundSelect(S, 'vf', 'Configuration', Object.entries(X.VIEW_FACTORS).map(([value, v]) => ({ value, label: v.label })), () => { build(); run(); }),
      ...VF.params.filter(p => !(S.vf === 'sphereDisk' && p === 'r1')).map(p => bound(S, p === 'r1' ? 'r1v' : p === 'r2' ? 'r2v' : p, S.vf === 'perp' && p === 'L' ? 'Width of surface 2' : lab[p], 0.01, 10, { step: 0.01, log: true, digits: 2, unit: 'm', onInput: run })));
    controls.replaceChildren(s0.el, s1.el, s2.el, s3.el);
  };

  function run() {
    const c = n => cssVar(n);
    const lams = []; for (let l = 0.05; l <= 200; l *= 1.04) lams.push(l);
    const temps = [...new Set([S.T, 5800, 1500, 300, 77])];
    const ref = [5800, 1500, 300, 77];
    sPlot.setData({ series: [
      ...temps.map((T, i) => ({ x: lams, y: lams.map(l => { const v = X.planck(l * 1e-6, T) * 1e-6; return v > 1e-6 ? v : NaN; }), color: c(i === 0 ? '--hl' : ['--warn', '--lower', '--upper', '--turb'][ref.indexOf(T)] || '--text-3'), width: i === 0 ? 2.6 : 1.2, label: `${T.toFixed(0)} K${i === 0 ? ' (this)' : ''}` })),
      { x: temps.map(T => X.WIEN / T * 1e6), y: temps.map(T => X.planck(X.WIEN / T, T) * 1e-6), color: c('--text'), line: false, points: true, pointSize: 3, noLegend: true, extra: i => 'Wien peak' },
    ], vbands: [{ x0: Math.min(S.lam1, S.lam2), x1: Math.max(S.lam1, S.lam2), color: c('--accent-soft') }] });
    sPlot.setOpts({ ylim: [1e-3, Math.max(1e9, X.planck(X.WIEN / S.T, S.T) * 2e-6)] });
    const frac = Math.abs(X.bandFraction(S.lam2 * 1e-6, S.T) - X.bandFraction(S.lam1 * 1e-6, S.T));
    // enclosure
    const E = X.enclosure({ config: S.cfg, T1: S.T1, T2: S.T2, eps1: S.eps1, eps2: S.eps2, r1: S.r1, r2: Math.max(S.r2, S.r1 * 1.001), nShields: Math.round(S.nS), epsS: S.epsS });
    eEl.replaceChildren(table(['', 'value'], [['Net flux from 1 to 2 (per m² of surface 1)', E.q.toFixed(2) + ' W/m²'], ['Without shields', E.q0.toFixed(2) + ' W/m²'], ['Reduction by shields', S.nS > 0 ? (E.q0 / E.q).toFixed(1) + '×' : '—'], ['Blackbody limit σ(T₁⁴ − T₂⁴)', (X.SIGMA * (S.T1 ** 4 - S.T2 ** 4)).toFixed(2) + ' W/m²'], ['Area ratio A₁/A₂', E.ratio.toFixed(4)]]));
    // view factor
    const VF = X.VIEW_FACTORS[S.vf];
    const F = VF.F({ r1: S.r1v, r2: S.r2v, a: S.a, b: S.b, L: S.L });
    vEl.replaceChildren(table(['', 'value'], [['F₁₂', F.toFixed(5)], ['Exchange between black surfaces at T₁, T₂ (per m² of 1)', (F * X.SIGMA * (S.T1 ** 4 - S.T2 ** 4)).toFixed(2) + ' W/m²']]));
    const Teq = X.radiativeEquilibrium(S.qin * S.alpha, S.eq, 3);
    metrics.set([
      { k: 'Total emission σT⁴', v: (() => { const q = X.SIGMA * S.T ** 4; return q >= 1e6 ? (q / 1e6).toFixed(2) + ' MW/m²' : q >= 1e3 ? (q / 1e3).toFixed(2) + ' kW/m²' : q.toFixed(2) + ' W/m²'; })(), s: `at ${S.T.toFixed(0)} K` },
      { k: 'Wien peak', v: (X.WIEN / S.T * 1e6).toFixed(3) + ' µm' },
      { k: 'Fraction in band', v: (frac * 100).toFixed(2) + '%', s: `${S.lam1}–${S.lam2} µm` },
      { k: 'Two-surface exchange', v: E.q.toFixed(1) + ' W/m²', s: S.nS ? `${Math.round(S.nS)} shields` : '' },
      { k: 'Equilibrium temperature', v: Teq.toFixed(1) + ' K', s: `α/ε = ${(S.alpha / S.eq).toFixed(2)}, one face to deep space` },
      { k: 'View factor F₁₂', v: F.toFixed(4) },
    ]);
    insightsList(insEl, [
      { type: 'i', t: 'Apollo command module (lecture 19)', d: 'Treat the hot inner wall and the cold outer skin as parallel plates: a low-emissivity inner surface (polished, ε ≈ 0.1–0.2) cuts the radiative heat flow several times compared with black surfaces. Set T₂ = 125 K for the outer wall in shadow and vary ε₁.' },
      { type: 'i', t: 'Why white paint in sunlight', d: 'Equilibrium temperature depends on α/ε: absorb little sunlight (visible, α small) but radiate well in the infrared (ε large). White paint α ≈ 0.2, ε ≈ 0.9 runs cold; polished metal α ≈ 0.1, ε ≈ 0.05 runs hot.' },
      { type: 'i', t: 'Reciprocity and summation', d: `A₁F₁₂ = A₂F₂₁ and Σⱼ F₁ⱼ = 1. So if F₁₂ = ${F.toFixed(3)}, ${((1 - F) * 100).toFixed(1)}% of the radiation leaving surface 1 goes elsewhere.` },
    ]);
  }
  build();
  return { controls, main, show() { run(); } };
}
