import { Injectable } from "@angular/core";
import { NextSDREntityProvider } from "@nfa/next-sdr";
import { HttpClient } from "@angular/common/http";
import { DatePipe } from "@angular/common";
import { ENTITIES_STRUCTURE } from "@bds/ng-internauta-model";
import { getInternautaUrl, BaseUrlType } from "src/environments/app-constants";


@Injectable({
  providedIn: "root"
})
export class DraftLiteService extends NextSDREntityProvider {

  constructor(protected http: HttpClient, protected datepipe: DatePipe) {
    super(http, datepipe, ENTITIES_STRUCTURE.shpeck.draftlite, getInternautaUrl(BaseUrlType.Shpeck));
  }

}
