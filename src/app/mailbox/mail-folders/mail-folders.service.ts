import { Injectable } from "@angular/core";
import { TreeNode } from "primeng/api";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { Pec, Folder, Tag } from "@bds/ng-internauta-model";
import { HttpClient } from "@angular/common/http";
import { getInternautaUrl, BaseUrlType, CUSTOM_SERVER_METHODS } from "src/environments/app-constants";

@Injectable({
  providedIn: "root"
})
export class MailFoldersService {



  private _pecFolderSelected: BehaviorSubject<PecFolder> = new BehaviorSubject<PecFolder>(null);
  private _pecFoldersAndTags: BehaviorSubject<FoldersAndTags> = new BehaviorSubject<FoldersAndTags>(null);
  private _reloadTag: Subject<number>[] = [];

  constructor(
    private http: HttpClient
  ) {
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

  public getReloadTag(idTag: number): Observable<number> {
    if (!this._reloadTag[idTag]) {
      this._reloadTag[idTag] = new Subject<number>();
    }
    return this._reloadTag[idTag].asObservable();
  }

  public doReloadTag(idTag: number): void {
    const url = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.countMessageInTag + "/" + idTag;
    this.http.get(url).subscribe(
      (res: number) => {
        this._reloadTag[idTag].next(res);
      }
    );
  }

  public get pecFoldersAndTags(): Observable<FoldersAndTags> {
    return this._pecFoldersAndTags.asObservable();
  }

  public countMessageInFolder(folderId: number): Observable<number> {
    const url = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.countMessageInFolder + "/" + folderId;
    return this.http.get(url) as Observable<number>;
  }
}

export enum PecFolderType {
  PEC = "pec",
  FOLDER = "folder",
  TAG = "tag",
  TAG_CONTAINER = "tag_container"
}

export interface PecFolder {
  type: PecFolderType;
  data: Pec | Folder | Tag;
}

export interface FoldersAndTags {
  folders: Folder[];
  tags: Tag[];
}
