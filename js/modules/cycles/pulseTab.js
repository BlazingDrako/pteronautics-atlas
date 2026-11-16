// Pulse cycles: the Humphrey (constant-volume combustion) cycle of pulsejets and pulse detonation engines against
// the Brayton cycle with the same compression and the same heat input or peak temperature.
import { h, section, cssVar } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import * as E from '../../solvers/heatEngines.js';
import { bound, boundSeg, metricsGrid, insightsList, card, put } from '../propulsion/common.js';

export function pulseTab({ keep = o => o } = {}) {
  const S = keep({ rp: 2, T1: 300, T3: 2194.2, g: 1.4, basis: 'heat' });
  const controls = h('div'), main = h('div', { class: 'cf-main-inner' });
  const metrics = metricsGrid();
  const tsCard = card('T–s diagram', 'Humphrey (constant-volume heat addition, steeper) against Brayton (constant pressure). Constant-volume lines are steeper than constant-pressure lines by the factor γ, so the Humphrey cycle reaches a higher pressure and expands further.');
  const ts = new Plot(tsCard, { xlabel: 's − s₁ (J/kg·K)', ylabel: 'T (K)', xname: 's', yname: 'T', xfmt: v => v.toFixed(0), yfmt: v => v.toFixed(0) + ' K', legendPos: 'bottom' });
  const pvCard = card('p–v diagram', 'Specific volume v = RT/p on log axes. The Humphrey pressure spike is what a pulse engine gets "for free" from burning in a closed tube.');
  const pv = new Plot(pvCard, { xlabel: 'v (m³/kg)', ylabel: 'p (bar)', xname: 'v', yname: 'p', logx: true, logy: true, xfmt: v => v.toFixed(3), yfmt: v => v.toFixed(2) + ' bar', legendPos: 'bottom' });
  const eCard = card('Efficiency vs mechanical compression', 'At p₂/p₁ = 1 (no compressor at all, like a valveless pulsejet or a PDE) the Brayton cycle does no work, but the Humphrey cycle still does.');
  const eP = new Plot(eCard, { xlabel: 'p₂/p₁', ylabel: 'thermal efficiency', xname: 'p₂/p₁', yname: 'η', logx: true, xfmt: v => v.toFixed(2), yfmt: v => (v * 100).toFixed(1) + '%', legendPos: 'bottom' });
  const wCard = card('Net work vs mechanical compression', 'Net work per unit mass, w_net/(cp T₁), with the same heat input per kg as now.');
  const wP = new Plot(wCard, { xlabel: 'p₂/p₁', ylabel: 'w_net / cp T₁', xname: 'p₂/p₁', yname: 'w', logx: true, xfmt: v => v.toFixed(2), yfmt: v => v.toFixed(3), legendPos: 'bottom' });
  for (const p of [ts, pv, eP, wP]) p.wrap.style.height = '260px';
  const insCard = card('Pulse engines'); const insEl = h('div'); insCard.append(insEl);
  main.append(metrics.el, h('div', { class: 'cf-grid2b' }, tsCard, pvCard), h('div', { class: 'cf-grid2b' }, eCard, wCard), insCard);

  const build = () => {
    const s = section('Cycle');
    put(s.body,
      bound(S, 'rp', 'Mechanical compression p₂/p₁', 1, 30, { step: 0.01, log: true, digits: 2, onInput: run, tip: 'Ram or compressor pressure ratio before combustion. 1 means no compression at all.' }),
      bound(S, 'T1', 'Inlet temperature T₁', 200, 400, { step: 1, digits: 0, unit: 'K', onInput: run }),
      bound(S, 'T3', 'Humphrey peak temperature T₃', 600, 3500, { step: 1, digits: 1, unit: 'K', onInput: run, tip: 'Sets the heat added at constant volume, q = cv(T₃ − T₂). Lecture 8 example: 2194.2 K with p₂/p₁ = 2.' }),
      bound(S, 'g', 'γ', 1.2, 1.67, { step: 0.005, digits: 3, onInput: run }),
      boundSeg(S, 'basis', 'Compare Brayton with', [{ value: 'heat', label: 'Same heat input' }, { value: 'tmax', label: 'Same peak T' }], run));
    controls.replaceChildren(s.el);
  };

  function run() {
    const Hm = E.humphrey({ rp: S.rp, T1: S.T1, T3: S.T3, g: S.g });
    const T3b = S.basis === 'heat' ? Hm.T2 + Hm.q / Hm.cp : S.T3;
    const B = E.brayton({ rp: S.rp, T1: S.T1, T3: T3b, g: S.g });
    metrics.set([
      { k: 'Humphrey efficiency', v: (Hm.eta * 100).toFixed(2) + '%', s: `formula ${(Hm.etaFormula * 100).toFixed(2)}%` },
      { k: 'Brayton efficiency', v: (B.eta * 100).toFixed(2) + '%', s: S.basis === 'heat' ? `same q, T₃ ${T3b.toFixed(0)} K` : 'same peak T' },
      { k: 'Pressure gain in combustion', v: (Hm.p3 / Hm.p2).toFixed(2) + '×', s: `p₃ ${(Hm.p3 / 1e5).toFixed(2)} bar` },
      { k: 'Heat added', v: (Hm.q / 1e6).toFixed(3) + ' MJ/kg' },
      { k: 'Net work (Humphrey)', v: (Hm.wnet / 1000).toFixed(1) + ' kJ/kg', s: `Brayton ${(B.wnet / 1000).toFixed(1)} kJ/kg` },
      { k: 'Exhaust T₄', v: Hm.T4.toFixed(0) + ' K', s: `Brayton ${B.T4.toFixed(0)} K` },
    ]);
    const c = n => cssVar(n), R = 287;
    ts.setData({ series: [{ x: Hm.path.map(p => p.s), y: Hm.path.map(p => p.T), color: c('--lower'), label: 'Humphrey' }, { x: B.path.map(p => p.s), y: B.path.map(p => p.T), color: c('--upper'), label: 'Brayton' },
      { x: Hm.pts.map(p => p.s), y: Hm.pts.map(p => p.T), color: c('--lower'), line: false, points: true, noLegend: true, extra: i => 'state ' + Hm.pts[i].label }] });
    pv.setData({ series: [{ x: Hm.path.map(p => R * p.T / p.p), y: Hm.path.map(p => p.p / 1e5), color: c('--lower'), label: 'Humphrey' }, { x: B.path.map(p => R * p.T / p.p), y: B.path.map(p => p.p / 1e5), color: c('--upper'), label: 'Brayton' }] });
    const rps = []; for (let r = 1; r <= 40; r *= 1.05) rps.push(r);
    const hs = rps.map(rp => E.humphrey({ rp, T1: S.T1, q: Hm.q, g: S.g }));
    const bs = rps.map(rp => { const T2 = S.T1 * rp ** ((S.g - 1) / S.g); return E.brayton({ rp, T1: S.T1, T3: T2 + Hm.q / Hm.cp, g: S.g }); });
    eP.setData({ series: [{ x: rps, y: hs.map(x => x.eta), color: c('--lower'), label: 'Humphrey' }, { x: rps, y: bs.map(x => x.eta), color: c('--upper'), label: 'Brayton (same q)' }, { x: [S.rp], y: [Hm.eta], color: c('--text'), line: false, points: true, pointSize: 4, noLegend: true }] });
    eP.setOpts({ ylim: [0, 1] });
    wP.setData({ series: [{ x: rps, y: hs.map(x => x.wnetRatio), color: c('--lower'), label: 'Humphrey' }, { x: rps, y: bs.map(x => x.wnetRatio), color: c('--upper'), label: 'Brayton (same q)' }] });
    wP.setOpts({ yZero: true });
    const h1 = E.humphrey({ rp: 1, T1: S.T1, q: Hm.q, g: S.g });
    insightsList(insEl, [
      { type: 'i', t: `With no compressor at all: η = ${(h1.eta * 100).toFixed(1)}%`, d: 'A valveless pulsejet or a pulse detonation engine has little or no mechanical compression, yet still converts heat to work because combustion itself raises the pressure. A Brayton engine at p₂/p₁ = 1 makes nothing.' },
      { type: 'i', t: 'Valved pulsejet sequence', d: 'Fresh air flows in through reed valves and mixes with fuel; it ignites and the pressure rise shuts the valves and drives a compression wave out of the tailpipe. The reflected expansion wave drops the pressure, the valves open, and the cycle repeats at 40–250 Hz (the V-1 flew on one at about 45 Hz).' },
      { type: 'i', t: 'Deflagration vs detonation', d: 'A deflagration is a subsonic flame (centimeters to meters per second) with a slight pressure <i>drop</i>. A detonation is a shock wave sustained by the heat it releases, moving at 1.5–3 km/s and raising pressure 15–20×. Making a pulse engine detonate (a PDE) brings it much closer to the ideal Humphrey cycle.' },
      { type: 'w', t: 'Ideal model', d: 'Constant γ and instantaneous combustion. Real pulse engines lose much of the gain to unsteady mixing, incomplete filling and heat loss; rotating detonation engines are an attempt to get the benefit continuously.' },
    ]);
  }
  build();
  return { controls, main, show() { run(); } };
}
