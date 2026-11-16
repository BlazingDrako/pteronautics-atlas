// Shocks & Nozzles: plug (aerospike) and expansion-deflection nozzles on the flow stage. The flow field is the
// corner-centered Prandtl–Meyer fan of js/solvers/plugNozzle.js, so the free jet boundary moves with back pressure.
import { h } from '../../lib/ui.js';
import { poly, line, label, body } from './field.js';
import { fmt } from './common.js';
import * as P from '../../solvers/plugNozzle.js';
import { isen, M_from_A } from '../../solvers/gasdyn.js';

export const PLUG_TYPES = ['plug', 'aerospike', 'ed'];
const NAMES = { plug: 'Ideal plug (full-length spike)', aerospike: 'Truncated aerospike', ed: 'Expansion-deflection' };

export function plugUpdate(S, ui) {
  const { stage, metrics, badge, regBar, pPlot, mPlot, cfPlot, resEl, insEl, meHint, pbHint, insightsList, col } = ui;
  const g = S.g, D = P.design({ type: S.type, eps: S.eps, g, trunc: S.trunc }), O = P.operating(D, S.pb);
  const choked = S.pb < 1 / isen.p0_p(1, g);
  const REG = { over: ['Over-expanded: compensating', '--warn'], design: ['Design (ideally expanded)', '--good'], under: ['Under-expanded', '--turb'] };
  const [rn, rc] = choked ? REG[O.regime] : ['Subsonic (not choked)', '--lam'];
  badge.replaceChildren(h('span', { class: 'dot', style: { background: `var(${rc})` } }), rn);
  meHint.textContent = `Design exit Mach ${D.Me.toFixed(3)} · design pe/p₀ = ${D.pe.toFixed(5)} · contour by Angelino's method (planar), ${(D.length).toFixed(1)} throat gaps long${D.type === 'aerospike' ? `, cut at ${(S.trunc * 100).toFixed(0)}%` : ''}`;
  pbHint.textContent = `pb = ${(S.pb * S.p0).toFixed(2)} kPa · design (3rd critical) ${D.pe.toFixed(5)} · no normal shock can form inside: one side of the jet is free.`;
  const CF = P.thrustCoefficient(D, S.pb), CFb = P.cfFixed(S.eps, g, S.pb);
  const At = S.At * 1e-4, p0 = S.p0 * 1000, mdot = isen.mfp(1, g) * p0 * At / Math.sqrt(S.R * S.T0);
  const F = CF * p0 * At, cstar = p0 * At / mdot;
  metrics.set([
    { k: 'Fan ends at Mach', v: fmt(O.Mb, 3), s: `design ${D.Me.toFixed(3)}` },
    { k: 'pe / pb (design exit)', v: fmt(D.pe / S.pb, 3), s: O.regime === 'over' ? 'jet boundary pulled in' : O.regime === 'under' ? 'jet balloons out' : 'matched' },
    { k: 'Mass flow', v: mdot >= 1 ? mdot.toFixed(2) + ' kg/s' : (mdot * 1000).toFixed(1) + ' g/s', s: 'choked' },
    { k: 'Thrust', v: Math.abs(F) >= 1e4 ? (F / 1000).toFixed(1) + ' kN' : F.toFixed(1) + ' N' },
    { k: 'CF', v: fmt(CF, 4), s: `fixed nozzle of the same ε: ${fmt(CFb, 4)}` },
    { k: 'Isp', v: (CF * cstar / 9.80665).toFixed(1) + ' s' },
  ]);
  // regime bar: no shock band, the compensating range runs from design to choking
  const lg = v => (Math.log10(Math.max(v, 1e-3)) + 3) / 3 * 100, pc = 1 / isen.p0_p(1, g);
  const zone = (a, b, cls, txt) => h('div', { class: 'z', style: { left: lg(a) + '%', width: Math.max(0.6, lg(b) - lg(a)) + '%', background: `color-mix(in srgb, var(${cls}) 30%, transparent)`, borderColor: `var(${cls})` } }, h('span', {}, txt));
  regBar.replaceChildren(h('div', { class: 'track' }, zone(1e-3, D.pe, '--turb', 'Under'), zone(D.pe, pc, '--warn', 'Compensating (free boundary)'), zone(pc, 1, '--lam', 'Subsonic'), h('div', { class: 'mk', style: { left: lg(S.pb) + '%' } })),
    h('div', { class: 'ticks' }, ...['0.001', '0.01', '0.1', '1'].map((t, i) => h('span', { style: { left: (i / 3 * 100) + '%' } }, t)), h('span', { class: 'ttl' }, 'pb / p₀ (log)')));
  // wall distributions
  const Wd = P.wallDistribution(D, O), Wdes = P.wallDistribution(D, P.operating(D, D.pe));
  pPlot.setData({ series: [{ x: Wdes.x, y: Wdes.p, color: col('--text-3'), width: 1, dash: [4, 4], label: 'design' }, { x: Wd.x, y: Wd.p, color: col(rc), width: 2.6, label: 'wall p/p₀' }],
    hlines: [{ y: S.pb, color: col('--text-2'), label: 'pb/p₀ = ' + S.pb.toFixed(4) }] });
  pPlot.setOpts({ ylim: [0, 0.6] });
  mPlot.setData({ series: [{ x: Wd.x, y: Wd.M, color: col(rc), width: 2.4, label: 'M' }], hlines: [{ y: D.Me, color: col('--text-3'), label: 'design Me' }] });
  const xs = [], a = [], b = [], c = [];
  for (let i = 0; i <= 120; i++) {
    const lp = -3.3 + 3.3 * i / 120, pb = 10 ** lp; if (pb >= pc) continue;
    const Mi = Math.sqrt(Math.max(0, (pb ** (-(g - 1) / g) - 1) * 2 / (g - 1)));
    xs.push(lp); a.push(P.thrustCoefficient(D, pb)); b.push(P.cfFixed(S.eps, g, pb)); c.push(P.cfMomentum(Math.max(1, Mi), g));
  }
  cfPlot.setData({ series: [{ x: xs, y: a, color: col('--accent'), label: NAMES[D.type] }, { x: xs, y: b, color: col('--lower'), label: `fixed nozzle, ε ${S.eps.toFixed(1)} (no separation)` }, { x: xs, y: c, color: col('--good'), dash: [5, 4], label: 'ideal (pe = pb)' },
    { x: [Math.log10(S.pb)], y: [CF], color: col(rc), points: true, pointSize: 5, line: false, label: 'operating point' }] });
  // results
  const r = [], add = (k, v, hl) => r.push(h('div', { class: 'r' + (hl ? ' hl' : '') }, h('span', {}, k), h('span', {}, v)));
  add('Nozzle', NAMES[D.type], true); add('Regime', rn); add('Design exit Mach', fmt(D.Me)); add('Prandtl–Meyer turn νe', (D.nue * 180 / Math.PI).toFixed(2) + '°');
  add('Fan ends at Mach', fmt(O.Mb)); add('Jet boundary angle', (Math.abs(O.deltaB) * 180 / Math.PI).toFixed(2) + '° ' + (O.deltaB > 0 ? (D.type === 'ed' ? 'outward (wake open)' : 'inward') : O.deltaB < 0 ? (D.type === 'ed' ? 'inward (wake closing)' : 'outward') : ''));
  add('Thrust F', F.toFixed(1) + ' N', true); add('CF', fmt(CF)); add('CF fixed nozzle', fmt(CFb)); add('Gain over fixed nozzle', ((CF / CFb - 1) * 100).toFixed(1) + '%');
  add('Contour length / throat gap', D.length.toFixed(2)); if (D.base) add('Base height / throat gap', D.base.y.toFixed(2));
  resEl.replaceChildren(...r);
  // insights
  const L = [];
  L.push({ type: O.regime === 'design' ? 'g' : 'i', t: rn, d: O.regime === 'over'
    ? `Back pressure is above the design exit pressure, but there is no wall on the ${D.type === 'ed' ? 'inner' : 'outer'} side of the jet. The expansion around the ${D.type === 'ed' ? 'deflector edge' : 'cowl lip'} simply stops at M ${O.Mb.toFixed(2)} where p = pb, and the free boundary bends ${D.type === 'ed' ? 'outward, leaving an open wake at ambient pressure in the middle' : 'inward toward the spike'}. No separation, no shock in the nozzle: the jet expands only as far as the atmosphere lets it.`
    : O.regime === 'under' ? `Back pressure is below design. The fan at the ${D.type === 'ed' ? 'deflector' : 'lip'} keeps expanding past M ${D.Me.toFixed(2)}, but the extra turning happens outside the contour, so like a fixed nozzle it cannot add thrust.`
    : 'The last Mach line of the fan just reaches the end of the contour: uniform, axial exit flow.' });
  L.push({ type: 'i', t: 'Angelino\'s contour', d: `Each Mach line of the fan leaves the corner at φ = νe − ν(M) + μ(M). Mass conservation across it, l·sin μ = (A/A*)(M)·h*, places the wall. Planar flow makes the centered fan exact; the axisymmetric version differs only in the area of each conical Mach surface.` });
  if (D.type === 'aerospike') L.push({ type: 'i', t: 'Why truncate', d: `A full plug is long (${D.length.toFixed(0)} throat gaps here) and heavy. Cutting it at ${(S.trunc * 100).toFixed(0)}% leaves a flat base; the recirculating flow there (often fed by a little bleed or turbine exhaust) acts as the rest of the spike and costs only 1–2% of thrust. XRS-2200 (X-33) and RS-2200 used this layout.` });
  if (D.type === 'ed') L.push({ type: 'i', t: 'Expansion-deflection', d: 'The deflector turns the flow outward against the bell wall, so the inside of the jet is the free boundary. At low altitude the middle stays an open wake at ambient pressure; as pressure falls the wake closes and the nozzle runs full. Shorter than a plug, but the wake can be unsteady.' });
  L.push({ type: 'w', t: 'Model limits', d: 'Ideal, inviscid, planar: the corner fan and the uniform region beyond it. Reflected waves from the free boundary, shear layers and the real base-pressure physics are left out.' });
  insightsList(insEl, L);
  stage.setScene(scene(S, D, O));
  return { crit: { p1: pc, p2: Math.min(pc * 0.95, D.pe * 12), p3: D.pe }, regime: O.regime };
}

