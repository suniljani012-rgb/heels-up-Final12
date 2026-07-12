export const formatSizeToIndian = (size: string | number | null | undefined): string => {
  if (size === null || size === undefined) return 'Default';
  const s = String(size).trim();
  if (s === '36') return '3';
  if (s === '37') return '4';
  if (s === '38') return '5';
  if (s === '39') return '6';
  if (s === '40') return '7';
  if (s === '41') return '8';
  if (s === '42') return '9';
  if (/^\d+(\.\d+)?$/.test(s)) {
    return s;
  }
  return s;
};
