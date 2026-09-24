// undefined means a partial UPDATE that leaves the field alone
export const validInt = (value: number | null | undefined, min: number, max = Infinity) =>
  value === undefined ||
  (typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max);

export const titleCase = (text: string) =>
  text
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
