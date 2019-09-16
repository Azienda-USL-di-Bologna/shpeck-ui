import { Component, OnInit } from "@angular/core";
import { MenuItem, DialogService } from "primeng/api";
import { NtJwtLoginService, UtenteUtilities, UtilityFunctions } from "@bds/nt-jwt-login";
import { getInternautaUrl, BaseUrlType, MAILBOX_ROUTE, LOGIN_ROUTE } from "src/environments/app-constants";
import { IntimusClientService } from "@bds/nt-communicator";
import { PopupMessaggiService } from "@bds/common-components";
import { HeaderFeaturesConfig } from "@bds/primeng-plugin";
import { SettingsComponent } from "./settings/settings.component";
import { ActivatedRoute, Router, Params } from "@angular/router";

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

  constructor(private loginService: NtJwtLoginService,
    public dialogService: DialogService,
    private route: ActivatedRoute,
    private router: Router ,
    private intimusClient: IntimusClientService,
    private popupMessaggiService: PopupMessaggiService) { }

  ngOnInit() {
    this.headerFeaturesConfig = new HeaderFeaturesConfig();
    this.headerFeaturesConfig.showCambioUtente = true;
    this.headerFeaturesConfig.showLogOut = true;
    this.headerFeaturesConfig.showUserFullName = true;
    this.headerFeaturesConfig.showUserMenu = true;
    this.headerFeaturesConfig.showManuale = true;
    this.headerFeaturesConfig.showProfilo = true;
    this.headerFeaturesConfig.logoutRedirectRoute = MAILBOX_ROUTE;
    this.headerFeaturesConfig.logoutIconPath = "assets/images/signout.svg";
    this.headerFeaturesConfig.logoutWarning = true;

    // configurazione login
    this.loginService.setloginUrl(getInternautaUrl(BaseUrlType.Login));
    this.loginService.setImpostazioniApplicazioniUrl(getInternautaUrl(BaseUrlType.ConfigurazioneImpostazioniApplicazioni));

    this.loginService.loggedUser$.subscribe((utente: UtenteUtilities) => {
      if (utente) {
        this.utenteConnesso = utente;
        console.log("loggedUser", this.utenteConnesso);
      }
    });
    this.route.queryParams.subscribe((params: Params) => UtilityFunctions.manageChangeUserLogin(params, this.loginService, this.router, LOGIN_ROUTE));

    this.addToMenu.push({
      label: "Impostazioni",
      icon: "pi pi-fw pi-cog slide-icon",
      command: () => { this.showSettings(SettingsComponent, "Impostazioni utente", "480px", "200px", null); }
    });
    this.addToMenu = Object.assign([], this.addToMenu);
  }

  showSettings(component, header, width, height, data) {
    const ref = this.dialogService.open(component, {
      data: data,
      header: header,
      width: width,
      styleClass: "dialog-class",
      contentStyle: { "max-height": "450px", "min-height": "250px", "overflow": "auto", "height": height, }
    });
  }
}
