import { Injectable } from "@angular/core";
import { NextSDREntityProvider } from "@nfa/next-sdr";
import { HttpClient } from "@angular/common/http";
import { DatePipe } from "@angular/common";
import {  getInternautaUrl, BaseUrlType } from "src/environments/app-constants";
import { ENTITIES_STRUCTURE } from "@bds/ng-internauta-model";

@Injectable({
  providedIn: "root"
})
export class TagService extends NextSDREntityProvider {

  constructor(protected http: HttpClient, protected datepipe: DatePipe) {
    super(http, datepipe, ENTITIES_STRUCTURE.shpeck.tag, getInternautaUrl(BaseUrlType.Shpeck));
  }
}
