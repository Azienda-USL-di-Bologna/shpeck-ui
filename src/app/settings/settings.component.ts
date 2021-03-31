import { Component, OnInit, OnDestroy } from "@angular/core";
import { NtJwtLoginService, UtenteUtilities } from "@bds/nt-jwt-login";
import { SettingsService } from "src/app/services/settings.service";
import { Subscription } from "rxjs";
import { FONTSIZE } from "src/environments/app-constants";
import { DynamicDialogRef } from "primeng-lts/dynamicdialog";

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
  public accessibilitaEnabled: boolean = false;

  constructor(public ref: DynamicDialogRef, private loginService: NtJwtLoginService, private impostazioniService: SettingsService) { }

  ngOnInit() {
    this.loginService.loggedUser$.subscribe((utente: UtenteUtilities) => {
      if (utente) {
        if (!this.loggedUser || utente.getUtente().id !== this.loggedUser.getUtente().id) {
          this.loggedUser = utente;
          this.loadSettings();
          this.accessibilitaEnabled = this.loggedUser.getUtente().idPersona.accessibilita;
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
    const fontSize = this.impostazioniService.getFontSize();
    this.model.fontSize = fontSize ? fontSize : FONTSIZE.BIG;

  }

  saveSettings() {
    this.impostazioniService.setHideDetail(this.model.hideDetail.toString());
    this.impostazioniService.setFontSize(this.model.fontSize);
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

  autoDestroy(){
    this.ref.destroy();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}

export class Impostazioni {
  hideDetail: boolean;
  fontSize: string;

  constructor() { }
}
