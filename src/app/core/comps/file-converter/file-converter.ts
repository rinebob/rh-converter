import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'rh-file-converter',
  imports: [MatCardModule, MatButtonModule],
  templateUrl: './file-converter.html',
  styleUrl: './file-converter.scss'
})
export class FileConverter {

}
