// Concept explainers for the Airfoil Lab. Each ties to something visible on screen.
export const concepts = [
  {
    title: 'How an airfoil makes lift',
    html: `<p>The airfoil turns the oncoming air slightly downward. To do that, the flow over the top speeds up and its pressure drops; under the bottom it slows and pressure rises. The pressure difference, summed over the surface, is the lift.</p>
<p>Watch the particles: they race over the top and arrive at the trailing edge sooner than the ones underneath — the "equal transit time" story is a myth.</p>
<span class="eq">L = ½ ρ V∞² · c · cl</span>`,
  },
  {
    title: 'Pressure coefficient, Cp',
    html: `<p>Cp measures local pressure relative to the freestream, scaled by dynamic pressure:</p>
<span class="eq">Cp = (p − p∞) / (½ ρ V∞²) = 1 − (V/V∞)²</span>
<p>Cp = 1 at the stagnation point (flow at rest), 0 where the speed equals the freestream, and negative where the air is faster. Aerodynamicists plot −Cp upward, so the upper-surface "suction" curve sits on top. The area between the two curves is the lift.</p>`,
  },
  {
    title: 'Angle of attack and the lift slope',
    html: `<p>Thin-airfoil theory predicts lift grows by 2π per radian of angle of attack — about 0.11 per degree. Thickness adds a little; viscosity takes a little away. Camber shifts the whole line up, so a cambered airfoil makes lift at α = 0.</p>
<p>Try it: run a polar sweep and compare the slope of the cl–α line with 0.11/deg.</p>`,
  },
  {
    title: 'The boundary layer',
    html: `<p>Right at the surface the air sticks (no-slip). A thin layer — the boundary layer — carries the velocity from zero up to the outer flow speed. The colored band on the airfoil shows its <b>displacement thickness δ*</b>: how far the outer flow is pushed away by the slowed air (exaggerated for visibility).</p>
<p><b>θ</b> (momentum thickness) measures the momentum lost; the <b>shape factor H = δ*/θ</b> describes the velocity profile's fullness. H ≈ 2.6 laminar, ≈ 1.4 turbulent; H rising toward 3–4 warns of separation.</p>`,
  },
  {
    title: 'Laminar, turbulent, transition',
    html: `<p>A laminar boundary layer is smooth and low-friction but fragile. Small disturbances (Tollmien–Schlichting waves) grow as they travel downstream. The <b>eⁿ method</b> tracks their amplification n; when n reaches <b>N-crit</b>, the layer becomes turbulent.</p>
<p>N-crit ≈ 9 matches an average wind tunnel; 11–14 a very quiet sailplane flight; 4–8 dirty or turbulent air. You can also trip the boundary layer at a fixed x/c, like a strip of tape on a model wing.</p>`,
  },
  {
    title: 'Separation and stall',
    html: `<p>Toward the trailing edge the pressure rises again (an adverse pressure gradient). The slow air near the wall can stall against it and reverse direction — the flow <b>separates</b> (skin friction cf &lt; 0, red on the surface).</p>
<p>At high angle of attack separation moves forward, the wake thickens, lift stops growing and drag shoots up: the airfoil stalls. Turbulent layers resist separation better than laminar ones, which is why golf balls have dimples.</p>`,
  },
  {
    title: 'Reynolds number',
    html: `<span class="eq">Re = ρ V c / μ</span>
<p>The ratio of inertial to viscous forces. Small drones and model aircraft fly at 10⁴–10⁵ (thick laminar layers, separation bubbles), light aircraft around 10⁶–10⁷, airliner wings 10⁷–10⁸. Higher Re means thinner boundary layers and lower drag coefficients.</p>`,
  },
  {
    title: 'Where drag comes from',
    html: `<p><b>Friction drag</b>: shear stress in the boundary layer, integrated over the surface. <b>Pressure (form) drag</b>: the boundary layer prevents full pressure recovery at the tail, leaving net rearward force.</p>
<p>Total drag here comes from the momentum deficit in the far wake (Squire–Young formula):</p>
<span class="eq">cd = 2 θ∞/c · (ue/V∞)^((5+H)/2)</span>`,
  },
  {
    title: 'Compressibility and critical Mach',
    html: `<p>As freestream Mach rises, the air compresses and pressure peaks grow. The <b>Kármán–Tsien correction</b> scales the incompressible Cp to account for this.</p>
<p>When local speed somewhere reaches Mach 1 (Cp drops to the critical value Cp*), the freestream Mach is "critical". Beyond it a supersonic pocket forms, ending in a shock wave — the yellow line in the field marks local Mach 1. Transonic airfoils are shaped to keep this pocket weak.</p>`,
  },
  {
    title: 'How this solver works',
    html: `<p>Two models are solved together with Newton's method, the same approach XFOIL uses:</p>
<p>1. A <b>panel method</b> represents the airfoil with ~200 linear-vortex panels; the strengths are chosen so no air passes through the surface and the flow leaves the trailing edge smoothly (Kutta condition).</p>
<p>2. <b>Integral boundary-layer equations</b> (momentum, kinetic energy, and amplification or shear-lag) march along the surface and wake. The boundary layer feeds back by blowing the outer flow outward (source panels).</p>
<p>Ported from <i>mfoil</i> by K. J. Fidkowski (MIT license). The convergence plot shows the Newton residual dropping — quadratically near the end.</p>`,
  },
];

