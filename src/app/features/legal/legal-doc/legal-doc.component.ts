import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { take } from 'rxjs/operators';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Title } from '@angular/platform-browser';

interface LegalRouteData {
  src: string; // path to the static document in public/legal (.md or .html)
  title?: string;
}

/**
 * LegalDocComponent
 * Displays a static legal HTML document (from public/legal) by fetching its HTML and rendering it in-page.
 */
@Component({
  selector: 'app-legal-doc',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './legal-doc.component.html',
  styleUrls: ['./legal-doc.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalDocComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly titleSvc = inject(Title);

  readonly title = signal<string>('');
  readonly html = signal<string>('');

  ngOnInit(): void {
    const data = this.route.snapshot.data as LegalRouteData;
    const initialSrc = data?.src ?? '/legal/privacy-policy.md';
    const pageTitle = data?.title ?? 'Legal';
    this.title.set(pageTitle);
    this.titleSvc.setTitle(`Trade Data Converter • ${pageTitle}`);

    this.loadDocument(initialSrc);
  }

  private loadDocument(src: string) {
    const tryOrder = this.buildTryOrder(src);

    const tryNext = (i: number): void => {
      if (i >= tryOrder.length) {
        this.html.set('<p>Document failed to load.</p>');
        return;
      }
      const current = tryOrder[i];
      this.http
        .get(current, { responseType: 'text' })
        .pipe(take(1))
        .subscribe({
          next: (text: string) => {
            const isMd = current.toLowerCase().endsWith('.md');
            // Force synchronous parse; TS types allow Promise, but we avoid async rendering here.
            const rawHtml = isMd ? (marked.parse(text, { async: false }) as string) : text;
            const safeHtml = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
            this.html.set(safeHtml);
          },
          error: () => tryNext(i + 1),
        });
    };

    tryNext(0);
  }

  private buildTryOrder(src: string): string[] {
    const lower = src.toLowerCase();
    if (lower.endsWith('.md')) {
      return [src, src.slice(0, -3) + '.html'];
    }
    if (lower.endsWith('.html')) {
      return [src, src.slice(0, -5) + '.md'];
    }
    // No extension supplied: prefer .md then .html
    return [src + '.md', src + '.html'];
  }
}
