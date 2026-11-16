// Rotorcraft: helicopter power required from hover through forward flight (induced, profile and parasite power),
// endurance and range speeds, autorotation, and multirotor drone hover endurance.
import { h, section, cssVar } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import * as X from '../../solvers/rotors.js';
import { bound, boundSelect, metricsGrid, insightsList, card, put } from '../propulsion/common.js';

export function rotorcraftTab({ keep = o => o } = {}) {
  const S = keep({ heli: 'r22', ...X.HELIS[0], rho: 1.225, g: 9.80665, mr: { mass: 1.5, n: 4, D: 0.254, FM: 0.65, etaE: 0.8, Wh: 77, usable: 0.8 } });
  const controls = h('div'), main = h('div', { class: 'cf-main-inner' });
  const metrics = metricsGrid();
  const pCard = card('Power required vs airspeed', 'Induced power falls as forward speed brings more air through the disk; profile power (blade drag) rises slowly; parasite power (fuselage drag) rises with V³. The bottom of the bucket is the best-endurance speed; the tangent from the origin the best-range speed.');
  const pPlot = new Plot(pCard, { xlabel: 'airspeed (m/s)', ylabel: 'power (kW)', xname: 'V', yname: 'P', xfmt: v => v.toFixed(1) + ' m/s', yfmt: v => v.toFixed(1) + ' kW', legendPos: 'above' });
  pPlot.wrap.style.height = '300px';
  const dCard = card('Multirotor drone', 'Hover power = n·T^(3/2)/√(2ρA) / (FM·η_electric), endurance = usable battery energy / power.'); const dEl = h('div'); dCard.append(dEl);
  const dPlot = new Plot(dCard, { xlabel: 'take-off mass (kg)', ylabel: 'hover endurance (min)', xname: 'm', yname: 't', xfmt: v => v.toFixed(2) + ' kg', yfmt: v => v.toFixed(1) + ' min' });
  dPlot.wrap.style.height = '220px';
  const insCard = card('Notes'); const insEl = h('div'); insCard.append(insEl);
  main.append(metrics.el, pCard, h('div', { class: 'cf-grid2b' }, insCard, dCard));

  const build = () => {
    const s0 = section('Helicopter');
    put(s0.body,
      boundSelect(S, 'heli', 'Example', [...X.HELIS.map(x => ({ value: x.id, label: x.label })), { value: 'custom', label: 'Custom' }], v => { const x = X.HELIS.find(q => q.id === v); if (x) Object.assign(S, x, { rho: x.rho ?? 1.225, g: x.g ?? 9.80665 }); build(); run(); }, 'Approximate data. Ingenuity is modeled as one rotor of equal total disk area.'),
      bound(S, 'm', 'Gross mass', 0.5, 50000, { step: 0.1, log: true, digits: 1, unit: 'kg', onInput: run }),
      bound(S, 'R', 'Rotor radius', 0.1, 20, { step: 0.01, log: true, digits: 2, unit: 'm', onInput: run }),
      bound(S, 'B', 'Blades', 2, 8, { step: 1, digits: 0, onInput: run }),
      bound(S, 'c', 'Blade chord', 0.01, 1.2, { step: 0.005, log: true, digits: 3, unit: 'm', onInput: run }),
      bound(S, 'Vt', 'Tip speed ΩR', 100, 260, { step: 1, digits: 0, unit: 'm/s', onInput: run }),
      bound(S, 'f', 'Equivalent flat-plate drag area f', 0.01, 10, { step: 0.01, log: true, digits: 2, unit: 'm²', onInput: run }),
      bound(S, 'Cd0', 'Blade profile drag C_d0', 0.006, 0.04, { step: 0.001, digits: 3, onInput: run }),
      bound(S, 'kappa', 'Induced power factor κ', 1.0, 1.4, { step: 0.01, digits: 2, onInput: run }),
      bound(S, 'rho', 'Air density', 0.01, 1.3, { step: 0.001, digits: 4, unit: 'kg/m³', onInput: run }),
      bound(S, 'g', 'Gravity', 1, 10, { step: 0.01, digits: 2, unit: 'm/s²', onInput: run, tip: 'Mars 3.71 m/s².' }));
    const s1 = section('Multirotor drone');
    const M = S.mr;
    put(s1.body,
      bound(M, 'mass', 'Take-off mass', 0.05, 30, { step: 0.01, log: true, digits: 2, unit: 'kg', onInput: run }),
      bound(M, 'n', 'Rotors', 3, 12, { step: 1, digits: 0, onInput: run }),
      bound(M, 'D', 'Propeller diameter', 0.05, 1, { step: 0.001, log: true, digits: 3, unit: 'm', onInput: run }),
      bound(M, 'FM', 'Figure of merit', 0.4, 0.8, { step: 0.01, digits: 2, onInput: run }),
      bound(M, 'etaE', 'Motor + controller efficiency', 0.5, 0.95, { step: 0.01, digits: 2, onInput: run }),
      bound(M, 'Wh', 'Battery energy', 1, 2000, { step: 1, log: true, digits: 0, unit: 'Wh', onInput: run }),
      bound(M, 'usable', 'Usable fraction', 0.5, 1, { step: 0.01, digits: 2, onInput: run }));
    controls.replaceChildren(s0.el, s1.el);
  };

  function run() {
    const hh = { m: S.m, R: S.R, B: Math.round(S.B), c: S.c, Vt: S.Vt, f: S.f, Cd0: S.Cd0, kappa: S.kappa, rho: S.rho, g: S.g };
    const sw = X.heliSweep(hh, Math.min(110, S.Vt * 0.45)), c = n => cssVar(n), Hv = sw.hover;
    const k = v => v / 1000;
    const inst = X.HELIS.find(x => x.id === S.heli)?.Pinst;
    pPlot.setData({ series: [
      { x: sw.pts.map(p => p.V), y: sw.pts.map(p => k(p.Pi)), color: c('--upper'), label: 'induced' },
      { x: sw.pts.map(p => p.V), y: sw.pts.map(p => k(p.P0)), color: c('--good'), label: 'profile' },
      { x: sw.pts.map(p => p.V), y: sw.pts.map(p => k(p.Pp)), color: c('--warn'), label: 'parasite' },
      { x: sw.pts.map(p => p.V), y: sw.pts.map(p => k(p.P)), color: c('--lower'), label: 'total', width: 2.6 },
      { x: [0, sw.bestRange.V * 1.6], y: [0, k(sw.bestRange.P) * 1.6], color: c('--text-3'), dash: [3, 4], label: 'best-range tangent', noHover: true },
      { x: [sw.minP.V, sw.bestRange.V], y: [k(sw.minP.P), k(sw.bestRange.P)], color: c('--text'), line: false, points: true, pointSize: 4.5, noLegend: true, extra: i => (i ? 'best range' : 'best endurance') },
    ], hlines: inst && S.heli !== 'custom' ? [{ y: inst / 1000, color: c('--bad'), label: 'installed power', labelAt: 1 }] : [] });
    pPlot.setOpts({ yZero: true });
    metrics.set([
      { k: 'Hover power', v: k(Hv.P).toFixed(1) + ' kW', s: `induced ${k(Hv.Pi).toFixed(1)}, profile ${k(Hv.P0).toFixed(1)}` },
      { k: 'Figure of merit', v: Hv.FM.toFixed(3) },
      { k: 'Disk loading', v: Hv.DL.toFixed(0) + ' N/m²', s: `induced velocity ${Hv.vh.toFixed(2)} m/s` },
      { k: 'C_T/σ', v: Hv.CTs.toFixed(3), s: `solidity σ ${Hv.sigma.toFixed(3)}`, cls: Hv.CTs > 0.12 ? 'bad' : '', tip: 'Blade loading. Above about 0.12 the blades approach stall.' },
      { k: 'Best endurance', v: (sw.minP.V * 1.944).toFixed(0) + ' kt', s: `${k(sw.minP.P).toFixed(1)} kW` },
      { k: 'Best range', v: (sw.bestRange.V * 1.944).toFixed(0) + ' kt', s: `${k(sw.bestRange.P).toFixed(1)} kW` },
      { k: 'Autorotation descent', v: (sw.autoForward * 196.85).toFixed(0) + ' ft/min', s: `${sw.autoForward.toFixed(1)} m/s forward; vertical ≈ ${sw.autoVertical.toFixed(1)} m/s` },
    ]);
    const M = X.multirotor({ ...S.mr, n: Math.round(S.mr.n), rho: S.rho, g: S.g });
    dEl.replaceChildren(h('div', { class: 'hint' }, `Hover power ${M.P.toFixed(0)} W (ideal ${M.Pideal.toFixed(0)} W) · disk loading ${M.DL.toFixed(0)} N/m² · endurance ${(M.endurance / 60).toFixed(1)} min · ${(M.PL * 1000).toFixed(1)} g of thrust per W`));
    const ms = []; for (let m = S.mr.mass * 0.3; m <= S.mr.mass * 3; m *= 1.05) ms.push(m);
    dPlot.setData({ series: [{ x: ms, y: ms.map(m => X.multirotor({ ...S.mr, mass: m, n: Math.round(S.mr.n), rho: S.rho, g: S.g }).endurance / 60), color: c('--upper'), label: 'endurance' }, { x: [S.mr.mass], y: [M.endurance / 60], color: c('--text'), line: false, points: true, pointSize: 4.5, noLegend: true }] });
    const L = [];
    if (inst && S.heli !== 'custom' && Hv.P > inst) L.push({ type: 'b', t: 'Cannot hover out of ground effect', d: 'Required hover power exceeds the installed power at this density and mass.' });
    L.push({ type: 'i', t: 'Why the bucket', d: `In hover the rotor must accelerate its own downwash (vᵢ = ${Hv.vh.toFixed(1)} m/s). In forward flight it meets fresh air, so far less induced velocity is needed (Glauert: vᵢ → W/(2ρAV)). Parasite power grows with V³ and dominates at high speed; retreating-blade stall sets the top speed.` });
    L.push({ type: 'i', t: 'Autorotation', d: 'With no engine, air flowing up through the rotor keeps it turning. The rate of descent in steady forward autorotation is roughly the minimum power divided by weight; pilots fly the best-endurance (minimum-power) speed to descend slowest, then flare to trade rotor energy for a soft landing.' });
    if (S.heli === 'ingenuity') L.push({ type: 'i', t: 'Flying on Mars', d: 'Air density is about 1% of Earth\'s, so even with 3/8 of the gravity the rotor needs a very large disk, high tip speed and low weight; the low Reynolds number raises blade drag (C_d0 ≈ 0.03+).' });
    insightsList(insEl, L);
  }
  build();
  return { controls, main, show() { run(); } };
}