// Concepts for the Supersonic tab.
export const superConcepts = [
  {
    title: 'Why supersonic airfoils are sharp',
    html: `<p>Above Mach 1, air ahead of the airfoil gets no warning that it is coming: pressure waves cannot travel upstream. The flow must turn abruptly at the nose, through a <b>shock wave</b>.</p>
<p>A shock can only turn the flow so far (θmax, about 23° at Mach 2). A sharp nose keeps the turn small, so the shock stays <b>attached</b> and weak. A round nose needs a 90° turn, so a curved <b>bow shock</b> stands off in front of it, with a high-pressure subsonic region behind — lots of wave drag.</p>`,
  },
  {
    title: 'Shock-expansion theory',
    html: `<p>Walk along each surface from the nose:</p>
<p>1. At the nose the surface turns into the flow → an <b>oblique shock</b> (pressure jumps up, Mach drops).<br>
2. Wherever the surface turns away from the flow → a <b>Prandtl–Meyer expansion fan</b> (pressure falls smoothly, Mach rises). Gentle turns toward the flow are treated as smooth compressions.<br>
3. At the trailing edge the two streams meet at different pressures, so one more shock and fan bring them to equal pressure along a <b>slip line</b>.</p>
<p>Each step uses exact gas-dynamics relations, so it is accurate for thin, sharp sections as long as shocks stay attached.</p>`,
  },
  {
    title: 'Linear (Ackeret) theory',
    html: `<p>For thin airfoils and small angles, the pressure depends only on the local surface slope θ:</p>
<span class="eq">Cp = 2θ / √(M² − 1)</span>
<p>That gives simple results: <b>cl = 4α/√(M²−1)</b> (much smaller than the subsonic 2πα), and wave drag <b>cd = 4(α² + K·t²)/√(M²−1)</b>, with K depending on the shape. It breaks down near Mach 1, where √(M²−1) → 0. The dashed lines in the plots show it.</p>`,
  },
  {
    title: 'Wave drag',
    html: `<p>In subsonic flow, an ideal fluid exerts no drag (d'Alembert's paradox). Supersonic flow is different: front-facing surfaces sit behind a shock at high pressure, rear-facing ones in an expansion at low pressure. The net push backward is <b>wave drag</b>, energy carried away by the shock waves.</p>
<p>It has two parts: <b>thickness</b> wave drag (∝ t²) and <b>drag due to lift</b> (∝ α²). Best L/D comes where drag due to lift equals all the zero-lift drag.</p>`,
  },
  {
    title: 'Aerodynamic center moves aft',
    html: `<p>Subsonic airfoils carry lift near the quarter chord. In supersonic flow the lift is spread evenly along the chord (on a flat plate, exactly uniform), so the center of pressure moves back toward <b>mid-chord</b>.</p>
<p>For an aircraft this means a strong nose-down pitching moment when it goes supersonic, which must be trimmed out (Concorde pumped fuel aft to compensate).</p>`,
  },
  {
    title: 'Live CFD (Euler)',
    html: `<p>The CFD option solves the 2-D <b>Euler equations</b> (inviscid compressible flow) on a grid of cells, on your GPU. Each step moves mass, momentum and energy between cells using an approximate Riemann solver (HLLC) with second-order reconstruction.</p>
<p>It handles what simple theory cannot: detached bow shocks on round noses, transonic flow near Mach 1, and waves bending as they interact. It has no viscosity, and shocks are smeared over a few cells; a finer grid makes them sharper.</p>`,
  },
];

