import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, AfterContentInit, AfterContentChecked, AfterViewChecked, OnChanges, OnDestroy } from "@angular/core";
import { buildLazyEventFiltersAndSorts } from "@bds/primeng-plugin";
import { Message, ENTITIES_STRUCTURE, MessageAddress, AddresRoleType, Folder, FolderType, TagType, MessageTag, InOut, Tag, Pec, MessageFolder, MessageType } from "@bds/ng-internauta-model";
import { ShpeckMessageService} from "src/app/services/shpeck-message.service";
import { FiltersAndSorts, FilterDefinition, FILTER_TYPES, SortDefinition, SORT_MODES, PagingConf, PagingMode, BatchOperation, BatchOperationTypes } from "@nfa/next-sdr";
import { TagService } from "src/app/services/tag.service";
import { Observable, Subscription } from "rxjs";
import { DatePipe } from "@angular/common";
import { Table } from "primeng/table";
import { BaseUrlType, BaseUrls } from "src/environments/app-constants";
import { MenuItem, LazyLoadEvent, FilterMetadata, TreeNode } from "primeng/api";
import { MessageFolderService } from "src/app/services/message-folder.service";
import { Utils } from "src/app/utils/utils";
import { MailFoldersService } from "../mail-folders/mail-folders.service";
import { ToolBarService } from "../toolbar/toolbar.service";

@Component({
  selector: "app-mail-list",
  templateUrl: "./mail-list.component.html",
  styleUrls: ["./mail-list.component.scss"]
})
export class MailListComponent implements OnInit, AfterViewChecked, OnChanges, OnDestroy {

  @Output() public messageClicked = new EventEmitter<Message>();

  @ViewChild("selRow") private selRow: ElementRef;
  @ViewChild("dt") private dt: Table;

  public _selectedFolder: Folder;
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
      label: "Elimina ",
      id: "MessageDelete",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Assegnata???",
      id: "MessageAssigned",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Nota",
      id: "MessageNote",
      disabled: true,
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

  public messages: Message[] = [];
  public fromOrTo: string;
  public tags = [];
  public loading = false;
  public virtualRowHeight: number = 70;
  public totalRecords: number;
  public rowsNmber = 10;
  public selectedMessages: Message[];
  public cols = [
    {
      field: "subject",
      header: "Oggetto",
      filterMatchMode: FILTER_TYPES.string.containsIgnoreCase,
      width: "85px",
      minWidth: "85px"
    }
  ];

  constructor(
    private messageService: ShpeckMessageService,
    private messageFolderService: MessageFolderService,
    private tagService: TagService,
    private mailFoldersService: MailFoldersService,
    private toolBarService: ToolBarService,
    private datepipe: DatePipe
  ) {}

  ngOnInit() {
    this.subscriptions.push(this.mailFoldersService.pecTreeNodeSelected.subscribe((pecTreeNodeSelected: TreeNode) => {
      if (pecTreeNodeSelected) {
        if (pecTreeNodeSelected.type === "folder") {
          const selectedFolder: Folder = pecTreeNodeSelected.data;
          this._selectedPec = selectedFolder.idPec;
          this.setFolder(selectedFolder);
        } else {
          this._selectedPec = pecTreeNodeSelected.data;
        }
      }
    }));
    this.subscriptions.push(this.toolBarService.getFilterTyped.subscribe((filters: FilterDefinition[]) => {
      if (filters) {
        this.setFilters(filters);
      }
    }));
    // this.idFolder = 6;
    // this.loadData(6);
    // this.pageConf = {
    //   mode: "LIMIT_OFFSET",
    //   conf: {
    //     limit: 0,
    //     offset: this.rowsNmber * 2
    //   }
    // };
  }

  ngAfterViewChecked() {
    // console.log("ngAfterViewchecked", this.selRow.nativeElement.offsetHeight);
  }

