import { Injectable } from "@angular/core";
import { UtenteUtilities, NtJwtLoginService } from "@bds/nt-jwt-login";
import { AppCustomization } from "src/environments/app-customization";
import { Subscription, Subject } from "rxjs";

@Injectable({
  providedIn: "root"
})
export class SettingsService {
  impostazioniVisualizzazione: any;
  loggedUser: UtenteUtilities;
  subscription: Subscription;
  settingsChangedNotifier$ = new Subject<boolean>();

  constructor(private loginService: NtJwtLoginService) {
    this.subscription = this.loginService.loggedUser$.subscribe((utente: UtenteUtilities) => {
      if (utente) {
        console.log("SettingsService loggedUserSubscription - utente: ", utente, "this.loggedUser: ", this.loggedUser);
        if (!this.loggedUser || utente.getUtente().id !== this.loggedUser.getUtente().id) {
          this.loggedUser = utente;
          if (this.loggedUser.getImpostazioniApplicazione()) {
            this.impostazioniVisualizzazione = JSON.parse(this.loggedUser.getImpostazioniApplicazione().impostazioniVisualizzazione);
          } else {
            this.impostazioniVisualizzazione = {};
          }
        } else {
          this.loggedUser = utente;
        }
      }
    });
  }

  getImpostazioniVisualizzazione() {
    return this.impostazioniVisualizzazione;
  }

  /* getRightSideOffsetWidth() {
    return this.impostazioniVisualizzazione[AppCustomization.shpeck.rigthside.offsetWidth];
  }

  setRightSideOffsetWidth(width: number) {
    this.impostazioniVisualizzazione[AppCustomization.shpeck.rigthside.offsetWidth] = width;
  } */

  getHideDetail() {
    return this.impostazioniVisualizzazione[AppCustomization.shpeck.hideDetail];
  }

  setHideDetail(hideDetailValue: string) {
    this.impostazioniVisualizzazione[AppCustomization.shpeck.hideDetail] = hideDetailValue;
  }

  /**
   * Lancia la notifica di cambiamento delle impostazioni ai sottoscrittori
   * @param settings L'oggetto che contiene le nuove impostazioni
  */
  doNotify(settings: any) {
    this.settingsChangedNotifier$.next(settings);
  }
}

