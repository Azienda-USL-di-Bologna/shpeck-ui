import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { NgModule } from "@angular/core";
import { DatePipe } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { PrimengModule } from "./primeng.module";
import { CommonComponentsModule, HeaderModule, HeaderFeaturesModule } from "@bds/common-components";
import { RubrintModule } from "@bds/rubrint";

import { MailboxComponent } from "./mailbox/mailbox.component";
import { MailListComponent } from "./mailbox/mail-list/mail-list.component";

import { ReaddressComponent } from "./mailbox/readdress/readdress.component";
import { SearchContactComponent } from "./search-contact/search-contact.component";

/* Login */
import { JwtLoginModule } from "@bds/jwt-login";
import { loginModuleConfig } from "./config/module-config";

import { PrimengPluginModule } from "@bds/primeng-plugin";
import { ConfirmationService, MessageService } from "primeng/api";
import { SettingsComponent } from "./settings/settings.component";
import { NewMailComponent } from "./mailbox/new-mail/new-mail.component";
import { TagService } from "./services/tag.service";
import { PecService } from "./services/pec.service";
import { FolderService } from "./services/folder.service";
import { ShpeckMessageService } from "./services/shpeck-message.service";
import { MessageFolderService } from "./services/message-folder.service";
import { DraftService } from "./services/draft.service";
import { OutboxService } from "./services/outbox.service";
import { NextSdrModule } from "@bds/next-sdr";

// add support to italian language in application when using pipeDate
import { LOCALE_ID } from "@angular/core";
import { registerLocaleData } from "@angular/common";
import localeIt from "@angular/common/locales/it";
import localeItExtra from "@angular/common/locales/extra/it";
import { MailDraftsComponent } from "./mailbox/mail-drafts/mail-drafts.component";
import { MailOutboxComponent } from "./mailbox/mail-outbox/mail-outbox.component";
import { StripeHtmlPipe } from "./pipes/stripe-html.pipe";
import { MailListService } from "./mailbox/mail-list/mail-list.service";

// incon - font - styles
import { MatIconModule } from "@angular/material/icon";
import { RubricaContainerComponent } from "./rubrica/rubrica-container/rubrica-container.component";
import { DialogService } from "primeng/dynamicdialog";
import { MailFoldersModule } from "./mailbox/mail-folders/mail-folders.module";

import { RouteReuseStrategy } from '@angular/router';
import { CustomReuseStrategy } from './custom-reuse-strategy';
import { MailDetailModule } from './mailbox/mail-detail/mail-detail.module';
import { LandingRoutingComponent } from './landing-routing/landing-routing.component';
import { MatMenuModule } from "@angular/material/menu";
import { ShpeckToolbarModule } from "./mailbox/toolbar/shpeck-toolbar.module";

registerLocaleData(localeIt, "it-IT", localeItExtra);


@NgModule({
  declarations: [
    AppComponent,
    MailboxComponent,
    MailListComponent,
    SettingsComponent,
    NewMailComponent,
    MailDraftsComponent,
    StripeHtmlPipe,
    ReaddressComponent,
    SearchContactComponent,
    MailOutboxComponent,
    RubricaContainerComponent,
    LandingRoutingComponent
  ],
  imports: [
    JwtLoginModule.forRoot(loginModuleConfig),
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    MatIconModule,
    MatMenuModule,
    PrimengModule,
    NextSdrModule,
    PrimengPluginModule,
    CommonComponentsModule,
    HeaderModule,
    HeaderFeaturesModule,
    RubrintModule,
    ShpeckToolbarModule,
    MailFoldersModule,
    MailDetailModule,
    
  ],
  providers: [
    { provide: LOCALE_ID, useValue: "it-IT" },
    { provide: RouteReuseStrategy, useClass: CustomReuseStrategy },
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
    ConfirmationService
  ],
  bootstrap: [AppComponent],
  entryComponents: [SettingsComponent, NewMailComponent, ReaddressComponent],
  exports: [  ]
})
export class AppModule { }
