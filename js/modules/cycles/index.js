// Thermodynamic Cycles module: gas properties, piston engines, gas turbines and pulse cycles.
import { tabbedModule } from '../../lib/tabbed.js';
import { concepts } from './learn.js';

export const cyclesModule = tabbedModule({
  id: 'cycles', title: 'Thermodynamic Cycles',
  sub: 'Gas properties, Otto and Diesel piston engines, Brayton gas turbines and pulse cycles on p–v and T–s diagrams',
  concepts,
  tabs: [
    { id: 'piston', label: 'Piston engines', load: () => import('./pistonTab.js').then(m => m.pistonTab) },
    { id: 'brayton', label: 'Gas turbines (Brayton)', load: () => import('./braytonTab.js').then(m => m.braytonTab) },
    { id: 'pulse', label: 'Pulse & Humphrey', load: () => import('./pulseTab.js').then(m => m.pulseTab) },
    { id: 'gas', label: 'Gas properties', load: () => import('./gasTab.js').then(m => m.gasTab) },
  ],
});
