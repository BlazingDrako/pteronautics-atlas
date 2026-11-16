// Piston engines: ideal Otto and Diesel cycles in a running cylinder, imep and shaft power from the air flow and the
// fuel's heating value, and supercharging or turbocharging with intercooling as the aircraft climbs.
import { h, section, icon, cssVar } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import * as E from '../../solvers/heatEngines.js';
import { atmosphere } from '../../solvers/atmosphere.js';
import { bound, boundSeg, boundSelect, metricsGrid, insightsList, card, put, canvasBox } from '../propulsion/common.js';

// Approximate published data. Power is the rated takeoff power at the shaft.
export const ENGINES = [
  { id: 'o360', label: 'Lycoming O-360 (Cessna 172, Piper)', kind: 'otto', strokes: 4, r: 8.5, Vd: 5.92, rpm: 2700, phi: 1.1, drive: 'none', rated: 134, fuel: 'avgas' },
  { id: 'rotax', label: 'Rotax 912 ULS (light sport)', kind: 'otto', strokes: 4, r: 10.8, Vd: 1.352, rpm: 5800, phi: 1.05, drive: 'none', rated: 73.5, fuel: 'avgas' },
  { id: 'r1830', label: 'P&W R-1830 Twin Wasp (DC-3, B-24)', kind: 'otto', strokes: 4, r: 6.7, Vd: 29.978, rpm: 2700, phi: 1.15, drive: 'gear', piS: 1.6, pMax: 1.6, ic: 0, rated: 895, fuel: 'avgas' },
  { id: 'merlin', label: 'Packard V-1650 Merlin (P-51 Mustang)', kind: 'otto', strokes: 4, r: 6.0, Vd: 27.0, rpm: 3000, phi: 1.15, drive: 'gear', piS: 3.0, pMax: 2.05, ic: 0.6, etaS: 0.7, rated: 1100, fuel: 'avgas' },
  { id: 'centurion', label: 'Thielert Centurion 2.0 (diesel)', kind: 'diesel', strokes: 4, r: 18, Vd: 1.991, rpm: 3900, phi: 0.6, drive: 'turbo', piS: 2.2, pMax: 2.3, ic: 0.7, rated: 99, fuel: 'jeta' },
  { id: 'twostroke', label: 'Small two-stroke (paramotor)', kind: 'otto', strokes: 2, r: 7, Vd: 0.185, rpm: 7800, phi: 1.1, drive: 'none', rated: 18, etaV: 0.6, fuel: 'avgas' },
];
const FUELS = {
  avgas: { label: 'Avgas 100LL', LHV: 43.5, AFs: 14.8 },
  gasoline: { label: 'Automotive gasoline', LHV: 42.8, AFs: 14.8 },
  jeta: { label: 'Jet-A / diesel', LHV: 43.0, AFs: 14.5 },
  ethanol: { label: 'Ethanol', LHV: 26.8, AFs: 9.0 },
};