function scene(S, D, O) {
  const ed = D.type === 'ed', cy = D.cornerY, th = D.throat;
  const Lc = Math.max(3, 0.25 * D.length), x0 = th.x - Lc;
  const plume = D.type === 'aerospike' ? 1.6 * D.length : 0.7 * D.length;
  const tipX = D.type === 'aerospike' ? D.base.x : D.tip.x;
  const x1 = tipX + Math.max(plume, 0.35 * D.length);
  const t = Math.max(0.6, 0.06 * cy);
  const ymax = Math.max(cy + 2.5 * t + 1, ed ? D.tip.y + 2 * t + 1 : 0) * 1.12;
  // chamber walls (behind the throat line)
  // closed, converging chamber channels leading to the throat
  const cowlIn = x => cy + 1.2 * (1 - Math.exp(Math.min(0, x) / 1.5));            // plug: cowl inner surface
  const bodyTop = x => (x <= th.x ? th.y : NaN);                                  // plug: centerbody behind the throat
  const defl = x => (x <= -1.2 ? 0.4 : x <= -0.25 ? 0.4 + (cy - 0.4) * (x + 1.2) / 0.95 : cy); // E-D deflector
  const edOuter = x => th.y + 1.2 * (1 - Math.exp(Math.min(0, x - th.x) / 1.5));  // E-D chamber outer wall
  // subsonic chamber flow: Mach number from the channel height (throat gap = 1), turning toward the throat direction
  const chamber = x => {
    // channel height (throat gap = 1) shrinking smoothly to the throat, so the Mach number rises without a jump
    const gapAt = xx => (ed ? edOuter(xx) - defl(xx) : cowlIn(xx) - th.y);
    const ar = x <= th.x ? gapAt(x) : 1 + (gapAt(th.x) - 1) * Math.max(0, -x) / Math.max(1e-6, -th.x);
    const M = M_from_A(Math.max(1.0001, ar), g, false), w = Math.exp(-Math.max(0, th.x - x) / 1.2);
    return { M, th: (ed ? 1 : -1) * D.nue * w * 0.6, p: 1 / isen.p0_p(M, g), T: 1 / isen.T0_T(M, g), rho: 1 / isen.r0_r(M, g), p0: 1, k: 1 };
  };
  const g = S.g;
  const fill = Gd => {
    const { nx, ny } = Gd, amb = { M: 0, th: 0, p: S.pb, T: 1, rho: 1, p0: 1, k: 2 };
    for (let j = 0; j < ny; j++) {
      const yy = Gd.y0 + (j + 0.5) * Gd.dy, y = Math.abs(yy), sg = yy < 0 ? -1 : 1;
      for (let i = 0; i < nx; i++) {
        const x = Gd.x0 + (i + 0.5) * Gd.dx, k = j * nx + i;
        let s = P.stateAt(D, O, x, y);
        if (s === P.UPSTREAM) {
          if (x < x0) s = amb;
          else if (!ed) s = x <= 0.05 && y < cowlIn(x) && !(y < bodyTop(x)) ? chamber(x) : x > 0 || y >= cowlIn(x) + t ? amb : null;
          else s = x <= 0 && y > defl(x) && y < edOuter(x) ? chamber(x) : x < th.x && y >= edOuter(x) + t ? amb : null;
        }
        if (!s) { Gd.set(k, amb); continue; }
        Gd.set(k, s.k === 1 ? { ...s, th: sg * s.th } : s);
      }
    }
  };
  const mirror = pts => pts.map(p => ({ x: p.x, y: -p.y }));
  const bodies = [];
  if (!ed) {
    // centerbody / spike (both halves in one polygon)
    const top = [{ x: x0, y: th.y }, ...D.wall.map(p => ({ x: p.x, y: p.y }))];
    if (D.base) top.push({ x: D.base.x, y: 0 }); else top.push({ x: D.tip.x, y: 0 });
    bodies.push([...top, ...mirror(top).reverse()]);
    // cowl (upper and lower)
    const cin = []; for (let i = 0; i <= 24; i++) { const x = x0 * i / 24; cin.push({ x, y: cowlIn(x) }); }
    const cowl = [...cin, { x: x0, y: cowlIn(x0) + t }, { x: -0.6 * t, y: cy + t }];
    bodies.push(cowl, mirror(cowl));
  } else {
    const dpts = [{ x: x0, y: 0.4 }, { x: -1.2, y: 0.4 }, { x: -0.25, y: cy }, { x: 0, y: cy }];
    bodies.push([...dpts, ...mirror(dpts).reverse()]);
    const wo = []; for (let i = 0; i <= 24; i++) { const x = x0 + (th.x - x0) * i / 24; wo.push({ x, y: edOuter(x) }); }
    const wall = [...wo, ...D.wall.map(p => ({ x: p.x, y: p.y }))];
    const outer = [...wall, ...wall.slice().reverse().map(p => ({ x: p.x, y: p.y + t }))];
    bodies.push(outer, mirror(outer));
  }
  const fanRays = [];
  for (let k = 0; k <= 10; k++) {
    const M = 1.0001 + (O.Mb - 1.0001) * k / 10, a = D.ray(M);
    let len = 1.3 * D.length;
    if (M <= D.Me) { const w = D.wallPt(M); len = Math.hypot(w.x, w.y - cy); if (D.base && w.x > D.base.x) len = Math.min(len, (D.base.x) / Math.max(0.05, Math.cos(a)) + 0.5 * D.length); }
    fanRays.push({ a, len, M });
  }
  const dir = (a, l) => ({ x: l * Math.cos(a), y: cy + (ed ? 1 : -1) * l * Math.sin(a) });
  const bLen = 1.2 * D.length;
  return {
    bounds: { x0: x0 - 0.5, x1, y0: -ymax, y1: ymax }, anchor: 'left', pad: 8, fill, speed: 1.1, nParticles: 520,
    refNames: { p: 'p/p₀', T: 'T/T₀', rho: 'ρ/ρ₀', p0: 'p₀ local/p₀' },
    qlabel: { M: 'Mach number', p: 'Pressure p/p₀', T: 'Temperature T/T₀', glow: 'Exhaust glow (T/T₀)' },
    ranges: { glow: [0.15, 1.02] },
    spawn: init => {
      if (init && Math.random() < 0.7) { const x = th.x + Math.random() * (x1 - th.x); return { x, y: (Math.random() * 2 - 1) * ymax * 0.9 }; }
      const sg = Math.random() < 0.5 ? -1 : 1;
      if (Math.random() < 0.8) { // most inflow starts on the throat line, where the gas is already moving fast
        const f = 0.05 + 0.9 * Math.random();
        return { x: th.x + (0 - th.x) * f - 0.05, y: sg * (th.y + (cy - th.y) * f) };
      }
      const lo = ed ? defl(x0) : th.y, hi = ed ? edOuter(x0) : cowlIn(x0);
      return { x: x0 + 0.1, y: sg * (lo + (0.08 + 0.84 * Math.random()) * (hi - lo)) };
    },
    readout: (x, y, s) => !s || s.k !== 1 ? null : `M ${s.M.toFixed(3)}<br>p/p₀ ${s.p.toFixed(4)}<br>T/T₀ ${s.T.toFixed(4)}${s.base ? '<br>base recirculation (schematic)' : ''}`,
    draw: ctx => {
      const dark = ctx.dark || ctx.fieldOn, wc = dark ? 'rgba(255,255,255,0.35)' : 'rgba(20,24,33,0.32)';
      if (ctx.layers.waves) {
        for (const sg of [1, -1]) {
          for (const r of fanRays) { const e = dir(r.a, r.len); line(ctx, { x: 0, y: sg * cy }, { x: e.x, y: sg * e.y }, wc, 0.8); }
          const e = dir(O.deltaB, bLen);
          poly(ctx, [{ x: 0, y: sg * cy }, { x: e.x, y: sg * e.y }], { stroke: dark ? 'rgba(255,255,255,0.8)' : 'rgba(20,24,33,0.65)', width: 1.4, close: false, dash: [6, 4] });
          line(ctx, { x: 0, y: sg * cy }, { x: th.x, y: sg * th.y }, dark ? 'rgba(255,255,255,0.6)' : 'rgba(20,24,33,0.5)', 1.2, [2, 3]);
        }
      }
      for (const b of bodies) body(ctx, b);
      const e = dir(O.deltaB, bLen * 0.55);
      label(ctx, { x: e.x, y: e.y }, 'free jet boundary', { dy: ed ? 12 : -12, align: 'center' });
      label(ctx, { x: 0, y: cy + (ed ? -0.6 : t) }, ed ? 'deflector edge' : 'cowl lip', { dy: ed ? 0 : -12, align: 'center' });
      label(ctx, { x: th.x, y: -th.y }, 'throat', { dy: ed ? -12 : 12, align: 'center', bg: false, color: ctx.css('--text-2') });
      if (D.base) label(ctx, { x: D.base.x, y: 0 }, 'base', { dx: 8, color: ctx.css('--text-2') });
      if (ed) label(ctx, { x: 0.45 * D.tip.x, y: 0 }, O.deltaB > 0.01 ? 'open wake (ambient)' : 'wake closed', { align: 'center', color: ctx.css('--text-2') });
      label(ctx, { x: x1 - 0.5, y: ymax - 0.5 }, `ambient pb ${(S.pb * S.p0).toFixed(2)} kPa`, { align: 'right', base: 'top' });
      label(ctx, { x: x0 + 0.3, y: -ymax + 0.4 }, 'planar section (linear plug)', { base: 'bottom', bg: false, color: ctx.css('--text-3') });
    },
  };
}
