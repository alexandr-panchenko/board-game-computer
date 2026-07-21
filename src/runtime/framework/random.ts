export const PRNG_VERSION = "xorshift32-v1";

export function seedFromText(seed: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value === 0 ? 0x9e3779b9 : value;
}

export function nextRandom(state: number): { state: number; value: number } {
  let next = state >>> 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  next >>>= 0;
  if (next === 0) next = 0x9e3779b9;
  return { state: next, value: next / 0x1_0000_0000 };
}
