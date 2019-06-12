import { Component, OnInit, Output, EventEmitter, ViewChild, ElementRef, OnDestroy } from "@angular/core";
import { buildLazyEventFiltersAndSorts } from "@bds/primeng-plugin";
import { Message, ENTITIES_STRUCTURE, MessageAddress, AddresRoleType, Folder, MessageTag, InOut, Tag, Pec, MessageType, FolderType, Note, FluxPermission, Azienda, MessageStatus } from "@bds/ng-internauta-model";
import { ShpeckMessageService } from "src/app/services/shpeck-message.service";
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
import { query } from "@angular/core/src/render3";
import { Menu } from "primeng/menu";

@Component({
  selector: "app-mail-list",
  templateUrl: "./mail-list.component.html",
  styleUrls: ["./mail-list.component.scss"],
  providers: [ConfirmationService]
})
export class MailListComponent implements OnInit, OnDestroy {

  constructor(
    private messageService: ShpeckMessageService,
    private mailListService: MailListService,
    private tagService: TagService,
    private mailFoldersService: MailFoldersService,
    private toolBarService: ToolBarService,
    private datepipe: DatePipe,
    private confirmationService: ConfirmationService,
    private messagePrimeService: MessageService,
    private noteService: NoteService,
    private loginService: NtJwtLoginService
  ) {
    this.selectedContextMenuItem = this.selectedContextMenuItem.bind(this);
  }

  @Output() public messageClicked = new EventEmitter<Message>();

  @ViewChild("selRow") private selRow: ElementRef;
  @ViewChild("dt") private dt: Table;
  @ViewChild("noteArea") private noteArea;
  @ViewChild("registrationMenu") private registrationMenu: Menu;

