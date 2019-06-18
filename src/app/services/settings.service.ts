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
        // if (!this.loggedUser || utente.getUtente().id !== this.loggedUser.getUtente().id) {
          if (!this.loggedUser) {
            this.loggedUser = utente;
            if (this.loggedUser.getImpostazioniApplicazione()) {
              this.impostazioniVisualizzazione = JSON.parse(this.loggedUser.getImpostazioniApplicazione().impostazioniVisualizzazione);
            } else {
              this.impostazioniVisualizzazione = {};
            }
            this.doNotify(this.impostazioniVisualizzazione);
          } else if (this.loggedUser.getImpostazioniApplicazione()) {
            const impostazioniVisualizzazioneLoggedUser = JSON.parse(this.loggedUser.getImpostazioniApplicazione().impostazioniVisualizzazione);
            const impostazioniVisualizzazioneNewUtente = JSON.parse(utente.getImpostazioniApplicazione().impostazioniVisualizzazione);
            if (!this.compareObjects(impostazioniVisualizzazioneLoggedUser, impostazioniVisualizzazioneNewUtente)) {
              this.impostazioniVisualizzazione = impostazioniVisualizzazioneNewUtente;
              this.doNotify(this.impostazioniVisualizzazione);
            } else {
              this.impostazioniVisualizzazione = impostazioniVisualizzazioneLoggedUser;
            }
            this.loggedUser = utente;
          } else {
            this.impostazioniVisualizzazione = {};
          }
        // } else {
        //   this.loggedUser = utente;
        // }
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

  /**
     * This nasty bugger finds out whether the objects are _traditionally_ equal to each other, like you might assume someone else would have put this function in vanilla JS already
     * One thing to note is that it uses coercive comparison (==) on properties which both objects have, not strict comparison (===)
     * @param base The base object which you would like to compare another object to
     * @param compare The object to compare to base
     * @returns boolean indicating whether or not the objects have all the same properties and those properties are ==
     */
    private compareObjects(base: any, compare: any): boolean {

      // loop through all properties in base object
      for (const baseProperty in base) {

          // determine if comparrison object has that property, if not: return false
          if (compare.hasOwnProperty(baseProperty)) {
              switch (typeof base[baseProperty]) {
                  // if one is object and other is not: return false
                  // if they are both objects, recursively call this comparison function
                  case "object":
                      if ( typeof compare[baseProperty] !== "object" || !this.compareObjects(base[baseProperty], compare[baseProperty]) ) { return false; } break;
                  // if one is function and other is not: return false
                  // if both are functions, compare function.toString() results
                  case "function":
                      if ( typeof compare[baseProperty] !== "function" || base[baseProperty].toString() !== compare[baseProperty].toString() ) { return false; } break;
                  // otherwise, see if they are equal using coercive comparison
                  default:
                      if ( base[baseProperty] != compare[baseProperty] ) { return false; }
              }
          } else {
              return false;
          }
      }

      // returns true only after false HAS NOT BEEN returned through all loops
      return true;
  }
}

