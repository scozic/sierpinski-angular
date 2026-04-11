import { Component, ViewChild } from '@angular/core';
import { Fractal } from './models/fractal';
import { createIdentity } from './models/affine-transform';
import { FractalCanvasComponent } from './components/fractal-canvas/fractal-canvas.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'sierpinski-angular';
  @ViewChild('fractalCanvas') fractalCanvas!: FractalCanvasComponent;

  showHelp: boolean = false;

  currentFractal: Fractal = {
    name: 'Sierpinski Triangle',
    transforms: [
      {
        transformname: 'T1',
        m00: 0.5, m01: 0.0, m02: 0.5,
        m10: 0.0, m11: 0.5, m12: -0.5
      },
      {
        transformname: 'T2',
        m00: 0.5, m01: 0.0, m02: -0.5,
        m10: 0.0, m11: 0.5, m12: -0.5
      },
      {
        transformname: 'T3',
        m00: 0.5, m01: 0.0, m02: 0.0,
        m10: 0.0, m11: 0.5, m12: 0.5
      }
    ]
  };

  iterations: number = 7;

  onFractalChange(fractal: Fractal) {
    this.currentFractal = { ...fractal };
  }

  onIterationsChange(iterations: number) {
    this.iterations = iterations;
  }

  onSaveImage() {
    this.fractalCanvas.downloadImage();
  }

  onCopyImage() {
    this.fractalCanvas.copyImageToClipboard();
  }

  onShowHelp() {
    this.showHelp = true;
  }

  onCloseHelp() {
    this.showHelp = false;
  }
}
