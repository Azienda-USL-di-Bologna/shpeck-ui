import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, AfterContentInit, AfterContentChecked, AfterViewChecked } from "@angular/core";
import { buildLazyEventFiltersAndSorts } from "@bds/primeng-plugin";
import { Message, ENTITIES_STRUCTURE, MessageAddress, AddresRoleType, Folder, FolderType, TagType, MessageTag, InOut, Tag, Pec, MessageFolder } from "@bds/ng-internauta-model";
import { ShpeckMessageService} from "src/app/services/shpeck-message.service";
import { FiltersAndSorts, FilterDefinition, FILTER_TYPES, SortDefinition, SORT_MODES, PagingConf, PagingMode, BatchOperation, BatchOperationTypes } from "@nfa/next-sdr";
import { TagService } from "src/app/services/tag.service";
import { Observable } from "rxjs";
import { DatePipe } from "@angular/common";
import { Table } from "primeng/table";
import { BaseUrlType, BaseUrls } from "src/environments/app-constants";
import { MenuItem } from "primeng/api";
import { MessageFolderService } from "src/app/services/message-folder.service";
import { Utils } from "src/app/utils/utils";

@Component({
  selector: "app-mail-list",
  templateUrl: "./mail-list.component.html",
  styleUrls: ["./mail-list.component.scss"]
})
export class MailListComponent implements OnInit, AfterViewChecked {
  public _folder: Folder;
  @Input("folder")
  set folder(folder: Folder) {
    this._folder = null;
    this.selectedMessages = [];
    // trucco per far si che la table vanga tolta e rimessa nel dom (in modo da essere resettata) altrimenti sminchia
    // NB: nell'html la visualizzazione della table è controllata da un *ngIf
    setTimeout(() => {
      this._folder = folder;
      if (folder) {
        this.lazyLoad(null);
      }
    }, 0);
  }

  @Output() public messageClicked = new EventEmitter<Message>();

  @ViewChild("selRow") private selRow: ElementRef;
  @ViewChild("dt") private dt: Table;

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
    private datepipe: DatePipe
  ) {}

  ngOnInit() {
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

  private loadData(pageCong: PagingConf, lazyFilterAndSort?: FiltersAndSorts) {
    this.loading = true;
    this.messageService
      .getData(
        this.selectedProjection,
        this.buildInitialFilterAndSort(),
        lazyFilterAndSort,
        pageCong
      )
      .subscribe(data => {
        if (data && data.results) {
          this.totalRecords = data.page.totalElements;
          this.messages = data.results;
          this.setMailTagVisibility(this.messages, this._folder.type);
        }
        this.loading = false;
        setTimeout(() => {
          console.log(this.selRow.nativeElement.offsetHeight);
        });
      });
  }

  public lazyLoad(event: any) {
    console.log("lazyload", event);
    if (event) {
      // questo if è il modo più sicuro per fare "event.first === Nan"
      if (event.first !== event.first) {
        event.first = 0;
      }
      if (
        this.pageConf.conf.limit !== event.rows ||
        this.pageConf.conf.offset !== event.first
      ) {
        this.pageConf.conf = {
          limit: event.rows,
          offset: event.first
        };
        const filtersAndSorts: FiltersAndSorts = buildLazyEventFiltersAndSorts(
          event,
          this.cols,
          this.datepipe
        );

        this.loadData(this.pageConf, filtersAndSorts);
      }
    } else {
      this.pageConf.conf = {
        limit: this.rowsNmber * 2,
        offset: 0
      };
      const filtersAndSorts: FiltersAndSorts = buildLazyEventFiltersAndSorts(
        event,
        this.cols,
        this.datepipe
      );

      this.loadData(this.pageConf, filtersAndSorts);
    }
  }

  trackByFn(index, item) {
    return item.id;
  }

  buildInitialFilterAndSort(): FiltersAndSorts {
    const filtersAndSorts: FiltersAndSorts = new FiltersAndSorts();
    filtersAndSorts.addFilter(
      new FilterDefinition(
        "messageFolderList.idFolder.id",
        FILTER_TYPES.not_string.equals,
        this._folder.id
      )
    );
    // filtersAndSorts.addSort(new SortDefinition("receiveTime", SORT_MODES.desc));
    filtersAndSorts.addSort(new SortDefinition("id", SORT_MODES.desc));
    return filtersAndSorts;
  }

  private setMailTagVisibility(messages: Message[], folderType: string) {
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
    const messageAddressList: MessageAddress[] = message.messageAddressList.filter(
      (messageAddress: MessageAddress) =>
        messageAddress.addressRole === addresRoleType
    );
    message["fromOrTo"] = "";
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
                  (messageFolder.fk_idFolder.id = this._folder.id)
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
}
