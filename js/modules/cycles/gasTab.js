// Gas properties: specific heats and γ from molecular degrees of freedom, mixtures by mole or mass, and the
// real-gas compressibility factor from the Peng–Robinson equation of state.
import { h, section, select, field, cssVar } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import * as E from '../../solvers/heatEngines.js';
import { bound, boundSeg, boundSelect, metricsGrid, card, put } from '../propulsion/common.js';
import { table } from '../../lib/tabbed.js';

const SP = Object.entries(E.SPECIES).map(([value, s]) => ({ value, label: s.label }));
const COLORS = ['--upper', '--lower', '--good', '--turb', '--warn', '--lam', '--sep', '--text-3', '--bad'];

export function gasTab({ keep = o => o } = {}) {
  const S = keep({
    T: 300, mode: 'quantum', show: { He: true, N2: true, CO2: true, H2O: true },
    by: 'mole', mix: [{ sp: 'He', n: 9 }, { sp: 'N2', n: 1 }, { sp: 'O2', n: 0 }, { sp: 'CO2', n: 0 }],
    rg: 'N2', rT: 300, rp: 100, V: 0.05,
  });
  const controls = h('div'), main = h('div', { class: 'cf-main-inner' });
  const metrics = metricsGrid();
  const gCard = card('γ vs temperature', 'Vibrational modes switch on as kT approaches kθv: N₂ is near 7/5 at room temperature and falls toward 9/7 above 3000 K. Dashed: the classical fully excited values. A monatomic gas stays at 5/3.');
  const gPlot = new Plot(gCard, { xlabel: 'temperature (K)', ylabel: 'γ = cp/cv', xname: 'T', yname: 'γ', xfmt: v => v.toFixed(0) + ' K', yfmt: v => v.toFixed(4), legendPos: 'bottom' });
  const dofCard = card('Degrees of freedom at T', 'Translation 3, rotation 2 (linear) or 3 (nonlinear), each vibrational mode up to 2. cv = (DOF/2)R, γ = 1 + 2/DOF.');
  const dofEl = h('div'); dofCard.append(dofEl);
  const mixCard = card('Mixture', 'Molar quantities average with mole fractions; mass quantities with mass fractions. Lecture 3 examples: 9 mol He + 1 mol N₂, and 2 kg He + 1 kg N₂.');
  const mixEl = h('div'); mixCard.append(mixEl);
  const zCard = card('Compressibility factor Z = pv/RT', 'Peng–Robinson equation of state for the gas chosen, at several temperatures. Z < 1: attraction between molecules dominates (the gas is denser than ideal); Z > 1: their size dominates.');
  const zPlot = new Plot(zCard, { xlabel: 'pressure (bar)', ylabel: 'Z', xname: 'p', yname: 'Z', xfmt: v => v.toFixed(1) + ' bar', yfmt: v => v.toFixed(4), legendPos: 'above' });
  const zEl = h('div'); zCard.append(zEl);
  for (const p of [gPlot, zPlot]) p.wrap.style.height = '260px';
  main.append(metrics.el, h('div', { class: 'cf-grid2b' }, gCard, dofCard), h('div', { class: 'cf-grid2b' }, mixCard, zCard));

  const build = () => {
    const s0 = section('Degrees of freedom');
    const checks = h('div', { class: 'row', style: { flexWrap: 'wrap', gap: '6px' } }, ...SP.map(o => {
      const b = h('button', { type: 'button', class: 'btn sm' + (S.show[o.value] ? ' primary' : '') }, o.label.split(' ').pop());
      b.addEventListener('click', () => { S.show[o.value] = !S.show[o.value]; build(); run(); });
      return b;
    }));
    put(s0.body, bound(S, 'T', 'Temperature', 50, 4000, { step: 1, log: true, digits: 0, unit: 'K', onInput: run }),
      boundSeg(S, 'mode', 'Vibration', [{ value: 'frozen', label: 'Frozen' }, { value: 'quantum', label: 'By temperature' }, { value: 'classical', label: 'Fully excited' }], run, '“Frozen” is the cold-air standard of most hand calculations; “by temperature” uses the Einstein function for each mode.'),
      field('Gases on the chart', checks));
    const s1 = section('Mixture');
    const rows = S.mix.map((m, i) => h('div', { class: 'row', style: { gap: '6px', marginBottom: '6px' } },
      select(SP, m.sp, v => { S.mix[i].sp = v; run(); }, { style: { flex: '1' } }),
      (() => { const inp = h('input', { class: 'num-input', value: m.n, style: { width: '70px' }, 'aria-label': 'amount' }); inp.addEventListener('change', () => { const v = parseFloat(inp.value); if (v >= 0) { S.mix[i].n = v; run(); } }); return inp; })()));
    put(s1.body, boundSeg(S, 'by', 'Amounts given by', [{ value: 'mole', label: 'Moles' }, { value: 'mass', label: 'Mass (kg)' }], run),
      ...rows,
      h('div', { class: 'row', style: { gap: '6px' } }, ...[['Air', () => { S.by = 'mole'; S.mix = Object.entries(E.AIR).map(([sp, n]) => ({ sp, n: +(n * 100).toFixed(3) })); }], ['9 He + 1 N₂', () => { S.by = 'mole'; S.mix = [{ sp: 'He', n: 9 }, { sp: 'N2', n: 1 }, { sp: 'O2', n: 0 }, { sp: 'CO2', n: 0 }]; }], ['2 kg He + 1 kg N₂', () => { S.by = 'mass'; S.mix = [{ sp: 'He', n: 2 }, { sp: 'N2', n: 1 }, { sp: 'O2', n: 0 }, { sp: 'CO2', n: 0 }]; }]].map(([l, f]) => { const b = h('button', { class: 'btn sm', type: 'button' }, l); b.addEventListener('click', () => { f(); while (S.mix.length < 4) S.mix.push({ sp: 'O2', n: 0 }); build(); run(); }); return b; })));
    const s2 = section('Real gas');
    put(s2.body, boundSelect(S, 'rg', 'Gas', SP, run),
      bound(S, 'rT', 'Temperature', 60, 1000, { step: 1, digits: 0, unit: 'K', onInput: run }),
      bound(S, 'rp', 'Pressure', 0.1, 1000, { step: 0.1, log: true, digits: 1, unit: 'bar', onInput: run }),
      bound(S, 'V', 'Tank volume', 0.001, 10, { step: 0.001, log: true, digits: 3, unit: 'm³', onInput: run }));
    controls.replaceChildren(s0.el, s1.el, s2.el);
  };

  function run() {
    const c = n => cssVar(n);
    const Ts = []; for (let T = 50; T <= 4000; T *= 1.03) Ts.push(T);
    const ids = Object.keys(S.show).filter(k => S.show[k]);
    const series = [];
    ids.forEach((id, i) => {
      const col = c(COLORS[Object.keys(E.SPECIES).indexOf(id) % COLORS.length]);
      series.push({ x: Ts, y: Ts.map(T => E.dof(id, T, S.mode).g), color: col, label: E.SPECIES[id].label.split(' ').pop() });
      series.push({ x: [50, 4000], y: [E.dof(id, 300, 'classical').g, E.dof(id, 300, 'classical').g], color: col, dash: [3, 4], width: 1, noLegend: true, noHover: true });
    });
    gPlot.setData({ series, vlines: [{ x: S.T, color: c('--text-3') }] });
    gPlot.setOpts({ logx: true });
    dofEl.replaceChildren(table(['Gas', 'trans', 'rot', 'vib', 'DOF', 'cv/R', 'γ', 'cp J/kg·K'], Object.keys(E.SPECIES).map(id => {
      const d = E.dof(id, S.T, S.mode), R = E.RU / (E.SPECIES[id].M / 1000);
      return { cells: [E.SPECIES[id].label, d.trans, d.rot, d.vib.toFixed(2), d.dof.toFixed(2), d.total.toFixed(3), d.g.toFixed(4), (d.cpR * R).toFixed(0)], hl: S.show[id] };
    })));
    // mixture
    const am = {}; for (const m of S.mix) if (m.n > 0) am[m.sp] = (am[m.sp] || 0) + m.n;
    const M = Object.keys(am).length ? E.mixture(am, { by: S.by, T: S.T, mode: S.mode }) : null;
    mixEl.replaceChildren(M ? h('div', {},
      table(['Species', 'mole fraction X', 'mass fraction Y', 'M g/mol'], M.ids.map(k => [E.SPECIES[k].label, M.X[k].toFixed(4), M.Y[k].toFixed(4), E.SPECIES[k].M.toFixed(3)])),
      table(['Mixture', 'value'], [['Molar mass M', M.M.toFixed(4) + ' g/mol'], ['Gas constant R', M.R.toFixed(2) + ' J/kg·K'], ['Molar c̃p', (M.cpR * E.RU).toFixed(3) + ' J/mol·K = ' + M.cpR.toFixed(3) + ' R'], ['Mass cp', M.cp.toFixed(1) + ' J/kg·K'], ['cv', M.cv.toFixed(1) + ' J/kg·K'], ['γ', M.g.toFixed(4)]])) : h('div', { class: 'hint' }, 'Add an amount above zero.'));
    // real gas
    const sp = E.SPECIES[S.rg], Rm = E.RU / (sp.M / 1000);
    const r = E.pengRobinson(S.rg, S.rT, S.rp * 1e5);
    const ps = []; for (let p = 0.1; p <= 1000; p *= 1.06) ps.push(p);
    const temps = [1, 1.2, 1.5, 2, 3].map(f => f * sp.Tc).filter(T => T > 20);
    zPlot.setData({ series: [...temps.map((T, i) => ({ x: ps, y: ps.map(p => E.pengRobinson(S.rg, T, p * 1e5).Z), color: c(COLORS[i % COLORS.length]), label: `${T.toFixed(0)} K (${(T / sp.Tc).toFixed(1)} Tc)` })),
      { x: [S.rp], y: [r.Z], color: c('--text'), line: false, points: true, pointSize: 4.5, noLegend: true }], hlines: [{ y: 1, color: c('--text-3'), label: 'ideal gas', labelAt: 0 }] });
    zPlot.setOpts({ logx: true });
    const rhoI = S.rp * 1e5 / (Rm * S.rT), rhoR = rhoI / r.Z;
    zEl.replaceChildren(table(['At this state', 'ideal gas', 'Peng–Robinson'], [['Z', '1', r.Z.toFixed(4)], ['Density', rhoI.toFixed(3) + ' kg/m³', rhoR.toFixed(3) + ' kg/m³'], ['Mass in the tank', (rhoI * S.V).toFixed(4) + ' kg', (rhoR * S.V).toFixed(4) + ' kg'], ['Reduced T, p', '', `Tr ${r.Tr.toFixed(3)}, pr ${r.pr.toFixed(3)}`]]));
    const d = E.dof('N2', S.T, S.mode);
    metrics.set([
      { k: 'Air γ at T', v: E.mixture(E.AIR, { T: S.T, mode: S.mode }).g.toFixed(4), s: `${S.T.toFixed(0)} K` },
      { k: 'N₂ degrees of freedom', v: d.dof.toFixed(2), s: `vibration ${d.vib.toFixed(2)} of 2` },
      { k: 'Mixture γ', v: M ? M.g.toFixed(4) : '—', s: M ? `M ${M.M.toFixed(2)} g/mol` : '' },
      { k: `Z of ${sp.label.split(' ').pop()}`, v: r.Z.toFixed(4), s: `${S.rT} K, ${S.rp} bar`, cls: Math.abs(r.Z - 1) > 0.05 ? 'bad' : '' },
    ]);
  }
  build();
  return { controls, main, show() { run(); } };
}
