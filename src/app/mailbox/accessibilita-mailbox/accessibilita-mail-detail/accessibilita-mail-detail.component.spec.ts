import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessibilitaMailDetailComponent } from './accessibilita-mail-detail.component';

describe('AccessibilitaMailDetailComponent', () => {
  let component: AccessibilitaMailDetailComponent;
  let fixture: ComponentFixture<AccessibilitaMailDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccessibilitaMailDetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccessibilitaMailDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
