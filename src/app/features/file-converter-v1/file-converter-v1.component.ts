import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';

interface ColumnDefinition {
  name: string;
  description: string;
}

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
    MatTableModule,
    MatSortModule
  ],
  templateUrl: './file-converter-v1.component.html',
  styleUrls: ['./file-converter-v1.component.scss']
})
export class FileConverterV1Component implements AfterViewInit {
  activeTabIndex = 0;
  
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
    this.inputData.sort = this.sort;
    this.regularData.sort = this.sort;
    this.dividendData.sort = this.sort;
  }

  onTabChange(index: number) {
    this.activeTabIndex = index;
  }
}
