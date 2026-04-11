import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.css']
})
export class HelpComponent {
  @Output() close = new EventEmitter<void>();
  activeTab: 'guide' | 'about' | 'credits' = 'guide';

  onClose() {
    this.close.emit();
  }

  setTab(tab: 'guide' | 'about' | 'credits') {
    this.activeTab = tab;
  }
}
