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

export function formatCurrency(
  amount: number,
  currency: string = "SEK",
  decimals: number = 2
): string {
  return amount.toLocaleString("sv-SE", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: decimals,
  });
}

export function formatPercentage(
  value: number | string,
  decimals: number = 2
): string {
  if (typeof value === "string") {
    const num = parseFloat(value);
    if (isNaN(num)) return "N/A";
    value = num;
  }
  return (value * 100).toFixed(decimals) + "%";
}

export function formatNumberRaw(n: number, decimals: number = 2): string {
  return n.toLocaleString("sv-SE", {
    maximumFractionDigits: decimals,
  });
}

export function parsePercentage(str: string): number | null {
  const cleaned = str.replace("%", "").trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  return num / 100;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
  });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function parseCurrency(str: string): number | null {
  const cleaned = str
    .replace(new RegExp(`[^0-9,.-]`, "g"), "") // Remove currency symbols and letters
    .replace(/\./g, "") // Remove thousand separators
    .replace(/,/g, "."); // Replace decimal comma with dot
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  return num;
}

export function formatLargeNumber(n: number): string {
  if (n >= 1_000_000_000)
    return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (n >= 1_000_000)
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toString();
}
