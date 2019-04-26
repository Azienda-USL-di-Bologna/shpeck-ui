import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DatePipe } from "@angular/common";
import { getInternautaUrl, BaseUrlType } from "src/environments/app-constants";
import { ENTITIES_STRUCTURE, Pec } from "@bds/ng-internauta-model";
import { NextSDREntityProvider, FiltersAndSorts, PagingConf } from "@nfa/next-sdr";
import { BehaviorSubject, Observable, concat } from "rxjs";
import { tap, map } from "rxjs/operators";

@Injectable({
  providedIn: "root"
})
export class PecService extends NextSDREntityProvider {

  private _myPecsSubject: BehaviorSubject<Pec[]> = new BehaviorSubject(null);

  constructor(protected _http: HttpClient, protected _datepipe: DatePipe) {
    super(_http, _datepipe, ENTITIES_STRUCTURE.baborg.pec, getInternautaUrl(BaseUrlType.Baborg));
  }

  public getMyPecs(projection?: string, initialFiltersAndSorts?: FiltersAndSorts, lazyEventFiltersAndSorts?: FiltersAndSorts, pagingConf?: PagingConf): Observable<Pec[]> {
    return super.getData(projection, initialFiltersAndSorts, lazyEventFiltersAndSorts, pagingConf).pipe(
      map(data => {
        if (data && data.results) {
          return data.results;
        }
      }), tap( (pecs: Pec[]) => {
        this._myPecsSubject.next(pecs);
      })
    );
  }

  public get myPecs(): Observable<Pec[]> {
    return this._myPecsSubject.asObservable();
  }
}
