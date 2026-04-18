import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, HostListener, OnDestroy } from '@angular/core';
import { Fractal } from '../../models/fractal';
import { FractalService } from '../../services/fractal.service';
import { AffineTransform } from '../../models/affine-transform';
import { PngMetadataService } from '../../services/png-metadata.service';

@Component({
  selector: 'app-fractal-canvas',
  templateUrl: './fractal-canvas.component.html',
  styleUrls: ['./fractal-canvas.component.css']
})
export class FractalCanvasComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() fractal!: Fractal;
  @Input() iterations: number = 5;

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private worker?: Worker;
  private transformQueue: Float32Array[] = [];
  private animationFrameId?: number;

  progress: number = 100;
  timeRemaining: number = 0;

  private readonly corners = [
    { x: -1, y: 1 },
    { x: 1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: -1 }
  ];

  constructor(
    private fractalService: FractalService,
    private pngMetadataService: PngMetadataService
  ) {}

  ngAfterViewInit() {
    const context = this.canvasRef.nativeElement.getContext('2d');
    if (context) {
      this.ctx = context;
      this.resizeCanvas();
      // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError 
      // because draw() resets progress which is used in the template.
      setTimeout(() => this.draw());
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.ctx && (changes['fractal'] || changes['iterations'])) {
      this.draw();
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.resizeCanvas();
    this.draw();
  }

  ngOnDestroy() {
    this.terminateWorker();
    this.cancelScheduledDraw();
  }

  private terminateWorker() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = undefined;
    }
  }

  private cancelScheduledDraw() {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  private resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement;
    if (parent) {
      const size = Math.min(parent.clientWidth, parent.clientHeight);
      canvas.width = size;
      canvas.height = size;
    }
  }

  private scheduleDraw() {
    if (this.animationFrameId === undefined) {
      this.animationFrameId = requestAnimationFrame(() => this.flushQueue());
    }
  }

  private flushQueue() {
    this.animationFrameId = undefined;
    if (this.transformQueue.length === 0 || !this.ctx) return;

    // Process a limited number of transforms per frame to keep UI responsive
    const MAX_TRANSFORMS_PER_FRAME = 20000;
    let processedCount = 0;

    const canvas = this.canvasRef.nativeElement;
    const width = canvas.width;
    const height = canvas.height;

    this.ctx.beginPath();
    
    while (this.transformQueue.length > 0 && processedCount < MAX_TRANSFORMS_PER_FRAME) {
      const currentBatch = this.transformQueue.shift()!;
      for (let j = 0; j < currentBatch.length; j += 6) {
        const m00 = currentBatch[j];
        const m01 = currentBatch[j+1];
        const m02 = currentBatch[j+2];
        const m10 = currentBatch[j+3];
        const m11 = currentBatch[j+4];
        const m12 = currentBatch[j+5];

        for (let i = 0; i < this.corners.length; i++) {
          const px = (m00 * this.corners[i].x + m01 * this.corners[i].y + m02 + 1) * width / 2;
          const py = (1 - (m10 * this.corners[i].x + m11 * this.corners[i].y + m12)) * height / 2;
          if (i === 0) {
            this.ctx.moveTo(px, py);
          } else {
            this.ctx.lineTo(px, py);
          }
        }
        processedCount++;
      }
      // Send ACK for the batch we just finished drawing
      this.worker?.postMessage({ type: 'ACK' });
    }
    
    this.ctx.fill();

    if (this.transformQueue.length > 0) {
      this.scheduleDraw();
    }
  }

  private draw() {
    if (!this.ctx || !this.fractal) return;

    this.terminateWorker();
    this.cancelScheduledDraw();
    this.transformQueue = [];

    const canvas = this.canvasRef.nativeElement;
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.fillStyle = 'black';

    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../../fractal.worker', import.meta.url));
      this.progress = 0;
      this.timeRemaining = 0;

      this.worker.onmessage = ({ data }) => {
        if (data.type === 'TRANSFORMS') {
          this.transformQueue.push(data.transforms);
          this.scheduleDraw();
        } else if (data.type === 'PROGRESS') {
          this.progress = data.progress;
          this.timeRemaining = data.timeRemaining;
        } else if (data.type === 'DONE') {
          this.progress = 100;
          this.terminateWorker();
        }
      };

      this.worker.postMessage({ fractal: this.fractal, iterations: this.iterations });
    } else {
      // Fallback to main thread if Web Workers are not supported
      const transforms = this.fractalService.computeIteratedTransforms(this.fractal, this.iterations);
      const flattened = new Float32Array(transforms.length * 6);
      for (let i = 0; i < transforms.length; i++) {
        flattened[i*6] = transforms[i].m00;
        flattened[i*6+1] = transforms[i].m01;
        flattened[i*6+2] = transforms[i].m02;
        flattened[i*6+3] = transforms[i].m10;
        flattened[i*6+4] = transforms[i].m11;
        flattened[i*6+5] = transforms[i].m12;
      }
      this.transformQueue.push(flattened);
      this.scheduleDraw();
    }
  }


  downloadImage() {
    const canvas = this.canvasRef.nativeElement;
    canvas.toBlob(async (blob) => {
      if (blob) {
        const fractalData = JSON.stringify(this.fractal);
        const blobWithMetadata = await this.pngMetadataService.writeMetadata(blob, 'fractal', fractalData);
        const url = URL.createObjectURL(blobWithMetadata);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.fractal.name.replace(/\s+/g, '_')}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
  }

  copyImageToClipboard() {
    const canvas = this.canvasRef.nativeElement;
    canvas.toBlob(async (blob) => {
      if (blob) {
        const fractalData = JSON.stringify(this.fractal);
        const blobWithMetadata = await this.pngMetadataService.writeMetadata(blob, 'fractal', fractalData);
        const item = new ClipboardItem({ 'image/png': blobWithMetadata });
        navigator.clipboard.write([item]).then(() => {
          alert('Image with fractal metadata copied to clipboard!');
        }).catch(err => {
          console.error('Could not copy image: ', err);
        });
      }
    }, 'image/png');
  }
}

