import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DatePipe } from "@angular/common";
import { getInternautaUrl, BaseUrlType } from "src/environments/app-constants";
import { ENTITIES_STRUCTURE } from "@bds/ng-internauta-model";
import { NextSDREntityProvider } from "@nfa/next-sdr";

@Injectable({
  providedIn: "root"
})
export class PecService extends NextSDREntityProvider {

  constructor(protected _http: HttpClient, protected _datepipe: DatePipe) {
    super(_http, _datepipe, ENTITIES_STRUCTURE.baborg.pec, getInternautaUrl(BaseUrlType.Baborg));
  }
}
