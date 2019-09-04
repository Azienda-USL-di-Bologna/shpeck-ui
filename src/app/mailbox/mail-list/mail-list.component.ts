import { Component, OnInit, Output, EventEmitter, ViewChild, ElementRef, OnDestroy } from "@angular/core";
import { buildLazyEventFiltersAndSorts } from "@bds/primeng-plugin";
import { Message, ENTITIES_STRUCTURE, MessageAddress, AddresRoleType, Folder, MessageTag, InOut, Tag, Pec, MessageType, FolderType, Note, FluxPermission, Azienda, MessageStatus, TagType } from "@bds/ng-internauta-model";
import { ShpeckMessageService, MessageEvent } from "src/app/services/shpeck-message.service";
import { FiltersAndSorts, FilterDefinition, FILTER_TYPES, SortDefinition, SORT_MODES, PagingConf, BatchOperation, BatchOperationTypes } from "@nfa/next-sdr";
import { TagService } from "src/app/services/tag.service";
import { Observable, Subscription } from "rxjs";
import { DatePipe } from "@angular/common";
import { Table } from "primeng/table";
import { TOOLBAR_ACTIONS, EMLSOURCE, BaseUrls, BaseUrlType } from "src/environments/app-constants";
import { MenuItem, LazyLoadEvent, FilterMetadata, ConfirmationService, MessageService } from "primeng/api";
import { Utils } from "src/app/utils/utils";
import { MailFoldersService, PecFolderType, PecFolder } from "../mail-folders/mail-folders.service";
import { ToolBarService } from "../toolbar/toolbar.service";
import { MailListService } from "./mail-list.service";
import { NoteService } from "src/app/services/note.service";
import { NtJwtLoginService, UtenteUtilities } from "@bds/nt-jwt-login";
import { Menu } from "primeng/menu";
import { AppCustomization } from "src/environments/app-customization";
import { SettingsService } from "src/app/services/settings.service";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { MailboxService, Sorting } from "../mailbox.service";

@Component({
  selector: "app-mail-list",
  templateUrl: "./mail-list.component.html",
  styleUrls: ["./mail-list.component.scss"],
  providers: [ConfirmationService]
})
export class MailListComponent implements OnInit, OnDestroy {

  constructor(
    public mailListService: MailListService,
    private messageService: ShpeckMessageService,
    private tagService: TagService,
    private mailFoldersService: MailFoldersService,
    private toolBarService: ToolBarService,
    private datepipe: DatePipe,
    public confirmationService: ConfirmationService,
    private messagePrimeService: MessageService,
    private noteService: NoteService,
    private settingsService: SettingsService,
    private loginService: NtJwtLoginService,
    private mailboxService: MailboxService
  ) {
    this.selectedContextMenuItem = this.selectedContextMenuItem.bind(this);
    this.showNewTagPopup = this.showNewTagPopup.bind(this);
  }

  @Output() public messageClicked = new EventEmitter<Message>();

  @ViewChild("selRow", null) private selRow: ElementRef;
  @ViewChild("dt", null) private dt: Table;
  @ViewChild("noteArea", null) private noteArea;
  @ViewChild("idtag", null) private inputTextTag;
  @ViewChild("registrationMenu", null) private registrationMenu: Menu;
  @ViewChild("archiviationMenu", null) private archiviationMenu: Menu;
  @ViewChild("tagMenu", null) private tagMenu: Menu;
  // @ViewChild("ordermenu") private ordermenu: Menu;

  public _selectedTag: Tag;
  public _selectedFolder: Folder;
  public _selectedPecId: number;
  public _selectedPec: Pec;
  public _filters: FilterDefinition[];

  // private tempSelectedMessages: Message[] = null;

  private selectedProjection: string =
    ENTITIES_STRUCTURE.shpeck.message.customProjections
      .CustomMessageForMailList;

  private pageConf: PagingConf = {
    mode: "LIMIT_OFFSET",
    conf: {
      limit: 0,
      offset: 0
    }
  };

  private subscriptions: Subscription[] = [];
  private previousFilter: FilterDefinition[] = [];
  private foldersSubCmItems: MenuItem[] = null;
  private aziendeProtocollabiliSubCmItems: MenuItem[] = null;
  private aziendeFascicolabiliSubCmItems: MenuItem[] = null;
  private registerMessageEvent: any = null;
  private loggedUser: UtenteUtilities;
  private sorting: Sorting = {
    field: "receiveTime",
    sortMode: SORT_MODES.desc
  };
  public tagMenuItems:  MenuItem[] = null;
  public cmItems: MenuItem[] = [
    {
      label: "NOT_SET",
      id: "MessageSeen",
      disabled: false,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Rispondi",
      id: "MessageReply",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Rispondi a tutti",
      id: "MessageReplyAll",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Inoltra",
      id: "MessageForward",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Protocolla",
      id: "MessageRegistration",
      disabled: true,
      queryParams: {},
      items: this.aziendeProtocollabiliSubCmItems,
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Sposta",
      id: "MessageMove",
      disabled: true,
      queryParams: {},
      items: this.foldersSubCmItems,
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Etichette",
      id: "MessageLabels",
      disabled: true,
      items: [] as MenuItem[],
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Elimina",
      id: "MessageDelete",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Segna come errore visto",
      id: "ToggleErrorFalse",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Segna come errore non visto",
      id: "ToggleErrorTrue",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Nota",
      id: "MessageNote",
      disabled: false,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Scarica",
      id: "MessageDownload",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Fascicola",
      id: "MessageArchive",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Reindirizza",
      id: "MessageReaddress",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Ripristina",
      id: "MessageUndelete",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    }
  ];

