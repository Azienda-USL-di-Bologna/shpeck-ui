import { Injectable } from "@angular/core";
import { TreeNode } from "primeng/api";
import { BehaviorSubject, Subject, Observable } from "rxjs";

@Injectable({
  providedIn: "root"
})
export class MailFoldersService {

  private _pecTreeNodeSelected: BehaviorSubject<TreeNode> = new BehaviorSubject<TreeNode>(null);

  constructor() { }

  public selectedPecTreeNode(node: TreeNode): void {
    this._pecTreeNodeSelected.next(node);
  }

  public get pecTreeNodeSelected(): Observable<TreeNode> {
    return this._pecTreeNodeSelected.asObservable();
  }
}
