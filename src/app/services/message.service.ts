import { Injectable } from "@angular/core";
import { NextSDREntityProvider } from "@nfa/next-sdr";
import { HttpClient } from "@angular/common/http";
import { DatePipe } from "@angular/common";
import { getInternautaUrl, BaseUrlType, CUSTOM_SERVER_METHODS } from "src/environments/app-constants";
import { ENTITIES_STRUCTURE, Message } from "@bds/ng-internauta-model";

@Injectable({
  providedIn: "root"
})
export class MessageService extends NextSDREntityProvider {
  constructor(protected http: HttpClient, protected datepipe: DatePipe) {
    super(http, datepipe, ENTITIES_STRUCTURE.shpeck.message, getInternautaUrl(BaseUrlType.Shpeck));
  }

  public extractMessageData(message: Message) {
    const url = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.extractMessageData;
    // TODO: Definire il tipo di ritorno
    return this.http.post<any>(url, message);
  }

  public getEmlAttachment(path: string) {
    const url = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.getEmlAttachment + "/" + path;
    // TODO: Definire il tipo di ritorno
    return this.http.get<any>(url);
  }

  /* public prova(path: string) {
    const url = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.prova
    // TODO: Definire il tipo di ritorno
    return this.http.get<any>(url);
  } */
}
