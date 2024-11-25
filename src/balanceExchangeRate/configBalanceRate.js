export function getMaxAmount(numberDifferenceHalf) {
  if (numberDifferenceHalf > 50000) return { max: 1000 };
  if (numberDifferenceHalf > 30000) return { max: 800 };
  if (numberDifferenceHalf > 25000) return { max: 600 };
  if (numberDifferenceHalf > 20000) return { max: 500 };
  if (numberDifferenceHalf > 15000) return { max: 400 };
  if (numberDifferenceHalf > 10000) return { max: 300 };
  if (numberDifferenceHalf > 8000) return { max: 250 };
  if (numberDifferenceHalf > 6000) return { max: 200 };
  if (numberDifferenceHalf > 5000) return { max: 150 };
  if (numberDifferenceHalf > 4000) return { max: 100 };
  if (numberDifferenceHalf > 3000) return { max: 80 };
  return { max: 50 };
}

export const UPPER_BOUND_PRICE_LCR = 1.03;
export const LOWER_BOUND_PRICE_LCR = 0.97;
