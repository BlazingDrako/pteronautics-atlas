// Shared layout for the Airfoil Lab's theory tabs (Thin airfoil, Joukowski, Vortex panels, Boundary layer):
// controls on the left, a main column that the tab hides when it is not open, and a side panel with notes and
// concept cards — the same contract as the Supersonic and Vehicle aero tabs.
import { h } from '../../lib/ui.js';
import { insightsList } from '../compressible/common.js';

export function theoryShell(concepts) {
  const controls = h('div');
  const main = h('div', { style: { display: 'none', flexDirection: 'column', gap: '12px' } });
  const side = h('div');
  const insEl = h('div');
  side.append(h('div', { class: 'side-section' }, h('h3', {}, 'What you\'re seeing'), insEl));
  if (concepts && concepts.length) {
    const learn = h('div', { class: 'side-section' }, h('h3', {}, 'Learn the concepts'));
    for (const c of concepts) learn.append(h('details', { class: 'concept' }, h('summary', {}, c.title), h('div', { class: 'body', html: c.html })));
    side.append(learn);
  }
  return { controls, main, side, notes: list => insightsList(insEl, list) };
}
export const D = Math.PI / 180;
export const f3 = (v, d = 3) => isFinite(v) ? (Math.abs(v) < 1e-12 ? 0 : v).toFixed(d) : '—';
