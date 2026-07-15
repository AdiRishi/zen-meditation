export type Vec3 = readonly [number, number, number];

export function hexToVec3(hex: string): Vec3 {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 0xff) / 255, ((value >> 8) & 0xff) / 255, (value & 0xff) / 255];
}
