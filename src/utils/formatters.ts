export function formatNumber(n: number) {
  const sign = n < 0 ? "-" : "";
  const absN = Math.abs(n);
  if (absN >= 1_000_000)
    return sign + (absN / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (absN >= 1_000)
    return sign + (absN / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return sign + absN.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatLabel(label: string) {
  return label
    .replace(/([A-Z])/g, " $1") // Add space before capital letters
    .replace(/^./, (str) => str.toUpperCase());
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  });
}

export function formatPercentage(value: number): string {
  return (value * 100).toFixed(1) + "%";
}
