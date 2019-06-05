import { Injectable } from "@angular/core";
import { TreeNode } from "primeng/api";
import { BehaviorSubject, Observable } from "rxjs";
import { Pec, Folder, Tag } from "@bds/ng-internauta-model";

@Injectable({
  providedIn: "root"
})
export class MailFoldersService {



  private _pecFolderSelected: BehaviorSubject<PecFolder> = new BehaviorSubject<PecFolder>(null);
  private _pecFoldersAndTags: BehaviorSubject<FoldersAndTags> = new BehaviorSubject<FoldersAndTags>(null);

  constructor() {
  }

  public selectedPecFolder(node: PecFolder, folders: Folder[], tags: Tag[]): void {
    this._pecFolderSelected.next(node);
    this.setPecFoldersAndTags(folders, tags);
  }

  public get pecFolderSelected(): Observable<PecFolder> {
    return this._pecFolderSelected.asObservable();
  }

  public setPecFoldersAndTags(folders: Folder[], tags: Tag[]): void {
    this._pecFoldersAndTags.next({
      folders: folders,
      tags: tags
    });
  }

  public get pecFoldersAndTags(): Observable<FoldersAndTags> {
    return this._pecFoldersAndTags.asObservable();
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

export interface FoldersAndTags {
  folders: Folder[];
  tags: Tag[];
}
