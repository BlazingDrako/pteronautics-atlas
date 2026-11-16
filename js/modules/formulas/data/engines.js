// Engine cycles, solid motors, staging, turbopumps, turbomachinery, propellers and heat transfer (Aero 335 topics).
import { v, GAM } from './helpers.js';

const PISTON = { href: '#/cycles?tab=piston', label: 'Thermodynamic Cycles: piston engines' };
const BRAY = { href: '#/cycles?tab=brayton', label: 'Thermodynamic Cycles: Brayton' };
const PULSE = { href: '#/cycles?tab=pulse', label: 'Thermodynamic Cycles: pulse' };
const SOLID = { href: '#/rocket?tab=solid', label: 'Rocket Engines: solid motors' };
const STAGE = { href: '#/rocket?tab=flight', label: 'Rocket Engines: flight & staging' };
const FEED = { href: '#/rocket?tab=feed', label: 'Rocket Engines: feed & turbopumps' };
const BLADE = { href: '#/turbine?tab=blade', label: 'Jet Engine Cycles: blade design' };
const PROP = { href: '#/rotors?tab=bemt', label: 'Propellers & Rotors' };
const ROTOR = { href: '#/rotors?tab=rotorcraft', label: 'Propellers & Rotors: helicopters' };
const COND = { href: '#/heat?tab=conduction', label: 'Heat Transfer: conduction' };
const CONV = { href: '#/heat?tab=convection', label: 'Heat Transfer: convection' };
const RAD = { href: '#/heat?tab=radiation', label: 'Heat Transfer: radiation' };
const R_ = (val = 8.5) => v('r', 'r', 'Compression ratio V₁/V₂', 'dimless', val, 1.01, 100);

