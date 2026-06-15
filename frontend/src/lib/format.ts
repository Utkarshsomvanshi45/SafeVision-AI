export const formatPct = (n: number, digits = 1) =>
  `${Number(n).toFixed(digits)}%`;
export const formatNum = (n: number) => Math.round(Number(n)).toLocaleString();
export const formatConf = (n: number) => Number(n).toFixed(1);
