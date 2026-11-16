# Airfoil Lab

[← Back to the README](../../README.md)

- Solver: JavaScript port of **mfoil** (K. J. Fidkowski, MIT license; see `LICENSE-mfoil.txt`):
  linear-vortex panel method coupled to an integral boundary layer with eⁿ transition, solved with
  Newton's method (the XFOIL approach). Includes forced transition, Kármán–Tsien compressibility, target-cl mode, flaps.
- Flow field is evaluated on the GPU (WebGL2) per pixel with the same panel formulas: pressure or speed
  color, streamlines (stream-function contours), sonic line, animated particles. Exact hover readouts.
- **Supersonic tab** (`js/solvers/supersonic.js`, `js/modules/airfoil/supersonicTab.js`): shock-expansion theory on sharp
  sections (diamond, hexagonal, biconvex, flat plate) with linear/Busemann comparison and a compressible skin-friction
  estimate, or live 2-D Euler CFD (shared with Shocks & Nozzles) for any airfoil, including round-nose NACA sections.
- **Thin airfoil tab** (`js/solvers/airfoilTheory.js`, `js/modules/airfoil/thinTab.js`): Glauert's thin-airfoil theory on
  a NACA 4/5-digit, parabolic, flapped or hand-drawn piecewise camber line (exact segment integrals), or inverse design
  of a cubic camber line for a target cl and Cm,c/4. Fourier coefficients, cl, Cm, center of pressure and stability
  margin, zero-lift and ideal angles, chordwise loading (with 20 discrete vortices for comparison), dz/dx against its
  truncated series, and the vortex panel method on the real NACA section to show the thickness effect.
- **Joukowski tab**: drag the circle's center in the ζ-plane; the airfoil, streamlines and Cp follow in the z-plane,
  with the Kutta circulation (or none), exact lift (Kutta–Joukowski and pressure integration agree), thickness,
  zero-lift angle and moment.
- **Vortex panels tab**: the discrete (lumped) vortex model on the camber line with the 1/4–3/4 rule, or linear-strength
  vortex panels on the surface (Kuethe & Chow) for a NACA section or a triangle; strengths and normals on the geometry,
  the influence matrix as a heat map (with values for small N), surface or chordwise pressure, and convergence with N.
- **Boundary layer tab** (`js/solvers/boundaryLayer.js`): Falkner–Skan similarity profiles by shooting (Blasius at
  β = 0, to separation at β = −0.1988) in real units; the momentum integral with five assumed profiles against
  Blasius; Thwaites' method on any typed edge velocity with laminar separation (flat plate, stagnation, Howarth,
  cylinder, converging channel); turbulent layers (1/7 power law against Blasius, Spalding's law of the wall, plate
  friction with transition) and fuselage friction drag by the flat-plate analogy at any altitude.
- Coupled Newton system is solved with a structured elimination (delta* swapped for mass m = ue·delta*), which gives
  the same answer as a dense solve, about 3–5× faster in practice.

## Vehicle aero tab

- **What it is**: side profiles of a 2022+ Formula 1 car, a GT3-class race car, a Golf Mk2-class hatchback, an A320-class
  airliner, an F-16-class fighter and an AIM-9 Sidewinder missile (`#/airfoil?tab=vehicles&v=f1`). Outlines were measured
  from the side-view images in `assets/Vehicle profiles/` and scaled to published lengths, wheelbases and heights; they are
  drawn in the Airfoil Lab's style (same pressure color scale, gray bodies, plain arrows). Streamlines, moving particles and
  pressure colors show the flow; arrows show the vertical force on each part in kilograms or kilonewtons, each ending where
  that part's force acts (car bodies are split into upper-surface lift and underside suction). Sliders: speed, ride height
  and wing angles for cars; angle of attack, speed, altitude, load factor and a near-the-runway switch for planes; canard
  deflection for the missile (sliced through its canards and tail fins, subsonic speeds only).
  A Units switch shows everything in US units (mph, lb, lbf, ft, in, hp; the default) or metric; the choice is
  remembered in the browser (`js/modules/airfoil/vehicleUnits.js`). Calculations always run in SI.
- **Computed** (`js/solvers/panel2d.js`): an inviscid Hess–Smith panel method for several bodies at once (constant sources
  on every panel, a vortex and a Kutta condition per wing element), with the road as a mirror image (a rolling road).
  Panels are resampled finer close to the ground. The F1 floor is the roof of its venturi tunnels.
- **Real units**: each race car's effective width (F1 ≈ 0.53 m, GT ≈ 0.33 m) is set so its default setup matches its
  published C_L·A (≈ 4.5 m² and ≈ 2.2 m²); sliders then change the force as computed. The road car uses their average.
  Planes and the missile: lift = load factor × weight, split between wing and tail (or canards and tail fins) as computed, with ISA density, required C_L, stall margin
  and a simple drag polar. Car drag is a published typical C_D·A.
- **Drawn, not computed**: wakes, wheels and wing mounts (beside the center-line slice), and the planes' fuselage, fin and
  engine (beside the slice through the wing and tailplane), and the missile's body and vertical fins. No viscosity, so no separation, stall or computed drag; the road
  car's smooth-floor downforce is explained against the slight lift of real road cars.
