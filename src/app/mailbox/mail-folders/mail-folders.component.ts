import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild, ElementRef, ViewChildren } from "@angular/core";
import { Pec, Folder, FolderType, Tag, TagType, Utente } from "@bds/internauta-model";
import { PecService } from "src/app/services/pec.service";
import { TreeNode, MenuItem, MessageService } from "primeng/api";
import { MailFoldersService, PecFolder, PecFolderType } from "./mail-folders.service";
import { Subscription } from "rxjs";
import { FolderService } from "src/app/services/folder.service";
import { TagService } from "src/app/services/tag.service";
import { MailListService } from "../mail-list/mail-list.service";
import { UtenteUtilities, JwtLoginService } from "@bds/jwt-login";
import { ShpeckMessageService } from "src/app/services/shpeck-message.service";
import { IntimusClientService, IntimusCommand, IntimusCommands, RefreshMailsParams, RefreshMailsParamsOperations, RefreshMailsParamsEntities } from "@bds/common-tools";
import { FilterDefinition, FiltersAndSorts, FILTER_TYPES } from "@bds/next-sdr";
import { OutboxLiteService } from "src/app/services/outbox-lite.service";
import { DraftLiteService } from "src/app/services/draft-lite.service";
import { filter } from 'rxjs/operators';
import { ContextMenu } from "primeng/contextmenu";
import { Tree } from "primeng/tree";
import { OverlayPanel } from "primeng/overlaypanel";

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
  private loggedUser: UtenteUtilities;

  @ViewChild("cm", {}) public cm: ContextMenu;
  @ViewChild("tree", {}) public tree: Tree;
  @ViewChild("op", {}) public op: OverlayPanel;
  // @ViewChildren("actualTarget", null) public actualTarget: ElementRef[];
  @ViewChildren("folderInput", {}) public folderInput: ElementRef[];

  // @ViewChild("manageFolderPanel") public manageFolderPanel: OverlayPanel;

  public mailfolders: MyTreeNode[] = [];
  // @Output("folderEmitter") private folderEmitter: EventEmitter<number> = new EventEmitter();

  public selectedNode: MyTreeNode;
  public elementSelected: any;
  public pickershow = true;
  public previousSelectedNode: MyTreeNode;
  private _abortSaveFolder: boolean = false;
  private _pressedEnter: boolean = false;

  public color: string = "#2e4a65";
  public initialColor: string;

  public pecCmItems: MenuItem[] = [
    {
      label: "Nuova Cartella",
      id: "NewFolder",
      disabled: false,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
  ];
  public tagContainerCmItems: MenuItem[] = [
    {
      label: "Nuova Etichetta",
      id: "NewTag",
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
    {
      label: "Colora",
      id: "Coloring",
      disabled: false,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
  ];
  public tagCmItems: MenuItem[] = [
    {
      label: "Rinomina",
      id: "RenameTag",
      disabled: false,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Elimina",
      id: "DeleteTag",
      disabled: false,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Colora",
      id: "Coloring",
      disabled: false,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
  ];

  private regexFindNumberBetweenP = new RegExp(/(\s*\(.*\))/, "gm"); // find next sequence (1...20)
  private regexFindP = new RegExp(/[)()]+/, "gm"); // find  symbols ) or ( 

  constructor(
      private pecService: PecService,
      private folderService: FolderService,
      private mailFoldersService: MailFoldersService,
      private primeMessageService: MessageService,
      private shpeckMessageService: ShpeckMessageService,
      private outboxLiteService: OutboxLiteService,
      private draftLiteService: DraftLiteService,
      private loginService: JwtLoginService,
      private tagService: TagService,
      private mailListService: MailListService,
      private intimusClient: IntimusClientService) {
    this.subscriptions.push(this.loginService.loggedUser$.subscribe((utente: UtenteUtilities) => {
      if (utente) {
        if (!this.loggedUser || utente.getUtente().id !== this.loggedUser.getUtente().id) {
          this.loggedUser = utente;
        }
      }
    }));
    this.subscriptions.push(this.mailListService.newTagInserted.subscribe((tag: Tag) => {
      if (tag && this.selectedNode) {
        console.log("devo inserire il nuovo tag", tag);
        console.log(this.selectedNode);
        console.log(this.mailfolders);

        const selectedNodeType = (this.selectedNode as MyTreeNode).data.type;
        if (selectedNodeType === PecFolderType.PEC) {
          (this.selectedNode.data.data as Pec).tagList.push(tag);
          this.selectedNode.children.find(pf => pf.data.type === PecFolderType.TAG_CONTAINER).children.push(this.buildTagNode(tag, tag.description, "fa fa-tag", false));
        } else if (selectedNodeType === PecFolderType.TAG_CONTAINER) {
          (this.selectedNode.parent.data.data as Pec).tagList.push(tag);
          this.selectedNode.children.push(this.buildTagNode(tag, tag.description, "fa fa-tag", false));
        } else if (selectedNodeType === PecFolderType.FOLDER) {
          (this.selectedNode.parent.data.data as Pec).tagList.push(tag);
          this.selectedNode.parent.children.find(pf => pf.data.type === PecFolderType.TAG_CONTAINER).children.push(this.buildTagNode(tag, tag.description, "fa fa-tag", false));
        } else if (selectedNodeType === PecFolderType.TAG) {
          const isFirstLevel = (this.selectedNode.data.data as Tag).firstLevel;
          if (isFirstLevel) {
            (this.selectedNode.parent.data.data as Pec).tagList.push(tag);
            this.selectedNode.parent.children.find(pf => pf.data.type === PecFolderType.TAG_CONTAINER).children.push(this.buildTagNode(tag, tag.description, "fa fa-tag", false));
          } else {
            (this.selectedNode.parent.parent.data.data as Pec).tagList.push(tag);
            this.selectedNode.parent.children.push(this.buildTagNode(tag, tag.description, "fa fa-tag", false));
          }
        }
      }
    }));

    this.nodeColorIsActuallyChanging = this.nodeColorIsActuallyChanging.bind(this);
  }

  ngOnInit() {
    this.subscriptions.push(this.pecService.getMyPecs().subscribe(
      (myPecs: Pec[]) => {
        if (myPecs) {
          for (const pec of myPecs) {
            this.mailfolders.push(this.buildNode(pec));
          }
          this.selectRootNode(this.mailfolders[0], false);
          this.selectedNode = this.mailfolders[0].children.find((childNode: MyTreeNode) => (childNode.data.data as Folder).type === FolderType.INBOX);
          if (this.selectedNode) {
            this.selectedNode.data.pec = this.mailfolders[0].data.data as Pec;
            this.mailFoldersService.selectedPecFolder(this.selectedNode.data,
              this.mailfolders[0].children.map((c: MyTreeNode) => c.data.data) as Folder[],
              (this.mailfolders[0].data.data as Pec).tagList);
          }
          setTimeout( ()=> {
            this.fixTreeHtmlRole();
          });
        }
      }
    ));
    this.subscriptions.push(this.intimusClient.command$.subscribe((command: IntimusCommand) => {
      this.manageIntimusCommand(command);
    }));

  }

  /**
   * gestisce un comando intimus
   * @param command il comando ricevuto
   */
  private manageIntimusCommand(command: IntimusCommand) {
    switch (command.command) {
      case IntimusCommands.RefreshMails: // comando di refresh delle mail
        switch ((command.params as RefreshMailsParams).operation) {
          case RefreshMailsParamsOperations.INSERT:
          case RefreshMailsParamsOperations.UPDATE:
          case RefreshMailsParamsOperations.DELETE:
            const params: RefreshMailsParams = command.params as RefreshMailsParams;
            this.refreshBadges(params);
            this.refreshOtherBadgeAndDoOtherOperation(command);
        }
    }
  }

  /**
   * ricarica i badge dei tag e delle cartelle a seconda del caso
   * @param params i params estratti dal comando intimus
   */
  private refreshBadges(params: RefreshMailsParams) {
    console.log("refreshing badges...");
    // se è cambiato un tag ricarico i badge dei tag
    if (params.entity === RefreshMailsParamsEntities.MESSAGE_TAG) {
      // se ho rimosso un tag ricarico il badge del tag rimosso
      if (params.oldRow) {
        this.mailFoldersService.doReloadTag(params.oldRow["id_tag"]);
      }
      // caso di rimozione di tag tramite servlet custom
      if (params.entity === RefreshMailsParamsEntities.MESSAGE_TAG && params["id"]) {
        this.mailFoldersService.doReloadTag(params["id"]);
      }
      // se ho inserito un tag ricarico il badge del tag inserito
      if (params.newRow) {
        this.mailFoldersService.doReloadTag(params.newRow["id_tag"]);
      }
    } else { // per tutti gli altri cambiamenti ricarico i badge delle cartelle interessati nel comando

        let folderType: string;
        switch (params.entity) {
          case RefreshMailsParamsEntities.OUTBOX:
            folderType = "OUTBOX";
            break;

          case RefreshMailsParamsEntities.DRAFT:
            folderType = "DRAFT";
            break;

          default:
            folderType = null;
            break;
        }

      if (params.newRow) {
        /* nel caso di nuovo messaggio, capita che la transazione non sia conclusa quando arriva il comando, quindi il numero dei messaggi non letti
         * non terrebbe conto del nuovo. Per ovviare a questo caso, chiamo una funzione apposita che chiama la doReloadFolder solo dopo che il messaggio
         * è visibile sul DB, cioè, dopo che la chiamata al backend lo ritnorna
        */
        if (!params.newRow["id_utente"] && params.operation === RefreshMailsParamsOperations.INSERT) { // è un nuovo messaggio in arrivo
          // questa funzione ricarica il messaggio, riprovando fino a che il messaggio non è visibile su DB
          this.reloadBadgesAfterMessageReady(params);
        } else { // in tutti gli altri casi mi comporto normalmente e ricarico subito il badge della cartella
          this.mailFoldersService.doReloadFolder(params.newRow["id_folder"], true, folderType, params.newRow["id_pec"] );
        }
      }
      if (params.oldRow) {
        this.mailFoldersService.doReloadFolder(params.oldRow["id_folder"], true, folderType, params.oldRow["id_pec"] );
      }
    }
  }

  /**
   * esegue tutte le altre operazioni non contemplate nelle altre funzioni:
   * fa il refresh del tag degli errori nel caso sia eliminato dal cestino un messaggio in errore
   * fa il refresh dei tag di fascicolazione, protocollazione e in_protocollazione per l'utente che esegue l'operazione (per gli altri utenti viene fatta nel giro standard dell'autoaggiornamento
   * @param command il comando ricevuto
   */
  private refreshOtherBadgeAndDoOtherOperation(command: IntimusCommand) {
    const params: RefreshMailsParams = command.params as RefreshMailsParams;
    // se è un caso di eliminazione di messaggio da cestino e il messaggio ha l'error-tag ricarico il badge degli errori
    if (params.entity === RefreshMailsParamsEntities.MESSAGE_FOLDER && params.oldRow && params.newRow && !!!params.oldRow["deleted"] && !!params.newRow["deleted"] && params.newRow["id_error_tag"] && params.newRow["id_error_tag"] !== "") {
      console.log("refreshing error tag...");
      this.mailFoldersService.doReloadTag(params.newRow["id_error_tag"]);
    }

    /*
     * caso in cui devo ricaricare i tag anche nel caso sono io stesso ad aver eseguito l'azione.
     * Questo caso serve per ricaricare i tag sopo la protocollazione o la fascicolazione. In generale nei casi in cui l'azione non è controllata dal frontend
    */
    if (params.entity === RefreshMailsParamsEntities.MESSAGE_TAG) { // se ho ricevuto un comando su un tag
      // se sono l'utente che ha eseguito l'azione (questo è il caso di inserimento o di update di un tag)
      if (params.newRow && params.newRow["id_utente"] === this.loggedUser.getUtente().id) {
        // e il tag è uno di quelli nello switch devo ricaricare il messaggio per aggiornare i suoi tag e ricarico i badge relativi al tag interessato
        switch (params.newRow["tag_name"]) {
          case "archived":
          case "registered":
          case "in_registration":
            // console.log(`insert refreshOtherBadge: ${params.entity} with ${params.newRow["tag_name"]}`);
            // setTimeout(() => {
            //   this.reloadMessage(params.newRow["id_message"], params);
            // }, 0);
            this.mailFoldersService.doReloadTag(params.newRow["id_tag"]);
        } // questo è un caso simile a quello sopra, ma riguarda l'eliminazione di un tag
      } else if ((!params.newRow && params.oldRow) || (!params.newRow && !params.oldRow && params["id_utente"] === this.loggedUser.getUtente().id)) {
        let tagName: string;
        let idMessage: number;
        let idTag: number;
        // l'azione può derivare dal trigger della normale eliminazione di un tag tramite framework oppure da un'eliminazione custom
        if (params.oldRow) { // eliminazione tramite framework
          tagName = params.oldRow["tag_name"];
          idMessage = params.oldRow["id_message"];
          idTag = params.oldRow["id_tag"];
        } else { // eliminazione custom
          tagName = params["tag_name"];
          idMessage = params["id_message"];
          idTag = params["id"];
        }
        switch (tagName) {
          case "archived":
          case "registered":
          case "in_registration":
            this.mailFoldersService.doReloadTag(idTag);
        }
      } // caso di spostamento del messaggio nella cartella dei messaggi protocollati per l'utente che ha eseguito l'azione
    }
  }

  /**
   * Aspetta che il messaggio sia pronto prima di ricaricare il badge
   * @param params i parametri estratti dal comando ricevuto
   * @param times usato in automatico per la ricorsione, non passare
   */
  private reloadBadgesAfterMessageReady(params: RefreshMailsParams, times: number = 1) {
    let filterDefinition: FilterDefinition;
    let filter: FiltersAndSorts;
    switch (params.entity) {
      case RefreshMailsParamsEntities.DRAFT:
        const idDraft: number = params.newRow["id"];
        filterDefinition = new FilterDefinition("id", FILTER_TYPES.not_string.equals, idDraft);
        filter = new FiltersAndSorts();
        filter.addFilter(filterDefinition);
        this.draftLiteService.getData(null, filter, null, null).subscribe((data: any) => {
          // può capitare che il comando arrivi prima che la transazione sia conclusa, per cui non troverei il messaggio sul database. Se capita, riprovo dopo 30ms per un massimo di 10 volte
          if (!data || !data.results || data.results.length === 0) {
            console.log("message not ready");
            if (times <= 10) {
              console.log(`rescheduling after ${30 * times}ms for the ${times} time...`);
              setTimeout(() => {
                this.reloadBadgesAfterMessageReady(params, times + 1);
              }, 30 * times);
            } else {
              console.log("too many tries, stop!");
            }
            return;
          }
          console.log("message ready, proceed...");
          // ricarico il badge interessato
          this.mailFoldersService.doReloadFolder(params.newRow["id_folder"], true, "DRAFT", params.newRow["id_pec"] );
        });
        break;
      case RefreshMailsParamsEntities.OUTBOX:
        const idOutbox: number = params.newRow["id"];
        filterDefinition = new FilterDefinition("id", FILTER_TYPES.not_string.equals, idOutbox);
        filter = new FiltersAndSorts();
        filter.addFilter(filterDefinition);
        this.outboxLiteService.getData(null, filter, null, null).subscribe((data: any) => {
          // può capitare che il comando arrivi prima che la transazione sia conclusa, per cui non troverei il messaggio sul database. Se capita, riprovo dopo 30ms per un massimo di 10 volte
          if (!data || !data.results || data.results.length === 0) {
            console.log("message not ready");
            if (times <= 10) {
              console.log(`rescheduling after ${30 * times}ms for the ${times} time...`);
              setTimeout(() => {
                this.reloadBadgesAfterMessageReady(params, times + 1);
              }, 30 * times);
            } else {
              console.log("too many tries, stop!");
            }
            return;
          }
          console.log("message ready, proceed...");
          // ricarico il badge interessato
          this.mailFoldersService.doReloadFolder(params.newRow["id_folder"], true, "OUTBOX", params.newRow["id_pec"] );
        });
        break;
      default:
        const idMessage: number = params.newRow["id_message"];
        filterDefinition = new FilterDefinition("id", FILTER_TYPES.not_string.equals, idMessage);
        filter = new FiltersAndSorts();
        filter.addFilter(filterDefinition);
        this.shpeckMessageService.getData(this.mailListService.selectedProjection, filter, null, null).subscribe((data: any) => {
          // può capitare che il comando arrivi prima che la transazione sia conclusa, per cui non troverei il messaggio sul database. Se capita, riprovo dopo 30ms per un massimo di 10 volte
          if (!data || !data.results || data.results.length === 0) {
            console.log("message not ready");
            if (times <= 10) {
              console.log(`rescheduling after ${30 * times}ms for the ${times} time...`);
              setTimeout(() => {
                this.reloadBadgesAfterMessageReady(params, times + 1);
              }, 30 * times);
            } else {
              console.log("too many tries, stop!");
            }
            return;
          }
          console.log("message ready, proceed...");
          // ricarico il badge interessato
          if (params.newRow["id_folder"]) {
            this.mailFoldersService.doReloadFolder(params.newRow["id_folder"], true);
          } else if (params.entity === RefreshMailsParamsEntities.OUTBOX) {
            this.mailFoldersService.doReloadFolder(params.newRow["id_folder"], true);
          }
      });
    }
  }

  private buildNode(pec: Pec): any {
    const children: MyTreeNode[] = [];
    const foldersCustom: Folder[] = [];
    const tagsSecondLevel: MyTreeNode[] = [];

    if (pec.folderList) {
      for (const folder of pec.folderList) {
        if (folder.type !== FolderType.CUSTOM) {
          const p: Pec = new Pec();
          p.id = pec.id;
          folder.idPec = p;
          const folderNode: MyTreeNode = this.buildFolderNode(folder, this.buildFolderIcons(folder));
          children.push(folderNode);
        } else {
          foldersCustom.push(folder);
        }
      }
    }
    if (pec.tagList) {
      for (const tag of pec.tagList) {
        if (tag.firstLevel && tag.visible) {
          const p: Pec = new Pec();
          p.id = pec.id;
          tag.idPec = p;
          switch (tag.name) {
            case "in_error":
              const tagNode: MyTreeNode = this.buildTagNode(tag, "Errori", "fas fa-exclamation-triangle smaller-icon error-icon tree-icon", false);
              this.mailFoldersService.getReloadTag(tag.id).subscribe(res => {
                res > 0 ? tagNode.styleClass = "tree-node-style tree-node-error" : tagNode.styleClass = "tree-node-style";
                tagNode.label = "Errori " + `(${res})`;
              });
              setTimeout(() => {
                this.mailFoldersService.doReloadTag(tag.id);
              });
              children.push(tagNode);
              break;
            case "registered":
              // Tag con icona per il protocollato
              break;
          }
        } else if (!tag.firstLevel && tag.visible) {
          // const editable = tag.type === TagType.CUSTOM;
          /* const tagNode: MyTreeNode = this.buildTagNode(tag, tag.description, "material-icons-outlined more-icon", false); */
          const icon = tag.type === TagType.CUSTOM ?   "material-icons local-offer-icon bigger-icon" : " material-icons-outlined local-offer-icon bigger-icon";
          const tagNode: MyTreeNode = this.buildTagNode(tag, tag.description, icon, false);
          const p: Pec = new Pec();
          p.id = pec.id;
          tag.idPec = p;
          tagsSecondLevel.push(tagNode);
        }
      }
    }
    if (foldersCustom.length > 0) {
      for (const folder of foldersCustom) {
        if (folder.type === FolderType.CUSTOM) {
          const p: Pec = new Pec();
          p.id = pec.id;
          folder.idPec = p;
          children.push(this.buildFolderNode(folder, this.buildFolderIcons(folder)));
        }
      }
    }

    const tagContainerNode = this.buildTagContainerNode(pec, tagsSecondLevel);
    children.push(tagContainerNode);

    return {
      label: pec.indirizzo,
      data: {
        type: PecFolderType.PEC,
        data: pec
      } as PecFolder,
      expandedIcon: "fa fa-folder-open  general-style-icon ",
      collapsedIcon: "fa fa-folder  general-style-icon ",
      children: children,
      selectable: true,
      styleClass: MailFoldersComponent.ROOT_NODE_NOT_SELECTED_STYLE_CLASS,
      editable: false,
      key: PecFolderType.PEC + "_" + pec.id
    } as MyTreeNode;
  }

  private buildTagContainerNode(pec: Pec, children: MyTreeNode[]): MyTreeNode {
    return {
      label: "Etichette",
      data: {
        type: PecFolderType.TAG_CONTAINER,
        data: {idPec: {id: pec.id}}
      } as PecFolder,
      expandedIcon: "fa fa-tags  general-style-icon  smaller-icon",
      collapsedIcon: "fa fa-tags  general-style-icon  smaller-icon",
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
          // this.selectedNode.children.push(this.buildFolderNode(folderToInsert, {expandedIcon: "pi pi-folder-open bigger-icon", collapsedIcon: "pi pi-folder bigger-icon"}, true));
          this.selectedNode.children.splice(this.selectedNode.children.length - 1, 0, this.buildFolderNode(folderToInsert, {expandedIcon: "fa fa-folder-open smaller-icon", collapsedIcon: "fa fa-folder  smaller-icon"}, true));
          setTimeout(() => {
            const a = this.folderInput;
            const element = a.find(e => e.nativeElement.id === this.selectedNode.key).nativeElement;
            element.focus();
            element.select();
          }, 0);
          this.selectedNode.expanded = true;
          this.selectedNode = this.selectedNode.children[this.selectedNode.children.length - 2];
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
            this.mailFoldersService.countMessageInFolder(folderToDelete.id, false, folderToDelete.type, folderToDelete.idPec.id).subscribe(messageNumber => {
              if (messageNumber === 0) {
                this.deleteFolder(folderToDelete);
              } else {
                this.primeMessageService.add(
                  { severity: "error", summary: "Errore", detail: "Non puoi eliminare una cartella piena, prima svuotala!", life: 3500 });
              }
            });
          } else {
            this.primeMessageService.add(
              { severity: "error", summary: "Errore", detail: "Non puoi eliminare una cartella di sistema!", life: 3500 });
          }
          break;
        case "Coloring":
          this.color = "#2e4a65";
          this.initialColor = "#2e4a65";
          if (this.elementSelected.node.data.data.additionalData) {
            const a =  JSON.parse(this.elementSelected.node.data.data.additionalData);
            if (a.color) {
              this.color = a.color;
              this.initialColor = a.color;
            }
          }
          // this.selectedNode.inColoring = true;
          // this.op.toggle(event);
          /* this.selectedNode.inColoring = true;
          this.pickershow = false;*/
          this.pickershow = true;
          // this.op.hide();
          event.originalEvent.stopPropagation();
          this.op.show(this.elementSelected.originalEvent);
          break;
        case "NewTag":
          const tagToInsert = this.buildCustomTag(this.selectedNode.parent.data.data as Pec, "Nuovo Tag");
          this.selectedNode.children.push(this.buildTagNode(tagToInsert, tagToInsert.description, "fa fa-tag ", true));
          setTimeout(() => {
            const a = this.folderInput;
            const element = a.find(e => e.nativeElement.id === this.selectedNode.key).nativeElement;
            element.focus();
            element.select();
          }, 0);
          this.selectedNode.expanded = true;
          this.selectedNode = this.selectedNode.children[this.selectedNode.children.length - 1];
          break;
        case "RenameTag":
          const tagToRename: Tag = this.selectedNode.data.data as Tag;
          if (tagToRename.type === TagType.CUSTOM) {
            this.selectedNode.editable = true;
            setTimeout(() => {
              this.folderInput.find(e => e.nativeElement.id === this.selectedNode.key).nativeElement.focus();
            }, 0);
          }
          break;
        case "DeleteTag":
          const tagToDelete: Tag = this.selectedNode.data.data as Tag;
          if (tagToDelete.type === TagType.CUSTOM) {
            this.deleteTag(tagToDelete);
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
    const idUtente = new Utente();
    idUtente.id = this.loggedUser.getUtente().id;
    idUtente.version = this.loggedUser.getUtente().version;
    folder.idUtente = idUtente;
    const pec: Pec = new Pec();
    pec.id = pecContainer.id;
    pec.version = pecContainer.version;
    folder.idPec = pec;
    
    return folder;
  }

  private buildCustomTag(pecContainer: Pec, name?: string) {
    const tag: Tag = new Tag();
    if (name) {
      name = name.trim();
      tag.description = name;
      tag.name = name.replace(/\s+/, "_").toLowerCase();
    }
    tag.type = TagType.CUSTOM;
    
    tag.idPec = pecContainer;
    tag.visible = true;
    tag.firstLevel = false;
    return tag;
  }

  private buildFolderIcons(folder: Folder): any {
    let expandedIcon = "fa fa-folder-open  smaller-icon";
    let collapsedIcon = "fa fa-folder smaller-icon";
    if (folder.name === "readdressed") {
      collapsedIcon = "material-icons-outlined readdressed-icon";
      expandedIcon =  "material-icons-outlined readdressed-icon";
    } else if (folder.name === "registered") {
      collapsedIcon = "material-icons-outlined registered-icon";
      expandedIcon =  "material-icons-outlined registered-icon";
    } else if (folder.name === "inbox") {
      collapsedIcon = "material-icons-outlined inbox-icon";
      expandedIcon =  "material-icons-outlined inbox-icon";
    } else if (folder.name === "outbox") {
      collapsedIcon = "material-icons-outlined outbox-icon";
      expandedIcon =  "material-icons-outlined outbox-icon";
    } else if (folder.name === "sent") {
      collapsedIcon = "material-icons-outlined sent-icon";
      expandedIcon =  "material-icons-outlined sent-icon";
    } else if (folder.name === "draft") {
      collapsedIcon = "material-icons-outlined draft-icon";
      expandedIcon =  "material-icons-outlined draft-icon";
    } else if (folder.name === "trash") {
      collapsedIcon = "material-icons-outlined bigger-icon trash-icon";
      expandedIcon =  "material-icons-outlined bigger-icon trash-icon";
    }
    return {expandedIcon: expandedIcon, collapsedIcon: collapsedIcon};
  }

  private buildFolderNode(folder: Folder, folderIcons: any, editable: boolean = false): MyTreeNode {
    let expandedIcon = "fa fa-folder-open smaller-icon";
    let collapsedIcon = "fa fa-folder smaller-icon";
    if (folder.name === "readdressed") {
      collapsedIcon = "material-icons-outlined readdressed-icon";
      expandedIcon =  "material-icons-outlined readdressed-icon";
    } else if (folder.name === "registered") {
      collapsedIcon = "material-icons-outlined registered-icon";
      expandedIcon =  "material-icons-outlined registered-icon";
    }

    const folderNode: MyTreeNode = {
      label: folder.description.replace(this.regexFindP, "_"),
      data: {
        type: PecFolderType.FOLDER,
        data: folder
      } as PecFolder,
      expandedIcon: folderIcons.expandedIcon + " general-style-icon",
      collapsedIcon: folderIcons.collapsedIcon + " general-style-icon",
      styleClass: "tree-node-style",
      editable: editable,
      key: PecFolderType.FOLDER + "_" + (folder.id ? folder.id : "new"),
      unreadMessages: folder.unreadMessages
    };

    if (folder.additionalData) {
      const a = JSON.parse(folder.additionalData);
      if (a.color) {
        this.setColorToNode(folderNode, a.color);
      }
    }
    // sottoscrizione all'observable che scatta quando devo ricaricare il numero dei messaggi non letti
    this.mailFoldersService.getReloadFolder(folder.id).subscribe(res => {
      // prima rimuovo la parte "(numero messaggi)" dal label, poi se il numero dei messaggi non letti è > 0 lo reinserisco con il numero aggiornato
      folderNode.label = folderNode.label.replace(this.regexFindNumberBetweenP, "");
      if (res >= 0) {
        folderNode.unreadMessages = res;
        /* folderNode.label = folderNode.label + ` (${res})`;
        folderNode.numberOfMessages = res; */
      }
    });
    /* setTimeout(() => {
      // fa scattare la chiamata che fa il calcolo delle mail non lette che a sua volta fa scattare la sottoscrizione sopra
      const unSeen: boolean = !(folder.type === FolderType.OUTBOX || folder.type === FolderType.DRAFT);
      this.mailFoldersService.doReloadFolder(folder.id, unSeen, folder.type, folder.idPec.id);
    }); */

    return folderNode;
  }

  private buildTagNode(tag: Tag, label: string, icon: string, editable: boolean): MyTreeNode {

    const treeNode: MyTreeNode = {
      label: label, // tag.description,
      data: {
        type: PecFolderType.TAG,
        data: tag
      } as PecFolder,
      expandedIcon: icon + " general-style-icon",
      collapsedIcon: icon + " general-style-icon",
      styleClass: "tree-node-style",
      editable: editable,
      key: PecFolderType.TAG + "_" + (tag.id ? tag.id : "new")
    };

    if (tag.additionalData) {
      const a = JSON.parse(tag.additionalData);
      if (a.color) {
        this.setColorToNode(treeNode, a.color);
      }
    }
    return treeNode;
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

  private disableNotSelectableTagContextMenuItems(selectedTag: Tag) {
    const items: MenuItem[] = this.tagCmItems.filter(item => (item.id === "RenameTag" || item.id === "DeleteTag"));
    if (items && items.length > 0) {
      if (selectedTag.type === TagType.CUSTOM) {
        items.map(item => item.disabled = false);
      } else {
        items.map(item => item.disabled = true);
      }
    }
  }

  public handleNodeSelect(name: string, event: any) {
    if (event && event.originalEvent && event.originalEvent.currentTarget) {
      this.setTabindexMinusOne(); 
      event.originalEvent.currentTarget.setAttribute("tabindex", 0);
    }
    switch (name) {
      case "onContextMenuSelect":
        this.op.hide();
        this.selectedNode = event.node;
        this.elementSelected = event;
        this.mailfolders.map(m => m.styleClass = MailFoldersComponent.ROOT_NODE_NOT_SELECTED_STYLE_CLASS);

        if (event.node && !(event.node as MyTreeNode).editable) {
          this.selectRootNode(event.node, true);

          if (event.node.data) {
            const selectedNodeType = (event.node as MyTreeNode).data.type;
            if (selectedNodeType === PecFolderType.PEC) {
              this.cmItems = this.pecCmItems;
              this.mailFoldersService.selectedPecFolder(
                event.node.data,
                event.node.children.map((c: MyTreeNode) => c.data.data) as Folder[],
                (event.node.data.data as Pec).tagList
              );
            } else if (selectedNodeType === PecFolderType.TAG_CONTAINER) {
              this.cmItems = this.tagContainerCmItems;
              event.node.data.pec = event.node.parent.data.data as Pec;
              this.mailFoldersService.selectedPecFolder(
                event.node.parent.data,
                event.node.children.map((c: MyTreeNode) => c.data.data) as Folder[],
                (event.node.parent.data.data as Pec).tagList
              );
            } else if (selectedNodeType === PecFolderType.FOLDER) {
              this.disableNotSelectableFolderContextMenuItems(event.node.data.data as Folder);
              this.cmItems = this.folderCmItems;
              event.node.data.pec = event.node.parent.data.data as Pec;
              this.mailFoldersService.selectedPecFolder(
                event.node.data,
                event.node.parent.children.map((c: MyTreeNode) => c.data.data) as Folder[],
                (event.node.parent.data.data as Pec).tagList
              );
            } else if (selectedNodeType === PecFolderType.TAG) {
              this.disableNotSelectableTagContextMenuItems(event.node.data.data as Tag);
              this.cmItems = this.tagCmItems;
              const isFirstLevel = (event.node.data.data as Tag).firstLevel;
              if (isFirstLevel) {
                event.node.data.pec = event.node.parent.data.data as Pec;
                this.mailFoldersService.selectedPecFolder(
                  event.node.data,
                  event.node.parent.children.map((c: MyTreeNode) => c.data.data) as Folder[],
                  (event.node.parent.data.data as Pec).tagList
                );
              } else {
                event.node.data.pec = event.node.parent.parent.data.data as Pec;
                this.mailFoldersService.selectedPecFolder(
                  event.node.data,
                  event.node.parent.parent.children.map((c: MyTreeNode) => c.data.data) as Folder[],
                  (event.node.parent.parent.data.data as Pec).tagList
                );
              }
            }
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
          this.shpeckMessageService.manageMessageEvent(null, null);
          this.mailfolders.map(m => m.styleClass = MailFoldersComponent.ROOT_NODE_NOT_SELECTED_STYLE_CLASS);
          this.selectRootNode(event.node, true);

          if (event.node.data) {
            const selectedNodeType = (event.node as MyTreeNode).data.type;

            if (selectedNodeType === PecFolderType.PEC) {
              this.mailFoldersService.selectedPecFolder(
                event.node.data,
                event.node.children.map((c: MyTreeNode) => c.data.data) as Folder[],
                (event.node.data.data as Pec).tagList
              );
            } else if (selectedNodeType === PecFolderType.TAG_CONTAINER) {
              this.mailFoldersService.selectedPecFolder(
                event.node.parent.data,
                event.node.parent.children.map((c: MyTreeNode) => c.data.data) as Folder[],
                (event.node.parent.data.data as Pec).tagList
              );
            } else if (selectedNodeType === PecFolderType.FOLDER) {
              event.node.data.pec = event.node.parent.data.data as Pec;
              this.mailFoldersService.selectedPecFolder(
                event.node.data,
                event.node.parent.children.map((c: MyTreeNode) => c.data.data) as Folder[],
                (event.node.parent.data.data as Pec).tagList);
            } else if (selectedNodeType === PecFolderType.TAG) {
              const isFirstLevel = (event.node.data.data as Tag).firstLevel;
              if (isFirstLevel) {
                event.node.data.pec = event.node.parent.data.data as Pec;
                this.mailFoldersService.selectedPecFolder(
                  event.node.data,
                  event.node.parent.children.map((c: MyTreeNode) => c.data.data) as Folder[],
                  (event.node.parent.data.data as Pec).tagList);
              } else {
                event.node.data.pec = event.node.parent.parent.data.data as Pec;
                this.mailFoldersService.selectedPecFolder(
                  event.node.data,
                  event.node.parent.parent.children.map((c: MyTreeNode) => c.data.data) as Folder[],
                  (event.node.parent.parent.data.data as Pec).tagList);
              }
            }
          }
        }
        break;
    }
  }

  public onLostFocus(event, value?: string) {
    if (this._pressedEnter) {
      this._pressedEnter = false;
    } else {
      this.saveNode(value);
    }
  }
  public onEnterPressed(event, value?: string) {
    this._pressedEnter = true;
    this.saveNode(value);
  }

  public onEscPressed(event) {
    // this._pressedEnterOrEsc = true;
    const nodeType: PecFolderType = this.selectedNode.data.type;
    const inserting: boolean = !this.selectedNode.data.data.id ? true : false;
    this.abortSaveFolder(nodeType, inserting);
  }

  onKeyUpMoveFocus(event) {
    const messagesListContainer: HTMLElement = document.querySelector(".mail-list");
    // console.log("mail-folders onKeyUpMoveFocus event: ", event);
    // console.log("messagesListContainer", messagesListContainer);
    // messagesListContainer.focus();
    // if (messagesListContainer) {
    //   const uiTableScrollableBodyTable: HTMLElement = messagesListContainer.querySelector(".ui-table-scrollable-body-table");
    //   if (uiTableScrollableBodyTable) {
    //     const uiTableBody: HTMLElement = uiTableScrollableBodyTable.querySelector(".ui-table-tbody");
    //     if (uiTableBody) {
    //       console.log("son", uiTableBody);
    //       const firstTableRow = uiTableBody.firstElementChild as HTMLElement;
    //       console.log("first", firstTableRow);
    //         if(!!firstTableRow) firstTableRow.focus();
    //     }
    //   }
    // }
    this.stopPropagation(event);

    const mailListContainer: HTMLElement = document.querySelector(".mail-list");
    if (mailListContainer) mailListContainer.focus();
  }

  private stopPropagation(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  public saveNode(newLabel?: string) {
    console.log("SAVE event", newLabel);
    if (!this._abortSaveFolder) {
      const node: any = this.selectedNode.data.data; // Può essere un Folder o un Tag
      const nodeType: PecFolderType = this.selectedNode.data.type;
      const inserting: boolean = !node.id ? true : false;
      if (!newLabel) {
        newLabel = node.description;
      }
      if (newLabel) {
        newLabel = newLabel.trim();
        newLabel = newLabel.replace(this.regexFindP, "_");
        const name = newLabel.replace(/\s+/gm, "_").toLowerCase();
        this.selectedNode.label = newLabel;
        this.selectedNode.editable = false;
        if (!inserting) {
          if (nodeType === PecFolderType.FOLDER) {
            if (this.validateName((this.selectedNode.parent.data.data as Pec).folderList as Folder[], name)) {
              node.description = newLabel;
              node.name = name;
              this.updateFolder(node as Folder);
            } else {
              this.abortSaveFolder(nodeType, inserting);
            }
          } else {
            if (this.validateName((this.selectedNode.parent.parent.data.data as Pec).tagList as Tag[], name)) {
              node.description = newLabel;
              node.name = name;
              this.updateTag(node as Tag);
            } else {
              this.abortSaveFolder(nodeType, inserting);
            }
          }
        } else {
          if (nodeType === PecFolderType.FOLDER) {
            if (this.validateName((this.selectedNode.parent.data.data as Pec).folderList as Folder[], name)) {
              node.description = newLabel;
              node.name = name;
              this.insertFolder(node as Folder);
            } else {
              this.abortSaveFolder(nodeType, inserting);
            }
          } else {
            if (this.validateName((this.selectedNode.parent.parent.data.data as Pec).tagList as Tag[], name)) {
              node.description = newLabel;
              node.name = name;
              this.insertTag(node as Tag);
            } else {
              this.abortSaveFolder(nodeType, inserting);
            }
          }
        }
      } else {
        this.abortSaveFolder(nodeType, inserting);
      }
    }
    this._abortSaveFolder = false;
  }

  private validateName(objArray: any[], name): boolean {
    return !objArray.some(o => o.name === name);
  }

  private updateFolder(folder: Folder): void {
    this.previousSelectedNode = this.selectedNode;
    const folderToSave = {
      name: folder.name,
      description: folder.description,
      additionalData: folder.additionalData,
      version: folder.version
    } as Folder;
    this.folderService.patchHttpCall(folderToSave, folder.id).subscribe((f: Folder) => {
      this.previousSelectedNode.data.data = f;
      const pecFolderList: Folder[] = (this.previousSelectedNode.parent.data.data as Pec).folderList;
      const index = pecFolderList.findIndex(childFolder => f.id === childFolder.id);
      pecFolderList[index] = f;
      this.previousSelectedNode.data.pec = this.previousSelectedNode.parent.data.data as Pec;
      this.mailFoldersService.selectedPecFolder(
        this.previousSelectedNode.data,
        this.previousSelectedNode.parent.children.map((c: MyTreeNode) => c.data.data) as Folder[],
        (this.previousSelectedNode.parent.data.data as Pec).tagList
      );
    },
    err => {
      console.log("orrore");
    });
  }

  private updateTag(tag: Tag): void {
    this.previousSelectedNode = this.selectedNode;
    this.tagService.patchHttpCall(tag, tag.id).subscribe((t: Tag) => {
      this.previousSelectedNode.data.data = t;
      const pecTagList: Tag[] = (this.previousSelectedNode.parent.parent.data.data as Pec).tagList;
      const index = pecTagList.findIndex(childTag => t.id === childTag.id);
      pecTagList[index] = t;
      this.previousSelectedNode.data.pec = this.previousSelectedNode.parent.parent.data.data as Pec;
      this.mailFoldersService.selectedPecFolder(
        this.previousSelectedNode.data,
        this.previousSelectedNode.parent.parent.children.map((c: MyTreeNode) => c.data.data) as Folder[],
        (this.previousSelectedNode.parent.parent.data.data as Pec).tagList
      );
    },
    err => {
      console.log("orrore");
    });
  }

  private insertFolder(folder: Folder): void {
    // Questo assegnamento è per prevenire il caso in cui il salvataggio parta contemporanemanete al cambiamento del selectedNode.
    // Nella callback dell'insert il selectednode potrebbe essere cambiato
    // Es. Creazione di cartella, rinomina della stessa e di nuovo inserimento (cliccando direttamente col tasto destro per inserire).
    this.previousSelectedNode = this.selectedNode;
    this.folderService.postHttpCall(folder).subscribe((f: Folder) => {
      this.previousSelectedNode.data.data = f;
      const pecFolderList: Folder[] = (this.previousSelectedNode.parent.data.data as Pec).folderList;
      pecFolderList.push(f);
      this.previousSelectedNode.key = PecFolderType.FOLDER + "_" + f.id;
      this.previousSelectedNode.data.pec = this.previousSelectedNode.parent.data.data as Pec;
      this.mailFoldersService.selectedPecFolder(
        this.previousSelectedNode.data,
        this.previousSelectedNode.parent.children.map((c: MyTreeNode) => c.data.data) as Folder[],
        (this.previousSelectedNode.parent.data.data as Pec).tagList
      );
    },
    err => {
      console.log("orrore");
    });
  }

  private insertTag(tag: Tag): void {
    this.previousSelectedNode = this.selectedNode;  // Vedi insertFolder..
    this.tagService.postHttpCall(tag).subscribe((t: Tag) => {
      this.previousSelectedNode.data.data = t;
      const pecTagList: Tag[] = (this.previousSelectedNode.parent.parent.data.data as Pec).tagList;
      pecTagList.push(t);
      this.previousSelectedNode.key = PecFolderType.TAG + "_" + t.id;
      this.previousSelectedNode.data.pec = this.previousSelectedNode.parent.parent.data.data as Pec;
      this.mailFoldersService.selectedPecFolder(
        this.previousSelectedNode.data,
        this.previousSelectedNode.parent.parent.children.map((c: MyTreeNode) => c.data.data) as Folder[],
        (this.previousSelectedNode.parent.parent.data.data as Pec).tagList
      );
    },
    err => {
      console.log("orrore");
    });
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
        this.mailFoldersService.selectedPecFolder(this.selectedNode.data, pec.folderList, pec.tagList);
        this.selectedNode = null;
      },
      (error) => {
        this.primeMessageService.add(
          { severity: "error", summary: "Errore", detail: "Errore nell'eliminazione della cartella. Riprova tra poco e se il problema persiste contatta BabelCare.", life: 3500 });
      }
    );
  }

  private deleteTag(tag: Tag) {
    this.tagService.deleteHttpCall(tag.id).subscribe(
      (res) => {
        const nodeElementIndex: number = this.selectedNode.parent.children.findIndex(element => element.data.data.id === tag.id);
        this.selectedNode.parent.children.splice(nodeElementIndex, 1);
        const pec = this.selectedNode.parent.parent.data.data as Pec;
        const tagElementIndex = pec.tagList.findIndex(element => element.id === tag.id);
        pec.tagList.splice(tagElementIndex, 1);
        this.selectRootNode(this.selectedNode.parent.parent, false);
        this.mailFoldersService.selectedPecFolder(this.selectedNode.data, pec.folderList, pec.tagList);
        this.selectedNode = null;
      },
      (error) => {
        this.primeMessageService.add(
          { severity: "error", summary: "Errore", detail: "Errore nell'eliminazione del tag. Riprova tra poco e se il problema persiste contatta BabelCare.", life: 3500 });
      }
    );
  }

  public abortSaveFolder(nodeType: PecFolderType, inserting: boolean) {
    console.log("ABORT");
    this._abortSaveFolder = true;
    // const inserting: boolean = !folder.id ? true : false;
    if (inserting) {
      // this.selectedNode.parent.children.pop();
      if (nodeType === PecFolderType.FOLDER) {
        this.selectedNode.parent.children.splice(this.selectedNode.parent.children.length - 2, 1);
      } else {
        this.selectedNode.parent.children.pop();
      }
      this.selectedNode = this.previousSelectedNode;
    } else {
      // const folder: Folder = this.selectedNode.data.data as Folder;
      this.selectedNode.label = (this.selectedNode.data.data as any).description;
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

  public buildTooltipForNode(node: any) {
    if (node.data.type === "pec") {
      if (node.data.data.attiva) {
        let listAziendeString = "";
        let index = 0;
        for (const a of node.data.data.pecAziendaList) {
          index++;
          listAziendeString += "- " + a.idAzienda.descrizione + "\n";
        }
        if (index > 0) {
          listAziendeString = (index > 1 ? "Associata alle aziende: \n" : "Associata all'azienda: \n") + listAziendeString;
        }
        return listAziendeString;
      } else {
        return "disattivata";
      }
    }
    return "";
  }

  /**
   * Nascondo l'overlaypanel del colorpicker
   * @param event
   * @param node
   */
  public closeColorEditing(hoSalvato = false): void {
    /* if (!hoSalvato) {
      this.checkIfStyleAlreadyExistsAndSetColorToNode(this.selectedNode, this.initialColor);
    } */
    this.op.hide();
  }

  public pickerOverlayHiding() {
    this.pickershow = false;
    this.checkIfStyleAlreadyExistsAndSetColorToNode(this.selectedNode, this.initialColor);
  }

  public ripristinaColor() {
    this.color = "#2e4a65";
    this.nodeColorIsActuallyChanging();
  }

  public saveNewColor(): void {
     // Può essere un Folder o un Tag
    const nodeType: PecFolderType = this.selectedNode.data.type;
    if (nodeType === PecFolderType.FOLDER) {
      const folder = this.selectedNode.data.data as Folder;
      let a: any = {};
      if (folder.additionalData) {
        a = JSON.parse(folder.additionalData);
      }
      a.color = this.color;
      folder.additionalData = JSON.stringify(a);
      this.updateFolder(folder);
    } else if (nodeType === PecFolderType.TAG) {
      const tag = this.selectedNode.data.data as Tag;
      let a: any = {};
      if (tag.additionalData) {
        a = JSON.parse(tag.additionalData);
      }
      a.color = this.color;
      tag.additionalData = JSON.stringify(a);
      this.updateTag(tag);
    }
    this.initialColor = this.color;
    this.closeColorEditing(true);
  }

  /**
   * Setto un nuovo colore sul node attualmente selezionato.
   */
  public nodeColorIsActuallyChanging(): void {
    this.checkIfStyleAlreadyExistsAndSetColorToNode(this.selectedNode, this.color);
  }

  private checkIfStyleAlreadyExistsAndSetColorToNode(node: any, color: string) {
    const nodeStyle = document.getElementById("nodeDynamicStyle" + node.key);
    if  (!nodeStyle) {
      this.setColorToNode(node, color);
    } else {
      nodeStyle.innerHTML = `body .nodeStyle${node.key} .general-style-icon { color: ${color} !important; }`;
    }
  }

  /**
   * Creo lo style per il nodo specifico contenente una classe con il colore dato.
   * Inoltre aggiungo la medesima classe al nodo.
   */
  private setColorToNode(node: any, color: string): void {
    const nodeStyle = document.createElement("style");
    nodeStyle.id = "nodeDynamicStyle" + node.key;
    nodeStyle.innerHTML = `body .nodeStyle${node.key} .general-style-icon { color: ${color} !important; }`;
    document.getElementsByTagName("head")[0].appendChild(nodeStyle);
    node.styleClass =  node.styleClass + ` nodeStyle${node.key}`;
  }

  /**
   * Questa funzione chiamata all'apertura dela componente
   * so occupa si settare i role e i tabindex dell'albero folder.
   * In particolare solo la cartella in arrivo della prima casella pec 
   * avrà tabindex="0"
   */
  private fixTreeHtmlRole(): void {
    const liElements = this.tree.el.nativeElement.getElementsByClassName('p-treenode');
    for (const liEl of liElements) { 
      liEl.setAttribute('role', 'none'); 
    }

    const divElements = this.tree.el.nativeElement.getElementsByClassName('p-treenode-content');
    for (const divEl of divElements) {
      divEl.setAttribute('role', 'treeitem'); 
      divEl.setAttribute('tabindex', -1); 
    }
    if (divElements && divElements[1]) {
      divElements[1].setAttribute('tabindex', 0); 
    }

    // Ora mi occupo dell'icona che serve ad espandere i nodi
    const treeTogglers = this.tree.el.nativeElement.getElementsByClassName('p-tree-toggler');
    for (const treeToggler of treeTogglers) {
      treeToggler.setAttribute('tabindex', -1); 
    }
  }

  /**
   * Questa funzione setta tutti i nodi dell'albero folder con
   * tabindex = -1 
   */
  private setTabindexMinusOne() {
    const divElements = this.tree.el.nativeElement.getElementsByClassName('p-treenode-content');
    for (const divEl of divElements) {
      divEl.setAttribute('tabindex', -1); 
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
  inColoring?: boolean;
  //numberOfMessages?: number;
  unreadMessages?: number;
}
