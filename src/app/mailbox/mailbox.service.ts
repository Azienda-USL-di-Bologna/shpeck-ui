import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { PecFolderType, PecFolder } from "./mail-folders/mail-folders.service";
import { Message } from "@bds/internauta-model";

@Injectable({
  providedIn: "root",
})
export class MailboxService {
  private _sorting: BehaviorSubject<Sorting> = new BehaviorSubject<Sorting>(null);
  private _totalMessageNumberDescriptor$: Subject<TotalMessageNumberDescriptor> = new Subject<TotalMessageNumberDescriptor>();
  private _moveSelectedMessages$: BehaviorSubject<number> = new BehaviorSubject<number>(null);
  private _moveMessagesToTrash$ = new Subject<void>();
  private _deleteSelectedMessageFromTrash$ = new Subject<void>();
  private _messages$ = new BehaviorSubject<Message[]>(null);

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

  public get moveSelectedMessages(): Observable<number> {
    return this._moveSelectedMessages$.asObservable();
  }

  public setMoveSelectedMessages(idFolderDestination: number) {
    this._moveSelectedMessages$.next(idFolderDestination);
  }

  public get moveMessagesToTrash(): Observable<void> {
    return this._moveMessagesToTrash$.asObservable();
  }

  public setMoveMessagesToTrash() {
    this._moveMessagesToTrash$.next();
  }

  public get deleteSelectedMessageFromTrash(): Observable<void> {
    return this._deleteSelectedMessageFromTrash$.asObservable();
  }

  public setDeleteSelectedMessageFromTrash() {
    this._deleteSelectedMessageFromTrash$.next();
  }

  public get messages(): Observable<Message[]> {
    return this._messages$.asObservable();
  }

  public setMessages(messages: Message[]) {
    this._messages$.next(messages);
  }
}

export interface TotalMessageNumberDescriptor {
  messageNumber: number;
  pecFolder: PecFolder;
}

export interface Sorting {
  field: string;
  sortMode: string;
  reset?: boolean;
}

export class FilteredContactMultiple {
  descrizione: string;
  idContatto: number;
  idAziendeContatto: number[];
  descrizioneDettaglioContatto: string;
  descrizioneContatto: string;
  tipo: string;
  isDomicilioDigitale: boolean;
}
