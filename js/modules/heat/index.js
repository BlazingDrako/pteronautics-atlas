// Heat Transfer module: conduction, convection and radiation.
import { tabbedModule } from '../../lib/tabbed.js';

export const concepts = [
  { title: 'Three ways heat moves', html: '<p><b>Conduction</b>: through a solid (or still fluid) by molecular collisions, q = −k dT/dx. <b>Convection</b>: carried away by a moving fluid, q = h(T_s − T_∞). <b>Radiation</b>: emitted as electromagnetic waves by every surface, q = εσT⁴, and the only way to lose heat in space. In a rocket nozzle wall all three act in series: hot gas convects and radiates to the wall, the wall conducts, the coolant convects it away.</p>' },
  { title: 'The heat diffusion equation', html: '<p>Energy conservation in a small volume with Fourier\'s law gives</p><span class="eq">ρc ∂T/∂t = ∇·(k∇T) + q̇</span><p>With constant k, α = k/(ρc) is the thermal diffusivity: how quickly a temperature change spreads. In steady state without generation, T is linear through a plane wall, logarithmic in a cylinder wall and varies as 1/r in a spherical shell.</p>' },
  { title: 'Thermal resistance', html: '<p>Steady heat flow behaves like current in a circuit: Q = ΔT / R_total, with resistances in series adding up:</p><span class="eq">plane: L/(kA)   cylinder: ln(r₂/r₁)/(2πkL)   sphere: (1/r₁ − 1/r₂)/(4πk)   surface: 1/(hA)</span><p>The largest resistance controls the heat flow and takes the largest temperature drop.</p>' },
  { title: 'Boundary layers and the Nusselt number', html: '<p>Next to a surface the fluid forms a velocity boundary layer (thickness δ) and a thermal boundary layer (δ_T). Their ratio is set by the <b>Prandtl number</b> Pr = ν/α (0.7 for gases, 7 for water, hundreds for oil). The <b>Nusselt number</b> Nu = hL/k is the dimensionless heat transfer coefficient, found from correlations Nu = f(Re, Pr).</p>' },
  { title: 'The Reynolds analogy', html: '<p>Momentum and heat diffuse through a boundary layer by the same mechanisms, so friction and heat transfer are linked:</p><span class="eq">St = h/(ρVcp) = Cf/2   (Pr = 1);   St·Pr^(2/3) = Cf/2   (Chilton–Colburn)</span><p>Measure the drag and you know the heating. This is why the Bartz equation for rocket nozzles looks like a pipe-flow correlation.</p>' },
  { title: 'Blackbody radiation', html: '<p>A blackbody emits the Planck spectrum, peaking at λ_max·T = 2898 µm·K (Wien) and totaling E_b = σT⁴ (Stefan–Boltzmann, σ = 5.67×10⁻⁸ W/m²K⁴). The Sun at 5800 K peaks in visible light; a 300 K spacecraft radiator peaks near 10 µm in the infrared. Real surfaces emit ε E_b, and coatings with low solar absorptivity but high infrared emissivity (white paint) keep spacecraft cool.</p>' },
  { title: 'View factors and enclosures', html: '<p>The view factor F₁₂ is the fraction of radiation leaving surface 1 that reaches surface 2 directly. Reciprocity A₁F₁₂ = A₂F₂₁ and the summation rule ΣF = 1 let you find the rest. For two gray surfaces the exchange is</p><span class="eq">q = σ(T₁⁴ − T₂⁴) / [(1−ε₁)/ε₁ + 1/F₁₂ + (A₁/A₂)(1−ε₂)/ε₂]</span><p>A thin low-emissivity shield between them roughly halves the exchange; multilayer insulation stacks dozens.</p>' },
];

export const heatModule = tabbedModule({
  id: 'heat', title: 'Heat Transfer',
  sub: 'Conduction through walls, convection from flows, and radiation between surfaces',
  concepts,
  tabs: [
    { id: 'conduction', label: 'Conduction', load: () => import('./conductionTab.js').then(m => m.conductionTab) },
    { id: 'convection', label: 'Convection', load: () => import('./convectionTab.js').then(m => m.convectionTab) },
    { id: 'radiation', label: 'Radiation', load: () => import('./radiationTab.js').then(m => m.radiationTab) },
  ],
});
