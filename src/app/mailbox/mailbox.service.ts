import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { PecFolderType, PecFolder } from "./mail-folders/mail-folders.service";

@Injectable({
  providedIn: "root"
})
export class MailboxService {
    private _sorting: BehaviorSubject<Sorting> = new BehaviorSubject<Sorting>(null);
    private _totalMessageNumberDescriptor$: Subject<TotalMessageNumberDescriptor> = new Subject<TotalMessageNumberDescriptor>();

    public get sorting(): Observable<Sorting> {
        return this._sorting.asObservable();
    }

    public setSorting(sorting: Sorting): void {
        this._sorting.next(sorting);
    }

    public get totalMessageNumberDescriptor$(): Observable<TotalMessageNumberDescriptor> {
        return this._totalMessageNumberDescriptor$.asObservable();
    }

    public setTotalMessageNumberDescriptor(totalMessageNumberDescriptor: TotalMessageNumberDescriptor) {
        this._totalMessageNumberDescriptor$.next(totalMessageNumberDescriptor);
    }
}

export interface TotalMessageNumberDescriptor {
    messageNumber: number;
    pecFolder: PecFolder;
}

export interface Sorting {
    field: string;
    sortMode: string;
}
