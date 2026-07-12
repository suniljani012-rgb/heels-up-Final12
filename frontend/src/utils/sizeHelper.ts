export const formatSizeToIndian = (size: string | number | null | undefined): string => {
  if (size === null || size === undefined) return 'Default';
  const s = String(size).trim();
  if (s === '36') return 'IND 3';
  if (s === '37') return 'IND 4';
  if (s === '38') return 'IND 5';
  if (s === '39') return 'IND 6';
  if (s === '40') return 'IND 7';
  if (s === '41') return 'IND 8';
  if (s === '42') return 'IND 9';
  if (/^\d+(\.\d+)?$/.test(s)) {
    return `IND ${s}`;
  }
  return s;
};
