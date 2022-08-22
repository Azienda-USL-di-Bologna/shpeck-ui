import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AccessibilitaMailboxComponent } from "./accessibilita-mailbox.component";
import { AccessibilitaRoutingModule } from "./accessibilita-routing.module";
import { PrimengModule } from "src/app/primeng.module";
import { AccessibilitaMailListComponent } from "./accessibilita-mail-list/accessibilita-mail-list.component";
import { AppModule } from "src/app/app.module";
import { ShpeckToolbarModule } from "../toolbar/shpeck-toolbar.module";
import { MailFoldersModule } from "../mail-folders/mail-folders.module";
import { AccessibilitaMailDetailComponent } from './accessibilita-mail-detail/accessibilita-mail-detail.component';
import { RouteReuseStrategy } from '@angular/router';
import { CustomReuseStrategy } from 'src/app/custom-reuse-strategy';
import { MailDetailModule } from '../mail-detail/mail-detail.module';
import { CommonComponentsModule } from "@bds/common-components";



@NgModule({
  declarations: [AccessibilitaMailboxComponent, AccessibilitaMailListComponent, AccessibilitaMailDetailComponent],
  imports: [
    CommonModule, 
    AccessibilitaRoutingModule, 
    ShpeckToolbarModule, 
    PrimengModule, 
    MailFoldersModule, 
    MailDetailModule,
    CommonComponentsModule
  ],
  providers: [
  ]
})
export class AccessibilitaMailboxModule { }
