import { Component, OnInit } from "@angular/core";
import { MenuItem } from "primeng/api";
import { NtJwtLoginService, UtenteUtilities } from "@bds/nt-jwt-login";
import { getInternautaUrl, BaseUrlType, MAILBOX_ROUTE } from "src/environments/app-constants";
import { HeaderFeaturesConfig } from "@bds/primeng-plugin";

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

  constructor(private loginService: NtJwtLoginService) {}

  ngOnInit() {
    this.headerFeaturesConfig = new HeaderFeaturesConfig();
    this.headerFeaturesConfig.showCambioUtente = false;
    this.headerFeaturesConfig.showLogOut = true;
    this.headerFeaturesConfig.showUserFullName = true;
    this.headerFeaturesConfig.showUserMenu = true;
    this.headerFeaturesConfig.showManuale = true;
    this.headerFeaturesConfig.showProfilo = true;
    this.headerFeaturesConfig.logoutRedirectRoute = MAILBOX_ROUTE;
    this.headerFeaturesConfig.logoutIconPath = "assets/images/signout.svg";

    // configurazione login
    this.loginService.setloginUrl(getInternautaUrl(BaseUrlType.Login));
    this.loginService.setImpostazioniApplicazioniUrl(getInternautaUrl(BaseUrlType.ConfigurazioneImpostazioniApplicazioni));

    this.loginService.loggedUser$.subscribe((utente: UtenteUtilities) => {
      if (utente) {
        this.utenteConnesso = utente;
      }
    });

    /* this.addToMenu.push({
      label: 'Impostazioni',
      icon: 'pi pi-fw pi-cog slide-icon',
      command: () => {  }
    });
    this.addToMenu = Object.assign([], this.addToMenu); */
  }
}
