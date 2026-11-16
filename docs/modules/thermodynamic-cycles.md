# Thermodynamic Cycles

[← Back to the README](../../README.md)

The cycles behind every heat engine, on p–v and T–s diagrams (`js/solvers/heatEngines.js`, no DOM).

- **Piston engines**: ideal Otto (spark) and Diesel (compression) cycles in a running four- or two-stroke cylinder, with the
  gas colored by temperature and a dot following the piston on the p–v and T–s diagrams. Heat release from the fuel's heating
  value and equivalence ratio, imep (with the lecture's nondimensional form), air flow ṁₐ = nρV_d/α, shaft power, BSFC, a
  real-engine factor (≈ 0.6 of ideal) and knock or ignition checks on the end-of-compression temperature. Superchargers and
  turbochargers with intercooling and a manifold-pressure limit (critical altitude), with power against altitude. Examples:
  Lycoming O-360, Rotax 912, R-1830 Twin Wasp, Packard Merlin (P-51), Centurion 2.0 diesel and a two-stroke.
- **Gas turbines (Brayton)**: compressor and turbine efficiencies, regenerator effectiveness, intercooled compression and
  reheated expansion in up to six stages. T–s diagram against the ideal cycle, efficiency, net work and back-work ratio
  against pressure ratio, the maximum-work pressure ratio (T₃/T₁)^(γ/2(γ−1)), the Carnot/Ericsson limit, and a table of what
  each improvement adds.
- **Pulse & Humphrey**: constant-volume combustion (pulsejets and pulse detonation engines) against Brayton at the same heat
  input or peak temperature, with efficiency and net work against mechanical compression down to none at all.
- **Gas properties**: cv, cp and γ from translational, rotational and vibrational degrees of freedom (Einstein functions) for
  nine gases; mixtures by moles or mass; the Peng–Robinson compressibility factor with ideal vs real density and tank mass.

Validated against the lecture examples: Humphrey η = 0.40371 vs Brayton 0.17966 at p₂/p₁ = 2; the R-1830 air flow
0.82627 kg/s; the 1900/300 K Brayton optimum; γ = 1.625 for 9 mol He + 1 mol N₂.
