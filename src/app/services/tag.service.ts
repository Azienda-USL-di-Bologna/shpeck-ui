import { Injectable } from "@angular/core";
import { NextSDREntityProvider } from "@nfa/next-sdr";
import { HttpClient } from "@angular/common/http";
import { DatePipe } from "@angular/common";
import { ENTITIES_CONFIGURATION, getInternautaUrl, BaseUrlType } from "src/environments/app-constants";

@Injectable({
  providedIn: "root"
})
export class TagService extends NextSDREntityProvider {

  constructor(protected http: HttpClient, protected datepipe: DatePipe) {
    super(http, datepipe, ENTITIES_CONFIGURATION.tag, getInternautaUrl(BaseUrlType.Shpeck));
  }
}