  public _selectedTag: Tag;
  public _selectedFolder: Folder;
  public _selectedPecId: number;
  public _selectedPec: Pec;
  public _filters: FilterDefinition[];

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
  private registerMessageEvent: any = null;
  private loggedUser: UtenteUtilities;

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
      label: "Elimina",
      id: "MessageDelete",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    /* {
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
    }, */
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
      label: "Etichette",
      id: "MessageLabels",
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
    }
  ];

  public displayNote: boolean = false;
  public displayProtocollaDialog = false;
  public displayRegistrationDetail = false;
  public readdressDetail: any = {
    displayReaddressDetail: false,
    buttonReaddress: false,
    testo: {
      in: null,
      out: null
    }
  };
  public noteObject: Note = new Note();
  public fromOrTo: string;
  public loading = false;
  public virtualRowHeight: number = 70;
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
      this.mailListService.selectedMessages = [];
      if (pecFolderSelected) {
        if (pecFolderSelected.type === PecFolderType.FOLDER) {
          const selectedFolder: Folder = pecFolderSelected.data as Folder;
          if (selectedFolder.type !== FolderType.DRAFT) {
            this._selectedPecId = selectedFolder.fk_idPec.id;
            this.setFolder(selectedFolder);
          }
        } else if (pecFolderSelected.type === PecFolderType.TAG) {
          const selectedTag: Tag = pecFolderSelected.data as Tag;
          this._selectedPecId = selectedTag.idPec.id;
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
          this.setMailTagVisibility(this.mailListService.messages);
        }
        this.loading = false;
        // setTimeout(() => {
        //   console.log(this.selRow.nativeElement.offsetHeight);
        // });
      });
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
    filtersAndSorts.addSort(new SortDefinition("id", SORT_MODES.desc));
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
    message["fromOrTo"] = "";
    if (message.messageAddressList) {
      const messageAddressList: MessageAddress[] = message.messageAddressList.filter(
        (messageAddress: MessageAddress) =>
          messageAddress.addressRole === addresRoleType
      );
      messageAddressList.forEach((messageAddress: MessageAddress) => {
        message["fromOrTo"] +=
          ", " +
          (messageAddress.idAddress.originalAddress
            ? messageAddress.idAddress.originalAddress
            : messageAddress.idAddress.mailAddress);
      });
      if ((message["fromOrTo"] as string).startsWith(",")) {
        message["fromOrTo"] = (message["fromOrTo"] as string).substr(
          1,
          (message["fromOrTo"] as string).length - 1
        );
      }
    }
  }

  public handleEvent(name: string, event: any) {
    console.log("handleEvent", name, event);
    switch (name) {
      // non c'è nella documentazione, ma pare che scatti sempre una sola volta anche nelle selezioni multiple.
      // le righe selezionati sono in this.mailListService.selectedMessages e anche in event
      case "selectionChange":
        // selezione di un singolo messaggio (o come click singolo oppure come click del primo messaggio con il ctrl)
        if (this.mailListService.selectedMessages.length === 1) {
          const selectedMessage: Message = this.mailListService.selectedMessages[0];
          this.mailListService.setSeen(true);
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
        break;
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
          if (!this.mailListService.isMoveActive()) {
            element.disabled = true;
            this.cmItems.find(f => f.id === "MessageMove").items = null;
          } else {
            this.cmItems.find(f => f.id === "MessageMove").items = this.mailListService.buildMoveMenuItems(this.mailListService.folders, this._selectedFolder, this.selectedContextMenuItem);
          }
          break;
        case "MessageDelete":
          element.disabled = !this.mailListService.isDeleteActive();
          break;
        case "MessageReply":
        case "MessageReplyAll":
        case "MessageForward":
          element.disabled = false;
          if (this.mailListService.selectedMessages.length > 1) {
            element.disabled = true;
          }
          break;
        case "MessageRegistration":
          element.disabled = false;
          if (!this.mailListService.isRegisterActive()) {
            element.disabled = true;
            this.cmItems.find(f => f.id === "MessageRegistration").items = null;
          } else {
            this.cmItems.find(f => f.id === "MessageRegistration").items = this.buildRegistrationMenuItems(this.selectedContextMenuItem);
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
          element.disabled = this.mailListService.selectedMessages.some(mess => {
            if (mess.messageStatus === MessageStatus.ERROR) {
              if (mess.messageTagList) {
                return mess.messageTagList.find(messageTag => messageTag.idTag.name === "in_error") !== undefined;
              } else {
                return false;
              }
            } else {
              return true;
            }
          });
          break;
        case "ToggleErrorFalse":
          element.disabled = false;
          element.disabled = !this.mailListService.selectedMessages.some(mess => {
            if (mess.messageStatus === MessageStatus.ERROR) {
              if (mess.messageTagList) {
                return mess.messageTagList.find(messageTag => messageTag.idTag.name === "in_error") !== undefined;
              } else {
                return false;
              }
            } else {
              return false;
            }
          });
          break;
        case "MessageReaddress":
          element.disabled = false;
          if (!this.mailListService.isReaddressActive()) {
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
  public buildRegistrationMenuItems(command: (any) => any): MenuItem[] {
    const registrationItems = [];
    this.loggedUser.getAziendeWithPermission(FluxPermission.REDIGE).forEach(codiceAzienda => {
      const azienda = this.loggedUser.getUtente().aziende.find(a => a.codice === codiceAzienda);
      let pIspecDellAzienda = true;
      let pIcon = "";
      let pTitle = "";
      if (!this._selectedPec.pecAziendaList.find(pecAzienda => pecAzienda.fk_idAzienda.id === azienda.id)) {
        pIspecDellAzienda = false;
        pIcon = "pi pi-exclamation-triangle";
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
  }

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
    decodedUrl = decodedUrl.replace("[id_pec]", this.mailListService.selectedMessages[0].id.toString());

    console.log("command", decodedUrl);
    window.open(decodedUrl);
  }


  /**
   * Manager delle varie funzionalità del contextMenu.
   * Si limita a chiamare il metodo giusto a seconda dell'ItemMenu selezionata.
   * @param event
   */
  private selectedContextMenuItem(event: any) {
    console.log("check: ", event);
    const menuItem: MenuItem = event.item;
    switch (menuItem.id) {
      case "MessageSeen":
        this.mailListService.setSeen(menuItem.queryParams.seen);
        break;
      case "MessageDelete":
        this.deletingConfirmation();
        break;
      case "MessageMove":
        this.mailListService.moveMessages(event.item.queryParams.folder);
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
    }
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
          previousMessage.messageTagList.push(messageTag.entityBody as MessageTag);
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


  public chooseRegistrationType(event, registrationType) {
    if (!registrationType && event) { // vengo dal click sul menu
      if (!event.item.items) {
        if (event.item.queryParams.isPecDellAzienda === false) {
          this.confirmationService.confirm({
            header: "Conferma",
            message: "<b>Attenzione! Stai avviando la protocollazione su una azienda non associata alla casella selezionata.</b><br/><br/>Sei sicuro?",
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
    switch (registrationStatus) {
      case "REGISTERED":
        // TODO: aprire popup con dettaglio protocollazione
        this.displayRegistrationDetail = true;
        break;
      case "REGISTABLE":
        this.aziendeProtocollabiliSubCmItems = this.buildRegistrationMenuItems(this.selectedContextMenuItem);
        this.registrationMenu.toggle(event);
        break;
      case "NOT_REGISTABLE":
        this.messagePrimeService.add({
          severity: "warn",
          summary: "Attenzione",
          detail: "Questo messaggio non può essere protocollato.", life: 3500 });
        break;
    }
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
    return "NOT_READDRESSABLE";
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
          detail: "Questo messaggio non può essere reindirizzato.", life: 3500 });
        break;
    }
  }

  /**
   * Perapato e mostro la popup del dettaglio reindirizzamenti
   * @param message
   * @param readdressStatus
   */
  public prepareAndOpenDialogReaddressDetail(message: Message, readdressStatus: string) {
    this.readdressDetail = {
      displayReaddressDetail: false,
      buttonReaddress: false,
      testo: {
        in: null,
        out: null
      },
      message: message
    };
    this.readdressDetail.buttonReaddress = true;
    if (readdressStatus === "READDRESSED_IN" || readdressStatus === "FULL_READDRESSED") {
      const mtIn = message.messageTagList.find(mt => mt.idTag.name === "readdressed_in");
      const mtInAdditionalData = JSON.parse(mtIn.additionalData);
      this.readdressDetail.testo.in =  `<b>${new Date(mtIn.inserted).toLocaleDateString("it-IT", {hour: "numeric", minute: "numeric"})}</b>: `
        + `da ${mtInAdditionalData["idUtente"]["descrizione"]}`
        + ` (${mtInAdditionalData["idPecSrc"]["indirizzo"]}).`;
    }
    if (readdressStatus === "READDRESSED_OUT" || readdressStatus === "FULL_READDRESSED") {
      this.readdressDetail.buttonReaddress = false;
      const mtOut = message.messageTagList.find(mt => mt.idTag.name === "readdressed_out");
      const mtOutAdditionalData = JSON.parse(mtOut.additionalData);
      this.readdressDetail.testo.out =  `<b>${new Date(mtOut.inserted).toLocaleDateString("it-IT", {hour: "numeric", minute: "numeric"})}</b>: `
        + `da ${mtOutAdditionalData["idUtente"]["descrizione"]}`
        + ` (${mtOutAdditionalData["idPecDst"]["indirizzo"]}).`;
    }
    this.readdressDetail.displayReaddressDetail = true;
  }

  public isAlreadyTagged(message: Message, tagname: string): boolean {
    if (!message.messageTagList) { return false; }
    return message.messageTagList.some(mt => mt.idTag.name === tagname) ? true : false;
  }

// lightseagreen
// orange note
}
