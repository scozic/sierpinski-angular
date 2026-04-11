import { Injectable } from '@angular/core';
import { AffineTransform, createIdentity } from '../models/affine-transform';
import { Fractal } from '../models/fractal';

@Injectable({
  providedIn: 'root'
})
export class FractalService {

  constructor() { }

  /**
   * Concatenates two affine transforms (matrix product trx1 * trx2).
   */
  concatenate(trx1: AffineTransform, trx2: AffineTransform): AffineTransform {
    return {
      transformname: `${trx1.transformname}*${trx2.transformname}`,
      m00: trx1.m00 * trx2.m00 + trx1.m01 * trx2.m10,
      m01: trx1.m00 * trx2.m01 + trx1.m01 * trx2.m11,
      m02: trx1.m00 * trx2.m02 + trx1.m01 * trx2.m12 + trx1.m02,
      m10: trx1.m10 * trx2.m00 + trx1.m11 * trx2.m10,
      m11: trx1.m10 * trx2.m01 + trx1.m11 * trx2.m11,
      m12: trx1.m10 * trx2.m02 + trx1.m11 * trx2.m12 + trx1.m12
    };
  }

  /**
   * Computes X^N transformations by composing the fractal's transformations N times.
   */
  computeIteratedTransforms(fractal: Fractal, iterations: number): AffineTransform[] {
    if (iterations <= 0) {
      return [createIdentity('IDENTITY')];
    }
    
    let currentTransforms = [...fractal.transforms];
    
    for (let i = 1; i < iterations; i++) {
      const nextTransforms: AffineTransform[] = [];
      for (const t1 of fractal.transforms) {
        for (const t2 of currentTransforms) {
          nextTransforms.push(this.concatenate(t1, t2));
        }
      }
      currentTransforms = nextTransforms;
    }
    
    return currentTransforms;
  }

  /**
   * Projects a point (x, y) using an affine transform.
   * x, y are in the range [-1, 1]
   */
  transformPoint(transform: AffineTransform, x: number, y: number): { x: number, y: number } {
    return {
      x: transform.m00 * x + transform.m01 * y + transform.m02,
      y: transform.m10 * x + transform.m11 * y + transform.m12
    };
  }
}
