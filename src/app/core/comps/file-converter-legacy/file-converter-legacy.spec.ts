import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileConverterLegacy } from './file-converter-legacy';

describe('FileConverterLegacy', () => {
  let component: FileConverterLegacy;
  let fixture: ComponentFixture<FileConverterLegacy>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileConverterLegacy]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FileConverterLegacy);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
