/* ================================
   options.ts — Options Pricing
   ================================ */

import { normalCDF } from "./statistics";

export const bsCall = (
  S: number,
  K: number,
  r: number,
  sigma: number,
  T: number
) => {
  const d1 =
    (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
};

export const bsPut = (
  S: number,
  K: number,
  r: number,
  sigma: number,
  T: number
) => {
  const d1 =
    (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
};
