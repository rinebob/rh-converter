import { AfterViewInit, Component, ViewChildren, QueryList, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../../environments/environment';

interface ColumnDefinition {
  name: string;
  description: string;
}

/**
 * FileFormatRobinhoodComponent
 *
 * Displays Robinhood-specific file format sections with hard-coded data and columns using Angular signals.
 */
@Component({
  selector: 'app-file-format-robinhood',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatSortModule, MatIconModule],
  templateUrl: './file-format-robinhood.component.html',
  styleUrls: ['./file-format-robinhood.component.scss']
})
export class FileFormatRobinhoodComponent implements AfterViewInit {
  // Column definitions as signals
  inputColumns = signal<string[]>(['name', 'description']);
  regularColumns = signal<string[]>(['name', 'description']);
  dividendColumns = signal<string[]>(['name', 'description']);

  // Example links (from environment)
  readonly inputCsvUrl = signal<string | null>(environment.examples?.robinhood?.inputCsvUrl ?? null);
  readonly regularOutputCsvUrl = signal<string | null>(environment.examples?.robinhood?.regularOutputCsvUrl ?? null);
  readonly dividendOutputCsvUrl = signal<string | null>(environment.examples?.robinhood?.dividendOutputCsvUrl ?? null);
  readonly jsonOutputUrl = signal<string | null>(environment.examples?.robinhood?.jsonOutputUrl ?? null);
  readonly csvJsonZipOutputUrl = signal<string | null>(environment.examples?.robinhood?.csvJsonZipOutputUrl ?? null);

  // Data sources as signals
  inputData = signal<MatTableDataSource<ColumnDefinition>>(new MatTableDataSource([
    { name: 'Activity Date', description: 'Date of the transaction' },
    { name: 'Process Date', description: 'Date the transaction was processed' },
    { name: 'Settle Date', description: 'Settlement date of the transaction' },
    { name: 'Instrument', description: 'Name of the security/stock' },
    { name: 'Description', description: 'Detailed transaction description' },
    { name: 'Trans Code', description: 'Transaction type (e.g., Buy, Sell, Dividend)' },
    { name: 'Quantity', description: 'Number of shares/contracts' },
    { name: 'Price', description: 'Price per share/contract' },
    { name: 'Amount', description: 'Transaction amount' }
  ]));

  regularData = signal<MatTableDataSource<ColumnDefinition>>(new MatTableDataSource([
    { name: 'Activity Date', description: 'Date of the transaction' },
    { name: 'Process Date', description: 'Date the transaction was processed' },
    { name: 'Settle Date', description: 'Settlement date of the transaction' },
    { name: 'Instrument', description: 'Name of the security/stock' },
    { name: 'Description', description: 'Detailed transaction description' },
    { name: 'Trans Code', description: 'Transaction type (e.g., Buy, Sell, CDIV)' },
    { name: 'Amount', description: 'Transaction amount (positive for credit, negative for debit)' },
    { name: 'Quantity', description: 'Number of shares/contracts' },
    { name: 'Price', description: 'Price per share/contract' },
    { name: 'CUSIP', description: 'Security identifier' },
    { name: 'Notes', description: 'Additional transaction notes' }
  ]));

  dividendData = signal<MatTableDataSource<ColumnDefinition>>(new MatTableDataSource([
    { name: 'Activity Date', description: 'Date of the dividend' },
    { name: 'Process Date', description: 'Date the dividend was processed' },
    { name: 'Settle Date', description: 'Settlement date of the dividend' },
    { name: 'Instrument', description: 'Name of the security/stock' },
    { name: 'Description', description: 'Dividend description' },
    { name: 'Trans Code', description: 'Always "Dividend"' },
    { name: 'Amount', description: 'Dividend amount (positive)' },
    { name: 'Shares Owned', description: 'Number of shares owned on ex-dividend date' },
    { name: 'Dividend Per Share', description: 'Dividend amount per share' }
  ]));

  // Collect MatSort instances from the template in DOM order
  @ViewChildren(MatSort) sorts!: QueryList<MatSort>;

  ngAfterViewInit(): void {
    const sorts = this.sorts.toArray();
    // We only enable sorting on the Regular and Dividend tables (2nd and 3rd tables)
    // Index 0 corresponds to the first matSort in template (Regular table), index 1 to Dividend table
    if (sorts[0]) this.regularData().sort = sorts[0];
    if (sorts[1]) this.dividendData().sort = sorts[1];
  }
}
