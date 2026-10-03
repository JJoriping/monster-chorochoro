/** 値を [min, max] の範囲に収める */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
