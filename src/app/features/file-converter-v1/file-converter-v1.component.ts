import { Component, ElementRef, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FileConverterLegacy } from '../../core/comps/file-converter-legacy/file-converter-legacy';
import { CommentsSectionComponent } from './components/comments-section/comments-section.component';
import { BrokersListComponent } from '../../core/comps/brokers-list/brokers-list.component';
import { InstructionsContentComponent } from './components/instructions-content/instructions-content.component';

/**
 * FileConverterV1Component
 *
 * Initializes Google AdSense units declared in the template via `#adUnit`.
 */
@Component({
  selector: 'app-file-converter-v1',
  standalone: true,
  imports: [
    CommonModule, 
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTabsModule,
    MatProgressBarModule,
    FileConverterLegacy,
    CommentsSectionComponent,
    BrokersListComponent,
    InstructionsContentComponent,
  ],
  templateUrl: './file-converter-v1.component.html',
  styleUrls: ['./file-converter-v1.component.scss']
})
export class FileConverterV1Component implements AfterViewInit {
  activeTabIndex = 0;

  @ViewChildren('adUnit') private adUnits!: QueryList<ElementRef<HTMLElement>>;

  constructor() {}

  ngAfterViewInit(): void {
    // Initialize all ad units once the view is ready
    this.initAds();

    // If the view changes (e.g., tabs render lazily), attempt re-init for newly added nodes
    this.adUnits.changes.subscribe(() => this.initAds());
  }

  onTabChange(index: number) {
    this.activeTabIndex = index;
  }

  /**
   * Push each uninitialized <ins class="adsbygoogle"> element to the AdSense queue.
   */
  private initAds(): void {
    const w = window as unknown as { adsbygoogle?: unknown[] };
    if (!w.adsbygoogle) {
      // AdSense script not loaded yet; skip
      return;
    }

    this.adUnits.forEach((ref) => {
      const el = ref.nativeElement as HTMLElement & { dataset: DOMStringMap } & { __adInitialized?: boolean };

      // Avoid double-initialization
      if (el.__adInitialized || el.dataset['initialized'] === 'true') return;

      try {
        (w.adsbygoogle as unknown[]).push({});
        el.__adInitialized = true;
        el.dataset['initialized'] = 'true';
      } catch {
        // No-op: AdSense may throw if called before script ready
      }
    });
  }
}
