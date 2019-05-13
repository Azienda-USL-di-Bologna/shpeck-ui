import { Component, OnInit, ViewEncapsulation, Output, EventEmitter, OnDestroy } from "@angular/core";
import { FiltersAndSorts, SortDefinition, SORT_MODES, AdditionalDataDefinition, FilterDefinition } from "@nfa/next-sdr";
import { Pec, ENTITIES_STRUCTURE } from "@bds/ng-internauta-model";
import { PecService } from "src/app/services/pec.service";
import { TreeNode } from "primeng/api";
import { MailFoldersService } from "./mail-folders.service";
import { ToolBarService } from "../toolbar/toolbar.service";
import { Subscription } from "rxjs";

@Component({
  selector: "app-mail-folders",
  templateUrl: "./mail-folders.component.html",
  styleUrls: ["./mail-folders.component.scss"],
  encapsulation: ViewEncapsulation.Emulated
})
export class MailFoldersComponent implements OnInit, OnDestroy {
// export class MailFoldersComponent implements OnInit {

  private static ROOT_NODE_NOT_SELECTED_STYLE_CLASS = "root-tree-node-style";
  private static ROOT_NODE_SELECTED_STYLE_CLASS = "root-tree-node-style-selected";

  private subscriptions: Subscription[] = [];

  public mailfolders = [];
  // @Output("folderEmitter") private folderEmitter: EventEmitter<number> = new EventEmitter();

  public selected: TreeNode;

  constructor(private pecService: PecService,
    private mailFoldersService: MailFoldersService,
    private toolBarService: ToolBarService) { }

  ngOnInit() {
    this.subscriptions.push(this.pecService.getMyPecs(ENTITIES_STRUCTURE.baborg.pec.standardProjections.PecWithFolderList, this.buildFolderInitialFilterAndSort(), null, null).subscribe(
      (myPecs: Pec[]) => {
        if (myPecs) {
          for (const pec of myPecs) {
            if (pec) {
              this.mailfolders.push(this.buildNode(pec));
            }
          }
          this.selected = this.mailfolders[0];
          this.mailFoldersService.selectedPecTreeNode(this.mailfolders[0]);
        }
      }
    ));
    this.subscriptions.push(this.toolBarService.getFilterTyped.subscribe((filter: FilterDefinition[]) => {
      if (filter) {
        this.selectRootNode(this.selected, false);
      }
    }));
  }

  private buildFolderInitialFilterAndSort(): FiltersAndSorts {
    const filter = new FiltersAndSorts();
    filter.addSort(new SortDefinition("indirizzo", SORT_MODES.asc));
    filter.addAdditionalData(new AdditionalDataDefinition("OperationRequested", "FilterPecPerStandardPermissions"));
    return filter;
  }

  private buildNode(pec: Pec): any {
    const children: TreeNode[] = [];
    if (pec.folderList) {
      for (const folder of pec.folderList) {
        folder.idPec = pec;
        children.push({
          "label": folder.description,
          "data": folder,
          "type": "folder",
          "expandedIcon": "pi pi-folder-open",
          "collapsedIcon": "pi pi-folder",
          "styleClass": "tree-node-style"
        });
      }
    }
    return {
      "label": pec.indirizzo,
      "data": pec,
      "type": "pec",
      "expandedIcon": "pi pi-folder-open",
      "collapsedIcon": "pi pi-folder",
      "children": children,
      "selectable": true,
      "styleClass": MailFoldersComponent.ROOT_NODE_NOT_SELECTED_STYLE_CLASS
      // "styleClass": "root-tree-node-style"
    } as TreeNode;
  }

  public handleNodeSelect(event: any) {
    if (this.mailfolders) {
      this.mailfolders.map(m => m.styleClass = MailFoldersComponent.ROOT_NODE_NOT_SELECTED_STYLE_CLASS);
      this.selectRootNode(event.node, true);
      this.mailFoldersService.selectedPecTreeNode(event.node);
    }
  }

  // private deselectAllNode() {

  // }

  private selectRootNode(node: TreeNode, changeOnlyStyle: boolean) {
    if (node.type === "pec") {
      node.styleClass = MailFoldersComponent.ROOT_NODE_SELECTED_STYLE_CLASS;
      if (!!!changeOnlyStyle) {
        this.selected = node;
      }
    } else {
      this.selectRootNode(node.parent, changeOnlyStyle);
    }
  }

  public ngOnDestroy() {
    for (const s of this.subscriptions) {
      s.unsubscribe();
    }
    this.subscriptions = [];
  }
}