// ---- theory tabs ----
export const thinConcepts = [
  { title: 'The thin-airfoil model', html: `<p>Replace the airfoil by a <b>vortex sheet</b> of strength γ(x) along its camber line, in a uniform stream at a small angle α. The sheet must make the camber line a streamline (flow tangency) and leave the sharp trailing edge smoothly (the <b>Kutta condition</b>, γ(c) = 0). With small angles this becomes one integral equation:</p><span class="eq">(1/2π) ∫ γ(ξ) dξ / (x − ξ) = V∞ (α − dz/dx)</span><p>Thickness drops out to first order: it changes the pressures on each surface equally, so it adds no lift.</p>` },
  { title: 'Glauert\'s Fourier solution', html: `<p>Substitute x = (c/2)(1 − cos θ) and write</p><span class="eq">γ(θ) = 2V∞ [ A₀ (1 + cos θ)/sin θ + Σ Aₙ sin nθ ]</span><span class="eq">A₀ = α − (1/π)∫₀^π (dz/dx) dθ,   Aₙ = (2/π)∫₀^π (dz/dx) cos nθ dθ</span><p>Then everything follows from A₀, A₁, A₂:</p><span class="eq">cl = π(2A₀ + A₁),   cm,c/4 = (π/4)(A₂ − A₁),   x_cp = (c/4)[1 + (π/cl)(A₁ − A₂)]</span><p>The lift slope is always 2π per radian, the aerodynamic center is always at the quarter chord, and camber only shifts the zero-lift angle and adds a constant nose-down moment.</p>` },
  { title: 'Zero-lift angle, ideal angle and stability', html: `<p>The <b>zero-lift angle</b> α<sub>L=0</sub> = −(1/π)∫ (dz/dx)(cos θ − 1) dθ weights the camber near the trailing edge most heavily: a small flap changes it a lot.</p><p>At the <b>ideal angle</b> (A₀ = 0) the flow meets the leading edge smoothly, without the 1/√x suction peak; that lift, πA₁, is the <i>design lift coefficient</i> in a NACA 5-digit name.</p><p>For pitch stability on its own, a wing's center of pressure should move aft when the lift drops. A normally cambered airfoil has x_cp behind c/4, moving toward it as lift rises, so its margin (x_ac − x_cp)/c is negative, which is why a flying wing uses a reflexed camber line (Cm,c/4 ≥ 0). Use inverse design to find one.</p>` },
];
export const joukConcepts = [
  { title: 'Conformal mapping', html: `<p>An analytic function z = f(ζ) maps a potential flow in the ζ-plane to another in the z-plane: streamlines map to streamlines, and the complex potential is simply carried over, F(z) = F(ζ(z)). Velocities scale by the map's derivative:</p><span class="eq">W_z = W_ζ / (dz/dζ)</span><p>So if we know the flow round a circle (uniform stream + doublet + vortex), we know it round anything the circle maps to.</p>` },
  { title: 'The Joukowski airfoil', html: `<span class="eq">z = ζ + b²/ζ</span><p>maps a circle centered at the origin of radius b to a flat plate of chord 4b. Moving the center left (−x) makes a symmetric, rounded-nose airfoil; moving it up (+y) adds camber. The circle must pass through ζ = b, which maps to a sharp (cusped) trailing edge.</p><p>There dz/dζ = 0, so the velocity would be infinite unless the circle flow has a stagnation point exactly there. That is the <b>Kutta condition</b>, and it fixes the circulation:</p><span class="eq">Γ = 4πV∞a sin(α + β),   cl ≈ 2π(1 + 0.77 t/c) sin(α + β)</span><p>Thickness raises the lift slope slightly above 2π; camber gives a zero-lift angle −β.</p>` },
];
export const panelConcepts = [
  { title: 'Discrete vortices on the camber line', html: `<p>Split the camber line into N panels. Put a point vortex at each panel's quarter point and require no flow through the camber line at its three-quarter point. That gives N linear equations for the N strengths Γⱼ:</p><span class="eq">Σⱼ aᵢⱼ Γⱼ = −V∞ · nᵢ</span><p>The "1/4–3/4 rule" makes a single panel reproduce the flat-plate result cl = 2π sin α exactly, and with more panels the model converges to thin-airfoil theory for any camber line. It is the 2-D version of the vortex-lattice method.</p>` },
  { title: 'Vortex panel method', html: `<p>To include thickness, cover the actual surface with panels carrying a vortex sheet whose strength varies linearly from node to node. Flow tangency at each panel midpoint gives one equation per panel, and the Kutta condition γ₁ + γ_{N+1} = 0 (equal and opposite strengths at the trailing edge, so the two surfaces leave with the same speed) closes the system. The surface speed equals the local sheet strength, so Cp = 1 − (γ/V∞)².</p><p>This is the inviscid core of XFOIL and of the Analyze tab's solver. The influence matrix is dense: every panel affects every other.</p>` },
];
export const blConcepts = [
  { title: 'Boundary-layer equations', html: `<p>Prandtl's insight: viscosity matters only in a thin layer next to the surface, of thickness δ ~ x/√Re. Inside it, the pressure is imposed by the outer flow (∂p/∂y ≈ 0) and only the y-derivatives of viscous stress count:</p><span class="eq">u ∂u/∂x + v ∂u/∂y = Ue dUe/dx + ν ∂²u/∂y²</span><p>Outside it, the flow is inviscid. The edge velocity Ue(x) from potential flow drives the layer, and a falling Ue (adverse pressure gradient) can stop it near the wall: separation.</p>` },
  { title: 'Similarity: Blasius and Falkner–Skan', html: `<p>When Ue ∝ x^m the profiles at every x have the same shape, f′(η) = u/Ue, and the equations reduce to one ODE:</p><span class="eq">f‴ + f f″ + β(1 − f′²) = 0,   β = 2m/(m + 1)</span><p>β = 0 is the flat plate (Blasius): δ₉₉ = 4.91x/√Re_x, cf = 0.664/√Re_x, H = 2.59. β > 0 (accelerating flow, wedges) gives fuller, thinner profiles; β < 0 gives an inflection point, and at β = −0.1988 the wall shear vanishes: separation.</p>` },
  { title: 'Integral thicknesses and the momentum integral', html: `<span class="eq">δ* = ∫(1 − u/Ue) dy,   θ = ∫(u/Ue)(1 − u/Ue) dy,   H = δ*/θ</span><p>δ* is how far the outer flow is pushed out; θ measures the momentum lost (it gives the drag, D′ = ρUe²θ at the trailing edge). Integrating the boundary-layer equation across the layer gives von Kármán's momentum integral:</p><span class="eq">dθ/dx + (2 + H)(θ/Ue) dUe/dx = cf/2</span><p>Guess a profile shape and it gives δ(x); even a crude guess is within a few percent of Blasius.</p>` },
  { title: 'Thwaites\' method', html: `<p>Thwaites found that laminar boundary layers with pressure gradients follow almost one curve when written in terms of λ = (θ²/ν) dUe/dx. Integrating the momentum equation then gives θ in closed form:</p><span class="eq">θ² = (0.45ν/Ue⁶) ∫₀ˣ Ue⁵ dx</span><p>with H(λ) and the skin friction from correlations, and laminar separation at λ ≈ −0.09. It needs only Ue(x), and it is within a few percent of exact solutions.</p>` },
  { title: 'Turbulent boundary layers', html: `<p>A turbulent layer mixes fast fluid toward the wall: a fuller profile (roughly u/U = (y/δ)^(1/7)), higher wall shear, faster growth (δ ∝ x^0.8), but more resistance to separation. Near the wall it has a universal structure in wall units u⁺ = u/u_τ, y⁺ = y u_τ/ν:</p><span class="eq">u⁺ = y⁺ (viscous sublayer, y⁺ < 5),   u⁺ = (1/κ) ln y⁺ + B (log layer, y⁺ > 30)</span><p>with κ ≈ 0.41, B ≈ 5. Plate skin friction: Cf ≈ 0.074/Re_L^0.2, minus a correction for the laminar part ahead of transition.</p>` },
];