  ngOnChanges() {
    // console.log("filtes: ", this._filters);
    // if (this._filters) {
    //   this.filtering = true;
    //   this._folder = null;
    //   // let filters = [];
    //   // Object.assign(filters, this._filters);
    //   let filters = this._filters;
    //   this._filters = null;
    //   setTimeout(() => {
    //     this._filters = filters;
    //     this.lazyLoad(null);
    //   }, 0);
    //   this.resetPageConfig = true;
    //   // this.dt.filter(null, null, null);
    // }
  }

  private setFolder(folder: Folder) {
    this._selectedFolder = null;
    this._filters = null;
    this.selectedMessages = [];
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
    this._selectedFolder = null;
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
    if (this.tags && this.tags[tagName]) {
      return this.tags[tagName].description;
    } else {
      return null;
    }
  }

  private loadTag(pec: Pec): Observable<Tag[]> {
    const filtersAndSorts: FiltersAndSorts = new FiltersAndSorts();
    filtersAndSorts.addFilter(
      new FilterDefinition("idPec.id", FILTER_TYPES.not_string.equals, pec.id)
    );
    return this.tagService.getData(null, filtersAndSorts, null, null);
  }

  private loadData(pageCong: PagingConf, lazyFilterAndSort?: FiltersAndSorts, folder?: Folder) {
    this.loading = true;
    this.messageService
      .getData(
        this.selectedProjection,
        this.buildInitialFilterAndSort(folder),
        lazyFilterAndSort,
        pageCong
      )
      .subscribe(data => {
        if (data && data.results) {
          this.totalRecords = data.page.totalElements;
          this.messages = data.results;
          this.setMailTagVisibility(this.messages);
        }
        this.loading = false;
        // setTimeout(() => {
        //   console.log(this.selRow.nativeElement.offsetHeight);
        // });
      });
  }

