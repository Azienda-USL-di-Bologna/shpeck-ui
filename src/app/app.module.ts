import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { NgModule } from "@angular/core";
import { AppComponent } from "./app.component";

/* Login */
import { JwtLoginModule } from "@bds/jwt-login";
import { loginModuleConfig } from "./config/module-config";

// add support to italian language in application when using pipeDate
import { LOCALE_ID } from "@angular/core";
import { registerLocaleData } from "@angular/common";
import localeIt from "@angular/common/locales/it";
import localeItExtra from "@angular/common/locales/extra/it";

// Shpeck Module
import { ShpeckModule } from "@bds/shpeck";

import { appConfig } from "./app.config";
import { HeaderFeaturesModule, HeaderModule } from "@bds/common-components";
import { RouterModule } from "@angular/router";
import { AppRoutingModule } from "./app-routing.module";
import { routes } from "./app.routes";



registerLocaleData(localeIt, "it-IT", localeItExtra);

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    JwtLoginModule.forRoot(loginModuleConfig),
    AppRoutingModule,
    RouterModule.forRoot(routes, { useHash: false }),
    BrowserModule,
    BrowserAnimationsModule,
    //AppRoutingModule,
    ShpeckModule,
    HeaderModule,
    HeaderFeaturesModule,
  ],
  providers: [
    { provide: LOCALE_ID, useValue: "it-IT" },
    ...appConfig.providers,
  ],
  bootstrap: [AppComponent],
  exports: [],
})
export class AppModule {}