  public displayNote: boolean = false;
  public displayNewTagPopup: boolean = false;
  public displayProtocollaDialog = false;
  public displayRegistrationDetail = false;
  public displayDetailPopup = false;
  public openDetailInPopup = false;
  public readdressDetail: any = {
    displayReaddressDetail: false,
    buttonReaddress: false,
    testo: {
      in: null,
      out: null
    }
  };
  public tagForm;
  public registrationDetail: any = null;
  public archiviationDetail: any = {
    displayArchiviationDetail: false,
    buttonArchivable: false,
    message: null,
    additionalData: null
  };
  public noteObject: Note = new Note();
  public fromOrTo: any;
  public loading = false;
  public virtualRowHeight: number = 75;
  public totalRecords: number;
  public rowsNmber = 10;
  public cols = [
    {
      field: "subject",
      header: "Oggetto",
      filterMatchMode: FILTER_TYPES.string.containsIgnoreCase,
      width: "85px",
      minWidth: "85px"
    }
  ];


  ngOnInit() {
    this.subscriptions.push(this.mailFoldersService.pecFolderSelected.subscribe((pecFolderSelected: PecFolder) => {
      // this.tempSelectedMessages = null;
      this.mailListService.selectedMessages = [];
      if (pecFolderSelected) {
        if (pecFolderSelected.type === PecFolderType.FOLDER) {
          const selectedFolder: Folder = pecFolderSelected.data as Folder;
          if ((selectedFolder.type !== FolderType.DRAFT) && (selectedFolder.type !== FolderType.OUTBOX)) {
            this._selectedPecId = selectedFolder.fk_idPec.id;
            this._selectedPec = pecFolderSelected.pec;
            this.setFolder(selectedFolder);
          }
        } else if (pecFolderSelected.type === PecFolderType.TAG) {
          const selectedTag: Tag = pecFolderSelected.data as Tag;
          this._selectedPecId = selectedTag.fk_idPec.id;
          this._selectedPec = pecFolderSelected.pec;
          this.setTag(selectedTag);
        } else {
          const pec: Pec = pecFolderSelected.data as Pec;
          this._selectedPec = pec;
          this._selectedPecId = pec.id;
          this.setFolder(null);
        }
      }
    }));
    this.subscriptions.push(this.toolBarService.getFilterTyped.subscribe((filters: FilterDefinition[]) => {
      if (filters) {
        this.setFilters(filters);
      }
    }));
    this.subscriptions.push(this.loginService.loggedUser$.subscribe((utente: UtenteUtilities) => {
      if (utente) {
        if (!this.loggedUser || utente.getUtente().id !== this.loggedUser.getUtente().id) {
          this.loggedUser = utente;
        }
      }
    }));
    this.subscriptions.push(this.settingsService.settingsChangedNotifier$.subscribe(newSettings => {
      this.openDetailInPopup = newSettings[AppCustomization.shpeck.hideDetail] === "true";
    }));
    if (this.settingsService.getImpostazioniVisualizzazione()) {
      this.openDetailInPopup = this.settingsService.getHideDetail() === "true";
    }
    this.subscriptions.push(this.messageService.messageEvent.subscribe(
      (messageEvent: MessageEvent) => {
        // console.log("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa ", messageEvent);
      }));
    this.subscriptions.push(this.mailboxService.sorting.subscribe((sorting: Sorting) => {
      if (sorting) {
        this.sorting = sorting;
        if (this.dt && this.dt.el && this.dt.el.nativeElement) {
          this.dt.el.nativeElement.getElementsByClassName("ui-table-scrollable-body")[0].scrollTop = 0;
        }
        this.lazyLoad(null);
      }
    }));
  }

  public openDetailPopup(event, row, message) {
    if (this.openDetailInPopup) {
      this.displayDetailPopup = true;
    }
  }


  private setTag(tag: Tag) {
    this._selectedTag = null;
    this._selectedFolder = null;
    this._filters = null;
    this.mailListService.selectedMessages = [];
    // trucco per far si che la table vanga tolta e rimessa nel dom (in modo da essere resettata) altrimenti sminchia
    // NB: nell'html la visualizzazione della table è controllata da un *ngIf
    setTimeout(() => {
      this._selectedTag = tag;
      if (tag) {
        this.lazyLoad(null);
      }
    }, 0);
  }

  private setFolder(folder: Folder) {
    this._selectedFolder = null;
    this._selectedTag = null;
    this._filters = null;
    this.mailListService.selectedMessages = [];
    // trucco per far si che la table vanga tolta e rimessa nel dom (in modo da essere resettata) altrimenti sminchia
    // NB: nell'html la visualizzazione della table è controllata da un *ngIf
    setTimeout(() => {
      this._selectedFolder = folder;
      if (folder) {
        this.lazyLoad(null);
      }
    }, 0);
  }

  private setFilters(filters: FilterDefinition[]) {
    // this._selectedFolder = null;
    this._filters = null;
    setTimeout(() => {
      this._filters = filters;
      if (filters) {
        // this.resetPageConfig = true;
        // this.filtering = true;
        this.lazyLoad(null);
      }
    }, 0);
  }

  /* public toggleOrderMenu(event) {

    this.ordermenu.toggle(event);
  } */

  public getTagDescription(tagName: string) {
    if (this.mailListService.tags) {
      const tag = this.mailListService.tags.find(t => t.name === tagName);
      if (tag) {
        return tag.description;
      } else {
        return null;
      }
    }
  }

  private loadTag(pec: Pec): Observable<Tag[]> {
    const filtersAndSorts: FiltersAndSorts = new FiltersAndSorts();
    filtersAndSorts.addFilter(
      new FilterDefinition("idPec.id", FILTER_TYPES.not_string.equals, pec.id)
    );
    return this.tagService.getData(null, filtersAndSorts, null, null);
  }

