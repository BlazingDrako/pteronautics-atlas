// Wings › Vortex filaments: the Biot–Savart law that every wing method rests on. An infinite line, a finite segment,
// a ring, a horseshoe, or two horseshoes in formation; the induced velocity on a slice through the flow, and along a
// line against the closed-form results.
import { h, section, select, field, segmented } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import * as Wg from '../../solvers/wing.js';
import { metricsGrid, insightsList, card, css, fmt, bound, put } from './common.js';
import { FieldCanvas, diverging, bgRgb, colorBar } from '../cfd/fieldCommon.js';

const KINDS = [
  { value: 'line', label: 'Infinite straight vortex' },
  { value: 'segment', label: 'Finite segment' },
  { value: 'ring', label: 'Vortex ring' },
  { value: 'horseshoe', label: 'Horseshoe vortex (a simple wing)' },
  { value: 'formation', label: 'Two horseshoes in formation' },
];
const PI = Math.PI;

export function vortexTab({ keep }) {
  const S = keep({ kind: 'horseshoe', G: 10, L: 2, R: 1, b: 2, dy: 1.7, dx: 4, dz: 0, plane: 'cross', at: 2 });
  const controls = h('div'), main = h('div', { class: 'cf-main-inner' });
  const metrics = metricsGrid();
  const fc = new FieldCanvas({ height: 'max(380px, 48vh)' });
  const vCard = card('Induced velocity on a slice', 'Color: the velocity component normal to the slice\'s horizontal axis in the picture (vertical w, red up, blue down). Arrows: the in-plane velocity. Thick lines: the vortex filaments (their projection); arrowheads show the direction of Γ.');
  vCard.append(fc.el);
  const pCard = card('Along a line', '');
  const plot = new Plot(pCard, { legendPos: 'above' });
  plot.wrap.style.height = '260px';
  const fCard = card('Formation flight: saving against lateral position', 'Average upwash over the trailing wing\'s span, as an induced-drag saving for the same lift (ΔD/D ≈ −w̄/(αi V) with αi the wing\'s own induced angle), against how far its center is from the leader\'s center line.');
  const fPlot = new Plot(fCard, { xlabel: 'lateral offset Δy / b', ylabel: 'induced-drag change (%)', xname: 'Δy/b', yname: 'ΔDi', legendPos: 'above', xfmt: v => v.toFixed(3), yfmt: v => v.toFixed(1) + '%' });
  fPlot.wrap.style.height = '240px';
  const insCard = card('Notes'); const insEl = h('div'); insCard.append(insEl);
  main.append(metrics.el, vCard, h('div', { class: 'cf-grid2b' }, pCard, fCard), insCard);

  function build() {
    const sec = section('Filament'), on = () => paint();
    put(sec.body, field('Element', select(KINDS, S.kind, v => { S.kind = v; S.plane = v === 'ring' ? 'side' : v === 'line' || v === 'segment' ? 'cross' : 'cross'; build(); paint(); })),
      bound(S, 'G', 'Circulation Γ', -50, 50, { step: 0.1, digits: 1, unit: 'm²/s', onInput: on }));
    if (S.kind === 'segment') put(sec.body, bound(S, 'L', 'Length', 0.1, 10, { step: 0.05, digits: 2, unit: 'm', onInput: on }));
    if (S.kind === 'ring') put(sec.body, bound(S, 'R', 'Radius', 0.1, 5, { step: 0.05, digits: 2, unit: 'm', onInput: on }));
    if (S.kind === 'horseshoe' || S.kind === 'formation') put(sec.body, bound(S, 'b', 'Span b (between the trailing legs)', 0.5, 10, { step: 0.05, digits: 2, unit: 'm', onInput: on, tip: 'For an elliptic wing of span B the tip vortices end up πB/4 apart, so a horseshoe of span πB/4 represents it.' }));
    if (S.kind === 'formation') put(sec.body, bound(S, 'dy', 'Follower lateral offset Δy', 0, 6, { step: 0.01, digits: 2, unit: 'm', onInput: on, tip: 'Center to center. Geese fly with their wingtips slightly overlapping, about Δy ≈ 0.9 of the span.' }),
      bound(S, 'dx', 'Follower distance behind', 0.5, 30, { step: 0.1, digits: 1, unit: 'm', onInput: on }), bound(S, 'dz', 'Follower height', -2, 2, { step: 0.01, digits: 2, unit: 'm', onInput: on }));
    const sv = section('Slice');
    const pl = segmented([{ value: 'cross', label: 'Cross-flow (y–z)' }, { value: 'top', label: 'Top (x–y)' }, { value: 'side', label: 'Side (x–z)' }], S.plane, v => { S.plane = v; build(); paint(); });
    pl.el.classList.add('seg-wrap');
    put(sv.body, field('Plane', pl.el, 'Cross-flow: looking down the x-axis (the flow direction for a wing). Top: from above. Side: from the left.'),
      bound(S, 'at', S.plane === 'cross' ? 'Slice at x =' : S.plane === 'top' ? 'Slice at z =' : 'Slice at y =', -5, 20, { step: 0.05, digits: 2, unit: 'm', onInput: on }));
    controls.replaceChildren(sec.el, sv.el);
  }

  // the filaments as line segments [A, B] (the semi-infinite legs cut at x = 40)
  function filaments() {
    const F = [], X = 40;
    if (S.kind === 'line') F.push([[-X, 0, 0], [X, 0, 0]]);
    if (S.kind === 'segment') F.push([[0, -S.L / 2, 0], [0, S.L / 2, 0]]);
    if (S.kind === 'ring') for (let k = 0; k < 72; k++) { const a = 2 * PI * k / 72, c = 2 * PI * (k + 1) / 72; F.push([[0, S.R * Math.cos(a), S.R * Math.sin(a)], [0, S.R * Math.cos(c), S.R * Math.sin(c)]]); }
    const hs = (x0, y0, z0) => { F.push([[X, y0 - S.b / 2, z0], [x0, y0 - S.b / 2, z0]], [[x0, y0 - S.b / 2, z0], [x0, y0 + S.b / 2, z0]], [[x0, y0 + S.b / 2, z0], [X, y0 + S.b / 2, z0]]); };
    if (S.kind === 'horseshoe' || S.kind === 'formation') hs(0, 0, 0);
    if (S.kind === 'formation') hs(S.dx, S.dy, S.dz);
    return F;
  }
  function vel(P) {
    if (S.kind === 'line') return Wg.inducedByLine(P, [0, 0, 0], [1, 0, 0], S.G);
    if (S.kind === 'segment') return Wg.inducedBySegment(P, [0, -S.L / 2, 0], [0, S.L / 2, 0], S.G);
    if (S.kind === 'ring') return Wg.inducedByRing(P, 0, S.R, S.G, 120);
    const v = Wg.inducedByHorseshoe(P, 0, 0, 0, S.b, S.G);
    if (S.kind === 'formation') { const w = Wg.inducedByHorseshoe(P, S.dx, S.dy, S.dz, S.b, S.G); v[0] += w[0]; v[1] += w[1]; v[2] += w[2]; }
    return v;
  }
  // map between the slice's 2-D coordinates (u, v) and 3-D
  const to3 = (u, v) => S.plane === 'cross' ? [S.at, u, v] : S.plane === 'top' ? [u, v, S.at] : [u, S.at, v];
  const comp = V => S.plane === 'cross' ? [V[1], V[2], V[0]] : S.plane === 'top' ? [V[0], V[1], V[2]] : [V[0], V[2], V[1]];
  const proj = P => S.plane === 'cross' ? [P[1], P[2]] : S.plane === 'top' ? [P[0], P[1]] : [P[0], P[2]];

  function paint() {
    const span = S.kind === 'formation' ? Math.max(S.b, S.dy + S.b) : S.kind === 'ring' ? 2.4 * S.R : S.kind === 'segment' ? S.L : S.b || 2;
    const box = S.plane === 'cross' ? { x0: -1.1 * span, x1: (S.kind === 'formation' ? S.dy : 0) + 1.1 * span, y0: -0.8 * span, y1: 0.8 * span }
      : S.plane === 'top' ? { x0: -0.6 * span - 1, x1: Math.max(6, (S.kind === 'formation' ? S.dx : 0) + 3), y0: -1.1 * span, y1: (S.kind === 'formation' ? S.dy : 0) + 1.1 * span }
        : { x0: -2.5 * span, x1: 2.5 * span, y0: -1.2 * span, y1: 1.2 * span };
    fc.setBox(box);
    const F = filaments();
    fc.set((g, T) => {
      const v = T.view, nx = 120, ny = Math.max(40, Math.round(nx * (v.y1 - v.y0) / (v.x1 - v.x0))), grid = new Float64Array(nx * ny), bg = bgRgb();
      const vals = [];
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const u = v.x0 + i * (v.x1 - v.x0) / (nx - 1), w = v.y0 + j * (v.y1 - v.y0) / (ny - 1), c = comp(vel(to3(u, w)));
        const val = S.plane === 'top' ? c[2] : c[1]; grid[j * nx + i] = isFinite(val) ? val : NaN; if (isFinite(val)) vals.push(Math.abs(val));
      }
      vals.sort((a, b) => a - b);
      const mx = Math.max(1e-9, vals[Math.floor(vals.length * 0.95)] || 1);
      const col = q => diverging(q / mx, bg);
      T.image(grid, nx, ny, v, col);
      const n = 18, d = (v.x1 - v.x0) / n;
      const A = []; let qm = 0;
      for (let u = v.x0 + d / 2; u < v.x1; u += d) for (let w = v.y0 + d / 2; w < v.y1; w += d) { const c = comp(vel(to3(u, w))); const q = Math.hypot(c[0], c[1]); if (isFinite(q)) { A.push([u, w, c, q]); qm = Math.max(qm, Math.min(q, mx * 3)); } }
      for (const [u, w, c, q] of A) if (q > 1e-9) { const L = Math.min(1, q / qm) * d * 0.85; T.arrow(u, w, c[0] / q * L, c[1] / q * L, { color: css('--text-2'), width: 1, head: 4 }); }
      for (const [P, Q] of F) {
        const a = proj(P), b = proj(Q);
        if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9) { T.dot(a[0], a[1], 5, css('--text')); continue; }
        T.polyline([a, b], { strokeStyle: css('--text'), lineWidth: 3 });
      }
      // direction marks on the bound vortices / ring
      if (S.kind !== 'line' && S.plane !== 'cross') for (const [P, Q] of F.filter((_, k) => S.kind === 'ring' ? k % 12 === 0 : true)) { const a = proj(P), b = proj(Q), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > 1e-6 && L < 30) T.arrow(m[0], m[1], (b[0] - a[0]) / L * 14, (b[1] - a[1]) / L * 14, { color: css('--warn'), head: 9, width: 2.5, px: true }); }
      colorBar(T, col, -mx, mx, 'w', q => fmt(q, 2));
      const lab = S.plane === 'cross' ? ['y', 'z'] : S.plane === 'top' ? ['x', 'y'] : ['x', 'z'];
      T.text(v.x1 - 0.02 * (v.x1 - v.x0), v.y0 + 0.04 * (v.y1 - v.y0), `→ ${lab[0]}   ↑ ${lab[1]}`, { align: 'right', size: 11, color: css('--text-2'), tag: true });
    });
    panels();
  }

  function panels() {
    const L = [], G = S.G;
    let series = [], xl = '', yl = 'induced speed (m/s)';
    if (S.kind === 'line') {
      const r = [], num = [], th = [];
      for (let k = 1; k <= 80; k++) { const d = k * 0.05; r.push(d); num.push(Math.abs(Wg.inducedByLine([0, d, 0], [0, 0, 0], [1, 0, 0], G)[2])); th.push(Math.abs(G) / (2 * PI * d)); }
      series = [{ x: r, y: num, color: css('--accent'), label: 'Biot–Savart', width: 2.4 }, { x: r, y: th, color: css('--text'), dash: [5, 4], label: 'Γ/(2πd)', noHover: true }]; xl = 'distance d (m)';
      metrics.set([{ k: 'At 1 m', v: fmt(Math.abs(G) / (2 * PI), 4) + ' m/s', s: 'Γ/(2πd)' }, { k: 'Circulation', v: fmt(G, 2) + ' m²/s' }]);
      L.push({ type: 'i', t: 'The 2-D point vortex', d: 'An infinite straight vortex induces circular flow round itself at Γ/(2πd): exactly the point vortex of 2-D potential flow, seen end-on in the cross-flow slice.' });
    }
    if (S.kind === 'segment') {
      const d = [], num = [], th = [];
      for (let k = 1; k <= 80; k++) { const dd = k * 0.05 * S.L; d.push(dd); num.push(Math.abs(Wg.inducedBySegment([0, 0, dd], [0, -S.L / 2, 0], [0, S.L / 2, 0], G)[0])); const c = (S.L / 2) / Math.hypot(S.L / 2, dd); th.push(Math.abs(G) / (4 * PI * dd) * 2 * c); }
      series = [{ x: d, y: num, color: css('--accent'), label: 'Biot–Savart', width: 2.4 }, { x: d, y: th, color: css('--text'), dash: [5, 4], label: '(Γ/4πd)(cos θ₁ − cos θ₂)', noHover: true }, { x: d, y: d.map(q => Math.abs(G) / (2 * PI * q)), color: css('--text-3'), dash: [2, 3], label: 'infinite line', noHover: true }]; xl = 'distance from the midpoint, normal to the segment (m)';
      metrics.set([{ k: 'At d = L/2', v: fmt(Math.abs(G) / (4 * PI * S.L / 2) * 2 * Math.SQRT1_2, 4) + ' m/s', s: `${fmt(Math.SQRT1_2 * 100, 1)}% of an infinite line` }]);
      L.push({ type: 'i', t: 'The Biot–Savart law for a segment', d: 'V = (Γ/4πd)(cos θ₁ − cos θ₂), with θ₁, θ₂ the angles from the segment to the lines joining its ends to the point. Close to the segment it looks infinite; far away it fades as 1/d², not 1/d. Every vortex-lattice code is built from this formula.' });
    }
    if (S.kind === 'ring') {
      const x = [], num = [], th = [];
      for (let k = -60; k <= 60; k++) { const xx = k * 0.05 * S.R; x.push(xx); num.push(Wg.inducedByRing([xx, 0, 0], 0, S.R, G, 240)[0]); th.push(G * S.R * S.R / (2 * Math.pow(S.R * S.R + xx * xx, 1.5))); }
      series = [{ x, y: num, color: css('--accent'), label: 'Biot–Savart (240 segments)', width: 2.4 }, { x, y: th, color: css('--text'), dash: [5, 4], label: 'ΓR²/(2(R² + x²)^{3/2})', noHover: true }]; xl = 'distance along the axis x (m)'; yl = 'axial velocity (m/s)';
      metrics.set([{ k: 'At the center', v: fmt(G / (2 * S.R), 4) + ' m/s', s: 'Γ/(2R)' }, { k: 'Self-induced speed (thin core)', v: '∝ (Γ/4πR) ln(8R/a)', s: 'a smoke ring moves itself' }]);
      L.push({ type: 'i', t: 'A vortex ring', d: 'Each part of the ring pushes fluid through the middle, so the axial speed peaks at the center, Γ/(2R). A real ring with a finite core is carried along by its own induced velocity: a smoke ring, or the ring a helicopter rotor sheds in a vortex-ring state.' });
    }
    if (S.kind === 'horseshoe' || S.kind === 'formation') {
      const y = [], w = [];
      for (let k = -80; k <= 80; k++) { const yy = k * 0.025 * S.b; y.push(yy); w.push(Wg.inducedByHorseshoe([S.kind === 'formation' ? S.dx : 0, yy, S.kind === 'formation' ? S.dz : 0], 0, 0, 0, S.b, G)[2]); }
      series = [{ x: y, y: w, color: css('--accent'), label: S.kind === 'formation' ? 'leader\'s w at the follower\'s x' : 'w on the bound vortex line', width: 2.4 }]; xl = 'spanwise position y (m)'; yl = 'vertical velocity w (m/s)';
      const wMid = Wg.inducedByHorseshoe([0, 0, 0], 0, 0, 0, S.b, G)[2]; // on the bound line: only the legs act
      metrics.set([{ k: 'Downwash at the center', v: fmt(-wMid, 4) + ' m/s', s: 'on the bound vortex: Γ/(πb), from the legs only' }, { k: 'Far behind', v: fmt(2 * G / (PI * S.b), 4) + ' m/s', s: 'twice: the legs are then infinite both ways' }, { k: 'Lift per ρV', v: fmt(G * S.b, 3) + ' m³/s', s: 'L = ρVΓb (Kutta–Joukowski)' }]);
      L.push({ type: 'i', t: 'The simplest wing', d: 'A bound vortex (the lift, L = ρVΓb) and two trailing legs (the tip vortices). Between the legs the air goes down (blue); outside them it goes up (red). Each leg is semi-infinite at the wing, so the downwash there is half its value far behind: the result behind Prandtl\'s lifting-line theory.' });
    }
    if (S.kind === 'formation') {
      const follow = dy => { let s = 0; const n = 41; for (let k = 0; k < n; k++) { const yy = dy - S.b / 2 + S.b * (k + 0.5) / n; s += Wg.inducedByHorseshoe([S.dx, yy, S.dz], 0, 0, 0, S.b, G)[2]; } return s / n; };
      const own = G / (PI * S.b); // own downwash at the bound vortex (from its own legs)
      const wbar = follow(S.dy), save = -wbar / own * 100;
      metrics.set([{ k: 'Average upwash on the follower', v: fmt(wbar, 4) + ' m/s', s: wbar > 0 ? 'upwash: helps' : 'downwash: hurts', cls: wbar > 0 ? 'good' : 'bad' }, { k: 'Induced-drag change', v: fmt(save, 1) + '%', s: 'same lift, from tilting the lift forward', cls: save < 0 ? 'good' : 'bad' }, { k: 'Offset Δy/b', v: fmt(S.dy / S.b, 3) }]);
      const dys = [], sv = [];
      for (let k = 0; k <= 60; k++) { const dy = k * 0.04 * S.b; dys.push(dy / S.b); sv.push(-follow(dy) / own * 100); }
      fPlot.setData({ series: [{ x: dys, y: sv, color: css('--good'), label: 'follower\'s induced drag', width: 2.4 }], vlines: [{ x: S.dy / S.b, color: css('--text-3'), dash: [3, 3] }], hlines: [{ y: 0, color: css('--text-3') }] });
      L.push({ type: save < 0 ? 'g' : 'w', t: save < 0 ? 'Riding the leader\'s upwash' : 'In the leader\'s downwash', d: `Just outside the leader's tip vortex the air rises. A follower placed there meets the air at a larger angle, so it needs less incidence for the same lift; its lift vector tilts forward and its induced drag falls (${fmt(save, 1)}% here). Geese, pelicans and the Airbus "fello'fly" trials use this; the best spot is with the wingtips slightly overlapping.` });
    }
    fCard.style.display = S.kind === 'formation' ? '' : 'none';
    pCard.querySelector('h4').textContent = S.kind === 'ring' ? 'Along the axis' : S.kind === 'horseshoe' || S.kind === 'formation' ? 'Vertical velocity across the span' : 'Against distance';
    plot.setOpts({ xlabel: xl, ylabel: yl, xname: 'x', yname: 'V', xfmt: v => fmt(v, 3), yfmt: v => fmt(v, 4) });
    plot.setData({ series, hlines: [{ y: 0, color: css('--text-3') }] });
    insightsList(insEl, L);
  }

  build();
  return { controls, main, show() { paint(); }, hide() { }, destroy() { fc.destroy(); } };
}
