// Airfoil Lab › Joukowski: flow round a circle mapped to an airfoil by z = ζ + 1/ζ. Drag the circle's center in the
// ζ-plane; the airfoil, its streamlines and pressure follow in the z-plane, with the Kutta circulation and exact lift.
import { h, section, field, segmented, toggle } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import { contours } from '../../lib/contour.js';
import * as T from '../../solvers/airfoilTheory.js';
import { FieldCanvas, metricsGrid, card, bound, put, css, diverging, bgRgb } from '../cfd/fieldCommon.js';
import { theoryShell, D, f3 } from './theoryCommon.js';
import { joukConcepts } from './learn.js';

export function joukowskiTab({ setHeader, keep = o => o }) {
  const S = keep({ mx: -0.08, my: 0.08, alpha: 5, color: true, stream: true, kutta: true, visible: false });
  const { controls, main, side, notes } = theoryShell(joukConcepts);
  const metrics = metricsGrid();
  const fz = new FieldCanvas({ height: '330px' }), fzeta = new FieldCanvas({ height: '330px' });
  const zCard = card('Circle plane ζ', 'Flow past a circle: uniform stream, doublet and vortex. Drag the center (dot). The circle always passes through ζ = 1 (the square), which becomes the trailing edge.'); zCard.append(fzeta.el);
  const aCard = card('Airfoil plane z = ζ + 1/ζ', 'The same flow after the mapping. Streamlines map to streamlines; speeds are divided by |dz/dζ|.'); aCard.append(fz.el);
  const pCard = card('Surface pressure', 'Cp on the upper (blue) and lower (red) surfaces, plotted against x along the chord.');
  const plot = new Plot(pCard, { xlabel: 'x/c', ylabel: 'Cp', xname: 'x/c', yname: 'Cp', invertY: true, legendPos: 'above', xfmt: v => v.toFixed(3), yfmt: v => v.toFixed(3) });
  plot.wrap.style.height = '240px';
  main.append(metrics.el, h('div', { class: 'cf-grid2b' }, zCard, aCard), pCard);

  let sMx, sMy;
  function build() {
    const sec = section('Circle'), on = () => update();
    sMx = bound(S, 'mx', 'Center x (thickness)', -0.35, 0.05, { step: 0.002, digits: 3, onInput: on, tip: 'Moving the center left makes the circle bigger than the one through ζ = −1, which gives the airfoil a rounded nose and thickness (t/c ≈ −1.3 x for small x).' });
    sMy = bound(S, 'my', 'Center y (camber)', -0.25, 0.35, { step: 0.002, digits: 3, onInput: on, tip: 'Raising the center bends the airfoil into a circular-arc camber line: a center at height y gives a maximum camber of about y/2 of the chord, and a zero-lift angle of −β.' });
    put(sec.body, sMx, sMy);
    const sf = section('Flow');
    put(sf.body, bound(S, 'alpha', 'Angle of attack α', -10, 20, { step: 0.1, digits: 1, unit: '°', onInput: on }),
      toggle('Kutta condition', S.kutta, v => { S.kutta = v; update(); }, { tip: 'Off: no circulation. The flow then goes round the sharp trailing edge at infinite speed, and the airfoil makes no lift.' }).el,
      toggle('Pressure color', S.color, v => { S.color = v; draw(); }).el, toggle('Streamlines', S.stream, v => { S.stream = v; draw(); }).el);
    controls.replaceChildren(sec.el, sf.el);
  }

  let J = null;
  function update() {
    if (!S.visible) return;
    J = T.joukowski({ mx: S.mx, my: S.my, alpha: S.alpha * D, G: S.kutta ? null : 0 });
    setHeader('Joukowski airfoil', `Center (${f3(S.mx, 3)}, ${f3(S.my, 3)}), α = ${f3(S.alpha, 1)}°`, 'ok', 'Exact potential flow');
    const thin = 2 * Math.PI * (S.alpha * D + J.beta);
    metrics.set([
      { k: 'Lift cl', v: f3(J.cl, 4), s: S.kutta ? `pressure integral: ${f3(J.clPressure, 4)}` : 'no circulation, no lift' },
      { k: 'Circulation Γ/(V∞c)', v: f3(J.G / J.chord, 4), s: S.kutta ? '4πa sin(α + β)/c' : 'Kutta condition off' },
      { k: 'Thickness t/c', v: f3(J.t * 100, 2) + '%', s: `chord ${f3(J.chord, 3)} (circle radius ${f3(J.a, 3)})` },
      { k: 'Zero-lift angle', v: f3(-J.beta / D, 3) + '°', s: 'equals −β, set by the camber' },
      { k: 'Cm about c/4', v: f3(J.cmc4, 4), s: 'pressure integral' },
      { k: 'Thin-airfoil estimate', v: f3(thin, 4), s: `2π(α + β): thickness adds ${f3((J.cl / thin - 1) * 100, 1)}%` },
    ]);
    const up = [], lo = [];
    const le = J.surf.reduce((b, p, i) => p.x < J.surf[b].x ? i : b, 0);
    J.surf.forEach((p, i) => { const q = { x: (p.x - J.xLE) / J.chord, cp: p.cp }; if (i <= le) up.push(q); else lo.push(q); });
    const clip = v => Math.max(-6, Math.min(1.2, v));
    plot.setData({ series: [{ x: up.map(q => q.x), y: up.map(q => clip(q.cp)), color: css('--upper'), label: 'upper', width: 2.2 }, { x: lo.map(q => q.x), y: lo.map(q => clip(q.cp)), color: css('--lower'), label: 'lower', width: 2.2 }], hlines: [{ y: 0, color: css('--text-3') }] });
    draw();
    const N = [];
    N.push({ type: 'i', t: 'Mapping a circle to an airfoil', d: `The flow round the circle is just a uniform stream, a doublet and a vortex. Every point maps through z = ζ + 1/ζ, and the circle becomes an airfoil of ${f3(J.t * 100, 1)}% thickness. The point ζ = 1, where dz/dζ = 0, becomes the cusped trailing edge.` });
    N.push(S.kutta ? { type: 'g', t: 'The Kutta condition fixes the lift', d: `Only one circulation puts the circle's rear stagnation point exactly at ζ = 1, so that the flow leaves the trailing edge smoothly: Γ = 4πV∞a sin(α + β). Then L′ = ρV∞Γ gives cl = ${f3(J.cl, 4)}, and integrating the surface pressure gives the same (${f3(J.clPressure, 4)}).` }
      : { type: 'w', t: 'No circulation: the flow wraps round the trailing edge', d: 'Without circulation the rear stagnation point sits elsewhere on the circle, and the flow turns round the sharp edge at infinite speed. Real flow cannot do that; viscosity sheds a starting vortex and builds up exactly the Kutta circulation.' });
    N.push({ type: 'i', t: 'Thickness raises the lift slope', d: `A Joukowski airfoil's lift slope is 2π(1 + 0.77 t/c) roughly, above thin-airfoil theory's 2π: here ${f3(J.cl / Math.max(1e-6, Math.sin(S.alpha * D + J.beta)) / (2 * Math.PI), 3)}× 2π. Its trailing-edge cusp (zero angle) is unrealistically thin, which the Kármán–Trefftz extension fixes.` });
    notes(N);
  }
  const grid = (fc, plane) => {
    const v = fc.view, nx = Math.min(220, Math.max(100, Math.round(fc.W / 3))), ny = Math.max(60, Math.round(nx * (v.y1 - v.y0) / (v.x1 - v.x0)));
    const psi = new Float64Array(nx * ny), cp = new Float64Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = v.x0 + i * (v.x1 - v.x0) / (nx - 1), y = v.y0 + j * (v.y1 - v.y0) / (ny - 1), k = j * nx + i;
      const zeta = plane === 'z' ? J.inv([x, y]) : [x, y];
      if (Math.hypot(zeta[0] - S.mx, zeta[1] - S.my) < J.a * 0.999) { psi[k] = cp[k] = NaN; continue; }
      psi[k] = J.F(zeta)[1];
      const w = plane === 'z' ? J.Wair(zeta) : J.Wz(zeta);
      cp[k] = 1 - (w[0] * w[0] + w[1] * w[1]);
    }
    return { psi, cp, nx, ny, box: { ...v } };
  };
  function drawPlane(fc, plane) {
    fc.set((g, Tc) => {
      if (!J) return;
      const G = grid(Tc, plane), bg = bgRgb();
      if (S.color) Tc.image(G.cp, G.nx, G.ny, G.box, v => diverging(v > 0 ? v : v / 3, bg));
      if (S.stream) {
        const vals = Array.from(G.psi).filter(isFinite).sort((a, b) => a - b), lo = vals[Math.floor(vals.length * 0.01)], hi = vals[Math.floor(vals.length * 0.99)], d = (hi - lo) / 26;
        const p0 = J.F([1, 0])[1], L = [];
        for (let k = Math.ceil((lo - p0) / d); k <= Math.floor((hi - p0) / d); k++) L.push(p0 + k * d);
        const jump = Math.abs(J.G) > 1e-9 ? Math.abs(J.G) * 0.5 : Infinity;
        for (const s of contours(G.psi, G.nx, G.ny, L, jump)) Tc.segments(s, G.nx, G.ny, G.box, { strokeStyle: css('--text-2'), lineWidth: 1, globalAlpha: 0.85 });
        for (const s of contours(G.psi, G.nx, G.ny, [p0], jump)) Tc.segments(s, G.nx, G.ny, G.box, { strokeStyle: css('--text'), lineWidth: 2 });
      }
      const pts = J.surf.map(p => plane === 'z' ? [p.x, p.y] : p.zeta);
      Tc.polyline([...pts, pts[0]], { strokeStyle: css('--text'), lineWidth: 2.2, fill: css('--bg-sunk') });
      if (plane === 'zeta') {
        const c = []; for (let k = 0; k <= 120; k++) c.push([Math.cos(k * Math.PI / 60), Math.sin(k * Math.PI / 60)]);
        Tc.polyline(c, { strokeStyle: css('--text-3'), lineWidth: 1, dash: [3, 3] });
        Tc.dot(S.mx, S.my, 6, css('--accent'));
        const [px, py] = Tc.toPx(1, 0); g.fillStyle = css('--warn'); g.fillRect(px - 5, py - 5, 10, 10);
        Tc.dot(-1, 0, 3, css('--text-3'), null);
        Tc.text(S.mx, S.my, 'center', { size: 11, dx: 10, dy: -10, tag: true });
      }
      Tc.arrow(Tc.view.x0 + 0.25, Tc.view.y1 - 0.3, 0.45 * Math.cos(S.alpha * D), 0.45 * Math.sin(S.alpha * D), { color: css('--text') });
    });
  }
  function draw() {
    fzeta.setBox({ x0: -2, x1: 2, y0: -1.6, y1: 1.6 });
    fz.setBox({ x0: -2.6, x1: 2.6, y0: -1.4, y1: 1.4 });
    drawPlane(fzeta, 'zeta'); drawPlane(fz, 'z');
  }
  fzeta.on({
    down(p) {
      if (fzeta.pxDist([S.mx, S.my], p) > 14) return null;
      return q => { S.mx = Math.max(-0.35, Math.min(0.05, Math.round(q[0] * 500) / 500)); S.my = Math.max(-0.25, Math.min(0.35, Math.round(q[1] * 500) / 500)); sMx.set(S.mx); sMy.set(S.my); update(); };
    },
    hover(p) { return fzeta.pxDist([S.mx, S.my], p) < 14 ? 'grab' : 'default'; },
  });

  build();
  return {
    controls, main, side,
    show() { S.visible = true; main.style.display = 'flex'; update(); },
    hide() { S.visible = false; main.style.display = 'none'; },
    destroy() { fz.destroy(); fzeta.destroy(); },
  };
}
