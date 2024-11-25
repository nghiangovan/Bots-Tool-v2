export const adjacentDumbersDivByFour = number => {
  const remainder = number % 4;
  const start = number - remainder;
  return [start, start + 1, start + 2, start + 3];
};

export const alternateMerge = (arr1, arr2) => {
  let result = [];
  let i = 0,
    j = 0;

  while (i < arr1.length || j < arr2.length) {
    if (i < arr1.length) {
      result.push(arr1[i++]);
    }
    if (j < arr2.length) {
      result.push(arr2[j++]);
    }
  }

  return result;
};

export const hasDecimal = number => {
  const decimalPart = number.toString().split('.')[1];
  return decimalPart?.length;
};
