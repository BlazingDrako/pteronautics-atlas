// A tabbed module shell (controls on the left, visuals on the right, concept notes underneath), shared by the
// modules that do not need a common store between tabs. Each tab is loaded on first use and is
// `fn({ go, keep }) => { controls, main, show?, hide?, load?, destroy? }`.
import { h } from './ui.js';
import { session } from './state.js';

export function tabbedModule({ id, title, sub, tabs, concepts, cls = '' }) {
  return {
    id, title, concepts,
    tabs: tabs.map(t => ({ id: t.id, label: t.label })),
    mount(root) {
      const controls = h('aside', { class: 'af-controls cf-controls' });
      const main = h('section', { class: 'cf-main' });
      const head = h('div', { class: 'af-head cf-head' });
      const bar = h('div', { class: 'tabs tabs-wrap', role: 'tablist' });
      head.append(h('div', {}, h('h2', { class: 'af-title' }, title), h('div', { class: 'af-sub' }, sub)), bar);
      const body = h('div', { class: 'cf-body' });
      const learn = h('div', { class: 'cf-learn' }, h('h3', {}, 'Learn the concepts'),
        h('div', { class: 'cf-concepts' }, ...concepts.map(c => h('details', { class: 'concept' }, h('summary', {}, c.title), h('div', { class: 'body', html: c.html })))));
      main.append(head, body, learn);
      root.append(h('div', { class: 'af cf ' + cls }, controls, main));
      let cur = null, token = 0;
      const sess = session(id, { title, tab: () => cur && cur.id });
      head.append(sess.toolbar()); sess.watch(root);
      const btns = {}, cache = {};
      const setTab = async (tid, params) => {
        const t = tabs.find(x => x.id === tid) || tabs[0];
        for (const [k, b] of Object.entries(btns)) b.classList.toggle('on', k === t.id);
        const my = ++token;
        if (cur && cur.id !== t.id) { cur.inst.controls.remove(); cur.inst.main.remove(); cur.inst.hide && cur.inst.hide(); }
        if (!cache[t.id]) {
          body.replaceChildren(h('div', { class: 'hint', style: { padding: '20px' } }, 'Loading…'));
          const fn = await t.load();
          if (my !== token) return;
          cache[t.id] = fn({ go: x => setTab(x), keep: (o, opt) => sess.keep(t.id, o, opt) });
        }
        if (my !== token) return;
        const inst = cache[t.id];
        controls.replaceChildren(inst.controls); body.replaceChildren(inst.main);
        cur = { id: t.id, inst };
        if (params && inst.load) inst.load(params);
        inst.show && inst.show();
        const url = `#/${id}?tab=${t.id}`;
        if (location.hash !== url) history.replaceState(null, '', url);
      };
      for (const t of tabs) {
        const b = h('button', { type: 'button', role: 'tab' }, t.label);
        b.addEventListener('click', () => setTab(t.id));
        bar.append(b); btns[t.id] = b;
      }
      const q = new URLSearchParams(location.hash.split('?')[1] || '');
      setTab(q.get('tab') || tabs[0].id);
      this._cleanup = () => { token++; sess.dispose(); for (const k in cache) cache[k].destroy && cache[k].destroy(); };
    },
    unmount() { this._cleanup && this._cleanup(); },
  };
}

// Table helper: rows of cells, first column left-aligned.
export function table(head, rows) {
  return h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
    h('thead', {}, h('tr', {}, ...head.map((x, i) => h('th', { style: i === 0 ? { textAlign: 'left' } : null }, x)))),
    h('tbody', {}, ...rows.map(r => h('tr', { class: r.hl ? 'hl' : null }, ...(r.cells || r).map((c, i) => h('td', { style: i === 0 ? { textAlign: 'left', fontFamily: 'var(--font)' } : null }, c)))))));
}
export const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