export const engines = [
  {
    id: 'otto', topic: 'heat', name: 'Ideal Otto cycle efficiency', eq: 'η = 1 − 1 / r<sup>γ−1</sup>', tags: 'spark ignition piston compression ratio four-stroke',
    vars: [v('eta', 'η', 'Thermal efficiency', 'dimless', 0.5752, 1e-4, 0.9999), R_(), GAM()],
    f: x => [x.eta, 1 - x.r ** (1 - x.g)],
    about: 'The ideal spark-ignition engine. Only the compression ratio matters: squeeze the charge harder and more of the fuel energy becomes work.',
    origin: 'Constant-volume heat addition and rejection with isentropic compression and expansion of an ideal gas with constant γ.',
    assume: ['Air-standard cycle (constant γ)', 'Instant combustion at top dead center', 'No heat loss or friction'],
    typical: 'r = 8–11 for gasoline (knock limit): η 56–62% ideal, about 0.6 of that in a real engine.',
    watch: 'Using γ = 1.3 (hot gas) instead of 1.4 gives more realistic numbers.',
    example: 'Lycoming O-360, r = 8.5.', link: PISTON, related: ['diesel', 'imep'],
  },
  {
    id: 'diesel', topic: 'heat', name: 'Ideal Diesel cycle efficiency', eq: 'η = 1 − (1/r<sup>γ−1</sup>) (r<sub>c</sub><sup>γ</sup> − 1) / (γ (r<sub>c</sub> − 1))', tags: 'compression ignition cutoff ratio piston',
    vars: [v('eta', 'η', 'Thermal efficiency', 'dimless', 0.6316, 1e-4, 0.9999), R_(18), v('rc', 'r<sub>c</sub>', 'Cutoff ratio V₃/V₂', 'dimless', 2, 1.0001, 20), GAM()],
    f: x => [x.eta, 1 - x.r ** (1 - x.g) * (x.rc ** x.g - 1) / (x.g * (x.rc - 1))],
    about: 'Fuel injected into hot compressed air burns at roughly constant pressure. Less efficient than Otto at the same r, but Diesels run at much higher r.',
    origin: 'Constant-pressure heat addition from V₂ to V₃ = r_c V₂, constant-volume rejection, isentropic compression and expansion.',
    assume: ['Air-standard cycle', 'Constant γ'],
    typical: 'r = 14–22, r_c = 1.5–3.',
    watch: 'As r_c → 1 the Diesel efficiency approaches the Otto value.',
    example: 'r = 18, r_c = 2.', link: PISTON, related: ['otto'],
  },
  {
    id: 'imep', topic: 'heat', name: 'Shaft power from imep', eq: 'P = imep · V<sub>d</sub> · n / α', tags: 'mean effective pressure displacement rpm four-stroke two-stroke',
    vars: [v('P', 'P', 'Shaft (indicated) power', 'power', 895000, 1, 1e9), v('imep', 'imep', 'Mean effective pressure', 'pressure', 1.3269e6, 1, 1e9, { unit: 'MPa' }), v('Vd', 'V<sub>d</sub>', 'Displacement', 'vol', 29.978e-3, 1e-7, 10, { unit: 'L' }), v('n', 'n', 'Crankshaft speed', 'freq', 45, 0.01, 1e4, { unit: 'rpm' }), v('a', 'α', 'Revolutions per power stroke', 'dimless', 2, 0.5, 4, { desc: '2 for a four-stroke, 1 for a two-stroke.' })],
    f: x => [x.P, x.imep * x.Vd * x.n / x.a],
    about: 'imep is the steady pressure that would do the cycle\'s net work in one stroke. Multiply by the swept volume and the number of power strokes per second to get power.',
    origin: 'Net work per cycle W = imep·V_d; a four-stroke fires each cylinder every second revolution.',
    assume: ['Indicated (no friction) unless a brake mep is used'],
    typical: 'imep 0.8–1.4 MPa for naturally aspirated aircraft engines, more with boost.',
    watch: 'n in rev/s, not rpm.',
    example: 'R-1830 Twin Wasp: 895 kW at 2700 rpm (lecture 5).', link: PISTON, related: ['otto'],
  },
  {
    id: 'braytonOpt', topic: 'prop', name: 'Brayton pressure ratio for maximum work', eq: 'r<sub>p,opt</sub> = (T<sub>3</sub>/T<sub>1</sub>)<sup>γ/(2(γ−1))</sup>', tags: 'gas turbine optimum net work fixed temperature ratio',
    vars: [v('rp', 'r<sub>p</sub>', 'Optimum pressure ratio', 'dimless', 25.28, 1, 1e4), v('TR', 'T<sub>3</sub>/T<sub>1</sub>', 'Turbine inlet / compressor inlet temperature', 'dimless', 6.3333, 1.01, 20), GAM()],
    f: x => [x.rp, x.TR ** (x.g / (2 * (x.g - 1)))],
    about: 'For a fixed turbine-inlet temperature, the net work per kg first rises then falls with pressure ratio. It peaks where the compressor and turbine exit temperatures are equal, T₂ = T₄ = √(T₁T₃).',
    origin: 'Maximize w_net = cp[T₃(1 − 1/τ) − T₁(τ − 1)] over τ = r_p^((γ−1)/γ).',
    assume: ['Ideal components', 'Constant cp'],
    typical: 'T₃/T₁ = 1900/300 K gives r_p ≈ 25 (lecture 7).',
    watch: 'Maximum work is not maximum efficiency: efficiency keeps rising with r_p.',
    example: 'T₃ = 1900 K, T₁ = 300 K.', link: BRAY, related: ['brayton', 'bwr'],
  },
  {
    id: 'bwr', topic: 'prop', name: 'Back-work ratio (ideal Brayton)', eq: 'bwr = w<sub>c</sub>/w<sub>t</sub> = (T<sub>1</sub>/T<sub>3</sub>) r<sub>p</sub><sup>(γ−1)/γ</sup>', tags: 'gas turbine compressor work turbine work',
    vars: [v('bwr', 'bwr', 'Back-work ratio', 'dimless', 0.3973, 1e-4, 10), v('rp', 'r<sub>p</sub>', 'Pressure ratio', 'dimless', 25.28, 1, 1e4), v('TR', 'T<sub>3</sub>/T<sub>1</sub>', 'Temperature ratio', 'dimless', 6.3333, 1.01, 20), GAM()],
    f: x => [x.bwr, x.rp ** ((x.g - 1) / x.g) / x.TR],
    about: 'The share of turbine work used to drive the compressor. Large in gas turbines, so losses in either component cut the net work fast.',
    origin: 'w_c = cpT₁(τ − 1), w_t = cpT₃(1 − 1/τ), ratio = τT₁/T₃.',
    assume: ['Ideal components', 'Constant cp'],
    typical: '0.4–0.8 for gas turbines; under 0.02 for steam plants.',
    watch: '', example: 'Lecture 7 optimum.', link: BRAY, related: ['braytonOpt'],
  },
  {
    id: 'humphrey', topic: 'prop', name: 'Humphrey cycle efficiency', eq: 'η = 1 − γ (p<sub>1</sub>/p<sub>2</sub>)<sup>(γ−1)/γ</sup> ((p<sub>3</sub>/p<sub>2</sub>)<sup>1/γ</sup> − 1) / (p<sub>3</sub>/p<sub>2</sub> − 1)', tags: 'pulse detonation engine pulsejet constant volume combustion',
    vars: [v('eta', 'η', 'Thermal efficiency', 'dimless', 0.40371, 1e-4, 0.9999), v('rp', 'p<sub>2</sub>/p<sub>1</sub>', 'Mechanical compression', 'dimless', 2, 1.0001, 100), v('pr', 'p<sub>3</sub>/p<sub>2</sub>', 'Pressure rise in combustion', 'dimless', 6, 1.0001, 100), GAM()],
    f: x => [x.eta, 1 - x.g * x.rp ** (-(x.g - 1) / x.g) * (x.pr ** (1 / x.g) - 1) / (x.pr - 1)],
    about: 'The ideal cycle of pulse engines: heat added at constant volume raises the pressure, so it beats Brayton at the same compression.',
    origin: 'Isentropic compression, constant-volume heat addition, isentropic expansion to p₁, constant-pressure rejection (Heiser & Pratt).',
    assume: ['Ideal gas, constant γ', 'Instant combustion'],
    typical: 'p₂/p₁ = 2, p₃/p₂ = 6: η = 40.4% vs Brayton 18.0% (lecture 8).',
    watch: '', example: 'Lecture 8.', link: PULSE, related: ['brayton'],
  },
  {
    id: 'solidPc', topic: 'rocket', name: 'Solid motor chamber pressure', eq: 'P<sub>c</sub> = (K<sub>n</sub> ρ<sub>p</sub> a c*)<sup>1/(1−n)</sup>', tags: 'burn rate saint-robert kn grain',
    vars: [v('Pc', 'P<sub>c</sub>', 'Chamber pressure', 'pressure', 5.80e6, 1, 1e9, { unit: 'MPa' }), v('Kn', 'K<sub>n</sub>', 'Burning area / throat area', 'dimless', 333.7, 1, 1e5), v('rho', 'ρ<sub>p</sub>', 'Propellant density', 'density', 1700, 100, 5000), v('a', 'a', 'Burn-rate coefficient (SI, Pa)', 'dimless', 1.2876e-5, 1e-9, 1), v('c', 'c*', 'Characteristic velocity', 'speed', 1420, 100, 5000), v('n', 'n', 'Pressure exponent', 'dimless', 0.4, 0.01, 0.95)],
    f: x => [x.Pc, (x.Kn * x.rho * x.a * x.c) ** (1 / (1 - x.n))],
    about: 'Gas made by the burning surface (ρ r A_b) must equal gas leaving the throat (Pc A_t / c*). With r = a Pcⁿ this fixes the pressure.',
    origin: 'Mass balance ρₚ a Pcⁿ A_b = Pc A_t / c*.',
    assume: ['Quasi-steady', 'No erosive burning'],
    typical: '3–10 MPa; Kn 150–800.',
    watch: 'a depends on the pressure unit: here Pc in pascals.',
    example: 'Tactical motor at ignition.', link: SOLID, related: ['isp'],
  },
  {
    id: 'stageDv', topic: 'rocket', name: 'Stage Δv from structural and payload ratios', eq: 'Δv = c ln((1 + λ)/(ε + λ))', tags: 'staging structural coefficient payload ratio',
    vars: [v('dv', 'Δv', 'Stage Δv', 'dv', 4905.6, 0, 1e5, { log: false, unit: 'km/s' }), v('c', 'c', 'Exhaust velocity', 'speed', 3048, 100, 1e5), v('eps', 'ε', 'Structural coefficient m_s/(m_s+m_p)', 'dimless', 0.142857, 1e-4, 0.999), v('lam', 'λ', 'Payload ratio m_PL/(m_s+m_p)', 'dimless', 0.0714286, 0, 100, { log: false })],
    f: x => [x.dv, x.c * Math.log((1 + x.lam) / (x.eps + x.lam))],
    about: 'The rocket equation written with the two ratios that describe a stage: how heavy its structure is, and how much it carries.',
    origin: 'm₀/m_f = (m_s + m_p + m_PL)/(m_s + m_PL), divided through by m_s + m_p.',
    assume: ['No gravity or drag losses'],
    typical: 'ε 0.05–0.15.', watch: '',
    example: 'Lecture 17: 15 t vehicle, 2 t structure, 1 t payload, c = 3048 m/s → 4904 m/s.', link: STAGE, related: ['rocketEq'],
  },
  {
    id: 'pumpNs', topic: 'rocket', name: 'Pump specific speed', eq: 'N<sub>s</sub> = ω √Q / (g H)<sup>3/4</sup>', tags: 'turbopump centrifugal head flow rate',
    vars: [v('Ns', 'N<sub>s</sub>', 'Specific speed (dimensionless)', 'dimless', 0.5, 1e-4, 100), v('w', 'ω', 'Shaft speed', 'angvel', 2094.4, 1, 1e5, { unit: 'rpm' }), v('Q', 'Q', 'Volume flow', 'vflow', 0.184, 1e-6, 100), v('H', 'H', 'Pump head', 'length', 1000, 0.01, 1e6)],
    f: x => [x.Ns, x.w * Math.sqrt(x.Q) / (9.80665 * x.H) ** 0.75],
    about: 'Classifies the pump shape that will be most efficient: low Ns favors narrow centrifugal impellers, high Ns axial pumps.',
    origin: 'Similarity analysis of pumps (Buckingham Π).',
    assume: ['Per stage'],
    typical: 'Centrifugal 0.2–1.5 (US units ×2733: 500–4000).', watch: 'Use the head per stage for multi-stage pumps.',
    example: '', link: FEED, related: ['npsh'],
  },
  {
    id: 'npsh', topic: 'rocket', name: 'Net positive suction head', eq: 'NPSH = (p<sub>inlet</sub> − p<sub>v</sub>) / (ρ g)', tags: 'cavitation pump inlet vapor pressure inducer',
    vars: [v('N', 'NPSH', 'Net positive suction head', 'length', 22.36, -1e4, 1e5, { log: false }), v('p', 'p<sub>inlet</sub>', 'Pump inlet total pressure', 'pressure', 3.5e5, 0, 1e8, { unit: 'bar', log: false }), v('pv', 'p<sub>v</sub>', 'Vapor pressure', 'pressure', 1e5, 0, 1e8, { unit: 'bar', log: false }), v('rho', 'ρ', 'Liquid density', 'density', 1141, 1, 2e4)],
    f: x => [x.N, (x.p - x.pv) / (x.rho * 9.80665)],
    about: 'How far the liquid at the pump inlet is from boiling, as a height of liquid. If the pump needs more than is available, vapor bubbles form and collapse (cavitation), eroding the blades and losing head.',
    origin: 'Definition (lecture 18).',
    assume: [], typical: 'Rocket pumps run with tens of meters; inducers let them run with very little.',
    watch: 'Cryogens are stored near boiling, so p_v ≈ tank pressure unless the tank is pressurized.', example: 'LOX at 3.5 bar.', link: FEED, related: ['pumpNs'],
  },
  {
    id: 'reaction', topic: 'prop', name: 'Free-vortex reaction along the span', eq: 'R(r) = 1 − (1 − R<sub>m</sub>)(r<sub>m</sub>/r)<sup>2</sup>', tags: 'degree of reaction radial equilibrium hub tip blade twist',
    vars: [v('R', 'R', 'Reaction at radius r', 'dimless', 0.1111, -10, 1, { log: false }), v('Rm', 'R<sub>m</sub>', 'Reaction at mean radius', 'dimless', 0.5, -1, 1, { log: false }), v('x', 'r/r<sub>m</sub>', 'Radius / mean radius', 'dimless', 0.75, 0.05, 5)],
    f: x => [x.R, 1 - (1 - x.Rm) / (x.x * x.x)],
    about: 'With r·Cθ constant, the swirl falls and the blade speed rises toward the tip, so reaction rises from hub to tip.',
    origin: 'R = 1 − (Cθ₁ + Cθ₂)/(2U) with Cθ ∝ 1/r and U ∝ r.',
    assume: ['Free vortex, uniform axial velocity'],
    typical: 'Keep the hub reaction above zero.', watch: '', example: 'Hub at 0.75 r_m.', link: BLADE, related: [],
  },
  {
    id: 'propCT', topic: 'prop', name: 'Propeller thrust coefficient', eq: 'T = C<sub>T</sub> ρ n<sup>2</sup> D<sup>4</sup>', tags: 'propeller advance ratio blade element',
    vars: [v('T', 'T', 'Thrust', 'force', 1180, 1e-3, 1e8), v('CT', 'C<sub>T</sub>', 'Thrust coefficient', 'dimless', 0.08, 1e-5, 1), v('rho', 'ρ', 'Air density', 'density', 1.225, 1e-4, 2), v('n', 'n', 'Rotational speed', 'freq', 40, 0.1, 2000, { unit: 'rpm' }), v('D', 'D', 'Diameter', 'length', 1.905, 0.01, 20)],
    f: x => [x.T, x.CT * x.rho * x.n * x.n * x.D ** 4],
    about: 'Propeller thrust scaled by density, speed and size. C_T, C_P and η depend mainly on the advance ratio J = V/(nD).',
    origin: 'Dimensional analysis (lecture 4).',
    assume: ['Low tip Mach number'], typical: 'C_T 0.05–0.15 at take-off.', watch: 'n in rev/s.',
    example: 'Cessna 172 propeller.', link: PROP, related: ['propEff'],
  },
  {
    id: 'hoverP', topic: 'prop', name: 'Ideal hover power (momentum theory)', eq: 'P = T<sup>3/2</sup> / √(2 ρ A)', tags: 'helicopter rotor actuator disk disk loading figure of merit',
    vars: [v('P', 'P', 'Ideal induced power', 'power', 43625, 1e-3, 1e9), v('T', 'T', 'Thrust (= weight)', 'force', 6000, 1e-3, 1e8), v('rho', 'ρ', 'Air density', 'density', 1.225, 1e-4, 2), v('A', 'A', 'Disk area', 'area', 46.32, 1e-4, 1e4)],
    f: x => [x.P, x.T ** 1.5 / Math.sqrt(2 * x.rho * x.A)],
    about: 'The least power any rotor can hover with. Bigger disks need less power, which is why helicopters have big rotors and why hovering on Mars is so hard.',
    origin: 'Actuator disk: T = 2ρAvᵢ², P = Tvᵢ.',
    assume: ['Uniform inflow, no swirl or profile drag'], typical: 'Real rotors need P/FM with FM ≈ 0.7–0.8.', watch: '',
    example: '6 kN on a 7.68 m rotor.', link: ROTOR, related: ['propCT'],
  },
  {
    id: 'condCyl', topic: 'heat', name: 'Conduction through a cylinder wall', eq: 'Q′ = 2πk (T<sub>1</sub> − T<sub>2</sub>) / ln(r<sub>2</sub>/r<sub>1</sub>)', tags: 'pipe tube insulation thermal resistance',
    vars: [v('Q', 'Q′', 'Heat flow per meter of length', 'power', 1.282e6, 1e-6, 1e12), v('k', 'k', 'Thermal conductivity', 'conduct', 372, 1e-4, 5000), v('dT', 'T₁ − T₂', 'Temperature difference', 'dtemp', 100, 1e-6, 5000), v('r1', 'r<sub>1</sub>', 'Inner radius', 'length', 0.01, 1e-6, 100), v('r2', 'r<sub>2</sub>', 'Outer radius', 'length', 0.012, 1e-6, 100)],
    f: x => [x.Q, 2 * Math.PI * x.k * x.dT / Math.log(x.r2 / x.r1)],
    about: 'Heat through a tube wall. The temperature varies with ln r, so most of the drop is near the inside.',
    origin: 'Fourier\'s law in cylindrical coordinates, steady, no generation.',
    assume: ['Steady', 'Constant k', 'Long cylinder'], typical: '', watch: 'Result is per meter of length (W/m).',
    example: 'Copper tube, lecture 18.', link: COND, related: ['conduction'],
  },
  {
    id: 'churchill', topic: 'heat', name: 'Cylinder in cross-flow (Churchill–Bernstein)', eq: 'Nu = 0.3 + 0.62 Re<sup>½</sup> Pr<sup>⅓</sup> / [1 + (0.4/Pr)<sup>⅔</sup>]<sup>¼</sup> · [1 + (Re/282000)<sup>⅝</sup>]<sup>⅘</sup>', tags: 'convection nusselt reynolds prandtl correlation',
    vars: [v('Nu', 'Nu', 'Nusselt number hD/k', 'dimless', 76.497, 0.3, 1e5), v('Re', 'Re', 'Reynolds number', 'dimless', 18905, 1, 1e8), v('Pr', 'Pr', 'Prandtl number', 'dimless', 0.705, 0.01, 1000)],
    f: x => [x.Nu, 0.3 + 0.62 * x.Re ** 0.5 * x.Pr ** (1 / 3) / (1 + (0.4 / x.Pr) ** (2 / 3)) ** 0.25 * (1 + (x.Re / 282000) ** 0.625) ** 0.8],
    about: 'Average heat transfer from a cylinder across a stream, from creeping flow to turbulent.',
    origin: 'Empirical fit (Churchill & Bernstein, 1977).',
    assume: ['Re·Pr > 0.2', 'Properties at the film temperature'], typical: '', watch: '', example: 'Lecture 19.', link: CONV, related: ['convection', 'stanton'],
  },
  {
    id: 'stanton', topic: 'heat', name: 'Reynolds analogy (Chilton–Colburn)', eq: 'St Pr<sup>2/3</sup> = C<sub>f</sub>/2', tags: 'stanton skin friction heat transfer boundary layer',
    vars: [v('St', 'St', 'Stanton number h/(ρVcp)', 'dimless', 0.002, 1e-8, 1), v('Pr', 'Pr', 'Prandtl number', 'dimless', 0.71, 0.01, 1000), v('Cf', 'C<sub>f</sub>', 'Skin-friction coefficient', 'dimless', 0.0031836, 1e-8, 1)],
    f: x => [x.St * x.Pr ** (2 / 3), x.Cf / 2],
    about: 'Friction and heat transfer come from the same boundary-layer mixing, so knowing one gives the other.',
    origin: 'Similarity of the momentum and energy boundary-layer equations.',
    assume: ['No pressure gradient', '0.6 < Pr < 60'], typical: '', watch: '', example: '', link: CONV, related: ['churchill'],
  },
  {
    id: 'wien', topic: 'heat', name: 'Wien\'s displacement law', eq: 'λ<sub>max</sub> T = 2898 µm·K', tags: 'blackbody planck peak wavelength radiation',
    vars: [v('lam', 'λ<sub>max</sub>', 'Peak wavelength', 'length', 4.996e-7, 1e-9, 1, { unit: 'mm' }), v('T', 'T', 'Temperature', 'temp', 5800, 1, 1e6)],
    f: x => [x.lam * x.T, 2.897771955e-3],
    about: 'Hotter bodies glow at shorter wavelengths: the Sun peaks in visible light, a room-temperature radiator near 10 µm.',
    origin: 'Maximum of the Planck distribution.', assume: ['Blackbody'], typical: 'Sun 0.50 µm; 300 K: 9.7 µm.', watch: '', example: 'The Sun.', link: RAD, related: ['radiation'],
  },
];
