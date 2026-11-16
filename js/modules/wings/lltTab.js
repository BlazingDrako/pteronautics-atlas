// Wings › Lifting line: Prandtl's lifting-line theory solved Glauert's way, for the current wing. The span mapped
// to θ on a semicircle with the collocation points, the Fourier coefficients Aₙ, the circulation built mode by mode,
// and how CL and the span efficiency converge as terms are added — against the vortex lattice.
import { h, section } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import * as Wg from '../../solvers/wing.js';
import { store, schedule, wingSection, flightSection, metricsGrid, insightsList, card, css, fmt, bound, put, canvasBox } from './common.js';

const PI = Math.PI;

export function lltTab({ keep }) {
  const V = keep({ N: 6, modes: 4 });
  const controls = h('div'), main = h('div', { class: 'cf-main-inner' });
  const metrics = metricsGrid();
  const geo = canvasBox('cf-chart', '300px');
  const gCard = card('Span as an angle: y = (b/2) cos θ', 'Top: the half-wing with its collocation points (one per unknown). Bottom: the same points on a semicircle; equal steps in θ crowd the points toward the tip, where the load changes fastest.'); gCard.append(geo.el);
  const aCard = card('Fourier coefficients Aₙ', 'Only odd n appear for a symmetric wing. A₁ alone is elliptic loading; the others measure how far the load departs from it, and each adds induced drag in proportion to n·Aₙ².');
  const aPlot = new Plot(aCard, { xlabel: 'n', ylabel: 'Aₙ / A₁', xname: 'n', yname: 'Aₙ/A₁', legendPos: 'above', xfmt: v => v.toFixed(0), yfmt: v => v.toFixed(5) });
  const mCard = card('Circulation, mode by mode', 'Γ(θ) = 2bV∞ Σ Aₙ sin nθ: the first few modes (thin) add up to the full distribution (thick).');
  const mPlot = new Plot(mCard, { xlabel: 'y / (b/2)', ylabel: 'Γ / (bV∞)', xname: 'η', yname: 'Γ/(bV∞)', legendPos: 'above', xfmt: v => v.toFixed(3), yfmt: v => v.toFixed(4) });
  const cCard = card('Convergence with the number of terms', 'CL and e from lifting-line theory with N odd terms (accent and green), against the vortex lattice (dashed, includes sweep and lifting-surface effects).');
  const cPlot = new Plot(cCard, { xlabel: 'terms N', ylabel: 'CL (left) · e', xname: 'N', yname: '', legendPos: 'above', xfmt: v => v.toFixed(0), yfmt: v => v.toFixed(4) });
  for (const p of [aPlot, mPlot, cPlot]) p.wrap.style.height = '250px';
  const insCard = card('Notes'); const insEl = h('div'); insCard.append(insEl);
  main.append(metrics.el, gCard, h('div', { class: 'cf-grid2b' }, aCard, mCard), h('div', { class: 'cf-grid2b' }, cCard, insCard));

  let wingCtl, flightCtl;
  const changed = kind => { if (kind === 'preset') build(); else { wingCtl && wingCtl.update(); flightCtl && flightCtl.update(); } schedule(); };
  const build = () => {
    const s = section('Lifting line');
    put(s.body, bound(V, 'N', 'Fourier terms N (odd n only)', 1, 30, { step: 1, digits: 0, onInput: () => { V.N = Math.round(V.N); paint(); }, tip: 'The number of unknowns A₁, A₃, … and of collocation points on the half-wing. Glauert\'s classic hand solution used 4.' }),
      bound(V, 'modes', 'Modes drawn', 1, 6, { step: 1, digits: 0, onInput: () => { V.modes = Math.round(V.modes); paint(); } }));
    wingCtl = wingSection(changed); flightCtl = flightSection(changed);
    controls.replaceChildren(s.el, flightCtl.el, wingCtl.el);
  };

  function paint() {
    const W = store.W, C = store.C, N = V.N;
    const ll = Wg.liftingLine(W, { alpha: C.alpha, N }), P = Wg.planform(W), vl = store.sol;
    metrics.set([
      { k: 'CL (lifting line)', v: fmt(ll.CL, 4), s: vl ? `vortex lattice: ${fmt(vl.CL, 4)}` : '', tip: 'CL = πA·A₁: only the first coefficient carries lift.' },
      { k: 'Span efficiency e', v: fmt(ll.e, 4), s: `δ = Σ n(Aₙ/A₁)² = ${fmt(ll.delta, 5)}` },
      { k: 'Induced drag CDi', v: fmt(ll.CDi, 5), s: 'CL²/(πA) · (1 + δ)' },
      { k: 'A₁', v: fmt(ll.An[0], 5), s: `${N} unknown${N > 1 ? 's' : ''}, ${N} collocation points` },
      { k: 'Planform', v: `A = ${fmt(W.AR, 2)}`, s: Math.abs(W.sweep) > 1 || W.winglet.on ? 'sweep and winglets are ignored here' : `taper ${fmt(W.taper, 2)}`, cls: Math.abs(W.sweep) > 1 || W.winglet.on ? 'warn' : '' },
    ]);
    // geometry: half-wing and semicircle with collocation points
    geo.set(({ W: Wd, H, g }) => {
      const x0 = 40, x1 = Wd - 30, sc = x1 - x0, k = 34 / P.cr, ym = 30; // half-wing: root at x0, tip at x1
      g.fillStyle = css('--bg-sunk'); g.strokeStyle = css('--text'); g.lineWidth = 1.6; g.beginPath();
      for (let i = 0; i <= 60; i++) { const e = i / 60; g[i ? 'lineTo' : 'moveTo'](x0 + e * sc, ym + 6 - 0.25 * P.chord(e) * k); }
      for (let i = 60; i >= 0; i--) { const e = i / 60; g.lineTo(x0 + e * sc, ym + 6 + 0.75 * P.chord(e) * k); }
      g.closePath(); g.fill(); g.stroke();
      const yw = ym + 6, cy = H - 26, rv = cy - (ym + 60); // the quarter-ellipse: θ = 0 at the tip, π/2 at the root
      g.strokeStyle = css('--text-3'); g.lineWidth = 1; g.beginPath(); g.ellipse(x0, cy, sc, rv, 0, -PI / 2, 0); g.stroke();
      g.beginPath(); g.moveTo(x0, cy); g.lineTo(x1, cy); g.stroke();
      for (let i = 0; i < N; i++) {
        const t = (i + 1) * PI / (2 * N), e = Math.cos(t), px = x0 + e * sc, py = cy - Math.sin(t) * rv;
        g.strokeStyle = css('--accent'); g.setLineDash([3, 3]); g.beginPath(); g.moveTo(px, py); g.lineTo(px, yw); g.stroke(); g.setLineDash([]);
        g.fillStyle = css('--accent'); g.beginPath(); g.arc(px, py, 4, 0, 2 * PI); g.fill(); g.beginPath(); g.arc(px, yw, 3.5, 0, 2 * PI); g.fill();
        g.strokeStyle = css('--text-3'); g.beginPath(); g.moveTo(x0, cy); g.lineTo(px, py); g.stroke();
      }
      g.fillStyle = css('--text-2'); g.font = `11px ${css('--font')}`;
      g.fillText('root (θ = π/2)', x0 - 4, cy + 16); g.textAlign = 'right'; g.fillText('tip (θ = 0)', x1, cy + 16);
    });
    // coefficients
    const ns = ll.An.map((_, k) => 2 * k + 1);
    aPlot.setData({ series: [{ x: ns, y: ll.An.map(a => a / ll.An[0]), color: css('--accent'), label: 'Aₙ/A₁', points: true, pointSize: 4, width: 1.2 }], hlines: [{ y: 0, color: css('--text-3') }] });
    // modes
    const th = [], eta = [];
    for (let k = 0; k <= 120; k++) { const t = PI * k / 120; th.push(t); eta.push(Math.cos(t)); }
    const ser = [];
    const cols = [css('--accent'), css('--lower'), css('--good'), css('--warn'), css('--text-2'), css('--upper')];
    for (let m = 0; m < Math.min(V.modes, ll.An.length); m++) { const n = 2 * m + 1; ser.push({ x: eta, y: th.map(t => 2 * ll.An[m] * Math.sin(n * t)), color: cols[m % cols.length], label: `n = ${n}`, width: 1.2, dash: [4, 3] }); }
    ser.push({ x: eta, y: th.map(t => { let s = 0; for (let k = 0; k < ll.An.length; k++) s += ll.An[k] * Math.sin((2 * k + 1) * t); return 2 * s; }), color: css('--text'), label: 'Γ/(bV∞), all terms', width: 2.6 });
    mPlot.setData({ series: ser, hlines: [{ y: 0, color: css('--text-3') }] });
    // convergence
    const Ns = [1, 2, 3, 4, 5, 6, 8, 10, 14, 20, 30], cl = [], ee = [];
    for (const n of Ns) { const r = Wg.liftingLine(W, { alpha: C.alpha, N: n }); cl.push(r.CL); ee.push(r.e); }
    cPlot.setData({ series: [{ x: Ns, y: cl, color: css('--accent'), label: 'CL', points: true, pointSize: 3 }, { x: Ns, y: ee, color: css('--good'), label: 'e', points: true, pointSize: 3 }],
      hlines: vl ? [{ y: vl.CL, color: css('--accent'), dash: [5, 4] }, { y: vl.e, color: css('--good'), dash: [5, 4] }] : [], vlines: [{ x: N, color: css('--text-3'), dash: [3, 3] }] });
    const L = [];
    L.push({ type: 'i', t: 'Glauert\'s method', d: 'Write the circulation as Γ(θ) = 2bV∞ Σ Aₙ sin nθ with y = (b/2) cos θ. Each section must make the lift its effective angle allows, which gives one equation per collocation point: Σ Aₙ sin nθ (sin θ + nμ) = μ(α − α₀) sin θ, μ = a₀c/(4b). Solving the N × N system gives the Aₙ.' });
    if (W.shape === 'elliptic') L.push({ type: 'g', t: 'Elliptic wing: one term is enough', d: 'With an elliptic planform and no twist, A₁ is the whole answer: every higher coefficient is zero, the downwash is uniform and e = 1.' });
    else L.push({ type: 'i', t: `${N === 1 ? 'One term assumes elliptic loading' : 'Higher terms correct the shape'}`, d: `Each extra odd term lets the load depart further from the ellipse. Here δ = ${fmt(ll.delta, 4)}: the induced drag is ${fmt(ll.delta * 100, 2)}% above the elliptic minimum for this span and lift. The answer settles by about N = 8–10.` });
    if (Math.abs(W.sweep) > 1) L.push({ type: 'w', t: 'Sweep is not in lifting-line theory', d: 'Prandtl\'s model puts all the lift on one straight line. For swept or low-aspect-ratio wings use the vortex lattice (the dashed lines), which is why it sits lower.' });
    insightsList(insEl, L);
  }

  let visible = false;
  store.subs.add(() => { if (visible) paint(); });
  build();
  return { controls, main, show() { visible = true; build(); paint(); }, hide() { visible = false; }, destroy() { } };
}
