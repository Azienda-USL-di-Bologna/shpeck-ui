import { Component, OnInit } from "@angular/core";
import { MenuItem } from "primeng/api";
import { JwtLoginService, UtenteUtilities, UtilityFunctions } from "@bds/jwt-login";
import { MAILBOX_ROUTE, LOGIN_ROUTE, APPLICATION } from "src/environments/app-constants";
import { IntimusClientService } from "@bds/common-tools";
import { PopupMessaggiService,HeaderFeaturesConfig } from "@bds/common-components";

import { SettingsComponent } from "./settings/settings.component";
import { ActivatedRoute, Router, Params } from "@angular/router";
import { getInternautaUrl, BaseUrlType } from "@bds/internauta-model";
import Quill from "quill";
import { DialogService } from "primeng/dynamicdialog";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent implements OnInit {
  title = "shpeck-ui";
  public headerFeaturesConfig: HeaderFeaturesConfig;
  public addToMenu: MenuItem[] = [];

  private utenteConnesso: UtenteUtilities;

  constructor(
    private loginService: JwtLoginService,
    public dialogService: DialogService,
    private route: ActivatedRoute,
    private router: Router ,
    private intimusClient: IntimusClientService,
    private popupMessaggiService: PopupMessaggiService) { }

  ngOnInit() {
    const Link = Quill.import("formats/link");
    Link.sanitize = function(url) {
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }
      return url;
    };

    this.headerFeaturesConfig = new HeaderFeaturesConfig();
    this.headerFeaturesConfig.showCambioUtente = true;
    this.headerFeaturesConfig.showLogOut = true;
    this.headerFeaturesConfig.showUserFullName = true;
    this.headerFeaturesConfig.showUserMenu = true;
    this.headerFeaturesConfig.showManuale = true;
    this.headerFeaturesConfig.showProfilo = true;
    this.headerFeaturesConfig.logoutRedirectRoute = "/" + MAILBOX_ROUTE;
    this.headerFeaturesConfig.logoutIconPath = "assets/images/signout.svg";
    this.headerFeaturesConfig.logoutWarning = true;

    // configurazione login
    this.loginService.setLoginUrl(getInternautaUrl(BaseUrlType.Login));
    this.loginService.setImpostazioniApplicazioniUrl(getInternautaUrl(BaseUrlType.ConfigurazioneImpostazioniApplicazioni));
    this.loginService.setPassTokenGeneratorURL(getInternautaUrl(BaseUrlType.PassTokenGenerator));

    this.loginService.loggedUser$.subscribe((utente: UtenteUtilities) => {
      if (utente) {
        this.utenteConnesso = utente;
        const intimusUrl = getInternautaUrl(BaseUrlType.Intimus);
        this.intimusClient.start(
          intimusUrl,
          APPLICATION,
          this.utenteConnesso.getUtente().idPersona.id,
          this.utenteConnesso.getUtente().aziendaLogin.id,
          this.utenteConnesso.getUtente().aziende.map(a => a.id));
        console.log("loggedUser", this.utenteConnesso);
      }
    });
    this.route.queryParams.subscribe((params: Params) => UtilityFunctions.manageChangeUserLogin(params, this.loginService, this.router, "/" + LOGIN_ROUTE));

    this.addToMenu.push({
      label: "Impostazioni",
      icon: "pi pi-fw pi-cog slide-icon",
      command: () => { this.showSettings(SettingsComponent, "Impostazioni utente", "30rem", "12.5rem", null); }
    });
    this.addToMenu = Object.assign([], this.addToMenu);
  }

  showSettings(component, header, width, height, data) {
    const ref = this.dialogService.open(component, {
      data: data,
      header: header,
      width: width,
      styleClass: "dialog-class",
      contentStyle: { "max-height": "28.125rem", "min-height": "15.625rem", "overflow": "auto", "height": height, }
    });
  }
}
