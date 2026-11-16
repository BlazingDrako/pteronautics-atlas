// Airfoil Lab › Boundary layer: the theory behind the Analyze tab's viscous solution. Falkner–Skan similarity
// profiles (Blasius at β = 0), the momentum integral with assumed profiles, Thwaites' method on any edge velocity
// ue(x) with laminar separation, and turbulent layers: the 1/7 power law, the law of the wall, flat-plate skin
// friction with transition and the drag of a fuselage by the flat-plate analogy.
import { h, section, select, field, segmented, fmtSI } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import { compileReal } from '../../lib/expr.js';
import * as B from '../../solvers/boundaryLayer.js';
import { atmosphere } from '../../solvers/atmosphere.js';
import { metricsGrid, card, bound, put, css, canvasBox, resultRows } from '../cfd/fieldCommon.js';
import { theoryShell, f3 } from './theoryCommon.js';
import { blConcepts } from './learn.js';

const NU_AIR = 1.5e-5;
const mm = v => isFinite(v) ? (v * 1e3 < 0.1 ? (v * 1e3).toExponential(2) : (v * 1e3).toFixed(v * 1e3 < 10 ? 3 : 1)) + ' mm' : '—';

export function blTab({ setHeader, keep = o => o }) {
  const S = keep({
    mode: 'sim', beta: 0, U: 30, x: 0.5,
    ueCase: 'howarth', ueExpr: 'U*(1 - x/L)', ueU: 10, ueL: 1, ueA: 10, ueR: 0.1, ueNu: 1.5e-5,
    Rex: 1e6, ReL: 1e7, Retr: 5e5, law: 'prandtl', bodyL: 38, bodyD: 3.76, bodyV: 230, bodyAlt: 11000, visible: false,
  });
  const { controls, main, side, notes } = theoryShell(blConcepts);
  const metrics = metricsGrid();
  const pic = canvasBox('cf-chart', '230px');
  const picCard = card('', ''); picCard.append(pic.el);
  const c1 = card('', ''), c2 = card('', ''), c3 = card('', ''), c4 = card('', '');
  const p1 = new Plot(c1, { legendPos: 'above' }), p2 = new Plot(c2, { legendPos: 'above' }), p3 = new Plot(c3, { legendPos: 'above' }), p4 = new Plot(c4, { legendPos: 'above' });
  for (const p of [p1, p2, p3, p4]) p.wrap.style.height = '250px';
  const tCard = card('Assumed profiles against Blasius', 'The momentum integral with each profile shape, against the exact Blasius solution. Numbers are the coefficients in δ/x = a/√Re_x, θ/x = b/√Re_x, cf = c/√Re_x.');
  const tEl = h('div'); tCard.append(tEl);
  const rCard = card('Fuselage drag by the flat-plate analogy', 'Skin friction of a flat plate with the body\'s wetted area and length, times a form factor for its thickness (Raymer: 1 + 60/f³ + f/400, f = length/diameter).');
  const rEl = h('div', { class: 'cf-res' }); rCard.append(rEl);
  const g2a = h('div', { class: 'cf-grid2b' }, c1, c2), g2b = h('div', { class: 'cf-grid2b' }, c3, c4);
  main.append(metrics.el, picCard, g2a, g2b, tCard, rCard);
  const head = (c, t, tip) => { c.querySelector('h4').textContent = t; const i = c.querySelector('.info'); if (i) i.style.display = tip ? '' : 'none'; };

  const exprIn = h('input', { class: 'text-input fl-expr', value: S.ueExpr, spellcheck: 'false', 'aria-label': 'ue(x)' });
  exprIn.addEventListener('change', () => { S.ueExpr = exprIn.value.trim(); S.ueCase = 'custom'; build(); update(); });
  function build() {
    const sec = section('Boundary layer'), on = () => update();
    const m = segmented([{ value: 'sim', label: 'Similarity' }, { value: 'integral', label: 'Momentum integral' }, { value: 'thw', label: 'Thwaites' }, { value: 'turb', label: 'Turbulent' }], S.mode, v => { S.mode = v; build(); update(); });
    m.el.classList.add('seg-wrap');
    put(sec.body, field('Topic', m.el));
    const sp = section('Inputs');
    if (S.mode === 'sim') {
      const q = (lab, b) => { const e = h('button', { type: 'button', class: 'btn sm' }, lab); e.addEventListener('click', () => { S.beta = b; build(); update(); }); return e; };
      put(sp.body, bound(S, 'beta', 'Pressure-gradient parameter β', -0.1988, 1.6, { step: 0.0005, digits: 4, onInput: on, tip: 'Ue ∝ x^m with β = 2m/(m + 1): the flow over a wedge of half-angle βπ/2. Negative β: decelerating flow (adverse gradient).' }),
        h('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap' } }, q('Blasius', 0), q('Stagnation', 1), q('Separating', -0.1988), q('90° wedge', 0.5)),
        bound(S, 'U', 'Edge speed Ue at x', 0.5, 300, { log: true, digits: 1, unit: 'm/s', onInput: on }),
        bound(S, 'x', 'Distance x', 0.005, 5, { log: true, digits: 3, unit: 'm', onInput: on }),
        h('div', { class: 'hint' }, 'Air at sea level, ν = 1.5×10⁻⁵ m²/s.'));
    }
    if (S.mode === 'thw') {
      const opts = [...B.UE_CASES.map(c => ({ value: c.id, label: c.label })), { value: 'custom', label: 'Your own ue(x)' }];
      const cur = B.UE_CASES.find(c => c.id === S.ueCase);
      put(sp.body, field('Edge velocity', select(opts, S.ueCase, v => { S.ueCase = v; const c = B.UE_CASES.find(q => q.id === v); if (c) { S.ueExpr = c.ue; exprIn.value = c.ue; } build(); update(); }), cur ? cur.note : 'Any expression in x and the parameters U, L, a, R.'),
        field('ue(x) =', exprIn), bound(S, 'ueU', 'U', 0.1, 200, { log: true, digits: 2, unit: 'm/s', onInput: on }), bound(S, 'ueL', 'L', 0.01, 20, { log: true, digits: 3, unit: 'm', onInput: on }),
        bound(S, 'ueA', 'a (for ue = a·x)', 0.1, 1000, { log: true, digits: 2, unit: '1/s', onInput: on }), bound(S, 'ueR', 'R (cylinder radius)', 0.005, 5, { log: true, digits: 3, unit: 'm', onInput: on }),
        bound(S, 'ueNu', 'Kinematic viscosity ν', 1e-7, 1e-3, { log: true, format: v => (+v).toExponential(2), unit: 'm²/s', onInput: on, tip: 'Air 1.5×10⁻⁵, water 1.0×10⁻⁶, light oil 1×10⁻⁴ m²/s.' }));
    }
    if (S.mode === 'turb') {
      put(sp.body, bound(S, 'Rex', 'Profiles at Re_x', 1e4, 1e9, { log: true, format: v => fmtSI(v), onInput: on }),
        bound(S, 'ReL', 'Plate Reynolds number Re_L', 1e4, 1e10, { log: true, format: v => fmtSI(v), onInput: on }),
        bound(S, 'Retr', 'Transition Re_x,tr', 1e5, 5e6, { log: true, format: v => fmtSI(v), onInput: on, tip: '5×10⁵ is the classic value; a quiet flow or a smooth, polished model holds laminar flow longer, a rough or noisy one shorter.' }),
        field('Turbulent law', select([{ value: 'prandtl', label: 'Prandtl: 0.074/Re^0.2' }, { value: 'schlichting', label: 'Schlichting: 0.455/(log Re)^2.58' }], S.law, v => { S.law = v; update(); })));
      const sb = section('Fuselage drag');
      put(sb.body, bound(S, 'bodyL', 'Length', 1, 80, { step: 0.1, digits: 1, unit: 'm', onInput: on }), bound(S, 'bodyD', 'Diameter', 0.2, 8, { step: 0.01, digits: 2, unit: 'm', onInput: on }),
        bound(S, 'bodyV', 'Speed', 10, 300, { step: 1, digits: 0, unit: 'm/s', onInput: on }), bound(S, 'bodyAlt', 'Altitude', 0, 15000, { step: 100, digits: 0, unit: 'm', onInput: on }));
      controls.replaceChildren(sec.el, sp.el, sb.el); return;
    }
    controls.replaceChildren(sec.el, ...(S.mode === 'integral' ? [] : [sp.el]));
  }

  function show(cards) { for (const [el, on] of cards) el.style.display = on ? '' : 'none'; }
  function update() {
    if (!S.visible) return;
    const N = [];
    c4.style.display = '';
    for (const p of [p1, p2, p3, p4]) { p.opts.logx = false; p.opts.logy = false; p.opts.ylim = null; }
    show([[picCard, S.mode === 'sim' || S.mode === 'thw'], [g2a, true], [g2b, S.mode !== 'integral'], [tCard, S.mode === 'integral'], [rCard, S.mode === 'turb']]);
    if (S.mode === 'sim') {
      const r = B.falknerSkan(S.beta), bl = B.falknerSkan(0), Rex = S.U * S.x / NU_AIR, sq = Math.sqrt(NU_AIR * S.x / S.U);
      setHeader(S.beta === 0 ? 'Blasius boundary layer' : 'Falkner–Skan boundary layer', `β = ${f3(S.beta, 4)}, m = ${f3(r.m, 4)}: flow over a ${f3(S.beta * 180, 1)}° wedge`, 'ok', 'Similarity solution');
      metrics.set([
        { k: 'Wall shear f″(0)', v: f3(r.fpp0, 4), s: S.beta <= -0.198 ? 'separating: no wall shear' : 'Blasius 0.4696 (this scaling)', cls: S.beta <= -0.198 ? 'warn' : '' },
        { k: '99% thickness δ', v: mm(r.d99 * sq), s: `${f3(r.d99, 3)} √(νx/Ue)` },
        { k: 'Displacement δ*', v: mm(r.dstar * sq), s: `${f3(r.dstar, 4)} √(νx/Ue)` },
        { k: 'Momentum θ', v: mm(r.theta * sq), s: `${f3(r.theta, 4)} √(νx/Ue)` },
        { k: 'Shape factor H', v: f3(r.H, 3), s: 'Blasius 2.59; separation 4.03' },
        { k: 'Skin friction cf', v: f3(r.cfRe / Math.sqrt(Rex), 5), s: `${f3(r.cfRe, 4)}/√Re_x, Re_x = ${fmtSI(Math.round(Rex))}` },
      ]);
      const Y = r.eta.map(e => e * r.ySc), Yb = bl.eta.map(e => e * bl.ySc);
      head(c1, 'Velocity profile u/Ue', true); p1.setOpts({ xlabel: 'u/Ue', ylabel: 'y √(Ue/νx)', xname: 'u/Ue', yname: 'y√(Ue/νx)', xfmt: v => v.toFixed(3), yfmt: v => v.toFixed(3), ylim: [0, 8], invertY: false, logx: false });
      p1.setData({ series: [{ x: r.fp, y: Y, color: css('--accent'), label: `β = ${f3(S.beta, 3)}`, width: 2.4 }, { x: bl.fp, y: Yb, color: css('--text-3'), dash: [5, 4], label: 'Blasius', noHover: true }] });
      head(c2, 'Shear profile f″', true); p2.setOpts({ xlabel: 'f″ (∝ ∂u/∂y)', ylabel: 'y √(Ue/νx)', xname: 'f″', yname: 'y', xfmt: v => v.toFixed(4), yfmt: v => v.toFixed(3), ylim: [0, 8], logx: false });
      p2.setData({ series: [{ x: r.fpp, y: Y, color: css('--lower'), label: 'f″', width: 2.2 }, { x: bl.fpp, y: Yb, color: css('--text-3'), dash: [5, 4], label: 'Blasius', noHover: true }], vlines: [{ x: 0, color: css('--text-3') }] });
      const betas = [], fpps = [], Hs = [];
      for (let b = -0.1988; b <= 1.6; b += 0.05) { const q = B.falknerSkan(b, { n: 800 }); betas.push(b); fpps.push(q.fpp0); Hs.push(q.H); }
      head(c3, 'Wall shear f″(0) against β', true); p3.setOpts({ xlabel: 'β', ylabel: 'f″(0)', xname: 'β', yname: 'f″(0)', xfmt: v => v.toFixed(3), yfmt: v => v.toFixed(4), ylim: null, logx: false });
      p3.setData({ series: [{ x: betas, y: fpps, color: css('--accent'), label: 'f″(0)', width: 2.2 }], vlines: [{ x: S.beta, color: css('--text-3'), dash: [3, 3] }] });
      head(c4, 'Shape factor H against β', true); p4.setOpts({ xlabel: 'β', ylabel: 'H = δ*/θ', xname: 'β', yname: 'H', xfmt: v => v.toFixed(3), yfmt: v => v.toFixed(3), ylim: null, logx: false });
      p4.setData({ series: [{ x: betas, y: Hs, color: css('--warn'), label: 'H', width: 2.2 }], vlines: [{ x: S.beta, color: css('--text-3'), dash: [3, 3] }] });
      head(picCard, 'The layer along the surface (thickness exaggerated)');
      pic.set(({ W, H, g }) => {
        const x0 = 30, x1 = W - 20, yb = H - 30, n = 5, grow = (1 - r.m) / 2, dmax = r.d99 * Math.sqrt(NU_AIR * S.x / S.U);
        g.fillStyle = css('--bg-sunk'); g.fillRect(x0, yb, x1 - x0, 12); g.strokeStyle = css('--text'); g.lineWidth = 2; g.beginPath(); g.moveTo(x0, yb); g.lineTo(x1, yb); g.stroke();
        const hpx = s => (H - 70) * Math.pow(Math.max(s, 1e-4), grow); // δ ∝ x^((1−m)/2), scaled to fit
        g.strokeStyle = css('--lower'); g.setLineDash([5, 4]); g.beginPath(); for (let k = 0; k <= 100; k++) { const s = k / 100, X = x0 + s * (x1 - x0), Yy = yb - hpx(s); k ? g.lineTo(X, Yy) : g.moveTo(X, Yy); } g.stroke(); g.setLineDash([]);
        for (let k = 1; k <= n; k++) {
          const s = k / n, X = x0 + s * (x1 - x0) * 0.95, hh = hpx(s), sc = 40;
          g.strokeStyle = css('--text-3'); g.beginPath(); g.moveTo(X, yb); g.lineTo(X, yb - hh * 1.3); g.stroke();
          g.strokeStyle = css('--accent'); g.lineWidth = 2; g.beginPath();
          for (let i = 0; i < r.eta.length; i += 10) { const yy = r.eta[i] * r.ySc / r.d99 * hh; if (yy > hh * 1.3) break; const XX = X + r.fp[i] * sc; i ? g.lineTo(XX, yb - yy) : g.moveTo(XX, yb - yy); }
          g.stroke(); g.lineWidth = 1;
        }
        g.fillStyle = css('--text-2'); g.font = `11px ${css('--font')}`; g.fillText(`δ grows as x^${f3(grow, 3)}; at x = ${f3(S.x, 2)} m it is ${mm(dmax)}`, x0, 16);
      });
      N.push({ type: 'i', t: 'One shape for every x', d: 'When the edge velocity varies as a power of x, the profiles at all stations are stretched copies of one shape, and the boundary-layer equations collapse to a single ordinary differential equation, solved here by shooting on the wall shear.' });
      if (S.beta < -0.1) N.push({ type: 'w', t: 'Adverse pressure gradient', d: 'The profile has an inflection point and the wall shear is falling. At β = −0.1988 it reaches zero: the layer is about to separate. Inflected profiles are also much less stable, so transition comes early.' });
      if (S.beta > 0.3) N.push({ type: 'g', t: 'Favorable pressure gradient', d: 'Accelerating flow thins the layer and fills out the profile (lower H). It is very stable, which is why laminar-flow airfoils keep the pressure falling over as much of the chord as possible.' });
    }
    if (S.mode === 'integral') {
      setHeader('Momentum integral', 'Assumed velocity profiles against the exact Blasius solution', 'ok', 'Kármán–Pohlhausen');
      const bl = B.falknerSkan(0), rows = B.PROFILES.map(p => ({ p, r: B.assumedProfile(p.F) }));
      metrics.set([
        { k: 'Blasius δ/x', v: f3(bl.d99, 3) + '/√Re', s: '99% thickness' },
        { k: 'Blasius θ/x', v: f3(bl.theta, 4) + '/√Re' },
        { k: 'Blasius cf', v: f3(bl.cfRe, 4) + '/√Re' },
        { k: 'Blasius H', v: f3(bl.H, 3) },
      ]);
      const pct = (a, b) => `${a >= b ? '+' : ''}${f3((a / b - 1) * 100, 1)}%`;
      tEl.replaceChildren(h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
        h('thead', {}, h('tr', {}, ...['Profile', 'δ√Re/x', 'θ√Re/x', 'δ*√Re/x', 'H', 'cf√Re', 'cf error'].map((t, i) => h('th', { style: i ? null : { textAlign: 'left' } }, t)))),
        h('tbody', {}, ...rows.map(({ p, r }) => h('tr', {}, h('td', { style: { textAlign: 'left', fontFamily: 'var(--font)' } }, p.label), h('td', {}, f3(r.delta, 3)), h('td', {}, f3(r.theta, 4)), h('td', {}, f3(r.dstar, 4)), h('td', {}, f3(r.H, 3)), h('td', {}, f3(r.cfRe, 4)), h('td', {}, pct(r.cfRe, bl.cfRe)))),
          h('tr', {}, h('td', { style: { textAlign: 'left', fontFamily: 'var(--font)' } }, h('b', {}, 'Blasius (exact)')), h('td', {}, f3(bl.d99, 3)), h('td', {}, f3(bl.theta, 4)), h('td', {}, f3(bl.dstar, 4)), h('td', {}, f3(bl.H, 3)), h('td', {}, f3(bl.cfRe, 4)), h('td', {}, '—'))))));
      const cols = [css('--accent'), css('--lower'), css('--good'), css('--warn'), css('--text-2')];
      const ser = rows.map(({ p }, k) => { const y = [], u = []; for (let i = 0; i <= 50; i++) { y.push(i / 50); u.push(p.F(i / 50)); } return { x: u, y, color: cols[k], label: p.label.split(':')[0], width: 1.8 }; });
      ser.push({ x: bl.fp.filter((_, i) => bl.eta[i] * bl.ySc <= bl.d99 * 1.2), y: bl.eta.filter(e => e * bl.ySc <= bl.d99 * 1.2).map(e => e * bl.ySc / bl.d99), color: css('--text'), dash: [5, 4], label: 'Blasius', width: 2.2 });
      head(c1, 'Profiles u/U against y/δ', true); p1.setOpts({ xlabel: 'u/U', ylabel: 'y/δ', xname: 'u/U', yname: 'y/δ', ylim: [0, 1.2], logx: false, xfmt: v => v.toFixed(3), yfmt: v => v.toFixed(3) });
      p1.setData({ series: ser });
      head(c2, 'Skin-friction coefficient cf√Re_x', true); p2.setOpts({ xlabel: 'profile', ylabel: 'cf √Re_x', xname: 'profile', yname: 'cf√Re', ylim: null, logx: false, xfmt: v => (B.PROFILES[Math.round(v)] || {}).id || '', yfmt: v => v.toFixed(4) });
      p2.setData({ series: [{ x: rows.map((_, i) => i), y: rows.map(q => q.r.cfRe), color: css('--accent'), label: 'assumed profile', points: true, pointSize: 4, width: 0 }], hlines: [{ y: bl.cfRe, color: css('--text'), dash: [5, 4] }] });
      N.push({ type: 'i', t: 'Guess the shape, get the growth', d: 'Put an assumed profile into the momentum integral dθ/dx = τw/(ρU²) and it gives how δ grows. Even a straight line is within 13% of the exact skin friction; the sine and cubic profiles are within 3%. This is the idea behind every integral boundary-layer method, including the one inside the Analyze tab\'s solver.' });
    }
    if (S.mode === 'thw') {
      let ue = null, err = null;
      try { const f = compileReal(S.ueExpr, ['x', 'U', 'L', 'a', 'R']); ue = x => f(x, S.ueU, S.ueL, S.ueA, S.ueR); ue(0.1); } catch (e) { err = e.message; }
      const c = B.UE_CASES.find(q => q.id === S.ueCase) || { x0: 0, x1: 1 };
      const scale = S.ueCase === 'cyl' ? S.ueR : S.ueCase === 'stag' ? 1 : S.ueL;
      const x0 = c.x0 * scale, x1 = c.x1 * scale;
      if (!ue) { setHeader('Thwaites\' method', 'Cannot read ue(x): ' + err, 'err', 'Error'); metrics.set([]); notes([{ type: 'b', t: 'Cannot read ue(x)', d: err }]); return; }
      const r = B.thwaites(ue, x0, x1, S.ueNu);
      setHeader('Thwaites\' method', `ue(x) = ${S.ueExpr}`, r.sep !== null ? 'warn' : 'ok', r.sep !== null ? 'Laminar separation' : 'Attached');
      const xl = S.ueCase === 'cyl' ? v => f3(v / S.ueR * 180 / Math.PI, 1) + '°' : v => f3(v, 3) + ' m';
      const last = r.x.length - 1;
      metrics.set([
        { k: 'Laminar separation', v: r.sep !== null ? xl(r.sep) : 'none', s: r.sep !== null ? (S.ueCase === 'cyl' ? 'from the front stagnation point' : `x/L = ${f3(r.sep / S.ueL, 4)}`) : 'λ stays above −0.09', cls: r.sep !== null ? 'warn' : 'good' },
        { k: 'θ at the end', v: mm(r.theta[last]), s: 'momentum thickness' },
        { k: 'δ* at the end', v: mm(r.dstar[last]), s: `H = ${f3(r.H[last], 3)}` },
        { k: 'Reynolds number', v: fmtSI(Math.round(Math.max(...r.ue) * (x1 - x0) / S.ueNu)), s: 'on the length shown', cls: Math.max(...r.ue) * (x1 - x0) / S.ueNu > 5e5 ? 'warn' : '' },
      ]);
      const X = r.x.map(v => S.ueCase === 'cyl' ? v / S.ueR * 180 / Math.PI : v), xlab = S.ueCase === 'cyl' ? 'angle from the stagnation point (°)' : 'x (m)';
      const fx = v => S.ueCase === 'cyl' ? v.toFixed(1) + '°' : v.toFixed(4);
      const vl = r.sep !== null ? [{ x: S.ueCase === 'cyl' ? r.sep / S.ueR * 180 / Math.PI : r.sep, color: css('--bad'), dash: [4, 3] }] : [];
      head(c1, 'Edge velocity ue', true); p1.setOpts({ xlabel: xlab, ylabel: 'ue (m/s)', xname: 'x', yname: 'ue', xfmt: fx, yfmt: v => v.toFixed(3), ylim: null, logx: false });
      p1.setData({ series: [{ x: X, y: r.ue, color: css('--accent'), label: 'ue', width: 2.2 }], vlines: vl });
      head(c2, 'Thicknesses', true); p2.setOpts({ xlabel: xlab, ylabel: 'mm', xname: 'x', yname: 'mm', xfmt: fx, yfmt: v => v.toFixed(4), ylim: null, logx: false });
      p2.setData({ series: [{ x: X, y: r.theta.map(v => v * 1e3), color: css('--accent'), label: 'θ', width: 2.2 }, { x: X, y: r.dstar.map(v => v * 1e3), color: css('--lower'), label: 'δ*', width: 2.2 }], vlines: vl });
      head(c3, 'Skin friction cf', true); p3.setOpts({ xlabel: xlab, ylabel: 'cf', xname: 'x', yname: 'cf', xfmt: fx, yfmt: v => v.toExponential(2), ylim: null, logx: false });
      p3.setData({ series: [{ x: X.slice(3), y: r.cf.slice(3), color: css('--good'), label: 'cf', width: 2.2 }], vlines: vl });
      head(c4, 'Thwaites parameter λ and shape factor H', true); p4.setOpts({ xlabel: xlab, ylabel: 'λ, H/10', xname: 'x', yname: '', xfmt: fx, yfmt: v => v.toFixed(4), ylim: null, logx: false });
      p4.setData({ series: [{ x: X, y: r.lambda, color: css('--warn'), label: 'λ = (θ²/ν) due/dx', width: 2.2 }, { x: X, y: r.H.map(v => v / 10), color: css('--text-2'), label: 'H/10', width: 1.6 }], hlines: [{ y: -0.09, color: css('--bad'), dash: [4, 3] }], vlines: vl });
      head(picCard, 'Displacement thickness along the surface (exaggerated)');
      pic.set(({ W, H, g }) => {
        const xa = 30, xb = W - 20, yb = H - 30, mxd = Math.max(1e-12, ...r.dstar), xs = v => xa + (v - x0) / (x1 - x0) * (xb - xa);
        g.fillStyle = css('--bg-sunk'); g.fillRect(xa, yb, xb - xa, 12); g.strokeStyle = css('--text'); g.lineWidth = 2; g.beginPath(); g.moveTo(xa, yb); g.lineTo(xb, yb); g.stroke();
        g.fillStyle = 'rgba(58,160,216,0.25)'; g.beginPath(); g.moveTo(xs(r.x[0]), yb); r.x.forEach((v, k) => g.lineTo(xs(v), yb - r.dstar[k] / mxd * (H - 70))); g.lineTo(xs(r.x[last]), yb); g.closePath(); g.fill();
        if (r.sep !== null) { g.strokeStyle = css('--bad'); g.setLineDash([4, 3]); g.beginPath(); g.moveTo(xs(r.sep), yb); g.lineTo(xs(r.sep), 20); g.stroke(); g.setLineDash([]); g.fillStyle = css('--bad'); g.font = `12px ${css('--font')}`; g.fillText('separation', xs(r.sep) + 6, 30); }
        g.fillStyle = css('--text-2'); g.font = `11px ${css('--font')}`; g.fillText(`largest δ* ${mm(mxd)}`, xa, 16);
      });
      const cc = B.UE_CASES.find(q => q.id === S.ueCase);
      if (cc) N.push({ type: 'i', t: cc.label, d: cc.note });
      N.push({ type: 'i', t: 'Only ue(x) is needed', d: 'Thwaites\' method turns the momentum integral into a quadrature, θ² = (0.45ν/ue⁶)∫ue⁵dx, and reads H and the skin friction off one-parameter correlations in λ. It is accurate to a few percent for attached laminar layers.' });
      if (r.sep !== null) N.push({ type: 'w', t: 'The layer separates', d: 'λ has fallen to −0.09: the decelerating outer flow has used up the slow fluid\'s momentum near the wall. Downstream the flow reverses; a laminar layer that separates may reattach as turbulent (a laminar separation bubble).' });
    }
    if (S.mode === 'turb') {
      setHeader('Turbulent boundary layers', `Profiles at Re_x = ${fmtSI(Math.round(S.Rex))}; plate at Re_L = ${fmtSI(Math.round(S.ReL))}`, 'ok', 'Correlations');
      const pl = B.powerLawPlate(S.Rex), lam = 4.91 / Math.sqrt(S.Rex), cfl = 0.664 / Math.sqrt(S.Rex), cf = B.plateCf(S.ReL, S.Retr, S.law);
      metrics.set([
        { k: 'δ/x laminar → turbulent', v: `${f3(lam * 1e3, 3)} → ${f3(pl.delta * 1e3, 3)}`, s: `×10⁻³; the turbulent layer is ${f3(pl.delta / lam, 1)}× thicker` },
        { k: 'cf laminar → turbulent', v: `${f3(cfl * 1e3, 4)} → ${f3(pl.cf * 1e3, 4)}`, s: `×10⁻³; ${f3(pl.cf / cfl, 1)}× the friction` },
        { k: 'Shape factor H', v: `2.59 → ${f3(pl.H, 3)}`, s: 'turbulent profile is fuller' },
        { k: 'Plate Cf (mixed)', v: f3(cf.Cf * 1e3, 4) + '×10⁻³', s: cf.regime === 'laminar' ? 'all laminar' : `all-turbulent ${f3(cf.turb * 1e3, 4)}×10⁻³` },
      ]);
      const bl = B.falknerSkan(0), y = [], ut = [];
      for (let i = 0; i <= 100; i++) { const yy = i / 100 * pl.delta * 1.2; y.push(yy * 1e3); ut.push(yy < pl.delta ? Math.pow(yy / pl.delta, 1 / 7) : 1); }
      head(c1, 'Laminar and turbulent profiles at the same Re_x', true); p1.setOpts({ xlabel: 'u/U', ylabel: 'y/x × 1000', xname: 'u/U', yname: 'y/x·10³', xfmt: v => v.toFixed(3), yfmt: v => v.toFixed(3), ylim: [0, pl.delta * 1.2e3], logx: false });
      p1.setData({ series: [{ x: ut, y, color: css('--lower'), label: 'turbulent (1/7 power)', width: 2.2 }, { x: bl.fp, y: bl.eta.map(e => e * bl.ySc / Math.sqrt(S.Rex) * 1e3), color: css('--accent'), label: 'laminar (Blasius)', width: 2.2 }] });
      const yp = [], us = [], lin = [], lg = [];
      for (let k = 0; k <= 120; k++) { const v = 10 ** (-0.5 + 4 * k / 120); yp.push(v); us.push(B.spalding(v)); lin.push(v < 15 ? v : NaN); lg.push(v > 5 ? Math.log(v) / 0.41 + 5 : NaN); }
      head(c2, 'Law of the wall', true); p2.setOpts({ xlabel: 'y⁺ = y u_τ/ν', ylabel: 'u⁺ = u/u_τ', xname: 'y⁺', yname: 'u⁺', logx: true, xfmt: v => v.toFixed(2), yfmt: v => v.toFixed(2), ylim: [0, 30] });
      p2.setData({ series: [{ x: yp, y: us, color: css('--accent'), label: 'Spalding', width: 2.4 }, { x: yp, y: lin, color: css('--text-3'), dash: [4, 3], label: 'u⁺ = y⁺', noHover: true }, { x: yp, y: lg, color: css('--lower'), dash: [6, 4], label: 'log law', noHover: true }] });
      const Rs = [], cl = [], ct = [], cm = [];
      for (let k = 0; k <= 120; k++) { const R = 10 ** (4 + 6 * k / 120); Rs.push(R); const q = B.plateCf(R, S.Retr, S.law); cl.push(q.lam); ct.push(q.turb); cm.push(q.Cf); }
      head(c3, 'Flat-plate skin friction Cf', true); p3.setOpts({ xlabel: 'Re_L', ylabel: 'Cf', xname: 'Re_L', yname: 'Cf', logx: true, logy: true, xfmt: v => fmtSI(Math.round(v)), yfmt: v => v.toExponential(3), ylim: [5e-4, 0.02] });
      p3.setData({ series: [{ x: Rs, y: cl, color: css('--accent'), label: 'laminar 1.328/√Re', width: 1.6 }, { x: Rs, y: ct, color: css('--lower'), label: 'turbulent', width: 1.6 }, { x: Rs, y: cm, color: css('--text'), label: 'with transition', width: 2.4 }], vlines: [{ x: S.ReL, color: css('--text-3'), dash: [3, 3] }] });
      c4.style.display = 'none';
      const at = atmosphere(S.bodyAlt), bd = B.bodyDrag({ L: S.bodyL, d: S.bodyD, V: S.bodyV, rho: at.rho, mu: at.mu, Retr: S.Retr });
      resultRows(rEl, [['Fineness ratio L/d', f3(bd.f, 2)], ['Wetted area', f3(bd.Swet, 1) + ' m²'], ['Reynolds number', fmtSI(Math.round(bd.ReL))], ['Skin friction Cf', f3(bd.Cf * 1e3, 4) + '×10⁻³'], ['Form factor', f3(bd.FF, 3)], ['Dynamic pressure q', f3(bd.q / 1000, 2) + ' kPa'], ['Drag area D/q', f3(bd.DoverQ, 3) + ' m²', true], ['Friction drag', f3(bd.D / 1000, 2) + ' kN', true]]);
      N.push({ type: 'i', t: 'Turbulence costs friction but resists separation', d: `At Re_x = ${fmtSI(Math.round(S.Rex))} the turbulent layer has ${f3(pl.cf / cfl, 1)} times the wall shear of a laminar one, because eddies bring fast fluid close to the wall. That same mixing is why a turbulent layer survives adverse pressure gradients that would separate a laminar one (golf-ball dimples, vortex generators).` });
      N.push({ type: 'i', t: 'Fuselage drag', d: `A ${f3(S.bodyL, 1)} m by ${f3(S.bodyD, 2)} m fuselage at ${f3(S.bodyV, 0)} m/s and ${f3(S.bodyAlt / 1000, 1)} km has a friction drag of about ${f3(bd.D / 1000, 1)} kN: the flat-plate analogy, the usual first estimate of an airliner's parasite drag.` });
    }
    notes(N);
  }

  build();
  return {
    controls, main, side,
    show() { S.visible = true; main.style.display = 'flex'; update(); },
    hide() { S.visible = false; main.style.display = 'none'; },
    destroy() { },
  };
}
