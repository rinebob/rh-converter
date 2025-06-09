import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileSizePipe } from './pipes/file-size.pipe';

const SHARED_COMPONENTS: any[] = [];

@NgModule({
  declarations: [
    ...SHARED_COMPONENTS
  ],
  imports: [
    CommonModule,
    FileSizePipe // Import standalone pipe directly
  ],
  exports: [
    ...SHARED_COMPONENTS,
    FileSizePipe // Export the standalone pipe
  ]
})
export class SharedModule { }