export function pistonTab({ keep = o => o } = {}) {
  const S = keep({
    preset: 'o360', kind: 'otto', strokes: 4, r: 8.5, Vd: 5.92, rpm: 2700, etaV: 1, phi: 1.1, fuel: 'avgas', etaB: 1, factor: 1,
    g: 1.4, alt: 0, drive: 'none', piS: 2, etaS: 0.75, ic: 0, pMax: 1.6, crank: 0, playing: true, logpv: false,
  });
  const controls = h('div'), main = h('div', { class: 'cf-main-inner' });
  const metrics = metricsGrid();
  const anim = canvasBox('cf-chart', '340px');
  const vCard = card('The cylinder', 'A four-stroke turns the crank twice per cycle: intake, compression, power, exhaust. A two-stroke does it in one turn by scavenging through ports in the cylinder wall. The gas is colored by temperature; the dot on the p–v diagram follows the piston.');
  const play = h('button', { class: 'btn sm', type: 'button' });
  vCard.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, play), anim.el);
  const pvCard = card('p–v diagram', 'The enclosed area is the net work per cycle. In the ideal cycle intake and exhaust happen at the same pressure, so the pumping loop has no area.');
  const pv = new Plot(pvCard, { xlabel: 'volume, all cylinders (cm³)', ylabel: 'pressure (bar)', xname: 'V', yname: 'p', xfmt: v => v.toFixed(0) + ' cm³', yfmt: v => v.toFixed(2) + ' bar' });
  const tsCard = card('T–s diagram', 'Entropy relative to state 1. Compression and expansion are vertical (isentropic); heat addition follows a constant-volume line (Otto) or a constant-pressure line (Diesel), which is flatter.');
  const ts = new Plot(tsCard, { xlabel: 's − s₁ (J/kg·K)', ylabel: 'T (K)', xname: 's', yname: 'T', xfmt: v => v.toFixed(0), yfmt: v => v.toFixed(0) + ' K' });
  const effCard = card('Efficiency vs compression ratio', 'Ideal Otto η = 1 − r^(1−γ). Diesel curves are drawn at the cutoff ratio of the current heat input. Autoignition limits spark-ignition engines to about r = 11; Diesels need r ≈ 14 or more to ignite.');
  const effPlot = new Plot(effCard, { xlabel: 'compression ratio r', ylabel: 'thermal efficiency', xname: 'r', yname: 'η', xfmt: v => v.toFixed(1), yfmt: v => (v * 100).toFixed(1) + '%', legendPos: 'bottom' });
  const altCard = card('Power vs altitude', 'Same engine naturally aspirated, with a gear-driven supercharger and with a turbocharger, all at the boost limit chosen. The supercharger line sits lower because the engine drives its compressor.');
  const altPlot = new Plot(altCard, { xlabel: 'altitude (km)', ylabel: 'shaft power (kW)', xname: 'altitude', yname: 'P', xfmt: v => v.toFixed(1) + ' km', yfmt: v => v.toFixed(0) + ' kW', legendPos: 'bottom' });
  for (const p of [pv, ts, effPlot, altPlot]) p.wrap.style.height = '250px';
  const insCard = card('What this engine tells you'); const insEl = h('div'); insCard.append(insEl);
  main.append(metrics.el, h('div', { class: 'cf-grid2b' }, vCard, pvCard), h('div', { class: 'cf-grid2b' }, tsCard, effCard), h('div', { class: 'cf-grid2b' }, altCard, insCard));

  const atm = () => atmosphere(S.alt * 1000);
  const solve = (alt = S.alt, drive = S.drive) => {
    const f = FUELS[S.fuel];
    return E.boostedEngine({ kind: S.kind, strokes: S.strokes, r: S.r, Vd: S.Vd / 1000, rpm: S.rpm, etaV: S.etaV, phi: S.phi, AFs: f.AFs, LHV: f.LHV * 1e6, etaB: S.etaB, factor: S.factor, g: S.g, R: 287.05, drive, piS: S.piS, etaS: S.etaS, ic: S.ic, pMax: S.pMax * 1e5 }, atmosphere(alt * 1000));
  };
  let R = solve();

  const build = () => {
    const sp = section('Engine');
    put(sp.body,
      boundSelect(S, 'preset', 'Example engine', [...ENGINES.map(e => ({ value: e.id, label: e.label })), { value: 'custom', label: 'Custom' }], v => { const e = ENGINES.find(x => x.id === v); if (e) Object.assign(S, { kind: e.kind, strokes: e.strokes, r: e.r, Vd: e.Vd, rpm: e.rpm, phi: e.phi, drive: e.drive, piS: e.piS ?? 2, pMax: e.pMax ?? 1.6, ic: e.ic ?? 0, etaS: e.etaS ?? 0.75, etaV: e.etaV ?? 1, fuel: e.fuel }); build(); run(); }, 'Approximate published data. The rated power is shown next to the model for comparison.'),
      boundSeg(S, 'kind', 'Cycle', [{ value: 'otto', label: 'Otto (spark)' }, { value: 'diesel', label: 'Diesel (compression)' }], () => { S.preset = 'custom'; build(); run(); }),
      boundSeg(S, 'strokes', 'Strokes', [{ value: 4, label: 'Four-stroke' }, { value: 2, label: 'Two-stroke' }], () => { S.preset = 'custom'; run(); }, 'A four-stroke has one power stroke every two turns (α = 2); a two-stroke every turn (α = 1).'),
      bound(S, 'r', 'Compression ratio r = V₁/V₂', 3, 25, { step: 0.1, digits: 1, onInput: run }),
      bound(S, 'Vd', 'Total displacement', 0.05, 50, { step: 0.01, log: true, digits: 3, unit: 'L', onInput: run, tip: 'Swept volume of all cylinders, V₁ − V₂.' }),
      bound(S, 'rpm', 'Crankshaft speed', 500, 9000, { step: 10, digits: 0, unit: 'rpm', onInput: run }),
      bound(S, 'etaV', 'Volumetric efficiency ηv', 0.4, 1.1, { step: 0.01, digits: 2, onInput: run, tip: 'Fraction of the swept volume filled with fresh charge at intake density. 1 in the ideal lecture model; 0.8–0.9 in a real four-stroke.' }));
    const sf = section('Fuel and heat release');
    put(sf.body,
      boundSelect(S, 'fuel', 'Fuel', Object.entries(FUELS).map(([value, f]) => ({ value, label: `${f.label} (${f.LHV} MJ/kg, A/F ${f.AFs})` })), run),
      bound(S, 'phi', 'Equivalence ratio φ', 0.3, 1.6, { step: 0.01, digits: 2, onInput: run, tip: 'φ = (F/A)/(F/A)s. Spark engines run near 1–1.2 (rich for power and cooling); Diesels run lean, 0.3–0.8.' }),
      bound(S, 'etaB', 'Combustion efficiency', 0.7, 1, { step: 0.01, digits: 2, onInput: run }),
      bound(S, 'g', 'Ratio of specific heats γ', 1.25, 1.4, { step: 0.005, digits: 3, onInput: run, tip: 'Cold-air standard 1.4. Hot combustion gas is nearer 1.3, which gives more realistic efficiencies.' }),
      bound(S, 'factor', 'Real-engine factor η/η_ideal', 0.4, 1, { step: 0.01, digits: 2, onInput: run, tip: 'Real engines reach roughly 0.6 of the ideal efficiency (heat loss, finite burn time, friction, pumping). 1 shows the ideal cycle.' }));
    const sb = section('Altitude and boost');
    put(sb.body,
      bound(S, 'alt', 'Altitude', 0, 12, { step: 0.1, digits: 1, unit: 'km', onInput: run }),
      boundSeg(S, 'drive', 'Induction', [{ value: 'none', label: 'Natural' }, { value: 'gear', label: 'Supercharger' }, { value: 'turbo', label: 'Turbocharger' }], () => { build(); run(); }),
      S.drive !== 'none' ? bound(S, 'piS', 'Compressor pressure ratio', 1, 4, { step: 0.05, digits: 2, onInput: run }) : null,
      S.drive !== 'none' ? bound(S, 'etaS', 'Compressor efficiency', 0.5, 0.9, { step: 0.01, digits: 2, onInput: run }) : null,
      S.drive !== 'none' ? bound(S, 'ic', 'Intercooler effectiveness', 0, 1, { step: 0.01, digits: 2, onInput: run, tip: 'Fraction of the compression temperature rise removed before the cylinders.' }) : null,
      S.drive !== 'none' ? bound(S, 'pMax', 'Manifold pressure limit', 0.8, 3.5, { step: 0.01, digits: 2, unit: 'bar', onInput: run, tip: 'Boost is throttled to this pressure to protect the engine (detonation, structural limits). The altitude where full throttle just reaches it is the critical altitude.' }) : null);
    controls.replaceChildren(sp.el, sf.el, sb.el);
  };

  function run() { R = solve(); paint(); }

  const pick = (n) => R.states[n - 1];
  function paint() {
    const e = ENGINES.find(x => x.id === S.preset);
    const kW = v => (v / 1000).toFixed(v < 1e5 ? 1 : 0) + ' kW';
    metrics.set([
      { k: 'Thermal efficiency', v: (R.etaReal * 100).toFixed(1) + '%', s: S.factor < 1 ? `ideal ${(R.eta * 100).toFixed(1)}%` : S.kind === 'otto' ? `1 − r^(1−γ)` : `cutoff ratio rc ${R.rc.toFixed(2)}` },
      { k: 'Shaft power', v: kW(R.Pnet), s: e && S.preset === e.id ? `rated ${e.rated} kW` : R.Psc > 0 ? `${kW(R.P)} less ${kW(R.Psc)} supercharger` : `${(R.Pnet / 745.7).toFixed(0)} hp` },
      { k: 'imep', v: (R.imepReal / 1e6).toFixed(3) + ' MPa', s: `${(R.imepReal / R.pman).toFixed(2)} × intake pressure`, tip: 'Indicated mean effective pressure: net work per cycle ÷ displacement.' },
      { k: 'Air flow', v: R.ma.toFixed(R.ma < 1 ? 4 : 3) + ' kg/s', s: `ρ intake ${R.rho.toFixed(3)} kg/m³` },
      { k: 'Fuel flow', v: (R.mf * 3600).toFixed(1) + ' kg/h', s: `F/A ${R.FA.toFixed(4)}` },
      { k: 'BSFC', v: (R.bsfc * 3.6e9).toFixed(0) + ' g/kWh', s: `${(R.bsfc * 3.6e9 / 608.3).toFixed(3)} lb/hp·h`, tip: 'Brake-specific fuel consumption: fuel per unit of shaft energy. Good aircraft piston engines reach 230–280 g/kWh.' },
      { k: 'Peak pressure, temperature', v: `${(R.p3 / 1e5).toFixed(0)} bar`, s: `${R.T3.toFixed(0)} K (ideal, no dissociation)` },
      { k: 'End of compression', v: R.T2.toFixed(0) + ' K', s: `${(R.p2 / 1e5).toFixed(1)} bar`, cls: S.kind === 'otto' && R.T2 > 800 ? 'bad' : S.kind === 'diesel' && R.T2 < 750 ? 'bad' : '' },
    ]);
    const cc = n => cssVar(n);
    const toCm = V => V * 1e6;
    const cols = [cc('--upper'), cc('--lower'), cc('--good'), cc('--text-3')], names = ['compression', 'heat addition', 'expansion', 'heat rejection'];
    pv.setOpts({ logx: false, logy: false });
    pv.setData({ series: [...R.paths.map((p, i) => ({ x: p.map(q => toCm(q.V)), y: p.map(q => q.p / 1e5), color: cols[i], label: names[i] })),
      { x: R.states.map(s => toCm(s.V)), y: R.states.map(s => s.p / 1e5), color: cc('--text'), line: false, points: true, pointSize: 3.5, noLegend: true, extra: i => 'state ' + (i + 1) }, cursorSeries('pv')] });
    ts.setData({ series: [...R.paths.map((p, i) => ({ x: p.map(q => q.s), y: p.map(q => q.T), color: cols[i], label: names[i] })),
      { x: R.states.map(s => s.s), y: R.states.map(s => s.T), color: cc('--text'), line: false, points: true, pointSize: 3.5, noLegend: true, extra: i => 'state ' + (i + 1) }, cursorSeries('ts')] });
    // efficiency vs r
    const rs = []; for (let r = 2; r <= 25; r += 0.25) rs.push(r);
    const g = S.g, q = R.q;
    const otto = rs.map(r => 1 - r ** (1 - g));
    const dsl = rs.map(r => E.pistonCycle({ kind: 'diesel', r, g, q, T1: R.Tman, p1: R.pman }).eta);
    effPlot.setData({ series: [{ x: rs, y: otto, color: cc('--upper'), label: 'Otto' }, { x: rs, y: dsl, color: cc('--lower'), label: 'Diesel (same heat)' },
      { x: [S.r], y: [R.eta], color: cc('--text'), line: false, points: true, pointSize: 4, label: 'this engine', noLegend: true }],
      vbands: [{ x0: 11, x1: 14, color: cc('--hl-soft') }] });
    // power vs altitude
    const alts = []; for (let z = 0; z <= 12; z += 0.25) alts.push(z);
    const P = d => alts.map(z => solve(z, d).Pnet / 1000);
    altPlot.setData({ series: [{ x: alts, y: P('none'), color: cc('--text-3'), label: 'naturally aspirated' }, { x: alts, y: P('gear'), color: cc('--upper'), label: 'supercharger' }, { x: alts, y: P('turbo'), color: cc('--lower'), label: 'turbocharger' },
      { x: [S.alt], y: [R.Pnet / 1000], color: cc('--text'), line: false, points: true, pointSize: 4, noLegend: true }], yZero: true });
    altPlot.setOpts({ yZero: true });
    // insights
    const L = [];
    if (S.kind === 'otto' && R.T2 > 800) L.push({ type: 'b', t: 'Knock risk', d: `The charge reaches ${R.T2.toFixed(0)} K before the spark. Gasoline autoignites near 700–800 K, so the end gas would detonate. Lower r, intercool the boost, or use a higher-octane fuel.` });
    else if (S.kind === 'otto') L.push({ type: 'g', t: 'No knock expected', d: `Compression ends at ${R.T2.toFixed(0)} K, below the 700–800 K where gasoline autoignites.` });
    if (S.kind === 'diesel' && R.T2 < 750) L.push({ type: 'b', t: 'Too cold to ignite', d: `Compression only reaches ${R.T2.toFixed(0)} K; diesel fuel needs about 750 K or more. Raise r (Diesels use 14–22).` });
    if (S.kind === 'diesel' && R.rc > R.r) L.push({ type: 'b', t: 'Cutoff past bottom dead center', d: 'So much heat is added that combustion would last the whole stroke. Lower φ.' });
    if (e && S.preset === e.id) L.push({ type: 'i', t: `Model vs rated: ${(R.Pnet / 1000 / e.rated).toFixed(2)}×`, d: `The ideal air-standard cycle gives ${(R.Pnet / 1000).toFixed(0)} kW against ${e.rated} kW rated. Real engines reach about 0.6 of ideal efficiency (set the real-engine factor), lose friction power and fill the cylinders less than ideally.` });
    if (R.throttled) L.push({ type: 'i', t: 'Below the critical altitude', d: `The compressor could give ${(R.pa * S.piS / 1e5).toFixed(2)} bar, so it is throttled to the ${S.pMax.toFixed(2)} bar limit. Climbing keeps power constant until full throttle.` });
    if (R.Psc > 0) L.push({ type: 'i', t: `Supercharger takes ${(R.Psc / 1000).toFixed(0)} kW`, d: `It heats the charge to ${R.T2s.toFixed(0)} K${S.ic > 0 ? `, cooled to ${R.Tman.toFixed(0)} K by the intercooler` : ''}. A turbocharger would take this power from the exhaust instead.` });
    L.push({ type: 'i', t: `imep = ${(R.imep / R.p1).toFixed(2)} p₁`, d: `Lecture form for the Otto cycle: imep/p₀ = (T₃/T₁ − r^(γ−1))(1 − r^(1−γ)) / ((γ−1)(1 − 1/r))${S.kind === 'otto' ? ` = ${E.ottoImep(S.r, R.T3 / R.T1, S.g).toFixed(3)}` : ''}.` });
    insightsList(insEl, L);
    drawAnim();
  }

  // ---- the running cylinder ----
  const lam = 0.28; // crank radius / rod length
  const Vof = th => { const c = Math.cos(th), s = Math.sin(th); const x = (1 - c) + (1 - Math.sqrt(1 - lam * lam * s * s)) / lam; return R.V2 + (R.V1 - R.V2) * x / 2; };
  // state along the cycle at crank angle θ (0 = TDC at start of intake for a four-stroke)
  const stateAt = deg => {
    const four = S.strokes === 4;
    const a = ((deg % (four ? 720 : 360)) + (four ? 720 : 360)) % (four ? 720 : 360);
    const th = a * Math.PI / 180, V = Vof(th);
    const g = S.g;
    if (four && a < 180) return { V, p: R.p1, T: R.T1, phase: 'intake' };
    if (four && a >= 540) return { V, p: R.p1, T: R.T4 * 0.6 + R.T1 * 0.4, phase: 'exhaust' };
    const b = four ? a - 180 : (a + 180) % 360; // 0..360 from BDC: compression then expansion
    if (b < 180) return { V, p: R.p1 * (R.V1 / V) ** g, T: R.T1 * (R.V1 / V) ** (g - 1), phase: 'compression' };
    if (S.kind === 'diesel' && V <= R.V3) return { V, p: R.p3, T: R.T2 * V / R.V2, phase: 'combustion' };
    const p = R.p3 * (R.V3 / V) ** g, T = R.T3 * (R.V3 / V) ** (g - 1);
    if (!four && b > 320) return { V, p: R.p1 + (p - R.p1) * Math.max(0, (360 - b) / 40), T, phase: 'scavenging' };
    return { V, p, T, phase: 'power' };
  };
  let cur = stateAt(S.crank);
  function cursorSeries(kind) {
    const s = cur, sv = R.cv * Math.log(s.T / R.T1) + 287.05 * Math.log(s.V / R.V1);
    return kind === 'pv' ? { x: [s.V * 1e6], y: [s.p / 1e5], color: cssVar('--hl'), line: false, points: true, pointSize: 5, noLegend: true, noHover: true, skipBounds: true }
      : { x: [sv], y: [/intake|exhaust/.test(s.phase) ? NaN : s.T], color: cssVar('--hl'), line: false, points: true, pointSize: 5, noLegend: true, noHover: true, skipBounds: true };
  }
  function drawAnim() {
    anim.set(({ W, H, g }) => {
      const s = stateAt(S.crank); cur = s;
      const cx = W * 0.3, top = 26, clear = 26;
      const strokeLen = Math.max(30, (H - top - clear - 30) / (1 + 1 / lam + 0.55));
      const cr = strokeLen / 2, rod = cr / lam, bore = Math.min(W * 0.26, strokeLen * 1.6);
      const th = ((S.crank % 360) + 360) % 360 * Math.PI / 180;
      const crankY = top + clear + 13 + rod + cr;
      const px = cx + cr * Math.sin(th), py = crankY - cr * Math.cos(th);
      const pinY = py - Math.sqrt(rod * rod - (cr * Math.sin(th)) ** 2), yp = pinY - 13;
      const x = (yp - (top + clear)) / strokeLen;
      void x;
      const hot = Math.max(0, Math.min(1, (s.T - 250) / (Math.max(R.T3, 1500) - 250)));
      const col = `rgb(${Math.round(60 + 195 * hot)},${Math.round(140 + 60 * (1 - Math.abs(hot - 0.5) * 2) - 60 * hot)},${Math.round(220 * (1 - hot))})`;
      const ink = cssVar('--text-2'), wall = cssVar('--border-strong');
      g.fillStyle = col; g.globalAlpha = 0.55; g.fillRect(cx - bore / 2, top, bore, yp - top); g.globalAlpha = 1;
      g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - bore / 2 - 2, top + clear + strokeLen + 40); g.lineTo(cx - bore / 2 - 2, top - 2); g.lineTo(cx + bore / 2 + 2, top - 2); g.lineTo(cx + bore / 2 + 2, top + clear + strokeLen + 40); g.stroke();
      const four = S.strokes === 4, openIn = four && s.phase === 'intake', openEx = (four && s.phase === 'exhaust') || s.phase === 'scavenging';
      g.lineWidth = 2; g.strokeStyle = cssVar('--upper'); g.beginPath(); g.moveTo(cx - bore * 0.25, top - 16); g.lineTo(cx - bore * 0.25, top - 2 + (openIn ? 8 : 0)); g.stroke();
      g.strokeStyle = cssVar('--lower'); g.beginPath(); g.moveTo(cx + bore * 0.25, top - 16); g.lineTo(cx + bore * 0.25, top - 2 + (openEx ? 8 : 0)); g.stroke();
      if (S.kind === 'otto' && s.phase === 'power' && (s.V - R.V2) / (R.V1 - R.V2) < 0.08) { g.fillStyle = cssVar('--warn'); g.beginPath(); g.arc(cx, top + 6, 7, 0, 7); g.fill(); }
      if (S.kind === 'diesel' && s.phase === 'combustion') { g.fillStyle = cssVar('--warn'); for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(cx + i * 8, top + 10 + Math.abs(i) * 4, 3, 0, 7); g.fill(); } }
      g.fillStyle = cssVar('--bg-sunk'); g.strokeStyle = wall; g.lineWidth = 1.5;
      g.fillRect(cx - bore / 2 + 1, yp, bore - 2, 26); g.strokeRect(cx - bore / 2 + 1, yp, bore - 2, 26);
      g.strokeStyle = ink; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx, pinY); g.lineTo(px, py); g.stroke();
      g.beginPath(); g.arc(cx, crankY, cr, 0, 7); g.strokeStyle = wall; g.lineWidth = 1; g.stroke();
      g.beginPath(); g.moveTo(cx, crankY); g.lineTo(px, py); g.strokeStyle = ink; g.lineWidth = 3; g.stroke();
      g.fillStyle = ink; g.beginPath(); g.arc(cx, crankY, 3, 0, 7); g.fill();
      // labels
      g.fillStyle = cssVar('--text'); g.font = '600 13px ' + cssVar('--font'); g.textAlign = 'left';
      const tx = Math.min(cx + bore / 2 + 26, W - 150);
      g.fillText(s.phase[0].toUpperCase() + s.phase.slice(1), tx, top + 10);
      g.font = '12px ' + cssVar('--mono'); g.fillStyle = cssVar('--text-2');
      const ang = S.strokes === 4 ? ((S.crank % 720) + 720) % 720 : ((S.crank % 360) + 360) % 360;
      g.fillText(`crank ${ang.toFixed(0)}°`, tx, top + 32);
      g.fillText(`V ${(s.V * 1e6).toFixed(0)} cm³`, tx, top + 50);
      g.fillText(`p ${(s.p / 1e5).toFixed(1)} bar`, tx, top + 68);
      g.fillText(`T ${s.T.toFixed(0)} K`, tx, top + 86);
      g.font = '11px ' + cssVar('--font'); g.fillStyle = cssVar('--text-3');
      g.fillText(S.strokes === 4 ? '720° of crank per cycle' : '360° of crank per cycle', tx, top + 110);
    });
  }
  // animation loop
  let raf = null, last = 0;
  const paintPlay = () => play.replaceChildren(icon(S.playing ? 'pause' : 'play', 14), S.playing ? ' Pause' : ' Run the engine');
  play.addEventListener('click', () => { S.playing = !S.playing; paintPlay(); if (S.playing) loop(); });
  const loop = () => {
    cancelAnimationFrame(raf);
    const step = t => {
      if (!S.playing || !visible) return;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t;
      S.crank = (S.crank + dt * 240) % 720;
      drawAnim();
      pv.data.series[pv.data.series.length - 1] = cursorSeries('pv'); pv.draw();
      ts.data.series[ts.data.series.length - 1] = cursorSeries('ts'); ts.draw();
      raf = requestAnimationFrame(step);
    };
    last = 0; raf = requestAnimationFrame(step);
  };
  paintPlay();
  let visible = false;
  build();
  return {
    controls, main,
    show() { visible = true; run(); if (S.playing) loop(); },
    hide() { visible = false; cancelAnimationFrame(raf); },
    destroy() { visible = false; cancelAnimationFrame(raf); },
  };
}
