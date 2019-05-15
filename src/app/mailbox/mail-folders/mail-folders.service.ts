import { Injectable } from "@angular/core";
import { TreeNode } from "primeng/api";
import { BehaviorSubject, Observable } from "rxjs";
import { Pec, Folder } from "@bds/ng-internauta-model";

@Injectable({
  providedIn: "root"
})
export class MailFoldersService {



  private _pecFolderSelected: BehaviorSubject<PecFolder> = new BehaviorSubject<PecFolder>(null);

  constructor() {
  }

  public selectedPecFolder(node: PecFolder): void {
    this._pecFolderSelected.next(node);
  }

  public get pecFolderSelected(): Observable<TreeNode> {
    return this._pecFolderSelected.asObservable();
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
