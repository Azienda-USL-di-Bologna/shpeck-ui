import { Component, OnInit } from "@angular/core";
import { HeaderFeaturesParams } from "@bds/nt-communicator";
import { MenuItem } from "primeng/api";
import { NtJwtLoginService, UtenteUtilities } from "@bds/nt-jwt-login";
import { getInternautaUrl, BaseUrlType } from "src/environments/app-constants";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent implements OnInit {
  title = "shpeck-ui";
  public headerFeaturesParams: HeaderFeaturesParams;
  public addToMenu: MenuItem[] = [];

  private utenteConnesso: UtenteUtilities;

  constructor(private loginService: NtJwtLoginService) {}

  ngOnInit() {
    this.headerFeaturesParams = {
      showCambioUtente: true,
      showLogOut: true,
      showUserFullName: true,
      showUserMenu: true,
      showManuale: true,
      showProfilo: true,
      logoutRedirectRoute: "/welcome"
    };

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
