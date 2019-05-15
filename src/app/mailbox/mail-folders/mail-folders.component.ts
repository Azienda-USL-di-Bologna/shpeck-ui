import { Component, OnInit, ViewEncapsulation, Output, EventEmitter, OnDestroy, ViewChild } from "@angular/core";
import { FiltersAndSorts, SortDefinition, SORT_MODES, AdditionalDataDefinition, FilterDefinition } from "@nfa/next-sdr";
import { Pec, ENTITIES_STRUCTURE } from "@bds/ng-internauta-model";
import { PecService } from "src/app/services/pec.service";
import { TreeNode, MenuItem } from "primeng/api";
import { MailFoldersService, PecFolder, PecFolderType } from "./mail-folders.service";
import { ToolBarService } from "../toolbar/toolbar.service";
import { Subscription } from "rxjs";
import { ContextMenu } from "primeng/primeng";

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

  @ViewChild("cm") public cm: ContextMenu;
  // @ViewChild("manageFolderPanel") public manageFolderPanel: OverlayPanel;

  public showPecContextMenu = true;
  public folderDialogProperties = {
    title: "",
    visible: false,
    content: ""
  };

  public aaa: TreeNode[] = [
    {
      label: "cartella",
      data: {
        disabled: false
      },
      styleClass: "dis"
    },  {
      label: "cartella",
      data: {
        disabled: true
      },
      styleClass: "prova"
    },  {
      label: "cartella",
      data: {
        disabled: true
      },
      styleClass: "prova"
    }
  ];


  public mailfolders: MyTreeNode[] = [];
  // @Output("folderEmitter") private folderEmitter: EventEmitter<number> = new EventEmitter();

  public selectedNode: MyTreeNode;

  public cmItems: MenuItem[];
  public pecCmItems: MenuItem[] = [
    {
      label: "Nuova Cartella",
      id: "NewFolder",
      disabled: false,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
  ];

  public folderCmItems: MenuItem[] = [
    {
      label: "Rinomina",
      id: "RenameFolder",
      disabled: false,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
  ];

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
          this.selectedNode = this.mailfolders[0];
          this.mailFoldersService.selectedPecFolder(this.mailfolders[0].data);
        }
      }
    ));
    this.subscriptions.push(this.toolBarService.getFilterTyped.subscribe((filter: FilterDefinition[]) => {
      if (filter) {
        this.selectRootNode(this.selectedNode, false);
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
    const children: MyTreeNode[] = [];
    if (pec.folderList) {
      for (const folder of pec.folderList) {
        children.push({
          "label": folder.description,
          "data": {
            type: PecFolderType.FOLDER,
            data: folder
          } as PecFolder,
          // "type": PecTreeNodeType.FOLDER,
          "expandedIcon": "pi pi-folder-open",
          "collapsedIcon": "pi pi-folder",
          "styleClass": "tree-node-style",
          "editable": false
        });
      }
    }
    return {
      "label": pec.indirizzo,
      "data": {
        type: PecFolderType.PEC,
        data: pec
      } as PecFolder,
      // "type": PecTreeNodeType.PEC,
      "expandedIcon": "pi pi-folder-open",
      "collapsedIcon": "pi pi-folder",
      "children": children,
      "selectable": true,
      "styleClass": MailFoldersComponent.ROOT_NODE_NOT_SELECTED_STYLE_CLASS,
      "editable": false
    } as MyTreeNode;
  }

  public selectedContextMenuItem(event) {
    console.log(event);
    if (event && event.item) {
      const menuItemSelected: MenuItem = event.item;
      switch (menuItemSelected.id) {
        case "NewFolder":
        // this.folderDialogProperties.show(this.manageFolderPanelPropertiers);
        // this.folderDialogProperties.title = menuItemSelected.label;
        // this.folderDialogProperties.visible = true;
          this.mailfolders[1].children.push({
            label: "Nuova Cartella",
            editable: true,
            expandedIcon: "pi pi-folder-open",
            collapsedIcon: "pi pi-folder",
          });
          console.log("new folder", this.selectedNode);
        break;
        case "RenameFolder":
          console.log("rename folder", this.selectedNode);
        break;
      }
    }
  }

  public handleNodeSelect(name: string, event: any) {
    switch (name) {
    case "onContextMenuSelect":
      if (event.node && event.node.data && (event.node as MyTreeNode).data.type === PecFolderType.PEC) {
        this.cmItems = this.pecCmItems;
      } else {
        this.cmItems = this.folderCmItems;
      }
    break;
    // case "selectionChange":
    //   if ((event as TreeNode).type === PecTreeNodeType.PEC) {
    //     this.showPecContextMenu = true;
    //   } else {
    //     this.showPecContextMenu = false;
    //   }
    // break;
    case "onNodeSelect":
      if (this.mailfolders) {
        this.mailfolders.map(m => m.styleClass = MailFoldersComponent.ROOT_NODE_NOT_SELECTED_STYLE_CLASS);
        this.selectRootNode(event.node, true);
        this.mailFoldersService.selectedPecFolder(event.node.data);
      }
    break;
    }
  }

  // private deselectAllNode() {

  // }

  private selectRootNode(node: MyTreeNode, changeOnlyStyle: boolean) {
    if (node.data.type === PecFolderType.PEC) {
      node.styleClass = MailFoldersComponent.ROOT_NODE_SELECTED_STYLE_CLASS;
      if (!!!changeOnlyStyle) {
        this.selectedNode = node;
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

export interface MyTreeNode extends TreeNode {
  parent?: MyTreeNode;
  data?: PecFolder;
  editable?: boolean;
  children?: MyTreeNode[];
}
