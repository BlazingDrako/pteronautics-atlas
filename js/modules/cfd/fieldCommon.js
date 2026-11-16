// Shared pieces for the theory tabs (Sandbox, Airfoil Lab, Wings): the 2-D field canvas (world box ↔ pixels, dragging, color fields,
// contour lines, polylines, markers), color maps, and re-exported UI helpers.
import { h, cssVar, hexToRgb } from '../../lib/ui.js';
import { divergingJS, seqJS } from '../airfoil/flowView.js';
export { bound, boundToggle, boundSelect, boundSeg, metricsGrid, insightsList, card, put, resultRows, canvasBox } from '../propulsion/common.js';

export const css = n => cssVar(n);
// copy only drawing-state properties onto a 2-D context (never methods such as fill)
const STYLE_KEYS = ['strokeStyle', 'fillStyle', 'lineWidth', 'globalAlpha', 'lineJoin', 'lineCap'];
const applyStyle = (g, st) => { for (const k of STYLE_KEYS) if (st[k] !== undefined) g[k] = st[k]; };
export const fmt = (v, d = 3) => {
  if (v === undefined || v === null || !isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a < 1e-10) return (0).toFixed(d);
  if (a >= 1e5 || a < 1e-3) return v.toExponential(2);
  return (+v).toFixed(d);
};
export const PI = Math.PI, DEG = PI / 180;

// fluids for the viscous and control-volume tabs (20 °C, 1 atm)
export const FLUIDS = [
  { id: 'water', label: 'Water', rho: 998, mu: 1.0e-3 },
  { id: 'air', label: 'Air', rho: 1.204, mu: 1.81e-5 },
  { id: 'oil', label: 'Engine oil (SAE 30)', rho: 891, mu: 0.29 },
  { id: 'glycerin', label: 'Glycerin', rho: 1260, mu: 1.41 },
  { id: 'honey', label: 'Honey', rho: 1420, mu: 10 },
];
export const fluidOptions = () => FLUIDS.map(f => ({ value: f.id, label: `${f.label} (ρ ${f.rho} kg/m³, μ ${f.mu} Pa·s)` }));

// color for a value t in [−1, 1] on the theme's diverging map, or [0, 1] on the sequential one
export const bgRgb = () => { const c = css('--bg-elev'); return c.startsWith('#') ? hexToRgb(c) : (c.match(/\d+/g) || [255, 255, 255]).slice(0, 3).map(Number); };
export const diverging = (t, bg) => divergingJS(Math.max(-1, Math.min(1, t)), bg);
export const sequential = t => seqJS(t);

