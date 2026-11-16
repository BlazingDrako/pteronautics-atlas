// Blade design: velocity triangles from hub to tip under a free-vortex or constant-reaction law (radial
// equilibrium), degree of reaction, impulse vs 50%-reaction turbines, total-to-static vs total-to-total efficiency,
// and turbine blade cooling and centrifugal stress against material limits.
import { h, section, cssVar } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import * as T from '../../solvers/turboDesign.js';
import { bound, boundSeg, boundSelect, metricsGrid, insightsList, card, put, canvasBox } from './common.js';
import { table } from '../../lib/tabbed.js';

const D = T.DEG;
const deg = r => (r / D).toFixed(1) + '°';

export function bladeTab({ keep = o => o } = {}) {
  const S = keep({ kind: 'comp', phi: 0.5, psi: 0.4, R: 0.5, Um: 330, hubTip: 0.55, law: 'free', etaTT: 0.9, rm: 0.3,
    Tg: 1700, Tc: 800, Tm: 1150, cool: 'film', mat: 'sx', rhoFrac: 1 });
  const controls = h('div'), main = h('div', { class: 'cf-main-inner' });
  const metrics = metricsGrid();
  const tri = canvasBox('cf-chart', '360px');
  const triCard = card('Velocity triangles at hub, mean and tip', 'Absolute velocity C (blue), relative velocity W (red) and blade speed U (gray) at rotor inlet (solid) and exit (dashed), drawn to the same scale at all three radii, with magnitudes and angles (from axial) listed under each. Blade speed grows with radius while the swirl follows the vortex law, so the triangles, and the blade angles, change along the span: the blade must be twisted.');
  triCard.append(tri.el);
  const aCard = card('Blade angles along the span', 'Relative flow angles (rotor metal angles) and absolute angles (stator) against radius. The difference between hub and tip is the blade twist.');
  const aPlot = new Plot(aCard, { xlabel: 'r / r_mean', ylabel: 'angle from axial (°)', xname: 'r/rm', yname: 'angle', xfmt: v => v.toFixed(3), yfmt: v => v.toFixed(1) + '°', legendPos: 'bottom' });
  const rCard = card('Degree of reaction along the span', 'Free vortex: R(r) = 1 − (1 − R_m)(r_m/r)². Reaction falls toward the hub, and a negative hub reaction means the rotor hub works backwards (static pressure falls across a compressor rotor, rises across a turbine rotor). A constant-reaction design avoids this, but strictly needs the axial velocity to vary along the span to stay in radial equilibrium (taken as uniform here).');
  const rPlot = new Plot(rCard, { xlabel: 'r / r_mean', ylabel: 'reaction R', xname: 'r/rm', yname: 'R', xfmt: v => v.toFixed(3), yfmt: v => v.toFixed(3) });
  const wCard = card('Turbine work vs reaction (zero exit swirl)', 'For the last stage, exit swirl is wasted, so α₃ = 0. Then ψ = Δh₀/U² = 2(1 − R): an impulse stage (R = 0) does twice the work of a 50% reaction stage at the same blade speed, but its higher velocities make it less efficient.');
  const wPlot = new Plot(wCard, { xlabel: 'degree of reaction R', ylabel: 'ψ = Δh₀/U²  ·  α₂/90°', xname: 'R', yname: '', xfmt: v => v.toFixed(2), yfmt: v => v.toFixed(3), legendPos: 'bottom' });
  const cCard = card('Turbine blade cooling', 'Holland–Thake: coolant fraction m_c/m_g = K·ε/(1 − ε) with cooling effectiveness ε = (T_g − T_m)/(T_g − T_c). Each cooling technology has a smaller K. Coolant is bled from the compressor exit, so every percent costs cycle efficiency.');
  const cPlot = new Plot(cCard, { xlabel: 'turbine gas temperature (K)', ylabel: 'coolant / gas flow (%)', xname: 'Tg', yname: 'mc/mg', xfmt: v => v.toFixed(0) + ' K', yfmt: v => v.toFixed(2) + '%', legendPos: 'bottom' });
  const mCard = card('Blade stress vs material', 'Specific strength σ/ρ (approximate 1000-hour creep rupture) falls steeply with temperature. The dot is the centrifugal root stress of this rotor blade at the allowable metal temperature: it must sit below the curve of its material.');
  const mPlot = new Plot(mCard, { xlabel: 'metal temperature (K)', ylabel: 'σ/ρ (kN·m/kg)', xname: 'T', yname: 'σ/ρ', xfmt: v => v.toFixed(0) + ' K', yfmt: v => v.toFixed(1), legendPos: 'bottom' });
  for (const p of [aPlot, rPlot, wPlot, cPlot, mPlot]) p.wrap.style.height = '240px';
  const tabEl = h('div'); const tCard = card('Hub, mean and tip', ''); tCard.append(tabEl);
  const insCard = card('Notes'); const insEl = h('div'); insCard.append(insEl);
  main.append(metrics.el, triCard, tCard, h('div', { class: 'cf-grid2b' }, aCard, rCard), h('div', { class: 'cf-grid2b' }, wCard, insCard), h('div', { class: 'cf-grid2b' }, cCard, mCard));

  const build = () => {
    const s0 = section('Stage');
    put(s0.body,
      boundSeg(S, 'kind', 'Machine', [{ value: 'comp', label: 'Axial compressor' }, { value: 'turb', label: 'Axial turbine' }], () => { if (S.kind === 'turb') Object.assign(S, { phi: 0.6, psi: 1.6, R: 0.5, Um: 380, hubTip: 0.75 }); else Object.assign(S, { phi: 0.5, psi: 0.4, R: 0.5, Um: 330, hubTip: 0.55 }); build(); run(); }),
      bound(S, 'phi', 'Flow coefficient φ = Cx/U', 0.3, 1.0, { step: 0.005, digits: 3, onInput: run }),
      bound(S, 'psi', 'Loading ψ = Δh₀/U²', 0.15, S.kind === 'comp' ? 0.7 : 3, { step: 0.005, digits: 3, onInput: run }),
      bound(S, 'R', 'Reaction at mean radius R_m', 0, 1, { step: 0.01, digits: 2, onInput: run, tip: 'Fraction of the stage static enthalpy change that happens in the rotor. 0.5 gives symmetric triangles.' }),
      bound(S, 'Um', 'Mean blade speed U_m', 100, 600, { step: 1, digits: 0, unit: 'm/s', onInput: run }),
      bound(S, 'hubTip', 'Hub/tip radius ratio', 0.3, 0.95, { step: 0.01, digits: 2, onInput: run, tip: 'Long blades (low ratio) at the front of a compressor; short blades at the back and in turbines.' }),
      boundSeg(S, 'law', 'Vortex law', [{ value: 'free', label: 'Free vortex (r·Cθ = const)' }, { value: 'const', label: 'Constant reaction' }], run, 'Free vortex satisfies radial equilibrium with uniform axial velocity and gives the same work at every radius.'),
      bound(S, 'etaTT', 'Total-to-total efficiency', 0.7, 0.98, { step: 0.005, digits: 3, onInput: run }));
    const s1 = section('Cooling and stress (turbine)');
    put(s1.body,
      bound(S, 'Tg', 'Gas temperature', 1000, 2200, { step: 5, digits: 0, unit: 'K', onInput: run }),
      bound(S, 'Tc', 'Coolant temperature (compressor exit)', 500, 1000, { step: 5, digits: 0, unit: 'K', onInput: run }),
      bound(S, 'Tm', 'Allowable metal temperature', 900, 1600, { step: 5, digits: 0, unit: 'K', onInput: run }),
      boundSelect(S, 'cool', 'Cooling method', Object.entries(T.COOLING).map(([value, c]) => ({ value, label: c.label })), run),
      boundSelect(S, 'mat', 'Blade material', Object.entries(T.BLADE_MATERIALS).map(([value, m]) => ({ value, label: m.label })), run),
      bound(S, 'rm', 'Mean radius', 0.05, 1, { step: 0.005, digits: 3, unit: 'm', onInput: run, tip: 'With U_m this sets the shaft speed for the stress estimate.' }));
    controls.replaceChildren(s0.el, s1.el);
  };

  function run() {
    const Z = T.spanTriangles(S), c = n => cssVar(n), comp = S.kind === 'comp';
    const rows = [['hub', Z.hub], ['mean', Z.mean], ['tip', Z.tip]];
    tabEl.replaceChildren(comp
      ? table(['', 'U m/s', 'α₁', 'α₂', 'β₁', 'β₂', 'R', 'W₂/W₁ (de Haller)'], rows.map(([n, z]) => ({ cells: [n, z.U.toFixed(0), deg(z.a1), deg(z.a2), deg(z.b1), deg(z.b2), z.R.toFixed(3), z.deHaller.toFixed(3)], hl: z.R < 0 || z.deHaller < 0.72 })))
      : table(['', 'U m/s', 'α₂', 'α₃', 'β₂', 'β₃', 'R', 'rotor turning'], rows.map(([n, z]) => ({ cells: [n, z.U.toFixed(0), deg(z.a2), deg(z.a3), deg(z.b2), deg(z.b3), z.R.toFixed(3), deg(z.turn)], hl: z.R < 0 }))));
    const xs = Z.span.map(z => z.x);
    const angs = comp ? [['β₁', 'b1', '--lower'], ['β₂', 'b2', '--lower', [5, 4]], ['α₁', 'a1', '--upper'], ['α₂', 'a2', '--upper', [5, 4]]] : [['β₂', 'b2', '--lower'], ['β₃', 'b3', '--lower', [5, 4]], ['α₂', 'a2', '--upper'], ['α₃', 'a3', '--upper', [5, 4]]];
    aPlot.setData({ series: angs.map(([l, k, col, dash]) => ({ x: xs, y: Z.span.map(z => z[k] / D), color: c(col), dash, label: l })) });
    rPlot.setData({ series: [{ x: xs, y: Z.span.map(z => z.R), color: c('--good'), label: 'R' }], hlines: [{ y: 0, color: c('--bad'), label: 'R = 0', labelAt: 0 }] });
    const Rs = []; for (let r = 0; r <= 1.0001; r += 0.02) Rs.push(r);
    wPlot.setData({ series: [{ x: Rs, y: Rs.map(T.zeroSwirlPsi), color: c('--upper'), label: 'ψ (zero exit swirl)' }, { x: Rs, y: Rs.map(r => T.zeroSwirlAlpha2(r, S.phi) / (90 * D)), color: c('--lower'), label: 'nozzle angle α₂ / 90°' }],
      vlines: [{ x: 0, color: c('--text-3') }, { x: 0.5, color: c('--text-3') }] });
    // efficiencies
    const dh0 = S.psi * S.Um ** 2, Cexit = comp ? Z.mean.C1 : Z.mean.C3, ets = T.etaTS(S.etaTT, dh0, Cexit);
    // cooling
    const cf = T.coolingFlow(S.cool, S.Tg, S.Tm, S.Tc);
    const Tgs = []; for (let t = 1100; t <= 2200; t += 10) Tgs.push(t);
    cPlot.setData({ series: Object.entries(T.COOLING).filter(([k]) => k !== 'none').map(([k, m], i) => ({ x: Tgs, y: Tgs.map(t => { const f = T.coolingFlow(k, t, S.Tm, S.Tc).frac * 100; return f > 30 ? NaN : f; }), color: c(['--upper', '--lower', '--good'][i]), label: m.label })),
      vlines: [{ x: S.Tg, color: c('--text-3') }, { x: S.Tm, color: c('--warn') }] });
    cPlot.setOpts({ yZero: true });
    // stress
    const rm = S.rm, rt = rm * Z.rt, rh = rm * Z.rh, rpm = S.Um / rm * 30 / Math.PI;
    const mat = T.BLADE_MATERIALS[S.mat], st = T.bladeStress({ rpm, rt, rh, rho: mat.rho });
    const Ts = []; for (let t = 300; t <= 1750; t += 10) Ts.push(t);
    mPlot.setData({ series: [...Object.entries(T.BLADE_MATERIALS).map(([k, m], i) => ({ x: Ts, y: Ts.map(t => { const s = T.strength(k, t) / m.rho / 1000; return s > 0 ? s : NaN; }), color: c(['--text-3', '--upper', '--turb', '--lower', '--good'][i]), label: m.label.split(' (')[0], width: k === S.mat ? 2.6 : 1.4 })),
      { x: [S.Tm], y: [st.sOverRho / 1000], color: c('--text'), line: false, points: true, pointSize: 5, noLegend: true, extra: () => `σ ${(st.sigma / 1e6).toFixed(0)} MPa at ${rpm.toFixed(0)} rpm` }] });
    const allow = T.strength(S.mat, S.Tm);
    metrics.set([
      { k: 'Stage work', v: (dh0 / 1000).toFixed(1) + ' kJ/kg', s: `ΔT₀ ${(dh0 / (comp ? 1005 : 1150)).toFixed(1)} K` },
      { k: 'Blade twist', v: comp ? deg(Z.hub.b1 - Z.tip.b1) : deg(Z.tip.b3 - Z.hub.b3), s: comp ? 'rotor inlet angle, hub → tip' : 'rotor exit angle, tip → hub' },
      { k: 'Reaction at hub', v: Z.hub.R.toFixed(3), s: `tip ${Z.tip.R.toFixed(3)}`, cls: Z.hub.R < 0 ? 'bad' : '' },
      { k: 'Efficiency (tt → ts)', v: `${(S.etaTT * 100).toFixed(1)}% → ${(ets * 100).toFixed(1)}%`, s: `exit kinetic energy ${(Cexit ** 2 / 2000).toFixed(1)} kJ/kg`, tip: 'Total-to-static counts the exit kinetic energy as lost (a power-plant turbine exhausting to a stack); total-to-total counts it as useful (it goes on to the next stage or the nozzle), which is the right measure in an aircraft engine.' },
      { k: 'Coolant flow', v: isFinite(cf.frac) ? (cf.frac * 100).toFixed(2) + '%' : 'impossible', s: `cooling effectiveness ε ${cf.eps.toFixed(3)}`, cls: !isFinite(cf.frac) ? 'bad' : '' },
      { k: 'Root stress', v: (st.sigma / 1e6).toFixed(0) + ' MPa', s: `allowable ${(allow / 1e6).toFixed(0)} MPa at ${S.Tm} K; tip ${st.Ut.toFixed(0)} m/s`, cls: st.sigma > allow ? 'bad' : '' },
    ]);
    const L = [];
    if (Z.hub.R < 0) L.push({ type: 'w', t: 'Negative reaction at the hub', d: comp ? 'The rotor hub would accelerate the relative flow (acting like a turbine). Raise R_m, the hub/tip ratio, or use a constant-reaction design.' : 'The relative flow decelerates at the turbine hub, risking separation. Raise R_m or the hub/tip ratio.' });
    if (comp && Math.min(Z.hub.deHaller, Z.mean.deHaller, Z.tip.deHaller) < 0.72) L.push({ type: 'w', t: 'de Haller limit', d: 'W₂/W₁ below 0.72 somewhere along the span: the rotor diffuses too much and the boundary layer will separate.' });
    L.push({ type: 'i', t: 'Free vortex and radial equilibrium', d: 'Swirling flow needs a pressure gradient ∂p/∂r = ρCθ²/r to stay on its stream surface. With r·Cθ constant and uniform axial velocity, this is satisfied exactly and every radius does the same work.' });
    L.push({ type: 'i', t: 'Impulse vs reaction', d: `Impulse stages (R = 0) take the whole pressure drop in the nozzle and turn the flow hard in the rotor: ψ = 2 per stage, used where few stages are wanted (turbopumps, HP turbines). 50% reaction stages (ψ = 1) have lower velocities and losses.` });
    if (!isFinite(cf.frac)) L.push({ type: 'b', t: 'Blade cannot be held at the allowable temperature', d: 'Without cooling the metal reaches the gas temperature. Pick a cooling method or a better material.' });
    if (st.sigma > allow) L.push({ type: 'b', t: 'Blade would creep', d: `Root stress ${(st.sigma / 1e6).toFixed(0)} MPa exceeds the ${(allow / 1e6).toFixed(0)} MPa ${mat.label.split(' (')[0]} can carry at ${S.Tm} K for 1000 h. Lower the blade speed, shorten the blade or run the metal cooler.` });
    insightsList(insEl, L);
    drawTriangles(Z);
  }
  function drawTriangles(Z) {
    tri.set(({ W, H, g }) => {
      const comp = S.kind === 'comp', st = [['hub', Z.hub], ['mean', Z.mean], ['tip', Z.tip]];
      // inlet (solid) and exit (dashed) triangles share the blade speed U; Cθ is positive with rotation
      const setsOf = z => comp
        ? [{ ct: z.Ct1, dash: null, n: '1', C: z.C1, Wr: z.W1, a: z.a1, b: z.b1 }, { ct: z.Ct2, dash: [5, 4], n: '2', C: z.C2, Wr: z.W2, a: z.a2, b: z.b2 }]
        : [{ ct: z.Ct2, dash: null, n: '2', C: z.C2, Wr: z.W2, a: z.a2, b: z.b2 }, { ct: -z.Ct3, dash: [5, 4], n: '3', C: z.C3, Wr: z.W3, a: z.a3, b: z.b3 }];
      const ext = z => { const xs = setsOf(z).flatMap(q => [0, q.ct, q.ct - z.U]); return [Math.min(...xs), Math.max(...xs)]; };
      // wide card: three columns (triangle above its values); narrow card: one row per radius (values to the right)
      const rows = W / 3 < 230, colW = rows ? W * 0.56 : W / 3, top = 22, listH = 5 * 15 + 22;
      const sc = Math.min(...st.map(([, z]) => { const [a, b] = ext(z); return (colW - 40) / (b - a); }), (rows ? 150 : 240) / Z.Cx);
      const triH = Z.Cx * sc, rowH = Math.max(triH + 46, 5 * 15 + 30);
      // size the canvas to the drawing
      const want = Math.round(rows ? 3 * rowH + 36 : top + 18 + triH + 26 + listH);
      if (Math.abs(want - H) > 2) { tri.el.style.height = want + 'px'; return; }
      const ink = cssVar('--text'), cU = cssVar('--text-3'), cC = cssVar('--upper'), cW = cssVar('--lower');
      const arrow = (x0, y0, x1, y1, col, dash) => { g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2; g.setLineDash(dash || []); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.setLineDash([]); const a = Math.atan2(y1 - y0, x1 - x0); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - 7 * Math.cos(a - 0.4), y1 - 7 * Math.sin(a - 0.4)); g.lineTo(x1 - 7 * Math.cos(a + 0.4), y1 - 7 * Math.sin(a + 0.4)); g.fill(); };
      // short name at the middle of a vector, pushed away from the triangle's center
      const tag = (x0, y0, x1, y1, cx, cy, text, col, t = 0.5) => {
        const mx = x0 + (x1 - x0) * t, my = y0 + (y1 - y0) * t, L = Math.hypot(x1 - x0, y1 - y0) || 1;
        let nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
        if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
        g.font = '600 11px ' + cssVar('--font'); g.textAlign = 'center'; g.textBaseline = 'middle';
        const tx = mx + nx * 11, ty = my + ny * 11, w = g.measureText(text).width + 6;
        g.fillStyle = cssVar('--bg-elev'); g.globalAlpha = 0.85; g.fillRect(tx - w / 2, ty - 7, w, 14); g.globalAlpha = 1;
        g.fillStyle = col; g.fillText(text, tx, ty);
      };
      st.forEach(([name, z], i) => {
        const [mn, mx] = ext(z), cxCol = rows ? colW / 2 : colW * (i + 0.5);
        const rowTop = rows ? i * rowH : 0;
        const ox = cxCol - (mn + mx) / 2 * sc, oy = rowTop + top + 18, Cx = triH;
        g.fillStyle = ink; g.font = '600 12px ' + cssVar('--font'); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        g.fillText(`${name} · r/r_m ${z.x.toFixed(2)}`, cxCol, rowTop + top + 4);
        if (rows && i > 0) { g.strokeStyle = cssVar('--border'); g.lineWidth = 1; g.beginPath(); g.moveTo(8, rowTop + 4); g.lineTo(W - 8, rowTop + 4); g.stroke(); }
        const sets = setsOf(z);
        for (const q of sets) {
          arrow(ox, oy, ox + q.ct * sc, oy + Cx, cC, q.dash);
          arrow(ox, oy, ox + (q.ct - z.U) * sc, oy + Cx, cW, q.dash);
        }
        // one U arrow per triangle base
        for (const q of sets) arrow(ox + (q.ct - z.U) * sc, oy + Cx, ox + q.ct * sc, oy + Cx, cU, q.dash);
        const ccx = ox + (sets[0].ct + sets[1].ct - z.U) / 2 * sc, ccy = oy + Cx * 0.66;
        // inlet labels at mid-length, exit labels further along so near-parallel vectors don't collide
        sets.forEach((q, k) => {
          const t = k ? 0.78 : 0.42;
          tag(ox, oy, ox + q.ct * sc, oy + Cx, ccx, ccy, 'C' + q.n, cC, t);
          tag(ox, oy, ox + (q.ct - z.U) * sc, oy + Cx, ccx, ccy, 'W' + q.n, cW, t);
        });
        g.font = '600 11px ' + cssVar('--font'); g.fillStyle = cU; g.textAlign = 'center'; g.textBaseline = 'top';
        g.fillText('U', ox + (sets[0].ct - z.U / 2) * sc, oy + Cx + 6);
        // value list
        g.font = '11px ' + cssVar('--mono'); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
        const x0 = rows ? colW + 8 : cxCol - Math.min(colW / 2 - 8, 92);
        let y = rows ? rowTop + top + 18 : oy + Cx + 36;
        const line = (col, text) => { g.fillStyle = col; g.fillText(text, x0, y); y += 15; };
        for (const q of sets) {
          line(cC, `C${q.n} ${q.C.toFixed(0).padStart(4)} m/s  α${q.n} ${(q.a / D).toFixed(1)}°`);
          line(cW, `W${q.n} ${q.Wr.toFixed(0).padStart(4)} m/s  β${q.n} ${(q.b / D).toFixed(1)}°`);
        }
        line(cU, `U  ${z.U.toFixed(0).padStart(4)} m/s  R ${z.R.toFixed(2)}`);
      });
      g.fillStyle = cssVar('--text-3'); g.font = '11px ' + cssVar('--font'); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText('axial ↓  rotation →  · solid: inlet  · dashed: exit  · Cx ' + Z.Cx.toFixed(0) + ' m/s', 8, H - 6);
    });
  }
  build();
  return { controls, main, show() { run(); } };
}
