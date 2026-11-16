// Fluid Flow Sandbox › Potential flow: superpose uniform streams, sources, sinks, vortices and doublets (drag them in
// the picture), optionally above a ground plane by the method of images, or type a complex potential F(z) directly.
// Streamlines are contours of ψ = Im F, equipotentials of φ = Re F, the color is Cp = 1 − |W|²/U∞² (or speed).
import { h, section, select, field, segmented, toggle } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import { contours } from '../../lib/contour.js';
import * as Fl from '../../solvers/flow.js';
import { FieldCanvas, colorBar, diverging, sequential, bgRgb, metricsGrid, insightsList, card, bound, put, css, fmt, PI, DEG } from './fieldCommon.js';

const TYPES = {
  uniform: { label: 'Stream', make: () => ({ type: 'uniform', U: 1, alpha: 0 }) },
  source: { label: 'Source', make: () => ({ type: 'source', x: -1, y: 0.5, m: 2 * PI }) },
  sink: { label: 'Sink', make: () => ({ type: 'source', x: 1, y: 0.5, m: -2 * PI }) },
  vortex: { label: 'Vortex', make: () => ({ type: 'vortex', x: 0, y: 1, G: -2 * PI }) },
  doublet: { label: 'Doublet', make: () => ({ type: 'doublet', x: 0, y: 0, k: 2 * PI, beta: 0 }) },
};
const NAMES = { uniform: 'Uniform stream', source: 'Source', vortex: 'Vortex', doublet: 'Doublet' };
const clone = o => JSON.parse(JSON.stringify(o));

