import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { FileConverterLegacy } from '../../core/comps/file-converter-legacy/file-converter-legacy';

@Component({
  selector: 'app-file-converter-v1',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    FileConverterLegacy
  ],
  templateUrl: './file-converter-v1.component.html',
  styleUrls: ['./file-converter-v1.component.scss']
})
export class FileConverterV1Component { }
