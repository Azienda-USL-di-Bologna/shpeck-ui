import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DatePipe } from "@angular/common";
import { getInternautaUrl, BaseUrlType } from "src/environments/app-constants";
import { ENTITIES_STRUCTURE, Pec } from "@bds/ng-internauta-model";
import { NextSDREntityProvider, FiltersAndSorts, SortDefinition, SORT_MODES, AdditionalDataDefinition } from "@nfa/next-sdr";
import { BehaviorSubject, Observable } from "rxjs";
import { tap, map } from "rxjs/operators";

@Injectable({
  providedIn: "root"
})
export class PecService extends NextSDREntityProvider {

  private _myPecsSubject: BehaviorSubject<Pec[]> = new BehaviorSubject(null);

  constructor(protected _http: HttpClient, protected _datepipe: DatePipe) {
    super(_http, _datepipe, ENTITIES_STRUCTURE.baborg.pec, getInternautaUrl(BaseUrlType.Baborg));
  }

  public getMyPecs(): Observable<Pec[]> {
    return super.getData(ENTITIES_STRUCTURE.baborg.pec.customProjections.CustomPecWithFolderListAndPecAziendaListAndTagList, this.buildFolderInitialFilterAndSort(), null, null).pipe(
      map(data => {
        if (data && data.results) {
          return data.results;
        }
      }), tap( (pecs: Pec[]) => {
        this._myPecsSubject.next(pecs);
      })
    );
  }

  private buildFolderInitialFilterAndSort(): FiltersAndSorts {
    const filter = new FiltersAndSorts();
    filter.addSort(new SortDefinition("attiva", SORT_MODES.desc));
    filter.addSort(new SortDefinition("indirizzo", SORT_MODES.asc));
    filter.addAdditionalData(new AdditionalDataDefinition("OperationRequested", "FilterPecPerStandardPermissions"));
    return filter;
  }

  public get myPecs(): Observable<Pec[]> {
    return this._myPecsSubject.asObservable();
  }
}
