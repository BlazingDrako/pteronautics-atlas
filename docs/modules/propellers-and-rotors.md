# Propellers & Rotors

[← Back to the README](../../README.md)

Momentum and blade element theory (`js/solvers/rotors.js`, no DOM).

- **Propeller (blade element)**: blade element momentum theory with Prandtl tip loss and swirl from the torque balance, a
  linear-lift airfoil with a stall plateau and a parabolic drag polar, constant-geometric-pitch blades with tapered chord.
  Thrust, power, efficiency, C_T, C_P, C_Q, J and helical tip Mach; the propeller map against advance ratio for three pitches
  (windmilling beyond C_T = 0); thrust and angle of attack along the blade; the blade planform and the velocity triangle at
  0.75R. Examples: Cessna 172, a six-blade turboprop and two drone propellers.
- **Momentum & efficiency**: actuator disk with induced velocity, ideal power and efficiency, slipstream contraction drawn
  from the axial induced-velocity distribution, and propulsive efficiency 2/(1 + uₑ/u) against the jet speed ratio with the
  bands where propellers, turbofans and turbojets operate.
- **Helicopters & drones**: induced (Glauert), profile and parasite power from hover to high speed, best-endurance and
  best-range speeds, figure of merit, blade loading C_T/σ, autorotation descent rates and installed power. Examples: R22,
  UH-60, CH-53E and Ingenuity on Mars. Multirotor hover power and endurance against take-off mass.
