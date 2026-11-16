// Airfoil Lab › Vortex panels: how panel methods work, one matrix at a time. Discrete (lumped) vortices on the camber
// line with the 1/4–3/4 rule, or linear-strength vortex panels on the surface (Kuethe & Chow) for a NACA section or a
// triangle. Shows the geometry with strengths, the influence matrix, the pressure and convergence with panel count.
import { h, section, select, field, segmented, toggle } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import * as T from '../../solvers/airfoilTheory.js';
import { FieldCanvas, metricsGrid, card, bound, put, css, canvasBox, diverging, bgRgb } from '../cfd/fieldCommon.js';
import { theoryShell, D, f3 } from './theoryCommon.js';
import { panelConcepts } from './learn.js';

export function panelsTab({ setHeader, keep = o => o }) {
  const S = keep({ method: 'lumped', code: '2412', shape: 'naca', t: 0.1, N: 6, Np: 40, spacing: 'uniform', alpha: 4, visible: false });
  const { controls, main, side, notes } = theoryShell(panelConcepts);
  const metrics = metricsGrid();
  const fc = new FieldCanvas({ height: '280px' });
  const gCard = card('Geometry and strengths', ''); gCard.append(fc.el);
  const mat = canvasBox('cf-chart', '260px');
  const mCard = card('Influence matrix', 'Row i, column j: the velocity normal to panel i induced by a unit strength on element j. Blue negative, red positive. The last row of the surface method is the Kutta condition.'); mCard.append(mat.el);
  const cCard = card('Convergence with the number of panels', '');
  const cPlot = new Plot(cCard, { xlabel: 'panels N', ylabel: 'cl', xname: 'N', yname: 'cl', legendPos: 'above', xfmt: v => v.toFixed(0), yfmt: v => v.toFixed(4) });
  cPlot.wrap.style.height = '260px';
  const pCard = card('Pressure', '');
  const pPlot = new Plot(pCard, { xlabel: 'x/c', ylabel: '', xname: 'x/c', legendPos: 'above', xfmt: v => v.toFixed(3), yfmt: v => v.toFixed(3) });
  pPlot.wrap.style.height = '240px';
  main.append(metrics.el, gCard, h('div', { class: 'cf-grid2b' }, mCard, cCard), pCard);

  const codeIn = h('input', { class: 'text-input', value: S.code, maxlength: 5, 'aria-label': 'NACA digits' });
  codeIn.addEventListener('change', () => { const v = codeIn.value.trim(); if (!T.nacaCamber(v)) { codeIn.style.borderColor = 'var(--bad)'; return; } codeIn.style.borderColor = ''; S.code = v; update(); });
  function build() {
    const sec = section('Method'), on = () => update();
    const m = segmented([{ value: 'lumped', label: 'Discrete vortices' }, { value: 'surface', label: 'Vortex panels' }], S.method, v => { S.method = v; build(); update(); });
    m.el.classList.add('seg-wrap');
    put(sec.body, field('Model', m.el, 'Discrete vortices: thin-airfoil theory done numerically on the camber line. Vortex panels: the real surface, with thickness.'));
    const sg = section('Section');
    if (S.method === 'surface') put(sg.body, field('Shape', select([{ value: 'naca', label: 'NACA 4- or 5-digit' }, { value: 'tri', label: 'Isosceles triangle' }], S.shape, v => { S.shape = v; build(); update(); })));
    if (S.method === 'lumped' || S.shape === 'naca') put(sg.body, field('NACA digits', codeIn, S.method === 'lumped' ? 'Only the camber line is used.' : 'Thickness and camber.'));
    if (S.method === 'surface' && S.shape === 'tri') put(sg.body, bound(S, 't', 'Thickness t/c', 0.02, 0.3, { step: 0.005, digits: 3, onInput: on }));
    const sn = section('Panels');
    if (S.method === 'lumped') {
      const sp = segmented([{ value: 'uniform', label: 'Uniform' }, { value: 'cosine', label: 'Cosine' }], S.spacing, v => { S.spacing = v; update(); });
      sp.el.classList.add('seg-wrap');
      put(sn.body, bound(S, 'N', 'Number of vortices N', 1, 40, { step: 1, digits: 0, onInput: () => { S.N = Math.round(S.N); update(); } }), field('Spacing', sp.el, 'Cosine spacing packs panels at the leading and trailing edges, where the loading changes fastest.'));
    } else put(sn.body, bound(S, 'Np', 'Number of panels N', 8, 240, { step: 2, digits: 0, onInput: () => { S.Np = 2 * Math.round(S.Np / 2); update(); } }));
    put(sn.body, bound(S, 'alpha', 'Angle of attack α', -10, 15, { step: 0.1, digits: 1, unit: '°', onInput: on }));
    controls.replaceChildren(sec.el, sg.el, sn.el);
  }

  let R = null, geom = null;
  const surfGeom = N => S.shape === 'tri' ? T.trianglePanels(S.t, N) : T.nacaPanels(S.code, N);
  function update() {
    if (!S.visible) return;
    const a = S.alpha * D, cam = T.nacaCamber(S.code) || T.camberNACA4(0, 0), thin = T.thinAirfoil(cam, a);
    const N = [];
    if (S.method === 'lumped') {
      R = T.lumpedVortex(cam, a, S.N, { spacing: S.spacing });
      setHeader(`NACA ${S.code} camber line`, `${S.N} discrete vortices at α = ${f3(S.alpha, 1)}°`, 'ok', 'Discrete vortex model');
      metrics.set([
        { k: 'Lift cl', v: f3(R.cl, 4), s: `thin-airfoil theory: ${f3(thin.cl, 4)} (${f3((R.cl / thin.cl - 1) * 100, 2)}%)` },
        { k: 'Cm about c/4', v: f3(R.cmc4, 4), s: `theory: ${f3(thin.cmc4, 4)}` },
        { k: 'Total circulation', v: f3(R.G.reduce((x, y) => x + y, 0), 4), s: 'Γ/(V∞c), clockwise' },
        { k: 'Unknowns', v: String(S.N), s: `${S.N}×${S.N} matrix` },
      ]);
      const Ns = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 40], cu = Ns.map(n => T.lumpedVortex(cam, a, n).cl), cc = Ns.map(n => T.lumpedVortex(cam, a, n, { spacing: 'cosine' }).cl);
      cPlot.setData({ series: [{ x: Ns, y: cu, color: css('--accent'), label: 'uniform', points: true, pointSize: 3 }, { x: Ns, y: cc, color: css('--lower'), label: 'cosine', points: true, pointSize: 3 }], hlines: [{ y: thin.cl, color: css('--good'), dash: [5, 4] }], vlines: [{ x: S.N, color: css('--text-3'), dash: [3, 3] }] });
      cCard.querySelector('h4').textContent = 'Convergence (green: thin-airfoil theory)';
      const L = T.deltaCp(thin.A, 200);
      pPlot.setOpts({ ylabel: 'ΔCp', yname: 'ΔCp', invertY: false });
      pPlot.setData({ series: [{ x: L.x, y: L.d.map(v => Math.min(v, 8)), color: css('--text-3'), dash: [5, 4], label: 'thin-airfoil theory', width: 1.4, noHover: true }, { x: R.xv, y: R.dcp.map(v => Math.min(v, 8)), color: css('--accent'), label: 'discrete vortices: 2Γ/(V∞Δx)', points: true, pointSize: 3.5, width: 1.6 }], hlines: [{ y: 0, color: css('--text-3') }] });
      pCard.querySelector('h4').textContent = 'Chordwise loading ΔCp';
      gCard.querySelector('h4').textContent = 'Vortices (circles, size ∝ Γ) and collocation points (×, with normals)';
      N.push({ type: 'i', t: 'One equation per collocation point', d: `Each row of the matrix says "the total normal velocity at this ×-point is zero". The vortex at a panel's quarter point and the check point at three quarters build the Kutta condition in: with one panel the model gives the exact flat-plate lift 2π sin α.` });
      N.push({ type: Math.abs(R.cl / thin.cl - 1) < 0.01 ? 'g' : 'i', t: `${f3(Math.abs(R.cl / thin.cl - 1) * 100, 2)}% from thin-airfoil theory`, d: 'More vortices resolve the camber line better and converge on Glauert\'s analytic result. Cosine spacing converges fastest because the loading is most curved at the edges.' });
    } else {
      geom = surfGeom(S.Np); R = T.vortexPanels(geom.X, geom.Y, a);
      const ref = T.vortexPanels(...(g => [g.X, g.Y])(surfGeom(320)), a);
      setHeader(S.shape === 'tri' ? `Triangle, ${f3(S.t * 100, 1)}% thick` : `NACA ${S.code}`, `${S.Np} linear vortex panels at α = ${f3(S.alpha, 1)}°`, 'ok', 'Vortex panel method');
      metrics.set([
        { k: 'Lift cl', v: f3(R.cl, 4), s: `from Γ; pressure integral ${f3(R.clPressure, 4)}` },
        { k: 'Converged (320 panels)', v: f3(ref.cl, 4), s: `${f3((R.cl / ref.cl - 1) * 100, 2)}% off` },
        { k: 'Thin-airfoil theory', v: S.shape === 'tri' ? f3(2 * Math.PI * a, 4) : f3(thin.cl, 4), s: 'no thickness' },
        { k: 'Cm about c/4', v: f3(R.cmc4, 4), s: 'pressure integral' },
        { k: 'Unknowns', v: String(R.n), s: `${R.m} panel equations + Kutta` },
      ]);
      const Ns = [8, 12, 16, 24, 32, 48, 64, 96, 128, 180, 240], cl = Ns.map(n => { const g2 = surfGeom(n); return T.vortexPanels(g2.X, g2.Y, a).cl; });
      cPlot.setData({ series: [{ x: Ns, y: cl, color: css('--accent'), label: 'vortex panels', points: true, pointSize: 3 }], hlines: [{ y: ref.cl, color: css('--good'), dash: [5, 4] }], vlines: [{ x: S.Np, color: css('--text-3'), dash: [3, 3] }] });
      cCard.querySelector('h4').textContent = 'Convergence (green: 320 panels)';
      const mid = Math.floor(R.m / 2), lo = [], up = [];
      for (let i = 0; i < R.m; i++) (i < mid ? lo : up).push([R.x[i], R.cp[i]]);
      const clip = v => Math.max(-6, Math.min(1.1, v));
      pPlot.setOpts({ ylabel: 'Cp', yname: 'Cp', invertY: true });
      pPlot.setData({ series: [{ x: up.map(p => p[0]), y: up.map(p => clip(p[1])), color: css('--upper'), label: 'upper', points: S.Np <= 60, pointSize: 2.5, width: 2 }, { x: lo.map(p => p[0]), y: lo.map(p => clip(p[1])), color: css('--lower'), label: 'lower', points: S.Np <= 60, pointSize: 2.5, width: 2 }], hlines: [{ y: 0, color: css('--text-3') }] });
      pCard.querySelector('h4').textContent = 'Surface pressure Cp = 1 − (V/V∞)²';
      gCard.querySelector('h4').textContent = 'Panels colored by Cp, with the sheet strength γ (arrows ∝ γ along the surface normal)';
      N.push({ type: 'i', t: 'The Kutta condition closes the system', d: `${R.m} panels give ${R.m} tangency equations for ${R.n} node strengths. The extra equation γ₁ + γ_{N+1} = 0 makes the upper and lower surfaces leave the trailing edge at the same speed, and that fixes the circulation and the lift.` });
      if (S.shape === 'tri') N.push({ type: 'i', t: 'Sharp corners', d: 'The flow must turn round the triangle\'s apex and leading edge, where the panel solution shows suction spikes. A real flow would separate at such corners.' });
      else N.push({ type: 'g', t: `Thickness adds ${f3((ref.cl / thin.cl - 1) * 100, 1)}% to thin-airfoil lift`, d: 'This is the inviscid part of the Analyze tab\'s solver. Compared with it, the viscous solution there loses some lift because the boundary layer thickens the effective shape near the trailing edge.' });
    }
    draw(); drawMatrix(); notes(N);
  }

  function draw() {
    fc.setBox({ x0: -0.06, x1: 1.06, y0: -0.22, y1: 0.26 });
    fc.set((g, Tc) => {
      if (!R) return;
      Tc.polyline([[-0.06, 0], [1.06, 0]], { strokeStyle: css('--text-3'), lineWidth: 1, dash: [3, 3] });
      if (S.method === 'lumped') {
        const cam = T.nacaCamber(S.code) || T.camberNACA4(0, 0), ex = 2.5, line = [];
        for (let k = 0; k <= 200; k++) line.push([k / 200, cam.z(k / 200) * ex]);
        Tc.polyline(line, { strokeStyle: css('--text'), lineWidth: 2 });
        const gm = Math.max(1e-9, ...R.G.map(Math.abs));
        for (let j = 0; j < R.N; j++) {
          const [px, py] = Tc.toPx(R.xv[j], R.zv[j] * ex), r = 3 + 12 * Math.sqrt(Math.abs(R.G[j]) / gm);
          g.strokeStyle = R.G[j] >= 0 ? css('--accent') : css('--lower'); g.lineWidth = 2; g.beginPath(); g.arc(px, py, r, 0.3, 2 * Math.PI - 0.3); g.stroke();
          const [cx, cy] = Tc.toPx(R.xc[j], R.zc[j] * ex);
          g.strokeStyle = css('--text'); g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx - 4, cy - 4); g.lineTo(cx + 4, cy + 4); g.moveTo(cx + 4, cy - 4); g.lineTo(cx - 4, cy + 4); g.stroke();
          const sl = cam.dz(R.xc[j]) * ex, L = Math.hypot(sl, 1);
          Tc.arrow(R.xc[j], R.zc[j] * ex, -sl / L * 0.05, 1 / L * 0.05, { color: css('--text-3'), width: 1, head: 4 });
        }
        Tc.text(1.05, 0.24, 'camber ×2.5', { size: 11, align: 'right', color: css('--text-3') });
      } else {
        const bg = bgRgb();
        for (let i = 0; i < R.m; i++) {
          const c = diverging(Math.max(-1, Math.min(1, R.cp[i] > 0 ? R.cp[i] : R.cp[i] / 3)), bg);
          Tc.polyline([[geom.X[i], geom.Y[i]], [geom.X[i + 1], geom.Y[i + 1]]], { strokeStyle: `rgb(${c[0]},${c[1]},${c[2]})`, lineWidth: 5 });
        }
        Tc.polyline(geom.X.map((x, i) => [x, geom.Y[i]]), { strokeStyle: css('--text'), lineWidth: 1 });
        const gm = Math.max(1e-9, ...R.gamma.map(Math.abs)), step = Math.max(1, Math.round(R.m / 50));
        for (let i = 0; i < R.m; i += step) {
          const gmid = 0.5 * (R.gamma[i] + R.gamma[i + 1]), nx = -Math.sin(R.th[i]), ny = Math.cos(R.th[i]);
          Tc.arrow(R.x[i], R.y[i], nx * 0.08 * gmid / gm, ny * 0.08 * gmid / gm, { color: gmid >= 0 ? css('--accent') : css('--lower'), width: 1.2, head: 3.5 });
        }
        if (S.Np <= 60) for (let i = 0; i <= R.m; i++) Tc.dot(geom.X[i], geom.Y[i], 2.2, css('--text'), null);
      }
      Tc.arrow(-0.04, -0.17, 0.12 * Math.cos(S.alpha * D), 0.12 * Math.sin(S.alpha * D), { color: css('--text-2') });
    });
  }
  function drawMatrix() {
    mat.set(({ W, H, g }) => {
      if (!R) return;
      const n = S.method === 'lumped' ? R.N : R.n, M = S.method === 'lumped' ? R.M : R.AN;
      const size = Math.min(W - 20, H - 20), x0 = (W - size) / 2, y0 = (H - size) / 2, c = size / n;
      const vals = M.map(Math.abs).sort((a, b) => a - b), mx = Math.max(1e-12, vals[Math.floor(vals.length * 0.98)]), bg = bgRgb();
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const v = M[i * n + j] / mx, col = diverging(Math.max(-1, Math.min(1, v)), bg);
        g.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; g.fillRect(x0 + j * c, y0 + i * c, Math.ceil(c), Math.ceil(c));
      }
      g.strokeStyle = css('--border-strong'); g.strokeRect(x0, y0, size, size);
      if (n <= 12) { g.font = `10px ${css('--mono')}`; g.fillStyle = css('--text'); g.textAlign = 'center'; g.textBaseline = 'middle'; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) g.fillText(f3(M[i * n + j], 2), x0 + (j + 0.5) * c, y0 + (i + 0.5) * c); }
    });
  }

  build();
  return {
    controls, main, side,
    show() { S.visible = true; main.style.display = 'flex'; update(); },
    hide() { S.visible = false; main.style.display = 'none'; },
    destroy() { fc.destroy(); },
  };
}
