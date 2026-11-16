// Flight & staging: the multistage rocket equation for a real vehicle, optimal staging for a target Δv, the payload
// fraction against the number of identical stages, and a vertical flight with gravity and drag losses.
import { h, section, cssVar } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import * as X from '../../solvers/rocketSystems.js';
import { bound, boundSelect, boundToggle, metricsGrid, insightsList, card, put } from './common.js';
import { table } from '../../lib/tabbed.js';

const clone = o => JSON.parse(JSON.stringify(o));

export function flightTab({ keep = o => o } = {}) {
  const S = keep({ preset: 'atlas', mPL: 4950, stages: clone(X.ROCKETS[1].stages), dvTarget: 9300, TW: 1.3, Cd: 0.4, Dia: 3.81, drag: true });
  const controls = h('div'), main = h('div', { class: 'cf-main-inner' });
  const metrics = metricsGrid();
  const stCard = card('Stage by stage', 'For each stage: ε = structure/(structure + propellant), λ = mass above/(structure + propellant), mass ratio m₀/m_f and Δv = c ln(m₀/m_f) = c ln((1 + λ)/(ε + λ)).');
  const stEl = h('div'); stCard.append(stEl);
  const optCard = card('Optimal staging for the target Δv', 'The same stages (Isp and ε) resized to carry the payload to the target Δv with the least lift-off mass, by a Lagrange multiplier: stage mass ratios nᵢ = (cᵢη − 1)/(cᵢεᵢη).');
  const optEl = h('div'); optCard.append(optEl);
  const pfCard = card('Payload fraction vs Δv, identical stages', 'n identical stages with the first stage\'s exhaust velocity and structural coefficient. A single stage cannot exceed c ln(1/ε); a second stage buys the most, a third a little, and beyond that the gain rarely pays for the extra risk.');
  const pf = new Plot(pfCard, { xlabel: 'Δv (km/s)', ylabel: 'payload / lift-off mass', xname: 'Δv', yname: 'fraction', logy: true, xfmt: v => v.toFixed(2) + ' km/s', yfmt: v => (v * 100).toFixed(2) + '%', legendPos: 'bottom' });
  const vCard = card('Vertical flight of the first stage', 'Stage 1 fired straight up with the whole stack on top, gravity falling off with altitude and drag from the standard atmosphere. Then it coasts to apogee.');
  const vPlot = new Plot(vCard, { xlabel: 'time (s)', ylabel: 'altitude (km) · speed (km/s ×10)', xname: 't', yname: '', xfmt: v => v.toFixed(1) + ' s', yfmt: v => v.toFixed(2), legendPos: 'bottom' });
  const vEl = h('div'); vCard.append(vEl);
  for (const p of [pf, vPlot]) p.wrap.style.height = '260px';
  const insCard = card('Notes'); const insEl = h('div'); insCard.append(insEl);
  main.append(metrics.el, h('div', { class: 'cf-grid2b' }, stCard, optCard), h('div', { class: 'cf-grid2b' }, pfCard, vCard), insCard);

  const build = () => {
    const s0 = section('Vehicle');
    put(s0.body,
      boundSelect(S, 'preset', 'Example', [...X.ROCKETS.map(r => ({ value: r.id, label: r.label })), { value: 'custom', label: 'Custom' }], v => { const r = X.ROCKETS.find(x => x.id === v); if (r) { S.mPL = r.mPL; S.stages = clone(r.stages); } build(); run(); }, 'Masses are approximate published values; Isp for first stages is an average between sea level and vacuum.'),
      bound(S, 'mPL', 'Payload', 1, 2e5, { step: 1, log: true, digits: 0, unit: 'kg', onInput: () => { S.preset = 'custom'; run(); } }));
    const secs = [s0.el];
    S.stages.forEach((st, i) => {
      const s = section(`Stage ${i + 1}${st.name ? ' · ' + st.name : ''}`, { collapsible: true, collapsed: i > 0 });
      put(s.body,
        bound(st, 'Isp', 'Specific impulse', 150, 470, { step: 0.5, digits: 1, unit: 's', onInput: () => { S.preset = 'custom'; run(); } }),
        bound(st, 'mp', 'Propellant mass', 10, 3e6, { step: 1, log: true, digits: 0, unit: 'kg', onInput: () => { S.preset = 'custom'; run(); } }),
        bound(st, 'ms', 'Structure (dry) mass', 1, 3e5, { step: 1, log: true, digits: 0, unit: 'kg', onInput: () => { S.preset = 'custom'; run(); } }));
      if (S.stages.length > 1) { const b = h('button', { class: 'btn sm', type: 'button' }, 'Remove stage'); b.addEventListener('click', () => { S.stages.splice(i, 1); S.preset = 'custom'; build(); run(); }); s.body.append(b); }
      secs.push(s.el);
    });
    if (S.stages.length < 4) { const b = h('button', { class: 'btn sm', type: 'button', style: { width: '100%' } }, '+ Add an upper stage'); b.addEventListener('click', () => { const l = S.stages[S.stages.length - 1]; S.stages.push({ name: '', Isp: 350, ms: Math.max(1, l.ms / 5), mp: Math.max(10, l.mp / 5) }); S.preset = 'custom'; build(); run(); }); secs.push(h('div', { class: 'section' }, h('div', { class: 'section-body' }, b))); }
    const s2 = section('Target and flight');
    put(s2.body,
      bound(S, 'dvTarget', 'Target Δv for optimal staging', 500, 16000, { step: 10, digits: 0, unit: 'm/s', onInput: run, tip: 'Low Earth orbit needs about 9.3–9.6 km/s including gravity and drag losses.' }),
      bound(S, 'TW', 'Lift-off thrust/weight', 1.05, 4, { step: 0.01, digits: 2, onInput: run }),
      bound(S, 'Dia', 'Body diameter', 0.05, 12, { step: 0.01, log: true, digits: 2, unit: 'm', onInput: run }),
      bound(S, 'Cd', 'Drag coefficient', 0.1, 1.2, { step: 0.01, digits: 2, onInput: run }),
      boundToggle(S, 'drag', 'Include drag', run));
    controls.replaceChildren(...secs, s2.el);
  };

  function run() {
    const st = S.stages.map(s => ({ Isp: s.Isp, ms: s.ms, mp: s.mp }));
    const K = X.stackDv(st, S.mPL);
    const t = v => v >= 1e3 ? (v / 1e3).toFixed(v >= 1e5 ? 0 : 1) + ' t' : v.toFixed(0) + ' kg';
    stEl.replaceChildren(table(['Stage', 'm₀', 'm_f', 'ε', 'λ', 'm₀/m_f', 'Δv m/s'], K.stages.map((s, i) => [S.stages[i].name || `Stage ${i + 1}`, t(s.m0), t(s.mf), s.eps.toFixed(4), s.lam.toFixed(4), s.MR.toFixed(3), s.dv.toFixed(0)]).concat([['Total', t(K.m0), '', '', '', '', K.dv.toFixed(0)]])));
    const O = X.optimalStaging(S.stages.map(s => ({ Isp: s.Isp, eps: s.ms / (s.ms + s.mp) })), S.dvTarget, S.mPL);
    optEl.replaceChildren(O.ok ? table(['Stage', 'propellant', 'structure', 'Δv m/s'], O.stages.map((s, i) => [`Stage ${i + 1}`, t(s.mp), t(s.ms), s.dv.toFixed(0)]).concat([['Lift-off mass', t(O.m0), `payload ${(O.payloadFrac * 100).toFixed(2)}%`, S.dvTarget.toFixed(0)]]))
      : h('div', { class: 'hint' }, `These stages cannot reach ${S.dvTarget.toFixed(0)} m/s with any payload: the limit with zero payload is Σ c ln(1/ε) = ${O.dvMax.toFixed(0)} m/s.`));
    // payload fraction chart
    const c1 = S.stages[0].Isp * X.G0, e1 = S.stages[0].ms / (S.stages[0].ms + S.stages[0].mp);
    const dvs = []; for (let v = 200; v <= 16000; v += 100) dvs.push(v);
    const cols = ['--lower', '--upper', '--good', '--turb'];
    pf.setData({ series: [1, 2, 3, 4].map(n => ({ x: dvs.map(v => v / 1000), y: dvs.map(v => X.similarPayloadFraction(n, c1, e1, v)), color: cssVar(cols[n - 1]), label: `${n} stage${n > 1 ? 's' : ''}` }))
      .concat([{ x: [K.dv / 1000], y: [K.payloadFrac], color: cssVar('--text'), line: false, points: true, pointSize: 4.5, noLegend: true, extra: () => 'this vehicle' }]), vlines: [{ x: S.dvTarget / 1000, color: cssVar('--text-3') }] });
    pf.setOpts({ ylim: [1e-4, 1] });
    // vertical flight of stage 1 carrying everything above
    const m0 = K.m0, F = S.TW * m0 * X.G0;
    const V = X.verticalFlight({ m0, mp: S.stages[0].mp, F, Isp: S.stages[0].Isp, Cd: S.Cd, A: Math.PI * S.Dia ** 2 / 4, drag: S.drag, dt: 0.1 });
    const every = Math.max(1, Math.floor(V.t.length / 600)), pick = a => a.filter((_, i) => i % every === 0);
    vPlot.setData({ series: [{ x: pick(V.t), y: pick(V.h).map(x => x / 1000), color: cssVar('--upper'), label: 'altitude (km)' }, { x: pick(V.t), y: pick(V.v).map(x => x / 100), color: cssVar('--lower'), label: 'speed (km/s × 10)' }], vlines: [{ x: V.tb, color: cssVar('--text-3') }] });
    vEl.replaceChildren(table(['At burnout', 'simulated', 'lecture closed form (g₀, no drag)'], [
      ['Burn time', V.tb.toFixed(1) + ' s', ''], ['Speed', V.burnout.v.toFixed(0) + ' m/s', V.closed.vb.toFixed(0) + ' m/s'],
      ['Altitude', (V.burnout.h / 1000).toFixed(1) + ' km', (V.closed.hb / 1000).toFixed(1) + ' km'], ['Apogee', (V.apogee / 1000).toFixed(1) + ' km', (V.closed.apogee / 1000).toFixed(1) + ' km'],
      ['Gravity loss', V.gravLoss.toFixed(0) + ' m/s', (X.G0 * V.tb).toFixed(0) + ' m/s'], ['Drag loss', V.dragLoss.toFixed(0) + ' m/s', '0'], ['Max dynamic pressure', (V.qmax / 1000).toFixed(1) + ' kPa', `at ${V.tq.toFixed(0)} s`]]));
    metrics.set([
      { k: 'Total ideal Δv', v: (K.dv / 1000).toFixed(3) + ' km/s', s: 'no gravity or drag' },
      { k: 'Lift-off mass', v: t(K.m0) },
      { k: 'Payload fraction', v: (K.payloadFrac * 100).toFixed(2) + '%' },
      { k: 'Optimal lift-off mass', v: O.ok ? t(O.m0) : 'impossible', s: `for ${(S.dvTarget / 1000).toFixed(2)} km/s` },
      { k: 'Stage 1 burnout', v: (V.burnout.v / 1000).toFixed(2) + ' km/s', s: `straight up, ${(V.burnout.h / 1000).toFixed(0)} km` },
      { k: 'Gravity + drag loss', v: (V.gravLoss + V.dragLoss).toFixed(0) + ' m/s', s: `T/W ${S.TW.toFixed(2)}` },
    ]);
    const L = [];
    L.push({ type: 'i', t: 'Why staging works', d: `Every kilogram of empty tank you drop no longer has to be accelerated. One stage with these values of ε could reach at most c ln(1/ε) = ${(c1 * Math.log(1 / e1) / 1000).toFixed(2)} km/s with no payload at all.` });
    L.push({ type: 'i', t: 'Gravity loss', d: `While thrusting straight up the vehicle loses g·t_b of Δv: ${V.gravLoss.toFixed(0)} m/s here. A higher thrust-to-weight shortens the burn and reduces it, but costs engine mass and raises max-Q. Real launchers pitch over (gravity turn) so that most of the Δv goes into horizontal speed.` });
    insightsList(insEl, L);
  }
  build();
  return { controls, main, show() { run(); } };
}
