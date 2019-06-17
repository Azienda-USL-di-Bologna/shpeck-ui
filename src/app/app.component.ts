import { Component, OnInit } from "@angular/core";
import { MenuItem, DialogService } from "primeng/api";
import { NtJwtLoginService, UtenteUtilities } from "@bds/nt-jwt-login";
import { getInternautaUrl, BaseUrlType, MAILBOX_ROUTE, LOGIN_ROUTE } from "src/environments/app-constants";
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
    private router: Router) { }

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

    // configurazione login
    this.loginService.setloginUrl(getInternautaUrl(BaseUrlType.Login));
    this.loginService.setImpostazioniApplicazioniUrl(getInternautaUrl(BaseUrlType.ConfigurazioneImpostazioniApplicazioni));

    this.loginService.loggedUser$.subscribe((utente: UtenteUtilities) => {
      if (utente) {
        this.utenteConnesso = utente;
        console.log("loggedUser", this.utenteConnesso);
      }
    });
    this.route.queryParams.subscribe((params: Params) => {
      console.log("dentro subscribe, ", params.hasOwnProperty("impersonatedUser"));
      console.log("chiamo login");
      console.log("impersonateUser: ", params["impersonatedUser"]);

      // se nei params c'è la proprietà impersonatedUser, allora pulisci la sessione, setta nella sessionStorage l'utente impersonato
      // e cancellalo dai params
      if (params.hasOwnProperty("impersonatedUser")) {
        this.loginService.clearSession();
        this.loginService.setimpersonatedUser(params["impersonatedUser"].trim(), params["realUser"].trim());

        // eliminazione dai query params di impersonatedUser
        // this.loginService.redirectTo = this.router.routerState.snapshot.url.replace(/(?<=&|\?)impersonatedUser(=[^&]*)?(&|$)/, "");
        this.loginService.redirectTo = this.removeQueryParams(this.router.routerState.snapshot.url, "realUser");
        this.loginService.redirectTo = this.removeQueryParams(this.loginService.redirectTo, "impersonatedUser");
        // if (this.loginService.redirectTo.endsWith("?") || this.loginService.redirectTo.endsWith("&")) {
        //   this.loginService.redirectTo = this.loginService.redirectTo.substr(0, this.loginService.redirectTo.length - 1)
        // }
        console.log("STATE: ", this.loginService.redirectTo);
        this.router.navigate([LOGIN_ROUTE]);
        // this.deletedImpersonatedUserQueryParams = true;
      }

      // console.log("this.deletedImpersonatedUserQueryParams: ", this.deletedImpersonatedUserQueryParams);
    });
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

  public removeQueryParams(url: string, paramToRemove: string): string {
    const splittedUrl: string[] = url.split("?");
    if (splittedUrl.length === 1) {
      return url;
    }
    let purgedQueryParams: string = "";
    const queryParams: string = splittedUrl[1];
    const splittedQueryParams: string[] = queryParams.split("&");
    for (let i = 0; i < splittedQueryParams.length; i++) {
      const splittedQueryParam: string[] = splittedQueryParams[i].split("=");
      if (splittedQueryParam[0] !== paramToRemove) {
        purgedQueryParams += splittedQueryParams[i] + "&";
      }
    }

    if (purgedQueryParams !== "") {
      return splittedUrl[0] + "?" + purgedQueryParams.substr(0, purgedQueryParams.length - 1);
    } else {
      return splittedUrl[0];
    }
  }
}