  private loadData(pageCong: PagingConf, lazyFilterAndSort?: FiltersAndSorts, folder?: Folder, tag?: Tag) {
    this.loading = true;
    this.messageService
      .getData(
        this.selectedProjection,
        this.buildInitialFilterAndSort(folder, tag),
        lazyFilterAndSort,
        pageCong
      )
      .subscribe(data => {
        if (data && data.results) {
          this.totalRecords = data.page.totalElements;
          this.mailListService.messages = data.results;
          console.log("this.mailListService.messages", this.mailListService.messages);
          this.setMailTagVisibility(this.mailListService.messages);
          this.mailFoldersService.doReloadTag(this.mailListService.tags.find(t => t.name === "in_error").id);
        }
        this.loading = false;
        // setTimeout(() => {
        //   console.log(this.selRow.nativeElement.offsetHeight);
        // });

        // I selected messages sono quelli che sono.
        // Ma dopo il caricamento devo far puntare tra i messages quelli che sono selected
        // Altimenti la table non li evidenzia
        let index;
        for (let i = 0; i < this.mailListService.selectedMessages.length; i++) {
          index = this.isMessageinList(this.mailListService.selectedMessages[i].id, this.mailListService.messages);
          if (index !== -1) {
            this.mailListService.selectedMessages[i] = this.mailListService.messages[index];
          }
        }
      });
  }