export function potentialTab({ keep = o => o, query = null } = {}) {
  const P0 = Fl.POT_PRESETS[1];
  const S = keep({
    mode: 'elements', preset: P0.id, elements: clone(P0.elements), ground: !!P0.ground,
    exprPreset: 'spin', expr: Fl.EXPR_PRESETS[1].expr, params: { ...Fl.EXPR_PRESETS[1].params },
    color: 'cp', stream: true, equi: false, particles: true, stag: true, vectors: false, probe: [1.6, 0.9],
  });
  const qp = query && query.get('p'), qpre = qp && Fl.POT_PRESETS.find(p => p.id === qp);
  if (qpre) { S.mode = 'elements'; S.preset = qpre.id; S.elements = clone(qpre.elements); S.ground = !!qpre.ground; }
  const controls = h('div'), main = h('div', { class: 'cf-main-inner' });
  const metrics = metricsGrid();
  const fc = new FieldCanvas();
  const vCard = card('Flow field', 'Drag the sources, vortices and doublets (the small markers). Click anywhere to move the probe. Solid lines: streamlines (ψ = const); thick: the dividing streamline through the stagnation points (white dots); dashed: equipotentials (φ = const).');
  vCard.append(fc.el);
  const pCard = card('Surface pressure', '');
  const plot = new Plot(pCard, { xlabel: '', ylabel: 'Cp', yname: 'Cp', invertY: true, legendPos: 'above' });
  plot.wrap.style.height = '250px';
  const probeCard = card('Probe', 'Values at the probe point (the ring). Click or drag in the picture to move it.');
  const probeEl = h('div', { class: 'cf-res' }); probeCard.append(probeEl);
  const insCard = card('Notes'); const insEl = h('div'); insCard.append(insEl);
  main.append(metrics.el, vCard, h('div', { class: 'cf-grid2b' }, pCard, probeCard), insCard);

  // ---------------- controls ----------------
  let flow = null, err = null, preset = () => Fl.POT_PRESETS.find(p => p.id === S.preset);
  const listEl = h('div', { class: 'fl-elements' });
  const exprIn = h('input', { class: 'text-input', value: S.expr, spellcheck: 'false', 'aria-label': 'Complex potential F(z)', style: { fontFamily: 'var(--mono)' } });
  const exprErr = h('div', { class: 'hint' });
  const paramsEl = h('div');
  const modeSeg = segmented([{ value: 'elements', label: 'Elements' }, { value: 'expr', label: 'Type F(z)' }], S.mode, v => { S.mode = v; build(); schedule(); });
  modeSeg.el.classList.add('seg-wrap');

  function build() {
    const sec = section('Flow');
    put(sec.body, field('Build the flow from', modeSeg.el));
    if (S.mode === 'elements') {
      const groups = [...new Set(Fl.POT_PRESETS.map(p => p.group))];
      const ps = select([{ value: '', label: 'Your own flow' }, ...groups.map(g => ({ group: g, items: Fl.POT_PRESETS.filter(p => p.group === g).map(p => ({ value: p.id, label: p.label })) }))], S.preset, v => {
        if (!v) return; const p = Fl.POT_PRESETS.find(q => q.id === v);
        S.preset = v; S.elements = clone(p.elements); S.ground = !!p.ground; build(); schedule();
      });
      const add = h('div', { class: 'row fl-add' }, ...Object.entries(TYPES).map(([k, t]) => {
        const b = h('button', { type: 'button', class: 'btn sm' }, '+ ' + t.label);
        b.addEventListener('click', () => { if (k === 'uniform' && S.elements.some(e => e.type === 'uniform')) return; S.elements.push(t.make()); S.preset = ''; build(); schedule(); });
        return b;
      }));
      put(sec.body, field('Preset', ps, preset() ? preset().note : 'Your own combination. Add elements below and drag them in the picture.'),
        toggle('Ground plane at y = 0 (images)', S.ground, v => { S.ground = v; S.preset = ''; build(); schedule(); }, { tip: 'Adds a mirror image of every source, vortex and doublet below y = 0, which makes y = 0 a streamline: a solid wall. Images of sources have the same sign; images of vortices the opposite sign.' }).el,
        add);
      buildList();
      put(sec.body, listEl);
    } else {
      const ps = select(Fl.EXPR_PRESETS.map(p => ({ value: p.id, label: p.label })), S.exprPreset, v => {
        const p = Fl.EXPR_PRESETS.find(q => q.id === v); S.exprPreset = v; S.expr = p.expr; S.params = { ...p.params }; exprIn.value = p.expr; build(); schedule();
      });
      put(sec.body, field('Example', ps),
        field('F(z) = φ + iψ', exprIn, 'Any analytic function of z = x + iy. Use + − * / ^, sqrt, exp, log, sin, cos, sinh, cosh, tan, i and pi. Names other than z become parameters with sliders. log(z) has a branch cut along the negative x-axis; the contours skip it.'),
        exprErr, paramsEl);
      buildParams();
    }
    const sv = section('View');
    const col = segmented([{ value: 'cp', label: 'Cp' }, { value: 'speed', label: 'Speed' }, { value: 'none', label: 'None' }], S.color, v => { S.color = v; schedule(); });
    col.el.classList.add('seg-wrap');
    put(sv.body, field('Color', col.el, 'Cp = 1 − (V/U∞)²: red is high pressure (stagnation, Cp = 1), blue is suction. Speed is |V|/U∞.'),
      toggle('Streamlines ψ', S.stream, v => { S.stream = v; schedule(); }).el,
      toggle('Equipotentials φ', S.equi, v => { S.equi = v; schedule(); }, { tip: 'Lines of constant velocity potential. They cross the streamlines at right angles everywhere except at stagnation points.' }).el,
      toggle('Particles', S.particles, v => { S.particles = v; loop(); }).el,
      toggle('Velocity arrows', S.vectors, v => { S.vectors = v; schedule(); }).el,
      toggle('Stagnation points', S.stag, v => { S.stag = v; schedule(); }).el);
    controls.replaceChildren(sec.el, sv.el);
  }
  function buildList() {
    listEl.replaceChildren(...S.elements.map((e, i) => {
      const rm = h('button', { type: 'button', class: 'btn sm ghost', title: 'Remove' }, '×');
      rm.addEventListener('click', () => { S.elements.splice(i, 1); S.preset = ''; buildList(); schedule(); });
      const on = () => { S.preset = ''; schedule(); };
      const where = e.type === 'uniform' ? '' : ` at (${fmt(e.x, 2)}, ${fmt(e.y, 2)})`;
      const head = h('div', { class: 'fl-el-head' }, h('span', { class: 'fl-el-dot fl-' + e.type + (e.type === 'source' && e.m < 0 ? ' sink' : '') }), h('b', {}, e.type === 'source' && e.m < 0 ? 'Sink' : NAMES[e.type]), h('span', { class: 'hint', style: { margin: 0 } }, where), rm);
      const body = [];
      if (e.type === 'uniform') body.push(bound(e, 'U', 'Speed U∞', 0, 3, { step: 0.01, digits: 2, onInput: on }), bound(e, 'alpha', 'Angle α', -45, 45, { step: 0.5, digits: 1, unit: '°', scale: DEG, onInput: on, tip: 'Direction of the stream. Above a ground plane keep it at 0, or the wall would have flow through it.' }));
      if (e.type === 'source') body.push(bound(e, 'm', 'Strength m (negative: sink)', -20, 20, { step: 0.05, digits: 2, onInput: () => { on(); head.children[1].textContent = e.m < 0 ? 'Sink' : 'Source'; }, tip: 'Volume flow per unit depth leaving the point (m²/s). φ = (m/2π) ln r, ψ = (m/2π) θ: radial streamlines, speed m/(2πr).' }));
      if (e.type === 'vortex') body.push(bound(e, 'G', 'Circulation Γ (counter-clockwise +)', -40, 40, { step: 0.05, digits: 2, onInput: on, tip: 'φ = (Γ/2π) θ, ψ = −(Γ/2π) ln r: circular streamlines, speed Γ/(2πr). In a stream from the left, a clockwise vortex (Γ < 0) lifts: L′ = −ρU∞Γ.' }));
      if (e.type === 'doublet') body.push(bound(e, 'k', 'Strength κ', 0, 40, { step: 0.05, digits: 2, onInput: on, tip: 'A source and sink brought together with κ = m·d fixed. In a stream U∞, κ = 2πU∞R² makes a cylinder of radius R.' }), bound(e, 'beta', 'Axis β', -180, 180, { step: 1, digits: 0, unit: '°', scale: DEG, onInput: on }));
      e._head = head;
      return h('div', { class: 'fl-el' }, head, ...body);
    }));
  }
  function buildParams() {
    paramsEl.replaceChildren(...Object.keys(S.params).map(k => bound(S.params, k, k, k === 'n' ? 0.2 : -10, k === 'n' ? 4 : 10, { step: 0.01, digits: 2, onInput: () => schedule() })));
  }
  exprIn.addEventListener('change', () => {
    S.expr = exprIn.value.trim();
    for (let k = 0; k < 6; k++) {
      try { Fl.potentialFlow({ expr: S.expr, params: S.params }); break; } catch (e) {
        const m = /Unknown name "(\w+)"/.exec(e.message); if (!m) break; S.params[m[1]] = 1;
      }
    }
    for (const k of Object.keys(S.params)) if (!new RegExp('\\b' + k + '\\b').test(S.expr)) delete S.params[k];
    buildParams(); schedule();
  });

  // ---------------- compute and draw ----------------
  let grid = null, stag = [], box = null, cut = { psi: Infinity, phi: Infinity };
  const boxFor = () => (S.mode === 'elements' && S.ground) ? { x0: -3.2, x1: 3.2, y0: 0, y1: 3.4, ground: true } : { x0: -3.2, x1: 3.2, y0: -2.2, y1: 2.2 };
  const bodyCircle = () => S.mode === 'elements' && preset() && preset().circle ? preset().circle : (S.mode === 'expr' && /R\^2\/z/.test(S.expr) && S.params.R ? { x: 0, y: 0, R: Math.abs(S.params.R) } : null);
  function compute() {
    err = null;
    try {
      flow = S.mode === 'elements' ? Fl.potentialFlow({ elements: S.elements, ground: S.ground }) : Fl.potentialFlow({ expr: S.expr, params: S.params, uref: S.params.U ? Math.abs(S.params.U) : undefined });
    } catch (e) { err = e.message; flow = null; }
    exprErr.textContent = S.mode === 'expr' ? (err ? 'Cannot read F(z): ' + err : 'Parameters: ' + (Object.keys(S.params).join(', ') || 'none')) : '';
    exprErr.style.color = err ? 'var(--bad)' : '';
    if (!flow) return;
    fc.setBox(boxFor()); fc.layout();
    box = { ...fc.view }; if (S.mode === 'elements' && S.ground) box.y0 = 0;
    const nx = Math.min(260, Math.max(120, Math.round(fc.W / 4))), ny = Math.max(60, Math.round(nx * (box.y1 - box.y0) / (box.x1 - box.x0)));
    grid = Fl.sampleGrid(flow, box, nx, ny);
    const c = bodyCircle();
    if (c) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = box.x0 + i * (box.x1 - box.x0) / (nx - 1), y = box.y0 + j * (box.y1 - box.y0) / (ny - 1);
      if (Math.hypot(x - c.x, y - c.y) < c.R * 0.995) { const k = j * nx + i; grid.cp[k] = grid.spd[k] = NaN; if (S.color !== 'none') { grid.psi[k] = grid.phi[k] = NaN; } }
    }
    stag = Fl.stagnationPoints(flow, box);
    const ms = S.mode === 'elements' ? S.elements.filter(e => e.type === 'source' && e.m).map(e => Math.abs(e.m)) : [];
    const gs = S.mode === 'elements' ? S.elements.filter(e => e.type === 'vortex' && e.G).map(e => Math.abs(e.G)) : [];
    cut = { psi: ms.length ? 0.5 * Math.min(...ms) : Infinity, phi: gs.length ? 0.5 * Math.min(...gs) : Infinity };
  }

  const levelsFor = (F, n, through) => {
    const v = []; for (const x of F) if (isFinite(x)) v.push(x);
    if (!v.length) return { L: [], d: 1 };
    v.sort((a, b) => a - b);
    const lo = v[Math.floor(v.length * 0.01)], hi = v[Math.floor(v.length * 0.99)], d = (hi - lo) / n || 1;
    const off = isFinite(through) ? through : 0, L = [];
    for (let k = Math.ceil((lo - off) / d); k <= Math.floor((hi - off) / d) && L.length < 120; k++) L.push(off + k * d);
    return { L, d };
  };

  function paint() {
    compute();
    fc.set((g, T) => {
      const bg = bgRgb(); // read on every draw so a theme change recolors the field
      if (!flow) { T.text((T.view.x0 + T.view.x1) / 2, (T.view.y0 + T.view.y1) / 2, err || 'No flow', { align: 'center', color: css('--bad') }); return; }
      const { nx, ny } = grid;
      if (S.color === 'cp') T.image(grid.cp, nx, ny, box, v => diverging(v > 0 ? v : v / 3, bg));
      else if (S.color === 'speed') T.image(grid.spd, nx, ny, box, v => sequential(v / (2 * flow.uref)));
      if (S.stream) {
        const { L, d } = levelsFor(grid.psi, 26, stag.length ? stag[0].psi : 0);
        const segs = contours(grid.psi, nx, ny, L, Math.min(cut.psi, S.mode === 'expr' ? 8 * d : Infinity));
        for (const s of segs) T.segments(s, nx, ny, box, { strokeStyle: css('--text-2'), lineWidth: 1, globalAlpha: 0.8 });
        if (stag.length) {
          const ds = contours(grid.psi, nx, ny, [...new Set(stag.map(p => +p.psi.toFixed(9)))], cut.psi);
          for (const s of ds) T.segments(s, nx, ny, box, { strokeStyle: css('--text'), lineWidth: 2.4 });
        }
      }
      if (S.equi) {
        const { L, d } = levelsFor(grid.phi, 22, 0);
        const segs = contours(grid.phi, nx, ny, L, Math.min(cut.phi, S.mode === 'expr' ? 8 * d : Infinity));
        for (const s of segs) T.segments(s, nx, ny, box, { strokeStyle: css('--lower'), lineWidth: 0.9, globalAlpha: 0.7, dash: [4, 3] });
      }
      if (S.vectors) {
        const n = 22, dx = (T.view.x1 - T.view.x0) / n;
        for (let x = T.view.x0 + dx / 2; x < T.view.x1; x += dx) for (let y = Math.max(T.view.y0, box.y0) + dx / 2; y < T.view.y1; y += dx) {
          const c = bodyCircle(); if (c && Math.hypot(x - c.x, y - c.y) < c.R) continue;
          const v = flow.vel(x, y), q = Math.hypot(v[0], v[1]); if (!isFinite(q) || q < 1e-9) continue;
          const L = Math.min(1, q / (1.5 * flow.uref)) * dx * 0.9;
          T.arrow(x, y, v[0] / q * L, v[1] / q * L, { color: css('--text-2'), width: 1, head: 4 });
        }
      }
      const c = bodyCircle();
      if (c) {
        const [px, py] = T.toPx(c.x, c.y); g.save(); g.beginPath();
        if (c.half) g.arc(px, py, c.R * T.s, PI, 2 * PI); else g.arc(px, py, c.R * T.s, 0, 2 * PI);
        g.fillStyle = css('--bg-sunk'); g.fill(); g.lineWidth = 2; g.strokeStyle = css('--text'); g.stroke(); g.restore();
      }
      if (S.mode === 'elements' && S.ground) T.ground(0);
      // particles
      if (S.particles) for (const p of parts) { if (p.age < 1) continue; T.polyline([p.prev, [p.x, p.y]], { strokeStyle: css('--accent'), lineWidth: 2, globalAlpha: Math.min(1, p.age / 8) }); }
      // elements
      if (S.mode === 'elements') for (const e of S.elements) {
        if (e.type === 'uniform') continue;
        const col = e.type === 'vortex' ? css('--accent') : e.type === 'doublet' ? css('--warn') : e.m < 0 ? css('--text-2') : css('--lower');
        T.dot(e.x, e.y, 6, col);
        const sym = e.type === 'vortex' ? (e.G >= 0 ? '↺' : '↻') : e.type === 'doublet' ? 'κ' : e.m < 0 ? '−' : '+';
        T.text(e.x, e.y, sym, { align: 'center', size: 13, dx: 12, dy: -10, tag: true });
        if (S.ground) { const [px, py] = T.toPx(e.x, -e.y); if (py < T.H) { g.save(); g.globalAlpha = 0.5; g.setLineDash([3, 3]); g.strokeStyle = col; g.beginPath(); g.arc(px, py, 6, 0, 2 * PI); g.stroke(); g.restore(); } }
      } else { // uniform stream arrow for orientation
        const u = flow.vel(T.view.x0 + 0.3, T.view.y1 - 0.3);
        if (isFinite(u[0])) T.text(T.view.x0 + 0.15, T.view.y1 - 0.2, 'F(z) = ' + S.expr, { size: 11, tag: true, color: css('--text-2') });
      }
      if (S.stag) for (const p of stag) { T.dot(p.x, p.y, 4.5, '#ffffff', css('--text')); }
      // probe
      const [qx, qy] = T.toPx(S.probe[0], S.probe[1]);
      g.save(); g.lineWidth = 2; g.strokeStyle = css('--text'); g.beginPath(); g.arc(qx, qy, 7, 0, 2 * PI); g.stroke();
      const pv = flow.vel(S.probe[0], S.probe[1]), q = Math.hypot(pv[0], pv[1]);
      if (isFinite(q) && q > 1e-9) T.arrow(S.probe[0], S.probe[1], pv[0] / q * 34, pv[1] / q * 34, { px: true, color: css('--text'), width: 2 });
      g.restore();
      if (S.color === 'cp') colorBar(T, v => diverging(v > 0 ? v : v / 3, bg), -3, 1, 'Cp');
      else if (S.color === 'speed') colorBar(T, v => sequential(v / 2), 0, 2, '|V|/U∞');
    });
    panels();
  }

  function panels() {
    if (!flow) { metrics.set([{ k: 'F(z)', v: '—', s: err || '' }]); return; }
    const pc = flow.cp(S.probe[0], S.probe[1]), pv = flow.vel(S.probe[0], S.probe[1]), F = flow.F(S.probe);
    const cont = Fl.forceContour(flow), force = cont ? Fl.blasiusForce(flow, cont.x, cont.y, cont.r) : (S.mode === 'expr' ? Fl.blasiusForce(flow, 0, 0, Math.min(2, (box.x1 - box.x0) / 3)) : null);
    const c = bodyCircle();
    let surfLift = null;
    if (c && c.half) { // hangar: lift from the roof pressure against the still air inside at p∞
      const r = Fl.cpOnCircle(flow, c.x, c.y, c.R * 1.0005, 361, 0, PI);
      let s = 0; for (let k = 1; k < r.th.length; k++) { const t = 0.5 * (r.th[k] + r.th[k - 1]); s += 0.5 * (r.cp[k] + r.cp[k - 1]) * Math.sin(t) * (r.th[k] - r.th[k - 1]) * c.R; }
      surfLift = -s * 0.5 * flow.uref ** 2; // per ρ
    }
    const U = flow.Uinf, KJ = -U * flow.Gam;
    metrics.set([
      { k: 'Free stream U∞', v: U ? fmt(U, 2) : S.mode === 'expr' && S.params.U ? fmt(S.params.U, 2) : 'none', s: U || (S.mode === 'expr' && S.params.U) ? 'Cp uses U∞' : 'Cp uses a reference speed of 1' },
      { k: 'Net circulation Γ', v: fmt(flow.Gam, 3), s: 'counter-clockwise +' },
      { k: 'Net source strength', v: fmt(flow.Msrc, 3), s: Math.abs(flow.Msrc) < 1e-9 ? 'closed body (Σm = 0)' : flow.Msrc > 0 ? 'open body: net outflow' : 'net inflow' },
      surfLift !== null ? { k: "Lift L′/ρ on the roof", v: fmt(surfLift, 3), s: 'inside at p∞: the roof is pulled up', tip: '−∫(p − p∞) n_y ds over the semicircle, per unit density.' }
        : { k: "Force (X′, Y′)/ρ", v: force ? `${fmt(force.Fx, 3)}, ${fmt(force.Fy, 3)}` : '—', s: force ? 'Blasius integral round the elements' : 'elements sit on their images', tip: 'X − iY = (iρ/2)∮W² dz on a circle that encloses every element but no image. For a closed body in a uniform stream the drag is zero and the lift equals ρU∞Γ (Kutta–Joukowski).' },
      { k: 'Kutta–Joukowski −U∞Γ', v: U ? fmt(KJ, 3) : '—', s: U && force && Math.abs(flow.Msrc) < 1e-9 && !S.ground ? (Math.abs(force.Fy - KJ) < 1e-3 * Math.max(1, Math.abs(KJ)) ? 'matches the Blasius lift' : 'differs: see notes') : 'per ρ' },
      { k: 'Stagnation points', v: String(stag.length), s: stag.slice(0, 2).map(p => `(${fmt(p.x, 2)}, ${fmt(p.y, 2)})`).join(' ') },
    ]);
    const rows = [['u, v', `${fmt(pv[0], 4)}, ${fmt(pv[1], 4)}`], ['|V| / U∞', fmt(Math.hypot(pv[0], pv[1]) / flow.uref, 4)], ['Cp', fmt(pc, 4), true], ['ψ (stream function)', fmt(F[1], 4)], ['φ (velocity potential)', fmt(F[0], 4)], ['at (x, y)', `${fmt(S.probe[0], 3)}, ${fmt(S.probe[1], 3)}`]];
    probeEl.replaceChildren(...rows.map(r => h('div', { class: 'r' + (r[2] ? ' hl' : '') }, h('span', {}, r[0]), h('span', {}, r[1]))));
    // pressure plot
    const series = [];
    if (c) {
      const half = !!c.half, r = Fl.cpOnCircle(flow, c.x, c.y, c.R * 1.0005, 181, half ? 0 : 0, half ? PI : 2 * PI);
      series.push({ x: r.th.map(t => t / DEG), y: r.cp, color: css('--accent'), label: 'Cp on the surface', width: 2.2 });
      const Gs = S.mode === 'elements' ? S.elements.filter(e => e.type === 'vortex').reduce((a, e) => a + e.G, 0) : (S.params.G || 0);
      const R = c.R, UU = flow.uref, ana = r.th.map(t => 1 - (2 * Math.sin(t) - Gs / (2 * PI * R * UU)) ** 2);
      series.push({ x: r.th.map(t => t / DEG), y: ana, color: css('--text-3'), dash: [5, 4], label: 'theory 1 − (2 sin θ + Γ/2πRU∞)²', noHover: true });
      pCard.querySelector('h4').textContent = 'Cp on the surface';
      plot.setOpts({ xlabel: 'θ from the downstream axis (°)', xname: 'θ', xfmt: v => v.toFixed(1) + '°' });
    } else {
      const y = S.ground && S.mode === 'elements' ? 0 : S.probe[1], r = Fl.cpAlongLine(flow, box.x0, box.x1, y, 301);
      series.push({ x: r.x, y: r.cp.map(v => Math.max(v, -12)), color: css('--accent'), label: S.ground && S.mode === 'elements' ? 'Cp along the ground' : `Cp along y = ${fmt(y, 2)}`, width: 2.2 });
      pCard.querySelector('h4').textContent = S.ground && S.mode === 'elements' ? 'Pressure on the ground' : 'Pressure along the probe\'s line';
      plot.setOpts({ xlabel: 'x', xname: 'x', xfmt: v => v.toFixed(3) });
    }
    plot.setData({ series, hlines: [{ y: 0, color: css('--text-3') }], vlines: c ? [] : [{ x: S.probe[0], color: css('--text-3'), dash: [3, 3] }] });
    notes(force, c, surfLift);
  }

  function notes(force, c, surfLift) {
    const L = [], p = S.mode === 'elements' ? preset() : null;
    if (p) L.push({ type: 'i', t: p.label, d: p.note });
    if (S.mode === 'expr') L.push({ type: 'i', t: 'Complex potential', d: `F(z) = φ + iψ is analytic, so W = dF/dz = u − iv gives the velocity directly (computed here by differentiating F). Streamlines are the lines Im F = const. ${/log/.test(S.expr) ? 'A logarithm adds a source (real coefficient) or a vortex (imaginary coefficient).' : ''}` });
    const U = flow.Uinf;
    if (U && Math.abs(flow.Msrc) < 1e-9 && force && !S.ground) {
      L.push({ type: 'g', t: 'd\'Alembert\'s paradox and Kutta–Joukowski', d: `For any closed body in a steady uniform stream, potential flow predicts zero drag (here D′/ρ = ${fmt(force.Fx, 4)}) and a lift set only by the circulation: L′ = ρU∞Γ_cw (here ${fmt(force.Fy, 4)} against −U∞Γ = ${fmt(-U * flow.Gam, 4)}). Real bodies have drag because the boundary layer separates.` });
    }
    if (c && !c.half && S.mode === 'elements') {
      const G = S.elements.filter(e => e.type === 'vortex').reduce((a, e) => a + e.G, 0), lim = 4 * PI * U * c.R;
      if (U) L.push({ type: Math.abs(G) > lim ? 'w' : 'i', t: Math.abs(G) > lim ? 'The stagnation points have left the surface' : `Stagnation points at sin θ = Γ/(4πU∞R) = ${fmt(G / lim, 3)}`, d: Math.abs(G) > lim ? `With |Γ| > 4πU∞R = ${fmt(lim, 2)} they merge into one point in the flow, ${G < 0 ? 'below' : 'above'} the cylinder, and a ring of fluid circulates with it.` : 'Adding a clockwise vortex moves both stagnation points down the cylinder and makes the flow faster on top than below: the pressure difference is the lift. This is the Magnus effect on a spinning ball or cylinder.' });
    }
    if (S.ground && S.mode === 'elements') L.push({ type: 'i', t: 'Method of images', d: 'The ground is replaced by a mirror-image flow below it (faint dashed markers): source images have the same sign, vortex images the opposite sign. The two together make y = 0 a streamline, so the wall condition (no flow through it) is met exactly.' });
    if (surfLift !== null) L.push({ type: 'w', t: 'Wind lifts roofs', d: `The roof sees Cp down to −3 at the top while the inside stays at the free-stream pressure (vents, open doors). Integrating Cp = 1 − 4 sin²θ over the roof gives an upward pull L′ = (5/3)ρU∞²R per unit length (${fmt(surfLift, 3)} here with ρ = U∞ = R = 1). In a 30 m/s gale on a hangar 15 m in radius that is about ${fmt(5 / 3 * 1.2 * 30 * 30 * 15 / 1000, 0)} kN for every meter of its length.` });
    if (S.mode === 'elements' && S.elements.length && !S.elements.some(e => e.type === 'uniform')) {
      const vs = S.elements.filter(e => e.type === 'vortex');
      if (vs.length === 2 && Math.abs(vs[0].G + vs[1].G) < 1e-9) { const d = Math.hypot(vs[0].x - vs[1].x, vs[0].y - vs[1].y); L.push({ type: 'i', t: 'The pair moves', d: `Each vortex is carried by the other's velocity, Γ/(2πd) = ${fmt(Math.abs(vs[0].G) / (2 * PI * d), 3)}, so the pair drifts at right angles to the line joining them. Tip vortices behind a wing descend this way.` }); }
    }
    L.push({ type: 'i', t: 'Superposition', d: 'The potential-flow equation ∇²φ = 0 is linear, so adding the potentials of simple flows gives another valid flow. Every element here satisfies it everywhere except at its own point.' });
    insightsList(insEl, L);
  }

  // ---------------- interaction ----------------
  fc.on({
    down(p) {
      if (S.mode === 'elements') {
        const e = S.elements.find(e => e.type !== 'uniform' && fc.pxDist([e.x, e.y], p) < 12);
        if (e) return q => { e.x = Math.round(q[0] * 20) / 20; e.y = Math.round(q[1] * 20) / 20; if (S.ground) e.y = Math.max(0, e.y); S.preset = ''; if (e._head) e._head.children[2].textContent = ` at (${fmt(e.x, 2)}, ${fmt(e.y, 2)})`; schedule(); };
      }
      S.probe = [p[0], p[1]]; schedule();
      return q => { S.probe = [q[0], q[1]]; schedule(); };
    },
    hover(p) { return S.mode === 'elements' && S.elements.some(e => e.type !== 'uniform' && fc.pxDist([e.x, e.y], p) < 12) ? 'grab' : 'crosshair'; },
  });

  let pending = false, visible = false;
  function schedule() { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; if (visible) paint(); }); }

  // particles drift with the local velocity; they are respawned at random when they leave or stall
  const parts = [];
  let raf = 0, last = 0;
  function respawn(p) {
    const v = fc.view, y0 = S.mode === 'elements' && S.ground ? 0 : v.y0;
    p.x = v.x0 + Math.random() * (v.x1 - v.x0); p.y = y0 + Math.random() * (v.y1 - y0); p.prev = [p.x, p.y]; p.age = 0; p.life = 60 + Math.random() * 140;
  }
  function loop() {
    cancelAnimationFrame(raf);
    if (!S.particles || !visible) { schedule(); return; }
    if (!parts.length) for (let k = 0; k < 260; k++) { const p = {}; respawn(p); p.age = Math.random() * p.life; parts.push(p); }
    last = performance.now();
    const step = t => {
      if (!visible || !S.particles) return;
      const dt = Math.min(0.05, (t - last) / 1000) * 0.9; last = t;
      if (flow && fc.view) {
        const c = bodyCircle(), v = fc.view;
        for (const p of parts) {
          const a = flow.vel(p.x, p.y), m = [p.x + 0.5 * dt * a[0], p.y + 0.5 * dt * a[1]], b = flow.vel(m[0], m[1]);
          p.prev = [p.x, p.y]; p.x += dt * b[0]; p.y += dt * b[1]; p.age++;
          const q = Math.hypot(b[0], b[1]);
          if (!isFinite(p.x) || !isFinite(q) || q > 8 * flow.uref || p.age > p.life || p.x < v.x0 || p.x > v.x1 || p.y < v.y0 || p.y > v.y1 || (S.ground && S.mode === 'elements' && p.y < 0) || (c && Math.hypot(p.x - c.x, p.y - c.y) < c.R)) respawn(p);
        }
        paintLight();
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  // redraw without recomputing the grid (particles only move)
  function paintLight() { fc.draw(); }

  build();
  return {
    controls, main,
    show() { visible = true; paint(); loop(); },
    hide() { visible = false; cancelAnimationFrame(raf); },
    destroy() { visible = false; cancelAnimationFrame(raf); fc.destroy(); },
  };
}
