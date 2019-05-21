import { Injectable } from "@angular/core";
import { TreeNode } from "primeng/api";
import { BehaviorSubject, Observable } from "rxjs";
import { Pec, Folder } from "@bds/ng-internauta-model";

@Injectable({
  providedIn: "root"
})
export class MailFoldersService {



  private _pecFolderSelected: BehaviorSubject<PecFolder> = new BehaviorSubject<PecFolder>(null);
  private _pecFolders: BehaviorSubject<Folder[]> = new BehaviorSubject<Folder[]>(null);

  constructor() {
  }

  public selectedPecFolder(node: PecFolder): void {
    this._pecFolderSelected.next(node);
  }

  public get pecFolderSelected(): Observable<PecFolder> {
    return this._pecFolderSelected.asObservable();
  }

  public setPecFolders(folders: Folder[]): void {
    this._pecFolders.next(folders);
  }

  public get pecFolders(): Observable<Folder[]> {
    return this._pecFolders.asObservable();
  }
}

export enum PecFolderType {
  PEC = "pec",
  FOLDER = "folder"
}

export interface PecFolder {
  type: PecFolderType;
  data: Pec | Folder;
}