  public buildTableEventFilters(filtersDefinition: FilterDefinition[] ): {[s: string]: FilterMetadata} {
    if (filtersDefinition && filtersDefinition.length > 0) {
      const eventFilters: {[s: string]: FilterMetadata} = {};
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

  public lazyLoad(event: LazyLoadEvent ) {
    console.log("lazyload", event);
    const eventFilters: {[s: string]: FilterMetadata} = this.buildTableEventFilters(this._filters);
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

        this.loadData(this.pageConf, filtersAndSorts, this._selectedFolder);
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

      this.loadData(this.pageConf, filtersAndSorts, this._selectedFolder);
    }
    this.previousFilter = this._filters;
    // this.filtering = false;
  }

  trackByFn(index, item) {
    return item.id;
  }

  buildInitialFilterAndSort(folder: Folder): FiltersAndSorts {
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
    filtersAndSorts.addFilter(
      new FilterDefinition(
        "idPec.id",
        FILTER_TYPES.not_string.equals,
        this._selectedPec.id
      )
    );
    filtersAndSorts.addFilter(
      new FilterDefinition(
        "messageFolderList.messageType",
        FILTER_TYPES.not_string.equals,
        MessageType.MAIL
      )
    );
    filtersAndSorts.addFilter(
      new FilterDefinition(
        "messageFolderList.messageType",
        FILTER_TYPES.not_string.equals,
        MessageType.PEC
      )
    );
    // filtersAndSorts.addSort(new SortDefinition("receiveTime", SORT_MODES.desc));
    filtersAndSorts.addSort(new SortDefinition("id", SORT_MODES.desc));
    return filtersAndSorts;
  }

  private setMailTagVisibility(messages: Message[]) {
    messages.map((message: Message) => {
      this.setFromOrTo(message);
      this.setIconsVisibility(message);
    });
  }

  private setIconsVisibility(message: Message) {
    message["iconsVisibility"] = [];
    if (message.messageTagList && message.messageTagList.length > 0) {
      message.messageTagList.forEach((messageTag: MessageTag) => {
        message["iconsVisibility"][messageTag.idTag.name] = true;
        this.tags[messageTag.idTag.name] = messageTag.idTag;
      });
    }
  }

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
      // le righe selezionati sono in this.selectedMessages e anche in event
      case "selectionChange":
        // selezione di un singolo messaggio (o come click singolo oppure come click del primo messaggio con il ctrl)
        if (this.selectedMessages.length === 1) {
          const selectedMessage: Message = this.selectedMessages[0];
          this.setSeen(selectedMessage);
          this.messageService.manageMessageEvent(
            selectedMessage,
            this.selectedMessages
          );
          // this.messageClicked.emit(selectedMessage);
        } else {
          this.messageService.manageMessageEvent(null, this.selectedMessages);
        }
        break;
      case "onContextMenuSelect":
        this.setContextMenuItemLook();
        break;
    }
  }

  private setSeen(selectedMessage: Message) {
    if (!!!selectedMessage.seen) {
      selectedMessage.seen = true;
      this.saveMessage(selectedMessage);
    }
  }

  private setContextMenuItemLook() {
    this.cmItems.map(element => {
      // element.disabled = false;
      switch (element.id) {
        case "MessageSeen":
          if (
            this.selectedMessages.some((message: Message) => !!!message.seen)
          ) {
            element.label = "Letto";
            element.queryParams = { seen: true };
          } else {
            element.label = "Da Leggere";
            element.queryParams = { seen: false };
          }
          break;
        case "MessageDelete":
          break;
        case "MessageReply":
        case "MessageReplyAll":
          element.disabled = false;
          if (this.selectedMessages.length > 1) {
            element.disabled = true;
          }
          break;
        case "MessageDownload":
          element.disabled = false;
          if (this.selectedMessages.length > 1) {
            element.disabled = true;
          }
          break;
      }
    });
  }

  private aaa(messagesFolder: MessageFolder[]) {
    console.log(messagesFolder);
  }

  private selectedContextMenuItem(event: any) {
    console.log("check: ", event);
    const menuItem: MenuItem = event.item;
    switch (menuItem.id) {
      case "MessageSeen":
        const messagesToUpdate: BatchOperation[] = [];
        this.selectedMessages.forEach((message: Message) => {
          if (message.seen !== menuItem.queryParams.seen) {
            message.seen = menuItem.queryParams.seen;
            messagesToUpdate.push({
              id: message.id,
              operation: BatchOperationTypes.UPDATE,
              entityPath:
                BaseUrls.get(BaseUrlType.Shpeck) +
                "/" +
                ENTITIES_STRUCTURE.shpeck.message.path,
              entityBody: message,
              additionalData: null
            });
          }
        });
        if (messagesToUpdate.length > 0) {
          this.messageService.batchHttpCall(messagesToUpdate).subscribe();
        }
        break;
      case "MessageDelete":
        this.messageFolderService
          .moveToTrashMessages(
            this.selectedMessages.map((message: Message) => {
              return message.messageFolderList.filter(
                (messageFolder: MessageFolder) =>
                  (messageFolder.fk_idFolder.id = this._selectedFolder.id)
              )[0];
            }),
            5
          )
          .subscribe();
        break;

      case "MessageDownload":
        this.dowloadMessage(this.selectedMessages[0]);
        break;
    }
  }

  private saveMessage(selectedMessage: Message) {
    this.messageService
      .patchHttpCall(
        selectedMessage,
        selectedMessage.id,
        this.selectedProjection,
        null
      )
      .subscribe((message: Message) => {});
  }

  private dowloadMessage(selectedMessage: Message): void {
    this.messageService.downloadEml(selectedMessage).subscribe(response => {
      const nomeEmail = "Email_" + selectedMessage.subject + "_" + selectedMessage.id + ".eml";
      Utils.downLoadFile(response, "message/rfc822", nomeEmail, false);
    });
  }

  public ngOnDestroy() {
    for (const s of this.subscriptions) {
      s.unsubscribe();
    }
    this.subscriptions = [];
  }
}
