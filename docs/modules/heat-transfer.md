# Heat Transfer

[← Back to the README](../../README.md)

Conduction, convection and radiation (`js/solvers/heatTransfer.js`, no DOM).

- **Conduction**: plane, cylindrical or spherical walls of up to four layers from a library of materials, between fixed
  surface temperatures or fluids, with optional radiation from the outer surface (iterated). Temperature profile, interface
  temperatures, the thermal-resistance network with each resistance's share of the temperature drop, and the critical radius
  of insulation. Examples: copper slab and tube (lecture 18), compound wall, a regeneratively cooled nozzle wall, an
  insulated pipe, a Shuttle tile.
- **Convection**: flat plate (laminar and mixed), cylinder (Churchill–Bernstein), sphere (Whitaker) and pipe (laminar,
  Gnielinski, Dittus–Boelter) with temperature-dependent properties of air, water, oil and hydrogen at the film temperature;
  Nu against Re, h against speed for every fluid, and the Chilton–Colburn analogy St·Pr^⅔ = C_f/2.
- **Radiation**: the Planck spectrum with Wien's peak and the fraction of emission in any band; two gray surfaces (parallel
  plates, concentric cylinders or spheres) with radiation shields; radiative equilibrium with solar absorptivity and infrared
  emissivity; view factors for coaxial disks, parallel and perpendicular rectangles and a sphere to a disk; an emissivity table.
