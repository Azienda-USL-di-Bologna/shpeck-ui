import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PrimengModule } from "src/app/primeng.module";
import { MailFoldersComponent } from "./mail-folders.component";
import { MailFoldersService } from "./mail-folders.service";
import { FormsModule } from "@angular/forms";



@NgModule({
  declarations: [MailFoldersComponent],
  imports: [
    CommonModule, PrimengModule, FormsModule
  ],
  providers: [MailFoldersService],
  exports: [MailFoldersComponent]
})
export class MailFoldersModule { }
