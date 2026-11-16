// Feed & turbopumps: the power balance of each feed cycle for the engine on the Engine design tab (pump power,
// turbine flow or pressure ratio), the centrifugal pumps that deliver it (head, specific speed, impeller size,
// NPSH and cavitation) and the turbine blading (single-row impulse vs velocity-compounded Curtis wheel).
import { h, section, cssVar } from '../../lib/ui.js';
import { Plot } from '../../lib/plot.js';
import * as R from '../../solvers/rocket.js';
import * as X from '../../solvers/rocketSystems.js';
import { store, schedule, bound, boundSelect, boundToggle, metricsGrid, insightsList, card, put, propLabel } from './common.js';
import { canvasBox } from '../propulsion/common.js';
import { table } from '../../lib/tabbed.js';

const DEG = Math.PI / 180;

export function feedTab({ keep = o => o } = {}) {
  const C = keep({ injDp: 20, coolDp: 15, pTankOx: 3.5, pTankF: 3.0, etaP: 0.7, etaT: 0.6, Tgg: 900, prGG: 20, rpmOx: 15000, rpmF: 20000, inducer: true, headM: 10, Dturb: 0.3, rpmT: 30000, alpha: 20, Tin: 0 });
  const SS = store.S;
  const controls = h('div'), main = h('div', { class: 'cf-main-inner' });
  const metrics = metricsGrid();
  const sch = canvasBox('cf-chart', '280px');
  const schCard = card('Cycle schematic', 'Where the propellants go. Pumps raise them from tank pressure to above chamber pressure; a turbine on the same shaft drives the pumps. The cycles differ in where the turbine gas comes from and where it goes afterwards.');
  schCard.append(sch.el);
  const pumpCard = card('Pumps', 'Head H = Δp/ρg. Specific speed Ns = ω√Q/(gH)^¾ (dimensionless; ×2733 for US units) should be about 0.3–1.2 for a centrifugal stage, otherwise more stages are used. Impeller tip speed from a head coefficient ψ = gH/U² ≈ 0.5.');
  const pumpEl = h('div'); pumpCard.append(pumpEl);
  const tCard = card('Turbine blade efficiency vs blade-speed ratio', 'Ideal impulse blading: one row η = 4(U/c₀)(cos α − U/c₀), best at U/c₀ = cos α/2; a two-row Curtis wheel η = 8(U/c₀)(cos α − 2U/c₀), best at U/c₀ = cos α/4. Gas-generator gas expands through a large pressure ratio, so its spouting velocity c₀ is too high for one row at a tip speed the disk can survive.');
  const tPlot = new Plot(tCard, { xlabel: 'U / c₀', ylabel: 'blade efficiency', xname: 'U/c₀', yname: 'η', xfmt: v => v.toFixed(3), yfmt: v => (v * 100).toFixed(1) + '%', legendPos: 'bottom' });
  const sCard = card('Effect of chamber pressure', 'Same propellant flow and mixture ratio. Pump power rises in proportion to Pc. For an expander the heat picked up falls slightly (Q ∝ Pc^−0.2 for a fixed thrust), so above some pressure there is not enough energy to drive the pumps.');
  const sPlot = new Plot(sCard, { xlabel: 'chamber pressure (bar)', ylabel: 'pump power (MW)', xname: 'Pc', yname: 'P', xfmt: v => v.toFixed(0) + ' bar', yfmt: v => v.toFixed(2), legendPos: 'bottom' });
  for (const p of [tPlot, sPlot]) p.wrap.style.height = '240px';
  const insCard = card('Notes'); const insEl = h('div'); insCard.append(insEl);
  main.append(metrics.el, h('div', { class: 'cf-grid2b' }, schCard, insCard), pumpCard, h('div', { class: 'cf-grid2b' }, tCard, sCard));

  const build = () => {
    const s0 = section('Power cycle');
    put(s0.body,
      boundSelect(SS, 'cycle', 'Cycle', Object.entries(R.CYCLES).map(([value, label]) => ({ value, label })), () => { schedule(); }, 'Changing the cycle here changes it for the whole engine (a gas generator costs Isp on the Engine design tab).'),
      bound(C, 'injDp', 'Injector pressure drop', 5, 40, { step: 1, digits: 0, unit: '% of Pc', onInput: paint, tip: 'About 15–25% of Pc to keep combustion stable.' }),
      bound(C, 'coolDp', 'Cooling jacket pressure drop (fuel)', 0, 40, { step: 1, digits: 0, unit: '% of Pc', onInput: paint }),
      bound(C, 'pTankOx', 'Oxidizer tank pressure', 1, 40, { step: 0.1, digits: 1, unit: 'bar', onInput: paint }),
      bound(C, 'pTankF', 'Fuel tank pressure', 1, 40, { step: 0.1, digits: 1, unit: 'bar', onInput: paint }),
      bound(C, 'etaP', 'Pump efficiency', 0.4, 0.9, { step: 0.01, digits: 2, onInput: paint }),
      bound(C, 'etaT', 'Turbine efficiency', 0.3, 0.9, { step: 0.01, digits: 2, onInput: paint }),
      SS.cycle !== 'expander' && SS.cycle !== 'pressure' && SS.cycle !== 'electric' ? bound(C, 'Tgg', SS.cycle === 'gg' ? 'Gas generator temperature' : 'Preburner temperature', 600, 1300, { step: 5, digits: 0, unit: 'K', onInput: paint, tip: 'Kept far below the main chamber by running very fuel- or oxidizer-rich, so uncooled turbine blades survive.' }) : null,
      SS.cycle === 'gg' ? bound(C, 'prGG', 'Gas-generator turbine pressure ratio', 3, 60, { step: 0.5, digits: 1, onInput: paint, tip: 'The turbine exhausts overboard, so it can expand through a large ratio.' }) : null);
    const s1 = section('Turbopump');
    put(s1.body,
      bound(C, 'rpmOx', 'Oxidizer pump speed', 3000, 60000, { step: 100, digits: 0, unit: 'rpm', onInput: paint }),
      bound(C, 'rpmF', 'Fuel pump speed', 3000, 120000, { step: 100, digits: 0, unit: 'rpm', onInput: paint, tip: 'Hydrogen pumps spin fastest: low density means enormous head.' }),
      boundToggle(C, 'inducer', 'Inducer ahead of the impellers', paint, 'An axial inducer lets the pump run with much less suction head: suction specific speed S ≈ 10 instead of 3 (US units about 27 000 instead of 8 000).'),
      bound(C, 'headM', 'Static head above the pump (acceleration × height)', 0, 50, { step: 0.5, digits: 1, unit: 'm', onInput: paint }),
      bound(C, 'Dturb', 'Turbine mean diameter', 0.05, 1, { step: 0.005, digits: 3, unit: 'm', onInput: paint }),
      bound(C, 'rpmT', 'Turbine speed', 3000, 120000, { step: 100, digits: 0, unit: 'rpm', onInput: paint }),
      bound(C, 'alpha', 'Nozzle angle α (from the wheel plane)', 10, 30, { step: 0.5, digits: 1, unit: '°', onInput: paint }));
    controls.replaceChildren(s0.el, s1.el, h('div', { class: 'hint', style: { padding: '0 4px' } }, 'Propellants, Pc and thrust come from the Engine design tab.'));
  };

  const solve = (D, PcScale = 1) => {
    const fuel = SS.fuel, ox = SS.ox;
    let Q = 0;
    if (SS.cycle === 'expander') { try { Q = R.bartz(D, {}).Q * PcScale ** -0.2; } catch { Q = 0; } }
    return X.feedSystem({ cycle: SS.cycle, Pc: D.Pc * PcScale, mOx: D.mdotOx, mFuel: D.mdotFuel, rhoOx: R.PROPS[ox].rho, rhoFuel: R.PROPS[fuel].rho, fuel,
      injDp: C.injDp / 100, coolDp: C.coolDp / 100, pTankOx: C.pTankOx * 1e5, pTankFuel: C.pTankF * 1e5, etaP: C.etaP, etaT: C.etaT, Tgg: C.Tgg, prGG: C.prGG,
      Qjacket: Q, TfIn: R.PROPS[fuel].Tb, cpFuelLiq: R.PROPS[fuel].cp });
  };

  function paint() {
    const D = store.D; if (!D) return;
    const F = solve(D), fuel = SS.fuel, ox = SS.ox;
    const MW = v => (v / 1e6).toFixed(v < 1e6 ? 3 : 2) + ' MW';
    const S = C.inducer ? 10 : 3;
    const pumps = SS.cycle === 'pressure' ? [] : [
      { name: `${propLabel(ox)} pump`, p: X.pump({ mdot: D.mdotOx, rho: R.PROPS[ox].rho, dp: F.dOx, rpm: C.rpmOx, S, pTank: C.pTankOx * 1e5, pVap: X.VAPOR[ox] ?? 1e3, headM: C.headM }), rpm: C.rpmOx, P: F.Pox, prop: ox },
      { name: `${propLabel(fuel)} pump`, p: X.pump({ mdot: D.mdotFuel, rho: R.PROPS[fuel].rho, dp: F.dF, rpm: C.rpmF, S, pTank: C.pTankF * 1e5, pVap: X.VAPOR[fuel] ?? 1e3, headM: C.headM }), rpm: C.rpmF, P: F.Pf, prop: fuel },
    ];
    pumpEl.replaceChildren(SS.cycle === 'pressure' ? h('div', { class: 'hint' }, 'Pressure-fed: no pumps. The tanks themselves must be above chamber pressure.') :
      table(['', 'Δp bar', 'head m', 'power', 'stages', 'Ns (US)', 'impeller D', 'tip speed', 'NPSH avail.', 'NPSH req.', 'max rpm'], pumps.map(q => {
        const p = q.p;
        return { cells: [q.name, (q.P > 0 ? (q.name.includes(propLabel(ox)) ? F.dOx : F.dF) / 1e5 : 0).toFixed(1), p.H.toFixed(0), MW(q.P), p.stages, `${p.Ns.toFixed(2)} (${p.NsUS.toFixed(0)})`, (p.D2 * 100).toFixed(1) + ' cm', p.U2.toFixed(0) + ' m/s', p.NPSHa.toFixed(1) + ' m', p.NPSHr.toFixed(1) + ' m', p.rpmMax.toFixed(0)], hl: p.margin < 1 };
      })));
    const mFrac = F.frac ?? 0;
    metrics.set([
      { k: 'Total pump power', v: SS.cycle === 'pressure' ? '0' : MW(F.Ptot), s: SS.cycle === 'pressure' ? '' : `oxidizer ${MW(F.Pox)}, fuel ${MW(F.Pf)}` },
      SS.cycle === 'pressure' ? { k: 'Tank pressure needed', v: (F.pTankFuelReq / 1e5).toFixed(1) + ' bar', s: `oxidizer ${(F.pTankOxReq / 1e5).toFixed(1)} bar`, cls: F.pTankFuelReq > 30e5 ? 'bad' : '' }
        : SS.cycle === 'gg' ? { k: 'Gas-generator flow', v: (mFrac * 100).toFixed(2) + '%', s: `${F.mT.toFixed(2)} kg/s dumped, ${(F.wT / 1000).toFixed(0)} kJ/kg in the turbine` }
          : SS.cycle === 'expander' ? { k: 'Turbine pressure ratio', v: F.ok ? F.PR.toFixed(2) : 'not enough heat', s: `fuel enters the turbine at ${F.Tin.toFixed(0)} K`, cls: F.ok ? '' : 'bad' }
            : SS.cycle === 'electric' ? { k: 'Battery power', v: MW(F.Ptot / 0.9), s: 'motor 90% efficient' }
              : { k: 'Turbine pressure ratio', v: F.ok ? (F.sides.includes('fuel') && F.sides.includes('ox') ? `${F.PRf.toFixed(2)} / ${F.PRo.toFixed(2)}` : (F.sides[0] === 'fuel' ? F.PRf : F.PRo).toFixed(2)) : 'does not close', s: F.ok ? `pump discharge ${(Math.max(F.pPumpF, F.pPumpO) / 1e5).toFixed(0)} bar` : '', cls: F.ok ? '' : 'bad' },
      { k: 'Injector inlet pressure', v: (F.pInj / 1e5).toFixed(0) + ' bar', s: `Pc ${SS.Pc.toFixed(0)} bar` },
      { k: 'Propellant flow', v: D.mdot.toFixed(1) + ' kg/s', s: `ox ${D.mdotOx.toFixed(1)}, fuel ${D.mdotFuel.toFixed(1)}` },
      { k: 'Pump power per kN', v: SS.cycle === 'pressure' ? '—' : (F.Ptot / SS.F / 1000).toFixed(2) + ' kW/kN' },
      pumps.length ? { k: 'Worst NPSH margin', v: Math.min(...pumps.map(q => q.p.margin)).toFixed(2) + '×', s: 'available / required', cls: Math.min(...pumps.map(q => q.p.margin)) < 1 ? 'bad' : '' } : { k: 'NPSH', v: '—' },
    ]);
    // turbine blading
    const gas = SS.cycle === 'expander' ? X.turbineGas('expander', fuel) : X.turbineGas('gg', fuel, (SS.cycle === 'staged' && fuel !== 'H2(L)') ? 'ox' : 'fuel');
    const Tin = SS.cycle === 'expander' ? (F.Tin || 300) : C.Tgg;
    const PRt = SS.cycle === 'gg' ? C.prGG : SS.cycle === 'expander' ? (F.PR || 1.5) : Math.max(F.PRf || 1, F.PRo || 1);
    const c0 = X.spouting(gas, Tin, Math.max(1.01, PRt)), U = C.rpmT * Math.PI / 30 * C.Dturb / 2, x0 = U / c0, al = C.alpha * DEG;
    const xs = []; for (let x = 0; x <= 0.6; x += 0.005) xs.push(x);
    tPlot.setData({ series: [{ x: xs, y: xs.map(x => X.impulseEta(x, al)), color: cssVar('--upper'), label: 'single-row impulse' }, { x: xs, y: xs.map(x => X.curtisEta(x, al)), color: cssVar('--lower'), label: 'two-row Curtis wheel' },
      { x: [x0, x0], y: [X.impulseEta(x0, al), X.curtisEta(x0, al)], color: cssVar('--text'), line: false, points: true, pointSize: 4, noLegend: true, extra: () => `U ${U.toFixed(0)} m/s, c₀ ${c0.toFixed(0)} m/s` }], vlines: [{ x: x0, color: cssVar('--text-3') }] });
    tPlot.setOpts({ ylim: [0, 1] });
    // Pc sweep
    const pcs = []; for (let p = 0.25; p <= 3.01; p += 0.05) pcs.push(p);
    const sw = pcs.map(s => solve(D, s));
    sPlot.setData({ series: [{ x: pcs.map(s => s * SS.Pc), y: sw.map(f => (f.ok === false ? NaN : f.Ptot / 1e6)), color: cssVar('--upper'), label: 'pump power (MW)' },
      ...(SS.cycle === 'gg' ? [{ x: pcs.map(s => s * SS.Pc), y: sw.map(f => f.frac * 100), color: cssVar('--lower'), label: 'GG flow (%)' }] : []),
      ...(SS.cycle === 'expander' || SS.cycle === 'staged' || SS.cycle === 'ffsc' ? [{ x: pcs.map(s => s * SS.Pc), y: sw.map(f => f.ok ? (f.PR ?? Math.max(f.PRf, f.PRo)) : NaN), color: cssVar('--lower'), label: 'turbine pressure ratio' }] : [])],
      vlines: [{ x: SS.Pc, color: cssVar('--text-3') }] });
    sPlot.setOpts({ yZero: true });
    // insights
    const L = [];
    if (SS.cycle === 'pressure') L.push({ type: F.pTankFuelReq > 30e5 ? 'w' : 'i', t: 'Pressure-fed', d: `The tanks must hold ${(F.pTankFuelReq / 1e5).toFixed(0)} bar. Tank mass grows with pressure × volume, which is why pressure-fed engines stay below about 25 bar (Shuttle OMS ran at 8.6 bar).` });
    if (SS.cycle === 'gg') L.push({ type: 'i', t: `Turbine exhaust dumped: ${(mFrac * 100).toFixed(1)}% of the flow`, d: `It leaves at low velocity, so it adds little thrust. The Engine design tab assumes ${(SS.gg * 100).toFixed(1)}%; set it to match.` });
    if (SS.cycle === 'expander') L.push(F.ok ? { type: 'g', t: 'Expander closes', d: `The jacket heats the fuel to ${F.Tin.toFixed(0)} K; a turbine pressure ratio of ${F.PR.toFixed(2)} drives both pumps. The fuel pump must deliver ${(F.pPumpF / 1e5).toFixed(0)} bar.` }
      : { type: 'b', t: 'Not enough heat for an expander', d: `Even an infinite turbine pressure ratio gives only ${(F.wAvail / 1000).toFixed(0)} kJ/kg, against ${(F.wNeed / 1000).toFixed(0)} kJ/kg needed. Expanders suit hydrogen (or methane) at modest Pc and size, like the RL10.` });
    if ((SS.cycle === 'staged' || SS.cycle === 'ffsc') && !F.ok) L.push({ type: 'b', t: 'Cycle does not close', d: 'The turbine flow cannot supply the pump power at any reasonable pressure ratio. Raise the preburner temperature or the efficiencies, or lower Pc.' });
    if (SS.cycle === 'staged' || SS.cycle === 'ffsc') L.push({ type: 'i', t: 'Pumps work much harder', d: 'Turbine gas goes into the main chamber, so the pumps must deliver chamber pressure times the turbine pressure ratio. The reward: nothing is dumped and Pc can be very high (RS-25 206 bar, Raptor 300 bar).' });
    for (const q of pumps) if (q.p.margin < 1) L.push({ type: 'b', t: `${q.name} cavitates`, d: `Needs ${q.p.NPSHr.toFixed(1)} m of suction head but has ${q.p.NPSHa.toFixed(1)} m. Slow it below ${q.p.rpmMax.toFixed(0)} rpm, add an inducer, or raise the tank pressure.` });
    const best = x0 < 0.25 * Math.cos(al) * 1.4 ? 'Curtis' : 'single-row';
    L.push({ type: 'i', t: `U/c₀ = ${x0.toFixed(3)}: a ${best} turbine fits`, d: `Spouting velocity c₀ = ${c0.toFixed(0)} m/s through a pressure ratio of ${PRt.toFixed(1)}; blade speed ${U.toFixed(0)} m/s. Tip speeds above ~500 m/s are hard to survive, so high-ratio GG turbines use velocity compounding.` });
    insightsList(insEl, L);
    drawSchematic();
  }

  function drawSchematic() {
    sch.set(({ W, H, g }) => {
      const cyc = SS.cycle, ink = cssVar('--text-2'), ox = cssVar('--upper'), fu = cssVar('--lower'), hot = cssVar('--warn');
      const box = (x, y, w, hh, label, col) => { g.strokeStyle = col || ink; g.lineWidth = 1.6; g.strokeRect(x - w / 2, y - hh / 2, w, hh); g.fillStyle = cssVar('--text'); g.font = '11px ' + cssVar('--font'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, x, y); };
      const circ = (x, y, r, label, col) => { g.strokeStyle = col; g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); g.fillStyle = cssVar('--text'); g.font = '10px ' + cssVar('--font'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, x, y); };
      const line = (pts, col, dash) => { g.strokeStyle = col; g.lineWidth = 2; g.setLineDash(dash || []); g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.setLineDash([]); };
      const xO = W * 0.22, xF = W * 0.78, xc = W / 2, yT = 30, yP = 100, yG = 160, yC = 225;
      box(xO, yT, 90, 34, 'Oxidizer tank', ox); box(xF, yT, 90, 34, 'Fuel tank', fu);
      // chamber + nozzle
      g.strokeStyle = ink; g.lineWidth = 1.8; g.beginPath(); g.moveTo(xc - 30, yC - 26); g.lineTo(xc + 30, yC - 26); g.lineTo(xc + 30, yC); g.lineTo(xc + 10, yC + 12); g.lineTo(xc + 34, H - 6); g.lineTo(xc - 34, H - 6); g.lineTo(xc - 10, yC + 12); g.lineTo(xc - 30, yC); g.closePath(); g.stroke();
      g.fillStyle = cssVar('--text'); g.font = '11px ' + cssVar('--font'); g.textAlign = 'center'; g.fillText('Chamber', xc, yC - 12);
      if (cyc === 'pressure') {
        box(xc, yT, 70, 26, 'He bottle', ink); line([[xc - 35, yT], [xO + 45, yT]], ink, [3, 3]); line([[xc + 35, yT], [xF - 45, yT]], ink, [3, 3]);
        line([[xO, yT + 17], [xO, yC - 18], [xc - 30, yC - 18]], ox); line([[xF, yT + 17], [xF, yC - 18], [xc + 30, yC - 18]], fu);
        return;
      }
      circ(xO, yP, 18, 'pump', ox); circ(xF, yP, 18, 'pump', fu);
      line([[xO, yT + 17], [xO, yP - 18]], ox); line([[xF, yT + 17], [xF, yP - 18]], fu);
      if (cyc === 'electric') { box(xc, yP, 80, 30, 'Motor + battery', ink); line([[xO + 18, yP], [xc - 40, yP]], ink, [2, 3]); line([[xc + 40, yP], [xF - 18, yP]], ink, [2, 3]); }
      else { box(xc, yP, 70, 30, cyc === 'ffsc' ? 'Turbines' : 'Turbine', hot); line([[xO + 18, yP], [xc - 35, yP]], ink, [2, 3]); line([[xc + 35, yP], [xF - 18, yP]], ink, [2, 3]); }
      // main feed lines
      line([[xO, yP + 18], [xO, yC - 18], [xc - 30, yC - 18]], ox);
      if (cyc === 'expander') {
        line([[xF, yP + 18], [xF, yC + 30], [xc + 22, yC + 30]], fu); // to jacket
        g.fillStyle = cssVar('--text-2'); g.font = '10px ' + cssVar('--font'); g.textAlign = 'left'; g.fillText('cooling jacket', xc + 26, yC + 44);
        line([[xc + 20, yC - 26], [xc + 20, yG], [xc + 10, yP + 15]], hot); line([[xc - 10, yP + 15], [xc - 20, yG], [xc - 20, yC - 26]], fu);
      } else {
        line([[xF, yP + 18], [xF, yC - 18], [xc + 30, yC - 18]], fu);
        if (cyc === 'gg' || cyc === 'staged' || cyc === 'ffsc') {
          box(xc, yG, cyc === 'gg' ? 60 : 72, 24, cyc === 'gg' ? 'Gas gen.' : 'Preburner' + (cyc === 'ffsc' ? 's' : ''), hot);
          line([[xO, yG], [xc - 36, yG]], ox, [4, 3]); line([[xF, yG], [xc + 36, yG]], fu, [4, 3]);
          line([[xc, yG - 12], [xc, yP + 15]], hot);
          if (cyc === 'gg') { line([[xc + 35, yP - 6], [W - 12, yP - 30]], hot, [5, 4]); g.fillStyle = cssVar('--text-2'); g.textAlign = 'right'; g.font = '10px ' + cssVar('--font'); g.fillText('exhaust dumped', W - 12, yP - 40); }
          else { line([[xc - 35, yP - 8], [xc - 54, yP - 8], [xc - 54, yC - 30], [xc - 16, yC - 30]], hot); g.fillStyle = cssVar('--text-2'); g.textAlign = 'left'; g.font = '10px ' + cssVar('--font'); g.fillText('hot gas → injector', xc - 50, yC - 44); }
        }
      }
    });
  }
  let visible = false;
  store.subs.add(() => { if (visible) { build(); paint(); } });
  build();
  return { controls, main, show() { visible = true; build(); paint(); }, hide() { visible = false; } };
}
