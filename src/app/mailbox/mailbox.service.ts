import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";

@Injectable({
  providedIn: "root"
})
export class MailboxService {
    private _sorting: BehaviorSubject<Sorting> = new BehaviorSubject<Sorting>(null);

    public get sorting(): Observable<Sorting> {
        return this._sorting.asObservable();
    }

    public setSorting(sorting: Sorting): void {
        this._sorting.next(sorting);
    }
}

export interface Sorting {
    field: string;
    sortMode: string;
}
