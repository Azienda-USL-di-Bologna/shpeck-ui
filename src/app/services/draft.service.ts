import { Injectable } from "@angular/core";
import { NextSDREntityProvider } from "@nfa/next-sdr";
import { DatePipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { ENTITIES_STRUCTURE } from "@bds/ng-internauta-model";
import { getInternautaUrl, BaseUrlType, CUSTOM_SERVER_METHODS } from "src/environments/app-constants";

@Injectable({
  providedIn: "root"
})
export class DraftService extends NextSDREntityProvider {

  constructor(protected http: HttpClient, protected datepipe: DatePipe) {
    super(http, datepipe, ENTITIES_STRUCTURE.shpeck.draft, getInternautaUrl(BaseUrlType.Shpeck));
  }

  /**
   * Salva la bozza sul database e ritorna un observable
   * @param form La form contenente tutti i campi della mail da salvare
  */
  public saveDraftMessage(form: FormData) {
    const apiUrl = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.saveDraftMessage;
    return this.http.post(apiUrl, form);
  }

  /**
   * Invia la mail al server e ritorna un observable
   * @param form La form contenente tutti i campi della mail da salvare
  */
  public sendMessage(form: FormData) {
    const apiUrl = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.sendMessage;
    return this.http.post(apiUrl, form);
  }
}
