import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileConverter } from './core/comps/file-converter/file-converter';

@Component({
  selector: 'rh-root',
  standalone: true,
  imports: [CommonModule, FileConverter],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  protected title = 'rh-converter';
}
