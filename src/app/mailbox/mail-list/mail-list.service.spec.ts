import { TestBed } from '@angular/core/testing';

import { MailListService } from './mail-list.service';

describe('MailListService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: MailListService = TestBed.get(MailListService);
    expect(service).toBeTruthy();
  });
});
