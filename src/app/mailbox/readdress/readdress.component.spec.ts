import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReaddressComponent } from './readdress.component';

describe('ReaddressComponent', () => {
  let component: ReaddressComponent;
  let fixture: ComponentFixture<ReaddressComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReaddressComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReaddressComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
