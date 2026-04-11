import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { AffineTransform } from '../../models/affine-transform';

type HandleType = 'NONE' | 'MOVE' | 'ROTATE' | 'SCALE_UNIFORM' | 'SCALE_X_LEFT' | 'SCALE_X_RIGHT' | 'SCALE_Y_TOP' | 'SCALE_Y_BOTTOM';

@Component({
  selector: 'app-transform-visualizer',
  template: `
    <canvas #canvas 
      [class.interactive]="interactive" 
      (pointerdown)="interactive && onPointerDown($event)" 
      (wheel)="interactive && onWheel($event)"
      (pointermove)="interactive && onHover($event)"
    ></canvas>
  `,
  styles: [`
    canvas { border: 1px solid #ccc; background-color: white; display: block; touch-action: none; }
    canvas.interactive { cursor: default; }
  `]
})
export class TransformVisualizerComponent implements AfterViewInit, OnChanges {
  @Input() transform!: AffineTransform;
  @Input() size: number = 150;
  @Input() interactive: boolean = true;
  @Output() transformChange = new EventEmitter<AffineTransform>();

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private isDragging = false;
  private activeHandle: HandleType = 'NONE';
  private lastX = 0;
  private lastY = 0;

  private readonly rotateCursor = `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M23 4v6h-6'%3E%3C/path%3E%3Cpath d='M20.49 15a9 9 0 1 1-2.12-9.36L23 10'%3E%3C/path%3E%3C/svg%3E") 12 12, auto`;

  // Corners in local space [-1, 1]
  private readonly corners = [
    { x: -1, y: 1 },  // Top-Left (Rotate)
    { x: 1, y: 1 },   // Top-Right (Scale Uniform)
    { x: 1, y: -1 },  // Bottom-Right
    { x: -1, y: -1 }  // Bottom-Left
  ];

  // Midpoints for X/Y scaling
  private readonly midpoints = [
    { x: 0, y: 1, type: 'SCALE_Y_TOP' as HandleType },
    { x: 0, y: -1, type: 'SCALE_Y_BOTTOM' as HandleType },
    { x: -1, y: 0, type: 'SCALE_X_LEFT' as HandleType },
    { x: 1, y: 0, type: 'SCALE_X_RIGHT' as HandleType }
  ];

  ngAfterViewInit() {
    this.updateCanvasSize();
    const context = this.canvasRef.nativeElement.getContext('2d');
    if (context) {
      this.ctx = context;
      this.draw();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['size']) {
      this.updateCanvasSize();
    }
    if (this.ctx && (changes['transform'] || changes['size'])) {
      this.draw();
    }
  }

  private updateCanvasSize() {
    if (this.canvasRef) {
      this.canvasRef.nativeElement.width = this.size;
      this.canvasRef.nativeElement.height = this.size;
    }
  }

  private screenToWorld(sx: number, sy: number): { x: number, y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return {
      x: ((sx - rect.left) / this.size) * 2 - 1,
      y: 1 - ((sy - rect.top) / this.size) * 2
    };
  }

  private worldToScreen(wx: number, wy: number): { x: number, y: number } {
    return {
      x: (wx + 1) * this.size / 2,
      y: (1 - wy) * this.size / 2
    };
  }

  private getTransformedPoint(lx: number, ly: number): { x: number, y: number } {
    return {
      x: this.transform.m00 * lx + this.transform.m01 * ly + this.transform.m02,
      y: this.transform.m10 * lx + this.transform.m11 * ly + this.transform.m12
    };
  }

  private getHandleAt(mouseX: number, mouseY: number): HandleType {
    const threshold = 12; // pixels for easier touch interaction

    // Check corners
    for (let i = 0; i < this.corners.length; i++) {
      const p = this.getTransformedPoint(this.corners[i].x, this.corners[i].y);
      const s = this.worldToScreen(p.x, p.y);
      const dist = Math.sqrt((s.x - mouseX) ** 2 + (s.y - mouseY) ** 2);
      if (dist < threshold) {
        if (i === 0) return 'ROTATE';
        if (i === 1) return 'SCALE_UNIFORM';
      }
    }

    // Check midpoints
    for (const m of this.midpoints) {
      const p = this.getTransformedPoint(m.x, m.y);
      const s = this.worldToScreen(p.x, p.y);
      const dist = Math.sqrt((s.x - mouseX) ** 2 + (s.y - mouseY) ** 2);
      if (dist < threshold) return m.type;
    }

    // Check center (body)
    const pBody = this.getTransformedPoint(0, 0);
    const sBody = this.worldToScreen(pBody.x, pBody.y);
    const distBody = Math.sqrt((sBody.x - mouseX) ** 2 + (sBody.y - mouseY) ** 2);
    if (distBody < 20) return 'MOVE';

    return 'NONE';
  }

  onHover(event: PointerEvent) {
    if (this.isDragging) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const handle = this.getHandleAt(event.clientX - rect.left, event.clientY - rect.top);
    
    const canvas = this.canvasRef.nativeElement;
    switch (handle) {
      case 'MOVE': canvas.style.cursor = 'move'; break;
      case 'ROTATE': canvas.style.cursor = this.rotateCursor; break;
      case 'SCALE_UNIFORM': canvas.style.cursor = 'nwse-resize'; break;
      case 'SCALE_X_LEFT': 
      case 'SCALE_X_RIGHT': canvas.style.cursor = 'ew-resize'; break;
      case 'SCALE_Y_TOP': 
      case 'SCALE_Y_BOTTOM': canvas.style.cursor = 'ns-resize'; break;
      default: canvas.style.cursor = 'default';
    }
  }

  onPointerDown(event: PointerEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.activeHandle = this.getHandleAt(event.clientX - rect.left, event.clientY - rect.top);
    if (this.activeHandle === 'NONE') return;

    this.isDragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!this.isDragging) return;