// A 2-D view of a world box. The box is fitted inside the canvas with equal x and y scales, so the visible world
// region (view) is usually larger than the box along one axis.
export class FieldCanvas {
  constructor({ height = 'max(420px, 56vh)', cls = '' } = {}) {
    this.el = h('div', { class: 'cf-chart fl-canvas ' + cls, style: { height } });
    this.cv = h('canvas');
    this.el.append(this.cv);
    this.g = this.cv.getContext('2d');
    this.box = { x0: -3, x1: 3, y0: -2, y1: 2 };
    this.drawFn = null; this.handlers = {};
    this.ro = new ResizeObserver(() => this.draw()); this.ro.observe(this.el);
    this.onTheme = () => this.draw(); addEventListener('themechange', this.onTheme);
    let drag = null;
    const world = e => { const r = this.cv.getBoundingClientRect(); return this.toWorld(e.clientX - r.left, e.clientY - r.top); };
    this.cv.style.touchAction = 'none';
    this.cv.addEventListener('pointerdown', e => {
      const p = world(e);
      drag = this.handlers.down ? this.handlers.down(p, e) : null;
      if (drag) { this.cv.setPointerCapture(e.pointerId); this.cv.style.cursor = 'grabbing'; }
    });
    this.cv.addEventListener('pointermove', e => {
      const p = world(e);
      if (drag) { drag(p, e); return; }
      if (this.handlers.hover) this.cv.style.cursor = this.handlers.hover(p) || 'crosshair';
    });
    const up = e => { if (drag && this.handlers.up) this.handlers.up(world(e)); drag = null; this.cv.style.cursor = 'crosshair'; };
    this.cv.addEventListener('pointerup', up); this.cv.addEventListener('pointercancel', up);
  }
  on(handlers) { Object.assign(this.handlers, handlers); }
  setBox(b) { this.box = { ...b }; this.layout(); }
  layout() {
    const W = this.el.clientWidth || 600, H = this.el.clientHeight || 400, b = this.box;
    const s = Math.min(W / (b.x1 - b.x0), H / (b.y1 - b.y0)), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    this.s = s; this.W = W; this.H = H;
    this.view = { x0: cx - W / (2 * s), x1: cx + W / (2 * s), y0: cy - H / (2 * s), y1: cy + H / (2 * s) };
    // a box resting on the ground (y0 = 0) keeps its bottom edge at the canvas bottom
    if (b.y0 === 0 && b.ground) { this.view.y0 = 0; this.view.y1 = H / s; }
  }
  toPx(x, y) { return [(x - this.view.x0) * this.s, this.H - (y - this.view.y0) * this.s]; }
  toWorld(px, py) { return [this.view.x0 + px / this.s, this.view.y0 + (this.H - py) / this.s]; }
  pxDist(a, b) { return Math.hypot((a[0] - b[0]) * this.s, (a[1] - b[1]) * this.s); }
  set(fn) { this.drawFn = fn; this.draw(); }
  draw() {
    const dpr = Math.min(devicePixelRatio || 1, 2), W = this.el.clientWidth, H = this.el.clientHeight;
    if (!W || !H) return;
    if (this.cv.width !== Math.round(W * dpr) || this.cv.height !== Math.round(H * dpr)) { this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr); }
    this.layout();
    const g = this.g; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    if (this.drawFn) this.drawFn(g, this);
  }
  destroy() { this.ro.disconnect(); removeEventListener('themechange', this.onTheme); }

  // ---- drawing helpers (world coordinates) ----
  // color image from a grid sampled over `box` (nx × ny, j = 0 at box.y0) with color(v) → [r, g, b] or null
  image(grid, nx, ny, box, color, alpha = 1) {
    const off = this._off || (this._off = document.createElement('canvas'));
    off.width = nx; off.height = ny;
    const og = off.getContext('2d'), img = og.createImageData(nx, ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const v = grid[j * nx + i], k = ((ny - 1 - j) * nx + i) * 4;
      const c = isFinite(v) ? color(v) : null;
      if (!c) { img.data[k + 3] = 0; continue; }
      img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
    }
    og.putImageData(img, 0, 0);
    const [ax, ay] = this.toPx(box.x0, box.y1), [bx, by] = this.toPx(box.x1, box.y0);
    const dx = (bx - ax) / (nx - 1) / 2, dy = (by - ay) / (ny - 1) / 2;
    this.g.save(); this.g.imageSmoothingEnabled = true; this.g.globalAlpha = alpha;
    this.g.drawImage(off, ax - dx, ay - dy, bx - ax + 2 * dx, by - ay + 2 * dy);
    this.g.restore();
  }
  // contour segments from contours() over a grid on `box`
  segments(segs, nx, ny, box, style) {
    const g = this.g, sx = (box.x1 - box.x0) / (nx - 1), sy = (box.y1 - box.y0) / (ny - 1);
    g.save(); applyStyle(g, { lineWidth: 1, strokeStyle: css('--text-2'), ...style });
    if (style && style.dash) g.setLineDash(style.dash);
    g.beginPath();
    for (let k = 0; k < segs.length; k += 4) {
      const [a, b] = this.toPx(box.x0 + segs[k] * sx, box.y0 + segs[k + 1] * sy), [c, d] = this.toPx(box.x0 + segs[k + 2] * sx, box.y0 + segs[k + 3] * sy);
      g.moveTo(a, b); g.lineTo(c, d);
    }
    g.stroke(); g.restore();
  }
  polyline(pts, style = {}) {
    if (!pts || pts.length < 2) return;
    const g = this.g; g.save(); applyStyle(g, { lineWidth: 1.5, strokeStyle: css('--accent'), lineJoin: 'round', lineCap: 'round', ...style });
    g.setLineDash(style.dash || []);
    g.beginPath(); let pen = false;
    for (const p of pts) { if (!isFinite(p[0]) || !isFinite(p[1])) { pen = false; continue; } const [x, y] = this.toPx(p[0], p[1]); if (pen) g.lineTo(x, y); else { g.moveTo(x, y); pen = true; } }
    if (style.close) g.closePath();
    if (style.fill) { g.fillStyle = style.fill; g.fill(); }
    g.stroke(); g.restore();
  }
  dot(x, y, r = 4, fill = css('--accent'), stroke = css('--bg-elev')) {
    const g = this.g, [px, py] = this.toPx(x, y);
    g.beginPath(); g.arc(px, py, r, 0, 2 * PI); g.fillStyle = fill; g.fill();
    if (stroke) { g.lineWidth = 1.5; g.strokeStyle = stroke; g.stroke(); }
  }
  arrow(x, y, dx, dy, { color = css('--text'), width = 1.5, head = 6, px = false } = {}) {
    const g = this.g, [ax, ay] = this.toPx(x, y);
    const bx = px ? ax + dx : this.toPx(x + dx, y + dy)[0], by = px ? ay - dy : this.toPx(x + dx, y + dy)[1];
    const L = Math.hypot(bx - ax, by - ay); if (L < 0.5) return;
    const ux = (bx - ax) / L, uy = (by - ay) / L, hh = Math.min(head, L * 0.5);
    g.save(); g.strokeStyle = g.fillStyle = color; g.lineWidth = width; g.lineCap = 'round';
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx - ux * hh * 0.6, by - uy * hh * 0.6); g.stroke();
    g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - ux * hh - uy * hh * 0.5, by - uy * hh + ux * hh * 0.5); g.lineTo(bx - ux * hh + uy * hh * 0.5, by - uy * hh - ux * hh * 0.5); g.closePath(); g.fill();
    g.restore();
  }
  text(x, y, s, { color = css('--text'), align = 'left', base = 'middle', size = 12, dx = 0, dy = 0, tag = false } = {}) {
    const g = this.g, [px, py] = this.toPx(x, y);
    g.save(); g.font = `${size}px ${css('--font')}`; g.textAlign = align; g.textBaseline = base;
    if (tag) {
      const w = g.measureText(s).width + 8, x0 = align === 'center' ? px + dx - w / 2 : align === 'right' ? px + dx - w : px + dx - 4;
      g.globalAlpha = 0.85; g.fillStyle = css('--bg-elev'); g.fillRect(x0, py + dy - size * 0.75, w, size * 1.5); g.globalAlpha = 1;
    }
    g.fillStyle = color; g.fillText(s, px + dx, py + dy); g.restore();
  }
  ground(y = 0) {
    const g = this.g, [, py] = this.toPx(0, y);
    g.save(); g.fillStyle = css('--bg-sunk') || css('--bg'); g.fillRect(0, py, this.W, this.H - py);
    g.strokeStyle = css('--text-2'); g.lineWidth = 2; g.beginPath(); g.moveTo(0, py); g.lineTo(this.W, py); g.stroke();
    g.lineWidth = 1; g.globalAlpha = 0.5; g.beginPath();
    for (let x = -20; x < this.W + 20; x += 10) { g.moveTo(x, py + 1); g.lineTo(x - 8, py + 9); }
    g.stroke(); g.restore();
  }
}

// a vertical color bar with labels, drawn in pixels at the right edge of a FieldCanvas
export function colorBar(fc, color, lo, hi, label, fmtv = v => fmt(v, 2)) {
  const g = fc.g, x = fc.W - 26, y0 = 16, hgt = Math.min(160, fc.H - 40);
  for (let k = 0; k < hgt; k++) { const v = hi - (hi - lo) * k / hgt, c = color(v); if (!c) continue; g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; g.fillRect(x, y0 + k, 12, 1.5); }
  g.strokeStyle = css('--border-strong'); g.lineWidth = 1; g.strokeRect(x, y0, 12, hgt);
  g.save(); g.font = `11px ${css('--font')}`; g.fillStyle = css('--text-2'); g.textAlign = 'right'; g.textBaseline = 'middle';
  g.fillText(fmtv(hi), x - 4, y0 + 4); g.fillText(fmtv(lo), x - 4, y0 + hgt - 4); g.fillText(label, x + 12, y0 + hgt + 12);
  g.restore();
}
