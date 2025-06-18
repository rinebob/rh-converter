import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FileConverterLegacy } from '../../core/comps/file-converter-legacy/file-converter-legacy';
import { CommentsSectionComponent } from './components/comments-section/comments-section.component';
import { BrokersListComponent } from '../../core/comps/brokers-list/brokers-list.component';
import { InstructionsContentComponent } from './components/instructions-content/instructions-content.component';
import { FileFormatsContentComponent } from './components/file-formats-content/file-formats-content.component';

@Component({
  selector: 'app-file-converter-v1',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTabsModule,
    MatProgressBarModule,
    FileConverterLegacy,
    CommentsSectionComponent,
    BrokersListComponent,
    InstructionsContentComponent,
    FileFormatsContentComponent
  ],
  templateUrl: './file-converter-v1.component.html',
  styleUrls: ['./file-converter-v1.component.scss']
})
export class FileConverterV1Component {
  activeTabIndex = 0;

  constructor() {
  }

  onTabChange(index: number) {
    this.activeTabIndex = index;
  }
}
