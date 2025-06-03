import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileConverter } from './file-converter';

describe('FileConverter', () => {
  let component: FileConverter;
  let fixture: ComponentFixture<FileConverter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileConverter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FileConverter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
