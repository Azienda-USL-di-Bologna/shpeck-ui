import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { NgModule } from "@angular/core";
import { AppComponent } from "./app.component";

/* Login */
import { JwtLoginModule } from "@bds/jwt-login";
import { loginModuleConfig } from "./config/module-config";

// add support to italian language in application when using pipeDate
import { LOCALE_ID } from "@angular/core";
import { DatePipe, registerLocaleData } from "@angular/common";
import localeIt from "@angular/common/locales/it";
import localeItExtra from "@angular/common/locales/extra/it";

import { appConfig } from "./app.config";
import { HeaderFeaturesModule, HeaderModule } from "@bds/common-components";
import { RouterModule } from "@angular/router";
import { routes } from "./app.routes";
import { NgIdleKeepaliveModule } from "@ng-idle/keepalive";

registerLocaleData(localeIt, "it-IT", localeItExtra);

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    JwtLoginModule.forRoot(loginModuleConfig),
    BrowserModule,
    BrowserAnimationsModule,
    //ShpeckModule,
    //ShpeckRoutingModule, // Importa le route di shpeck dalla libreria
    RouterModule.forRoot(routes, { useHash: false }),
    HeaderModule,
    HeaderFeaturesModule,
    NgIdleKeepaliveModule.forRoot(),
  ],
  providers: [
    { provide: LOCALE_ID, useValue: "it-IT" },
    ...appConfig.providers,
    DatePipe,
  ],
  bootstrap: [AppComponent],
  exports: [],
})
export class AppModule {}
