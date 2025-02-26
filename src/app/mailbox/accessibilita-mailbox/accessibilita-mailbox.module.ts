import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AccessibilitaMailboxComponent } from "./accessibilita-mailbox.component";
import { AccessibilitaRoutingModule } from "./accessibilita-routing.module";
import { PrimengModule } from "src/app/primeng.module";
import { AccessibilitaMailListComponent } from "./accessibilita-mail-list/accessibilita-mail-list.component";
import { ShpeckToolbarModule } from "../toolbar/shpeck-toolbar.module";
import { MailFoldersModule } from "../mail-folders/mail-folders.module";
import { AccessibilitaMailDetailComponent } from "./accessibilita-mail-detail/accessibilita-mail-detail.component";
import { MailDetailModule } from "../mail-detail/mail-detail.module";
import { CommonComponentsModule } from "@bds/common-components";
import { MailListService } from "../mail-list/mail-list.service";

@NgModule({
  declarations: [AccessibilitaMailboxComponent, AccessibilitaMailListComponent, AccessibilitaMailDetailComponent],
  imports: [
    CommonModule,
    AccessibilitaRoutingModule,
    ShpeckToolbarModule,
    PrimengModule,
    MailFoldersModule,
    MailDetailModule,
    CommonComponentsModule,
  ],
  providers: [MailListService],
})
export class AccessibilitaMailboxModule {}
