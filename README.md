# Sierpinski Angular

Angular application for generating and visualizing fractals based on Iterated Function Systems (IFS).

## Implemented Features:

### 1. Data Models (DTOs)
- `AffineTransform`: Represents a 2D transformation matrix.
- `Fractal`: Contains a name and a list of affine transformations.
- `FractalImage`: Data structure for the image (not directly used for canvas rendering, which uses transformed polygons).

### 2. Business Service (`FractalService`)
- Calculation of affine matrix composition.
- Algorithm to calculate the $X^N$ transformations resulting from $N$ iterations.
- Point projection via transformations.

### 3. User Interface (UI)
- **Fractal Editor**:
  - Modification of the name and number of iterations.
  - Adding/Deleting transformations.
  - Direct editing of matrix coefficients.
  - **Interactive Visualizer**: Each transformation has a mini-canvas allowing modification of:
    - Translation (drag and drop).
    - Scale (mouse wheel).
    - Rotation (CTRL + drag and drop).
  - **Display Management**: Ability to collapse/expand each transformation card to save space.
- **Visualization Canvas**: Real-time rendering of the complete fractal.
- **Interactive Help**: 
  - Accessible via an animated '?' button in the toolbar.
  - Dedicated page with 3 tabs: Getting Started, About Fractals, Credits.
  - Guide with visualizer shortcuts.
  - Mathematical information on IFS and fixed points.
  - Directly viewable Apache 2.0 license.

### 4. Import / Export / Saving
- Export fractal structure in JSON format (File or Clipboard).
- Import from JSON files or from the clipboard.
- Save the generated image in PNG format (Download or Clipboard).

### 5. User Experience & Design
- Optimized responsive layout:
  - **Portrait (Mobile)**: Square canvas at the bottom (screen width), editor at the top filling the remaining space.
  - **Landscape (Desktop)**: Sidebar on the left, canvas attached to the sidebar.
- Toolbar with SVG icons and dropdown menus for import/export actions.
- Use of Vanilla CSS for maximum flexibility.

## Usage
1. Modify the transformations in the side panel.
2. Observe the result on the central canvas.
3. Use the scroll wheel or CTRL+drag on the small blue squares to visually adjust the transformations.
4. Use the toolbar buttons to import/export your creations or copy the final image.

---

## Developer & AI Agent Notes

### Architecture & State Management
- **Immutability for Change Detection**: The `FractalEditorComponent` clones `AffineTransform` objects (using `{...transform}`) whenever a matrix field or visualizer interaction occurs. This is critical to trigger `ngOnChanges` in the `TransformVisualizerComponent`.
- **Component Persistence**: The `*ngFor` loop in the editor uses `trackBy: trackByTransform` (tracking by index). This prevents Angular from destroying and recreating components during dragging/cloning, ensuring smooth UI interactions.
- **Coordinate System**: All internal math uses a range of `[-1, 1]`. The origin `(0,0)` is the center. Transformation parameters $m02$ and $m12$ represent translation in this space.

### Transform Visualizer Logic
- **Interactivity**: Controlled by the `[interactive]` input. Header icons set this to `false`.
- **Unified Interaction (Pointer Events)**: Uses Pointer Events (`pointerdown`, etc.) to support mouse, touch, and stylus input across all devices. `touch-action: none` is used to prevent browser scrolling during manipulation.
- **Visual Handles**:
  - **Rotation (Red Dot, Top-Left)**: Dragging this point rotates the transformation output around the center.
  - **Uniform Scale (Red Square, Top-Right)**: Dragging this corner scales the shape while preserving aspect ratio.
  - **Non-Uniform Scale (Blue Circles, Midpoints)**: Dragging side handles scales the transformation specifically along the local X or Y axis.
  - **Translation (Blue Circle, Center)**: Dragging the origin handle moves the transformation in world space.

### Naming Conventions
- **Standardized Naming**: Fractals and their transformations follow a consistent pattern:
  - **Fractals**: Named manually or auto-generated as `fractalYYYYMMDD_HHMMSS` during shuffle.
  - **Transformations**: Automatically named with short identifiers (`T1`, `T2`, `T3`) to maintain a clean interface.

### Rendering Performance & Stability
- **Backpressure & Acknowledgment (ACK) System**: To prevent the browser tab from crashing during high-iteration fractal generation, a custom windowing mechanism was implemented. The Web Worker pauses generation if more than 10 batches are in flight and only resumes when the main thread sends an "ACK" after drawing a batch. This ensures the rendering never lags too far behind the calculation.
- **Optimized Data Transfer (Transferable Objects)**: Transformation matrices are sent from the worker as `Float32Array`. Using transferable objects avoids expensive cloning and minimizes memory overhead.
- **Chunked Drawing**: The main thread processes incoming transforms in limited chunks (e.g., 20,000 transforms per frame) using `requestAnimationFrame`. This maintains a smooth 60fps UI even when millions of polygons are being queued.
- **Worker Hot-Loop Optimization**: Removed object creation, string concatenations, and recursive calls in the worker. All matrix math is performed on primitive numbers using a flat stack array.
- **Asynchronous Calculation (Web Workers)**: To handle complex fractals without freezing the UI, calculations are offloaded to a dedicated Web Worker.
- **Progress & ETA**: A real-time progress bar displays the completion percentage and an estimated time remaining, accurately synchronized with both computing and rendering progress thanks to the ACK system.

### Layout & Responsiveness
- **Portrait Mode**: The `.app-container` uses `flex-direction: column-reverse`. The `.main-content` (canvas) is fixed to `100vw` height and width to ensure a perfect square at the bottom. The `.sidebar` (editor) uses `flex-grow: 1` to fill the remaining top space.
- **Canvas Alignment**: In desktop mode, `justify-content: flex-start` on the `.canvas-container` ensures the canvas sticks to the sidebar, avoiding dead space.

### Clipboard & File Operations
- **Clipboard API**: Used for both text (JSON) and binary data (PNG blob). 
- **PNG Copy**: `canvas.toBlob` combined with `navigator.clipboard.write([new ClipboardItem(...)])` allows direct pasting into image editors or chat apps.
- **JSON Clipboard**: Asynchronous `navigator.clipboard.readText()` is used for seamless fractal sharing.
- **Menus**: A simple `activeMenu` state in the editor manages the visibility of custom dropdown menus for a cleaner UI.