      const worldMouse = this.screenToWorld(moveEvent.clientX, moveEvent.clientY);
      const lastWorldMouse = this.screenToWorld(this.lastX, this.lastY);

      if (this.activeHandle === 'MOVE') {
        this.transform.m02 += (worldMouse.x - lastWorldMouse.x);
        this.transform.m12 += (worldMouse.y - lastWorldMouse.y);
      } else if (this.activeHandle === 'ROTATE') {
        const ux = worldMouse.x - this.transform.m02;
        const uy = worldMouse.y - this.transform.m12;
        const vx = -this.transform.m00 + this.transform.m01;
        const vy = -this.transform.m10 + this.transform.m11;
        this.applyRotation(Math.atan2(uy, ux) - Math.atan2(vy, vx));
      } else if (this.activeHandle === 'SCALE_UNIFORM') {
        const distCurrent = Math.sqrt((worldMouse.x - this.transform.m02)**2 + (worldMouse.y - this.transform.m12)**2);
        const distLast = Math.sqrt((lastWorldMouse.x - this.transform.m02)**2 + (lastWorldMouse.y - this.transform.m12)**2);
        if (distLast > 0.001) this.applyScale(distCurrent / distLast);
      } else {
        this.handleNonUniformScale(worldMouse, lastWorldMouse);
      }

      this.lastX = moveEvent.clientX;
      this.lastY = moveEvent.clientY;
      this.draw();
      this.transformChange.emit(this.transform);
    };

    const onPointerUp = () => {
      this.isDragging = false;
      this.activeHandle = 'NONE';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  private handleNonUniformScale(worldMouse: {x:number, y:number}, lastWorldMouse: {x:number, y:number}) {
    let lx = 0, ly = 0;
    if (this.activeHandle === 'SCALE_X_LEFT') lx = -1;
    else if (this.activeHandle === 'SCALE_X_RIGHT') lx = 1;
    else if (this.activeHandle === 'SCALE_Y_TOP') ly = 1;
    else if (this.activeHandle === 'SCALE_Y_BOTTOM') ly = -1;

    const p = this.getTransformedPoint(lx, ly);
    const vx = p.x - this.transform.m02;
    const vy = p.y - this.transform.m12;
    const len = Math.sqrt(vx*vx + vy*vy);
    if (len < 0.001) return;

    const distCurrent = ((worldMouse.x - this.transform.m02) * vx + (worldMouse.y - this.transform.m12) * vy) / len;
    const distLast = ((lastWorldMouse.x - this.transform.m02) * vx + (lastWorldMouse.y - this.transform.m12) * vy) / len;

    if (distLast > 0.001 || distLast < -0.001) {
      const s = distCurrent / distLast;
      if (lx !== 0) {
        this.transform.m00 *= s;
        this.transform.m10 *= s;
      } else {
        this.transform.m01 *= s;
        this.transform.m11 *= s;
      }
    }
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const scale = event.deltaY > 0 ? 0.95 : 1.05;
    this.applyScale(scale);
    this.draw();
    this.transformChange.emit(this.transform);
  }

  private applyScale(s: number) {
    this.transform.m00 *= s;
    this.transform.m01 *= s;
    this.transform.m10 *= s;
    this.transform.m11 *= s;
  }

  private applyRotation(angle: number) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const { m00, m01, m10, m11 } = this.transform;
    this.transform.m00 = cos * m00 - sin * m10;
    this.transform.m01 = cos * m01 - sin * m11;
    this.transform.m10 = sin * m00 + cos * m10;
    this.transform.m11 = sin * m01 + cos * m11;
  }

  private draw() {
    if (!this.ctx) return;
    const w = this.size;
    const h = this.size;

    this.ctx.clearRect(0, 0, w, h);

    // Grid
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, h/2); this.ctx.lineTo(w, h/2);
    this.ctx.moveTo(w/2, 0); this.ctx.lineTo(w/2, h);
    this.ctx.stroke();

    // Border
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.strokeRect(0, 0, w, h);

    // Shape
    this.ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
    this.ctx.beginPath();
    for (let i = 0; i < this.corners.length; i++) {
      const p = this.getTransformedPoint(this.corners[i].x, this.corners[i].y);
      const s = this.worldToScreen(p.x, p.y);
      if (i === 0) this.ctx.moveTo(s.x, s.y);
      else this.ctx.lineTo(s.x, s.y);
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    if (!this.interactive) return;

    const handleSize = 4;

    // Handles
    const pTL = this.getTransformedPoint(-1, 1);
    const sTL = this.worldToScreen(pTL.x, pTL.y);
    this.ctx.fillStyle = 'red';
    this.ctx.beginPath();
    this.ctx.arc(sTL.x, sTL.y, handleSize + 2, 0, Math.PI * 2);
    this.ctx.fill();

    const pTR = this.getTransformedPoint(1, 1);
    const sTR = this.worldToScreen(pTR.x, pTR.y);
    this.ctx.fillStyle = 'red';
    this.ctx.fillRect(sTR.x - handleSize, sTR.y - handleSize, handleSize*2, handleSize*2);

    this.ctx.fillStyle = '#007bff';
    for (const m of this.midpoints) {
      const p = this.getTransformedPoint(m.x, m.y);
      const s = this.worldToScreen(p.x, p.y);
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, handleSize, 0, Math.PI * 2);
      this.ctx.fill();
    }

    const pO = this.getTransformedPoint(0, 0);
    const sO = this.worldToScreen(pO.x, pO.y);
    this.ctx.strokeStyle = '#007bff';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(sO.x, sO.y, handleSize + 2, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.lineWidth = 1;
  }
}
