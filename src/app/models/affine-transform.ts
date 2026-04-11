export interface AffineTransform {
  transformname: string;
  m00: number; // ScaleX * cos(theta)
  m01: number; // -ScaleX * sin(theta)
  m02: number; // TranslateX
  m10: number; // ScaleY * sin(theta)
  m11: number; // ScaleY * cos(theta)
  m12: number; // TranslateY
}

export function createIdentity(name: string = ''): AffineTransform {
  return {
    transformname: name,
    m00: 1, m01: 0, m02: 0,
    m10: 0, m11: 1, m12: 0
  };
}
