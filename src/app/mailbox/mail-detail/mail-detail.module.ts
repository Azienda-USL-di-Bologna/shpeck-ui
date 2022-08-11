import { MailDetailComponent } from './mail-detail.component';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { PrimengModule } from 'src/app/primeng.module';
import { FormsModule } from '@angular/forms';
import { SanitizeHtmlPipe } from 'src/app/utils/sanitize-html-pipe';
import { RecepitsComponent } from '../recepits/recepits.component';
import { CommonComponentsModule } from "@bds/common-components";


@NgModule({
    declarations: [MailDetailComponent, SanitizeHtmlPipe, RecepitsComponent,],
    imports: [
      CommonModule, PrimengModule, FormsModule, CommonComponentsModule
    ],
    providers: [],
    exports: [MailDetailComponent, SanitizeHtmlPipe, RecepitsComponent,]
  })
  export class MailDetailModule { }