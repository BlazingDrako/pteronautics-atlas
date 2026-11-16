# Fluid Flow Sandbox

[← Back to the README](../../README.md)

- **Solver**: lattice Boltzmann (D2Q9, BGK) running in WebGL2 fragment shaders (`js/modules/cfd/lbmGL.js`), with a CPU
  reference of the same algorithm in `js/solvers/lbm.js`. Obstacles are halfway bounce-back walls that can move (the wall
  velocity is added to the reflected populations); jet nozzles hold their cells at a set velocity. Inflow, open inlet at rest,
  zero-gradient outflow, slip, no-slip, sliding-lid and periodic boundaries; Smagorinsky turbulence model; Guo body force.
  Changing Re changes the viscosity live, without restarting.
- **Scenes** (`#/cfd?s=…`): cylinder, square, flat plate, triangle, NACA airfoil, two cylinders in tandem, channel (Poiseuille)
  flow, backward-facing step, lid-driven cavity, jet into still fluid, two colliding jets and an empty wind tunnel. Grids from
  ~43k to ~390k cells keep each scene's shape; steps per frame are set from a quick timing of your GPU.
- **Drawing** (`js/modules/cfd/shapes.js`): place circles, squares, plates, triangles and NACA 4-digit airfoils; paint and erase
  walls; drag any obstacle through the flow (it pushes the fluid as it moves); edit size, angle (angle of attack) and NACA code;
  stir the fluid with the mouse; click to place dye sources. Drawings are kept on restart and scaled when the grid changes.
- **Measurements** (`js/modules/cfd/measureUI.js`, `measure.js`): drag and lift coefficients on every movable obstacle over time by
  momentum exchange (computed per wall cell on the GPU), mean C_D, lift amplitude and Strouhal number from the lift's zero
  crossings, lift-to-drag for airfoils; up to four probes with time histories and spectra (peak interpolated between bins);
  a velocity profile along a line you draw (with the exact Poiseuille profile in the channel); CSV export of each.
  Notes compare the cylinder with White's drag fit and Williamson's Strouhal fit, and the airfoil with thin-airfoil theory.
- **Absorbing layers** along slip walls and the outlet relax the density to its free-stream value, so sound waves are not
  trapped between the walls (without them a lifting airfoil pumps up a standing acoustic wave).
- **Sharing**: "Copy link" packs the scene, Re, grid, view, obstacles, painted walls (run-length encoded), probes, line, dye sources
  and turbulence setting into the URL (`js/modules/cfd/share.js`); positions are fractions of the grid height, so a link works
  at any grid size. "Save image" downloads a PNG of the flow with a caption.
- **Robustness**: drawing pauses while the flow is scrolled off screen (the solver keeps running so the plots stay live); if
  the GPU resets, the solver is rebuilt and the flow restarts. On phones the flow is shown first, right under the title.
- **Views**: dye (inlet streaks, dye from surfaces and jets, dye sources), vorticity, speed and pressure coefficient, each with
  a legend; light and dark themes.
- **Learning**: notes for each scene at the current Re (regimes, separation, stall, Strouhal numbers, Poiseuille, reattachment,
  jet instability), resolution and stability warnings, and concept cards.

## Theory tabs

- **Potential flow** (`js/solvers/flow.js`, `js/modules/cfd/potentialTab.js`): superpose a uniform stream, sources,
  sinks, vortices and doublets and drag them in the picture, or type any complex potential F(z) (names other than z
  become parameters with sliders; expressions are compiled by `js/lib/expr.js`, no `eval`). A ground plane at y = 0 adds
  the image system. Streamlines (ψ contours by marching squares, skipping log branch cuts), equipotentials, Cp or speed
  color, velocity arrows and drifting particles. Stagnation points by Newton on the analytic W = dF/dz (and by sign
  changes of u along the ground) with the dividing streamline through them; the force by Blasius' theorem (zero drag for a
  closed body, the Kutta–Joukowski lift), or from the roof pressure for the hangar; surface Cp against theory; a probe.
  Presets: cylinder, lifting cylinder, Rankine oval and half-body, hangar, vortex near the ground, source near a wall,
  tornado, vortex pair, source–sink pair, and typed corner, wedge and vortex-row flows.
- **Viscous flows** (`js/modules/cfd/viscousTab.js`): Couette–Poiseuille flow between plates (with the backflow
  criterion P < −1), Hagen–Poiseuille pipe flow, start-up Couette flow by its Fourier series, and Stokes' first and
  second problems, animated, with velocity and shear-stress profiles for water, air, oil, glycerin or honey.

While a theory tab is open, the live solver is paused where it was.
