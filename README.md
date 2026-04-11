# Sierpinski Angular

Application Angular pour la génération et la visualisation de fractales basées sur des transformations affines (IFS).

## Fonctionnalités réalisées :

### 1. Modèles de données (DTOs)
- `AffineTransform` : Représente une matrice de transformation 2D.
- `Fractal` : Contient un nom et une liste de transformations affines.
- `FractalImage` : Structure de données pour l'image (non utilisée directement pour le rendu canvas qui utilise les polygones transformés).

### 2. Service Métier (`FractalService`)
- Calcul de la composition de matrices affines.
- Algorithme de calcul des $X^N$ transformations résultant de $N$ itérations.
- Projection de points via les transformations.

### 3. Interface Utilisateur (IHM)
- **Éditeur de Fractale** :
  - Modification du nom et du nombre d'itérations.
  - Ajout/Suppression de transformations.
  - Édition directe des coefficients de la matrice.
  - **Visualiseur Interactif** : Chaque transformation dispose d'un mini-canevas permettant de modifier :
    - La translation (glisser-déposer).
    - L'échelle (molette de la souris).
    - La rotation (CTRL + glisser-déposer).
  - **Gestion de l'affichage** : Possibilité de réduire/développer chaque carte de transformation pour gagner de la place.
- **Canevas de Visualisation** : Rendu en temps réel de la fractale complète.
- **Aide interactive** : 
  - Accessible via un bouton '?' animé dans la barre d'outils.
  - Page dédiée avec 3 onglets : Guide de démarrage, À propos des fractales, Crédits.
  - Guide avec raccourcis du visualiseur.
  - Informations mathématiques sur les IFS et le point fixe.
  - Licence Apache 2.0 consultable directement.

### 4. Import / Export / Sauvegarde
- Export de la structure de la fractale en format JSON (Fichier ou Presse-papier).
- Import de fichiers JSON ou depuis le presse-papier.
- Sauvegarde de l'image générée au format PNG (Téléchargement ou Presse-papier).

### 5. Ergonomie et Design
- Mise en page responsive optimisée :
  - **Portrait (Mobile)** : Canevas carré en bas (largeur écran), éditeur en haut remplissant l'espace restant.
  - **Paysage (Bureau)** : Barre latérale à gauche, canevas collé à la barre latérale.
- Barre d'outils avec icônes SVG et menus déroulants pour les actions d'import/export.
- Utilisation de CSS Vanille pour une flexibilité maximale.

## Utilisation
1. Modifiez les transformations dans le panneau latéral.
2. Observez le résultat sur le canevas central.
3. Utilisez la molette ou CTRL+glisser sur les petits carrés bleus pour ajuster visuellement les transformations.
4. Utilisez les boutons de la barre d'outils pour importer/exporter vos créations ou copier l'image finale.

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
- **Coordinate System**: All internal math uses a range of `[-1, 1]`.

### Naming Conventions
- **Standardized Naming**: Fractals and their transformations follow a consistent pattern:
  - **Fractals**: Named manually or auto-generated as `fractalYYYYMMDD_HHMMSS` during shuffle.
  - **Transformations**: Automatiquement nommées avec des identifiants courts (`T1`, `T2`, `T3`) pour maintenir une interface épurée.

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
**: Used for both text (JSON) and binary data (PNG blob). 
- **PNG Copy**: `canvas.toBlob` combined with `navigator.clipboard.write([new ClipboardItem(...)])` allows direct pasting into image editors or chat apps.
- **JSON Clipboard**: Asynchronous `navigator.clipboard.readText()` is used for seamless fractal sharing.
- **Menus**: A simple `activeMenu` state in the editor manages the visibility of custom dropdown menus for a cleaner UI.
