import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, AfterContentInit, AfterContentChecked, AfterViewChecked } from "@angular/core";
import {VirtualScrollerModule} from "primeng/virtualscroller";
import { buildLazyEventFiltersAndSorts } from "@bds/primeng-plugin";
import { Message, ENTITIES_STRUCTURE, MessageAddress, AddresRoleType, Folder, FolderType, TagType, MessageTag, InOut, Tag, Pec } from "@bds/ng-internauta-model";
import { MessageService} from "src/app/services/message.service";
import { FiltersAndSorts, FilterDefinition, FILTER_TYPES, SortDefinition, SORT_MODES, PagingConf, PagingMode } from "@nfa/next-sdr";
import { TagService } from "src/app/services/tag.service";
import { Observable } from "rxjs";
import { DatePipe } from "@angular/common";
import { Table } from "primeng/table";

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
    setTimeout(() => {
      this._folder = folder;
      if (folder) {
        this.lazyLoad(null);
      }
    }, 0);
    // if (folder) {
    //   this.lazyLoad(null);
      // if (this.dt) {
      //   this.dt.sort(null);
      // } else {
      //   this.lazyLoad(null);
      // }
      // this.loadTag(folder).subscribe((tags: Tag[]) => {
      //   this.tags = tags;
      //   this.loadData(folder);
      // });
    // }
  }
  @Output() messageClicked = new EventEmitter<Message>();
  @ViewChild("selRow") private selRow: ElementRef;
  @ViewChild("dt") private dt: Table;

  public sortOptions = {};
  public sortKey = {};
  public messages: Message[] = [];
  public fromOrTo: string;
  public tags = [];
  private selectedProjection: string = ENTITIES_STRUCTURE.shpeck.message.customProjections.CustomMessageWithAddressList;

  private pageConf: PagingConf = {
    mode: "LIMIT_OFFSET",
    conf: {
      limit: 0,
      offset: 0
    }
  };

  public loading = false;
  public virtualRowHeight: number = 68;
  public totalRecords: number;
  public rowsNmber = 10;
  public cols = [
      {
        field: "subject",
        header: "Oggetto",
        filterMatchMode: FILTER_TYPES.string.containsIgnoreCase,
        width: "85px",
        minWidth: "85px"
      },
      // {
      //   field: "idApplicazione.nome",
      //   header: "App",
      //   filterMatchMode: FILTER_TYPES.string.containsIgnoreCase,
      //   width: "80px",
      //   minWidth: "80px"
      // }
  ];

  constructor(private messageService: MessageService, private tagService: TagService, private datepipe: DatePipe) { }

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
    filtersAndSorts.addFilter(new FilterDefinition("idPec.id", FILTER_TYPES.not_string.equals, pec.id));
    return this.tagService.getData(null, filtersAndSorts, null, null);
  }

  private loadData(pageCong: PagingConf, lazyFilterAndSort?: FiltersAndSorts) {
    this.loading = true;
    this.messageService.getData(this.selectedProjection, this.buildInitialFilterAndSort(), lazyFilterAndSort, pageCong).subscribe(
      data => {
        if (data && data.results) {
          this.totalRecords = data.page.totalElements;
          this.messages = data.results;
          this.setMailTagVisibility(this.messages, this._folder.type);
        }
        this.loading = false;
        setTimeout(() => {
          console.log(this.selRow.nativeElement.offsetHeight);
        });
      }
    );
  }

  public lazyLoad(event: any) {
    console.log("lazyload", event);
    if (event) {
      // questo if è il modo più sicuro per fare "event.first === Nan"
      if (event.first !== event.first) {
        event.first = 0;
      }
      if (this.pageConf.conf.limit !== event.rows || this.pageConf.conf.offset !== event.first) {
        this.pageConf.conf = {
          limit: event.rows,
          offset: event.first
        };
        const filtersAndSorts: FiltersAndSorts = buildLazyEventFiltersAndSorts(event, this.cols, this.datepipe);

        this.loadData(this.pageConf, filtersAndSorts);
      }
    } else {
      this.pageConf.conf = {
        limit: this.rowsNmber * 2,
        offset: 0
      };
      const filtersAndSorts: FiltersAndSorts = buildLazyEventFiltersAndSorts(event, this.cols, this.datepipe);

      this.loadData(this.pageConf, filtersAndSorts);
    }
  }

  trackByFn(index, item) {
    return item.id;
  }

  buildInitialFilterAndSort(): FiltersAndSorts {
    const filtersAndSorts: FiltersAndSorts = new FiltersAndSorts();
    filtersAndSorts.addFilter(new FilterDefinition("messageFolderList.idFolder.id", FILTER_TYPES.not_string.equals, this._folder.id));
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
      (messageAddress: MessageAddress) => messageAddress.addressRole === addresRoleType);
    message["fromOrTo"] = "";
    messageAddressList.forEach(
      (messageAddress: MessageAddress) => {
        message["fromOrTo"] += ", " + (messageAddress.idAddress.originalAddress ? messageAddress.idAddress.originalAddress : messageAddress.idAddress.mailAddress);
      });
    if ((message["fromOrTo"] as string).startsWith(",")) {
      message["fromOrTo"]  = (message["fromOrTo"] as string).substr(1, (message["fromOrTo"] as string).length - 1);
    }
  }

  public handleEvent(name: string, event: any) {
    console.log("handleEvent", name, event);
    switch (name) {
      case "onRowSelect":
        this.messages[event.index].seen = true;
        this.saveMessage(event.index);
        this.messageClicked.emit(event.data);
      break;
    }
  }

  private saveMessage(index: number) {
    this.messageService.patchHttpCall(this.messages[index], this.messages[index].id, this.selectedProjection, null)
    .subscribe((message: Message) => {});
  }
}
