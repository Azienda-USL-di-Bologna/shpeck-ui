import { Injectable } from "@angular/core";
import { NextSDREntityProvider } from "@nfa/next-sdr";
import { DatePipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { ENTITIES_STRUCTURE } from "@bds/ng-internauta-model";
import { getInternautaUrl, BaseUrlType } from "src/environments/app-constants";

@Injectable({
  providedIn: "root"
})
export class FolderService extends NextSDREntityProvider {

  constructor(protected http: HttpClient, protected datepipe: DatePipe) {
    super(http, datepipe, ENTITIES_STRUCTURE.shpeck.folder, getInternautaUrl(BaseUrlType.Shpeck));
  }
}
