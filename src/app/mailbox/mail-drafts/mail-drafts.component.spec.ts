import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MailDraftsComponent } from './mail-drafts.component';

describe('MailDraftsComponent', () => {
  let component: MailDraftsComponent;
  let fixture: ComponentFixture<MailDraftsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MailDraftsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MailDraftsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
