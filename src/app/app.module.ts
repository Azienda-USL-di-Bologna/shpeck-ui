import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { NgModule } from "@angular/core";
import { DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { PrimengModule } from "./primeng.module";
import { MailboxComponent } from "./mailbox/mailbox.component";
import { MailListComponent } from "./mailbox/mail-list/mail-list.component";
import { MailDetailComponent } from "./mailbox/mail-detail/mail-detail.component";

/* Login */
import { NtJwtLoginModule } from "@bds/nt-jwt-login";
import { loginModuleConfig } from "./config/module-config";

import { PrimengPluginModule } from "@bds/primeng-plugin";
import { DialogService } from "primeng/api";
import { MailFoldersComponent } from "./mailbox/mail-folders/mail-folders.component";
import { SanitizeHtmlPipe } from "./utils/sanitize-html-pipe";
import { ToolbarComponent } from "./mailbox/toolbar/toolbar.component";
import { SettingsComponent } from "./settings/settings.component";
import { NewMailComponent } from "./mailbox/new-mail/new-mail.component";

@NgModule({
  declarations: [
    AppComponent,
    MailboxComponent,
    MailListComponent,
    MailDetailComponent,
    MailFoldersComponent,
    SanitizeHtmlPipe,
    ToolbarComponent,
    SettingsComponent,
    NewMailComponent
  ],
  imports: [
    NtJwtLoginModule.forRoot(loginModuleConfig),
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    AppRoutingModule,
    PrimengModule,
    PrimengPluginModule,
    FormsModule
  ],
  providers: [DialogService, DatePipe],
  bootstrap: [AppComponent],
  entryComponents: [SettingsComponent, NewMailComponent]
})
export class AppModule { }
