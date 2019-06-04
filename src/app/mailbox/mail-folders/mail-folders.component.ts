import { Component, OnInit, ViewEncapsulation, Output, EventEmitter, OnDestroy, ViewChild, Input, ElementRef, ViewChildren } from "@angular/core";
import { FiltersAndSorts, SortDefinition, SORT_MODES, AdditionalDataDefinition, FilterDefinition } from "@nfa/next-sdr";
import { Pec, ENTITIES_STRUCTURE, Folder, FolderType } from "@bds/ng-internauta-model";
import { PecService } from "src/app/services/pec.service";
import { TreeNode, MenuItem } from "primeng/api";
import { MailFoldersService, PecFolder, PecFolderType } from "./mail-folders.service";
import { ToolBarService } from "../toolbar/toolbar.service";
import { Subscription } from "rxjs";
import { ContextMenu, Tree } from "primeng/primeng";
import { FolderService } from "src/app/services/folder.service";

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
  @ViewChild("tree") public tree: Tree;
  @ViewChildren("folderInput") public folderInput: ElementRef[];

  // @ViewChild("manageFolderPanel") public manageFolderPanel: OverlayPanel;

  public mailfolders: MyTreeNode[] = [];
  // @Output("folderEmitter") private folderEmitter: EventEmitter<number> = new EventEmitter();

  public selectedNode: MyTreeNode;
  public previousSelectedNode: MyTreeNode;
  private _abortSaveFolder: boolean = false;
  private _pressedEnter: boolean = false;

  public pecCmItems: MenuItem[] = [
    {
      label: "Nuova Cartella",
      id: "NewFolder",
      disabled: false,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
  ];
  public cmItems: MenuItem[] = this.pecCmItems;

  public folderCmItems: MenuItem[] = [
    {
      label: "Rinomina",
      id: "RenameFolder",
      disabled: false,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Elimina",
      id: "DeleteFolder",
      disabled: false,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
  ];

  constructor(
    private pecService: PecService,
    private folderService: FolderService,
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
          this.mailFoldersService.selectedPecFolder(this.mailfolders[0].data, this.mailfolders[0].children.map((c: MyTreeNode) => c.data.data) as Folder[]);
        }
      }
    ));
    // this.subscriptions.push(this.toolBarService.getFilterTyped.subscribe((filter: FilterDefinition[]) => {
    //   if (filter) {
    //     this.selectRootNode(this.selectedNode, false);
    //   }
    // }));
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
        const p: Pec = new Pec();
        p.id = pec.id;
        folder.idPec = p;
        children.push(this.buildFolderNode(folder));
      }
    }
    return {
      label: pec.indirizzo,
      data: {
        type: PecFolderType.PEC,
        data: pec
      } as PecFolder,
      expandedIcon: "pi pi-folder-open",
      collapsedIcon: "pi pi-folder",
      children: children,
      selectable: true,
      styleClass: MailFoldersComponent.ROOT_NODE_NOT_SELECTED_STYLE_CLASS,
      editable: false,
      key: PecFolderType.PEC + "_" + pec.id
    } as MyTreeNode;
  }

  public selectedContextMenuItem(event) {
    if (event && event.item) {
      const menuItemSelected: MenuItem = event.item;
      switch (menuItemSelected.id) {
        case "NewFolder":
          // console.log("new folder", this.selectedNode);
          const folderToInsert = this.buildCustomFolder(this.selectedNode.data.data as Pec, "Nuova Cartella");
          this.selectedNode.children.push(this.buildFolderNode(folderToInsert, true));
          setTimeout(() => {
            const a = this.folderInput;
            a.find(e => e.nativeElement.id === this.selectedNode.key).nativeElement.focus();
          }, 0);
          this.selectedNode.expanded = true;
          this.selectedNode = this.selectedNode.children[this.selectedNode.children.length - 1];
        break;
        case "RenameFolder":
          const folderToRename: Folder = this.selectedNode.data.data as Folder;
          if (folderToRename.type === FolderType.CUSTOM) {
            this.selectedNode.editable = true;
            setTimeout(() => {
              this.folderInput.find(e => e.nativeElement.id === this.selectedNode.key).nativeElement.focus();
            }, 0);
          }
        break;
        case "DeleteFolder":
          const folderToDelete: Folder = this.selectedNode.data.data as Folder;
          if (folderToDelete.type === FolderType.CUSTOM) {
            this.deleteFolder(folderToDelete);
          }
        break;
      }
    }
  }

  private buildCustomFolder(pecContainer: Pec, name?: string): Folder {
    const folder: Folder = new Folder();
    if (name) {
      name = name.trim();
      folder.description = name;
      folder.name = name.replace(/\s+/, "_").toLowerCase();
    }
    folder.type = FolderType.CUSTOM;
    const pec: Pec = new Pec();
    pec.id = pecContainer.id;
    folder.idPec = pec;
    return folder;
  }

  private buildFolderNode(folder: Folder, editable: boolean = false): MyTreeNode {
    return {
      label: folder.description,
      data: {
        type: PecFolderType.FOLDER,
        data: folder
      } as PecFolder,
      expandedIcon: "pi pi-folder-open",
      collapsedIcon: "pi pi-folder",
      styleClass: "tree-node-style",
      editable: editable,
      key: PecFolderType.FOLDER + "_" + (folder.id ? folder.id : "new")
    };
  }

  private disableNotSelectableFolderContextMenuItems(selectedFolder: Folder) {
    const items: MenuItem[] = this.folderCmItems.filter(item => (item.id === "RenameFolder" || item.id === "DeleteFolder"));
    if (items && items.length > 0) {
      if (selectedFolder.type === FolderType.CUSTOM) {
        items.map(item => item.disabled = false);
      } else {
        items.map(item => item.disabled = true);
      }
    }
  }

  public handleNodeSelect(name: string, event: any) {
    switch (name) {
    case "onContextMenuSelect":
      this.mailfolders.map(m => m.styleClass = MailFoldersComponent.ROOT_NODE_NOT_SELECTED_STYLE_CLASS);

      if (event.node &&  !(event.node as MyTreeNode).editable) {
        this.selectRootNode(event.node, true);

        if (event.node.data && (event.node as MyTreeNode).data.type === PecFolderType.PEC) {
          this.cmItems = this.pecCmItems;
          this.mailFoldersService.selectedPecFolder(event.node.data, event.node.children.map((c: MyTreeNode) => c.data.data) as Folder[]);
        } else {
          this.disableNotSelectableFolderContextMenuItems(event.node.data.data as Folder);
          this.cmItems = this.folderCmItems;
          this.mailFoldersService.selectedPecFolder(event.node.data, event.node.parent.children.map((c: MyTreeNode) => c.data.data) as Folder[]);
        }
      } else {
        this.cmItems = [];
      }
      // if (event.node && event.node.data && (event.node as MyTreeNode).data.type === PecFolderType.PEC) {
      //   this.cmItems = this.pecCmItems;
      // } else {
      //   this.cmItems = this.folderCmItems;
      //   const renameItems = this.cmItems.find(item => item.id === "RenameFolder");
      //   if (renameItems && (event.node.data.data as Folder).type !== FolderType.CUSTOM ) {
      //     renameItems.disabled = true;
      //   } else {
      //     renameItems.disabled = false;
      //   }
      // }
    break;
    case "onNodeUnselect": // TODO: capire perché non scatta
      this.previousSelectedNode = this.selectedNode;
    break;
    //   if ((event as TreeNode).type === PecTreeNodeType.PEC) {
    //     this.showPecContextMenu = true;
    //   } else {
    //     this.showPecContextMenu = false;
    //   }
    // break;
    case "onNodeSelect":
      if (this.mailfolders && event.node && !(event.node as MyTreeNode).editable) {
        this.mailfolders.map(m => m.styleClass = MailFoldersComponent.ROOT_NODE_NOT_SELECTED_STYLE_CLASS);
        this.selectRootNode(event.node, true);

        if (event.node.data && (event.node as MyTreeNode).data.type === PecFolderType.PEC) {
          this.mailFoldersService.selectedPecFolder(event.node.data, event.node.children.map((c: MyTreeNode) => c.data.data) as Folder[]);
        } else {
          this.mailFoldersService.selectedPecFolder(event.node.data, event.node.parent.children.map((c: MyTreeNode) => c.data.data) as Folder[]);
        }
      }
    break;
    }
  }

  public onLostFocus(event, value?: string) {
    if (this._pressedEnter) {
      this._pressedEnter = false;
    } else {
      this.saveFolder(value);
    }
  }
  public onEnterPressed(event, value?: string) {
    this._pressedEnter = true;
    this.saveFolder(value);
  }

  public onEscPressed(event) {
    // this._pressedEnterOrEsc = true;
    this.abortSaveFolder();
  }

  public saveFolder(name?: string) {
    console.log("SAVE event", name);
    if (!this._abortSaveFolder) {
      const folder: Folder = this.selectedNode.data.data as Folder;
      const inserting: boolean = !folder.id ? true : false;
      if (!name) {
        name = folder.description;
      }
      if (name) {
        name = name.trim();
        folder.description = name;
        this.selectedNode.label = name;
        folder.name = name.replace(/\s+/gm, "_").toLowerCase();

        if (this.validateName(name)) {
          this.selectedNode.editable = false;
          if (!inserting) {
            this.folderService.patchHttpCall(folder, folder.id).subscribe((f: Folder) => {
              this.selectedNode.data.data = f;
              const pecFolderList: Folder[] = (this.selectedNode.parent.data.data as Pec).folderList;
              const index = pecFolderList.findIndex(childFolder => f.id === childFolder.id);
              pecFolderList[index] = f;
              this.mailFoldersService.selectedPecFolder(this.selectedNode.data, this.selectedNode.parent.children.map((c: MyTreeNode) => c.data.data) as Folder[]);
            });
          } else {
            // Questo assegnamento è per prevenire il caso in cui il salvataggio parta contemporanemanete al cambiamento del selectedNode.
            // Nella callback dell'insert il selectednode potrebbe essere cambiato
            // Es. Creazione di cartella, rinomina della stessa e di nuovo inserimento (cliccando direttamente col tasto destro per inserire).
            this.previousSelectedNode = this.selectedNode;
            this.folderService.postHttpCall(folder).subscribe((f: Folder) => {
              this.previousSelectedNode.data.data = f;
              const pecFolderList: Folder[] = (this.previousSelectedNode.parent.data.data as Pec).folderList;
              pecFolderList.push(f);
              this.previousSelectedNode.key = PecFolderType.FOLDER + "_" + f.id;
              this.mailFoldersService.selectedPecFolder(this.previousSelectedNode.data, this.previousSelectedNode.parent.children.map((c: MyTreeNode) => c.data.data) as Folder[]);
            });
          }
        }
      } else {
        this.abortSaveFolder();
      }
    }
    this._abortSaveFolder = false;
  }

  /**
   * Elimina la folder passata. Setta la root come selectedNode e manda l'evento di selectedPecFolder
   * @param folder
   */
  private deleteFolder(folder: Folder) {
    this.folderService.deleteHttpCall(folder.id).subscribe(
      (res) => {
        const nodeElementIndex: number = this.selectedNode.parent.children.findIndex(element => element.data.data.id === folder.id);
        this.selectedNode.parent.children.splice(nodeElementIndex, 1);
        const pec = this.selectedNode.parent.data.data as Pec;
        const folderElementIndex = pec.folderList.findIndex(element => element.id === folder.id);
        pec.folderList.splice(folderElementIndex, 1);
        this.selectRootNode(this.selectedNode.parent, false);
        this.mailFoldersService.selectedPecFolder(this.selectedNode.data, pec.folderList);
        this.selectedNode = null;
      },
      (error) => {
        // TODO: mostrare errore
      }
    );
  }

  public validateName(name: string) {
    // this.selectedNode.parent.children.some
    return true;
  }

  public abortSaveFolder() {
    console.log("ABORT");
    this._abortSaveFolder = true;
    const folder: Folder = this.selectedNode.data.data as Folder;
    const inserting: boolean = !folder.id ? true : false;
    console.log("inserting", inserting);
    if (inserting) {
      this.selectedNode.parent.children.pop();
      this.selectedNode = this.previousSelectedNode;
    } else {
      this.selectedNode.label = folder.description;
      this.selectedNode.editable = false;
    }
  }

  private selectRootNode(node: MyTreeNode, changeOnlyStyle: boolean) {
    if (node.data.type === PecFolderType.PEC) {
      node.styleClass = MailFoldersComponent.ROOT_NODE_SELECTED_STYLE_CLASS;
      node.expanded = true;
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
