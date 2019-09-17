import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { NgModule } from "@angular/core";
import { DatePipe } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { PrimengModule } from "./primeng.module";
import { MailboxComponent } from "./mailbox/mailbox.component";
import { MailListComponent } from "./mailbox/mail-list/mail-list.component";
import { MailDetailComponent } from "./mailbox/mail-detail/mail-detail.component";
import { ReaddressComponent } from "./mailbox/readdress/readdress.component";
import { SearchContactComponent } from "./search-contact/search-contact.component";

/* Login */
import { NtJwtLoginModule } from "@bds/nt-jwt-login";
import { loginModuleConfig } from "./config/module-config";

import { PrimengPluginModule } from "@bds/primeng-plugin";
import { DialogService } from "primeng/api";
import { MessageService } from "primeng/api";
import { TooltipModule } from "primeng/tooltip";
import { MailFoldersComponent } from "./mailbox/mail-folders/mail-folders.component";
import { SanitizeHtmlPipe } from "./utils/sanitize-html-pipe";
import { ToolbarComponent } from "./mailbox/toolbar/toolbar.component";
import { SettingsComponent } from "./settings/settings.component";
import { NewMailComponent } from "./mailbox/new-mail/new-mail.component";
import { TagService } from "./services/tag.service";
import { PecService } from "./services/pec.service";
import { FolderService } from "./services/folder.service";
import { RecepitsComponent } from "./mailbox/recepits/recepits.component";
import { ShpeckMessageService } from "./services/shpeck-message.service";
import { MessageFolderService } from "./services/message-folder.service";
import { DraftService } from "./services/draft.service";
import { OutboxService } from "./services/outbox.service";
import { NextSdrModule } from "@nfa/next-sdr";

// add support to italian language in application when using pipeDate
import { LOCALE_ID } from "@angular/core";
import { registerLocaleData } from "@angular/common";
import localeIt from "@angular/common/locales/it";
import localeItExtra from "@angular/common/locales/extra/it";
import { MailDraftsComponent } from "./mailbox/mail-drafts/mail-drafts.component";
import { MailOutboxComponent } from "./mailbox/mail-outbox/mail-outbox.component";
import { StripeHtmlPipe } from "./pipes/stripe-html.pipe";
import { MailListService } from "./mailbox/mail-list/mail-list.service";
import { CommandManagerService } from "./services/command-manager.service";

// incon - font - styles
import { MatIconModule } from "@angular/material/icon";

registerLocaleData(localeIt, "it-IT", localeItExtra);


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
    NewMailComponent,
    RecepitsComponent,
    MailDraftsComponent,
    StripeHtmlPipe,
    ReaddressComponent,
    SearchContactComponent,
    MailOutboxComponent
  ],
  imports: [
    NtJwtLoginModule.forRoot(loginModuleConfig),
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    AppRoutingModule,
    PrimengModule,
    PrimengPluginModule,
    TooltipModule,
    ReactiveFormsModule,
    NextSdrModule,
    MatIconModule
  ],
  providers: [
    { provide: LOCALE_ID, useValue: "it-IT" },
    DialogService,
    DatePipe,
    PecService,
    TagService,
    DraftService,
    OutboxService,
    FolderService,
    MessageService,
    ShpeckMessageService,
    MessageFolderService,
    MailListService,
    CommandManagerService
  ],
  bootstrap: [AppComponent],
  entryComponents: [SettingsComponent, NewMailComponent, ReaddressComponent]
})
export class AppModule { }
