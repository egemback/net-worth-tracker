// --- CACHING MECHANISM SETUP ---
const CACHE_PREFIX = "FMP_API_CACHE_";

/**
 * Wraps an async function with caching logic.
 * @param fn The async function to cache.
 * @param functionName A unique name for the function.
 * @param isCacheable A function to determine if the result should be cached (e.g., only if successful).
 */
function cachingWrapper<A extends any[], R>(
  fn: (...args: A) => Promise<R>,
  functionName: string,
  ttl: number = 3600000 // Default to 1 hour (in milliseconds)
): (...args: A) => Promise<R> {
  return async (...args: A): Promise<R> => {
    // 1. Create a unique storage key
    const uniqueKey = `${CACHE_PREFIX}${functionName}_${JSON.stringify(args)}`;

    // 2. Check persistent storage (localStorage)
    const cachedItem = localStorage.getItem(uniqueKey);

    if (cachedItem) {
      const { timestamp, data } = JSON.parse(cachedItem);

      // Check for staleness (TTL)
      if (Date.now() < timestamp + ttl) {
        console.log(`[Cache Hit - Persistent] for ${uniqueKey}`);
        return data as R;
      } else {
        // Cache is stale, remove it
        console.log(`[Cache Stale] Clearing ${uniqueKey}`);
        localStorage.removeItem(uniqueKey);
      }
    }

    // 3. Execute original function (Cache Miss/Stale)
    console.log(`[Cache Miss] Calling API for ${uniqueKey}`);
    const result = await fn(...args);

    // 4. Cache the successful result with a timestamp
    const itemToStore = {
      timestamp: Date.now(),
      data: result,
    };
    localStorage.setItem(uniqueKey, JSON.stringify(itemToStore));

    return result;
  };
}

const API_KEY = process.env.NEXT_PUBLIC_FMP_API_KEY;
const BASE_URL = "https://financialmodelingprep.com/stable";

async function _searchStock(query: string) {
  if (!query) return [];
  const res = await fetch(
    `${BASE_URL}/search-symbol?query=${query}&limit=10&apikey=${API_KEY}`
  );
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

async function _getCompanyProfile(symbol: string) {
  const res = await fetch(
    `${BASE_URL}/profile?symbol=${symbol}&apikey=${API_KEY}`
  );
  if (!res.ok) throw new Error("Profile fetch failed");
  const data = await res.json();
  return data[0];
}

async function _getKeyMetrics(symbol: string) {
  const res = await fetch(
    `${BASE_URL}/key-metrics-ttm?symbol=${symbol}&apikey=${API_KEY}`
  );
  if (!res.ok) throw new Error("Key metrics fetch failed");
  const data = await res.json();
  return data[0];
}

async function _getFinancialRatios(symbol: string) {
  const res = await fetch(
    `${BASE_URL}/ratios-ttm?symbol=${symbol}&apikey=${API_KEY}`
  );
  if (!res.ok) throw new Error("Ratios fetch failed");
  const data = await res.json();
  return data[0];
}

async function _getIncomeStatements(symbol: string) {
  const res = await fetch(
    `${BASE_URL}/income-statement?symbol=${symbol}&period=annual&limit=5&apikey=${API_KEY}`
  );
  if (!res.ok) throw new Error("Income statements fetch failed");
  return res.json();
}

async function _getHistoricalPrice(symbol: string) {
  const res = await fetch(
    // Note: Might need to confirm if /historical-price-full is under "stable" or "api/v3"
    `${BASE_URL}/historical-price-eod/light?symbol=${symbol}&apikey=${API_KEY}`
  );
  if (!res.ok) throw new Error("Historical price fetch failed");
  const data = await res.json();
  return data?.reverse() || [];
}

// Apply the caching wrapper to the original function
export const searchStock = cachingWrapper(_searchStock, "searchStock");
export const getCompanyProfile = cachingWrapper(
  _getCompanyProfile,
  "getCompanyProfile"
);
export const getKeyMetrics = cachingWrapper(_getKeyMetrics, "getKeyMetrics");
export const getFinancialRatios = cachingWrapper(
  _getFinancialRatios,
  "getFinancialRatios"
);
export const getIncomeStatements = cachingWrapper(
  _getIncomeStatements,
  "getIncomeStatements"
);
export const getHistoricalPrice = cachingWrapper(
  _getHistoricalPrice,
  "getHistoricalPrice"
);
