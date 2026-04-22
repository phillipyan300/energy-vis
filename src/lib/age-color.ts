/**
 * Sequential ramp: young fleet (cool) → old fleet (warm). Used for map points & ISO fill.
 */
export function ageToRgba(
  ageYears: number,
  alpha: number,
  minAge = 0,
  maxAge = 50,
): [number, number, number, number] {
  const t = Math.max(0, Math.min(1, (ageYears - minAge) / (maxAge - minAge || 1)));
  // Blue (#38bdf8) → amber (#fbbf24) → rose (#fb7185)
  const c0 = [56, 189, 248];
  const c1 = [251, 191, 36];
  const c2 = [251, 113, 133];
  let r: number;
  let g: number;
  let b: number;
  if (t < 0.5) {
    const u = t * 2;
    r = Math.round(c0[0] + (c1[0] - c0[0]) * u);
    g = Math.round(c0[1] + (c1[1] - c0[1]) * u);
    b = Math.round(c0[2] + (c1[2] - c0[2]) * u);
  } else {
    const u = (t - 0.5) * 2;
    r = Math.round(c1[0] + (c2[0] - c1[0]) * u);
    g = Math.round(c1[1] + (c2[1] - c1[1]) * u);
    b = Math.round(c1[2] + (c2[2] - c1[2]) * u);
  }
  return [r, g, b, alpha];
}
