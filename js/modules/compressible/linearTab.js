// Shocks & Nozzles › Linear theory: small-disturbance compressible flow. Subsonic: how compressibility corrections
// raise the suction on a body, and where it first reaches sonic speed (the critical Mach number), by Prandtl–Glauert,
// Kármán–Tsien and Laitone. Supersonic: a ramp in a duct, the reflected wave system by linear theory against exact
// oblique shocks or Prandtl–Meyer fans, with the wall pressures.
import { h, section, slider, segmented, select, field } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import * as Lz from '../../solvers/linearized.js';
import { card, fmt, metricsGrid, insightsList } from './common.js';
import { canvasBox } from '../propulsion/common.js';

const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const DEG = Math.PI / 180;

export function linearTab({ keep = o => o } = {}) {
  const S = keep({ mode: 'crit', body: 'cyl', cp0: -0.6, M: 0.5, M1: 2, theta: 5, H: 1, L: 8 });
  const controls = h('div'), main = h('div', { class: 'cf-main-inner' });
  const metrics = metricsGrid();
  const c1 = card('', ''), c2 = card('', '');
  const p1 = new Plot(c1, { legendPos: 'above' }), p2 = new Plot(c2, { legendPos: 'above' });
  p1.wrap.style.height = '320px'; p2.wrap.style.height = '280px';
  const pic = canvasBox('cf-chart', '320px'); const picCard = card('Wave system in the duct', 'Solid: exact oblique shocks (or the center ray of each expansion fan, dashed). Thin gray: linear theory, every wave at the free-stream Mach angle. Labels: Mach number and p/p₁ in each region.'); picCard.append(pic.el);
  const insCard = card('Notes'); const insEl = h('div'); insCard.append(insEl);
  main.append(metrics.el, picCard, c1, c2, insCard);

  function build() {
    const sec = section('Linearized flow');
    const m = segmented([{ value: 'crit', label: 'Critical Mach (subsonic)' }, { value: 'duct', label: 'Ramp in a duct (supersonic)' }], S.mode, v => { S.mode = v; build(); update(); });
    m.el.classList.add('seg-wrap');
    sec.body.append(field('Problem', m.el));
    const sp = section('Inputs');
    if (S.mode === 'crit') {
      const b = Lz.BODIES.find(q => q.id === S.body);
      sp.body.append(field('Body', select(Lz.BODIES.map(q => ({ value: q.id, label: q.label })), S.body, v => { S.body = v; build(); update(); }), b ? b.note : ''));
      if (S.body === 'custom') sp.body.append(slider({ label: 'Incompressible Cp,min', min: -4, max: -0.05, step: 0.01, value: S.cp0, digits: 2, onInput: v => { S.cp0 = v; update(); } }).el);
      sp.body.append(slider({ label: 'Free-stream Mach M∞', min: 0, max: 0.95, step: 0.005, value: S.M, digits: 3, onInput: v => { S.M = v; update(); } }).el);
    } else {
      sp.body.append(
        slider({ label: 'Mach number M₁', min: 1.1, max: 5, step: 0.01, value: S.M1, digits: 2, onInput: v => { S.M1 = v; update(); } }).el,
        slider({ label: 'Ramp angle θ (negative: expansion corner)', min: -20, max: 20, step: 0.1, value: S.theta, format: v => (+v).toFixed(1) + '°', onInput: v => { S.theta = v; update(); }, info: 'The lower wall turns through θ at the corner and stays straight. Linear theory assumes |θ| ≪ 1 rad and M not close to 1.' }).el,
        slider({ label: 'Duct length / height', min: 2, max: 20, step: 0.1, value: S.L, digits: 1, onInput: v => { S.L = v; update(); } }).el);
    }
    controls.replaceChildren(sec.el, sp.el);
  }

  function update() {
    const L = [];
    picCard.style.display = S.mode === 'duct' ? '' : 'none';
    if (S.mode === 'crit') {
      const b = Lz.BODIES.find(q => q.id === S.body), cp0 = S.body === 'custom' ? S.cp0 : b.cp0;
      const mc = Object.fromEntries(Object.keys(Lz.RULES).map(r => [r, Lz.criticalMach(cp0, r)]));
      const cpm = r => { const v = Lz.RULES[r].cp(cp0, S.M); return isFinite(v) && v < 0 ? v : NaN; };
      metrics.set([
        { k: 'Critical Mach (Prandtl–Glauert)', v: fmt(mc.pg, 4), s: 'Cp,min = Cp₀/β' },
        { k: 'Critical Mach (Kármán–Tsien)', v: fmt(mc.kt, 4), s: 'the usual choice', cls: 'good' },
        { k: 'Critical Mach (Laitone)', v: fmt(mc.laitone, 4), s: 'includes local Mach changes' },
        { k: `Cp,min at M = ${fmt(S.M, 3)}`, v: fmt(cpm('kt'), 4), s: `Cp* = ${fmt(Lz.cpStar(Math.max(S.M, 0.05)), 4)}`, cls: S.M > mc.kt ? 'warn' : '' },
      ]);
      const Ms = [], star = [], pg = [], kt = [], la = [];
      for (let k = 0; k <= 190; k++) { const M = 0.05 + 0.9 * k / 190; Ms.push(M); star.push(Lz.cpStar(M)); pg.push(Math.max(-8, cpm2('pg', M))); kt.push(Math.max(-8, cpm2('kt', M))); la.push(Math.max(-8, cpm2('laitone', M))); }
      function cpm2(r, M) { const v = Lz.RULES[r].cp(cp0, M); return isFinite(v) && v < 0 ? v : NaN; }
      c1.querySelector('h4').textContent = 'Peak suction against Mach number, and the sonic limit Cp*';
      p1.setOpts({ xlabel: 'free-stream Mach M∞', ylabel: 'Cp', xname: 'M∞', yname: 'Cp', invertY: true, xfmt: v => v.toFixed(3), yfmt: v => v.toFixed(3), ylim: [Math.max(-8, Math.min(cp0 * 3, -1.5)), 0.2] });
      p1.setData({ series: [{ x: Ms, y: star, color: css('--text'), label: 'Cp* (local Mach 1)', width: 2.4 }, { x: Ms, y: pg, color: css('--accent'), label: 'Prandtl–Glauert', width: 1.8 }, { x: Ms, y: kt, color: css('--good'), label: 'Kármán–Tsien', width: 1.8 }, { x: Ms, y: la, color: css('--lower'), label: 'Laitone', width: 1.8 }], vlines: [{ x: S.M, color: css('--text-3'), dash: [3, 3] }, ...['pg', 'kt', 'laitone'].filter(r => isFinite(mc[r])).map(r => ({ x: mc[r], color: { pg: css('--accent'), kt: css('--good'), laitone: css('--lower') }[r], dash: [2, 3] }))] });
      // second plot: critical Mach against Cp0
      const cps = [], mp = [], mk = [], ml = [];
      for (let k = 0; k <= 80; k++) { const c = -0.05 - 3 * k / 80; cps.push(c); mp.push(Lz.criticalMach(c, 'pg')); mk.push(Lz.criticalMach(c, 'kt')); ml.push(Lz.criticalMach(c, 'laitone')); }
      c2.querySelector('h4').textContent = 'Critical Mach number against the incompressible Cp,min';
      p2.setOpts({ xlabel: 'Cp,min at M = 0', ylabel: 'M_crit', xname: 'Cp₀', yname: 'M_crit', invertY: false, xfmt: v => v.toFixed(3), yfmt: v => v.toFixed(4), ylim: [0.3, 1] });
      p2.setData({ series: [{ x: cps, y: mp, color: css('--accent'), label: 'Prandtl–Glauert', width: 1.8 }, { x: cps, y: mk, color: css('--good'), label: 'Kármán–Tsien', width: 1.8 }, { x: cps, y: ml, color: css('--lower'), label: 'Laitone', width: 1.8 }], vlines: [{ x: cp0, color: css('--text-3'), dash: [3, 3] }] });
      L.push({ type: 'i', t: 'Compressibility raises the suction', d: 'In subsonic small-disturbance flow the pressure coefficients scale up by about 1/√(1 − M²) (Prandtl–Glauert). Kármán–Tsien and Laitone add the effect of the local speed itself, so they rise faster where the suction is strong.' });
      L.push({ type: 'i', t: 'The critical Mach number', d: `At the critical Mach number the fastest point on the body just reaches Mach 1: where the corrected Cp,min curve meets Cp*. Here that is about ${fmt(mc.kt, 3)} (Kármán–Tsien). Above it a supersonic pocket and a shock form, and drag starts to rise steeply. Thin sections and low suction peaks push it up: why airliners use thin, supercritical wings swept back.` });
      if (S.M > mc.kt) L.push({ type: 'w', t: 'Above the critical Mach number', d: 'Part of the flow is now supersonic; linear subsonic theory no longer holds there. Use the Airfoil Lab\'s Supersonic tab (Live CFD) to see the shock.' });
    } else {
      const th = S.theta * DEG, r = Lz.rampInDuct({ M1: S.M1, theta: th, H: 1, L: S.L });
      const last = r.regions[r.regions.length - 1];
      metrics.set([
        { k: 'Mach angle μ₁', v: fmt(r.mu / DEG, 3) + '°', s: `linear waves every ${fmt(r.linSpacing, 3)} H` },
        { k: 'Exact, first wave', v: `Cp ${fmt(r.lower.cp[0], 4)}`, s: `linear 2θ/β = ${fmt(2 * th / r.beta, 4)}` },
        { k: 'After the reflections', v: `M ${fmt(last.M, 3)}`, s: `p/p₁ = ${fmt(last.p, 3)}` },
        { k: 'Waves before the end', v: String(r.waves.length), s: r.stop ? (r.stop.reason === 'detached' ? 'next reflection cannot be regular' : 'flow became subsonic') : 'reach the end of the duct', cls: r.stop ? 'warn' : '' },
      ]);
      pic.set(({ W, H, g }) => {
        const pad = 30, sc = Math.min((W - 2 * pad) / S.L, (H - 2 * pad) / 1.2), x0 = pad, y0 = H - pad - (H - 2 * pad - sc) / 2;
        const X = x => x0 + x * sc, Y = y => y0 - y * sc;
        g.strokeStyle = css('--text'); g.lineWidth = 3; g.beginPath(); g.moveTo(X(-0.5), Y(0)); g.lineTo(X(0), Y(0)); g.lineTo(X(S.L), Y(S.L * Math.tan(th))); g.stroke();
        g.beginPath(); g.moveTo(X(-0.5), Y(1)); g.lineTo(X(S.L), Y(1)); g.stroke();
        // linear waves
        g.strokeStyle = css('--text-3'); g.lineWidth = 1; g.setLineDash([2, 3]);
        for (let k = 0; k * r.linSpacing < S.L; k++) { const xa = k * r.linSpacing, xb = xa + r.linSpacing, up = k % 2 === 0; g.beginPath(); g.moveTo(X(xa), Y(up ? 0 : 1)); g.lineTo(X(Math.min(xb, S.L)), Y(up ? Math.min(1, (Math.min(xb, S.L) - xa) / r.linSpacing) : 1 - Math.min(1, (Math.min(xb, S.L) - xa) / r.linSpacing))); g.stroke(); }
        g.setLineDash([]);
        for (const w of r.waves) {
          g.strokeStyle = w.kind === 'shock' ? css('--lower') : css('--accent'); g.lineWidth = w.kind === 'shock' ? 2.6 : 2; g.setLineDash(w.kind === 'shock' ? [] : [6, 4]);
          const xe = Math.min(w.x1, S.L), te = (xe - w.x0) / ((w.x1 - w.x0) || 1);
          g.beginPath(); g.moveTo(X(w.x0), Y(w.y0)); g.lineTo(X(xe), Y(w.y0 + te * (w.y1 - w.y0))); g.stroke();
        }
        g.setLineDash([]);
        g.font = `11px ${css('--font')}`; g.fillStyle = css('--text'); g.textAlign = 'center';
        const xs = [0, ...r.waves.map(w => w.x1)];
        r.regions.forEach((q, k) => { const xm = k === 0 ? -0.25 : Math.min(S.L - 0.3, (xs[k - 1] + Math.min(xs[k] ?? S.L, S.L)) / 2); if (xm > S.L) return; g.fillText(`M ${q.M.toFixed(2)}`, X(xm), Y(0.6)); g.fillText(`p ${q.p.toFixed(2)}`, X(xm), Y(0.6) + 13); });
        if (r.stop) { g.fillStyle = css('--bad'); g.textAlign = 'left'; g.fillText(`${r.stop.reason === 'detached' ? 'Mach reflection: no regular reflection' : 'Flow subsonic'} beyond x = ${r.stop.x.toFixed(2)} H`, X(0), Y(0) + 22); g.strokeStyle = css('--bad'); g.setLineDash([3, 3]); g.beginPath(); g.moveTo(X(Math.min(r.stop.x, S.L)), Y(0)); g.lineTo(X(Math.min(r.stop.x, S.L)), Y(1)); g.stroke(); g.setLineDash([]); }
      });
      const clip = a => a;
      c1.querySelector('h4').textContent = 'Pressure on the lower wall (ramp side)';
      p1.setOpts({ xlabel: 'x / H', ylabel: 'Cp', xname: 'x/H', yname: 'Cp', invertY: false, xfmt: v => v.toFixed(3), yfmt: v => v.toFixed(4), ylim: null });
      p1.setData({ series: [{ x: [0, ...r.lower.x], y: [0, ...r.lower.cp].map(clip), color: css('--lower'), label: 'exact', width: 2.4 }, { x: [0, ...r.linLower.x], y: [0, ...r.linLower.cp], color: css('--text'), dash: [5, 4], label: 'linear theory', width: 1.6 }], hlines: [{ y: 0, color: css('--text-3') }] });
      c2.querySelector('h4').textContent = 'Pressure on the upper wall';
      p2.setOpts({ xlabel: 'x / H', ylabel: 'Cp', xname: 'x/H', yname: 'Cp', invertY: false, xfmt: v => v.toFixed(3), yfmt: v => v.toFixed(4), ylim: null });
      p2.setData({ series: [{ x: r.upper.x.length ? [0, r.upper.x[0], ...r.upper.x] : [0, S.L], y: r.upper.cp.length ? [0, 0, ...r.upper.cp] : [0, 0], color: css('--accent'), label: 'exact', width: 2.4 }, { x: [0, r.linSpacing, ...r.linUpper.x], y: [0, 0, ...r.linUpper.cp], color: css('--text'), dash: [5, 4], label: 'linear theory', width: 1.6 }], hlines: [{ y: 0, color: css('--text-3') }] });
      L.push({ type: 'i', t: 'Linear supersonic theory', d: 'For small turning angles each wave changes the pressure by Cp = ±2θ/√(M²−1) and travels along the free-stream Mach angle. A wave reflecting off a straight wall comes back with the same sign: compression reflects as compression, so the wall pressure jumps by the same amount again.' });
      L.push({ type: S.theta > 0 ? 'w' : 'i', t: S.theta > 0 ? 'The exact shocks get stronger' : 'The exact fans get weaker', d: S.theta > 0 ? 'Each exact shock slows the flow, so the next one, turning the flow by the same angle at a lower Mach number, is stronger and steeper. Linear theory keeps every wave the same, so it falls further behind with every reflection; eventually the reflection cannot stay regular (a Mach reflection forms).' : 'Each expansion speeds the flow up, so the next fan gives a smaller pressure drop for the same turn. Linear theory, which keeps every wave the same, overestimates the later ones.' });
    }
    insightsList(insEl, L);
  }

  build();
  return { controls, main, show() { update(); }, hide() { }, destroy() { } };
}
