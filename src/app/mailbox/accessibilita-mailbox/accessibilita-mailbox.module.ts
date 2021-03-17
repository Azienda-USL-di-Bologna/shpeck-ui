import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AccessibilitaMailboxComponent } from "./accessibilita-mailbox.component";
import { AccessibilitaRoutingModule } from "./accessibilita-routing.module";
import { PrimengModule } from "src/app/primeng.module";
import { AccessibilitaMailListComponent } from "../accessibilita-mail-list/accessibilita-mail-list.component";
import { AppModule } from "src/app/app.module";
import { ToolbarModule } from "../toolbar/toolbar.module";
import { MailFoldersModule } from "../mail-folders/mail-folders.module";



@NgModule({
  declarations: [AccessibilitaMailboxComponent, AccessibilitaMailListComponent],
  imports: [
    CommonModule, AccessibilitaRoutingModule, ToolbarModule, PrimengModule, MailFoldersModule
  ]
})
export class AccessibilitaMailboxModule { }
