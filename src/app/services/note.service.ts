import { Injectable } from "@angular/core";
import { NextSDREntityProvider, FiltersAndSorts, FilterDefinition, FILTER_TYPES } from "@nfa/next-sdr";
import { HttpClient } from "@angular/common/http";
import { DatePipe } from "@angular/common";
import { getInternautaUrl, BaseUrlType } from "src/environments/app-constants";
import { ENTITIES_STRUCTURE } from "@bds/ng-internauta-model";

@Injectable({
  providedIn: "root"
})
export class NoteService extends NextSDREntityProvider {

  constructor(protected http: HttpClient, protected datepipe: DatePipe) {
    super(http, datepipe, ENTITIES_STRUCTURE.shpeck.note, getInternautaUrl(BaseUrlType.Shpeck));
  }

  /**
   * Carica la nota (se presente) associata ad un messaggio
   * @param idMessage
   */
  public loadNote(idMessage: number) {
    const filtersAndSorts: FiltersAndSorts = new FiltersAndSorts();
    filtersAndSorts.addFilter(
      new FilterDefinition("idMessage.id", FILTER_TYPES.not_string.equals, idMessage)
    );
    return this.getData(null, filtersAndSorts, null, null);
  }
}
