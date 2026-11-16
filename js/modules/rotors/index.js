// Propellers & Rotors module: momentum theory and propulsive efficiency, blade element momentum theory, and
// rotorcraft (helicopter hover, forward flight and autorotation; multirotor drones).
import { tabbedModule } from '../../lib/tabbed.js';

export const concepts = [
  { title: 'Thrust and propulsive efficiency', html: '<p>Any propulsor makes thrust by speeding up a stream of air from u to uₑ: T = ṁ(uₑ − u). Only part of the jet power ½ṁ(uₑ² − u²) is useful (T·u); the rest is left behind as kinetic energy in the wake:</p><span class="eq">η_p = T u / [½ṁ(uₑ² − u²)] = 2 / (1 + uₑ/u)</span><p>Efficiency is best when the jet is only a little faster than flight: move a lot of air gently. That is the whole argument for propellers and high-bypass turbofans over turbojets and rockets.</p>' },
  { title: 'Actuator disk (momentum theory)', html: '<p>Treat the propeller as a thin disk that adds pressure. Half of the final velocity increase happens before the disk and half after, so with induced velocity vᵢ at the disk:</p><span class="eq">T = 2ρA vᵢ (V + vᵢ),   P_ideal = T (V + vᵢ),   η_ideal = V/(V + vᵢ)</span><p>In hover (V = 0) the ideal power is T^(3/2)/√(2ρA): low disk loading T/A means low power, which is why helicopters have huge rotors.</p>' },
  { title: 'Blade element theory', html: '<p>Each blade section is an airfoil meeting the air at the vector sum of forward speed plus induced inflow (axial) and Ωr (tangential). Its lift and drag, resolved along and across the axis, give thrust and torque. The section pitch β minus the inflow angle φ is its angle of attack. Combining this with momentum theory for each annulus (BEMT), and Prandtl\'s tip-loss factor, predicts thrust, power and the load along the blade.</p>' },
  { title: 'Why propellers are twisted', html: '<p>Blade speed Ωr grows with radius while forward speed is the same everywhere, so the inflow angle φ = atan(V/Ωr) is steep at the hub and shallow at the tip. For every section to work near its best angle of attack, the blade pitch must follow: a constant geometric pitch p (the distance the blade would advance in one turn, like a screw) needs tan β = p/(2πr).</p>' },
  { title: 'Coefficients and the advance ratio', html: '<p>Dimensional analysis (lecture 4) collapses propeller performance onto curves of the advance ratio J = V/(nD):</p><span class="eq">C_T = T/(ρn²D⁴),   C_P = P/(ρn³D⁵),   η = J·C_T/C_P</span><p>As J rises the blade angle of attack falls; thrust drops to zero and then reverses (windmilling). Variable-pitch propellers turn the blades to stay near peak efficiency at every speed.</p>' },
  { title: 'Hover, figure of merit and autorotation', html: '<p>A rotor\'s <b>figure of merit</b> FM = P_ideal/P_actual compares it with a perfect actuator disk; good rotors reach 0.7–0.8. In forward flight the induced power falls (more air passes through the disk) while profile and parasite power rise, giving a bucket-shaped power curve: minimum power sets endurance, the tangent from the origin sets best range. If the engine fails, the rotor can be driven by air flowing up through it: <b>autorotation</b>, descending at roughly P_min/W in forward flight.</p>' },
];

export const rotorsModule = tabbedModule({
  id: 'rotors', title: 'Propellers & Rotors',
  sub: 'Momentum and blade element theory for propellers, helicopter rotors and drones',
  concepts,
  tabs: [
    { id: 'bemt', label: 'Propeller (blade element)', load: () => import('./bemtTab.js').then(m => m.bemtTab) },
    { id: 'momentum', label: 'Momentum & efficiency', load: () => import('./momentumTab.js').then(m => m.momentumTab) },
    { id: 'rotorcraft', label: 'Helicopters & drones', load: () => import('./rotorcraftTab.js').then(m => m.rotorcraftTab) },
  ],
});
