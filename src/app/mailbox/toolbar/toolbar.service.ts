import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { FilterDefinition } from "@nfa/next-sdr";

@Injectable({
  providedIn: "root"
})
export class ToolBarService {

  private _filter: BehaviorSubject<FilterDefinition[]> = new BehaviorSubject<FilterDefinition[]>(null);

  constructor() { }

  public setFilterTyped(filter: FilterDefinition[]): void {
    this._filter.next(filter);
  }

  public get getFilterTyped(): Observable<FilterDefinition[]> {
    return this._filter.asObservable();
  }
}
