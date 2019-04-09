import { Component, OnInit, OnDestroy } from "@angular/core";
import { DynamicDialogRef } from "primeng/api";
import { NtJwtLoginService, UtenteUtilities } from "@bds/nt-jwt-login";
import { SettingsService } from "src/app/services/settings.service";
import { Subscription } from "rxjs";

@Component({
  selector: "app-settings",
  templateUrl: "./settings.component.html",
  styleUrls: ["./settings.component.scss"]
})
export class SettingsComponent implements OnInit, OnDestroy {

  checked: boolean;
  model: Impostazioni;
  loggedUser: UtenteUtilities;
  private subscription: Subscription;

  constructor(public ref: DynamicDialogRef, private loginService: NtJwtLoginService, private impostazioniService: SettingsService) { }

  ngOnInit() {
    this.loginService.loggedUser$.subscribe((utente: UtenteUtilities) => {
      if (utente) {
        if (!this.loggedUser || utente.getUtente().id !== this.loggedUser.getUtente().id) {
          this.loggedUser = utente;
          this.loadSettings();
        }
      }
    });
  }

  loadSettings() {
    this.model = new Impostazioni();
    this.model.hideDetail = this.impostazioniService.getHideDetail() === "true";
    if (this.model.hideDetail === null || this.model.hideDetail === undefined) {
      this.model.hideDetail = false;
    }
  }

  saveSettings() {
    this.impostazioniService.setHideDetail(this.model.hideDetail.toString());
    this.subscription =
      this.loggedUser.setImpostazioniApplicazione(this.loginService, this.impostazioniService.getImpostazioniVisualizzazione())
      .subscribe((newSettings) => {
        this.impostazioniService.doNotify(newSettings);
        this.onClose();
      });
    }

  onClose() {
    this.ref.close();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}

export class Impostazioni {
  hideDetail: boolean;

  constructor() { }
}
