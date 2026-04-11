export interface FractalImage {
  size: number;
  data: boolean[][];
}

export function createEmptyImage(size: number): FractalImage {
  const data = Array(size).fill(0).map(() => Array(size).fill(false));
  return { size, data };
}
