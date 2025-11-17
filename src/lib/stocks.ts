const API_KEY = process.env.NEXT_PUBLIC_FMP_API_KEY;
const BASE_URL = "https://financialmodelingprep.com/stable";

export async function searchStock(query: string) {
  if (!query) return [];
  const res = await fetch(
    `${BASE_URL}/search-symbol?query=${query}&limit=10&apikey=${API_KEY}`
  );
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export async function getCompanyProfile(symbol: string) {
  const res = await fetch(
    `${BASE_URL}/profile?symbol=${symbol}&apikey=${API_KEY}`
  );
  if (!res.ok) throw new Error("Profile fetch failed");
  const data = await res.json();
  return data[0];
}

export async function getKeyMetrics(symbol: string) {
  const res = await fetch(
    `${BASE_URL}/key-metrics-ttm?symbol=${symbol}&apikey=${API_KEY}`
  );
  if (!res.ok) throw new Error("Key metrics fetch failed");
  const data = await res.json();
  return data[0];
}

export async function getFinancialRatios(symbol: string) {
  const res = await fetch(
    `${BASE_URL}/ratios-ttm?symbol=${symbol}&apikey=${API_KEY}`
  );
  if (!res.ok) throw new Error("Ratios fetch failed");
  const data = await res.json();
  return data[0];
}

export async function getIncomeStatements(symbol: string) {
  const res = await fetch(
    `${BASE_URL}/income-statement?symbol=${symbol}&period=annual&limit=5&apikey=${API_KEY}`
  );
  if (!res.ok) throw new Error("Income statements fetch failed");
  return res.json();
}

export async function getHistoricalPrice(symbol: string) {
  const res = await fetch(
    // Note: Might need to confirm if /historical-price-full is under "stable" or "api/v3"
    `${BASE_URL}/historical-price-eod/light?symbol=${symbol}&apikey=${API_KEY}`
  );
  if (!res.ok) throw new Error("Historical price fetch failed");
  const data = await res.json();
  return data?.reverse() || [];
}
