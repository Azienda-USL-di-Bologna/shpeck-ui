import { Pipe, PipeTransform, SecurityContext } from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";

@Pipe({ name: "sanitizeHtml"})

export class SanitizeHtmlPipe implements PipeTransform  {
  constructor(private _sanitizer: DomSanitizer) { }

  transform(value: string): SafeHtml {
    // return this._sanitizer.sanitize(SecurityContext.HTML , value);
    return this._sanitizer.bypassSecurityTrustHtml(value);
    // return this._sanitizer.bypassSecurityTrustUrl(value);
  }
}
