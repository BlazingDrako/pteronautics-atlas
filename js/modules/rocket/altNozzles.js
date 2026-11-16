// Altitude-compensating nozzles drawn with the same design language as the bell cut-away (EngineView), all as vector
// shapes: the gas inside the nozzle colored by temperature (here one band per Mach line of the corner expansion fan,
// where the bell uses bands along x), the bell's plume (fuel-tinted gradient glow, hot core, flicker, wobble, shock
// cells with glowing diamonds, a spread capped the same way so vacuum stays on screen), metal walls with outlines and
// cooling-channel dashes, and the same two-line tags. The flow is the planar plug / expansion-deflection solution
// (js/solvers/plugNozzle.js) at the engine's area ratio, exhaust γ and ambient pressure.
import { cssVar, canvasTag } from '../../lib/ui.js';
import { heat, rgb } from './common.js';
import * as P from '../../solvers/plugNozzle.js';

const DEG = Math.PI / 180;
const flameColor = fuel => fuel === 'H2(L)' ? [150, 185, 255] : fuel === 'CH4(L)' ? [140, 140, 255] : fuel === 'RP-1' || fuel === 'Jet-A(L)' ? [255, 150, 55] : [255, 175, 110];
const cache = { key: '', D: null };
const smooth = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export function drawAltNozzle(g, W, H, { type = 'aerospike', D: E, pa, alt, t: time = 0 }) {
  const gam = E.along[E.along.length - 1].gf || 1.2, eps = E.S.eps, Tc = E.Tc, pb = Math.max(1e-9, pa / E.Pc);
  const key = `${type}|${eps}|${gam.toFixed(4)}`;
  if (cache.key !== key) { cache.key = key; cache.D = P.design({ type, eps, g: gam, trunc: 0.25 }); }
  const D = cache.D, O = P.operating(D, pb), ed = type === 'ed', cy0 = D.cornerY, th = D.throat;
  const vacuum = !(pa > 0);
  const dark = document.documentElement.dataset.resolvedTheme === 'dark';
  const C = { text: cssVar('--text'), t2: cssVar('--text-2'), t3: cssVar('--text-3'), border: cssVar('--border-strong') };
  const wallFill = dark ? '#3a4150' : '#9aa3b2', wallLine = dark ? '#c9d1dc' : '#4b5563';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fl = reduce ? 1 : 0.92 + 0.08 * Math.sin(time * 31) * Math.sin(time * 7.3);

  // ---- layout: chamber, contour and a plume about as long again (fixed per geometry, so it never jumps) ----
  const end = D.type === 'aerospike' ? D.base.x : D.tip.x, Lc = Math.max(3, 0.18 * D.length);
  const xa = th.x - Lc, xb = end + Math.max(0.9 * D.length, 0.6 * (end - th.x));
  const tw = Math.max(0.5, 0.07 * cy0), Rexit = ed ? D.tip.y : cy0, Rcap = 1.8 * Rexit;
  const padL = 28, padR = 16, s = Math.min((W - padL - padR) / (xb - xa), (H - 96) / (2 * (Rexit + 2 * tw) * 1.12));
  const x0 = padL + (W - padL - padR - (xb - xa) * s) / 2, cy = H / 2;
  const X = x => x0 + (x - xa) * s, Y = y => cy - y * s;
  const cowlIn = x => cy0 + 1.2 * (1 - Math.exp(Math.min(0, x) / 1.5));
  const defl = x => (x <= -1.2 ? 0.4 : x <= -0.25 ? 0.4 + (cy0 - 0.4) * (x + 1.2) / 0.95 : cy0), edOuter = x => th.y + 1.2 * (1 - Math.exp(Math.min(0, x - th.x) / 1.5));

  // ---- the free boundary and plume edge, with the bell's capped spread: angle 40°·(1 − e^(−δ/40°)), radius saturating ----
  const spread = (R0, a, xp) => {
    if (a >= 0) { const ae = 40 * DEG * (1 - Math.exp(-a / (40 * DEG))), span = Math.max(1e-6, Rcap - R0); return R0 + span * (1 - Math.exp(-xp * Math.tan(ae) / span)); }
    return Math.max(0.04 * R0, R0 - xp * Math.tan(Math.min(-a, 35 * DEG)));
  };
  const outward = -O.deltaB;                                       // > 0: the jet edge turns outward (under-expanded)
  // plug: boundary leaves the cowl lip; E-D: the inner boundary leaves the deflector edge, the outer edge leaves the wall lip
  const boundary = x => ed ? (O.deltaB >= 0 ? Math.min(Rexit, cy0 + x * Math.tan(Math.min(O.deltaB, 60 * DEG))) : Math.max(0, cy0 - x * Math.tan(Math.min(-O.deltaB, 40 * DEG))))
    : spread(cy0, outward, Math.max(0, x));
  const wob = xp => (reduce ? 0 : 0.012 * Math.sin(time * 23 + xp / D.length * 30));
  const plumeR = x => {
    const xp = x - end, base = ed ? spread(Rexit, outward, xp) : boundary(x);
    return base * (1 + wob(xp) * smooth(xp / (0.05 * D.length)));
  };

  // axis
  g.strokeStyle = C.border; g.setLineDash([6, 5]); g.lineWidth = 1; g.beginPath(); g.moveTo(8, cy); g.lineTo(W - 8, cy); g.stroke(); g.setLineDash([]);

  // ---- plume first (behind the walls), exactly as the bell draws it ----
  const fc = flameColor(E.S.fuel), Tcol = T => rgb(heat((T - 300) / (Tc - 300)));
  const Tof = M => Tc / (1 + (gam - 1) / 2 * M * M);
  const Te = Tof(O.Mb), bright = Math.min(1, 0.35 + Te / 2200);
  const N = 90, top = [];
  for (let i = 0; i <= N; i++) { const x = end + (xb - end) * i / N; top.push([x, plumeR(x)]); }
  const glowPoly = f => { g.beginPath(); top.forEach(([x, r], i) => i ? g.lineTo(X(x), Y(f * r)) : g.moveTo(X(x), Y(f * r))); for (let i = N; i >= 0; i--) g.lineTo(X(top[i][0]), Y(-f * top[i][1])); g.closePath(); };
  const grad = g.createLinearGradient(X(end), 0, X(xb), 0);
  grad.addColorStop(0, `rgba(${fc},${0.85 * bright * fl})`); grad.addColorStop(0.5, `rgba(${fc},${0.35 * bright})`); grad.addColorStop(1, `rgba(${fc},0)`);
  g.fillStyle = grad; glowPoly(1); g.fill();
  const core = g.createLinearGradient(X(end), 0, X(end + (xb - end) * 0.6), 0);
  core.addColorStop(0, `rgba(255,245,220,${0.75 * bright * fl})`); core.addColorStop(1, 'rgba(255,245,220,0)');
  g.fillStyle = core; glowPoly(0.45); g.fill();
  // shock cells and diamonds (not in vacuum), cell length ≈ 1.22·Dj·√(Mj² − 1)
  if (!vacuum) {
    const Dj = 2 * Math.max(0.3, plumeR(end)), Lcell = Math.min((xb - end) / 2.5, Math.max(0.2 * Dj, 1.22 * Dj * Math.sqrt(Math.max(0.05, O.Mb * O.Mb - 1)) * 0.35));
    const nCells = Math.min(8, Math.floor((xb - end) / Lcell));
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1;
    for (let k = 0; k < nCells; k++) {
      const xa1 = end + k * Lcell, xm = xa1 + Lcell / 2, xb1 = xa1 + Lcell, ra = plumeR(xa1), rb = plumeR(xb1), fade = Math.exp(-k / 3);
      g.globalAlpha = fade * 0.8;
      g.beginPath(); g.moveTo(X(xa1), Y(ra)); g.lineTo(X(xm), cy); g.lineTo(X(xb1), Y(rb)); g.moveTo(X(xa1), Y(-ra)); g.lineTo(X(xm), cy); g.lineTo(X(xb1), Y(-rb)); g.stroke();
      const r = Math.max(4, 0.3 * ra * s), gr = g.createRadialGradient(X(xm), cy, 0, X(xm), cy, r);
      gr.addColorStop(0, `rgba(255,255,240,${0.95 * fade * fl})`); gr.addColorStop(1, 'rgba(255,255,240,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(X(xm), cy, r * 1.5, r, 0, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  }

  // ---- gas inside the nozzle: chamber, then one band per Mach line of the fan, then the uniform region ----
  const corner = { x: 0, y: cy0 }, dirY = ed ? 1 : -1;
  const rayEnd = M => {                                           // where the Mach-M line meets the contour or the exit plane
    const a = D.ray(M);
    if (M <= D.Me) { const w = D.wallPt(M); if (w.x <= end) return { x: w.x, y: w.y }; }
    const l = end / Math.max(1e-6, Math.cos(a));
    return { x: end, y: cy0 + dirY * l * Math.sin(a) };
  };
  const contourAt = x => { const y = P.wallY(D, x); return isFinite(y) ? y : (ed ? D.tip.y : (D.base ? D.base.y : 0)); };
  const fillPoly = (pts, col) => { for (const sg of [1, -1]) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(X(p.x), Y(sg * p.y)) : g.moveTo(X(p.x), Y(sg * p.y))); g.closePath(); g.fillStyle = col; g.fill(); g.strokeStyle = col; g.lineWidth = 0.6; g.stroke(); } };
  // chamber (hot, like the bell's chamber)
  if (!ed) {
    const cin = []; for (let i = 0; i <= 24; i++) { const x = xa * (1 - i / 24); cin.push({ x, y: cowlIn(x) }); }
    fillPoly([{ x: xa, y: th.y }, { x: th.x, y: th.y }, corner, ...cin.slice().reverse()], Tcol(Tc));
  } else {
    const wo = []; for (let i = 0; i <= 24; i++) { const x = xa + (th.x - xa) * i / 24; wo.push({ x, y: edOuter(x) }); }
    const dl = []; for (let i = 24; i >= 0; i--) { const x = xa + (0 - xa) * i / 24; dl.push({ x, y: defl(x) }); }
    fillPoly([...wo, corner, ...dl], Tcol(Tc));
  }
  // everything from here to the uniform region is clipped to the jet inside the nozzle: between the contour and
  // the (capped) free boundary, up to the end of the contour, so far-turning Mach lines in vacuum stay inside
  const region = [corner];
  for (let i = 1; i <= 40; i++) { const x = end * i / 40; region.push({ x, y: boundary(x) }); }
  region.push({ x: end, y: contourAt(end) });
  for (let i = D.wall.length - 1; i >= 0; i--) if (D.wall[i].x <= end) region.push({ x: D.wall[i].x, y: D.wall[i].y });
  g.save(); g.beginPath();
  for (const sg of [1, -1]) region.forEach((p, i) => i ? g.lineTo(X(p.x), Y(sg * p.y)) : g.moveTo(X(p.x), Y(sg * p.y)));
  g.clip();
  // fan bands
  const Mtop = O.Mb, NB = 48;
  let prev = rayEnd(1.0000001), Mprev = 1;
  for (let i = 1; i <= NB; i++) {
    const M = 1 + (Mtop - 1) * (1 - Math.cos(Math.PI * i / NB)) / 2, e = rayEnd(M);
    const pts = [corner, prev];
    // follow the contour between the two wall points so the band hugs the wall
    if (Mprev <= D.Me && prev.x < end) for (const w of D.wall) if (w.x > prev.x && w.x < e.x) pts.push({ x: w.x, y: w.y });
    if (prev.x < end && e.x >= end) pts.push({ x: end, y: contourAt(end) });
    pts.push(e);
    fillPoly(pts, Tcol(Tof(0.5 * (M + Mprev))));
    prev = e; Mprev = M;
  }
  // uniform region between the last Mach line and the free boundary
  const bEnd = { x: end, y: boundary(end) };
  const upts = [corner, prev];
  if (prev.x < end) { for (const w of D.wall) if (w.x > prev.x) upts.push({ x: w.x, y: w.y }); upts.push({ x: end, y: contourAt(end) }); }
  upts.push(bEnd);
  for (let i = 30; i >= 0; i--) { const x = end * i / 30; upts.push({ x, y: boundary(x) }); }
  fillPoly(upts, Tcol(Te));
  g.restore();
  // E-D: the open wake inside the free boundary
  if (ed && O.deltaB > 0) {
    const wk = [{ x: 0, y: 0 }]; for (let i = 0; i <= 30; i++) { const x = end * i / 30; wk.push({ x, y: Math.min(boundary(x), D.tip.y) }); } wk.push({ x: end, y: 0 });
    for (const sg of [1, -1]) { g.beginPath(); wk.forEach((p, i) => i ? g.lineTo(X(p.x), Y(sg * p.y)) : g.moveTo(X(p.x), Y(sg * p.y))); g.closePath(); g.fillStyle = dark ? 'rgba(20,24,32,0.82)' : 'rgba(225,230,238,0.9)'; g.fill(); }
  }
  // truncated plug: recirculating base wake
  if (D.base) {
    const Lw = 1.4 * D.base.y + 0.15 * D.length;
    g.fillStyle = dark ? 'rgba(20,24,32,0.85)' : 'rgba(225,230,238,0.92)';
    g.beginPath(); g.moveTo(X(D.base.x), Y(D.base.y));
    g.quadraticCurveTo(X(D.base.x + 0.55 * Lw), Y(0.55 * D.base.y), X(D.base.x + Lw), Y(0));
    g.quadraticCurveTo(X(D.base.x + 0.55 * Lw), Y(-0.55 * D.base.y), X(D.base.x), Y(-D.base.y));
    g.closePath(); g.fill();
  }
  // free jet boundary
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.setLineDash([6, 4]); g.lineWidth = 1.3;
  for (const sg of [1, -1]) {
    g.beginPath();
    for (let q = 0; q <= 60; q++) { const x = end * q / 60; q ? g.lineTo(X(x), Y(sg * boundary(x))) : g.moveTo(X(x), Y(sg * boundary(x))); }
    for (let q = 1; q <= 60; q++) { const x = end + (xb - end) * q / 60; g.lineTo(X(x), Y(sg * plumeR(x))); }
    g.stroke();
  }
  g.setLineDash([]);

  // ---- walls in the bell view's colors ----
  const path = pts => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(X(p.x), Y(p.y)) : g.moveTo(X(p.x), Y(p.y))); };
  const solid = (pts, ...outlines) => { g.fillStyle = wallFill; path(pts); g.closePath(); g.fill(); g.strokeStyle = wallLine; g.lineWidth = 1.6; for (const o of outlines) { path(o); g.stroke(); } };
  const mir = pts => pts.map(p => ({ x: p.x, y: -p.y }));
  if (!ed) {
    const top = [{ x: xa, y: th.y }, ...D.wall.map(p => ({ x: p.x, y: p.y })), { x: end, y: 0 }];
    solid([...top, ...mir(top).reverse().slice(1)], top, mir(top));
    const cin = []; for (let i = 0; i <= 24; i++) { const x = xa * i / 24; cin.push({ x, y: cowlIn(x) }); }
    for (const sg of [1, -1]) { const c = [...cin, { x: xa, y: cowlIn(xa) + tw }, { x: -0.6 * tw, y: cy0 + tw }].map(p => ({ x: p.x, y: sg * p.y })); solid(c, c.concat([c[0]])); }
    g.strokeStyle = cssVar('--upper'); g.globalAlpha = 0.55; g.lineWidth = 1; g.setLineDash([3, 3]);
    for (const sg of [1, -1]) { g.beginPath(); D.wall.forEach((p, i) => { const yy = Y(sg * p.y) + sg * 4; i ? g.lineTo(X(p.x), yy) : g.moveTo(X(p.x), yy); }); g.stroke(); }
    g.setLineDash([]); g.globalAlpha = 1;
  } else {
    const dp = [{ x: xa, y: 0.4 }, { x: -1.2, y: 0.4 }, { x: -0.25, y: cy0 }, { x: 0, y: cy0 }];
    const body = [...dp, ...mir(dp).reverse()];
    solid(body, body.concat([body[0]]));
    const wo = []; for (let i = 0; i <= 24; i++) { const x = xa + (th.x - xa) * i / 24; wo.push({ x, y: edOuter(x) }); }
    for (const sg of [1, -1]) {
      const wl = [...wo, ...D.wall.map(p => ({ x: p.x, y: p.y }))].map(p => ({ x: p.x, y: sg * p.y }));
      solid([...wl, ...wl.slice().reverse().map(p => ({ x: p.x, y: p.y + sg * tw }))], wl);
      g.strokeStyle = cssVar('--upper'); g.globalAlpha = 0.55; g.lineWidth = 1; g.setLineDash([3, 3]);
      g.beginPath(); wl.forEach((p, i) => { const yy = Y(p.y) - sg * 4; i ? g.lineTo(X(p.x), yy) : g.moveTo(X(p.x), yy); }); g.stroke();
      g.setLineDash([]); g.globalAlpha = 1;
    }
  }

  // ---- labels: name over values on a tag, like the bell view ----
  if (W > 420) {
    const tag = (x, y, a, b, below) => {
      g.font = '11px ' + cssVar('--font'); const wa = g.measureText(a).width; g.font = '10.5px ' + cssVar('--mono'); const wd = Math.max(wa, g.measureText(b).width) + 14;
      const xc = Math.max(wd / 2 + 6, Math.min(W - wd / 2 - 6, x)), topY = below ? y : y - 30;
      canvasTag(g, xc - wd / 2, topY - 4, wd, 30);
      g.textAlign = 'center'; g.textBaseline = 'top'; g.font = '11px ' + cssVar('--font'); g.fillStyle = C.t2; g.fillText(a, xc, topY);
      g.font = '10.5px ' + cssVar('--mono'); g.fillStyle = C.t3; g.fillText(b, xc, topY + 13);
    };
    tag(X(xa + Lc / 2), Y(ed ? edOuter(xa) + tw : cowlIn(xa) + tw) - 6, ed ? 'Chamber' : 'Annular chamber', `${Tc.toFixed(0)} K · ${(E.Pc / 1e5).toFixed(0)} bar`);
    tag(X(th.x), Y(-th.y) + 8, 'Throat', 'M 1', true);
    const pMb = 1 / (1 + (gam - 1) / 2 * O.Mb * O.Mb) ** (gam / (gam - 1));
    tag(X(end) + 70, Y(Math.min(Rexit + tw, Math.max(Rexit + tw, boundary(end)))) - 8, 'Jet leaves at', `M ${O.Mb.toFixed(2)} · ${vacuum ? 'vacuum' : (pMb * E.Pc / 1e5).toPrecision(3) + ' bar'}`);
    if (D.base) tag(X(D.base.x) + 40, Y(-D.base.y) + 8, 'Base', 'recirculation', true);
  }
  g.font = '11px ' + cssVar('--font'); g.fillStyle = C.t3; g.textAlign = 'right'; g.textBaseline = 'alphabetic';
  g.fillText(vacuum ? 'Vacuum: plume fans out, no shock cells' : O.regime === 'over' ? 'Below design altitude: ambient pressure holds the jet in' : O.regime === 'under' ? 'Above design altitude: behaves like a fixed nozzle' : 'At design altitude', W - 10, H - 8);
  g.textAlign = 'left'; g.fillText(`${ed ? 'Expansion-deflection' : type === 'plug' ? 'Full plug' : 'Truncated aerospike'} · ε ${eps.toFixed(0)} · ${alt.toFixed(1)} km · planar section`, 10, H - 8);
}