  private isMessageinList(id: number, messages: Message[]) {
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].id === id) {
        return i;
      }
    }
    return -1;
  }

  public buildTableEventFilters(filtersDefinition: FilterDefinition[]): { [s: string]: FilterMetadata } {
    if (filtersDefinition && filtersDefinition.length > 0) {
      const eventFilters: { [s: string]: FilterMetadata } = {};
      filtersDefinition.forEach(filter => {
        const filterMetadata: FilterMetadata = {
          value: filter.value,
          matchMode: filter.filterMatchMode
        };
        eventFilters[filter.field] = filterMetadata;
      });
      return eventFilters;
    } else {
      return null;
    }
  }

  private needLoading(event: LazyLoadEvent): boolean {
    let needLoading = this.pageConf.conf.limit !== event.rows ||
      this.pageConf.conf.offset !== event.first;
    if (!needLoading) {
      if (this._filters && !this.previousFilter || !this._filters && this.previousFilter) {
        needLoading = true;
      } else if (this._filters && this.previousFilter) {
        for (const filter of this._filters) {
          if (this.previousFilter.findIndex(e =>
            e.field === filter.field && e.filterMatchMode === filter.filterMatchMode && e.value === filter.value) === -1) {
            needLoading = true;
            break;
          }
        }
      }
    }
    return needLoading;
  }

  public lazyLoad(event: LazyLoadEvent) {
    console.log("lazyload", event);
    const eventFilters: { [s: string]: FilterMetadata } = this.buildTableEventFilters(this._filters);
    if (event) {
      if (eventFilters && Object.entries(eventFilters).length > 0) {
        event.filters = eventFilters;
      }

      // questo if è il modo più sicuro per fare "event.first === Nan"
      if (event.first !== event.first) {
        event.first = 0;
      }
      if (this.needLoading(event)) {
        this.pageConf.conf = {
          limit: event.rows,
          offset: event.first
        };
        const filtersAndSorts: FiltersAndSorts = buildLazyEventFiltersAndSorts(
          event,
          this.cols,
          this.datepipe
        );

        this.loadData(this.pageConf, filtersAndSorts, this._selectedFolder, this._selectedTag);
      }
    } else {
      if (eventFilters) {
        event = {
          filters: eventFilters
        };
      }
      this.pageConf.conf = {
        limit: this.rowsNmber * 2,
        offset: 0
      };
      const filtersAndSorts: FiltersAndSorts = buildLazyEventFiltersAndSorts(
        event,
        this.cols,
        this.datepipe
      );

      this.loadData(this.pageConf, filtersAndSorts, this._selectedFolder, this._selectedTag);
    }
    this.previousFilter = this._filters;
    // this.filtering = false;
  }

  trackByFn(index, item) {
    return item.id;
  }

  buildInitialFilterAndSort(folder: Folder, tag: Tag): FiltersAndSorts {
    const filtersAndSorts: FiltersAndSorts = new FiltersAndSorts();
    if (folder) {
      filtersAndSorts.addFilter(
        new FilterDefinition(
          "messageFolderList.idFolder.id",
          FILTER_TYPES.not_string.equals,
          folder.id
        )
      );
    }
    if (tag) {
      filtersAndSorts.addFilter(
        new FilterDefinition(
          "messageTagList.idTag.id",
          FILTER_TYPES.not_string.equals,
          tag.id
        )
      );
    }
    // quando effettuo una ricerca generica (avendo selezionato la casella) non vengano considerate le mail nel cestino
    if (tag === null && folder === null) {
      const folderList = this._selectedPec.folderList;

      folderList.forEach(f => {
        if (f.type !== "TRASH") {
          filtersAndSorts.addFilter(
            new FilterDefinition("messageFolderList.idFolder.id", FILTER_TYPES.not_string.equals, f.id)
          );
        }
      });
    }
    filtersAndSorts.addFilter(
      new FilterDefinition(
        "idPec.id",
        FILTER_TYPES.not_string.equals,
        this._selectedPecId
      )
    );
    filtersAndSorts.addFilter(
      new FilterDefinition(
        "messageType",
        FILTER_TYPES.not_string.equals,
        MessageType.MAIL
      )
    );
    // filtersAndSorts.addSort(new SortDefinition("receiveTime", SORT_MODES.desc));
    // filtersAndSorts.addSort(new SortDefinition("createTime", SORT_MODES.desc));
    filtersAndSorts.addSort(new SortDefinition(this.sorting.field, this.sorting.sortMode));

    // filtersAndSorts.addSort(new SortDefinition("messageAddressList.address_role", SORT_MODES.desc));
    return filtersAndSorts;
  }

  private setMailTagVisibility(messages: Message[]) {
    messages.map((message: Message) => {
      this.setFromOrTo(message);
      this.mailListService.setIconsVisibility(message);
    });
  }

  // private setIconsVisibility(message: Message) {
  //   message["iconsVisibility"] = [];
  //   if (message.messageTagList && message.messageTagList.length > 0) {
  //     message.messageTagList.forEach((messageTag: MessageTag) => {
  //       message["iconsVisibility"][messageTag.idTag.name] = true;
  //       this.tags[messageTag.idTag.name] = messageTag.idTag;
  //     });
  //   }
  // }

  private setFromOrTo(message: Message) {
    let addresRoleType: string;
    switch (message.inOut) {
      case InOut.IN:
        addresRoleType = AddresRoleType.FROM;
        break;
      case InOut.OUT:
        addresRoleType = AddresRoleType.TO;
        break;
      default:
        addresRoleType = AddresRoleType.FROM;
    }
    if (this.sorting.field === "messageExtensionList.addressFrom") {
      addresRoleType = AddresRoleType.FROM;
    }
    message["fromOrTo"] = {
      description: "",
      fromOrTo: addresRoleType
    };
    if (message.messageAddressList) {
      const messageAddressList: MessageAddress[] = message.messageAddressList.filter(
        (messageAddress: MessageAddress) =>
          messageAddress.addressRole === addresRoleType
      );
      messageAddressList.forEach((messageAddress: MessageAddress) => {
        // message["fromOrTo"].description += ", " + (messageAddress.idAddress.originalAddress ? messageAddress.idAddress.originalAddress : messageAddress.idAddress.mailAddress);
        message["fromOrTo"].description += ", " + messageAddress.idAddress.mailAddress;
      });
      if ((message["fromOrTo"].description as string).startsWith(",")) {
        message["fromOrTo"].description = (message["fromOrTo"].description as string).substr(
          1,
          (message["fromOrTo"].description as string).length - 1
        );
      }
    }
  }

  public handleEvent(name: string, event: any) {
    console.log("handleEvent", name, event);

    console.log("this.mailListService.selectedMessages  fuori", this.mailListService.selectedMessages);
    switch (name) {
      // non c'è nella documentazione, ma pare che scatti sempre una sola volta anche nelle selezioni multiple.
      // le righe selezionati sono in this.mailListService.selectedMessages e anche in event
      case "onRowSelect":
      case "selectionChange":
      case "onRowUnselect":
        event.originalEvent.stopPropagation();


        // console.log("this.selectionKeys", this.dt.selectionKeys);
        /* setTimeout(() => {
          if (name === "onRowSelect" && event.type === "checkbox" && this.tempSelectedMessages) {
            const self = this;
            this.mailListService.selectedMessages = this.mailListService.selectedMessages.concat(self.tempSelectedMessages.filter(function (item) {
                return self.mailListService.selectedMessages.indexOf(item) < 0;
            }));
          }
          this.tempSelectedMessages = this.mailListService.selectedMessages;
          console.log("this.tempSelectedMessages", this.tempSelectedMessages);
          console.log("this.mailListService.selectedMessages", this.mailListService.selectedMessages); */
          // selezione di un singolo messaggio (o come click singolo oppure come click del primo messaggio con il ctrl)
          if (this.mailListService.selectedMessages.length === 1) {
            const selectedMessage: Message = this.mailListService.selectedMessages[0];
            this.mailListService.setSeen(true, true);
            const emlSource: string = this.getEmlSource(selectedMessage);
            this.messageService.manageMessageEvent(
              emlSource,
              selectedMessage,
              this.mailListService.selectedMessages
            );
            // this.messageClicked.emit(selectedMessage);
          } else {
            this.messageService.manageMessageEvent(null, null, this.mailListService.selectedMessages);
          }
          // this.dt.rows;
          /* this.dt.updateSelectionKeys();
          this.dt.tableService.onSelectionChange(); */
        /* }, 0); */
        break;

        /* this.tempSelectedMessages = this.mailListService.selectedMessages; */
        // break;
      case "onContextMenuSelect":
        this.setContextMenuItemLook();
        break;
      case "saveNote":
        this.saveNote();
        break;
    }
  }

  private getEmlSource(message: Message): string {
    let emlSource: string;
    if (message.messageFolderList && message.messageFolderList[0].idFolder.type === FolderType.OUTBOX) {
      emlSource = EMLSOURCE.OUTBOX;
    } else {
      emlSource = EMLSOURCE.MESSAGE;
    }
    return emlSource;
  }

  /**
   * Setto il look del menu contestuale.
   * In particolare attivo e disattivo le varie voci.
   */
  private setContextMenuItemLook() {
    this.cmItems.map(element => {
      // element.disabled = false;
      switch (element.id) {
        case "MessageSeen":
          if (
            this.mailListService.selectedMessages.some((message: Message) => !!!message.seen)
          ) {
            element.label = "Letto";
            element.queryParams = { seen: true };
          } else {
            element.label = "Da Leggere";
            element.queryParams = { seen: false };
          }
          break;
        case "MessageMove":
          element.disabled = false;
          element.styleClass = "message-moves";
          if (!this.mailListService.isMoveActive()) {
            element.disabled = true;
            this.cmItems.find(f => f.id === "MessageMove").items = null;
          } else {
            this.cmItems.find(f => f.id === "MessageMove").items = this.mailListService.buildMoveMenuItems(this.mailListService.folders, this._selectedFolder, this.selectedContextMenuItem);
          }
          break;
        case "MessageLabels":
          element.disabled = false;
          element.styleClass = "message-labels";
          this.cmItems.find(f => f.id === "MessageLabels").items = this.mailListService.buildTagsMenuItems(this.selectedContextMenuItem, this.showNewTagPopup);
          break;
        case "MessageDelete":
          element.disabled = !this.mailListService.isDeleteActive();
          break;
        case "MessageReply":
        case "MessageReplyAll":
        case "MessageForward":
          element.disabled = false;
          if (this.mailListService.selectedMessages.length > 1 || !this.mailListService.isNewMailActive()) {
            element.disabled = true;
          }
          break;
        case "MessageRegistration":
          element.disabled = false;
          if (!this.mailListService.isRegisterActive()) {
            element.disabled = true;
            this.cmItems.find(f => f.id === "MessageRegistration").items = null;
          } else {
            this.cmItems.find(f => f.id === "MessageRegistration").items = this.mailListService.buildRegistrationMenuItems(this._selectedPec, this.selectedContextMenuItem);
          }
          break;
        case "MessageNote":
        case "MessageDownload":
          element.disabled = false;
          if (this.mailListService.selectedMessages.length > 1) {
            element.disabled = true;
          }
          break;
        case "ToggleErrorTrue":
          element.disabled = false;
          element.disabled = this.mailListService.isToggleErrorDisabled(true);
          break;
        case "ToggleErrorFalse":
          element.disabled = false;
          element.disabled = !this.mailListService.isToggleErrorDisabled(false);
          break;
        case "MessageReaddress":
          element.disabled = false;
          if (!this.mailListService.isReaddressActive()) {
            element.disabled = true;
          }
          break;
        case "MessageArchive":
          element.disabled = false;
          if (!this.mailListService.isArchiveActive()) {
            element.disabled = true;
            this.cmItems.find(f => f.id === "MessageArchive").items = null;
          } else {
            this.cmItems.find(f => f.id === "MessageArchive").items = this.mailListService.buildAziendeUtenteMenuItems(this._selectedPec, this.selectedContextMenuItem);
          }
          break;
        case "MessageUndelete":
          element.disabled = false;
          if (!this.mailListService.isUndeleteActive()) {
            element.disabled = true;
          }
          break;
      }
    });
  }


  /**
   * Questa funzione si occupa di creare un MenuItem[] che contenga come items la
   * lista delle aziende su cui l'utente loggato ha il permesso redige per la funzione protocolla Pec.
   * Con un futuro refactoring si potrebbe spostare tutto quello che riguarda la protocollazione nel mail-list.service
   * @param command
   */
  /* public buildRegistrationMenuItems(command: (any) => any): MenuItem[] {
    const registrationItems = [];
    this.loggedUser.getAziendeWithPermission(FluxPermission.REDIGE).forEach(codiceAzienda => {
      const azienda = this.loggedUser.getUtente().aziende.find(a => a.codice === codiceAzienda);
      let pIspecDellAzienda = true;
      let pIcon = "";
      let pTitle = "";
      if (!this._selectedPec.pecAziendaList.find(pecAzienda => pecAzienda.fk_idAzienda.id === azienda.id)) {
        pIspecDellAzienda = false;
        pIcon = "pi pi-question-circle";
        pTitle = "L'azienda non è associata alla casella del messaggio selezionato.";
      }
      registrationItems.push(
        {
          label: azienda.nome,
          icon: pIcon,
          id: "MessageRegistration",
          title: pTitle,
          disabled: false,
          queryParams: {
            codiceAzienda: codiceAzienda,
            isPecDellAzienda: pIspecDellAzienda,
          },
          command: event => command(event)
        }
      );
    });
    return registrationItems;
  } */

  /**
   * Questa funzione si occupa di iniziare la protocollazione del messaggio selezionato.
   * @param event
   */
  public registerMessage(event: any, registrationType: string) {
    console.log("selectedMessages", event, this.mailListService.selectedMessages);
    console.log("loggedUser", this.loggedUser);
    const azienda: Azienda = this.loggedUser.getUtente().aziende.find(a => a.codice === event.item.queryParams.codiceAzienda);
    let decodedUrl = "";
    if (registrationType === "NEW") {
      decodedUrl = decodeURI(azienda.urlCommands["PROTOCOLLA_PEC_NEW"]); // mi dovrei fare le costanti
    } else if (registrationType === "ADD") {
      decodedUrl = decodeURI(azienda.urlCommands["PROTOCOLLA_PEC_ADD"]); // mi dovrei fare le costanti
    }

    decodedUrl = decodedUrl.replace("[id_message]", "null" + ";" + window.btoa(this.mailListService.selectedMessages[0].uuidMessage));

    decodedUrl = decodedUrl.replace("[richiesta]", encodeURIComponent(Utils.genereateGuid()));
    decodedUrl = decodedUrl.replace("[id_sorgente]", encodeURIComponent(this.mailListService.selectedMessages[0].id.toString()));
    decodedUrl = decodedUrl.replace("[pec_ricezione]", encodeURIComponent(this._selectedPec.indirizzo));

    console.log("command", decodedUrl);

    this.mailListService.checkCurrentStatusAndRegister(() => {
      window.open(decodedUrl);
      // Setto subito il tag in modo che l'icona cambi
      if (!this.mailListService.selectedMessages[0].messageTagList) {
        this.mailListService.selectedMessages[0].messageTagList = [];
      }
      const newTag = new Tag();
      newTag.idPec = this.mailListService.selectedMessages[0].idPec;
      newTag.description = "In protocollazione";
      newTag.name = "in_registration";
      newTag.type = "SYSTEM_NOT_INSERTABLE_NOT_DELETABLE";
      const newMessageTag = new MessageTag();
      newMessageTag.idMessage = this.mailListService.selectedMessages[0];
      newMessageTag.idTag = newTag;
      newMessageTag.inserted = new Date();
      this.mailListService.selectedMessages[0].messageTagList.push(newMessageTag);
    });
  }


  /**
   * Manager delle varie funzionalità del contextMenu.
   * Si limita a chiamare il metodo giusto a seconda dell'ItemMenu selezionata.
   * @param event
   */
  private selectedContextMenuItem(event: any) {
    // console.log("check: ", event);
    const menuItem: MenuItem = event.item;
    switch (menuItem.id) {
      case "MessageSeen":
        this.mailListService.setSeen(menuItem.queryParams.seen, true);
        break;
      case "MessageDelete":
        this.deletingConfirmation();
        break;
      case "MessageMove":
        this.mailListService.moveMessages(event.item.queryParams.folder.id);
        break;
      case "MessageLabels":
        this.checkTagAndConfirm(event.item.queryParams);
        break;
      case "MessageRegistration":
        this.chooseRegistrationType(event, null);
        break;
      case "MessageDownload":
        this.dowloadMessage(this.mailListService.selectedMessages[0]);
        break;
      case "MessageReply":
        this.toolBarService.newMail(TOOLBAR_ACTIONS.REPLY);
        break;
      case "MessageReplyAll":
        this.toolBarService.newMail(TOOLBAR_ACTIONS.REPLY_ALL);
        break;
      case "MessageForward":
        this.toolBarService.newMail(TOOLBAR_ACTIONS.FORWARD);
        break;
      case "MessageReaddress":
        this.mailListService.readdressMessage();
        break;
      case "MessageNote":
        this.noteHandler();
        break;
      case "ToggleErrorTrue":
        this.mailListService.toggleError(true);
        break;
      case "ToggleErrorFalse":
        this.mailListService.toggleError(false);
        break;
      case "MessageUndelete":
        let idPreviousFolder = this.mailListService.selectedMessages[0].messageFolderList[0].fk_idPreviousFolder.id;
        const received = this.mailListService.selectedMessages[0].inOut === "IN" ? true : false;
        if (idPreviousFolder === null && received === true) {
          idPreviousFolder = this._selectedPec.folderList.filter(folder => folder.type === "INBOX")[0].id;
          this.mailListService.moveMessages(idPreviousFolder);
        } else if (idPreviousFolder === null && received === false) {
          idPreviousFolder = this._selectedPec.folderList.filter(folder => folder.type === "SENT")[0].id;
          this.mailListService.moveMessages(idPreviousFolder);
        } else {
          this.mailListService.moveMessages(idPreviousFolder);
        }
        break;
      case "MessageArchive":
        this.archiviationDetail.displayArchiviationDetail = false;
        this.askConfirmationBeforeArchiviation(event);
        break;
    }
  }

  private askConfirmationBeforeArchiviation(event) {
    if (this.mailListService.selectedMessages && this.mailListService.selectedMessages.length === 1 && event && event.item && event.item) {
      if (!event.item.queryParams.isPecDellAzienda) {
        this.confirmationService.confirm({
          header: "Conferma",
          message: "<b>Attenzione! Stai fascicolando su una azienda non associata alla casella selezionata su cui è arrivato il messaggio.</b><br/><br/>Sei sicuro?",
          icon: "pi pi-exclamation-triangle",
          accept: () => {
            this.mailListService.archiveMessage(event);
          }
        });
      } else {
        this.mailListService.archiveMessage(event);
      }
    }
  }

  private checkTagAndConfirm(queryParams) {
    if (queryParams && queryParams.order === 1) { // 1 indica che l'etichetta è applicata, quindi è da rimuovere
      this.confirmationService.confirm({
        message: "Vuoi davvero rimuovere l'etichetta?",
        header: "Conferma",
        icon: "pi pi-exclamation-triangle",
        accept: () => {
          this.mailListService.toggleTag(queryParams.tag, true);
        },
        reject: () => { }
      });
    } else {
      this.mailListService.toggleTag(queryParams.tag, true);
    }
  }

  private showNewTagPopup() {
    this.tagForm = new FormGroup({
      tagName: new FormControl("", Validators.required)
    });
    this.displayNewTagPopup = true;
    setTimeout(() => {
      this.inputTextTag.nativeElement.focus();
      this.setAttribute("idtag", "autocomplete", "false");
    }, 50);
  }

  private setAttribute(feild, attribute, value): void {
    const field = document.getElementById(feild);
    field.setAttribute(attribute, value);
  }

  private noteHandler(specificMessage?: Message) {
    if (specificMessage) {
      this.mailListService.selectedMessages[0] = specificMessage;
    }
    let messageTag: MessageTag = null;
    this.noteObject = new Note();
    this.noteObject.memo = "";
    if (this.mailListService.selectedMessages[0].messageTagList !== null) {
      messageTag = this.mailListService.selectedMessages[0].messageTagList.find(mt => mt.idTag.name === "annotated");
    }
    if (messageTag) {
      this.noteService.loadNote(this.mailListService.selectedMessages[0].id).subscribe(
        res => {
          console.log("RES = ", res);
          if (res && res.results && res.results.length > 0) {
            const notes: Note[] = res.results;
            this.noteObject = notes[0];
          }
          this.showNotePopup();
        },
        err => {
          console.log("ERR = ", err);
        }
      );
    } else {
      this.showNotePopup();
    }
  }

  /**
   * Chiedo conferma sulla cancellazione dei messaggi selezioni.
   * In caso affermativo faccio partire la cancellazione spostamento nel cestino).
   */
  private deletingConfirmation() {
    let message: string;
    if (this.toolBarService.selectedFolder.type === FolderType.DRAFT) {
      message = "Sei sicuro di voler eliminare le bozze selezionate?";
    } else {
      message = "Sei sicuro di voler eliminare i messaggi selezionati?";
    }
    this.confirmationService.confirm({
      message: message,
      header: "Conferma",
      icon: "pi pi-exclamation-triangle",
      accept: () => {
        this.mailListService.moveMessagesToTrash();
      },
      reject: () => { }
    });
  }

  private showNotePopup() {
    this.displayNote = true;
    setTimeout(() => {
      this.noteArea.nativeElement.focus();
    }, 50);
  }

  private saveNote() {
    const previousMessage = this.mailListService.selectedMessages[0];
    this.mailListService.saveNoteAndUpdateTag(this.noteObject).subscribe(
      (res: BatchOperation[]) => {
        console.log("BATCH RES = ", res);
        const messageTag = res.find(op =>
          op.entityPath === BaseUrls.get(BaseUrlType.Shpeck) + "/" + ENTITIES_STRUCTURE.shpeck.messagetag.path);
        if (messageTag && messageTag.operation === BatchOperationTypes.INSERT) {
          if (!previousMessage.messageTagList) {
            previousMessage.messageTagList = [];
          }
          const newTag = new Tag();
          newTag.idPec = previousMessage.idPec;
          newTag.description = "Annotato";
          newTag.name = "annotated";
          newTag.type = "SYSTEM_NOT_INSERTABLE_NOT_DELETABLE";
          const newMessageTag = messageTag.entityBody as MessageTag;
          newMessageTag.idMessage = previousMessage;
          newMessageTag.idTag = newTag;
          newMessageTag.inserted = new Date();
          previousMessage.messageTagList.push(newMessageTag);
        } else if (messageTag && messageTag.operation === BatchOperationTypes.DELETE) {
          previousMessage.messageTagList = previousMessage.messageTagList.filter(m => m.id !== messageTag.id);
        }
        this.mailListService.setIconsVisibility(previousMessage);
        this.messagePrimeService.add(
          { severity: "success", summary: "Successo", detail: "Nota salvata correttamente" });
      },
      err => {
        console.log("ERR = ", err);
        this.messagePrimeService.add(
          { severity: "error", summary: "Errore", detail: "Errore durante il salvaggio, contattare BabelCare", life: 3500 });
      });
    this.displayNote = false;
  }

  /**
   * Scarico il messaggio passato
   * @param selectedMessage
   */
  private dowloadMessage(selectedMessage: Message): void {
    this.messageService.downloadEml(selectedMessage.id, this.getEmlSource(selectedMessage)).subscribe(response => {
      const nomeEmail = "Email_" + selectedMessage.subject + "_" + selectedMessage.id + ".eml";
      Utils.downLoadFile(response, "message/rfc822", nomeEmail, false);
    });
  }

  public onNewTag(tagName: string) {
    console.log("WEV = ", tagName);
    this.mailListService.createAndApplyTag(tagName);
    this.displayNewTagPopup = false;
  }

  public chooseRegistrationType(event, registrationType) {
    if (!registrationType && event) { // vengo dal click sul menu
      if (!event.item.items) {
        if (event.item.queryParams.isPecDellAzienda === false) {
          this.confirmationService.confirm({
            header: "Conferma",
            message: "<b>Attenzione! Stai avviando la protocollazione su una azienda non associata alla casella selezionata su cui è arrivato il messaggio.</b><br/><br/>Sei sicuro?",
            icon: "pi pi-exclamation-triangle",
            accept: () => {
              this.displayProtocollaDialog = true;
              this.registerMessageEvent = event;
            }
          });
        } else {
          this.displayProtocollaDialog = true;
          this.registerMessageEvent = event;
        }
      }
    } else if (registrationType && !event) { // vengo dalla dialog di conferma
      // this.registerMessageEvent questo mi aspetto che sia popolato in quanto devo essere passato al giro prima dal click sul menu
      if (this.registerMessageEvent) {
        this.registerMessage(this.registerMessageEvent, registrationType);
        this.registerMessageEvent = null;
      }
      this.displayProtocollaDialog = false;
    }
  }

  public ngOnDestroy() {
    for (const s of this.subscriptions) {
      s.unsubscribe();
    }
    this.subscriptions = [];
  }


  /**
   * Dato un message torno lo stato di protocollazione dello stesso
   * @param message
   */
  public getRegistrationStatus(message: Message): string {
    if (!message.messageTagList) {
      return this.mailListService.isRegisterActive(message) ? "REGISTABLE" : "NOT_REGISTABLE";
    }
    return message.messageTagList.find(mt => mt.idTag.name === "registered") ? "REGISTERED" :
      message.messageTagList.find(mt => mt.idTag.name === "in_registration") ? "IN_REGISTRATION" :
        this.mailListService.isRegisterActive(message) ? "REGISTABLE" : "NOT_REGISTABLE";
  }

  /**
   * Questa funzione scatta al click sull'icona di protocollazione.
   * A seconda dello stato del message vengono eseguite diverse azioni.
   * @param event
   * @param message
   * @param registrable
   */
  public iconRegistrationClicked(event: any, message: Message, registrationStatus: string) {
    let messageTag = null;
    switch (registrationStatus) {
      case "REGISTERED":
        messageTag = message.messageTagList.find(mt => mt.idTag.name === "registered");
        this.prepareAndOpenDialogRegistrationDetail(messageTag, JSON.parse(messageTag.additionalData));
        break;
      case "REGISTABLE":
        this.aziendeProtocollabiliSubCmItems = this.mailListService.buildRegistrationMenuItems(this._selectedPec, this.selectedContextMenuItem);
        this.registrationMenu.toggle(event);
        break;
      case "NOT_REGISTABLE":
        this.messagePrimeService.add({
          severity: "warn",
          summary: "Attenzione",
          detail: "Questo messaggio non può essere protocollato.", life: 3500
        });
        break;
      case "IN_REGISTRATION":
        messageTag = message.messageTagList.find(mt => mt.idTag.name === "in_registration");
        if (!messageTag.additionalData || messageTag.additionalData === "{}") {
          this.messagePrimeService.add({
            severity: "warn",
            summary: "Attenzione",
            detail: "Questo messaggio è in fase di protocollazione.", life: 3500
          });
        } else {
          this.prepareAndOpenDialogRegistrationDetail(messageTag, JSON.parse(messageTag.additionalData));
        }
        break;
    }
  }

  public prepareAndOpenDialogRegistrationDetail(messageTag: MessageTag, additionalData: any) {
    this.registrationDetail = {
      numeroProposta: additionalData.idDocumento.numeroProposta,
      numeroProtocollo: additionalData.idDocumento.numeroProtocollo,
      oggetto: additionalData.idDocumento.oggetto,
      descrizioneUtente: additionalData.idUtente.descrizione,
      codiceRegistro: additionalData.idDocumento.codiceRegistro,
      anno: additionalData.idDocumento.anno,
      descrizioneAzienda: additionalData.idAzienda.descrizione,
      data: additionalData.idDocumento.dataProtocollo ?
        additionalData.idDocumento.dataProtocollo.replace(" ", ", ") :
        new Date(messageTag.inserted).toLocaleDateString("it-IT", { hour: "numeric", minute: "numeric" })
    };
    this.displayRegistrationDetail = true;
  }

  /**
   * Dato un message torno lo stato di reindirizzamento dello stesso
   * @param message
   */
  public getReaddressStatus(message: Message): string {
    if (!message.messageTagList) {
      return this.mailListService.isReaddressActive(message) ? "READDRESSABLE" : "NOT_READDRESSABLE";
    }
    const readdrresedIn = message.messageTagList.find(mt => mt.idTag.name === "readdressed_in");
    const readdrresedOut = message.messageTagList.find(mt => mt.idTag.name === "readdressed_out");
    if (readdrresedIn && readdrresedOut) {
      return "FULL_READDRESSED";
    }
    if (readdrresedIn) {
      return "READDRESSED_IN";
    }
    if (readdrresedOut) {
      return "READDRESSED_OUT";
    }
    return this.mailListService.isReaddressActive(message) ? "READDRESSABLE" : "NOT_READDRESSABLE";
  }

  /**
   * Questa funzione scatta al click sull'icona di reindirizzamento.
   * A seconda dello stato del message vengono eseguite diverse azioni.
   * @param event
   * @param message
   * @param registrable
   */
  public iconReaddressClicked(event: any, message: Message, readdressStatus: string) {
    switch (readdressStatus) {
      case "FULL_READDRESSED":
      case "READDRESSED_IN":
      case "READDRESSED_OUT":
        this.prepareAndOpenDialogReaddressDetail(message, readdressStatus);
        break;
      case "READDRESSABLE":
        this.mailListService.readdressMessage(message);
        break;
      case "NOT_READDRESSABLE":
        this.messagePrimeService.add({
          severity: "warn",
          summary: "Attenzione",
          detail: "Questo messaggio non può essere reindirizzato.", life: 3500
        });
        break;
    }
  }

  /**
   * Perapato e mostro la popup del dettaglio reindirizzamenti
   * @param message
   * @param readdressStatus
   */
  private prepareAndOpenDialogReaddressDetail(message: Message, readdressStatus: string) {
    this.readdressDetail = {
      displayReaddressDetail: false,
      buttonReaddress: false,
      testo: {
        in: null,
        out: null
      },
      message: message
    };
    this.readdressDetail.buttonReaddress = this.mailListService.isReaddressActive(message);
    this.readdressDetail.testo.in = this.buildMessageReaddres(message, "readdressed_in");
    this.readdressDetail.testo.out = this.buildMessageReaddres(message, "readdressed_out");
    this.readdressDetail.displayReaddressDetail = true;
  }

  private buildMessageReaddres(message, tagName): string {
    let testo = null;
    const messageTag = message.messageTagList.find(mt => mt.idTag.name === tagName);
    if (messageTag) {
      const mtAdditionalData = JSON.parse(messageTag.additionalData);
      if (tagName === "readdressed_in") {
        testo = `<b>${new Date(messageTag.inserted).toLocaleDateString("it-IT", { hour: "numeric", minute: "numeric" })}</b>: `
          + `reindirizzato da ${mtAdditionalData["idUtente"]["descrizione"]}`
          + ` (${mtAdditionalData["idPec"]["indirizzo"]}).`;
      } else if (tagName === "readdressed_out") {
        testo = `<b>${new Date(messageTag.inserted).toLocaleDateString("it-IT", { hour: "numeric", minute: "numeric" })}</b>: `
          + ` ${mtAdditionalData["idUtente"]["descrizione"]} ha reindirizzato a `
          + `${mtAdditionalData["idPec"]["indirizzo"]}.`;
      }
    }
    return testo;
  }

  public isAlreadyTagged(message: Message, tagname: string): boolean {
    if (!message.messageTagList) { return false; }
    return message.messageTagList.some(mt => mt.idTag.name === tagname) ? true : false;
  }

  public getArchiviationStatus(message: Message) {
    if (!message.messageTagList) {
      return this.mailListService.isArchiveActive(message) ? "ARCHIVABLE" : "NOT_ARCHIVABLE";
    }
    return message.messageTagList.find(mt => mt.idTag.name === "archived") ? "ARCHIVED" :
      this.mailListService.isArchiveActive(message) ? "ARCHIVABLE" : "NOT_ARCHIVABLE";
  }


  public iconArchiveClicked(event: any, message: Message, archivedstatus: string) {
    let messageTag = null;
    switch (archivedstatus) {
      case "ARCHIVED":
        messageTag = message.messageTagList.find(mt => mt.idTag.name === "archived");
        this.prepareAndOpenDialogArchiviationDetail(messageTag, JSON.parse(messageTag.additionalData), message);
        break;
      case "ARCHIVABLE":
        this.aziendeFascicolabiliSubCmItems = this.mailListService.buildAziendeUtenteMenuItems(this._selectedPec, this.selectedContextMenuItem);
        this.archiviationMenu.toggle(event);
        break;
      case "NOT_ARCHIVABLE":
        this.messagePrimeService.add({
          severity: "warn",
          summary: "Attenzione",
          detail: "Questo messaggio non può essere fascicolato.", life: 3500
        });
        break;
    }
  }

  public prepareAndOpenDialogArchiviationDetail(messageTag: MessageTag, additionalData: any, message: Message) {
    this.archiviationDetail = {
      displayArchiviationDetail: true,
      buttonArchivable: this.mailListService.isArchiveActive(message),
      message: message,
      additionalData: additionalData
    };
  }


  public getTaggedStatus(message: Message): any {
    if (!message.messageTagList) {
      return false;
    }
    // Se ho almeno un tag CUSTOM o un tag SYSTEM_INSERTABLE_DELETABLE (tranne il tag con name in_error)
    const messagetagList = message.messageTagList.filter(
      mt => {
        return mt.idTag.firstLevel === false && mt.idTag.visible === true;
      });

    if (messagetagList && messagetagList.length > 0) {
      const tagList = messagetagList.map(mt => mt.idTag);
      let tooltip = "Etichette associate:\n";
      tagList.forEach(t => {
        tooltip = tooltip + "- " + t.description + "\n";
      });
      return {tooltip: tooltip};
    } else {
      return false;
    }
  }

  public iconTaggedClicked(event: any, message: Message, taggedStatus: string) {
    this.mailListService.selectedMessages = [message];
    this.tagMenuItems = this.mailListService.buildTagsMenuItems(this.selectedContextMenuItem, this.showNewTagPopup);
    this.tagMenu.toggle(event);
  }
}
