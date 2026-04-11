import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { Fractal } from '../../models/fractal';
import { AffineTransform, createIdentity } from '../../models/affine-transform';

@Component({
  selector: 'app-fractal-editor',
  templateUrl: './fractal-editor.component.html',
  styleUrls: ['./fractal-editor.component.css']
})
export class FractalEditorComponent implements OnInit {
  @Input() fractal: Fractal = { name: 'New Fractal', transforms: [createIdentity('T1')] };
  @Output() fractalChange = new EventEmitter<Fractal>();

  iterations: number = 7;
  @Output() iterationsChange = new EventEmitter<number>();
  @Output() saveImageRequest = new EventEmitter<void>();
  @Output() copyImageRequest = new EventEmitter<void>();
  @Output() showHelpRequest = new EventEmitter<void>();

  collapsedStates: boolean[] = [];
  activeMenu: string | null = null;

  onShowHelp() {
    this.showHelpRequest.emit();
  }

  ngOnInit() {
    this.collapsedStates = new Array(this.fractal.transforms.length).fill(false);
  }

  toggleMenu(menu: string) {
    this.activeMenu = this.activeMenu === menu ? null : menu;
  }

  exportToClipboard() {
    const data = JSON.stringify(this.fractal, null, 2);
    navigator.clipboard.writeText(data).then(() => {
      alert('Fractal JSON copied to clipboard!');
      this.activeMenu = null;
    });
  }

  async importFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const imported = JSON.parse(text);
      if (imported.name && Array.isArray(imported.transforms)) {
        this.fractal = imported;
        this.onChange();
        this.activeMenu = null;
      } else {
        alert('Invalid fractal format in clipboard');
      }
    } catch (err) {
      console.error('Failed to read from clipboard:', err);
      alert('Failed to read from clipboard');
    }
  }

  saveToFile() {
    this.exportFractal();
    this.activeMenu = null;
  }

  importFromFile() {
    // This will be handled by the file input click in the template
    this.activeMenu = null;
  }

  triggerSaveImage() {
    this.saveImageRequest.emit();
    this.activeMenu = null;
  }

  triggerCopyImage() {
    this.copyImageRequest.emit();
    this.activeMenu = null;
  }

  shuffle() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const newName = `fractal${year}${month}${day}_${hours}${minutes}${seconds}`;
    
    const newTransforms = this.fractal.transforms.map((trx, index) => {
      let m00: number = 1, m01: number = 0, m02: number = 0;
      let m10: number = 0, m11: number = 1, m12: number = 0;
      
      const theta = Math.random() * 2 * Math.PI;
      const sx = 0.1 + Math.random() * 0.7; // Scale between 0.1 and 0.8
      const sy = 0.1 + Math.random() * 0.7;
      const tx = (Math.random() - 0.5) * 1.8; // Translate between -0.9 and 0.9
      const ty = (Math.random() - 0.5) * 1.8;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      m00 = sx * cos;
      m01 = -sy * sin;
      m02 = tx;
      m10 = sx * sin;
      m11 = sy * cos;
      m12 = ty;
      
      return {
        ...trx,
        transformname: `T${index + 1}`,
        m00: m00,
        m01: m01,
        m02: m02,
        m10: m10,
        m11: m11,
        m12: m12
      };
    });
    
    this.fractal = {
      ...this.fractal,
      name: newName,
      transforms: newTransforms
    };
    
    this.onChange();
    this.activeMenu = null;
  }

  addTransform() {
    const newName = `T${this.fractal.transforms.length + 1}`;
    this.fractal.transforms.push(createIdentity(newName));
    this.collapsedStates.push(false);
    this.onChange();
  }

  toggleCollapse(index: number) {
    this.collapsedStates[index] = !this.collapsedStates[index];
  }

  trackByTransform(index: number, item: AffineTransform) {
    return index; // Track by index to avoid component recreation on object clone
  }

  removeTransform(index: number) {
    this.fractal.transforms.splice(index, 1);
    this.onChange();
  }

  onChange(index?: number) {
    if (index !== undefined) {
      this.fractal.transforms[index] = { ...this.fractal.transforms[index] };
    }
    this.fractalChange.emit(this.fractal);
  }

  onMatrixChange(index: number) {
    this.onChange(index);
  }

  onIterationsChange() {
    this.iterationsChange.emit(this.iterations);
  }

  exportFractal() {
    const data = JSON.stringify(this.fractal, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.fractal.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importFractal(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (imported.name && Array.isArray(imported.transforms)) {
            this.fractal = imported;
            this.onChange();
          }
        } catch (err) {
          console.error('Error importing fractal:', err);
        }
      };
      reader.readAsText(file);
    }
  }

  saveImage() {
    this.saveImageRequest.emit();
  }
}
