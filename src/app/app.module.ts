import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FractalEditorComponent } from './components/fractal-editor/fractal-editor.component';
import { FractalCanvasComponent } from './components/fractal-canvas/fractal-canvas.component';
import { TransformVisualizerComponent } from './components/transform-visualizer/transform-visualizer.component';
import { HelpComponent } from './components/help/help.component';

@NgModule({
  declarations: [
    AppComponent,
    FractalEditorComponent,
    FractalCanvasComponent,
    TransformVisualizerComponent,
    HelpComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
