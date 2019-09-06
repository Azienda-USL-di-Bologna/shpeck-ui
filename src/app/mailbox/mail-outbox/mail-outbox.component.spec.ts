import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MailOutboxComponent } from './mail-outbox.component';

describe('MailOutboxComponent', () => {
  let component: MailOutboxComponent;
  let fixture: ComponentFixture<MailOutboxComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MailOutboxComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MailOutboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
