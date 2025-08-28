import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { FileFormatRobinhoodComponent } from '../file-format-robinhood/file-format-robinhood.component';

interface ColumnDefinition {
  name: string;
  description: string;
}

@Component({
  selector: 'app-file-formats-content',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatIconModule,
    MatExpansionModule,
    FileFormatRobinhoodComponent
  ],
  templateUrl: './file-formats-content.component.html',
  styleUrls: ['./file-formats-content.component.scss']
})
export class FileFormatsContentComponent implements AfterViewInit {
  // Input CSV Format
  inputColumns: string[] = ['name', 'description'];
  inputData: MatTableDataSource<ColumnDefinition>;

  // Regular Transactions Format
  regularColumns: string[] = ['name', 'description'];
  regularData: MatTableDataSource<ColumnDefinition>;

  // Dividend Transactions Format
  dividendColumns: string[] = ['name', 'description'];
  dividendData: MatTableDataSource<ColumnDefinition>;

  @ViewChild(MatSort) sort!: MatSort;

  constructor() {
    // Input CSV Format Data
    this.inputData = new MatTableDataSource([
      { name: 'Activity Date', description: 'Date of the transaction' },
      { name: 'Process Date', description: 'Date the transaction was processed' },
      { name: 'Settle Date', description: 'Settlement date of the transaction' },
      { name: 'Instrument', description: 'Name of the security/stock' },
      { name: 'Description', description: 'Detailed transaction description' },
      { name: 'Trans Code', description: 'Transaction type (e.g., Buy, Sell, Dividend)' },
      { name: 'Quantity', description: 'Number of shares/contracts' },
      { name: 'Price', description: 'Price per share/contract' },
      { name: 'Amount', description: 'Transaction amount' }
    ]);

    // Regular Transactions Format Data
    this.regularData = new MatTableDataSource([
      { name: 'Activity Date', description: 'Date of the transaction' },
      { name: 'Process Date', description: 'Date the transaction was processed' },
      { name: 'Settle Date', description: 'Settlement date of the transaction' },
      { name: 'Instrument', description: 'Name of the security/stock' },
      { name: 'Description', description: 'Detailed transaction description' },
      {
        name: 'Trans Code',
        description: `Transaction type (e.g., Buy, Sell, CDIV)`
      },
      { name: 'Amount', description: 'Transaction amount (positive for credit, negative for debit)' },
      { name: 'Quantity', description: 'Number of shares/contracts' },
      { name: 'Price', description: 'Price per share/contract' },
      { name: 'CUSIP', description: 'Security identifier' },
      { name: 'Notes', description: 'Additional transaction notes' }
    ]);

    // Dividend Transactions Format Data
    this.dividendData = new MatTableDataSource([
      { name: 'Activity Date', description: 'Date of the dividend' },
      { name: 'Process Date', description: 'Date the dividend was processed' },
      { name: 'Settle Date', description: 'Settlement date of the dividend' },
      { name: 'Instrument', description: 'Name of the security/stock' },
      { name: 'Description', description: 'Dividend description' },
      { name: 'Trans Code', description: 'Always "Dividend"' },
      { name: 'Amount', description: 'Dividend amount (positive)' },
      { name: 'Shares Owned', description: 'Number of shares owned on ex-dividend date' },
      { name: 'Dividend Per Share', description: 'Dividend amount per share' }
    ]);
  }

  ngAfterViewInit() {
    // Assign sort after view init to ensure @ViewChild(MatSort) is resolved
    // This check is important if the tables are not immediately visible (e.g. in an @if block)
    if (this.sort) {
        this.inputData.sort = this.sort;
        this.regularData.sort = this.sort;
        this.dividendData.sort = this.sort;
    } else {
        // Fallback or error handling if sort is not available for some reason
        // This might happen if the component's template doesn't render matSort correctly
        // or if ngAfterViewInit is called before matSort is ready.
        // For robust handling, consider using a setter for sort or a more complex lifecycle hook management.
        console.warn('MatSort not found for FileFormatsContentComponent. Sorting will not be available for tables.');
    }
  }
}
