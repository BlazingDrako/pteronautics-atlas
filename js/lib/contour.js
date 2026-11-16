// Marching squares on a regular grid: iso-lines of a scalar field as line segments.
// F is a Float64Array of nx*ny values (row-major, F[j*nx + i]); returns, for each level, a flat array
// [x0, y0, x1, y1, …] in grid-index coordinates (i, j), interpolated linearly along cell edges.
// Cells containing a NaN are skipped, so masked regions (inside bodies, near singularities) stay blank, and so are
// cells whose values differ by more than `jump` (the branch cut of a logarithm, where ψ or φ jumps by a constant).
export function contours(F, nx, ny, levels, jump = Infinity) {
  const out = levels.map(() => []);
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = F[j * nx + i], b = F[j * nx + i + 1], c = F[(j + 1) * nx + i + 1], d = F[(j + 1) * nx + i];
    if (!(isFinite(a) && isFinite(b) && isFinite(c) && isFinite(d))) continue;
    const lo = Math.min(a, b, c, d), hi = Math.max(a, b, c, d);
    if (hi - lo > jump) continue;
    for (let k = 0; k < levels.length; k++) {
      const L = levels[k];
      if (L < lo || L > hi) continue;
      const pts = [];
      const edge = (va, vb, xa, ya, xb, yb) => { if ((va < L) !== (vb < L)) { const t = (L - va) / (vb - va); pts.push(xa + t * (xb - xa), ya + t * (yb - ya)); } };
      edge(a, b, i, j, i + 1, j); edge(b, c, i + 1, j, i + 1, j + 1); edge(c, d, i + 1, j + 1, i, j + 1); edge(d, a, i, j + 1, i, j);
      const s = out[k];
      if (pts.length === 4) s.push(pts[0], pts[1], pts[2], pts[3]);
      else if (pts.length === 8) { // saddle: pair by the center value
        const m = (a + b + c + d) / 4;
        if ((m < L) === (a < L)) s.push(pts[0], pts[1], pts[6], pts[7], pts[2], pts[3], pts[4], pts[5]);
        else s.push(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]);
      }
    }
  }
  return out;
}

// n evenly spaced levels between the robust (2nd–98th percentile) limits of F, or between [lo, hi] if given
export function niceLevels(F, n, lo, hi) {
  if (lo === undefined) {
    const v = Array.from(F).filter(isFinite).sort((p, q) => p - q);
    if (!v.length) return [];
    lo = v[Math.floor(v.length * 0.02)]; hi = v[Math.floor(v.length * 0.98)];
  }
  const out = []; for (let k = 0; k < n; k++) out.push(lo + (hi - lo) * (k + 0.5) / n);
  return out;
}
