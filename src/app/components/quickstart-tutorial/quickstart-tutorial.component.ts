import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-quickstart-tutorial',
  templateUrl: './quickstart-tutorial.component.html',
  styleUrls: ['./quickstart-tutorial.component.css']
})
export class QuickstartTutorialComponent {
  @Output() close = new EventEmitter<void>();

  onDismiss() {
    this.close.emit();
  }
}
