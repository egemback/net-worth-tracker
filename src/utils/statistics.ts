export function calculateVaRAndES(
  values: number[],
  pValues = [0.9, 0.95, 0.99]
) {
  if (!values || values.length === 0) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  return pValues.map((p) => {
    const cutoff = Math.floor((1 - p) * n);
    const VaR = sorted[cutoff];
    const tail = sorted.slice(0, cutoff + 1);
    const ES =
      tail.length > 0 ? tail.reduce((a, b) => a + b, 0) / tail.length : VaR;
    return { p, VaR, ES };
  });
}
