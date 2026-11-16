// Airfoil Lab › Thin airfoil: Glauert's thin-airfoil theory on a NACA, parabolic, flapped or hand-drawn piecewise
// camber line, or the inverse problem (a cubic camber line for a target lift and moment). Shows the camber line with
// its chordwise loading, the Fourier coefficients, and dz/dx against its truncated Fourier series.
import { h, section, select, field, segmented, toggle } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import * as T from '../../solvers/airfoilTheory.js';
import { FieldCanvas, metricsGrid, card, bound, put, css, canvasBox } from '../cfd/fieldCommon.js';
import { theoryShell, D, f3 } from './theoryCommon.js';
import { thinConcepts } from './learn.js';

const KINDS = [
  { value: 'naca', label: 'NACA 4- or 5-digit' },
  { value: 'piece', label: 'Piecewise straight (drag the points)' },
  { value: 'parab', label: 'Parabolic arc' },
  { value: 'flap', label: 'Flat plate with a flap' },
  { value: 'design', label: 'Inverse design (cubic camber line)' },
];

export function thinTab({ setHeader, keep = o => o }) {
  const S = keep({
    kind: 'piece', code: '2412', pts: [[0.25, 0.1], [0.5, 0.1], [0.75, 0.06]], h: 0.04, xh: 0.75, delta: 10,
    clT: 0.4, cmT: 0.0, alpha: 2, nTerms: 6, ex: 3, panels: true, visible: false,
  });
  const { controls, main, side, notes } = theoryShell(thinConcepts);
  const metrics = metricsGrid();
  const fc = new FieldCanvas({ height: '300px' });
  const vCard = card('Camber line and loading', 'The camber line (vertical scale exaggerated) with arrows showing the chordwise lift loading ΔCp = Cp,lower − Cp,upper. Triangle: aerodynamic center (c/4); diamond: center of pressure.');
  vCard.append(fc.el);
  const bars = canvasBox('cf-chart', '200px');
  const bCard = card('Fourier coefficients', 'A₀ depends on α; A₁, A₂, … only on the camber line. cl uses A₀ and A₁; the moment uses A₁ and A₂.'); bCard.append(bars.el);
  const sCard = card('Camber slope and its Fourier series', 'dz/dx against θ (x = (1 − cos θ)/2) with the truncated series (α − A₀) + Σ Aₙ cos nθ. More terms follow kinks better.');
  const sPlot = new Plot(sCard, { xlabel: 'θ (°)', ylabel: 'dz/dx', xname: 'θ', yname: 'dz/dx', legendPos: 'above', xfmt: v => v.toFixed(1) + '°', yfmt: v => v.toFixed(4) });
  sPlot.wrap.style.height = '220px';
  const lCard = card('Chordwise loading', 'ΔCp(x) from thin-airfoil theory. The 1/√x leading-edge peak (from A₀) vanishes at the ideal angle.');
  const lPlot = new Plot(lCard, { xlabel: 'x/c', ylabel: 'ΔCp', xname: 'x/c', yname: 'ΔCp', legendPos: 'above', xfmt: v => v.toFixed(3), yfmt: v => v.toFixed(3) });
  lPlot.wrap.style.height = '220px';
  main.append(metrics.el, vCard, h('div', { class: 'cf-grid2b' }, bCard, sCard), lCard);

  const nacaIn = h('input', { class: 'text-input', value: S.code, maxlength: 5, 'aria-label': 'NACA digits' });
  nacaIn.addEventListener('change', () => { const v = nacaIn.value.trim(); if (!T.nacaCamber(v)) { nacaIn.style.borderColor = 'var(--bad)'; return; } nacaIn.style.borderColor = ''; S.code = v; update(); });
  function build() {
    const sec = section('Camber line'), on = () => update();
    put(sec.body, field('Shape', select(KINDS, S.kind, v => { S.kind = v; build(); update(); })));
    if (S.kind === 'naca') put(sec.body, field('NACA digits', nacaIn, 'Only the camber line matters here (the first two or three digits); thickness drops out of thin-airfoil theory. 5-digit: 210xx–250xx.'),
      toggle('Compare with the vortex panel method', S.panels, v => { S.panels = v; update(); }, { tip: 'Solves the full section with its thickness by linear vortex panels (inviscid). The difference from thin-airfoil theory is the thickness effect.' }).el);
    if (S.kind === 'piece') {
      const add = h('button', { type: 'button', class: 'btn sm' }, '+ Point'), rm = h('button', { type: 'button', class: 'btn sm' }, '− Point'), ex = h('button', { type: 'button', class: 'btn sm' }, 'Notes example');
      add.addEventListener('click', () => { if (S.pts.length >= 7) return; const P = [[0, 0], ...S.pts, [1, 0]]; let best = 0; for (let k = 0; k < P.length - 1; k++) if (P[k + 1][0] - P[k][0] > P[best + 1][0] - P[best][0]) best = k; S.pts.splice(best, 0, [(P[best][0] + P[best + 1][0]) / 2, (P[best][1] + P[best + 1][1]) / 2]); update(); });
      rm.addEventListener('click', () => { if (S.pts.length > 1) { S.pts.splice(Math.floor(S.pts.length / 2), 1); update(); } });
      ex.addEventListener('click', () => { S.pts = [[0.25, 0.1], [0.5, 0.1], [0.75, 0.06]]; S.alpha = 2; build(); update(); });
      put(sec.body, h('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap' } }, add, rm, ex), h('div', { class: 'hint' }, 'Drag the points in the picture. The camber slope is constant between points, so the Fourier integrals are exact.'));
    }
    if (S.kind === 'parab') put(sec.body, bound(S, 'h', 'Maximum camber h/c', -0.1, 0.12, { step: 0.001, digits: 3, onInput: on, tip: 'z = 4h x(1 − x). Thin-airfoil theory gives α_L=0 = −2h/c (radians) and Cm,c/4 = −πh/c.' }));
    if (S.kind === 'flap') put(sec.body, bound(S, 'xh', 'Hinge x/c', 0.3, 0.98, { step: 0.005, digits: 3, onInput: on }), bound(S, 'delta', 'Flap deflection δ (down +)', -30, 30, { step: 0.5, digits: 1, unit: '°', onInput: on, tip: 'Thin-airfoil theory: Δcl/δ = 2(π − θh + sin θh), θh = acos(1 − 2x_h/c). A 25% flap gives about 3.4 per radian of deflection.' }));
    if (S.kind === 'design') put(sec.body, bound(S, 'clT', 'Target lift cl', -0.5, 1.5, { step: 0.01, digits: 3, onInput: on }), bound(S, 'cmT', 'Target Cm about c/4', -0.15, 0.08, { step: 0.001, digits: 3, onInput: on, tip: 'Zero or slightly positive needs a reflexed trailing edge: what a tailless flying wing uses.' }),
      h('div', { class: 'hint' }, 'Finds k₁, k₂ in z = x(1 − x)(k₁ + k₂x) so that thin-airfoil theory gives exactly these values at the angle below.'));
    const sf = section('Flow');
    put(sf.body, bound(S, 'alpha', 'Angle of attack α', -10, 15, { step: 0.1, digits: 2, unit: '°', onInput: on }),
      bound(S, 'nTerms', 'Fourier terms shown', 2, 14, { step: 1, digits: 0, onInput: () => { S.nTerms = Math.round(S.nTerms); update(); } }),
      bound(S, 'ex', 'Vertical exaggeration', 1, 10, { step: 0.5, digits: 1, onInput: () => draw() }));
    controls.replaceChildren(sec.el, sf.el);
  }

  let R = null, cam = null, cmp = null, des = null;
  function camber() {
    des = null;
    if (S.kind === 'naca') return T.nacaCamber(S.code) || T.camberNACA4(0, 0);
    if (S.kind === 'piece') return T.camberPiecewise([[0, 0], ...S.pts, [1, 0]]);
    if (S.kind === 'parab') return T.camberParabolic(S.h);
    if (S.kind === 'flap') return T.camberFlap(S.xh, S.delta * D);
    des = T.designCubic(S.clT, S.cmT, S.alpha * D); return des.camber;
  }
  function update() {
    if (!S.visible) return;
    cam = camber();
    R = T.thinAirfoil(cam, S.alpha * D, { nTerms: Math.max(S.nTerms, 3) });
    cmp = null;
    if (S.kind === 'naca' && S.panels) { const P = T.nacaPanels(S.code, 160); cmp = T.vortexPanels(P.X, P.Y, S.alpha * D); }
    const label = { naca: 'NACA ' + S.code, piece: 'Piecewise camber line', parab: `Parabolic arc, h = ${f3(S.h)}c`, flap: `Plate with a ${f3((1 - S.xh) * 100, 0)}% flap at ${f3(S.delta, 1)}°`, design: 'Designed camber line' }[S.kind];
    setHeader(label, `Thin-airfoil theory at α = ${f3(S.alpha, 2)}°`, 'ok', 'Thin-airfoil theory');
    metrics.set([
      { k: 'Lift cl', v: f3(R.cl, 4), s: cmp ? `panels with thickness: ${f3(cmp.cl, 4)}` : 'π(2A₀ + A₁)' },
      { k: 'Cm about c/4', v: f3(R.cmc4, 4), s: cmp ? `panels: ${f3(cmp.cmc4, 4)}` : '(π/4)(A₂ − A₁)' },
      { k: 'Center of pressure', v: isFinite(R.xcp) ? f3(R.xcp, 4) + ' c' : '—', s: `margin (x_ac − x_cp)/c = ${isFinite(R.margin) ? f3(R.margin * 100, 1) + '%' : '—'}`, cls: R.margin < 0 ? 'warn' : '' },
      { k: 'Zero-lift angle', v: f3(R.alphaL0 / D, 3) + '°', s: 'lift slope 2π /rad' },
      { k: 'Ideal angle', v: f3(R.alphaIdeal / D, 3) + '°', s: `ideal cl = πA₁ = ${f3(R.clIdeal, 4)}` },
      des ? { k: 'Designed camber', v: `k₁ ${f3(des.k1, 4)}`, s: `k₂ ${f3(des.k2, 4)}` } : { k: 'Cm about the leading edge', v: f3(R.cmLE, 4), s: '−(cl/4 + π(A₁ − A₂)/4)' },
    ]);
    // plots
    const A = R.A.slice(0, S.nTerms + 1), th = [], dz = [], fs = [];
    for (let k = 1; k < 400; k++) { const t = Math.PI * k / 400; th.push(t / D); dz.push(cam.dz((1 - Math.cos(t)) / 2)); let s = S.alpha * D - A[0]; for (let n = 1; n < A.length; n++) s += A[n] * Math.cos(n * t); fs.push(s); }
    sPlot.setData({ series: [{ x: th, y: dz, color: css('--accent'), label: 'dz/dx', width: 2.2 }, { x: th, y: fs, color: css('--lower'), dash: [5, 4], label: `Fourier series, ${S.nTerms} terms`, width: 1.6 }] });
    const L = T.deltaCp(R.A, 200), ser = [{ x: L.x, y: L.d.map(v => Math.min(v, 8)), color: css('--accent'), label: 'thin-airfoil ΔCp', width: 2.2 }];
    if (S.kind !== 'naca' || !cmp) { const lv = T.lumpedVortex(cam, S.alpha * D, 20, { spacing: 'cosine' }); ser.push({ x: lv.xv, y: lv.dcp.map(v => Math.min(v, 8)), color: css('--text-2'), label: '20 discrete vortices', points: true, pointSize: 3, width: 0 }); }
    lPlot.setData({ series: ser, hlines: [{ y: 0, color: css('--text-3') }] });
    bars.set(({ W, H, g }) => {
      const n = A.length, pad = 30, bw = (W - 2 * pad) / n, mx = Math.max(1e-9, ...A.map(Math.abs)), y0 = H / 2;
      g.strokeStyle = css('--text-3'); g.beginPath(); g.moveTo(pad, y0); g.lineTo(W - pad, y0); g.stroke();
      g.font = `11px ${css('--font')}`; g.textAlign = 'center';
      A.forEach((v, k) => {
        const hh = v / mx * (H / 2 - 26), x = pad + k * bw + bw * 0.15;
        g.fillStyle = k === 0 ? css('--warn') : k <= 2 ? css('--accent') : css('--text-3');
        g.fillRect(x, y0 - Math.max(hh, 0), bw * 0.7, Math.abs(hh));
        g.fillStyle = css('--text-2'); g.fillText('A' + k, x + bw * 0.35, H - 6);
        g.fillText(f3(v, 3), x + bw * 0.35, hh >= 0 ? y0 - hh - 5 : y0 - hh + 13);
      });
    });
    draw();
    const N = [];
    N.push({ type: 'i', t: 'Only the camber line matters', d: 'Thin-airfoil theory replaces the airfoil by a vortex sheet on its camber line. The lift slope is 2π for every shape; camber shifts the curve (α_L=0) and adds a constant nose-down moment about the quarter chord, which is therefore the aerodynamic center.' });
    if (cmp) N.push({ type: 'g', t: `Thickness adds ${f3((cmp.cl / R.cl - 1) * 100, 1)}% lift here`, d: `The panel method on the real ${S.code} section gives cl = ${f3(cmp.cl, 4)} against ${f3(R.cl, 4)}. Inviscid thickness raises the lift slope by about 0.77 t/c; the boundary layer (Analyze tab) takes some of it back.` });
    if (S.kind === 'flap') { const thh = Math.acos(1 - 2 * S.xh); N.push({ type: 'i', t: `Flap effectiveness ${f3(2 * (Math.PI - thh + Math.sin(thh)), 3)} per radian`, d: `A flap is a camber change concentrated near the trailing edge, where the zero-lift-angle integral weights it most. Here Δcl/δ = 2(π − θh + sin θh); the flap is ${f3((1 - S.xh) * 100, 0)}% of the chord but gives ${f3(2 * (Math.PI - thh + Math.sin(thh)) / (2 * Math.PI) * 100, 0)}% of the lift of rotating the whole plate.` }); }
    if (R.margin < 0) N.push({ type: 'w', t: 'Negative static margin', d: `The center of pressure (${f3(R.xcp, 3)}c) is behind the aerodynamic center: a pitch-up disturbance moves it forward. A tailless aircraft needs Cm,c/4 ≥ 0 (reflex); with a tail, the tail provides the stability.` });
    if (S.kind === 'piece' && S.pts.length === 3 && Math.abs(S.alpha - 2) < 1e-9) N.push({ type: 'i', t: 'The notes\' worked example', d: 'Camber heights 0.1c, 0.1c and 0.06c at the quarter points, at α = 2°: cl = 1.203, x_cp = 0.4317c and a stability margin of −18.2%.' });
    notes(N);
  }

  function draw() {
    if (!cam) return;
    fc.setBox({ x0: -0.06, x1: 1.06, y0: -0.25, y1: 0.35 });
    fc.set((g, Tc) => {
      const ex = S.ex, Z = (x) => cam.z(x) * ex;
      Tc.polyline([[-0.06, 0], [1.06, 0]], { strokeStyle: css('--text-3'), lineWidth: 1, dash: [3, 3] });
      // free-stream arrow
      Tc.arrow(-0.04, -0.18, 0.12 * Math.cos(S.alpha * D), 0.12 * Math.sin(S.alpha * D) * ex, { color: css('--text-2') });
      Tc.text(-0.04, -0.21, `V∞ at α = ${f3(S.alpha, 1)}°`, { size: 11, color: css('--text-2') });
      // loading arrows
      const L = T.deltaCp(R.A, 30), sc = 0.06;
      for (let k = 0; k < L.x.length; k++) { const x = L.x[k], v = Math.max(-3, Math.min(4, L.d[k])); if (Math.abs(v) < 1e-3) continue; Tc.arrow(x, Z(x), 0, v * sc, { color: v > 0 ? css('--upper') : css('--lower'), width: 1.3, head: 4 }); }
      const line = []; for (let k = 0; k <= 200; k++) { const x = k / 200; line.push([x, Z(x)]); }
      Tc.polyline(line, { strokeStyle: css('--text'), lineWidth: 2.6 });
      const env = L.x.map((x, k) => [x, Z(x) + Math.max(-3, Math.min(4, L.d[k])) * sc]);
      Tc.polyline(env, { strokeStyle: css('--upper'), lineWidth: 1, globalAlpha: 0.6 });
      // markers
      const tri = (x, col) => { const [px, py] = Tc.toPx(x, Z(x)); g.fillStyle = col; g.beginPath(); g.moveTo(px, py + 4); g.lineTo(px - 6, py + 14); g.lineTo(px + 6, py + 14); g.closePath(); g.fill(); };
      tri(0.25, css('--good'));
      if (isFinite(R.xcp) && R.xcp > -0.5 && R.xcp < 1.5) { const [px, py] = Tc.toPx(R.xcp, Z(Math.max(0, Math.min(1, R.xcp)))); g.fillStyle = css('--warn'); g.beginPath(); g.moveTo(px, py + 4); g.lineTo(px - 6, py + 11); g.lineTo(px, py + 18); g.lineTo(px + 6, py + 11); g.closePath(); g.fill(); }
      Tc.text(0.25, Z(0.25), 'a.c.', { size: 11, dy: 26, align: 'center', color: css('--good') });
      if (isFinite(R.xcp) && R.xcp > -0.5 && R.xcp < 1.5) Tc.text(R.xcp, Z(Math.max(0, Math.min(1, R.xcp))), 'c.p.', { size: 11, dy: 30, align: 'center', color: css('--warn') });
      if (S.kind === 'piece') for (const p of S.pts) Tc.dot(p[0], p[1] * ex, 6, css('--accent'));
      Tc.text(1.05, 0.33, ex > 1 ? `vertical scale ×${f3(ex, 1)}` : 'true scale', { size: 11, align: 'right', color: css('--text-3') });
    });
  }
  fc.on({
    down(p) {
      if (S.kind !== 'piece') return null;
      const i = S.pts.findIndex(q => fc.pxDist([q[0], q[1] * S.ex], p) < 12);
      if (i < 0) return null;
      return q => {
        const P = [[0, 0], ...S.pts, [1, 0]], lo = P[i][0] + 0.02, hi = P[i + 2][0] - 0.02;
        S.pts[i] = [Math.round(Math.max(lo, Math.min(hi, q[0])) * 200) / 200, Math.round(q[1] / S.ex * 1000) / 1000];
        update();
      };
    },
    hover(p) { return S.kind === 'piece' && S.pts.some(q => fc.pxDist([q[0], q[1] * S.ex], p) < 12) ? 'grab' : 'default'; },
  });

  build();
  return {
    controls, main, side,
    show() { S.visible = true; main.style.display = 'flex'; update(); },
    hide() { S.visible = false; main.style.display = 'none'; },
    destroy() { fc.destroy(); },
  };
}
